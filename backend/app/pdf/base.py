"""Piezas comunes de los PDF: estilos, formatos es-CO, plantilla de página y descarga segura de fotos."""
import ipaddress
import socket
from datetime import datetime
from functools import lru_cache
from io import BytesIO
from urllib.parse import urlparse
from urllib.request import Request, urlopen

from reportlab.lib import colors
from reportlab.lib.enums import TA_LEFT
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import ParagraphStyle, getSampleStyleSheet
from reportlab.lib.units import mm
from reportlab.platypus import BaseDocTemplate, Frame, PageTemplate, Paragraph, Table, TableStyle

VERDE = colors.HexColor("#065f46")
VIOLETA = colors.HexColor("#6d28d9")
GRIS = colors.HexColor("#6b7280")
GRIS_CLARO = colors.HexColor("#f3f4f6")
MARGEN = 18 * mm
ANCHO = A4[0] - 2 * MARGEN

_base = getSampleStyleSheet()
ESTILOS = {
    "texto": ParagraphStyle("texto", parent=_base["Normal"], fontName="Helvetica", fontSize=9.5, leading=13, alignment=TA_LEFT),
    "pequeno": ParagraphStyle("pequeno", parent=_base["Normal"], fontName="Helvetica", fontSize=7.5, leading=10, textColor=GRIS),
    "h1": ParagraphStyle("h1", parent=_base["Heading1"], fontName="Helvetica-Bold", fontSize=18, leading=22, spaceAfter=2, textColor=colors.HexColor("#111827")),
    "h2": ParagraphStyle("h2", parent=_base["Heading2"], fontName="Helvetica-Bold", fontSize=11, leading=14, spaceBefore=10, spaceAfter=4, textColor=VERDE),
    "precio": ParagraphStyle("precio", parent=_base["Normal"], fontName="Helvetica-Bold", fontSize=20, leading=24, textColor=VERDE),
    "celda": ParagraphStyle("celda", parent=_base["Normal"], fontName="Helvetica", fontSize=8.5, leading=10.5),
    "celda_b": ParagraphStyle("celda_b", parent=_base["Normal"], fontName="Helvetica-Bold", fontSize=8.5, leading=10.5),
}

def num(n, dec=0) -> str:
    if n is None:
        return "—"
    s = f"{n:,.{dec}f}"
    return s.replace(",", "§").replace(".", ",").replace("§", ".")

def cop(n) -> str:
    return "—" if n is None else f"$ {num(n)}"

def esc(s) -> str:
    """Escapa texto del usuario para Paragraph (que interpreta marcas tipo HTML)."""
    return "" if s is None else str(s).replace("&", "&amp;").replace("<", "&lt;").replace(">", "&gt;")

def tabla_datos(filas: list[tuple[str, str]], ancho_etiqueta: float = 38 * mm, ancho_total: float = ANCHO) -> Table:
    data = [[Paragraph(esc(k), ESTILOS["celda_b"]), Paragraph(esc(v) if v not in (None, "") else "—", ESTILOS["celda"])] for k, v in filas]
    t = Table(data, colWidths=[ancho_etiqueta, ancho_total - ancho_etiqueta])
    t.setStyle(TableStyle([
        ("VALIGN", (0, 0), (-1, -1), "TOP"), ("LINEBELOW", (0, 0), (-1, -1), 0.25, colors.HexColor("#e5e7eb")),
        ("TOPPADDING", (0, 0), (-1, -1), 2.5), ("BOTTOMPADDING", (0, 0), (-1, -1), 2.5), ("LEFTPADDING", (0, 0), (-1, -1), 2),
    ]))
    return t

def construir(titulo_pie: str, historia: list, color=VERDE, confidencial: str | None = None) -> bytes:
    """Arma el PDF A4 con encabezado y pie. No deja metadatos de la herramienta que lo generó."""
    buf = BytesIO()
    ahora = datetime.now().strftime("%d/%m/%Y %H:%M")

    def pagina(canvas, doc):
        canvas.saveState()
        canvas.setFillColor(color)
        canvas.rect(0, A4[1] - 14 * mm, A4[0], 14 * mm, stroke=0, fill=1)
        canvas.setFillColor(colors.white)
        canvas.setFont("Helvetica-Bold", 10)
        canvas.drawString(MARGEN, A4[1] - 9 * mm, "Geovisor inmobiliario · Acacías (Meta)")
        canvas.setFont("Helvetica", 9)
        canvas.drawRightString(A4[0] - MARGEN, A4[1] - 9 * mm, titulo_pie)
        canvas.setFillColor(GRIS)
        canvas.setFont("Helvetica", 7.5)
        pie = f"Generado el {ahora}" + (f" · {confidencial}" if confidencial else "")
        canvas.drawString(MARGEN, 10 * mm, pie)
        canvas.drawRightString(A4[0] - MARGEN, 10 * mm, f"Página {doc.page}")
        canvas.restoreState()

    doc = BaseDocTemplate(buf, pagesize=A4, leftMargin=MARGEN, rightMargin=MARGEN, topMargin=20 * mm, bottomMargin=16 * mm,
                          title=titulo_pie, author="Geovisor inmobiliario Acacías", creator="Geovisor inmobiliario Acacías", producer="")
    doc.addPageTemplates([PageTemplate(id="p", frames=[Frame(MARGEN, 16 * mm, ANCHO, A4[1] - 36 * mm, id="f", leftPadding=0, rightPadding=0, topPadding=0, bottomPadding=0)], onPage=pagina)])
    doc.build(historia)
    return buf.getvalue()

# ---------------------------------------------------------------- fotos
MAX_FOTO_BYTES = 3_000_000

def _host_publico(url: str) -> bool:
    """Evita que una URL de foto apunte a la red interna (SSRF): solo http(s) hacia IPs públicas."""
    p = urlparse(url)
    if p.scheme not in ("http", "https") or not p.hostname:
        return False
    try:
        for info in socket.getaddrinfo(p.hostname, p.port or (443 if p.scheme == "https" else 80)):
            ip = ipaddress.ip_address(info[4][0])
            if ip.is_private or ip.is_loopback or ip.is_link_local or ip.is_reserved or ip.is_multicast:
                return False
    except (socket.gaierror, ValueError):
        return False
    return True

@lru_cache(maxsize=64)
def descargar_foto(url: str, permitir_privadas: bool = False) -> bytes | None:
    """Devuelve los bytes de una imagen JPEG/PNG o None si no se puede (no se rompe el PDF por una foto)."""
    try:
        if url.startswith("/fotos/"):   # imagen local servida por la propia API (sin salir a la red)
            from pathlib import Path
            from .. import config
            ruta = config.FOTOS_DIR / Path(url).name
            return ruta.read_bytes() if ruta.is_file() and ruta.stat().st_size <= MAX_FOTO_BYTES else None
        if not permitir_privadas and not _host_publico(url):
            return None
        with urlopen(Request(url, headers={"User-Agent": "geovisor-ficha/1.0"}), timeout=5) as r:
            if not (r.headers.get("Content-Type", "").lower().startswith(("image/jpeg", "image/png"))):
                return None
            datos = r.read(MAX_FOTO_BYTES + 1)
        if len(datos) > MAX_FOTO_BYTES:
            return None
        from PIL import Image
        Image.open(BytesIO(datos)).verify()
        return datos
    except Exception:
        return None
