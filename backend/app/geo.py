"""Utilidades geométricas: blobs GeoPackage -> shapely, reproyección 9377 <-> 4326 y GeoJSON."""
import struct
from functools import lru_cache

import shapely
from pyproj import Transformer
from shapely.geometry import mapping, shape
from shapely.ops import transform

from . import config  # noqa: F401  (fija PROJ_DATA antes de usar pyproj)

_ENV = {0: 0, 1: 32, 2: 48, 3: 48, 4: 64}

def gpkg_a_shapely(blob: bytes):
    """Decodifica la geometría de una celda GeoPackage (cabecera GP + WKB)."""
    if blob is None or blob[:2] != b"GP":
        return None
    flags = blob[3]
    if flags & 0x10:  # vacía
        return None
    return shapely.from_wkb(blob[8 + _ENV[(flags >> 1) & 7]:])

@lru_cache(maxsize=1)
def _t_a_4326():
    return Transformer.from_crs(9377, 4326, always_xy=True)

@lru_cache(maxsize=1)
def _t_a_9377():
    return Transformer.from_crs(4326, 9377, always_xy=True)

def a_4326(g):
    return transform(_t_a_4326().transform, g)

def a_9377(g):
    return transform(_t_a_9377().transform, g)

def punto_a_lonlat(x: float, y: float):
    lon, lat = _t_a_4326().transform(x, y)
    return round(lon, 7), round(lat, 7)

def geojson(g, decimales: int = 7):
    return mapping(shapely.set_precision(g, 10 ** -decimales)) if g is not None else None

__all__ = ["gpkg_a_shapely", "a_4326", "a_9377", "punto_a_lonlat", "geojson", "shape"]
