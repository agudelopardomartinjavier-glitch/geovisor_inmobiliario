"""Fase 2: reproyecta a EPSG:9377, repara geometrias, normaliza campos y consolida en data/geovisor.gpkg.
No modifica data/raw. Ejecutar con el Python de QGIS."""
import os, re, glob, unicodedata, datetime
os.environ.setdefault("PROJ_DATA", r"C:\Program Files\QGIS 3.40.2\share\proj")
from osgeo import ogr, gdal, osr
ogr.UseExceptions(); gdal.UseExceptions()

BASE = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
RAW = os.path.join(BASE, "data", "raw")
OUT = os.path.join(BASE, "data", "geovisor.gpkg")
if os.path.exists(OUT):
    os.remove(OUT)

def norm(s):
    s = unicodedata.normalize("NFKD", s).encode("ascii", "ignore").decode()
    s = re.sub(r"[^0-9a-zA-Z]+", "_", s).strip("_").lower()
    return ("c_" + s) if s[:1].isdigit() else s

def nombre_capa(path, sub):
    stem = norm(os.path.splitext(os.path.basename(path))[0])
    if sub == "catastro":
        return "predios"
    if sub == "pomca":
        return stem.replace("za_", "", 1)
    return stem

# (ruta, subcarpeta)
fuentes = []
for sub in ("catastro", "pot", "pomca"):
    for p in sorted(glob.glob(os.path.join(RAW, sub, "*.shp")) + glob.glob(os.path.join(RAW, sub, "*.gpkg"))):
        fuentes.append((p, sub))

dst = osr.SpatialReference(); dst.ImportFromEPSG(9377)
rep = []
for path, sub in fuentes:
    src = ogr.Open(path)
    lyr = src.GetLayer(0)
    defn = lyr.GetLayerDefn()
    n_in = lyr.GetFeatureCount()
    srs = lyr.GetSpatialRef()
    crs_in = (f"{srs.GetAuthorityName(None)}:{srs.GetAuthorityCode(None)}" if srs and srs.GetAuthorityCode(None) else (srs.GetName() if srs else "sin CRS"))
    # mapa de campos
    usados, mapa = set(), {}
    for i in range(defn.GetFieldCount()):
        o = defn.GetFieldDefn(i).GetName()
        n = norm(o) or f"campo_{i}"
        base_n, k = n, 2
        while n in usados or n in ("fid", "geom", "geometry"):
            n = f"{base_n}_{k}"; k += 1
        usados.add(n); mapa[o] = n
    renombrados = {o: n for o, n in mapa.items() if o != n}
    cols = ", ".join(f'"{o}" AS "{n}"' for o, n in mapa.items())
    lname = lyr.GetName()
    sql = f'SELECT {cols} FROM "{lname}"' if cols else f'SELECT * FROM "{lname}"'
    inval = sum(1 for f in lyr if f.GetGeometryRef() is not None and not f.GetGeometryRef().IsEmpty() and not f.GetGeometryRef().IsValid())
    lyr.ResetReading()
    nombre = nombre_capa(path, sub)
    opts = gdal.VectorTranslateOptions(
        format="GPKG", accessMode="append" if os.path.exists(OUT) else None,
        dstSRS=dst, srcSRS=srs, layerName=nombre, SQLStatement=sql, SQLDialect="OGRSQL",
        makeValid=True, geometryType="PROMOTE_TO_MULTI", skipFailures=True,
        layerCreationOptions=["GEOMETRY_NAME=geom", "SPATIAL_INDEX=YES"])
    t = gdal.VectorTranslate(OUT, path, options=opts)
    t = None
    dso = ogr.Open(OUT)
    o = dso.GetLayerByName(nombre)
    n_out = o.GetFeatureCount()
    inval_out = sum(1 for f in o if f.GetGeometryRef() is not None and not f.GetGeometryRef().IsValid())
    vacias = 0
    o.ResetReading()
    for f in o:
        g = f.GetGeometryRef()
        if g is None or g.IsEmpty(): vacias += 1
    rep.append(dict(origen=os.path.relpath(path, RAW), capa=nombre, crs_in=crs_in, n_in=n_in, n_out=n_out,
                    inval_in=inval, inval_out=inval_out, vacias=vacias, ren=renombrados))
    print(nombre, crs_in, n_in, n_out, "inv", inval, "->", inval_out, flush=True)

# indices por numero predial en la capa de predios
ds = ogr.Open(OUT, 1)
ds.ExecuteSQL("CREATE INDEX IF NOT EXISTS idx_predios_codigo ON predios(codigo)")
ds = None

L = ["# Reporte de Fase 2 — consolidación\n",
     f"Generado: {datetime.date.today()}  \nSalida: `data/geovisor.gpkg` (EPSG:9377, geometrías MULTI, reparadas con `makevalid`).\n",
     "Convención de nombres: minúsculas, sin tildes, espacios/guiones → `_`. Capa catastral = `predios`; POMCA sin prefijo `za_`.\n",
     "| Origen | Capa | CRS origen | Ent. orig. | Ent. final | Inválidas orig. | Inválidas final | Vacías final |",
     "|---|---|---|---|---|---|---|---|"]
for r in rep:
    L.append(f"| {r['origen']} | {r['capa']} | {r['crs_in']} | {r['n_in']} | {r['n_out']} | {r['inval_in']} | {r['inval_out']} | {r['vacias']} |")
L.append(f"\n**Totales:** {len(rep)} capas; entidades origen {sum(r['n_in'] for r in rep)}, final {sum(r['n_out'] for r in rep)}; "
         f"inválidas {sum(r['inval_in'] for r in rep)} → {sum(r['inval_out'] for r in rep)}.\n")
L.append("\n## Campos renombrados\n")
for r in rep:
    if r["ren"]:
        L.append(f"- **{r['capa']}**: " + ", ".join(f"`{o}`→`{n}`" for o, n in r["ren"].items()))
with open(os.path.join(BASE, "docs", "reporte_fase2.md"), "w", encoding="utf8") as fh:
    fh.write("\n".join(L))
print("OK", len(rep))
