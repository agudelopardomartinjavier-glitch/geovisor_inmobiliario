"""Archivos privados adjuntos (soportes jurídicos, soportes de gastos): validación por contenido y rutas seguras."""
import uuid
from pathlib import Path

from fastapi import HTTPException

from .. import config

FIRMAS = [(b"%PDF", "application/pdf", ".pdf"), (b"\xff\xd8\xff", "image/jpeg", ".jpg"), (b"\x89PNG\r\n\x1a\n", "image/png", ".png")]

def tipo_real(b: bytes) -> tuple[str, str] | None:
    """(mime, extensión) según los primeros bytes; None si no es PDF, JPG, PNG ni WEBP. La extensión del nombre no cuenta."""
    for firma, mime, ext in FIRMAS:
        if b.startswith(firma):
            return mime, ext
    if b[:4] == b"RIFF" and b[8:12] == b"WEBP":
        return "image/webp", ".webp"
    return None

def validar(cuerpo: bytes, max_bytes: int) -> tuple[str, str]:
    if not cuerpo:
        raise HTTPException(422, "Archivo vacío")
    if len(cuerpo) > max_bytes:
        raise HTTPException(413, f"El archivo supera {max_bytes // 1024 // 1024} MB")
    real = tipo_real(cuerpo[:16])
    if not real:
        raise HTTPException(415, "Solo se aceptan PDF, JPG, PNG o WEBP")
    return real

def guardar(subcarpeta: str, cuerpo: bytes, ext: str) -> str:
    """Escribe en SOPORTES_DIR/<subcarpeta>/<uuid><ext> y devuelve la ruta relativa. El nombre del usuario nunca entra en la ruta."""
    rel = f"{subcarpeta}/{uuid.uuid4().hex}{ext}"
    destino = config.SOPORTES_DIR / rel
    destino.parent.mkdir(parents=True, exist_ok=True)
    destino.write_bytes(cuerpo)
    return rel

def ruta_segura(rel: str) -> Path:
    ruta = (config.SOPORTES_DIR / rel).resolve()
    if config.SOPORTES_DIR.resolve() not in ruta.parents or not ruta.is_file():
        raise HTTPException(404, "El archivo ya no está en el servidor")
    return ruta

def borrar(rel: str | None):
    if rel:
        ruta = (config.SOPORTES_DIR / rel).resolve()
        if config.SOPORTES_DIR.resolve() in ruta.parents:
            ruta.unlink(missing_ok=True)
