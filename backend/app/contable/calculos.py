"""Cálculos contables y de arriendos. FUNCIONES PURAS (sin base de datos): comisiones, IVA y retenciones, canon con IPC,
regla del 1 % (Ley 820 de 2003), mora, aplicación de pagos, liquidación al propietario y resumen de impuestos.

Dinero en COP enteros, con redondeo «half up» (0,5 sube). Ninguna tarifa va fija aquí: todas llegan como argumento
(desde la tabla `parametros`). Los textos # CONFIRMAR indican supuestos que debe validar un contador o abogado."""
import calendar
from dataclasses import dataclass
from datetime import date, timedelta
from decimal import ROUND_HALF_UP, Decimal
from typing import Optional

def cop(x) -> int:
    """Redondea a peso entero, mitad hacia arriba."""
    return int(Decimal(str(x)).quantize(Decimal(1), rounding=ROUND_HALF_UP))

def pct_de(base, pct) -> int:
    """pct % de base, redondeado a peso."""
    return cop(Decimal(str(base)) * Decimal(str(pct)) / 100)

def por_mil_de(base, por_mil) -> int:
    return cop(Decimal(str(base)) * Decimal(str(por_mil)) / 1000)

# ---------------------------------------------------------------- comisiones
@dataclass(frozen=True)
class Tarifas:
    iva_pct: float
    retefuente_pct: float
    reteica_por_mil: float
    reteiva_pct: float                 # % del IVA
    retefuente_base_minima: int = 0

def calcular_comision(base: int, pct_pactado: float, t: Tarifas, aplica_iva: bool = True, aplica_retenciones: bool = True,
                      asesor_pct: float = 0, referido_pct: float = 0) -> dict:
    """Comisión = base × % pactado. IVA sobre la comisión. Retenciones (las que practica quien paga) sobre la comisión
    (retefuente, reteICA) y sobre el IVA (reteIVA). Reparto: asesor y referido sobre la comisión antes de IVA.
    # CONFIRMAR con un contador: qué retenciones aplican según quién paga y su régimen."""
    if base <= 0 or pct_pactado <= 0:
        raise ValueError("La base y el porcentaje deben ser positivos")
    if asesor_pct < 0 or referido_pct < 0 or asesor_pct + referido_pct > 100:
        raise ValueError("El reparto del asesor y del referido no puede superar el 100 % de la comisión")
    valor = pct_de(base, pct_pactado)
    iva = pct_de(valor, t.iva_pct) if aplica_iva else 0
    retefuente = pct_de(valor, t.retefuente_pct) if aplica_retenciones and valor >= t.retefuente_base_minima else 0
    reteica = por_mil_de(valor, t.reteica_por_mil) if aplica_retenciones else 0
    reteiva = pct_de(iva, t.reteiva_pct) if aplica_retenciones else 0
    total = valor + iva
    asesor = pct_de(valor, asesor_pct)
    referido = pct_de(valor, referido_pct)
    return dict(valor_comision=valor, iva=iva, retefuente=retefuente, reteica=reteica, reteiva=reteiva, total_facturable=total,
                neto_a_recibir=total - retefuente - reteica - reteiva,
                asesor_valor=asesor, referido_valor=referido, inmobiliaria_valor=valor - asesor - referido)

def porcion_comision(c: dict, fraccion_pct: float, ya_facturado: Optional[dict] = None, es_resto: bool = False) -> dict:
    """Parte de la comisión que cubre una factura. Si es el resto (lo último por facturar) se calcula por diferencia,
    para que la suma de las facturas coincida exacta con la comisión (sin diferencias de 1 peso por redondeo)."""
    claves = (("subtotal", "valor_comision"), ("iva", "iva"), ("retefuente", "retefuente"), ("reteica", "reteica"), ("reteiva", "reteiva"))
    previo = ya_facturado or {}
    out = {}
    for k, ck in claves:
        out[k] = c[ck] - previo.get(k, 0) if es_resto else pct_de(c[ck], fraccion_pct)
    out["total"] = out["subtotal"] + out["iva"]
    return out

# ---------------------------------------------------------------- canon con IPC (Ley 820 de 2003, art. 20)
def _aniversario(inicio: date, k: int) -> date:
    y = inicio.year + k
    return date(y, inicio.month, min(inicio.day, calendar.monthrange(y, inicio.month)[1]))

def canon_vigente(canon_inicial: int, fecha_inicio: date, fecha: date, ipc_por_anio: dict[int, float],
                  tope_pct_ipc: float = 100, incrementa: bool = True) -> dict:
    """Canon que rige en `fecha`. En cada aniversario del contrato sube según el IPC del año calendario anterior
    (aniversario en 2026 → IPC de 2025), limitado a `tope_pct_ipc` % de ese IPC (Ley 820: 100 %). Si el IPC de un año
    no está cargado, ese aumento NO se aplica y se reporta en `faltantes` (hay que cargar el dato y recalcular)."""
    canon, aumentos, faltantes = canon_inicial, [], []
    k = 1
    while incrementa and _aniversario(fecha_inicio, k) <= fecha:
        f = _aniversario(fecha_inicio, k)
        anio = f.year - 1
        if anio in ipc_por_anio:
            pct = max(0.0, ipc_por_anio[anio]) * tope_pct_ipc / 100
            canon = pct_de(canon, 100 + pct)
            aumentos.append(dict(fecha=f.isoformat(), anio_ipc=anio, pct_aplicado=round(pct, 4), canon=canon))
        else:
            faltantes.append(anio)
        k += 1
    return dict(canon=canon, aumentos=aumentos, faltantes=faltantes)

def limite_canon_ley820(canon: int, valor_comercial: Optional[int], uso: str, max_pct: float = 1.0) -> dict:
    """Vivienda urbana: el canon mensual no puede exceder `max_pct` % (1 %) del valor comercial del inmueble.
    # CONFIRMAR con un abogado: aplica a vivienda urbana; otros usos quedan fuera."""
    if uso != "vivienda_urbana":
        return dict(aplica=False, limite=None, excede=False, exceso=0, motivo="La regla del 1 % es solo para vivienda urbana")
    if not valor_comercial:
        return dict(aplica=True, limite=None, excede=False, exceso=0, motivo="Sin valor comercial de referencia: no se puede verificar")
    limite = pct_de(valor_comercial, max_pct)
    return dict(aplica=True, limite=limite, excede=canon > limite, exceso=max(0, canon - limite), motivo=None)

def dias_para_vencer(fecha_fin: date, hoy: date) -> int:
    return (fecha_fin - hoy).days

# ---------------------------------------------------------------- cobros y mora
def fecha_vencimiento_periodo(periodo: str, dia_pago: int) -> date:
    y, m = int(periodo[:4]), int(periodo[5:7])
    return date(y, m, min(dia_pago, calendar.monthrange(y, m)[1]))

def periodos_entre(desde: date, hasta: date) -> list[str]:
    out, y, m = [], desde.year, desde.month
    while (y, m) <= (hasta.year, hasta.month):
        out.append(f"{y:04d}-{m:02d}")
        m += 1
        if m == 13:
            y, m = y + 1, 1
    return out

def dias_mora(fecha_vencimiento: date, hoy: date, gracia: int = 0) -> int:
    return max(0, (hoy - fecha_vencimiento).days - gracia)

def interes_mora(saldo: int, dias: int, tasa_mensual_pct: float) -> int:
    """Interés simple: saldo × tasa mensual × días/30. # CONFIRMAR: la tasa no puede superar la de usura vigente."""
    if saldo <= 0 or dias <= 0:
        return 0
    return cop(Decimal(saldo) * Decimal(str(tasa_mensual_pct)) / 100 * Decimal(dias) / 30)

def tramo_mora(dias: int) -> str:
    return "al_dia" if dias <= 0 else "1-30" if dias <= 30 else "31-60" if dias <= 60 else "61-90" if dias <= 90 else "mas_de_90"

def aplicar_pago(valor: int, cobros: list[dict]) -> tuple[list[tuple[int, int]], int]:
    """Reparte un pago entre los cobros pendientes, del más antiguo (vencimiento, luego id) al más reciente.
    `cobros`: [{id, saldo, fecha_vencimiento}]. Devuelve ([(cobro_id, valor)], sobrante sin aplicar)."""
    restante, out = valor, []
    for c in sorted(cobros, key=lambda c: (c["fecha_vencimiento"], c["id"])):
        if restante <= 0:
            break
        v = min(restante, c["saldo"])
        if v > 0:
            out.append((c["id"], v))
            restante -= v
    return out, restante

def validar_aplicaciones(valor: int, aplicaciones: list[tuple[int, int]], saldos: dict[int, int]):
    """El recibo no puede aplicar más de su valor ni más del saldo de cada cobro."""
    if any(v <= 0 for _, v in aplicaciones):
        raise ValueError("Cada aplicación debe ser positiva")
    if sum(v for _, v in aplicaciones) > valor:
        raise ValueError("Se aplica más de lo que vale el recibo")
    usado: dict[int, int] = {}
    for cid, v in aplicaciones:
        if cid not in saldos:
            raise ValueError(f"El cobro {cid} no existe o no tiene saldo")
        usado[cid] = usado.get(cid, 0) + v
        if usado[cid] > saldos[cid]:
            raise ValueError(f"El cobro {cid} tiene un saldo de {saldos[cid]} y se intenta aplicar {usado[cid]}")

# ---------------------------------------------------------------- cuentas del propietario
def liquidar(canones_recibidos: int, comision_pct: float, iva_pct: float, cobra_iva: bool, gastos: dict[str, int],
             comision: Optional[int] = None) -> dict:
    """saldo a girar = cánones recibidos − comisión − IVA de la comisión − administración − predial − reparaciones − otros.
    `gastos`: {administracion, predial, reparaciones, otros} (a cargo del propietario). Puede dar negativo (el propietario
    queda debiendo a la inmobiliaria). # CONFIRMAR con un contador el tratamiento del IVA y de retenciones al arrendador."""
    if comision is None:           # con varios contratos de % distinto, el llamador suma las comisiones ya calculadas
        comision = pct_de(canones_recibidos, comision_pct)
    iva = pct_de(comision, iva_pct) if cobra_iva else 0
    g = {k: int(gastos.get(k, 0)) for k in ("administracion", "predial", "reparaciones", "otros")}
    return dict(canones_recibidos=canones_recibidos, comision=comision, iva_comision=iva, **g,
                saldo_a_girar=canones_recibidos - comision - iva - sum(g.values()))

def clasificar_gasto(categoria: str, subtipo: Optional[str]) -> str:
    """Línea de la liquidación a la que pertenece un gasto a cargo del propietario."""
    if categoria == "administracion_ph":
        return "administracion"
    if categoria == "impuesto" and (subtipo or "").strip().casefold() == "predial":
        return "predial"
    if categoria == "mantenimiento":
        return "reparaciones"
    return "otros"

# ---------------------------------------------------------------- impuestos (resumen para el contador)
def resumen_impuestos(documentos: list[dict], ica_por_mil: float) -> dict:
    """`documentos`: facturas y notas crédito del periodo [{tipo, subtotal, iva, total, retefuente, reteica, reteiva}].
    Las notas crédito restan. ICA causado = ingresos netos × tarifa por mil. # CONFIRMAR con un contador."""
    s = {k: 0 for k in ("subtotal", "iva", "total", "retefuente", "reteica", "reteiva")}
    n_f = n_nc = 0
    for d in documentos:
        signo = -1 if d["tipo"] == "nota_credito" else 1
        n_f += d["tipo"] == "factura"
        n_nc += d["tipo"] == "nota_credito"
        for k in s:
            s[k] += signo * d[k]
    return dict(facturas=n_f, notas_credito=n_nc, ingresos_netos=s["subtotal"], iva_generado=s["iva"], total_facturado=s["total"],
                retefuente=s["retefuente"], reteica=s["reteica"], reteiva=s["reteiva"],
                ica_causado=por_mil_de(max(0, s["subtotal"]), ica_por_mil), ica_por_mil=ica_por_mil)

def rango_mes(periodo: str) -> tuple[str, str]:
    """('2026-10-01', '2026-10-31') para un periodo AAAA-MM."""
    y, m = int(periodo[:4]), int(periodo[5:7])
    return f"{y:04d}-{m:02d}-01", f"{y:04d}-{m:02d}-{calendar.monthrange(y, m)[1]:02d}"

def mes_anterior(hoy: date) -> str:
    p = hoy.replace(day=1) - timedelta(days=1)
    return f"{p.year:04d}-{p.month:02d}"
