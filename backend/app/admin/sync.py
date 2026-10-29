"""Copia admin.sqlite -> publico.gpkg (solo sqlite3, sin config ni GDAL: lo usan la API y los scripts).

Solo viajan los inmuebles 'publicado' con coordenadas y SOLO columnas públicas. Del módulo jurídico no sale nada;
del semáforo salen el color y el resumen corto."""
import sqlite3

COLUMNAS_PUBLICAS = ("id", "numero_predial", "tipo", "operacion", "precio", "area_terreno", "area_construida",
                     "habitaciones", "banos", "descripcion", "fotos", "contacto", "fecha_publicacion", "x", "y")

COLUMNAS_FICHA_PUBLICA = (
    "estrato", "antiguedad_anos", "estado_conservacion", "pisos", "parqueaderos", "deposito", "acabados", "orientacion",
    "agua", "alcantarillado", "gas", "energia", "internet",
    "fuentes_agua", "tipo_suelo", "vocacion", "cultivos", "mejoras", "via_acceso",
    "video_url", "recorrido_360_url", "plano_url",
    "negociable", "permuta", "financiacion", "administracion_mensual", "disponible_desde", "entorno",
)

def _tiene_tabla(con: sqlite3.Connection, nombre: str) -> bool:
    return con.execute("SELECT 1 FROM sqlite_master WHERE type='table' AND name=?", (nombre,)).fetchone() is not None

def sincronizar(ruta_admin: str, ruta_publico: str) -> int:
    """Reescribe inmuebles_publicos e inmueble_ficha_publica. Devuelve cuántos inmuebles quedaron publicados."""
    cols = ", ".join(f"i.{c}" for c in COLUMNAS_PUBLICAS)
    a = sqlite3.connect(ruta_admin, timeout=10)
    try:
        filas = a.execute(f"SELECT {cols} FROM inmuebles i WHERE i.estado_publicacion='publicado' AND i.x IS NOT NULL AND i.y IS NOT NULL").fetchall()
        fichas = []
        if _tiene_tabla(a, "inmueble_ficha"):
            sel = ", ".join(f"f.{c}" for c in COLUMNAS_FICHA_PUBLICA)
            fichas = a.execute(
                f"SELECT i.id, {sel}, s.color, s.resumen_publico FROM inmuebles i "
                "LEFT JOIN inmueble_ficha f ON f.inmueble_id = i.id "
                "LEFT JOIN inmueble_semaforo s ON s.inmueble_id = i.id "
                "WHERE i.estado_publicacion='publicado' AND i.x IS NOT NULL AND i.y IS NOT NULL").fetchall()
    finally:
        a.close()
    p = sqlite3.connect(ruta_publico, timeout=10)
    try:
        with p:
            p.execute("DELETE FROM inmuebles_publicos")
            p.executemany(f"INSERT INTO inmuebles_publicos ({', '.join(COLUMNAS_PUBLICAS)}) VALUES ({','.join('?' * len(COLUMNAS_PUBLICAS))})", filas)
            if _tiene_tabla(p, "inmueble_ficha_publica"):
                p.execute("DELETE FROM inmueble_ficha_publica")
                destino = ", ".join(("inmueble_id",) + COLUMNAS_FICHA_PUBLICA + ("semaforo_color", "semaforo_resumen"))
                # `entorno` es NOT NULL: un inmueble sin ficha lleva '{}'
                fichas = [tuple(("{}" if (v is None and n == "entorno") else v) for n, v in zip(("id",) + COLUMNAS_FICHA_PUBLICA + ("c", "r"), f)) for f in fichas]
                p.executemany(f"INSERT INTO inmueble_ficha_publica ({destino}) VALUES ({','.join('?' * (len(COLUMNAS_FICHA_PUBLICA) + 3))})", fichas)
    finally:
        p.close()
    return len(filas)
