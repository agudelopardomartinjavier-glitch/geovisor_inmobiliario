import json
from typing import Annotated

from fastapi import APIRouter, Depends, Request
from sqlalchemy import select
from sqlalchemy.engine import Connection

from ..config import TILES_DIR
from ..db import get_conn
from ..models.tablas import catalogo_capas
from ..schemas.inmueble import CapaOut

router = APIRouter(prefix="/capas", tags=["capas"])

@router.get("", response_model=list[CapaOut], summary="Catálogo de capas con su plantilla de teselas vectoriales")
def capas(request: Request, conn: Annotated[Connection, Depends(get_conn)]):
    zooms = json.loads((TILES_DIR / "capas.json").read_text(encoding="utf8")) if (TILES_DIR / "capas.json").exists() else {}
    base = str(request.base_url).rstrip("/")
    out = []
    for r in conn.execute(select(catalogo_capas).order_by(catalogo_capas.c.grupo, catalogo_capas.c.nombre)):
        z = zooms.get(r.nombre)
        if z:
            gj = z.get("formato") == "geojson"
            out.append(CapaOut(nombre=r.nombre, grupo=r.grupo, geometria=r.geometria, entidades=r.entidades,
                               minzoom=z["minzoom"], maxzoom=z["maxzoom"], formato="geojson" if gj else "mvt",
                               tiles=None if gj else f"{base}/tiles/{r.nombre}/{{z}}/{{x}}/{{y}}.pbf",
                               geojson=f"{base}/geojson/{r.nombre}.geojson" if gj else None, capa_fuente=r.nombre))
    return out
