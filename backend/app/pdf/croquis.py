"""Croquis vectorial (sin teselas externas) del predio y su entorno catastral, en metros EPSG:9377."""
from typing import Optional

from reportlab.graphics.shapes import Circle, Drawing, Line, Polygon, Rect, String
from reportlab.lib import colors
from shapely.geometry import MultiPolygon, Polygon as ShPolygon, box

from ..geo import gpkg_a_shapely
from ..predio_servicio import candidatas

MAX_POLIGONOS = 900
ESCALAS_M = (5, 10, 20, 50, 100, 200, 500, 1000, 2000, 5000, 10000)

def _partes(g):
    if g is None:
        return []
    if isinstance(g, ShPolygon):
        return [g]
    if isinstance(g, MultiPolygon):
        return list(g.geoms)
    return [p for p in getattr(g, "geoms", []) if isinstance(p, ShPolygon)]

def croquis(conn, ancho: float, alto: float, sujeto_geom=None, sujeto_punto: Optional[tuple[float, float]] = None,
            extras: Optional[list[tuple[float, float, str]]] = None, color_extra=colors.HexColor("#7c3aed")) -> Drawing:
    """sujeto_geom: predio del inmueble (shapely, 9377); sujeto_punto: (x, y); extras: [(x, y, etiqueta)] p. ej. comparables."""
    extras = extras or []
    pts = [p for p in [sujeto_punto] if p] + [(x, y) for x, y, _ in extras]
    xs, ys = [p[0] for p in pts], [p[1] for p in pts]
    if sujeto_geom is not None:
        b = sujeto_geom.bounds
        xs += [b[0], b[2]]; ys += [b[1], b[3]]
    d = Drawing(ancho, alto)
    d.add(Rect(0, 0, ancho, alto, fillColor=colors.white, strokeColor=colors.HexColor("#d1d5db"), strokeWidth=0.6))
    if not xs:
        d.add(String(ancho / 2, alto / 2, "Sin ubicación", textAnchor="middle", fontSize=9, fillColor=colors.grey))
        return d
    x0, x1, y0, y1 = min(xs), max(xs), min(ys), max(ys)
    lado = max(x1 - x0, y1 - y0, 40.0)
    margen = max(lado * 0.35, 35.0)
    x0 -= margen; x1 += margen; y0 -= margen; y1 += margen
    k = min(ancho / (x1 - x0), alto / (y1 - y0))
    ox = (ancho - (x1 - x0) * k) / 2 - x0 * k
    oy = (alto - (y1 - y0) * k) / 2 - y0 * k
    T = lambda x, y: (x * k + ox, y * k + oy)   # noqa: E731

    # región del mundo que realmente cabe en el dibujo: todo se recorta a ella para no salirse del marco
    vis = box(-ox / k, -oy / k, (ancho - ox) / k, (alto - oy) / k)

    def dibujar(geom, relleno, borde, grosor, simplificar=0.0):
        for p in _partes(geom):
            p = p.simplify(simplificar) if simplificar else p
            for q in _partes(p.intersection(vis)):
                if q.is_empty:
                    continue
                d.add(Polygon([c for x, y in q.exterior.coords for c in T(x, y)], fillColor=relleno, strokeColor=borde, strokeWidth=grosor))

    # predios vecinos (fondo)
    vecinos = candidatas(conn, "predios", "id", ("numero_predial",), vis.bounds)[:MAX_POLIGONOS]
    for fila in vecinos:
        dibujar(gpkg_a_shapely(fila[-1]), colors.HexColor("#f3f4f6"), colors.HexColor("#9ca3af"), 0.35, 0.6 / k)
    # predio del sujeto
    dibujar(sujeto_geom, colors.HexColor("#fde68a"), colors.HexColor("#b45309"), 1.2)
    # comparables / puntos extra
    for x, y, et in extras:
        px, py = T(x, y)
        d.add(Circle(px, py, 6.5, fillColor=color_extra, strokeColor=colors.white, strokeWidth=1))
        d.add(String(px, py - 2.6, et, textAnchor="middle", fontSize=7, fontName="Helvetica-Bold", fillColor=colors.white))
    if sujeto_punto:
        px, py = T(*sujeto_punto)
        d.add(Circle(px, py, 6, fillColor=colors.HexColor("#dc2626"), strokeColor=colors.white, strokeWidth=1.4))
    # escala
    objetivo = (ancho * 0.28) / k
    largo = min(ESCALAS_M, key=lambda m: abs(m - objetivo))
    sx, sy = 10, 10
    d.add(Line(sx, sy, sx + largo * k, sy, strokeColor=colors.black, strokeWidth=1.6))
    d.add(Line(sx, sy - 3, sx, sy + 3, strokeColor=colors.black, strokeWidth=1))
    d.add(Line(sx + largo * k, sy - 3, sx + largo * k, sy + 3, strokeColor=colors.black, strokeWidth=1))
    d.add(String(sx, sy + 5, f"{largo} m" if largo < 1000 else f"{largo // 1000} km", fontSize=7.5))
    # norte
    nx, ny = ancho - 16, alto - 30
    d.add(Polygon([nx, ny + 16, nx - 5, ny, nx + 5, ny], fillColor=colors.black, strokeColor=colors.black))
    d.add(String(nx, ny - 9, "N", textAnchor="middle", fontSize=8, fontName="Helvetica-Bold"))
    return d
