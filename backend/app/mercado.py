"""Indicadores de mercado y valoración. FUNCIONES PURAS (sin base de datos) para poder probarlas. Método en docs/VALORACION.md.

 - dias_en_mercado: días acumulados con estado «publicado» (se detiene al vender o despublicar).
 - resumen_precios: rebajas, variación acumulada y días desde el último cambio.
 - indicador_precio: precio publicado vs valor estimado por comparables, con margen configurable.
 - rentabilidad_pct: canon anual / valor del inmueble.
 - superficie_idw: valor por m² interpolado (IDW) para el mapa de calor."""
from datetime import date
from statistics import median
from typing import Optional

import numpy as np

# ---------------------------------------------------------------- tiempo en el mercado
def dias_en_mercado(eventos: list[tuple[str, str]], hoy: date) -> dict:
    """`eventos`: [(fecha AAAA-MM-DD, estado)] en orden cronológico. Suma los tramos en que estuvo «publicado»."""
    total, inicio, primera, vendida = 0, None, None, None
    for fecha, estado in eventos:
        d = date.fromisoformat(fecha)
        if estado == "publicado":
            if inicio is None:
                inicio = d
                primera = primera or d
        else:
            if inicio is not None:
                total += max(0, (d - inicio).days)
                inicio = None
            if estado == "vendido" and primera and vendida is None:
                vendida = d
    if inicio is not None:
        total += max(0, (hoy - inicio).days)
    return {
        "dias": total,
        "publicado_desde": primera.isoformat() if primera else None,
        "publicado_ahora": inicio is not None,
        "vendido_el": vendida.isoformat() if vendida else None,
        "dias_hasta_venta": (vendida - primera).days if vendida and primera else None,
    }

# ---------------------------------------------------------------- rebajas
def resumen_precios(serie: list[dict], hoy: date) -> dict:
    """`serie`: [{fecha, precio, tipo}] cronológico. Variación = (último − primero) / primero."""
    if not serie:
        return {"n_cambios": 0, "n_rebajas": 0, "variacion_pct": None, "rebaja_maxima_pct": None, "dias_desde_ultimo_cambio": None}
    cambios = serie[1:]
    rebajas = [s for s in cambios if s["tipo"] == "rebaja"]
    primero, ultimo = serie[0]["precio"], serie[-1]["precio"]
    max_rebaja = None
    for ant, act in zip(serie, serie[1:]):
        if act["precio"] < ant["precio"] and ant["precio"]:
            r = round(100 * (ant["precio"] - act["precio"]) / ant["precio"], 1)
            max_rebaja = r if max_rebaja is None or r > max_rebaja else max_rebaja
    return {
        "n_cambios": len(cambios),
        "n_rebajas": len(rebajas),
        "variacion_pct": round(100 * (ultimo - primero) / primero, 1) if primero else None,
        "rebaja_maxima_pct": max_rebaja,
        "dias_desde_ultimo_cambio": (hoy - date.fromisoformat(serie[-1]["fecha"])).days,
    }

def tipos_de_serie(precios: list[tuple[str, int]]) -> list[tuple[Optional[int], str]]:
    """Para [(fecha, precio)] ya ordenado devuelve [(precio_anterior, tipo)]: inicial / rebaja / aumento."""
    out, ant = [], None
    for _, p in precios:
        out.append((ant, "inicial" if ant is None else "rebaja" if p < ant else "aumento"))
        ant = p
    return out

# ---------------------------------------------------------------- precio publicado vs valor estimado
def indicador_precio(precio: Optional[int], estimado: Optional[int], n: int, cv_ok: Optional[bool], tolerancia_pct: float) -> dict:
    """Clasifica el precio frente al valor estimado por comparables.
    por_debajo: precio < estimado × (1 − tol). por_encima: precio > estimado × (1 + tol). Entre ambos: en_rango.
    Confianza: alta con ≥ 3 comparables y CV dentro del umbral; media con ≥ 3; baja con menos."""
    if not precio or not estimado:
        return {"clasificacion": "sin_dato", "dif_pct": None, "confianza": None, "tolerancia_pct": tolerancia_pct}
    dif = 100 * (precio - estimado) / estimado
    clase = "por_debajo" if dif < -tolerancia_pct else "por_encima" if dif > tolerancia_pct else "en_rango"
    confianza = "baja" if n < 3 else "alta" if cv_ok else "media"
    return {"clasificacion": clase, "dif_pct": round(dif, 1), "confianza": confianza, "tolerancia_pct": tolerancia_pct}

# ---------------------------------------------------------------- rentabilidad
def rentabilidad_pct(canon_mensual: Optional[float], valor: Optional[float]) -> Optional[float]:
    """Rentabilidad bruta anual = canon mensual × 12 / valor del inmueble (en %)."""
    if not canon_mensual or not valor:
        return None
    return round(100 * canon_mensual * 12 / valor, 2)

def canon_estimado(arriendos: list[tuple[float, float]], area_sujeto: Optional[float], min_n: int = 2) -> Optional[dict]:
    """Canon por m² mediano de [(canon, área)] × área del sujeto. None si hay pocos datos o falta el área."""
    unit = [c / a for c, a in arriendos if c and a]
    if len(unit) < min_n or not area_sujeto:
        return None
    return {"canon": round(median(unit) * area_sujeto), "n": len(unit), "canon_m2": round(median(unit))}

# ---------------------------------------------------------------- estadística por sector
def estadisticas(valores: list[float]) -> dict:
    v = sorted(valores)
    n = len(v)
    q = (lambda p: float(np.percentile(v, p))) if n else (lambda p: None)
    return {"n": n, "mediana": round(q(50)) if n else None, "p25": round(q(25)) if n else None, "p75": round(q(75)) if n else None,
            "minimo": round(v[0]) if n else None, "maximo": round(v[-1]) if n else None}

# ---------------------------------------------------------------- mapa de calor (IDW)
def superficie_idw(x: np.ndarray, y: np.ndarray, v: np.ndarray, celda: float, radio: float, min_vecinos: int,
                   recorte_pct: float = 5, max_celdas: int = 4000, potencia: float = 2.0) -> dict:
    """Interpola el valor por m² en una rejilla (coordenadas métricas). Solo se pintan celdas con ≥ min_vecinos datos
    dentro de `radio` (no se extrapola). Los valores se recortan a [P recorte, P 100−recorte] antes de interpolar.
    Devuelve {celdas: [(cx, cy, valor, n_vecinos)], celda, vmin, vmax} con la celda efectiva (crece si hay demasiadas)."""
    if len(v) < max(3, min_vecinos):
        return {"celdas": [], "celda": celda, "vmin": None, "vmax": None, "recorte": None}
    lo, hi = (float(np.percentile(v, recorte_pct)), float(np.percentile(v, 100 - recorte_pct))) if len(v) >= 10 else (float(v.min()), float(v.max()))
    vc = np.clip(v, lo, hi)
    for _ in range(8):
        gx = np.arange(x.min() - radio, x.max() + radio + celda, celda) + celda / 2
        gy = np.arange(y.min() - radio, y.max() + radio + celda, celda) + celda / 2
        cx, cy = np.meshgrid(gx, gy)
        cx, cy = cx.ravel(), cy.ravel()
        out = []
        for i in range(0, len(cx), 4000):
            px, py = cx[i:i + 4000, None], cy[i:i + 4000, None]
            d = np.hypot(px - x[None, :], py - y[None, :])
            dentro = d <= radio
            n = dentro.sum(axis=1)
            ok = n >= min_vecinos
            if not ok.any():
                continue
            w = np.where(dentro[ok], 1.0 / (d[ok] + celda / 2) ** potencia, 0.0)
            val = (w * vc[None, :]).sum(axis=1) / w.sum(axis=1)
            for a, b, c, k in zip(px[ok, 0], py[ok, 0], val, n[ok]):
                out.append((float(a), float(b), float(c), int(k)))
        if len(out) <= max_celdas:
            break
        celda *= 1.5
    vals = [c[2] for c in out]
    return {"celdas": out, "celda": celda, "vmin": min(vals) if vals else None, "vmax": max(vals) if vals else None, "recorte": [lo, hi]}
