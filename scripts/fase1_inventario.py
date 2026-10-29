"""Fase 1: copia las capas vectoriales del proyecto QGIS a data/raw y genera docs/inventario_capas.md.
Ejecutar con el Python de QGIS (osgeo). No modifica originales."""
import os, re, shutil, zipfile, glob
os.environ.setdefault("PROJ_DATA", r"C:\Program Files\QGIS 3.40.2\share\proj")
from osgeo import ogr, osr
ogr.UseExceptions()

BASE = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
RAW = os.path.join(BASE, "data", "raw")
QGZ = os.path.join(RAW, "Capas_POT_copia.qgz")
SENS = re.compile(r"(propiet|nombre|cedula|documento|nit|telefono|direccion_not|correo|email|numero_doc|tipo_doc|apellido|matricula|avaluo)", re.I)
PRED = re.compile(r"(npn|numero_predial|numero_pre|codigo)", re.I)

xml = zipfile.ZipFile(QGZ).read("Capas POT.qgs").decode("utf8")
layers = []
for m in re.finditer(r"<maplayer[ >].*?</maplayer>", xml, re.S):
    b = m.group(0)
    name = re.search(r"<layername>(.*?)</layername>", b).group(1)
    ds = re.search(r"<datasource>(.*?)</datasource>", b).group(1).replace("&amp;", "&")
    layers.append((name, ds))

copied = {}
def copiar(src):
    src = src.split("|")[0]
    if src in copied:
        return copied[src]
    sub = "pot" if "Lincecias" in src and src.lower().endswith(".shp") else ("pomca" if "SIGAcacias" in src else "catastro")
    dst_dir = os.path.join(RAW, sub); os.makedirs(dst_dir, exist_ok=True)
    stem = os.path.splitext(src)[0]
    for f in glob.glob(glob.escape(stem) + ".*"):
        shutil.copy2(f, dst_dir)
    copied[src] = os.path.join(dst_dir, os.path.basename(src))
    return copied[src]

out = ["# Inventario de capas\n", f"Proyecto origen: `D:/Contrato 500 Lincecias/Capas POT.qgz` (copia en `data/raw/Capas_POT_copia.qgz`).\n",
       "**SENSIBLE** = campo que puede contener datos personales; no debe llegar a vistas ni vector tiles públicos.\n"]
resumen = []
for name, ds in layers:
    if ds.startswith("crs=") or "type=xyz" in ds:
        url = re.search(r"url=(.*?)(&zmax|$)", ds).group(1)
        out.append(f"\n## {name}\n- Tipo: raster XYZ (no se descargan teselas)\n- URL: `{url}`\n- Nota: Google Hybrid solo uso interno; para la versión pública usar Esri World Imagery u otra con licencia.\n")
        continue
    path = ds.split("|")[0]
    if path.startswith("."):
        path = os.path.normpath(os.path.join(r"D:\Contrato 500 Lincecias", path))
    if not os.path.exists(path):
        out.append(f"\n## {name}\n- NO ENCONTRADA: `{path}`\n"); continue
    local = copiar(path)
    lyr_name = re.search(r"layername=([^|]+)", ds)
    d = ogr.Open(local)
    lyr = d.GetLayerByName(lyr_name.group(1)) if lyr_name else d.GetLayer(0)
    srs = lyr.GetSpatialRef()
    crs = f"{srs.GetAuthorityName(None)}:{srs.GetAuthorityCode(None)}" if srs and srs.GetAuthorityCode(None) else (srs.GetName() if srs else "sin CRS")
    n = lyr.GetFeatureCount()
    inval = nulas = 0
    for f in lyr:
        g = f.GetGeometryRef()
        if g is None or g.IsEmpty(): nulas += 1
        elif not g.IsValid(): inval += 1
    lyr.ResetReading()
    defn = lyr.GetLayerDefn()
    out.append(f"\n## {name}\n- Fuente: `{path}`\n- Formato: {d.GetDriver().GetName()}\n- Geometría: {ogr.GeometryTypeToName(lyr.GetGeomType())}\n- CRS: {crs}\n- Entidades: {n}\n- Geometrías inválidas: {inval} | vacías/nulas: {nulas}\n")
    out.append("\n| Campo | Tipo | Ejemplos | Marca |\n|---|---|---|---|")
    ejemplos = {i: [] for i in range(defn.GetFieldCount())}
    for f in lyr:
        for i in ejemplos:
            v = f.GetField(i)
            if v not in (None, "") and str(v) not in ejemplos[i] and len(ejemplos[i]) < 3:
                ejemplos[i].append(str(v))
        if all(len(v) >= 3 for v in ejemplos.values()): break
    lyr.ResetReading()
    flags = []
    for i in range(defn.GetFieldCount()):
        fd = defn.GetFieldDefn(i); fn = fd.GetName()
        marca = "SENSIBLE" if SENS.search(fn) else ("PREDIAL?" if PRED.search(fn) else "")
        if marca: flags.append(f"{fn}={marca}")
        ej = "; ".join(e.replace("|", "/")[:40] for e in ejemplos[i])
        out.append(f"| {fn} | {fd.GetTypeName()} | {ej} | {marca} |")
    resumen.append((name, n, crs, inval, flags))

out.append("\n\n# Resumen de campos marcados\n")
for name, n, crs, inval, flags in resumen:
    if flags: out.append(f"- **{name}**: " + ", ".join(flags))
with open(os.path.join(BASE, "docs", "inventario_capas.md"), "w", encoding="utf8") as fh:
    fh.write("\n".join(out))
print("capas:", len(layers), "archivos copiados:", len(copied))
