"""Cruce espacial del semáforo: mide qué porcentaje del predio cae en cada tipo de afectación.
Las reglas que convierten esos porcentajes en color están en app/semaforo.py (puras y con pruebas)."""
from typing import Optional

from shapely.geometry import Point
from shapely.ops import unary_union
from sqlalchemy import select
from sqlalchemy.engine import Connection

from .geo import gpkg_a_shapely
from .models.tablas import predios
from .predio_servicio import CODIGOS_URBANOS, candidatas
from .semaforo import Entrada, USOS_PROTECCION

def _c(campo, *prefijos):
    return lambda a: (a.get(campo) or "").casefold().startswith(tuple(p.casefold() for p in prefijos))

# (tabla, campos, predicado, motivo). Los valores de código salen de las capas reales (ver docs/SEMAFORO.md).
AMENAZA = [("cu_13_amenazas", ("codigo",), None, None)]
_AMENAZA_NOMBRE = {"ADZ": "deslizamiento", "AIN": "inundación"}
PROTECCION = [
    ("cu_12_proteccion", ("codigo",), None, "protección urbana (POT)"),
    ("cg_3_proteccion_hidrica", ("codigo",), None, "ronda hídrica / nacimientos"),
    ("gen_humedales", ("codigo",), None, "humedal"),
    ("cr_2_areas_manejo_especial", ("codigo",), None, "área de manejo especial"),
    ("gen_areas_especiales", ("codigo",), None, "área especial"),
    ("cr_5_usos_suelo", ("codigo",), lambda a: a.get("codigo") in USOS_PROTECCION, "uso rural de protección"),
    ("pomca_guayuriba", ("categ_orde",), _c("categ_orde", "Conservaci"), "POMCA Guayuriba: conservación y protección"),
    ("pomca_acacias_pajure", ("codigofin",), lambda a: a.get("codigofin") in {"CS", "PR", "RS"}, "POMCA Acacías–Pajure: conservación/preservación/restauración"),
]
CONFLICTO = [("cu_8_conflictos_uso", ("codigo",), None, None), ("cr_9_conflictos_uso", ("codigo",), None, None)]

def _inter(conn: Connection, tabla: str, campos: tuple, pred, geom):
    out = []
    for fila in candidatas(conn, tabla, "gid", campos, geom.bounds):
        g = gpkg_a_shapely(fila[-1])
        if g is None or not g.intersects(geom):
            continue
        a = dict(zip(campos, fila[:-1]))
        if pred and not pred(a):
            continue
        try:
            out.append((a, g.intersection(geom)))
        except Exception:   # geometría inválida en la capa: se repara y se reintenta
            out.append((a, g.buffer(0).intersection(geom)))
    return out

def _pct(partes: list, area: float) -> float:
    if not partes or not area:
        return 0.0
    return min(100.0, 100 * unary_union(partes).area / area)

def geometria(conn: Connection, numero_predial: Optional[str], x: Optional[float], y: Optional[float]):
    """Predio completo si el número predial existe en el catastro; si no, un punto de 1 m alrededor del inmueble."""
    if numero_predial:
        filas = conn.execute(select(predios.c.geom).where(predios.c.numero_predial == numero_predial)).all()
        gs = [g for g in (gpkg_a_shapely(f.geom) for f in filas) if g is not None]
        if gs:
            return unary_union(gs)
    if x is not None and y is not None:
        return Point(x, y).buffer(1)
    return None

def _dominante(items: list) -> Optional[str]:
    acum: dict[str, float] = {}
    for a, g in items:
        acum[a["codigo"]] = acum.get(a["codigo"], 0) + g.area
    return max(acum, key=acum.get) if acum else None

def medir(conn: Connection, tipo: str, numero_predial: Optional[str], x: Optional[float], y: Optional[float]) -> tuple[Entrada, dict]:
    """Devuelve la Entrada (sin la parte jurídica) y las mediciones para el detalle privado."""
    geom = geometria(conn, numero_predial, x, y)
    if geom is None:
        return Entrada(tipo=tipo, medido=False), {"base": "sin ubicación"}
    area = geom.area
    e = Entrada(tipo=tipo)

    am = [i for t, c, p, _ in AMENAZA for i in _inter(conn, t, c, p, geom)]
    e.amenaza_pct = _pct([g for _, g in am], area)
    e.amenaza_tipos = sorted({_AMENAZA_NOMBRE.get(a["codigo"], a["codigo"]) for a, _ in am})

    prot, motivos = [], {}
    for t, c, p, m in PROTECCION:
        its = _inter(conn, t, c, p, geom)
        if its:
            motivos[m] = round(_pct([g for _, g in its], area), 2)
            prot += [g for _, g in its]
    e.proteccion_pct = _pct(prot, area)
    e.proteccion_motivos = [m for m, _ in sorted(motivos.items(), key=lambda kv: -kv[1])]

    e.conflicto_pct = _pct([g for t, c, p, _ in CONFLICTO for _, g in _inter(conn, t, c, p, geom)], area)

    clasif = _inter(conn, "cg_2_clasificacion_suelo", ("codigo",), None, geom)
    cod_clasif = _dominante(clasif)
    urbano = cod_clasif in CODIGOS_URBANOS
    usos = _inter(conn, "cu_7_usos_del_suelo" if urbano else "cr_5_usos_suelo", ("codigo",), None, geom)
    e.uso_dominante = _dominante(usos)
    e.sin_cobertura_normativa = not usos

    mediciones = {
        "base": "predio" if area > 10 else "punto",
        "area_m2": round(area, 1),
        "clasificacion_suelo": cod_clasif,
        "uso_dominante": e.uso_dominante,
        "amenaza_pct": round(e.amenaza_pct, 2), "amenaza_tipos": e.amenaza_tipos,
        "proteccion_pct": round(e.proteccion_pct, 2), "proteccion_por_motivo_pct": motivos,
        "conflicto_pct": round(e.conflicto_pct, 2),
        "nota": "La capa de amenazas del POT cubre solo el área urbana; en suelo rural no hay dato de amenaza." if not urbano else None,
    }
    return e, mediciones
