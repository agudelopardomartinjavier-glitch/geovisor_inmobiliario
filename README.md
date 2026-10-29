# Geovisor inmobiliario – Acacías (Meta)

Visor público de inmuebles + capas de contexto (catastro, POT, POMCA). Sin Docker: SQLite/GeoPackage local.

## Estructura
- `data/raw/` copias de las capas originales · `data/geovisor.gpkg` consolidado (EPSG:9377)
- `data/db/publico.gpkg` base pública (solo lectura) · `data/db/admin.sqlite` base privada (Fase 5)
- `data/tiles/` vector tiles estáticas (MVT) · `backend/` API FastAPI · `frontend/` React + Vite + MapLibre
- `scripts/` carga y transformación · `docs/` inventario, reporte, bitácora · `tools/node` Node portable

## Ejecutar (modo desarrollo)
Doble clic en `iniciar_api.bat` (http://localhost:8000/docs) y en `iniciar_web.bat` (http://localhost:5173). O a mano:

    backend\.venv\Scripts\python.exe -m uvicorn app.main:app --app-dir backend --port 8000
    cd frontend && ..\tools\node\npm.cmd run dev

Si no tienes `tools/node`: instala Node 22 LTS y ejecuta `npm install` en `frontend/`; para el backend
`python -m venv backend/.venv --system-site-packages` y `backend/.venv/Scripts/pip install -r backend/requirements.txt`
(el Python de QGIS aporta pyproj/shapely/GDAL).

## Regenerar datos
    "C:\Program Files\QGIS 3.40.2\apps\Python312\python.exe" scripts\crear_db.py        # bases (conserva inmuebles reales)
    "C:\Program Files\QGIS 3.40.2\apps\Python312\python.exe" scripts\generar_teselas.py # teselas (opcional: nombres de capa)

## Mapa base
Esri World Imagery (satélite) y OSM, configurables en `frontend/src/lib/mapa.ts`. Google Hybrid NO se usa en el visor público
(sus términos no permiten teselas directas); sigue disponible solo en el proyecto QGIS interno.

## Administración (Fase 5)
1. Crear tu usuario (la clave se pide por teclado y se guarda con hash PBKDF2): doble clic en `crear_admin.bat`.
2. Abrir http://localhost:5173/admin (no hay enlace desde el visor público). Sesión de 12 h; 5 intentos fallidos por IP → bloqueo de 5 min.
3. Panel: lista con datos privados (propietario, avalúo, notas), crear/editar/eliminar, publicar/despublicar/marcar vendido, ubicar con clic en el mapa
   (si pulsas un predio se llena el número predial). Cada cambio re-sincroniza `publico.gpkg` y queda en la tabla `auditoria`.
4. En el servidor público definir `ADMIN_ENABLED=false` en `.env`: las rutas `/admin` no se montan.

## Comparables y valoración (Fase 6)
Solo administrador (pestaña «Comparables» y sección «Valoración por comparables» dentro de cada inmueble guardado). Nada de esto llega a `publico.gpkg`.
- Biblioteca de comparables (oferta o venta cerrada): precio, áreas, fecha, fuente, referencia, sector, ubicación en el mapa.
- Por inmueble: vincular comparables (a mano o «Buscar sugeridos» por radio y antigüedad), ajuste % por comparable, incluir/excluir.
- Cálculo: unitario = precio / área base (terreno para lote y finca; construida para casa, local y apartamento); ajustado = unitario × (1 + ajuste %);
  valor estimado = promedio ajustado × área del inmueble; rango ± 1 desviación estándar; coeficiente de variación con umbral de referencia 7,5 % (`CV_UMBRAL_PCT` en `backend/app/admin/valoracion.py`).

## Fichas PDF y WhatsApp (Fase 7)
- **Ficha pública** `GET /inmuebles/{id}/ficha.pdf`: datos públicos, foto, croquis catastral, uso del suelo POT y restricciones POMCA. Botón «Ficha PDF» en la ficha del inmueble.
- **Informe de valoración** (admin) `GET /admin/inmuebles/{id}/informe.pdf`: confidencial (propietario, avalúo, comparables, resultado). Botón «Informe PDF» en la valoración.
- **WhatsApp**: botón «Consultar por WhatsApp» con mensaje prellenado y enlace directo `/?inmueble=ID`. Usa el celular que aparezca en el campo «Contacto» del inmueble;
  si no hay, `VITE_WHATSAPP_NUMERO` (solo dígitos con indicativo, ej. `573001234567`); si tampoco, el botón no se muestra. `VITE_PUBLIC_URL` fija la URL pública de los enlaces.
- Las fotos se descargan para el PDF solo desde `http(s)` hacia IPs públicas, máx. 3 MB y JPEG/PNG (no se acepta `localhost`, redes privadas ni `file://`); si una foto falla, el PDF sale sin ella.

## Ofertas por barrio y datos de demostración
- **Visor:** tarjeta «Ofertas por barrio» (escribe «el centro», «alborada»… o toca un barrio sugerido): el mapa vuela al barrio, resalta su contorno,
  muestra solo sus ofertas y abre una franja inferior con las tarjetas (filtro Venta/Arriendo y orden por precio). Enlaces directos: `/?barrio=el%20centro`, `/?vereda=Dinamarca`.
- **API:** `GET /zonas` (barrios y veredas con n.º de ofertas), `GET /zonas/{barrio|vereda}/{nombre}` (contorno), `GET /inmuebles?barrio=…` / `?vereda=…`.
- **Inmuebles de demostración inventados** (precios y datos ficticios sobre predios reales; marcados «DEMO» en las notas internas):
  `python scripts\sembrar_demo.py` los crea (repetible) y `python scripts\sembrar_demo.py --borrar` los quita todos. Las 15 fotos de ejemplo salen de `scripts\generar_fotos_demo.py` (`/fotos`).

## Ampliación inmobiliaria — Fase 1: ficha ampliada, jurídico y semáforo
- **Ficha pública ampliada** (físicos, servicios, entorno, finca, medios, condiciones): se edita en el panel `/admin` (sección «Ficha, jurídico y semáforo») y se ve en el visor con «Ver ficha ampliada». `GET /inmuebles/{id}/ficha`.
- **Entorno automático**: distancias a vía principal, colegio, parque y casco urbano (y a drenaje/nacimiento en fincas) calculadas con las capas del POT al crear o mover el inmueble. Centros de salud: no hay capa, queda «sin dato».
- **Jurídico y soportes (privado)**: matrícula, escritura, gravámenes, tributos y soportes con fecha de vencimiento y alerta (`GET /admin/alertas/soportes`). Los soportes viven en `data/soportes/` (nunca como archivos estáticos) y solo se descargan con sesión.
- **Semáforo jurídico-ambiental**: verde/amarillo/rojo por cruce espacial + estado jurídico. El público solo ve color y resumen genérico. Reglas completas en [docs/SEMAFORO.md](docs/SEMAFORO.md).
- **Parámetros configurables** (tabla `parametros`, `GET/PUT /admin/parametros`): umbrales del semáforo, vigencia del certificado de tradición, tamaño máximo de soportes. Los marcados «por confirmar» deben validarse con un abogado/contador.

### Migraciones (versionadas y reversibles)
    backend\.venv\Scripts\python.exe scripts\migrar.py estado
    backend\.venv\Scripts\python.exe scripts\migrar.py subir            # aplica pendientes (antes copia admin.sqlite a data/db/respaldos/)
    backend\.venv\Scripts\python.exe scripts\migrar.py bajar --pasos 1  # revierte la última (también con copia previa)
Archivos en `db/migraciones/{admin,publico}/NNN_nombre.{up,down}.sql`. `scripts/crear_db.py` las aplica solo.

### Pruebas
    cd backend && .venv\Scripts\pip install -r requirements-dev.txt && .venv\Scripts\python -m pytest -q
Las pruebas de integración trabajan sobre copias de las bases (no tocan `data/db`).

### Privacidad del repositorio
`data/db/admin.sqlite`, `data/db/respaldos/` y `data/soportes/` están en `.gitignore`: contienen datos privados.

## Ampliación inmobiliaria — Fase 2: valoración
Todo privado (administrador); método y definiciones en [docs/VALORACION.md](docs/VALORACION.md).
- **Historial de precios y avalúos** por inmueble (tabla + gráfico de línea). Se registra solo, por triggers, al cambiar precio o avalúo; se pueden agregar datos históricos a mano.
- **Tiempo en el mercado y rebajas**: días publicado, rebajas, variación total y días desde el último cambio.
- **Valor por m² del sector** con **mapa de calor** (casilla en la esquina del mapa del panel; elige el tipo de inmueble).
- **Precio publicado vs. valor estimado por comparables** (dentro de «Valoración por comparables»; margen ± configurable).
- **Rentabilidad** = canon anual ÷ valor del inmueble; en ventas se puede fijar el canon esperado.
- Migración `003_historial_valoracion` (con copia previa de `admin.sqlite`); nuevos parámetros `valoracion.tolerancia_pct` y `mercado.*`.

## Ampliación inmobiliaria — Fase 3: contabilidad y administración
Todo privado (administrador). Reglas, fórmulas y parámetros en [docs/CONTABILIDAD.md](docs/CONTABILIDAD.md). En el panel `/admin`, botón **Contabilidad** (arriba a la derecha):
- **Comisiones y facturas**: porcentaje pactado, quién paga, IVA, retenciones, reparto asesor/referido; facturación con consecutivos, notas crédito y envío a la DIAN por un **adaptador** (sin atarse a un proveedor).
- **Contratos y pagos**: canon con incremento por IPC, depósito, codeudores, alertas de renovación y de canon sobre el 1 % (Ley 820), cobros mensuales, recibos de caja y paz y salvo (PDF).
- **Cartera**: mora, intereses y edad por tramos.
- **Gastos** por inmueble con soporte adjunto; **cuentas del propietario** (liquidación mensual con PDF); **reportes e impuestos** (resumen para el contador, comisiones, flujo de caja, ocupación y rentabilidad, todos exportables a Excel).
- **Configuración**: consecutivos y resolución DIAN, IPC anual y parámetros (IVA, retenciones, ICA, comisiones…). Los marcados «por confirmar» los debe validar un contador o abogado.
- Migración `004_contabilidad` (con copia previa de `admin.sqlite`). Variables nuevas en `.env`: `EMPRESA_NOMBRE`, `EMPRESA_NIT`, `DIAN_PROVEEDOR` (por defecto `ninguno`).
