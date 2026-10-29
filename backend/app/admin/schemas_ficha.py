"""Esquemas de la ficha ampliada, el módulo jurídico y los soportes (Fase 1)."""
import re
from typing import Literal, Optional

from pydantic import BaseModel, Field, field_validator

Conservacion = Literal["nuevo", "excelente", "bueno", "regular", "para_remodelar"]
Orientacion = Literal["N", "NE", "E", "SE", "S", "SO", "O", "NO"]
TipoSoporte = Literal["certificado_tradicion", "escritura", "linderos", "paz_salvo_predial", "paz_salvo_valorizacion", "otro"]
Fecha = Optional[str]
_FECHA = r"^\d{4}-\d{2}-\d{2}$"

def _vacio(v):
    return None if isinstance(v, str) and not v.strip() else (v.strip() if isinstance(v, str) else v)

class FichaIn(BaseModel):
    """Campos públicos de la ficha. Booleanos: True/False/None (desconocido)."""
    estrato: Optional[int] = Field(default=None, ge=1, le=6)
    antiguedad_anos: Optional[int] = Field(default=None, ge=0, le=500)
    estado_conservacion: Optional[Conservacion] = None
    pisos: Optional[int] = Field(default=None, ge=0, le=200)
    parqueaderos: Optional[int] = Field(default=None, ge=0, le=100)
    deposito: Optional[bool] = None
    acabados: Optional[str] = Field(default=None, max_length=500)
    orientacion: Optional[Orientacion] = None
    agua: Optional[bool] = None
    alcantarillado: Optional[bool] = None
    gas: Optional[bool] = None
    energia: Optional[bool] = None
    internet: Optional[bool] = None
    fuentes_agua: Optional[str] = Field(default=None, max_length=500)
    tipo_suelo: Optional[str] = Field(default=None, max_length=300)
    vocacion: Optional[str] = Field(default=None, max_length=300)
    cultivos: Optional[str] = Field(default=None, max_length=500)
    mejoras: Optional[str] = Field(default=None, max_length=500)
    via_acceso: Optional[str] = Field(default=None, max_length=300)
    video_url: Optional[str] = Field(default=None, max_length=500)
    recorrido_360_url: Optional[str] = Field(default=None, max_length=500)
    plano_url: Optional[str] = Field(default=None, max_length=500)
    negociable: Optional[bool] = None
    permuta: Optional[bool] = None
    financiacion: Optional[bool] = None
    administracion_mensual: Optional[int] = Field(default=None, ge=0, le=10**10)
    disponible_desde: Fecha = Field(default=None, pattern=_FECHA)

    @field_validator("acabados", "fuentes_agua", "tipo_suelo", "vocacion", "cultivos", "mejoras", "via_acceso",
                     "video_url", "recorrido_360_url", "plano_url", "disponible_desde", mode="before")
    @classmethod
    def _limpiar(cls, v):
        return _vacio(v)

    @field_validator("video_url", "recorrido_360_url", "plano_url")
    @classmethod
    def _solo_http(cls, v):
        if v is not None and not re.match(r"^(https?://\S+|/fotos/[\w.-]+)$", v):
            raise ValueError("Debe ser un enlace http(s)")
        return v

class FichaOut(FichaIn):
    inmueble_id: int
    entorno: dict = Field(default_factory=dict)
    entorno_calculado_en: Optional[str] = None

class JuridicoIn(BaseModel):
    matricula_inmobiliaria: Optional[str] = Field(default=None, max_length=60)
    escritura_numero: Optional[str] = Field(default=None, max_length=60)
    escritura_fecha: Fecha = Field(default=None, pattern=_FECHA)
    notaria: Optional[str] = Field(default=None, max_length=120)
    hipoteca: Optional[bool] = None
    embargo: Optional[bool] = None
    afectacion_vivienda_familiar: Optional[bool] = None
    servidumbres: Optional[str] = Field(default=None, max_length=2000)
    litigios: Optional[str] = Field(default=None, max_length=2000)
    sucesion_pendiente: Optional[bool] = None
    linderos: Optional[str] = Field(default=None, max_length=3000)
    predial_estado: Literal["al_dia", "mora", "desconocido"] = "desconocido"
    predial_ultimo_anio_pagado: Optional[int] = Field(default=None, ge=1900, le=2100)
    valorizacion_estado: Literal["sin_cobro", "pendiente", "pagada", "desconocido"] = "desconocido"
    paz_salvo_predial_fecha: Fecha = Field(default=None, pattern=_FECHA)
    paz_salvo_valorizacion_fecha: Fecha = Field(default=None, pattern=_FECHA)
    notas: Optional[str] = Field(default=None, max_length=3000)

    @field_validator("matricula_inmobiliaria", "escritura_numero", "escritura_fecha", "notaria", "servidumbres", "litigios", "linderos",
                     "paz_salvo_predial_fecha", "paz_salvo_valorizacion_fecha", "notas", mode="before")
    @classmethod
    def _limpiar(cls, v):
        return _vacio(v)

class JuridicoOut(JuridicoIn):
    inmueble_id: int
    actualizado_en: str

class SoporteOut(BaseModel):
    id: int
    inmueble_id: int
    tipo: TipoSoporte
    nombre_original: str
    mime: str
    tamano: int
    fecha_documento: Fecha
    fecha_vencimiento: Fecha
    creado_en: str
    estado: Literal["vigente", "por_vencer", "vencido", "sin_vencimiento"]
    dias_para_vencer: Optional[int] = None

class SemaforoAdmin(BaseModel):
    inmueble_id: int
    color: Literal["verde", "amarillo", "rojo"]
    resumen_publico: str
    categorias: list[str]
    detalle: dict
    reglas_version: str
    calculado_en: str

class ParametroIn(BaseModel):
    valor: str = Field(min_length=1, max_length=200)
