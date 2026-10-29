import re
from typing import Literal, Optional

from pydantic import BaseModel, Field, field_validator, model_validator

Tipo = Literal["casa", "lote", "finca", "local", "apartamento"]
Operacion = Literal["venta", "arriendo"]
Estado = Literal["borrador", "publicado", "vendido"]

class LoginIn(BaseModel):
    usuario: str = Field(min_length=1, max_length=64)
    password: str = Field(min_length=1, max_length=256)

class TokenOut(BaseModel):
    token: str
    usuario: str

class InmuebleIn(BaseModel):
    """Datos que envía el panel. La ubicación se da como lon/lat (EPSG:4326) o se toma del predio."""
    tipo: Tipo
    operacion: Operacion
    estado_publicacion: Estado = "borrador"
    numero_predial: Optional[str] = Field(default=None, pattern=r"^\d{5,30}$")
    lon: Optional[float] = Field(default=None, ge=-80, le=-66)
    lat: Optional[float] = Field(default=None, ge=-5, le=14)
    precio: Optional[int] = Field(default=None, ge=0, le=10**13)
    area_terreno: Optional[float] = Field(default=None, ge=0)
    area_construida: Optional[float] = Field(default=None, ge=0)
    habitaciones: Optional[int] = Field(default=None, ge=0, le=100)
    banos: Optional[int] = Field(default=None, ge=0, le=100)
    descripcion: Optional[str] = Field(default=None, max_length=5000)
    fotos: list[str] = Field(default_factory=list, max_length=20)
    contacto: Optional[str] = Field(default=None, max_length=200)
    # privados
    propietario: Optional[str] = Field(default=None, max_length=200)
    avaluo: Optional[int] = Field(default=None, ge=0, le=10**13)
    notas_internas: Optional[str] = Field(default=None, max_length=5000)

    @field_validator("fotos")
    @classmethod
    def _urls(cls, v: list[str]) -> list[str]:
        for u in v:
            if not re.match(r"^(https?://\S+|/fotos/[\w.-]+)$", u):
                raise ValueError(f"URL de foto no válida: {u[:60]}")
        return v

    @field_validator("numero_predial", "descripcion", "contacto", "propietario", "notas_internas", mode="before")
    @classmethod
    def _vacio_a_none(cls, v):
        return None if isinstance(v, str) and not v.strip() else (v.strip() if isinstance(v, str) else v)

class EstadoIn(BaseModel):
    estado_publicacion: Estado

class InmuebleAdmin(BaseModel):
    id: int
    numero_predial: Optional[str]
    tipo: Tipo
    operacion: Operacion
    precio: Optional[int]
    area_terreno: Optional[float]
    area_construida: Optional[float]
    habitaciones: Optional[int]
    banos: Optional[int]
    descripcion: Optional[str]
    fotos: list[str]
    contacto: Optional[str]
    estado_publicacion: Estado
    fecha_publicacion: Optional[str]
    lon: Optional[float]
    lat: Optional[float]
    propietario: Optional[str]
    avaluo: Optional[int]
    notas_internas: Optional[str]
    creado_en: str
    actualizado_en: str

# ---------------------------------------------------------------- Fase 6: comparables
OperacionComp = Literal["oferta", "venta"]

class ComparableIn(BaseModel):
    tipo: Tipo
    operacion: OperacionComp = "oferta"
    precio: int = Field(gt=0, le=10**13)
    area_terreno: Optional[float] = Field(default=None, gt=0)
    area_construida: Optional[float] = Field(default=None, gt=0)
    fecha: Optional[str] = Field(default=None, pattern=r"^\d{4}-\d{2}-\d{2}$")
    fuente: Optional[str] = Field(default=None, max_length=200)
    referencia: Optional[str] = Field(default=None, max_length=500)
    contacto: Optional[str] = Field(default=None, max_length=200)
    descripcion: Optional[str] = Field(default=None, max_length=3000)
    numero_predial: Optional[str] = Field(default=None, pattern=r"^\d{5,30}$")
    sector: Optional[str] = Field(default=None, max_length=120)
    lon: Optional[float] = Field(default=None, ge=-80, le=-66)
    lat: Optional[float] = Field(default=None, ge=-5, le=14)

    @field_validator("fuente", "referencia", "contacto", "descripcion", "numero_predial", "sector", "fecha", mode="before")
    @classmethod
    def _vacio(cls, v):
        return None if isinstance(v, str) and not v.strip() else (v.strip() if isinstance(v, str) else v)

    @model_validator(mode="after")
    def _alguna_area(self):
        if self.area_terreno is None and self.area_construida is None:
            raise ValueError("Indica al menos un área (terreno o construida)")
        return self

class ComparableOut(BaseModel):
    id: int
    tipo: Tipo
    operacion: OperacionComp
    precio: int
    area_terreno: Optional[float]
    area_construida: Optional[float]
    fecha: Optional[str]
    fuente: Optional[str]
    referencia: Optional[str]
    contacto: Optional[str]
    descripcion: Optional[str]
    numero_predial: Optional[str]
    sector: Optional[str]
    lon: Optional[float]
    lat: Optional[float]

class VinculoIn(BaseModel):
    ajuste_pct: float = Field(default=0, ge=-90, le=300)
    incluir: bool = True
    nota: Optional[str] = Field(default=None, max_length=500)

class VinculoOut(BaseModel):
    comparable: ComparableOut
    ajuste_pct: float
    incluir: bool
    nota: Optional[str]
    unitario: Optional[float]
    ajustado: Optional[float]
    distancia_m: Optional[float]

class Sugerido(BaseModel):
    comparable: ComparableOut
    distancia_m: float
    unitario: Optional[float]
