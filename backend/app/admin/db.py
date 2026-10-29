"""Acceso a admin.sqlite y sincronización hacia publico.gpkg (solo el panel de administración las usa)."""
import json
import sqlite3
from contextlib import contextmanager

from .. import config

COLUMNAS_PUBLICAS = ("id", "numero_predial", "tipo", "operacion", "precio", "area_terreno", "area_construida",
                     "habitaciones", "banos", "descripcion", "fotos", "contacto", "fecha_publicacion", "x", "y")

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
    """Reescribe inmuebles_publicos con los 'publicado' (sin propietario, avalúo ni notas internas)."""
    cols = ", ".join(COLUMNAS_PUBLICAS)
    with conexion() as a:
        filas = [tuple(r) for r in a.execute(
            f"SELECT {cols} FROM inmuebles WHERE estado_publicacion='publicado' AND x IS NOT NULL AND y IS NOT NULL")]
    p = sqlite3.connect(config.DB_PUBLICO, timeout=10)
    try:
        with p:
            p.execute("DELETE FROM inmuebles_publicos")
            p.executemany(f"INSERT INTO inmuebles_publicos ({cols}) VALUES ({','.join('?' * len(COLUMNAS_PUBLICAS))})", filas)
    finally:
        p.close()
    return len(filas)

def auditar(con: sqlite3.Connection, usuario: str | None, accion: str, inmueble_id: int | None = None, detalle: dict | str | None = None):
    con.execute("INSERT INTO auditoria (usuario, accion, inmueble_id, detalle) VALUES (?,?,?,?)",
                (usuario, accion, inmueble_id, json.dumps(detalle, ensure_ascii=False) if isinstance(detalle, dict) else detalle))
