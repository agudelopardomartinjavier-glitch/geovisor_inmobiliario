"""Análisis de un predio contra el POT y el POMCA. Lo usan la API de predios y los PDF."""
from dataclasses import dataclass, field
from typing import Optional

from shapely.ops import unary_union
from sqlalchemy import select, text
from sqlalchemy.engine import Connection

from .geo import gpkg_a_shapely
from .models.tablas import CRUCES_POMCA, CRUCES_POT, UBICACION, predios

CODIGOS_URBANOS = {"SU", "SE", "SUCP"}   # suelo urbano, de expansión, centros poblados
SOLO_RURAL = {"uso_rural", "destinacion"}
SOLO_URBANO = {"uso_urbano", "tratamiento", "amenaza"}
MIN_PORCENTAJE = 0.05  # se ignoran cruces menores a 0,05 % del predio (astillas)

@dataclass
class Analisis:
    filas: list
    geom: object                     # shapely, EPSG:9377
    area: float
    uso: list[tuple[str, str, list]] = field(default_factory=list)     # (clave, título, items)
    pomca: list[tuple[str, str, list]] = field(default_factory=list)
    ubicacion: dict = field(default_factory=dict)

def candidatas(conn: Connection, tabla: str, fid: str, campos: tuple[str, ...], bbox):
    """Filas cuyo bbox (índice R-tree del GeoPackage) toca el bbox dado. Los nombres vienen de listas blancas."""
    cols = ", ".join(f't."{c}"' for c in campos)
    sql = text(f'''SELECT {cols}, t.geom FROM "rtree_{tabla}_geom" r JOIN "{tabla}" t ON t."{fid}" = r.id
                   WHERE r.maxx >= :x0 AND r.minx <= :x1 AND r.maxy >= :y0 AND r.miny <= :y1''')
    return conn.execute(sql, dict(x0=bbox[0], y0=bbox[1], x1=bbox[2], y1=bbox[3])).all()

def cruzar(conn, spec, geom, area):
    tabla, fid, campos, _titulo = spec
    items = []
    for fila in candidatas(conn, tabla, fid, campos, geom.bounds):
        g = gpkg_a_shapely(fila[-1])
        if g is None or not g.intersects(geom):
            continue
        a = g.intersection(geom).area
        pct = 100 * a / area if area else 0
        if pct >= MIN_PORCENTAJE:
            items.append(dict(atributos=dict(zip(campos, fila[:-1])), area_m2=round(a, 2), porcentaje_predio=round(pct, 2)))
    items.sort(key=lambda i: -i["area_m2"])
    return items

def analizar(conn: Connection, numero_predial: str) -> Optional[Analisis]:
    filas = conn.execute(select(predios).where(predios.c.numero_predial == numero_predial)).all()
    if not filas:
        return None
    g = unary_union([x for x in (gpkg_a_shapely(f.geom) for f in filas) if x is not None])
    area = g.area
    a = Analisis(filas=filas, geom=g, area=area)

    # Las planchas urbanas y rurales se solapan en el borde: solo se muestran las del ámbito dominante del predio
    clasif = cruzar(conn, CRUCES_POT["clasificacion"], g, area)
    urbano = bool(clasif) and clasif[0]["atributos"]["codigo"] in CODIGOS_URBANOS
    omitir = SOLO_RURAL if urbano else SOLO_URBANO
    for k, s in CRUCES_POT.items():
        if k in omitir:
            continue
        items = clasif if k == "clasificacion" else cruzar(conn, s, g, area)
        if items:
            a.uso.append((k, s[3], items))
    for k, s in CRUCES_POMCA.items():
        if (items := cruzar(conn, s, g, area)):
            a.pomca.append((k, s[3], items))
    # Barrio / vereda: el polígono que más área comparte con el predio
    for k, (tabla, fid, campos) in UBICACION.items():
        mejor = cruzar(conn, (tabla, fid, campos, ""), g, area)
        a.ubicacion[k] = (mejor[0]["atributos"].get("convencion") or mejor[0]["atributos"].get("vereda")) if mejor else None
    return a
