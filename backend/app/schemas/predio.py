from typing import Any, Optional

from pydantic import BaseModel, Field

from .inmueble import Cruce

class GrupoCruce(BaseModel):
    clave: str
    titulo: str
    items: list[Cruce]

class PredioOut(BaseModel):
    numero_predial: str
    registros: int = Field(description="Filas del catastro con ese número (PH/condominios repiten el código)")
    codigo_municipio: Optional[str] = None
    manzana_codigo: Optional[str] = None
    vereda_codigo: Optional[str] = None
    area_m2: float
    bbox: tuple[float, float, float, float] = Field(description="lon_min, lat_min, lon_max, lat_max (EPSG:4326)")
    centroide: tuple[float, float] = Field(description="lon, lat")
    ubicacion: dict[str, Optional[str]] = Field(description="Barrio o vereda donde cae el predio")
    geometry: dict[str, Any] = Field(description="GeoJSON (EPSG:4326)")
    uso_suelo: list[GrupoCruce]
    pomca: list[GrupoCruce]
    inmuebles_publicados: list[int]
