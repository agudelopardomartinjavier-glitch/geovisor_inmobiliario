"""Distancias del inmueble a su entorno, calculadas con las capas del POT cargadas en publico.gpkg (metros, EPSG:9377).

Capas que NO existen en el proyecto (no se inventan datos): centros de salud. Ese valor queda en null y la ficha
lo muestra como «sin dato»; ver docs/SEMAFORO.md y el README para incorporar una capa de salud."""
from shapely.geometry import Point
from sqlalchemy.engine import Connection

from .geo import gpkg_a_shapely
from .predio_servicio import candidatas

# Cada fuente: (tabla, fid, campos para el filtro, predicado sobre esos campos)
def _en(campo, valores):
    return lambda a: (a.get(campo) or "") in valores

def _empieza(campo, *prefijos):
    return lambda a: (a.get(campo) or "").casefold().startswith(tuple(p.casefold() for p in prefijos))

FUENTES: dict[str, list[tuple]] = {
    "via_principal_m": [
        ("cu_12_sistema_vial", "gid", ("codigo",), _en("codigo", {"VN", "VA", "VAS", "AV1", "AV2", "AV3", "AV4", "AVP"})),
        ("gen_vias", "gid", ("codigo",), _en("codigo", {"V1", "V2"})),                     # nacional y departamental
        ("cr_11_red_vial", "gid", ("orden",), _empieza("orden", "Primer", "Segundo")),
    ],
    "colegio_m": [
        ("cu_11_equipamientos", "gid", ("codigo",), _en("codigo", {"COL"})),
        ("gen_escuelas_puntos", "gid", ("convencion",), None),
    ],
    "parque_m": [
        ("cu_11_equipamientos", "gid", ("codigo",), _en("codigo", {"PZV"})),
        ("cu_10_espacio_publico", "gid", ("codigo",), _en("codigo", {"PZV"})),
    ],
    # área urbana (no la de expansión): distancia 0 si el inmueble está dentro
    "casco_urbano_m": [("cu_2_perimetros", "gid", ("convencion",), lambda a: "urbana" in (a.get("convencion") or "").casefold() and "expans" not in (a.get("convencion") or "").casefold())],
    "drenaje_m": [("gen_hidrografia_lineas", "gid", ("codigo",), None)],
    "nacimiento_m": [("cg_3_nacimientos", "gid", ("convencion",), None)],
}
SIN_CAPA = ["centro_salud_m"]
RADIOS = (1_000, 4_000, 15_000, 60_000)

def _distancia(conn: Connection, fuentes: list[tuple], p: Point) -> float | None:
    mejor = None
    for tabla, fid, campos, pred in fuentes:
        for r in RADIOS:
            bbox = (p.x - r, p.y - r, p.x + r, p.y + r)
            d = None
            for fila in candidatas(conn, tabla, fid, campos, bbox):
                if pred and not pred(dict(zip(campos, fila[:-1]))):
                    continue
                g = gpkg_a_shapely(fila[-1])
                if g is not None:
                    dd = g.distance(p)
                    d = dd if d is None or dd < d else d
            if d is not None and d <= r:      # con un radio r, todo lo que está a ≤ r está dentro del bbox: el mínimo es exacto
                mejor = d if mejor is None or d < mejor else mejor
                break
    return None if mejor is None else round(mejor)

def calcular(conn: Connection, x: float, y: float) -> dict:
    p = Point(x, y)
    out = {k: _distancia(conn, f, p) for k, f in FUENTES.items()}
    for k in SIN_CAPA:
        out[k] = None
    out["sin_capa"] = SIN_CAPA
    return out
