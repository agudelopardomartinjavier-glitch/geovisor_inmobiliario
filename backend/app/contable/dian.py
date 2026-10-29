"""Facturación electrónica DIAN como INTERFAZ (adaptador). No se ata a ningún proveedor tecnológico.

Cómo conectar uno: escribe una clase con `nombre` y `enviar(documento) -> RespuestaDian`, regístrala con
`registrar("mi_proveedor", MiClase)` y pon DIAN_PROVEEDOR=mi_proveedor en .env. El sistema arma `documento` (dict normalizado:
emisor, cliente, líneas, totales, y la factura de origen en las notas crédito) y guarda lo que devuelva el proveedor
(estado, CUFE/CUDE y respuesta cruda). Sin proveedor configurado la factura queda emitida internamente («no_enviada»)."""
import hashlib
import json
from dataclasses import dataclass, field
from typing import Callable, Protocol

class ProveedorNoConfigurado(Exception):
    pass

@dataclass
class RespuestaDian:
    estado: str                      # enviada | aceptada | rechazada
    cufe: str | None = None          # CUFE (factura) o CUDE (nota crédito)
    mensaje: str = ""
    cruda: dict = field(default_factory=dict)

class Proveedor(Protocol):
    nombre: str
    def enviar(self, documento: dict) -> RespuestaDian: ...

class SinProveedor:
    nombre = "ninguno"
    def enviar(self, documento: dict) -> RespuestaDian:
        raise ProveedorNoConfigurado("No hay proveedor de facturación electrónica configurado (DIAN_PROVEEDOR). La factura queda emitida solo en el sistema.")

class Simulado:
    """SOLO PRUEBAS: acepta todo y fabrica un código. No tiene validez ante la DIAN."""
    nombre = "simulado"
    def enviar(self, documento: dict) -> RespuestaDian:
        codigo = hashlib.sha384(json.dumps(documento, sort_keys=True, default=str).encode()).hexdigest()
        return RespuestaDian("aceptada", f"SIMULADO-{codigo[:32]}", "Aceptada (simulación, sin validez fiscal)", {"simulado": True})

_REGISTRO: dict[str, Callable[[], Proveedor]] = {"ninguno": SinProveedor, "simulado": Simulado}

def registrar(nombre: str, fabrica: Callable[[], Proveedor]):
    _REGISTRO[nombre] = fabrica

def obtener(nombre: str) -> Proveedor:
    if nombre not in _REGISTRO:
        raise ProveedorNoConfigurado(f"El proveedor «{nombre}» no está registrado")
    return _REGISTRO[nombre]()
