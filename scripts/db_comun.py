"""Utilidades compartidas: rutas de las bases y sincronización admin -> público (solo sqlite3, sin GDAL)."""
import os, sqlite3

BASE = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DB_DIR = os.path.join(BASE, "data", "db")
ADMIN = os.path.join(DB_DIR, "admin.sqlite")
PUBLICO = os.path.join(DB_DIR, "publico.gpkg")

CAMPOS_PUBLICOS = ("id", "numero_predial", "tipo", "operacion", "precio", "area_terreno", "area_construida",
                   "habitaciones", "banos", "descripcion", "fotos", "contacto", "fecha_publicacion", "x", "y")

def abrir_publico_solo_lectura():
    """Conexión que usa el visor público: el archivo se abre en modo solo lectura."""
    return sqlite3.connect("file:" + PUBLICO.replace("\\", "/") + "?mode=ro", uri=True)

def sincronizar_publico():
    """Copia a publico.gpkg los inmuebles 'publicado' con coordenadas, SIN propietario/avaluo/notas_internas."""
    cols = ", ".join(CAMPOS_PUBLICOS)
    a = sqlite3.connect(ADMIN)
    filas = a.execute(f"SELECT {cols} FROM inmuebles WHERE estado_publicacion='publicado' AND x IS NOT NULL AND y IS NOT NULL").fetchall()
    a.close()
    p = sqlite3.connect(PUBLICO)
    with p:
        p.execute("DELETE FROM inmuebles_publicos")
        p.executemany(f"INSERT INTO inmuebles_publicos ({cols}) VALUES ({','.join('?' * len(CAMPOS_PUBLICOS))})", filas)
    p.close()
    return len(filas)
