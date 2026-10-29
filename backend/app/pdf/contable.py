"""PDF de documentos contables: recibo de caja, paz y salvo y cuenta de cobro / liquidación al propietario. Solo administrador."""
from reportlab.lib import colors
from reportlab.lib.units import mm
from reportlab.platypus import Paragraph, Spacer, Table, TableStyle

from .. import config
from .base import ANCHO, ESTILOS, VERDE, cop, construir, esc, tabla_datos

def _empresa() -> str:
    return f"{config.EMPRESA_NOMBRE or 'Inmobiliaria'}{(' · NIT ' + config.EMPRESA_NIT) if config.EMPRESA_NIT else ''}"

def _tabla(cab: list[str], filas: list[list], anchos: list[float], derecha: tuple[int, ...] = ()) -> Table:
    data = [[Paragraph(f"<b>{esc(x)}</b>", ESTILOS["celda"]) for x in cab]] + [[Paragraph(esc(x), ESTILOS["celda"]) for x in f] for f in filas]
    t = Table(data, colWidths=anchos, repeatRows=1)
    est = [("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#f3f4f6")), ("LINEBELOW", (0, 0), (-1, -1), 0.25, colors.HexColor("#e5e7eb")),
           ("VALIGN", (0, 0), (-1, -1), "TOP"), ("TOPPADDING", (0, 0), (-1, -1), 3), ("BOTTOMPADDING", (0, 0), (-1, -1), 3)]
    est += [("ALIGN", (i, 0), (i, -1), "RIGHT") for i in derecha]
    t.setStyle(TableStyle(est))
    return t

# ---------------------------------------------------------------- recibo de caja
def recibo_pdf(r: dict, persona: dict | None) -> bytes:
    h = [Paragraph(f"Recibo de caja N.º {esc(r['numero_completo'])}", ESTILOS["h1"]), Paragraph(esc(_empresa()), ESTILOS["pequeno"]), Spacer(1, 6)]
    if r["estado"] == "anulado":
        h.append(Paragraph("<b>RECIBO ANULADO</b>", ESTILOS["h2"]))
    h.append(tabla_datos([("Fecha", r["fecha"]), ("Recibimos de", persona["nombre"] if persona else None),
                          ("Documento", f"{persona['documento_tipo']} {persona['documento']}" if persona else None),
                          ("Valor", cop(r["valor"])), ("Medio de pago", r["medio"]), ("Referencia", r["referencia"]), ("Concepto", r["nota"])]))
    if r["aplicaciones"]:
        h += [Paragraph("Aplicación del pago", ESTILOS["h2"]),
              _tabla(["Periodo", "Concepto", "Valor aplicado"], [[a["periodo"], a["concepto"], cop(a["valor"])] for a in r["aplicaciones"]], [40 * mm, 60 * mm, ANCHO - 100 * mm], (2,))]
    if r["sin_aplicar"] > 0:
        h.append(Paragraph(f"Saldo a favor sin aplicar: <b>{cop(r['sin_aplicar'])}</b>", ESTILOS["texto"]))
    h += [Spacer(1, 30), Paragraph("_______________________________<br/>Firma y sello de quien recibe", ESTILOS["pequeno"])]
    return construir(f"Recibo de caja {r['numero_completo']}", h, VERDE, "Documento interno")

# ---------------------------------------------------------------- paz y salvo
def paz_y_salvo_pdf(ps: dict, k: dict, arrendatario: dict, inm: dict, ultimo_pago: str | None) -> bytes:
    h = [Paragraph(f"Paz y salvo N.º {esc(ps['numero_completo'])}", ESTILOS["h1"]), Paragraph(esc(_empresa()), ESTILOS["pequeno"]), Spacer(1, 8),
         Paragraph(f"Se hace constar que <b>{esc(arrendatario['nombre'])}</b> ({esc(arrendatario['documento_tipo'])} {esc(arrendatario['documento'])}), arrendatario del inmueble "
                   f"N.º {inm['id']}{(' (número predial ' + esc(inm['numero_predial']) + ')') if inm.get('numero_predial') else ''}, se encuentra a <b>paz y salvo</b> por concepto de canon "
                   f"de arrendamiento y demás cobros del contrato a la fecha {esc(ps['fecha'])}.", ESTILOS["texto"]), Spacer(1, 8),
         tabla_datos([("Contrato", f"N.º {k['id']} · {k['fecha_inicio']} a {k['fecha_fin']}"), ("Estado del contrato", k["estado"]), ("Último pago registrado", ultimo_pago), ("Observaciones", ps.get("nota"))]),
         Spacer(1, 8), Paragraph("Este paz y salvo se refiere únicamente a las obligaciones registradas en el sistema de la inmobiliaria a la fecha indicada; no cubre daños ni servicios públicos pendientes de facturación.", ESTILOS["pequeno"]),
         Spacer(1, 30), Paragraph("_______________________________<br/>Firma autorizada", ESTILOS["pequeno"])]
    return construir(f"Paz y salvo {ps['numero_completo']}", h, VERDE, "Documento interno")

# ---------------------------------------------------------------- cuenta del propietario
def liquidacion_pdf(liq: dict, propietario: dict) -> bytes:
    d = liq["detalle"]
    h = [Paragraph(f"Cuenta del propietario · liquidación N.º {esc(liq['numero_completo'])}", ESTILOS["h1"]), Paragraph(esc(_empresa()), ESTILOS["pequeno"]), Spacer(1, 6),
         tabla_datos([("Propietario", propietario["nombre"]), ("Documento", f"{propietario['documento_tipo']} {propietario['documento']}"), ("Periodo", liq["periodo"]),
                      ("Estado", liq["estado"] + (f" (girada el {liq['fecha_giro']})" if liq.get("fecha_giro") else ""))]),
         Paragraph("Resumen", ESTILOS["h2"])]
    filas = [["Cánones recibidos", cop(liq["canones_recibidos"])], ["(−) Comisión de administración", cop(liq["comision"])], ["(−) IVA de la comisión", cop(liq["iva_comision"])],
             ["(−) Administración (propiedad horizontal)", cop(liq["administracion"])], ["(−) Impuesto predial", cop(liq["predial"])], ["(−) Reparaciones y mantenimiento", cop(liq["reparaciones"])],
             ["(−) Otros gastos a cargo del propietario", cop(liq["otros"])]]
    t = _tabla(["Concepto", "Valor"], filas + [["SALDO A GIRAR" if liq["saldo_a_girar"] >= 0 else "SALDO A FAVOR DE LA INMOBILIARIA", cop(liq["saldo_a_girar"])]], [ANCHO - 45 * mm, 45 * mm], (1,))
    t.setStyle(TableStyle([("FONTNAME", (0, -1), (-1, -1), "Helvetica-Bold"), ("LINEABOVE", (0, -1), (-1, -1), 0.8, VERDE)]))
    h.append(t)
    for inm in d.get("inmuebles", []):
        h.append(Paragraph(f"Inmueble N.º {inm['inmueble_id']}{(' · ' + esc(inm['numero_predial'])) if inm.get('numero_predial') else ''}", ESTILOS["h2"]))
        if inm["recaudos"]:
            h.append(_tabla(["Recibo", "Fecha", "Periodo", "Valor"], [[r["recibo"], r["fecha"], r["periodo"], cop(r["valor"])] for r in inm["recaudos"]], [35 * mm, 30 * mm, 30 * mm, ANCHO - 95 * mm], (3,)))
        else:
            h.append(Paragraph("Sin cánones recibidos en el periodo.", ESTILOS["pequeno"]))
        if inm["gastos"]:
            h += [Spacer(1, 4), _tabla(["Fecha", "Gasto", "Categoría", "Valor"], [[g["fecha"], g["descripcion"], g["categoria"], cop(g["valor"])] for g in inm["gastos"]], [25 * mm, ANCHO - 90 * mm, 35 * mm, 30 * mm], (3,))]
    h += [Spacer(1, 10), Paragraph("Documento de cuenta; no es factura electrónica. La comisión y el IVA se facturan por separado. Valores en pesos colombianos (COP).", ESTILOS["pequeno"])]
    return construir(f"Liquidación {liq['numero_completo']} · {liq['periodo']}", h, VERDE, "Confidencial: datos del propietario")
