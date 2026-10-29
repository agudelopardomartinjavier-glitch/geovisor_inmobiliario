"""Utilidades compartidas: rutas de las bases y sincronización admin -> público (solo sqlite3, sin GDAL)."""
import os, sqlite3, sys

BASE = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DB_DIR = os.path.join(BASE, "data", "db")
ADMIN = os.path.join(DB_DIR, "admin.sqlite")
PUBLICO = os.path.join(DB_DIR, "publico.gpkg")

def abrir_publico_solo_lectura():
    """Conexión que usa el visor público: el archivo se abre en modo solo lectura."""
    return sqlite3.connect("file:" + PUBLICO.replace("\\", "/") + "?mode=ro", uri=True)

def sincronizar_publico():
    """Copia a publico.gpkg los inmuebles 'publicado' (y su ficha pública), SIN propietario/avaluo/notas ni datos jurídicos."""
    sys.path.insert(0, os.path.join(BASE, "backend"))
    from app.admin.sync import sincronizar
    return sincronizar(ADMIN, PUBLICO)
