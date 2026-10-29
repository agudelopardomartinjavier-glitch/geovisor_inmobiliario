"""Cálculos de la Fase 3 (funciones puras): comisiones, IVA y retenciones, canon con IPC, regla del 1 %, mora, pagos y liquidación."""
from datetime import date

import pytest

from app.contable import calculos as c

T = c.Tarifas(iva_pct=19, retefuente_pct=11, reteica_por_mil=10, reteiva_pct=15)

# ---------------------------------------------------------------- redondeo
def test_redondeo_mitad_hacia_arriba():
    assert c.cop(0.5) == 1 and c.cop(1.5) == 2 and c.cop(2.5) == 3 and c.cop(2.4999) == 2
    assert c.pct_de(50, 1) == 1                      # 0,5 -> 1
    assert c.por_mil_de(500, 1) == 1

# ---------------------------------------------------------------- comisiones
def test_comision_de_venta_con_iva_retenciones_y_reparto():
    r = c.calcular_comision(300_000_000, 3, T, asesor_pct=50, referido_pct=10)
    assert r["valor_comision"] == 9_000_000
    assert r["iva"] == 1_710_000
    assert r["total_facturable"] == 10_710_000
    assert (r["retefuente"], r["reteica"], r["reteiva"]) == (990_000, 90_000, 256_500)
    assert r["neto_a_recibir"] == 10_710_000 - 990_000 - 90_000 - 256_500 == 9_373_500
    assert (r["asesor_valor"], r["referido_valor"], r["inmobiliaria_valor"]) == (4_500_000, 900_000, 3_600_000)

def test_comision_sin_iva_ni_retenciones():
    r = c.calcular_comision(1_500_000, 100, T, aplica_iva=False, aplica_retenciones=False)
    assert r["valor_comision"] == 1_500_000 and r["iva"] == 0 and r["retefuente"] == r["reteica"] == r["reteiva"] == 0
    assert r["neto_a_recibir"] == r["total_facturable"] == 1_500_000

def test_las_tarifas_son_argumentos_no_constantes():
    t2 = c.Tarifas(iva_pct=0, retefuente_pct=4, reteica_por_mil=9.66, reteiva_pct=0)
    r = c.calcular_comision(100_000_000, 2, t2)
    assert r["iva"] == 0 and r["retefuente"] == 80_000 and r["reteica"] == 19_320 and r["reteiva"] == 0

def test_retefuente_base_minima():
    t = c.Tarifas(19, 11, 10, 15, retefuente_base_minima=1_000_000)
    assert c.calcular_comision(10_000_000, 5, t)["retefuente"] == 0          # 500.000 < base mínima
    assert c.calcular_comision(30_000_000, 5, t)["retefuente"] == 165_000    # 1.500.000 >= base mínima

@pytest.mark.parametrize("base,pct,a,r", [(0, 3, 0, 0), (100, 0, 0, 0), (100, 3, 80, 30), (100, 3, -1, 0)])
def test_comision_valida_entradas(base, pct, a, r):
    with pytest.raises(ValueError):
        c.calcular_comision(base, pct, T, asesor_pct=a, referido_pct=r)

def test_porciones_de_factura_suman_la_comision():
    com = c.calcular_comision(333_333_333, 3, T)
    primera = c.porcion_comision(com, 60)
    resto = c.porcion_comision(com, 40, ya_facturado=primera, es_resto=True)
    for k in ("subtotal", "iva", "retefuente", "reteica", "reteiva"):
        assert primera[k] + resto[k] == {"subtotal": com["valor_comision"]}.get(k, com.get(k))
    assert primera["total"] + resto["total"] == com["total_facturable"]

# ---------------------------------------------------------------- canon con IPC
IPC = {2024: 5.2, 2025: 5.1}

def test_canon_antes_del_primer_aniversario_no_cambia():
    r = c.canon_vigente(1_000_000, date(2024, 3, 15), date(2025, 3, 14), IPC)
    assert r["canon"] == 1_000_000 and r["aumentos"] == [] and r["faltantes"] == []

def test_canon_sube_en_cada_aniversario_con_el_ipc_del_anio_anterior():
    r = c.canon_vigente(1_000_000, date(2024, 3, 15), date(2026, 6, 1), IPC)
    assert [a["canon"] for a in r["aumentos"]] == [1_052_000, 1_105_652]
    assert [a["anio_ipc"] for a in r["aumentos"]] == [2024, 2025]
    assert r["canon"] == 1_105_652

def test_el_aumento_se_aplica_el_mismo_dia_del_aniversario():
    assert c.canon_vigente(1_000_000, date(2024, 3, 15), date(2025, 3, 15), IPC)["canon"] == 1_052_000

def test_tope_como_porcentaje_del_ipc():
    r = c.canon_vigente(1_000_000, date(2024, 3, 15), date(2026, 6, 1), IPC, tope_pct_ipc=50)
    assert r["aumentos"][0]["canon"] == 1_026_000 and r["canon"] == 1_052_163

def test_ipc_faltante_no_inventa_el_aumento():
    r = c.canon_vigente(1_000_000, date(2024, 3, 15), date(2026, 6, 1), {2024: 5.2})
    assert r["canon"] == 1_052_000 and r["faltantes"] == [2025]

def test_ipc_negativo_no_baja_el_canon():
    assert c.canon_vigente(1_000_000, date(2024, 1, 10), date(2025, 2, 1), {2024: -0.5})["canon"] == 1_000_000

def test_sin_incremento_por_ipc():
    assert c.canon_vigente(1_000_000, date(2024, 3, 15), date(2027, 1, 1), IPC, incrementa=False)["canon"] == 1_000_000

def test_contrato_iniciado_un_29_de_febrero():
    r = c.canon_vigente(1_000_000, date(2024, 2, 29), date(2025, 2, 28), {2024: 10.0})
    assert r["canon"] == 1_100_000                      # el aniversario de 2025 cae el 28 de febrero

# ---------------------------------------------------------------- regla del 1 % (Ley 820)
def test_limite_del_uno_por_ciento():
    assert c.limite_canon_ley820(2_000_000, 200_000_000, "vivienda_urbana")["excede"] is False
    r = c.limite_canon_ley820(2_000_001, 200_000_000, "vivienda_urbana")
    assert r["excede"] and r["exceso"] == 1 and r["limite"] == 2_000_000

def test_limite_es_parametro():
    assert c.limite_canon_ley820(2_500_000, 200_000_000, "vivienda_urbana", max_pct=1.5)["excede"] is False

def test_regla_no_aplica_a_otros_usos_ni_sin_valor():
    assert c.limite_canon_ley820(9_000_000, 100_000_000, "comercial")["aplica"] is False
    r = c.limite_canon_ley820(1_000_000, None, "vivienda_urbana")
    assert r["aplica"] and r["excede"] is False and r["motivo"]

# ---------------------------------------------------------------- periodos, mora y cartera
def test_vencimiento_del_periodo():
    assert c.fecha_vencimiento_periodo("2026-10", 5) == date(2026, 10, 5)
    assert c.fecha_vencimiento_periodo("2026-02", 31 if False else 28) == date(2026, 2, 28)

def test_periodos_entre():
    assert c.periodos_entre(date(2026, 11, 20), date(2027, 2, 1)) == ["2026-11", "2026-12", "2027-01", "2027-02"]

def test_dias_de_mora_con_gracia():
    assert c.dias_mora(date(2026, 10, 5), date(2026, 10, 29)) == 24
    assert c.dias_mora(date(2026, 10, 5), date(2026, 10, 29), gracia=5) == 19
    assert c.dias_mora(date(2026, 10, 5), date(2026, 10, 5)) == 0 and c.dias_mora(date(2026, 11, 5), date(2026, 10, 29)) == 0

def test_interes_de_mora():
    assert c.interes_mora(1_000_000, 24, 2) == 16_000
    assert c.interes_mora(0, 10, 2) == 0 and c.interes_mora(1_000_000, 0, 2) == 0

@pytest.mark.parametrize("d,t", [(0, "al_dia"), (-3, "al_dia"), (1, "1-30"), (30, "1-30"), (31, "31-60"), (60, "31-60"), (61, "61-90"), (91, "mas_de_90")])
def test_tramos_de_cartera(d, t):
    assert c.tramo_mora(d) == t

# ---------------------------------------------------------------- aplicación de pagos
COBROS = [dict(id=2, saldo=500, fecha_vencimiento="2026-09-05"), dict(id=1, saldo=700, fecha_vencimiento="2026-08-05"), dict(id=3, saldo=400, fecha_vencimiento="2026-10-05")]

def test_el_pago_cubre_primero_lo_mas_antiguo():
    ap, sobra = c.aplicar_pago(1000, COBROS)
    assert ap == [(1, 700), (2, 300)] and sobra == 0

def test_pago_que_sobra_queda_sin_aplicar():
    ap, sobra = c.aplicar_pago(2000, COBROS)
    assert ap == [(1, 700), (2, 500), (3, 400)] and sobra == 400

def test_pago_menor_al_primer_cobro_es_parcial():
    assert c.aplicar_pago(100, COBROS) == ([(1, 100)], 0)

def test_validar_aplicaciones():
    c.validar_aplicaciones(1000, [(1, 600), (2, 400)], {1: 700, 2: 500})
    for malo in ([(1, 800)], [(1, 600), (2, 500)], [(9, 100)], [(1, 0)]):
        with pytest.raises(ValueError):
            c.validar_aplicaciones(1000, malo, {1: 700, 2: 500})

# ---------------------------------------------------------------- liquidación al propietario
def test_liquidacion_mensual():
    r = c.liquidar(2_000_000, 10, 19, True, dict(administracion=150_000, predial=100_000, reparaciones=300_000))
    assert (r["comision"], r["iva_comision"]) == (200_000, 38_000)
    assert r["saldo_a_girar"] == 2_000_000 - 200_000 - 38_000 - 150_000 - 100_000 - 300_000 == 1_212_000

def test_liquidacion_sin_iva_y_con_otros_gastos():
    r = c.liquidar(2_000_000, 10, 19, False, dict(administracion=150_000, predial=100_000, reparaciones=300_000, otros=50_000))
    assert r["iva_comision"] == 0 and r["saldo_a_girar"] == 1_200_000

def test_liquidacion_puede_dar_saldo_negativo():
    assert c.liquidar(100_000, 10, 19, True, dict(reparaciones=500_000))["saldo_a_girar"] < 0

def test_liquidacion_sin_canones():
    r = c.liquidar(0, 10, 19, True, dict(predial=90_000))
    assert r["comision"] == 0 and r["saldo_a_girar"] == -90_000

# ---------------------------------------------------------------- impuestos
def test_resumen_de_impuestos_resta_notas_credito():
    docs = [dict(tipo="factura", subtotal=1_000_000, iva=190_000, total=1_190_000, retefuente=110_000, reteica=10_000, reteiva=28_500),
            dict(tipo="nota_credito", subtotal=200_000, iva=38_000, total=238_000, retefuente=22_000, reteica=2_000, reteiva=5_700)]
    r = c.resumen_impuestos(docs, 10)
    assert (r["facturas"], r["notas_credito"]) == (1, 1)
    assert (r["ingresos_netos"], r["iva_generado"], r["total_facturado"]) == (800_000, 152_000, 952_000)
    assert (r["retefuente"], r["reteica"], r["reteiva"]) == (88_000, 8_000, 22_800)
    assert r["ica_causado"] == 8_000

def test_resumen_de_impuestos_vacio():
    r = c.resumen_impuestos([], 10)
    assert r["ingresos_netos"] == 0 and r["ica_causado"] == 0

def test_rango_del_mes():
    assert c.rango_mes("2026-02") == ("2026-02-01", "2026-02-28") and c.rango_mes("2028-02")[1] == "2028-02-29"
    assert c.mes_anterior(date(2026, 1, 15)) == "2025-12"
