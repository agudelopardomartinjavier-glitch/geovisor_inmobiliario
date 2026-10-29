"""Zonas de búsqueda (barrios urbanos y veredas rurales): a cuál pertenece cada inmueble y cuántas ofertas tiene cada una."""
from dataclasses import dataclass
from functools import lru_cache
from typing import Optional

import shapely
from shapely.geometry import Point
from sqlalchemy import text

from .db import engine
from .geo import a_4326, gpkg_a_shapely

# tipo -> (tabla, columna con el nombre)
FUENTES = {"barrio": ("cu_3_barrios", "convencion"), "vereda": ("cr_2_veredas", "vereda")}

@dataclass(frozen=True)
class Zona:
    tipo: str
    nombre: str
    geom: object      # shapely, EPSG:9377

@lru_cache(maxsize=1)
def _zonas() -> tuple[list[Zona], dict[str, shapely.STRtree]]:
    """Carga una sola vez los polígonos (son capas fijas del POT)."""
    lista: list[Zona] = []
    with engine.connect() as c:
        for tipo, (tabla, col) in FUENTES.items():
            for nombre, geom in c.execute(text(f'SELECT "{col}", geom FROM "{tabla}"')).all():
                g = gpkg_a_shapely(geom)
                if nombre and g is not None and not g.is_empty:
                    lista.append(Zona(tipo, str(nombre).strip(), g))
    arboles = {t: shapely.STRtree([z.geom for z in lista if z.tipo == t]) for t in FUENTES}
    return lista, arboles

def todas() -> list[Zona]:
    return _zonas()[0]

def buscar(tipo: str, nombre: str) -> Optional[Zona]:
    n = nombre.strip().casefold()
    return next((z for z in todas() if z.tipo == tipo and z.nombre.casefold() == n), None)

def zona_de(x: float, y: float) -> dict[str, Optional[str]]:
    """Barrio y vereda en los que cae un punto EPSG:9377."""
    lista, arboles = _zonas()
    pt = Point(x, y)
    out: dict[str, Optional[str]] = {}
    for tipo in FUENTES:
        propias = [z for z in lista if z.tipo == tipo]
        idx = arboles[tipo].query(pt, predicate="intersects")
        out[tipo] = propias[int(idx[0])].nombre if len(idx) else None
    return out

def resumen(z: Zona) -> dict:
    g = a_4326(z.geom)
    c = g.representative_point()
    return {"tipo": z.tipo, "nombre": z.nombre, "lon": round(c.x, 6), "lat": round(c.y, 6),
            "bbox": [round(v, 6) for v in g.bounds]}
