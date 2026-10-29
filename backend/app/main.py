from fastapi import FastAPI, Response
from fastapi.middleware.cors import CORSMiddleware
from fastapi.middleware.gzip import GZipMiddleware
from fastapi.staticfiles import StaticFiles
from starlette.exceptions import HTTPException as StarletteHTTPException

from .config import ADMIN_ENABLED, CORS_ORIGINS, FOTOS_DIR, GEOJSON_DIR, TILES_DIR
from .routers import capas, inmuebles, predios, zonas

app = FastAPI(
    title="Geovisor inmobiliario – Acacías (API pública)",
    description="Solo lectura. Expone únicamente datos públicos (publico.gpkg); nunca propietario, avalúo ni notas internas.",
    version="0.1.0",
)
app.add_middleware(GZipMiddleware, minimum_size=1024)   # los GeoJSON de capas bajan de ~1 MB a ~200 KB
app.add_middleware(CORSMiddleware, allow_origins=CORS_ORIGINS, allow_methods=["GET", "POST", "PUT", "PATCH", "DELETE"] if ADMIN_ENABLED else ["GET"], allow_headers=["*"])

class Teselas(StaticFiles):
    async def get_response(self, path, scope):
        try:
            r = await super().get_response(path, scope)
        except StarletteHTTPException as e:
            if e.status_code == 404 and path.endswith(".pbf"):
                return Response(status_code=204)  # tesela vacía: MapLibre la trata como sin datos, sin error en consola
            raise
        if path.endswith(".pbf"):
            r.headers["Content-Type"] = "application/x-protobuf"
            r.headers["Cache-Control"] = "public, max-age=3600"
        return r

app.include_router(inmuebles.router)
app.include_router(predios.router)
app.include_router(capas.router)
app.include_router(zonas.router)
if ADMIN_ENABLED:
    from .admin import router as admin_router
    from .admin import router_comparables
    app.include_router(admin_router.router)
    app.include_router(router_comparables.router)
if FOTOS_DIR.exists():
    app.mount("/fotos", StaticFiles(directory=FOTOS_DIR), name="fotos")
if GEOJSON_DIR.exists():
    app.mount("/geojson", StaticFiles(directory=GEOJSON_DIR), name="geojson")
if TILES_DIR.exists():
    app.mount("/tiles", Teselas(directory=TILES_DIR), name="tiles")

@app.get("/salud", tags=["sistema"])
def salud():
    return {"ok": True}
