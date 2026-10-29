# Cómo restaurar el proyecto desde un respaldo (`_respaldos/*.zip`)
1. Descomprimir el zip en una carpeta nueva.
2. No vienen en el respaldo (se regeneran): `backend/.venv`, `frontend/node_modules`, `tools/node`, `data/raw`, `data/tiles`, `data/geojson`.
   - Python: `python -m venv backend/.venv --system-site-packages` y `backend/.venv/Scripts/pip install -r backend/requirements.txt`
   - Node 22 portable en `tools/node` (o instalado) y `npm install` en `frontend/`
   - Teselas y GeoJSON: `"C:\Program Files\QGIS 3.40.2\apps\Python312\python.exe" scripts\generar_teselas.py`
3. Si falta `data/db/publico.gpkg`: `scripts\crear_db.py` (conserva `admin.sqlite`). Si falta `data/geovisor.gpkg`: `scripts\fase1_inventario.py` y `scripts\fase2_consolidar.py` (necesitan las capas originales de `D:\Contrato 500 Lincecias`).
4. Arrancar: `iniciar_api.bat` e `iniciar_web.bat`. Administrador: `crear_admin.bat`.
El respaldo incluye `.env` (secretos): no lo compartas.
