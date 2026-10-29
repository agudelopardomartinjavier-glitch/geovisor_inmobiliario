"""Reglas del semáforo (funciones puras): cada regla de docs/SEMAFORO.md tiene su prueba."""
from datetime import date, timedelta

from app.semaforo import AMARILLO, ROJO, VERDE, Entrada, evaluar

HOY = date(2026, 10, 29)

def jur_ok(**kw):
    base = dict(matricula_inmobiliaria="236-12345", hipoteca=0, embargo=0, afectacion_vivienda_familiar=0, sucesion_pendiente=0,
                servidumbres=None, litigios=None, predial_estado="al_dia", valorizacion_estado="sin_cobro")
    base.update(kw)
    return base

CERT_VIGENTE = [dict(tipo="certificado_tradicion", fecha_documento=(HOY - timedelta(days=5)).isoformat(), fecha_vencimiento=None)]

def entrada(**kw):
    base = dict(tipo="casa", amenaza_pct=0, proteccion_pct=0, conflicto_pct=0, uso_dominante="AAC1", juridico=jur_ok(), soportes=CERT_VIGENTE, hoy=HOY)
    base.update(kw)
    return Entrada(**base)

def codigos(r):
    return {h.codigo for h in r.hallazgos}

def test_todo_en_orden_es_verde():
    r = evaluar(entrada())
    assert r.color == VERDE and r.hallazgos == [] and r.categorias == []

def test_amenaza_a_partir_del_umbral_rojo():
    assert evaluar(entrada(amenaza_pct=50, amenaza_tipos=["inundación"])).color == ROJO
    r = evaluar(entrada(amenaza_pct=49.9))
    assert r.color == AMARILLO and "A2" in codigos(r)

def test_amenaza_bajo_el_umbral_amarillo_se_ignora():
    assert evaluar(entrada(amenaza_pct=4.9)).color == VERDE

def test_proteccion_rojo_y_amarillo():
    assert evaluar(entrada(proteccion_pct=80, proteccion_motivos=["humedal"])).color == ROJO
    assert "A4" in codigos(evaluar(entrada(proteccion_pct=10)))

def test_umbrales_son_parametros():
    assert evaluar(entrada(amenaza_pct=30), umbral_rojo=25).color == ROJO
    assert evaluar(entrada(amenaza_pct=8), umbral_amarillo=10).color == VERDE

def test_conflicto_de_uso_amarillo():
    assert "N1" in codigos(evaluar(entrada(conflicto_pct=12)))

def test_sin_cobertura_normativa_amarillo():
    assert "N2" in codigos(evaluar(entrada(uso_dominante=None, sin_cobertura_normativa=True)))

def test_uso_incompatible_con_el_tipo():
    assert "N3" in codigos(evaluar(entrada(tipo="local", uso_dominante="AAR1")))
    assert "N3" not in codigos(evaluar(entrada(tipo="casa", uso_dominante="AAR1")))
    assert "N3" in codigos(evaluar(entrada(tipo="casa", uso_dominante="AAPP")))

def test_no_medido_es_amarillo():
    r = evaluar(Entrada(tipo="lote", medido=False, juridico=jur_ok(), soportes=CERT_VIGENTE, hoy=HOY))
    assert r.color == AMARILLO and "A0" in codigos(r)

def test_juridico_sin_diligenciar_amarillo():
    r = evaluar(entrada(juridico=None))
    assert r.color == AMARILLO and "J0" in codigos(r)

def test_embargo_litigio_sucesion_son_rojo():
    for kw, cod in (({"embargo": 1}, "J1"), ({"litigios": "Proceso ejecutivo 2025-123"}, "J2"), ({"sucesion_pendiente": 1}, "J3")):
        r = evaluar(entrada(juridico=jur_ok(**kw)))
        assert r.color == ROJO and cod in codigos(r)

def test_gravamenes_menores_son_amarillo():
    for kw, cod in (({"hipoteca": 1}, "J4"), ({"afectacion_vivienda_familiar": 1}, "J5"), ({"servidumbres": "Paso"}, "J6"),
                    ({"predial_estado": "mora"}, "J7"), ({"valorizacion_estado": "pendiente"}, "J8")):
        r = evaluar(entrada(juridico=jur_ok(**kw)))
        assert r.color == AMARILLO and cod in codigos(r), cod

def test_estado_juridico_incompleto():
    assert "J9" in codigos(evaluar(entrada(juridico=jur_ok(matricula_inmobiliaria=None))))
    assert "J9" in codigos(evaluar(entrada(juridico=jur_ok(embargo=None))))

def test_certificado_de_tradicion():
    assert "J10" in codigos(evaluar(entrada(soportes=[])))                                       # no hay
    viejo = [dict(tipo="certificado_tradicion", fecha_documento=(HOY - timedelta(days=60)).isoformat(), fecha_vencimiento=None)]
    assert "J10" in codigos(evaluar(entrada(soportes=viejo)))                                    # 60 d > 30 d de vigencia
    assert "J10" not in codigos(evaluar(entrada(soportes=viejo), dias_certificado=90))           # la vigencia es parámetro
    vencido = [dict(tipo="certificado_tradicion", fecha_documento=None, fecha_vencimiento=(HOY - timedelta(days=1)).isoformat())]
    assert "J10" in codigos(evaluar(entrada(soportes=vencido)))
    vigente = [dict(tipo="certificado_tradicion", fecha_documento=None, fecha_vencimiento=HOY.isoformat())]
    assert "J10" not in codigos(evaluar(entrada(soportes=vigente)))                              # vence hoy = aún vigente

def test_gana_el_peor_nivel():
    r = evaluar(entrada(juridico=jur_ok(embargo=1, hipoteca=1), amenaza_pct=10))
    assert r.color == ROJO and set(r.categorias) == {"juridico", "ambiental"}

def test_resumen_publico_no_filtra_el_motivo():
    r = evaluar(entrada(juridico=jur_ok(embargo=1, litigios="Proceso X"), amenaza_pct=60, amenaza_tipos=["inundación"]))
    txt = r.resumen_publico.lower()
    for prohibido in ("embargo", "litigio", "proceso", "inundación", "hipoteca", "%"):
        assert prohibido not in txt
    assert txt.startswith("riesgo alto")
