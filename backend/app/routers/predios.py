from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, Path
from sqlalchemy import select
from sqlalchemy.engine import Connection

from ..db import get_conn
from ..geo import a_4326, geojson
from ..models.tablas import inmuebles_publicos
from ..predio_servicio import analizar
from ..schemas.predio import GrupoCruce, PredioOut

router = APIRouter(prefix="/predios", tags=["predios"])

@router.get("/{numero_predial}", response_model=PredioOut, summary="Predio por número predial: geometría, uso de suelo POT y zonas POMCA")
def predio(numero_predial: Annotated[str, Path(min_length=5, max_length=30, pattern=r"^\d+$")],
           conn: Annotated[Connection, Depends(get_conn)]):
    a = analizar(conn, numero_predial)
    if a is None:
        raise HTTPException(404, "Número predial no encontrado")
    g4326 = a_4326(a.geom)
    c = g4326.representative_point()
    f0 = a.filas[0]
    ids = [r.id for r in conn.execute(select(inmuebles_publicos.c.id).where(inmuebles_publicos.c.numero_predial == numero_predial))]
    return PredioOut(
        numero_predial=numero_predial, registros=len(a.filas), codigo_municipio=f0.codigo_municipio,
        manzana_codigo=f0.manzana_codigo, vereda_codigo=f0.vereda_codigo, area_m2=round(a.area, 2),
        bbox=g4326.bounds, centroide=(c.x, c.y), ubicacion=a.ubicacion, geometry=geojson(g4326),
        uso_suelo=[GrupoCruce(clave=k, titulo=t, items=i) for k, t, i in a.uso],
        pomca=[GrupoCruce(clave=k, titulo=t, items=i) for k, t, i in a.pomca],
        inmuebles_publicados=ids)
