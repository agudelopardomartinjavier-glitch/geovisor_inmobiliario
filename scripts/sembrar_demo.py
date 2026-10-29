"""Inmuebles de DEMOSTRACIÓN inventados (venta y arriendo) repartidos por barrios y veredas de Acacías.
 - Cada uno cae sobre un predio real del catastro dentro de su barrio/vereda, con precios plausibles inventados.
 - Quedan marcados en las notas internas con «DEMO» para poder quitarlos todos:  python sembrar_demo.py --borrar
 - Es repetible: antes de sembrar borra los DEMO anteriores. No toca los inmuebles reales ni los de [PRUEBA].
Ejecutar con el Python de QGIS."""
import os, sys, random, sqlite3
os.environ.setdefault("PROJ_DATA", r"C:\Program Files\QGIS 3.40.2\share\proj")
from osgeo import ogr
ogr.UseExceptions()
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from db_comun import BASE, ADMIN, PUBLICO, sincronizar_publico

MARCA = "DEMO"
FOTOS = os.path.join(BASE, "data", "fotos")
rnd = random.Random(2026)

def redondear(v, paso):
    return int(round(v / paso) * paso)

# ---------------------------------------------------------------- borrar
con = sqlite3.connect(ADMIN)
con.execute("PRAGMA foreign_keys = ON")
n = con.execute("DELETE FROM inmuebles WHERE notas_internas LIKE ?", (MARCA + "%",)).rowcount
con.commit()
if "--borrar" in sys.argv:
    print(f"Borrados {n} inmuebles DEMO. Publicados ahora: {sincronizar_publico()}")
    sys.exit(0)

# ---------------------------------------------------------------- insumos del catastro
ds = ogr.Open(PUBLICO)
predios = ds.GetLayerByName("predios")
barrios = ds.GetLayerByName("cu_3_barrios")
veredas = ds.GetLayerByName("cr_2_veredas")

def predios_en(poligono, amin, amax):
    """Predios cuyo punto interior cae dentro del polígono y con área entre amin y amax (m²)."""
    predios.SetSpatialFilter(poligono)
    out = []
    for f in predios:
        g = f.GetGeometryRef()
        a = g.GetArea()
        if not (amin <= a <= amax):
            continue
        p = g.PointOnSurface()
        if poligono.Contains(p):
            out.append((f.GetField("numero_predial"), a, p.GetX(), p.GetY()))
    predios.SetSpatialFilter(None)
    return out

lista_barrios = []
for b in barrios:
    g = b.GetGeometryRef().Clone()
    lista_barrios.append((b.GetField("convencion"), g, g.GetArea()))
lista_barrios.sort(key=lambda t: -t[2])
lista_veredas = [(v.GetField("vereda"), v.GetGeometryRef().Clone()) for v in veredas]

# ---------------------------------------------------------------- plantillas de texto
DESC = {
    "casa": ["Casa de {p} plantas en {z}, {h} alcobas, {b} {bn}, sala-comedor, cocina integral, patio y zona de ropas. Cerca de colegios y comercio.",
             "Casa cómoda y bien ubicada en {z}. {h} alcobas, {b} {bn}, garaje cubierto y patio trasero. Servicios públicos al día.",
             "Casa esquinera en {z} con buena iluminación y ventilación, {h} alcobas, {b} {bn}, terraza y garaje para dos vehículos."],
    "lote": ["Lote plano en {z}, listo para construir, con servicios públicos al frente y vía pavimentada.",
             "Excelente lote en {z}, escrituras al día, ideal para vivienda o proyecto pequeño. Zona tranquila y de valorización.",
             "Lote medianero en {z}, topografía plana, cerca de transporte, colegios y comercio."],
    "apartamento": ["Apartamento en {z}, {h} alcobas, {b} {bn}, sala-comedor, cocina semi-integral y balcón. Conjunto cerrado con portería.",
                    "Apartamento remodelado en {z}, buena iluminación, {h} alcobas, {b} {bn} y parqueadero.",
                    "Apartamento en segundo piso en {z}, {h} alcobas, {b} {bn}, zona de ropas y excelente ubicación."],
    "local": ["Local comercial en {z}, sobre vía de alto flujo peatonal, baño y cortina metálica. Ideal para tienda, droguería o restaurante.",
              "Local amplio en {z}, con mezzanine y baño, excelente visibilidad comercial.",
              "Local en esquina en {z}, doble acceso, apto para negocio de alimentos o servicios."],
    "finca": ["Finca en la vereda {z}, terreno semiplano con fuentes de agua, pastos mejorados y vía de acceso transitable todo el año.",
              "Hermosa finca en {z}, apta para ganadería y cultivos, con casa campesina, pozo de agua y cercas en buen estado.",
              "Finca productiva en {z}, con electricidad, agua permanente y a pocos minutos del casco urbano."],
}
def descripcion(tipo, zona, hab, ban):
    return rnd.choice(DESC[tipo]).format(z=zona.title() if zona.isupper() else zona, h=hab or 3, b=ban or 2, bn=('baño' if (ban or 2) == 1 else 'baños'), p=rnd.choice(["una", "dos"]))

def foto(tipo):
    # varias imágenes de ejemplo por tipo (ver scripts/generar_fotos_demo.py)
    return [f"/fotos/{tipo}-{rnd.randint(1, 3)}.jpg"]

# ---------------------------------------------------------------- generación
filas = []   # dicts

def venta_y_renta(tipo, zona, pred, estado="publicado"):
    npred, area, x, y = pred
    t = tipo
    hab = ban = ac = at = None
    if t == "casa":
        at = round(area, 1); ac = round(min(area * rnd.uniform(0.55, 0.95), 260), 1); hab = rnd.choice([2, 3, 3, 4, 4, 5]); ban = rnd.choice([1, 2, 2, 3])
        valor = ac * rnd.uniform(1.7e6, 2.5e6) + at * rnd.uniform(0.25e6, 0.55e6)
    elif t == "lote":
        at = round(area, 1); valor = at * rnd.uniform(0.28e6, 0.75e6)
    elif t == "apartamento":
        ac = round(rnd.uniform(48, 115), 1); at = None; hab = rnd.choice([2, 3, 3]); ban = rnd.choice([1, 2, 2]); valor = ac * rnd.uniform(2.8e6, 4.1e6)
    else:  # local
        at = round(area, 1); ac = round(min(area * rnd.uniform(0.7, 1.0), 220), 1); ban = 1; valor = ac * rnd.uniform(3.2e6, 6.0e6)
    return dict(tipo=t, hab=hab, ban=ban, ac=ac, at=at, valor=valor)

TIPOS_URBANOS = ["casa", "casa", "casa", "lote", "lote", "apartamento", "apartamento", "local"]
elegidos = [b for b in lista_barrios if b[2] > 15000][:22]     # barrios con tamaño suficiente, los más grandes
sin_predios = 0
for nombre, geom, _ in elegidos:
    for i in range(rnd.choice([2, 2, 3])):
        tipo = rnd.choice(TIPOS_URBANOS)
        lim = {"casa": (90, 320), "lote": (110, 420), "apartamento": (60, 700), "local": (60, 260)}[tipo]
        cand = predios_en(geom, *lim)
        if not cand:
            sin_predios += 1
            continue
        pred = rnd.choice(cand)
        base = venta_y_renta(tipo, nombre, pred)
        # tres de cada cuatro son ventas; el resto, arriendos (los lotes casi nunca se arriendan)
        op = "venta" if (rnd.random() < 0.55 or tipo == "lote") else "arriendo"
        valor = base["valor"] * (1 if op == "venta" else 0.0048 * rnd.uniform(0.9, 1.15))   # renta mensual ≈ 0,48 % del valor
        precio = redondear(valor, 1_000_000 if op == "venta" else 50_000)
        estado = rnd.choices(["publicado", "borrador", "vendido"], weights=[88, 7, 5])[0]
        filas.append(dict(base, zona=nombre, operacion=op, precio=max(precio, 450_000), pred=pred, estado=estado))

# fincas y lotes rurales
for nombre, geom in rnd.sample(lista_veredas, 9):
    cand = predios_en(geom, 8_000, 400_000)
    if not cand:
        continue
    pred = rnd.choice(cand)
    tipo = rnd.choice(["finca", "finca", "finca", "lote"])
    area = pred[1]; ha = area / 10_000
    valor = ha * rnd.uniform(38e6, 95e6) + (ha * 0 if tipo == "lote" else rnd.uniform(60e6, 180e6))
    op = "venta" if rnd.random() < 0.7 else "arriendo"
    if op == "arriendo":
        valor = valor * 0.0042 * rnd.uniform(0.9, 1.2)
    ac = round(rnd.uniform(70, 180), 1) if tipo == "finca" else None
    filas.append(dict(tipo=tipo, hab=rnd.choice([2, 3, 4]) if tipo == "finca" else None, ban=rnd.choice([1, 2]) if tipo == "finca" else None,
                      ac=ac, at=round(area, 1), zona=nombre, operacion=op, precio=max(redondear(valor, 5_000_000 if op == "venta" else 100_000), 600_000), pred=pred,
                      estado=rnd.choices(["publicado", "borrador"], weights=[92, 8])[0]))

# ---------------------------------------------------------------- insertar
import json
ins = 0
for i, f in enumerate(filas):
    npred, area, x, y = f["pred"]
    zona = f["zona"]
    cel = f"300 000 {rnd.randint(10, 99):02d}{rnd.randint(10, 99):02d}"
    con.execute("""INSERT INTO inmuebles (numero_predial,tipo,operacion,precio,area_terreno,area_construida,habitaciones,banos,descripcion,fotos,
                   contacto,estado_publicacion,x,y,propietario,avaluo,notas_internas) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)""",
                (npred, f["tipo"], f["operacion"], f["precio"], f["at"], f["ac"], f["hab"], f["ban"],
                 descripcion(f["tipo"], zona, f["hab"], f["ban"]), json.dumps(foto(f["tipo"])), f"Asesor demo {cel}",
                 f["estado"], round(x, 3), round(y, 3), f"Propietario inventado {i + 1}",
                 redondear(f["precio"] * rnd.uniform(0.85, 1.0), 1_000_000) if f["operacion"] == "venta" else None,
                 f"{MARCA} – dato inventado para pruebas ({zona})"))
    ins += 1
con.commit()
print(f"Sembrados {ins} inmuebles DEMO ({sin_predios} barrios sin predio adecuado).")
print("Publicados ahora:", sincronizar_publico())
for r in con.execute("select operacion, count(*), min(precio), max(precio) from inmuebles where notas_internas like 'DEMO%' group by 1"):
    print(" ", r)
