"""Prepara las capas de publico.gpkg para el visor y escribe data/tiles/capas.json (catálogo).
 - Capas pequeñas (hasta LIMITE_VERTICES): GeoJSON en data/geojson/<capa>.geojson (EPSG:4326). MapLibre las trocea en el
   navegador, así no hay teselas que se carguen o fallen: la capa se ve siempre, a cualquier zoom.
 - Capas grandes (predios, POMCA…): vector tiles estáticas MVT en data/tiles/<capa>/{z}/{x}/{y}.pbf.
Los inmuebles NO van aquí: los sirve la API. Uso: python generar_teselas.py [capa ...]  (sin argumentos: todas). Python de QGIS."""
import os, sys, json, shutil, time
os.environ.setdefault("PROJ_DATA", r"C:\Program Files\QGIS 3.40.2\share\proj")
from osgeo import gdal, ogr
gdal.UseExceptions(); ogr.UseExceptions()
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from db_comun import BASE, PUBLICO

LIMITE_VERTICES = 100_000   # por encima de esto la capa se sirve en teselas
OUT = os.path.join(BASE, "data", "tiles")
OUT_GEOJSON = os.path.join(BASE, "data", "geojson")
solo = set(sys.argv[1:])    # opcional: nombres de capas a (re)generar
os.makedirs(OUT, exist_ok=True); os.makedirs(OUT_GEOJSON, exist_ok=True)

def vertices(g) -> int:
    if g is None:
        return 0
    n = g.GetGeometryCount()
    return g.GetPointCount() if n == 0 else sum(vertices(g.GetGeometryRef(i)) for i in range(n))

ds = ogr.Open(PUBLICO)
catalogo = {}
for i in range(ds.GetLayerCount()):
    l = ds.GetLayer(i); n = l.GetName()
    if l.GetGeomType() == ogr.wkbNone or l.GetFeatureCount() == 0:
        continue
    total = sum(vertices(f.GetGeometryRef()) for f in l)
    geojson = n != "predios" and total <= LIMITE_VERTICES
    if geojson:
        catalogo[n] = {"formato": "geojson", "minzoom": 0, "maxzoom": 18, "vertices": total}
    else:
        minz, maxz = (12, 16) if n == "predios" else (0, 15)   # predios solo desde z12; el resto desde z0
        catalogo[n] = {"formato": "mvt", "minzoom": minz, "maxzoom": maxz, "vertices": total}
    if solo and n not in solo:
        continue
    t0 = time.time()
    if geojson:
        shutil.rmtree(os.path.join(OUT, n), ignore_errors=True)   # ya no se usan sus teselas
        destino = os.path.join(OUT_GEOJSON, n + ".geojson")
        if os.path.exists(destino):
            os.remove(destino)
        gdal.VectorTranslate(destino, PUBLICO, options=gdal.VectorTranslateOptions(
            format="GeoJSON", layers=[n], dstSRS="EPSG:4326",
            layerCreationOptions=["COORDINATE_PRECISION=6", "RFC7946=YES"]))
        print(f"{n}: geojson {os.path.getsize(destino) // 1024} KB ({time.time() - t0:.0f}s)", flush=True)
    else:
        d = os.path.join(OUT, n)
        shutil.rmtree(d, ignore_errors=True)
        gdal.VectorTranslate(d, PUBLICO, options=gdal.VectorTranslateOptions(
            format="MVT", layers=[n], layerName=n,
            datasetCreationOptions=[f"MINZOOM={catalogo[n]['minzoom']}", f"MAXZOOM={catalogo[n]['maxzoom']}", "COMPRESS=NO", "NAME=" + n]))
        print(f"{n}: teselas ({time.time() - t0:.0f}s)", flush=True)
with open(os.path.join(OUT, "capas.json"), "w", encoding="utf8") as fh:
    json.dump(catalogo, fh, indent=1)
