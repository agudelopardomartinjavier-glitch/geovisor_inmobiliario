"""Valoración por método de comparación de mercado. Funciones puras (sin base de datos) para poder probarlas.

Valor unitario = precio / área; ajustado = unitario × (1 + ajuste%/100).
Valor estimado = promedio de los unitarios ajustados × área del inmueble evaluado.
El área base es el terreno para lote y finca, y el área construida para casa, local y apartamento.
"""
from dataclasses import dataclass
from math import sqrt
from statistics import mean, median, stdev
from typing import Optional

# Umbral de referencia del coeficiente de variación (Res. IGAC 620/2008). Es solo un indicador: se muestra, no bloquea.
CV_UMBRAL_PCT = 7.5
MIN_COMPARABLES = 3

BASE_POR_TIPO = {"lote": "terreno", "finca": "terreno", "casa": "construida", "local": "construida", "apartamento": "construida"}

@dataclass
class Comp:
    id: int
    precio: int
    area_terreno: Optional[float]
    area_construida: Optional[float]
    ajuste_pct: float = 0.0
    incluir: bool = True

def area_base(tipo: str) -> str:
    return BASE_POR_TIPO[tipo]

def _area(c: Comp, base: str) -> Optional[float]:
    return c.area_terreno if base == "terreno" else c.area_construida

def unitarios(comps: list[Comp], base: str) -> list[dict]:
    """Un dict por comparable con su valor unitario y el ajustado; los que no tienen el área base quedan 'sin_area'."""
    out = []
    for c in comps:
        a = _area(c, base)
        if not a:
            out.append(dict(id=c.id, unitario=None, ajustado=None, usado=False, motivo=f"sin área de {base}"))
            continue
        u = c.precio / a
        aj = u * (1 + c.ajuste_pct / 100)
        out.append(dict(id=c.id, unitario=round(u, 2), ajustado=round(aj, 2), usado=c.incluir, motivo=None if c.incluir else "excluido"))
    return out

def valorar(tipo: str, area_sujeto: Optional[float], comps: list[Comp]) -> dict:
    base = area_base(tipo)
    detalle = unitarios(comps, base)
    usados = [d["ajustado"] for d in detalle if d["usado"]]
    avisos: list[str] = []
    r: dict = dict(base=base, area_sujeto=area_sujeto, detalle=detalle, n=len(usados), avisos=avisos,
                   media=None, mediana=None, desviacion=None, cv_pct=None, valor_estimado=None,
                   rango_bajo=None, rango_alto=None, cv_ok=None, umbral_cv_pct=CV_UMBRAL_PCT)
    if not usados:
        avisos.append("No hay comparables utilizables.")
        return r
    m = mean(usados)
    r["media"], r["mediana"] = round(m, 2), round(median(usados), 2)
    if len(usados) >= 2:
        s = stdev(usados)
        r["desviacion"] = round(s, 2)
        r["cv_pct"] = round(100 * s / m, 2) if m else None
        r["cv_ok"] = r["cv_pct"] is not None and r["cv_pct"] <= CV_UMBRAL_PCT
        if not r["cv_ok"]:
            avisos.append(f"El coeficiente de variación ({r['cv_pct']} %) supera el umbral de referencia de {CV_UMBRAL_PCT} %: revisa los datos atípicos o los ajustes.")
    if len(usados) < MIN_COMPARABLES:
        avisos.append(f"Se recomiendan al menos {MIN_COMPARABLES} comparables (hay {len(usados)}).")
    if not area_sujeto:
        avisos.append(f"El inmueble no tiene área de {base}: no se puede calcular el valor total.")
        return r
    r["valor_estimado"] = round(m * area_sujeto)
    if r["desviacion"] is not None:
        r["rango_bajo"] = round((m - r["desviacion"]) * area_sujeto)
        r["rango_alto"] = round((m + r["desviacion"]) * area_sujeto)
    return r

def distancia(x1: float, y1: float, x2: float, y2: float) -> float:
    return sqrt((x1 - x2) ** 2 + (y1 - y2) ** 2)   # EPSG:9377 está en metros
