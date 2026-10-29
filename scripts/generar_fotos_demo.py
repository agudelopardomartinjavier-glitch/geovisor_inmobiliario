"""Genera 15 imágenes de ejemplo (5 tipos × 3 variantes, 640×400) en data/fotos para los inmuebles de demostración.
La API las sirve en /fotos. Ejecutar con el Python de QGIS (usa Pillow)."""
import os
from PIL import Image, ImageDraw, ImageFont

BASE = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT = os.path.join(BASE, "data", "fotos")
os.makedirs(OUT, exist_ok=True)
W, H = 640, 400
PALETAS = {  # (cielo arriba, cielo abajo, suelo, muros, techo)
    "casa": [((135, 195, 235), (225, 240, 250), (112, 170, 90), (245, 222, 179), (178, 74, 56)),
             ((255, 200, 140), (255, 235, 200), (140, 175, 95), (236, 239, 241), (96, 125, 139)),
             ((150, 205, 240), (230, 245, 252), (96, 160, 80), (255, 224, 178), (141, 85, 60))],
    "lote": [((135, 195, 235), (225, 240, 250), (150, 190, 100), None, None), ((250, 205, 150), (255, 238, 210), (170, 185, 105), None, None),
             ((120, 180, 230), (215, 235, 248), (125, 175, 95), None, None)],
    "apartamento": [((140, 190, 230), (225, 238, 250), (100, 150, 90), (207, 216, 220), (84, 110, 122)),
                    ((255, 210, 160), (255, 238, 215), (120, 160, 95), (236, 224, 210), (121, 85, 72)),
                    ((130, 185, 235), (220, 238, 252), (105, 155, 85), (224, 224, 224), (69, 90, 100))],
    "local": [((140, 195, 235), (228, 242, 252), (150, 150, 150), (255, 243, 224), (198, 40, 40)),
              ((255, 205, 150), (255, 238, 205), (160, 158, 150), (227, 242, 253), (21, 101, 192)),
              ((135, 190, 232), (224, 240, 251), (146, 146, 146), (241, 248, 233), (46, 125, 50))],
    "finca": [((120, 185, 235), (225, 242, 252), (96, 165, 70), (255, 236, 179), (121, 85, 72)),
              ((255, 195, 130), (255, 235, 195), (130, 175, 80), (255, 245, 230), (109, 76, 65)),
              ((135, 200, 240), (232, 246, 253), (88, 150, 66), (250, 235, 215), (139, 90, 60))],
}

def degradado(d, arriba, abajo, alto):
    for y in range(alto):
        t = y / max(alto - 1, 1)
        d.line([(0, y), (W, y)], fill=tuple(int(a + (b - a) * t) for a, b in zip(arriba, abajo)))

def fuente(tam):
    for f in ("arialbd.ttf", "DejaVuSans-Bold.ttf", "arial.ttf"):
        try:
            return ImageFont.truetype(f, tam)
        except OSError:
            continue
    return ImageFont.load_default()

def casa(d, muros, techo, x=170, y=150, w=300, h=150):
    d.rectangle([x, y, x + w, y + h], fill=muros, outline=(90, 80, 70))
    d.polygon([(x - 20, y), (x + w / 2, y - 80), (x + w + 20, y)], fill=techo)
    d.rectangle([x + w / 2 - 25, y + 55, x + w / 2 + 25, y + h], fill=(121, 85, 72))
    for vx in (x + 30, x + w - 80):
        d.rectangle([vx, y + 40, vx + 50, y + 90], fill=(173, 216, 230), outline=(90, 80, 70))

def edificio(d, muros, techo):
    d.rectangle([200, 70, 440, 330], fill=muros, outline=(80, 80, 80))
    d.rectangle([200, 60, 440, 80], fill=techo)
    for fila in range(5):
        for col in range(4):
            d.rectangle([218 + col * 56, 98 + fila * 46, 252 + col * 56, 126 + fila * 46], fill=(173, 216, 230), outline=(80, 80, 80))
    d.rectangle([300, 290, 340, 330], fill=(93, 64, 55))

def local(d, muros, techo):
    d.rectangle([140, 170, 500, 320], fill=muros, outline=(80, 80, 80))
    d.rectangle([130, 140, 510, 180], fill=techo)
    d.rectangle([165, 205, 330, 320], fill=(173, 216, 230), outline=(80, 80, 80))
    d.rectangle([360, 205, 470, 320], fill=(120, 144, 156))
    for i in range(10):
        d.line([(360, 205 + i * 11.5), (470, 205 + i * 11.5)], fill=(96, 125, 139))

def finca(d, muros, techo):
    casa(d, muros, techo, x=360, y=190, w=170, h=100)
    d.line([(0, 330), (W, 320)], fill=(121, 85, 72), width=3)
    for x in range(20, 340, 60):
        d.line([(x, 320), (x, 345)], fill=(121, 85, 72), width=3)
    for cx, cy in ((90, 250), (170, 240), (260, 260)):
        d.rectangle([cx - 5, cy, cx + 5, cy + 45], fill=(93, 64, 55)); d.ellipse([cx - 32, cy - 40, cx + 32, cy + 15], fill=(46, 125, 50))

for tipo, lista in PALETAS.items():
    for i, (c1, c2, suelo, muros, techo) in enumerate(lista, 1):
        im = Image.new("RGB", (W, H)); d = ImageDraw.Draw(im)
        degradado(d, c1, c2, 260)
        d.rectangle([0, 300, W, H], fill=suelo)
        d.ellipse([500, 40, 570, 110], fill=(255, 241, 118))
        {"casa": lambda: casa(d, muros, techo), "apartamento": lambda: edificio(d, muros, techo), "local": lambda: local(d, muros, techo),
         "finca": lambda: finca(d, muros, techo), "lote": lambda: [d.line([(40, 330), (600, 330)], fill=(120, 100, 70), width=4),
                                                                   d.polygon([(40, 330), (600, 330), (560, 300), (80, 300)], fill=(160, 200, 110))]}[tipo]()
        d.rectangle([0, H - 54, W, H], fill=(0, 0, 0))
        d.text((18, H - 46), tipo.capitalize() + " · imagen de ejemplo", fill=(255, 255, 255), font=fuente(26))
        im.save(os.path.join(OUT, f"{tipo}-{i}.jpg"), quality=82)
print("Imágenes:", sorted(os.listdir(OUT)))
