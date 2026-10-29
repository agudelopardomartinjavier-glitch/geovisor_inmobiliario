from typing import Any, Literal, Optional

from pydantic import BaseModel, Field

Tipo = Literal["casa", "lote", "finca", "local", "apartamento"]
Operacion = Literal["venta", "arriendo"]

class InmuebleProps(BaseModel):
    """Campos públicos de un inmueble (nunca propietario, avalúo ni notas internas)."""
    id: int
    numero_predial: Optional[str] = None
    tipo: Tipo
    operacion: Operacion
    precio: Optional[int] = None
    area_terreno: Optional[float] = None
    area_construida: Optional[float] = None
    habitaciones: Optional[int] = None
    banos: Optional[int] = None
    descripcion: Optional[str] = None
    fotos: list[str] = Field(default_factory=list)
    contacto: Optional[str] = None
    fecha_publicacion: Optional[str] = None
    barrio: Optional[str] = None
    vereda: Optional[str] = None
    semaforo: Optional[Literal["verde", "amarillo", "rojo"]] = Field(default=None, description="Color del semáforo jurídico-ambiental (solo el color)")

class Semaforo(BaseModel):
    """Lo único público del semáforo: color y resumen genérico. El detalle es privado."""
    color: Literal["verde", "amarillo", "rojo"]
    resumen: str

class Entorno(BaseModel):
    """Distancias en metros calculadas con las capas del POT; null = sin dato."""
    via_principal_m: Optional[int] = None
    colegio_m: Optional[int] = None
    parque_m: Optional[int] = None
    centro_salud_m: Optional[int] = None
    casco_urbano_m: Optional[int] = None
    drenaje_m: Optional[int] = None
    nacimiento_m: Optional[int] = None

class FichaPublica(BaseModel):
    inmueble_id: int
    estrato: Optional[int] = None
    antiguedad_anos: Optional[int] = None
    estado_conservacion: Optional[str] = None
    pisos: Optional[int] = None
    parqueaderos: Optional[int] = None
    deposito: Optional[bool] = None
    acabados: Optional[str] = None
    orientacion: Optional[str] = None
    agua: Optional[bool] = None
    alcantarillado: Optional[bool] = None
    gas: Optional[bool] = None
    energia: Optional[bool] = None
    internet: Optional[bool] = None
    fuentes_agua: Optional[str] = None
    tipo_suelo: Optional[str] = None
    vocacion: Optional[str] = None
    cultivos: Optional[str] = None
    mejoras: Optional[str] = None
    via_acceso: Optional[str] = None
    video_url: Optional[str] = None
    recorrido_360_url: Optional[str] = None
    plano_url: Optional[str] = None
    negociable: Optional[bool] = None
    permuta: Optional[bool] = None
    financiacion: Optional[bool] = None
    administracion_mensual: Optional[int] = None
    disponible_desde: Optional[str] = None
    entorno: Entorno = Field(default_factory=Entorno)
    semaforo: Optional[Semaforo] = None

class Point(BaseModel):
    type: Literal["Point"] = "Point"
    coordinates: tuple[float, float]

class InmuebleFeature(BaseModel):
    type: Literal["Feature"] = "Feature"
    id: int
    geometry: Point
    properties: InmuebleProps

class InmuebleCollection(BaseModel):
    type: Literal["FeatureCollection"] = "FeatureCollection"
    features: list[InmuebleFeature]
    total: int

class CapaOut(BaseModel):
    nombre: str
    grupo: Literal["catastro", "pot", "ambiental"]
    geometria: Optional[str] = None
    entidades: Optional[int] = None
    minzoom: int
    maxzoom: int
    formato: Literal["mvt", "geojson"] = "mvt"
    tiles: Optional[str] = Field(default=None, description="Plantilla de URL de teselas vectoriales (MVT), si formato = mvt")
    geojson: Optional[str] = Field(default=None, description="URL del GeoJSON completo, si formato = geojson")
    capa_fuente: str = Field(description="Nombre de la source-layer dentro de la tesela (mvt)")

class Cruce(BaseModel):
    atributos: dict[str, Any]
    area_m2: float = Field(description="Área de la intersección con el predio, m² (EPSG:9377)")
    porcentaje_predio: float

class ZonaOut(BaseModel):
    tipo: Literal["barrio", "vereda"]
    nombre: str
    lon: float
    lat: float
    bbox: tuple[float, float, float, float] = Field(description="lon_min, lat_min, lon_max, lat_max (EPSG:4326)")
    venta: int = 0
    arriendo: int = 0
    total: int = 0

class ZonaDetalle(ZonaOut):
    geometry: dict[str, Any] = Field(description="Contorno de la zona en GeoJSON (EPSG:4326)")
