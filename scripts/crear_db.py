"""Fase 3 (SQLite): construye data/db/publico.gpkg y data/db/admin.sqlite desde data/geovisor.gpkg.
 - publico.gpkg : predios (solo columnas públicas), capas POT/POMCA, inmuebles_publicos, catalogo_capas
 - admin.sqlite : inmuebles con campos privados (propietario, avaluo, notas_internas)
publico.gpkg es derivado y se regenera siempre. admin.sqlite conserva sus datos: solo se recrean los inmuebles de PRUEBA.
Ejecutar con el Python de QGIS."""
import os, sys, sqlite3, json
os.environ.setdefault("PROJ_DATA", r"C:\Program Files\QGIS 3.40.2\share\proj")
from osgeo import gdal, ogr
gdal.UseExceptions(); ogr.UseExceptions()
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from db_comun import BASE, DB_DIR, ADMIN, PUBLICO, sincronizar_publico, abrir_publico_solo_lectura

GPKG = os.path.join(BASE, "data", "geovisor.gpkg")
os.makedirs(DB_DIR, exist_ok=True)

# ---------------------------------------------------------------- publico.gpkg
if os.path.exists(PUBLICO):
    os.remove(PUBLICO)

sql_predios = """
SELECT COALESCE(codigo, codigo_2)                     AS numero_predial,
       manzana_codigo, vereda_codigo,
       COALESCE(codigo_municipio, codigo_municipio_2) AS codigo_municipio,
       geom
FROM predios
WHERE (codigo_municipio_2 IS NULL OR codigo_municipio_2 = '50006')
  AND COALESCE(codigo, codigo_2) IS NOT NULL
"""
gdal.VectorTranslate(PUBLICO, GPKG, options=gdal.VectorTranslateOptions(
    format="GPKG", layerName="predios", SQLStatement=sql_predios, SQLDialect="SQLITE",
    geometryType="PROMOTE_TO_MULTI", layerCreationOptions=["GEOMETRY_NAME=geom", "FID=id", "SPATIAL_INDEX=YES"]))

src = ogr.Open(GPKG)
capas = [src.GetLayer(i).GetName() for i in range(src.GetLayerCount()) if src.GetLayer(i).GetName() != "predios"]
src = None
for n in capas:
    gdal.VectorTranslate(PUBLICO, GPKG, options=gdal.VectorTranslateOptions(
        format="GPKG", accessMode="append", layerName=n, layers=[n],
        layerCreationOptions=["GEOMETRY_NAME=geom", "FID=gid", "SPATIAL_INDEX=YES"]))

con = sqlite3.connect(PUBLICO)
with open(os.path.join(BASE, "db", "02_publico.sql"), encoding="utf8") as fh:
    con.executescript(fh.read())
con.execute("CREATE INDEX IF NOT EXISTS predios_numero_idx ON predios (numero_predial)")
con.execute("CREATE INDEX IF NOT EXISTS predios_vereda_idx ON predios (vereda_codigo)")
for nombre, geom in con.execute("SELECT table_name, geometry_type_name FROM gpkg_geometry_columns").fetchall():
    grupo = "catastro" if nombre == "predios" else ("ambiental" if nombre.startswith("pomca_") else "pot")
    n = con.execute(f'SELECT count(*) FROM "{nombre}"').fetchone()[0]
    con.execute("INSERT OR REPLACE INTO catalogo_capas VALUES (?,?,?,?)", (nombre, grupo, geom, n))
con.commit(); con.close()
import migrar
migrar.subir("publico")   # tablas añadidas por migración (ficha pública, etc.)

# ---------------------------------------------------------------- admin.sqlite
a = sqlite3.connect(ADMIN)
with open(os.path.join(BASE, "db", "01_esquema.sql"), encoding="utf8") as fh:
    a.executescript(fh.read())
a.commit()
migrar.subir("admin")     # migraciones versionadas (con respaldo previo de admin.sqlite)
a.execute("DELETE FROM inmuebles WHERE descripcion LIKE '[PRUEBA]%'")

# 3 inmuebles ficticios sobre predios reales con numero_predial unico
ds = ogr.Open(PUBLICO)
lyr = ds.GetLayerByName("predios")
cuenta = {}
for f in lyr:
    k = f.GetField("numero_predial"); cuenta[k] = cuenta.get(k, 0) + 1
cand = []
lyr.ResetReading()
for f in lyr:
    k = f.GetField("numero_predial")
    if cuenta[k] != 1:
        continue
    g = f.GetGeometryRef(); pt = g.PointOnSurface()
    cand.append((k, g.GetArea(), k[5:7], pt.GetX(), pt.GetY()))   # zona: 01 urbano, 00 rural
ds = None

def elegir(zona, lo, hi, desc=False):
    return sorted([c for c in cand if c[2] == zona and lo <= c[1] <= hi], key=lambda c: c[0], reverse=desc)[0]

filas = [
 (elegir("01", 120, 250), "casa", "venta", 320000000, 95, 3, 2, "[PRUEBA] Casa ficticia en zona urbana.", "Casa", "publicado", "Propietario Ficticio 1", 290000000),
 (elegir("01", 300, 900, True), "lote", "venta", 150000000, None, None, None, "[PRUEBA] Lote ficticio urbano.", "Lote", "publicado", "Propietario Ficticio 2", 130000000),
 (elegir("00", 50000, 1e12), "finca", "venta", 1800000000, 120, 4, 3, "[PRUEBA] Finca ficticia rural (borrador: no debe verse en el visor público).", "Finca", "borrador", "Propietario Ficticio 3", 1500000000),
]
for i, (c, tipo, op, precio, ac, hab, ban, desc, foto, est, prop, avaluo) in enumerate(filas):
    a.execute("""INSERT INTO inmuebles (numero_predial,tipo,operacion,precio,area_terreno,area_construida,habitaciones,banos,
                 descripcion,fotos,contacto,estado_publicacion,x,y,propietario,avaluo,notas_internas)
                 VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)""",
              (c[0], tipo, op, precio, round(c[1], 2), ac, hab, ban, desc,
               json.dumps([f"https://placehold.co/800x600?text={foto}"]), f"Contacto ficticio 300 000 000{i}",
               est, round(c[3], 3), round(c[4], 3), prop, avaluo, "Dato de prueba"))
a.commit()
print("inmuebles en admin:", a.execute("SELECT id,tipo,estado_publicacion,numero_predial FROM inmuebles").fetchall())
a.close()
print("publicados sincronizados:", sincronizar_publico())

# ---------------------------------------------------------------- verificaciones
ok = True
def chk(desc, cond):
    global ok
    ok &= bool(cond); print("OK   " if cond else "FALLA", desc)

p = abrir_publico_solo_lectura()
cols_pub = {r[1] for r in p.execute("PRAGMA table_info(inmuebles_publicos)")}
chk("inmuebles_publicos sin propietario/avaluo/notas_internas/estado", not ({"propietario", "avaluo", "notas_internas", "estado_publicacion"} & cols_pub))
chk("solo 2 inmuebles públicos (el borrador queda fuera)", p.execute("SELECT count(*) FROM inmuebles_publicos").fetchone()[0] == 2)
try:
    p.execute("DELETE FROM inmuebles_publicos"); fallo = False
except sqlite3.OperationalError:
    fallo = True
chk("publico.gpkg en solo lectura rechaza escrituras", fallo)
tablas = {r[0] for r in p.execute("SELECT name FROM sqlite_master WHERE type='table'")}
chk("publico.gpkg no contiene la tabla privada 'inmuebles'", "inmuebles" not in tablas)
n_pred = p.execute("SELECT count(*) FROM predios").fetchone()[0]
chk(f"predios = 31261 (hay {n_pred})", n_pred == 31261)
n_cat = p.execute("SELECT count(*) FROM catalogo_capas").fetchone()[0]
chk(f"catalogo_capas = 47 (hay {n_cat})", n_cat == 47)
chk("predios sin columnas internas", not ({"codigo_anterior", "usuario_log", "globalid"} & {r[1] for r in p.execute("PRAGMA table_info(predios)")}))
p.close()
sys.exit(0 if ok else 1)
