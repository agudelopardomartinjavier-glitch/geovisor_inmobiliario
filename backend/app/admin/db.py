"""Acceso a admin.sqlite y sincronización hacia publico.gpkg (solo el panel de administración las usa)."""
import json
import sqlite3
from contextlib import contextmanager

from .. import config
from .sync import sincronizar

@contextmanager
def conexion():
    con = sqlite3.connect(config.ADMIN_DB, timeout=10)
    con.row_factory = sqlite3.Row
    con.execute("PRAGMA foreign_keys = ON")
    try:
        yield con
        con.commit()
    except Exception:
        con.rollback()
        raise
    finally:
        con.close()

def sincronizar_publico() -> int:
    """Reescribe inmuebles_publicos e inmueble_ficha_publica con los 'publicado' (ver sync.py: nada privado sale)."""
    return sincronizar(str(config.ADMIN_DB), str(config.DB_PUBLICO))

def auditar(con: sqlite3.Connection, usuario: str | None, accion: str, inmueble_id: int | None = None, detalle: dict | str | None = None):
    con.execute("INSERT INTO auditoria (usuario, accion, inmueble_id, detalle) VALUES (?,?,?,?)",
                (usuario, accion, inmueble_id, json.dumps(detalle, ensure_ascii=False) if isinstance(detalle, dict) else detalle))
