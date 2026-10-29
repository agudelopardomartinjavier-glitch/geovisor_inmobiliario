"""Ficha PDF pública de un inmueble. Solo usa campos públicos (la misma fila de inmuebles_publicos)."""
import json
from io import BytesIO

from reportlab.lib import colors
from reportlab.lib.units import mm
from reportlab.platypus import Image, KeepTogether, Paragraph, Spacer, Table, TableStyle

from ..geo import a_4326
from ..predio_servicio import analizar
from . import base
from .base import ANCHO, ESTILOS, cop, descargar_foto, esc, num, tabla_datos
from .croquis import croquis

def _bloque_cruces(titulo: str, grupos) -> list:
    if not grupos:
        return []
    filas = [[Paragraph(f"<b>{esc(titulo)}</b>", ESTILOS["celda"]), "", ""]]
    for _clave, tit, items in grupos:
        for it in items:
            a = it["atributos"]
            cod = a.get("codigo") or a.get("nomenclat") or a.get("codigofin") or ""
            desc = a.get("convencion") or a.get("zonificaci") or " · ".join(str(a[k]) for k in ("categ_orde", "zon_uym", "subz_uym") if a.get(k)) or ""
            filas.append([Paragraph(esc(tit), ESTILOS["celda"]), Paragraph(f"<b>{esc(cod)}</b> {esc(desc)}", ESTILOS["celda"]),
                          Paragraph(f"{num(it['porcentaje_predio'], 1)} %", ESTILOS["celda"])])
    t = Table(filas, colWidths=[40 * mm, ANCHO - 58 * mm, 18 * mm], repeatRows=1)
    t.setStyle(TableStyle([("SPAN", (0, 0), (-1, 0)), ("BACKGROUND", (0, 0), (-1, 0), base.GRIS_CLARO), ("VALIGN", (0, 0), (-1, -1), "TOP"),
                           ("LINEBELOW", (0, 0), (-1, -1), 0.25, colors.HexColor("#e5e7eb")), ("TOPPADDING", (0, 0), (-1, -1), 2), ("BOTTOMPADDING", (0, 0), (-1, -1), 2)]))
    return [t, Spacer(1, 4)]

def ficha_pdf(conn, inm: dict, permitir_fotos_privadas: bool = False) -> bytes:
    """inm: fila de inmuebles_publicos como dict (id, tipo, operacion, precio, x, y, …)."""
    fotos = json.loads(inm.get("fotos") or "[]")
    analisis = analizar(conn, inm["numero_predial"]) if inm.get("numero_predial") else None
    lonlat = None
    if inm.get("x") is not None:
        from shapely.geometry import Point
        p = a_4326(Point(inm["x"], inm["y"])); lonlat = (p.y, p.x)

    h = []
    h.append(Paragraph(f"{esc(inm['tipo']).capitalize()} en {esc(inm['operacion'])}", ESTILOS["h1"]))
    h.append(Paragraph(cop(inm.get("precio")) if inm.get("precio") else "Precio a consultar", ESTILOS["precio"]))
    h.append(Spacer(1, 6))

    ubic = ""
    if analisis:
        ubic = f"Barrio {analisis.ubicacion['barrio']}" if analisis.ubicacion.get("barrio") else (f"Vereda {analisis.ubicacion['vereda']}" if analisis.ubicacion.get("vereda") else "")
    hechos = [("Referencia", f"N.º {inm['id']}"), ("Número predial", inm.get("numero_predial")), ("Ubicación", ubic or "Acacías, Meta"),
              ("Área de terreno", f"{num(inm.get('area_terreno'), 1)} m²" if inm.get("area_terreno") else None),
              ("Área construida", f"{num(inm.get('area_construida'), 1)} m²" if inm.get("area_construida") else None),
              ("Habitaciones", inm.get("habitaciones")), ("Baños", inm.get("banos")),
              ("Publicado", (inm.get("fecha_publicacion") or "")[:10] or None), ("Contacto", inm.get("contacto"))]
    hechos = [(k, v) for k, v in hechos if v not in (None, "")]

    foto = descargar_foto(fotos[0], permitir_fotos_privadas) if fotos else None
    if foto:
        from PIL import Image as PILImage
        w, hh = PILImage.open(BytesIO(foto)).size
        ancho_foto = 88 * mm
        alto_foto = min(ancho_foto * hh / w, 70 * mm)
        img = Image(BytesIO(foto), width=ancho_foto, height=alto_foto, kind="proportional")
        t = Table([[img, tabla_datos(hechos, 27 * mm, ANCHO - ancho_foto - 6 * mm)]], colWidths=[ancho_foto + 4 * mm, ANCHO - ancho_foto - 4 * mm])
        t.setStyle(TableStyle([("VALIGN", (0, 0), (-1, -1), "TOP"), ("LEFTPADDING", (0, 0), (-1, -1), 0)]))
        h.append(t)
    else:
        h.append(tabla_datos(hechos))

    if inm.get("descripcion"):
        h += [Paragraph("Descripción", ESTILOS["h2"]), Paragraph(esc(inm["descripcion"]).replace("\n", "<br/>"), ESTILOS["texto"])]

    pie_croquis = "Croquis esquemático sobre la base catastral; no es un plano oficial."
    if lonlat:
        pie_croquis = f"Coordenadas aproximadas: {lonlat[0]:.6f}, {lonlat[1]:.6f} (lat, lon). " + pie_croquis
    bloque = [Paragraph("Ubicación", ESTILOS["h2"]),
              croquis(conn, ANCHO, 78 * mm, analisis.geom if analisis else None, (inm["x"], inm["y"]) if inm.get("x") is not None else None),
              Paragraph(pie_croquis, ESTILOS["pequeno"])]
    h.append(KeepTogether(bloque))

    if analisis and (analisis.uso or analisis.pomca):
        h.append(Paragraph("Uso del suelo y restricciones ambientales (referencia)", ESTILOS["h2"]))
        h += _bloque_cruces("Plan de Ordenamiento Territorial (POT)", analisis.uso)
        h += _bloque_cruces("Plan de Ordenamiento de Cuenca (POMCA)", analisis.pomca)

    h.append(Spacer(1, 8))
    h.append(Paragraph(
        "Información de referencia basada en el POT y el POMCA cargados en el geovisor y en la base catastral disponible. "
        "No reemplaza el concepto oficial de uso del suelo, el certificado de tradición y libertad ni la verificación jurídica del inmueble. "
        "Precios y condiciones sujetos a confirmación con el contacto.", ESTILOS["pequeno"]))
    return base.construir(f"Ficha del inmueble N.º {inm['id']}", h)
