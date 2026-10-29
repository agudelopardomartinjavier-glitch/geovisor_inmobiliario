import json
from typing import Annotated, Optional

from fastapi import APIRouter, Depends, HTTPException, Query, Response
from sqlalchemy import select
from sqlalchemy.engine import Connection

from ..db import get_conn
from .. import zonas
from ..geo import punto_a_lonlat
from ..models.tablas import inmuebles_publicos as t
from ..schemas.inmueble import InmuebleCollection, InmuebleFeature, Operacion, Tipo

router = APIRouter(prefix="/inmuebles", tags=["inmuebles"])

def _feature(r) -> InmuebleFeature:
    d = dict(r._mapping)
    x, y = d.pop("x"), d.pop("y")
    d["fotos"] = json.loads(d.get("fotos") or "[]")
    z = zonas.zona_de(x, y)
    d["barrio"], d["vereda"] = z["barrio"], z["vereda"]
    return InmuebleFeature(id=d["id"], geometry={"coordinates": punto_a_lonlat(x, y)}, properties=d)

@router.get("", response_model=InmuebleCollection, summary="Inmuebles publicados (GeoJSON, EPSG:4326)")
def listar(
    conn: Annotated[Connection, Depends(get_conn)],
    tipo: Annotated[Optional[list[Tipo]], Query(description="Repetible: ?tipo=casa&tipo=lote")] = None,
    operacion: Optional[Operacion] = None,
    precio_min: Annotated[Optional[int], Query(ge=0)] = None,
    precio_max: Annotated[Optional[int], Query(ge=0)] = None,
    area_min: Annotated[Optional[float], Query(ge=0, description="Área de terreno mínima, m²")] = None,
    area_max: Annotated[Optional[float], Query(ge=0, description="Área de terreno máxima, m²")] = None,
    barrio: Annotated[Optional[str], Query(max_length=120, description="Nombre exacto del barrio (ver /zonas)")] = None,
    vereda: Annotated[Optional[str], Query(max_length=120, description="Nombre exacto de la vereda (ver /zonas)")] = None,
    limit: Annotated[int, Query(ge=1, le=2000)] = 500,
):
    q = select(t).order_by(t.c.id)
    if tipo:
        q = q.where(t.c.tipo.in_(tipo))
    if operacion:
        q = q.where(t.c.operacion == operacion)
    if precio_min is not None:
        q = q.where(t.c.precio >= precio_min)
    if precio_max is not None:
        q = q.where(t.c.precio <= precio_max)
    if area_min is not None:
        q = q.where(t.c.area_terreno >= area_min)
    if area_max is not None:
        q = q.where(t.c.area_terreno <= area_max)
    features = [_feature(r) for r in conn.execute(q).all()]
    # barrio y vereda se calculan con la ubicación del inmueble (punto dentro del polígono), por eso se filtran aquí
    if barrio:
        features = [f for f in features if (f.properties.barrio or "").casefold() == barrio.strip().casefold()]
    if vereda:
        features = [f for f in features if (f.properties.vereda or "").casefold() == vereda.strip().casefold()]
    features = features[:limit]
    return InmuebleCollection(features=features, total=len(features))

@router.get("/{inmueble_id}", response_model=InmuebleFeature, summary="Ficha pública de un inmueble")
def detalle(inmueble_id: int, conn: Annotated[Connection, Depends(get_conn)]):
    r = conn.execute(select(t).where(t.c.id == inmueble_id)).first()
    if r is None:
        raise HTTPException(404, "Inmueble no encontrado o no publicado")
    return _feature(r)

@router.get("/{inmueble_id}/ficha.pdf", summary="Ficha PDF del inmueble (solo datos públicos)", response_class=Response)
def ficha(inmueble_id: int, conn: Annotated[Connection, Depends(get_conn)]):
    from ..pdf.ficha import ficha_pdf
    r = conn.execute(select(t).where(t.c.id == inmueble_id)).first()
    if r is None:
        raise HTTPException(404, "Inmueble no encontrado o no publicado")
    return Response(ficha_pdf(conn, dict(r._mapping)), media_type="application/pdf",
                    headers={"Content-Disposition": f'inline; filename="ficha-inmueble-{inmueble_id}.pdf"', "Cache-Control": "public, max-age=300"})
