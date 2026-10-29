"""Configuración desde variables de entorno (o el .env de la raíz del proyecto)."""
import os
from pathlib import Path

RAIZ = Path(__file__).resolve().parents[2]

def _cargar_env():
    f = RAIZ / ".env"
    if f.exists():
        for ln in f.read_text(encoding="utf8").splitlines():
            ln = ln.strip()
            if ln and not ln.startswith("#") and "=" in ln:
                k, v = ln.split("=", 1)
                os.environ.setdefault(k.strip(), v.strip())

_cargar_env()

# pyproj necesita proj.db; el de QGIS sirve si el entorno no lo trae
_qgis_proj = Path(r"C:\Program Files\QGIS 3.40.2\share\proj")
if _qgis_proj.exists():
    os.environ.setdefault("PROJ_DATA", str(_qgis_proj))

def _ruta(valor: str) -> Path:
    p = Path(valor)
    return p if p.is_absolute() else RAIZ / p

DB_PUBLICO = _ruta(os.environ.get("DB_PUBLICO", "data/db/publico.gpkg"))
TILES_DIR = _ruta(os.environ.get("TILES_DIR", "data/tiles"))
GEOJSON_DIR = _ruta(os.environ.get("GEOJSON_DIR", "data/geojson"))
FOTOS_DIR = _ruta(os.environ.get("FOTOS_DIR", "data/fotos"))
CORS_ORIGINS = [o.strip() for o in os.environ.get("CORS_ORIGINS", "http://localhost:5173").split(",") if o.strip()]
SRID_TRABAJO = 9377

# --- Administración (Fase 5): en la instancia pública poner ADMIN_ENABLED=false
ADMIN_ENABLED = os.environ.get("ADMIN_ENABLED", "false").lower() in ("1", "true", "yes")
ADMIN_DB = _ruta(os.environ.get("ADMIN_DB", "data/db/admin.sqlite"))
ADMIN_SECRET = os.environ.get("ADMIN_SECRET", "")
SOPORTES_DIR = _ruta(os.environ.get("SOPORTES_DIR", "data/soportes"))   # PRIVADO: jamás se monta como estático
ADMIN_TOKEN_HORAS =float(os.environ.get("ADMIN_TOKEN_HORAS", "12"))

# --- Contabilidad (Fase 3): datos del emisor de las facturas y proveedor de facturación electrónica
EMPRESA_NOMBRE = os.environ.get("EMPRESA_NOMBRE", "")
EMPRESA_NIT = os.environ.get("EMPRESA_NIT", "")
DIAN_PROVEEDOR = os.environ.get("DIAN_PROVEEDOR", "ninguno")   # ninguno | simulado | <adaptador registrado en app/contable/dian.py>
