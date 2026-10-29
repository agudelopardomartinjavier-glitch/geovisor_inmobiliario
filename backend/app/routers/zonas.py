from typing import Annotated, Literal

from fastapi import APIRouter, Depends, HTTPException, Path
from sqlalchemy import select
from sqlalchemy.engine import Connection

from .. import zonas as zonas_mod
from ..db import get_conn
from ..geo import a_4326, geojson
from ..models.tablas import inmuebles_publicos as t
from ..schemas.inmueble import ZonaDetalle, ZonaOut

router = APIRouter(prefix="/zonas", tags=["zonas"])

def _conteos(conn: Connection) -> dict[tuple[str, str], dict[str, int]]:
    """Ofertas publicadas por (tipo de zona, nombre) y operación."""
    cuenta: dict[tuple[str, str], dict[str, int]] = {}
    for r in conn.execute(select(t.c.x, t.c.y, t.c.operacion)):
        for tipo, nombre in zonas_mod.zona_de(r.x, r.y).items():
            if nombre:
                c = cuenta.setdefault((tipo, nombre), {"venta": 0, "arriendo": 0})
                c[r.operacion] += 1
    return cuenta

def _salida(z, cuenta) -> dict:
    c = cuenta.get((z.tipo, z.nombre), {"venta": 0, "arriendo": 0})
    return {**zonas_mod.resumen(z), "venta": c["venta"], "arriendo": c["arriendo"], "total": c["venta"] + c["arriendo"]}

@router.get("", response_model=list[ZonaOut], summary="Barrios y veredas con su número de ofertas publicadas")
def listar(conn: Annotated[Connection, Depends(get_conn)]):
    cuenta = _conteos(conn)
    out = [_salida(z, cuenta) for z in zonas_mod.todas()]
    # primero las zonas con más ofertas; luego alfabético
    return sorted(out, key=lambda z: (-z["total"], z["tipo"], z["nombre"]))

@router.get("/{tipo}/{nombre}", response_model=ZonaDetalle, summary="Una zona con su contorno (para resaltarla en el mapa)")
def detalle(tipo: Literal["barrio", "vereda"], nombre: Annotated[str, Path(min_length=1, max_length=120)], conn: Annotated[Connection, Depends(get_conn)]):
    z = zonas_mod.buscar(tipo, nombre)
    if z is None:
        raise HTTPException(404, "Zona no encontrada")
    return {**_salida(z, _conteos(conn)), "geometry": geojson(a_4326(z.geom).simplify(0.000005))}
