"""Informe PDF CONFIDENCIAL de valoración por comparables (solo administrador)."""
from reportlab.lib import colors
from reportlab.lib.units import mm
from reportlab.platypus import KeepTogether, Paragraph, Spacer, Table, TableStyle

from ..admin import valoracion as val
from ..predio_servicio import analizar
from . import base
from .base import ANCHO, ESTILOS, VIOLETA, cop, esc, num, tabla_datos
from .croquis import croquis

def informe_pdf(conn, inm: dict, vinculos: list[dict], v: dict) -> bytes:
    """inm: fila de admin.inmuebles; vinculos: filas unidas con comparables (+ ajuste_pct, incluir, nota); v: resultado de valorar()."""
    analisis = analizar(conn, inm["numero_predial"]) if inm.get("numero_predial") else None
    base_txt = "terreno" if v["base"] == "terreno" else "construida"
    h = [Paragraph(f"Valoración por comparables · inmueble N.º {inm['id']}", ESTILOS["h1"]),
         Paragraph("Documento confidencial de uso interno: contiene datos del propietario y avalúos.", ESTILOS["pequeno"]), Spacer(1, 6)]

    ubic = ""
    if analisis:
        ubic = f"Barrio {analisis.ubicacion['barrio']}" if analisis.ubicacion.get("barrio") else (f"Vereda {analisis.ubicacion['vereda']}" if analisis.ubicacion.get("vereda") else "")
    datos = [("Tipo / operación", f"{inm['tipo']} · {inm['operacion']}"), ("Estado", inm["estado_publicacion"]),
             ("Número predial", inm.get("numero_predial")), ("Ubicación", ubic or None),
             ("Área de terreno", f"{num(inm.get('area_terreno'), 2)} m²" if inm.get("area_terreno") else None),
             ("Área construida", f"{num(inm.get('area_construida'), 2)} m²" if inm.get("area_construida") else None),
             ("Propietario", inm.get("propietario")), ("Precio publicado", cop(inm["precio"]) if inm.get("precio") else None),
             ("Avalúo registrado", cop(inm["avaluo"]) if inm.get("avaluo") else None), ("Notas internas", inm.get("notas_internas"))]
    h += [Paragraph("1. Inmueble evaluado", ESTILOS["h2"]), tabla_datos([(k, x) for k, x in datos if x not in (None, "")])]

    # croquis con comparables numerados por su N.º
    extras = [(c["x"], c["y"], str(c["id"])) for c in vinculos if c.get("x") is not None and c["incluir"]]
    h.append(KeepTogether([Paragraph("2. Localización de los comparables", ESTILOS["h2"]),
                           croquis(conn, ANCHO, 82 * mm, analisis.geom if analisis else None,
                                   (inm["x"], inm["y"]) if inm.get("x") is not None else None, extras, VIOLETA),
                           Paragraph("Punto rojo: inmueble evaluado. Círculos violeta: comparables usados (N.º de comparable). Croquis esquemático sobre la base catastral.", ESTILOS["pequeno"])]))

    # tabla de comparables
    unit = {d["id"]: d for d in v["detalle"]}
    cab = ["N.º", "Fecha", "Fuente / sector", "Dist. (m)", "Precio", f"Área {base_txt} (m²)", "$/m²", "Ajuste", "$/m² ajust.", "Uso"]
    filas = [[Paragraph(f"<b>{c}</b>", ESTILOS["celda"]) for c in cab]]
    for c in vinculos:
        d = unit[c["id"]]
        area = c["area_terreno"] if v["base"] == "terreno" else c["area_construida"]
        dist = base_dist(inm, c)
        filas.append([str(c["id"]), c.get("fecha") or "s/f", Paragraph(esc(" · ".join(x for x in (c.get("fuente"), c.get("sector")) if x)) or "—", ESTILOS["celda"]),
                      num(dist) if dist is not None else "—", num(c["precio"]), num(area, 1) if area else "—",
                      num(d["unitario"]) if d["unitario"] else "—", f"{c['ajuste_pct']:+.1f} %", num(d["ajustado"]) if d["ajustado"] else "—",
                      "Sí" if d["usado"] else (d["motivo"] or "No")])
    t = Table(filas, colWidths=[9 * mm, 17 * mm, 33 * mm, 13 * mm, 23 * mm, 17 * mm, 15 * mm, 14 * mm, 19 * mm, 14 * mm], repeatRows=1)
    t.setStyle(TableStyle([("FONTSIZE", (0, 0), (-1, -1), 7.5), ("FONTNAME", (0, 1), (-1, -1), "Helvetica"), ("BACKGROUND", (0, 0), (-1, 0), base.GRIS_CLARO),
                           ("ALIGN", (3, 1), (-1, -1), "RIGHT"), ("VALIGN", (0, 0), (-1, -1), "MIDDLE"), ("GRID", (0, 0), (-1, -1), 0.25, colors.HexColor("#d1d5db")),
                           ("TOPPADDING", (0, 0), (-1, -1), 2), ("BOTTOMPADDING", (0, 0), (-1, -1), 2)]))
    h += [Paragraph("3. Comparables y homologación", ESTILOS["h2"]), t,
          Paragraph("Valor unitario = precio / área; valor ajustado = unitario × (1 + ajuste %). Los comparables excluidos no entran al cálculo.", ESTILOS["pequeno"])]

    # resultados
    res = [("Comparables usados", str(v["n"])), (f"Promedio ($/m² de {base_txt})", num(v["media"]) if v["media"] else None),
           ("Mediana ($/m²)", num(v["mediana"]) if v["mediana"] else None), ("Desviación estándar ($/m²)", num(v["desviacion"]) if v["desviacion"] else None),
           ("Coeficiente de variación", f"{num(v['cv_pct'], 2)} % (referencia: hasta {num(v['umbral_cv_pct'], 1)} %)" if v["cv_pct"] is not None else None),
           (f"Área de {base_txt} del inmueble", f"{num(v['area_sujeto'], 2)} m²" if v["area_sujeto"] else None)]
    h += [Paragraph("4. Resultado", ESTILOS["h2"]), tabla_datos([(k, x) for k, x in res if x])]
    if v["valor_estimado"]:
        cuadro = [[Paragraph("<b>Valor estimado</b>", ESTILOS["texto"]), Paragraph(f"<b>{cop(v['valor_estimado'])}</b>", ESTILOS["precio"])]]
        if v["rango_bajo"]:
            cuadro.append([Paragraph("Rango (± 1 desviación estándar)", ESTILOS["celda"]), Paragraph(f"{cop(v['rango_bajo'])} – {cop(v['rango_alto'])}", ESTILOS["texto"])])
        if v.get("dif_precio_pct") is not None:
            cuadro.append([Paragraph("Precio publicado frente al estimado", ESTILOS["celda"]), Paragraph(f"{cop(inm['precio'])} ({v['dif_precio_pct']:+.1f} %)", ESTILOS["texto"])])
        if v.get("dif_avaluo_pct") is not None:
            cuadro.append([Paragraph("Avalúo registrado frente al estimado", ESTILOS["celda"]), Paragraph(f"{cop(inm['avaluo'])} ({v['dif_avaluo_pct']:+.1f} %)", ESTILOS["texto"])])
        ct = Table(cuadro, colWidths=[62 * mm, ANCHO - 62 * mm])
        ct.setStyle(TableStyle([("BOX", (0, 0), (-1, -1), 1, VIOLETA), ("BACKGROUND", (0, 0), (-1, -1), colors.HexColor("#f5f3ff")), ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
                                ("TOPPADDING", (0, 0), (-1, -1), 5), ("BOTTOMPADDING", (0, 0), (-1, -1), 5)]))
        h += [Spacer(1, 6), ct]
    for a in v["avisos"]:
        h.append(Paragraph(f"Aviso: {esc(a)}", ESTILOS["pequeno"]))

    h += [Paragraph("5. Alcance", ESTILOS["h2"]),
          Paragraph("Estimación de apoyo obtenida por el método de comparación de mercado a partir de los datos registrados. "
                    "Los ajustes los define quien elabora el informe; el resultado debe validarse con criterio profesional y soportes antes de emplearse como avalúo.", ESTILOS["texto"]),
          Spacer(1, 22), Table([["_______________________________", "_______________________________"], ["Elaboró", "Revisó"]], colWidths=[ANCHO / 2] * 2,
                               style=TableStyle([("FONTSIZE", (0, 0), (-1, -1), 8.5), ("TEXTCOLOR", (0, 1), (-1, 1), colors.grey)]))]
    return base.construir(f"Valoración · inmueble N.º {inm['id']}", h, color=VIOLETA, confidencial="CONFIDENCIAL · uso interno")

def base_dist(inm: dict, c: dict):
    if None in (inm.get("x"), c.get("x")):
        return None
    return val.distancia(inm["x"], inm["y"], c["x"], c["y"])
