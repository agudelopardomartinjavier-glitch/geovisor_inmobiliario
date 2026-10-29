"""Carga data/geovisor.gpkg a PostGIS (catastro / pot / ambiental), crea los 3 inmuebles de prueba y verifica permisos.
Requisitos: contenedor `db` arriba; Python de QGIS (osgeo + psycopg2). Idempotente: se puede repetir.

  "C:\\Program Files\\QGIS 3.40.2\\apps\\Python312\\python.exe" scripts\\cargar_datos.py
"""
import os, sys
os.environ.setdefault("PROJ_DATA", r"C:\Program Files\QGIS 3.40.2\share\proj")
import psycopg2
from osgeo import gdal, ogr
gdal.UseExceptions(); ogr.UseExceptions()
gdal.SetConfigOption("PG_USE_COPY", "YES")

BASE = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
GPKG = os.path.join(BASE, "data", "geovisor.gpkg")

env = {}
with open(os.path.join(BASE, ".env"), encoding="utf8") as fh:
    for ln in fh:
        ln = ln.strip()
        if ln and not ln.startswith("#") and "=" in ln:
            k, v = ln.split("=", 1); env[k] = v
HOST, PORT, DB = os.environ.get("DB_HOST", "localhost"), env.get("DB_PORT", "5432"), env["POSTGRES_DB"]
USER, PW = env["POSTGRES_USER"], env["POSTGRES_PASSWORD"]
PG = f"PG:host={HOST} port={PORT} dbname={DB} user={USER} password={PW}"

def conn(user=USER, pw=PW):
    return psycopg2.connect(host=HOST, port=PORT, dbname=DB, user=user, password=pw)

# ------------------------------------------------------------------ predios
con = conn(); con.autocommit = True; cur = con.cursor()
cur.execute("TRUNCATE catastro.predios RESTART IDENTITY")
sql_predios = """
SELECT COALESCE(codigo, codigo_2)                      AS numero_predial,
       COALESCE(codigo_anterior, codigo_anterior_2)    AS codigo_anterior,
       manzana_codigo, vereda_codigo,
       COALESCE(codigo_municipio, codigo_municipio_2)  AS codigo_municipio,
       geom
FROM predios
WHERE (codigo_municipio_2 IS NULL OR codigo_municipio_2 = '50006')
  AND COALESCE(codigo, codigo_2) IS NOT NULL
"""
gdal.VectorTranslate(PG, GPKG, options=gdal.VectorTranslateOptions(
    format="PostgreSQL", accessMode="append", layerName="catastro.predios",
    SQLStatement=sql_predios, SQLDialect="SQLITE", geometryType="PROMOTE_TO_MULTI"))
cur.execute("SELECT count(*) FROM catastro.predios"); print("catastro.predios:", cur.fetchone()[0])

# ------------------------------------------------------------------ POT y POMCA
src = ogr.Open(GPKG)
nombres = [src.GetLayer(i).GetName() for i in range(src.GetLayerCount())]
src = None
for n in nombres:
    if n == "predios":
        continue
    esquema = "ambiental" if n.startswith("pomca_") else "pot"
    gdal.VectorTranslate(PG, GPKG, options=gdal.VectorTranslateOptions(
        format="PostgreSQL", accessMode="overwrite", layerName=f"{esquema}.{n}", layers=[n],
        layerCreationOptions=["GEOMETRY_NAME=geom", "FID=gid", "LAUNDER=NO", "PRECISION=NO", "SPATIAL_INDEX=GIST"]))
    cur.execute(f'SELECT count(*) FROM "{esquema}"."{n}"')
    print(f"{esquema}.{n}:", cur.fetchone()[0], flush=True)

cur.execute("GRANT SELECT ON ALL TABLES IN SCHEMA pot, ambiental TO publico, \"admin\"")
cur.execute("ANALYZE")

# ------------------------------------------------------------------ inmuebles de prueba
with open(os.path.join(BASE, "db", "03_inmuebles_prueba.sql"), encoding="utf8") as fh:
    cur.execute(fh.read())
cur.execute("SELECT id, tipo, estado_publicacion, numero_predial FROM inmobiliario.inmuebles ORDER BY id")
print("inmuebles de prueba:", cur.fetchall())
con.close()

# ------------------------------------------------------------------ verificación de permisos
def prueba(rol, pw, sql, debe_fallar):
    c = conn(rol, pw); c.autocommit = True
    try:
        cu = c.cursor(); cu.execute(sql); res = cu.fetchall()
        ok = not debe_fallar; det = f"{len(res)} filas"
    except psycopg2.Error as e:
        ok = debe_fallar; det = type(e).__name__
    c.close()
    print(("OK   " if ok else "FALLA"), rol, "|", sql[:70], "->", det)
    return ok

todo = [
    prueba("api_publico", env["API_PUBLICO_PASSWORD"], "SELECT * FROM vista_publica.inmuebles", False),
    prueba("api_publico", env["API_PUBLICO_PASSWORD"], "SELECT propietario FROM inmobiliario.inmuebles", True),
    prueba("api_publico", env["API_PUBLICO_PASSWORD"], "SELECT avaluo FROM vista_publica.inmuebles", True),
    prueba("api_publico", env["API_PUBLICO_PASSWORD"], "SELECT id FROM inmobiliario.inmuebles WHERE estado_publicacion<>'publicado'", False),
    prueba("api_publico", env["API_PUBLICO_PASSWORD"], "SELECT codigo_anterior FROM catastro.predios LIMIT 1", True),
    prueba("api_admin", env["API_ADMIN_PASSWORD"], "SELECT propietario, avaluo, notas_internas FROM inmobiliario.inmuebles", False),
]
c = conn("api_publico", env["API_PUBLICO_PASSWORD"]); cu = c.cursor()
cu.execute("SELECT count(*) FROM vista_publica.inmuebles"); pub = cu.fetchone()[0]
cu.execute("SELECT count(*) FROM inmobiliario.inmuebles"); pub_tabla = cu.fetchone()[0]
print(f"api_publico ve {pub} en la vista y {pub_tabla} en la tabla (esperado 2 y 2: el borrador queda oculto por RLS)")
todo.append(pub == 2 and pub_tabla == 2)
sys.exit(0 if all(todo) else 1)
