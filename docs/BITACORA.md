# Bitácora

## 2026-10-29 — Fase 1: Inventario
- Creada la carpeta `Geovisor_inmobiliario` con la estructura sugerida (todo el trabajo queda dentro).
- Proyecto QGIS abierto en pantalla: `D:/Contrato 500 Lincecias/Capas POT.qgz` (75 capas). Copia de trabajo: `data/raw/Capas_POT_copia.qgz` (original intacto; sus capas siguen apuntando por ruta absoluta a los originales, ya que las capas vectoriales se copiaron aparte).
- `scripts/fase1_inventario.py` copia las capas vectoriales referenciadas a `data/raw/{catastro,pot,pomca}` (47 fuentes únicas, ~97 MB) y genera `docs/inventario_capas.md`.
- Google Hybrid: solo se registra la URL XYZ (sin descarga de teselas).

## 2026-10-29 — Fase 2: Limpieza y consolidación
- Decisión del usuario: consolidar TODAS las capas (47 fuentes únicas → 47 capas).
- `scripts/fase2_consolidar.py`: reproyecta a EPSG:9377, `makevalid`, geometrías MULTI, campos en minúsculas sin tildes/espacios, índice espacial por capa e índice en `predios.codigo`.
- Salida: `data/geovisor.gpkg` (~106 MB) y `docs/reporte_fase2.md`. `data/raw` intacto.
- Geometrías inválidas: 34 → 0 (3 en `pomca_acacias_pajure`, 31 en `pomca_guayuriba`). Sin pérdida de entidades.
- Hallazgo: `predios` tiene `codigo` nulo en 10.399 registros (rurales); su número predial está en `codigo_2`. Número predial efectivo = `COALESCE(codigo, codigo_2)`. Además 80 predios con `codigo_municipio_2` ≠ 50006 (50150, 50318, 50680, 25339).

## 2026-10-29 — Fase 3: Base de datos
- Decisiones del usuario: predios con `COALESCE(codigo, codigo_2)` excluyendo los 80 de otros municipios (31.261 de 31.341 quedan); `propietario` es campo privado de llenado manual.
- `docker-compose.yml` (PostGIS 16-3.4 + Martin), `.env` (contraseñas generadas, fuera de control de versiones), `.env.example`, `.gitignore`, `martin/martin.yaml`, `db/init.sh` (corre 01 y 02 al crear el volumen).
- `db/01_esquema.sql`: esquemas catastro, pot, ambiental, inmobiliario, vista_publica; `catastro.predios` (solo columnas necesarias) e `inmobiliario.inmuebles`; índices GIST y por numero_predial; trigger de fechas.
- `db/02_roles_rls.sql`: roles `publico` y `admin` (+ logins `api_publico`, `api_admin`, `martin_ro`), GRANT por columna, RLS (público = solo `publicado`) y vistas `vista_publica.inmuebles/predios` con `security_invoker`.
- `db/03_inmuebles_prueba.sql` + `scripts/cargar_datos.py`: carga GPKG → PostGIS, 3 inmuebles ficticios (2 publicados, 1 borrador) y pruebas automáticas de permisos.
- Detalle: `numero_predial` NO es único en la base (701 códigos repetidos, p. ej. PH y un código placeholder `500060000000000000000000000000`×7); por eso no hay FK real ni PK sobre él.
- NO VERIFICADO: este PC no tiene Docker ni PostgreSQL, así que los SQL y la carga no se han ejecutado. Solo se comprobó que los scripts Python compilan.

## 2026-10-29 — Fase 3 (rehecha): SQLite local, sin Docker
- Cambio pedido por el usuario: sin PostgreSQL/Docker. Lo escrito para Postgres (docker-compose, Martin, SQL, `cargar_datos.py`) se movió sin borrar a `_postgres_descartado/` (el usuario decide si lo elimina).
- Sin roles ni RLS en SQLite → la separación público/privado se hace por **archivos**:
  - `data/db/publico.gpkg` (GeoPackage = SQLite, abre en QGIS): `predios` (31.261, solo numero_predial/manzana/vereda/municipio/geom), 46 capas POT/POMCA, `inmuebles_publicos` (solo publicados, sin campos sensibles), `catalogo_capas`. El visor público lo abre con `?mode=ro`.
  - `data/db/admin.sqlite`: tabla `inmuebles` con `propietario`, `avaluo`, `notas_internas` y CHECKs/triggers reales. Solo la abre el backend en modo admin.
  - `sincronizar_publico()` (scripts/db_comun.py, sqlite3 puro) copia admin → público al publicar/editar.
- Inmuebles guardados como punto x,y (EPSG:9377) en tablas planas: los triggers de rtree del GeoPackage exigen funciones espaciales que sqlite3 puro no tiene.
- Martin reemplazado por teselas MVT estáticas (`scripts/generar_teselas.py` → `data/tiles/<capa>/{z}/{x}/{y}.pbf`, 91 MB, predios z12–16, resto z8–15; `capas.json`). Inmuebles van por la API como GeoJSON.
- Verificado (ejecutado): 7 comprobaciones OK en `scripts/crear_db.py`; CHECKs rechazan tipo/estado inválidos; trigger fija fecha_publicacion.
- Pendiente de decidir en Fase 4: servir las teselas desde FastAPI (StaticFiles).

## 2026-10-29 — Fase 4: Visor básico (público)
- Descargas autorizadas por el usuario: venv de Python (`backend/.venv`, fastapi/uvicorn/sqlalchemy/geoalchemy2) y Node 22 portable (`tools/node`, desde nodejs.org) + dependencias npm.
- Backend (`backend/app`): `config`, `db` (publico.gpkg en `mode=ro`), `geo` (blob GeoPackage→shapely, 9377→4326), `models/tablas`, `schemas/`, `routers/{inmuebles,predios,capas}`, teselas estáticas en `/tiles` (204 si la tesela está vacía), CORS al puerto de Vite. Endpoints: `GET /inmuebles` (filtros tipo/operacion/precio/área, GeoJSON), `GET /inmuebles/{id}`, `GET /predios/{numero_predial}` (geometría, uso de suelo POT, POMCA, barrio/vereda), `GET /capas`, `/docs`.
- Desviación del stack: no se usó GeoAlchemy2 (SQLite/GeoPackage); SQLAlchemy Core + shapely.
- Cruces de predio con POT/POMCA por R-tree del GeoPackage + shapely; se omiten capas urbanas o rurales según la clasificación dominante (las planchas se solapan en el borde).
- Frontend (`frontend/src`): `MapView`, `LayerControl` (leyenda), `FilterPanel`, `PropertyPopup`, `PredioPanel`, `SearchBar`; TanStack Query; Tailwind 4; responsive (menú lateral en móvil, panel inferior).
- Mapa base: Esri World Imagery (maxzoom 18) y OSM.
- Trampa: MapLibre 6 + Vite en dev → el worker se sirve desde `public/maplibre` (`scripts/copiar-worker.mjs`, `setWorkerUrl` en `main.tsx`).
- Verificado en el navegador integrado (escritorio): mapa + predios + inmuebles; búsqueda por predial (zoom y ficha con SU/AAR1/ZU); filtro "Lote" → 1 inmueble; activar capa POT. NO confirmado: render del mapa en emulación móvil (el panel falló al capturar); sí se vio el menú móvil y el botón de filtros.
- Pendiente: Docker no aplica; fases 5+ (login admin, panel de edición, comparables, PDF, WhatsApp).

## 2026-10-29 — Fase 5: Administrador (login + panel de edición)
- Alcance asumido: login de administrador y panel para crear/editar inmuebles con datos privados. Comparables, PDF y WhatsApp quedan para fases siguientes.
- Backend `backend/app/admin/`: `auth` (PBKDF2-SHA256 600k, token HMAC con expiración, límite 5 intentos/5 min por IP), `db` (admin.sqlite + `sincronizar_publico`), `schemas` (validación: tipo/operación/estado, URLs http(s), predial 5–30 dígitos), `router` (`/admin/login|me|inmuebles` CRUD, `PATCH …/estado`). Activo solo con `ADMIN_ENABLED=true`; si no, `/admin` responde 404 y CORS solo permite GET.
- Tablas nuevas en admin.sqlite: `admin_usuarios`, `auditoria` (guarda acción, usuario e id; nunca valores sensibles).
- Reglas: no se puede publicar sin ubicación; el predial debe existir en el catastro; si no se da lon/lat se usa el punto interior del predio.
- Scripts: `scripts/crear_admin.py` / `crear_admin.bat` (clave por teclado). `.env` ganó ADMIN_* (secreto aleatorio generado; no versionado).
- Frontend `frontend/src/admin/` (carga perezosa en `/admin`, el visor público no incluye ese código): Login, lista con filtros, formulario con sección «Privado», mapa con marcadores por estado, clic para ubicar/tomar predial.
- Verificado: 27 comprobaciones de API sobre copias temporales (401/429/422, CRUD, sincronización, la API pública nunca devuelve propietario/avalúo/notas, auditoría sin datos sensibles) y flujo en el navegador (clave mala rechazada, login, lista con datos privados, clic en mapa llena predial y coordenadas, crear+publicar → aparece en `/inmuebles` sin campos privados). Pruebas con copias de las bases y un usuario de prueba; las bases reales no se tocaron y NO existe aún ningún administrador real.
- Pendiente: el usuario debe crear su administrador con `crear_admin.bat`. Sin HTTPS el token viaja en claro: en producción usar HTTPS.

## 2026-10-29 — Fase 6: Comparables y valoración
- Alcance asumido: comparables (datos de mercado solo para el admin) y valoración por método de comparación. PDF y WhatsApp quedan para la Fase 7.
- BD (`db/01_esquema.sql`, migrada en admin.sqlite sin tocar datos): `comparables` (CHECKs, ≥1 área) e `inmueble_comparables` (ajuste_pct −90..300, incluir, nota; ON DELETE CASCADE).
- Backend: `admin/valoracion.py` (funciones puras: unitarios, promedio, mediana, desviación muestral, CV, rango, avisos), `admin/router_comparables.py` (CRUD, vincular/desvincular, sugeridos por distancia/tipo/fecha, `/valoracion`), auditoría de cada acción.
- Frontend: pestañas Inmuebles/Comparables, `ComparableForm`, `ValoracionPanel` (tarjeta de valor, tabla editable de ajustes, sugeridos), comparables en violeta en el mapa (vinculados resaltados).
- Supuestos míos, visibles en la interfaz y editables: las OFERTAS se vinculan con −5 % de ajuste por negociación; umbral CV 7,5 % (referencia Res. IGAC 620/2008, solo indicador, no bloquea); mínimo recomendado 3 comparables; el valor de casa/local/apartamento usa solo el área construida (no suma el terreno).
- Verificado: 26 comprobaciones (cifras calculadas a mano: unitarios 500k/550k/525k/475k → media 512.500, desv. 32.274,86, CV 6,30 %, valor 153.750.000 sobre 300 m²; ajustes y exclusiones; 401/404/422; cascada; publico.gpkg sin tablas de comparables) y flujo en el navegador (buscar y vincular sugeridos, excluir, editar ajuste, volver al inmueble desde «Crear comparable»). Todo sobre copias temporales: las bases reales solo recibieron las 2 tablas nuevas, vacías.

## 2026-10-29 — Fase 7: Fichas PDF y WhatsApp
- Alcance: ficha PDF pública, informe PDF confidencial de valoración (admin) y botón de WhatsApp con enlace directo al inmueble. Sin descargas nuevas: reportlab ya viene con el Python de QGIS.
- Refactor: la lógica de cruces del predio pasó de `routers/predios.py` a `app/predio_servicio.py` (la usan la API y los PDF); resultados idénticos a los de antes.
- `backend/app/pdf/`: `base` (estilos, formato es-CO, encabezado/pie, descarga segura de fotos), `croquis` (dibujo vectorial del predio y su entorno con el R-tree del GeoPackage, recortado al marco, con escala y norte; sin teselas externas, así no hay problema de licencia de mapas), `ficha`, `informe`.
- Metadatos de los PDF: autor «Geovisor inmobiliario Acacías», sin producer ni referencia a la herramienta.
- Endpoints: `GET /inmuebles/{id}/ficha.pdf` (público, 404 si no está publicado) y `GET /admin/inmuebles/{id}/informe.pdf` (token; queda en auditoría como `informe_pdf`).
- Seguridad: texto del usuario escapado en los PDF; fotos con defensa SSRF (esquema, IP pública, tipo, tamaño); la ficha pública se arma solo con la fila de `inmuebles_publicos`.
- Frontend: botones «Consultar por WhatsApp», «Ficha PDF» y «Copiar enlace» en la ficha; enlace `/?inmueble=ID` abre la ficha y centra el mapa; botón «Informe PDF» en la valoración (descarga con el token).
- Verificado (ejecutado): 17 comprobaciones de PDF (contenido, que la ficha no contenga propietario/avalúo/notas/comparables, metadatos, 404/401, SSRF, foto embebida, escape) + revisión visual de los PDF + en el navegador: enlace directo abre la ficha, el enlace de WhatsApp sale bien armado, la descarga del informe se dispara con el nombre correcto.
- Corregido durante las pruebas: los polígonos del croquis se salían del marco y tapaban texto (ahora se recortan).
- Pendiente del usuario: poner su número en `VITE_WHATSAPP_NUMERO` (frontend/.env.local) o en el campo Contacto de cada inmueble. Los datos de prueba usan un número ficticio.

## 2026-10-29 — Estilos por colores, etiquetas y rediseño de la interfaz
- Pedido del usuario: clasificar por colores las capas que lo ameriten, rotularlas con armonía (p. ej. barrios sin relleno, línea amarilla y nombre al centro; UPR/UPZ cada una de un color; usos del suelo con colores por categoría, urbano rojo / expansión amarillo / suburbano azul / rural verde) y embellecer la interfaz.
- Descarga autorizada: fuentes de etiquetas (glyphs) Noto Sans Regular y Medium, rangos 0-255, 256-511 y 8192-8447 (6 archivos, ~540 KB) en `frontend/public/fonts`. La fuente indicada (fonts.openmaptiles.org) devolvía páginas HTML en lugar de glyphs; se usó `protomaps.github.io/basemaps-assets` y Medium en lugar de Bold.
- `frontend/src/lib/estilos.ts`: registro de estilo por capa (47 capas con título legible, color, relleno, línea, guiones y etiqueta). Categorizadas por colores: clasificación del suelo, UPR/UPZ, usos urbano y rural, densidades, tratamientos, amenazas, espacio público, equipamientos, sistema vial, red vial rural, hidrografía, límites, vías por orden, POMCA (ambas), acueducto, alcantarillados, etc. Barrios: sin relleno, línea amarilla y nombre al centro desde z13,2.
- Validado contra los datos reales: todos los campos y valores que usa cada estilo existen en `publico.gpkg` (único caso con color de reserva intencional: «Zona de protección especial – parte alta canal Caño Conejo»).
- Interfaz: encabezado con degradado y logotipo, tarjetas, interruptores, «vistas rápidas» (Clasificación del suelo, Barrios, Usos urbanos, Usos rurales, UPR/UPZ, Ambiental), buscador de capas, grupos plegables con subgrupos del POT (Urbano / Rural / General), muestra de color por capa, leyenda flotante con las categorías de las capas activas, panel de predio y controles del mapa rediseñados.
- Decisiones: las etiquetas de la clasificación del suelo se quitaron (se repetían en cada tesela); los polígonos sin relleno se apilan arriba para que sus líneas no queden tapadas.
- Verificado en el navegador: clasificación del suelo con sus 5 colores y leyenda, usos urbanos (AAD3 azul con etiqueta), barrio «POPULAR» rotulado con línea amarilla, UPR/UPZ con 10 colores. No revisado visualmente: vista móvil del nuevo diseño ni todas las capas una por una.

## 2026-10-29 — Corrección: capas que parpadeaban o desaparecían al hacer zoom
- Síntoma: el suelo de expansión urbana (amarillo) se quitaba y volvía a aparecer al acercar o alejar.
- Causa: la capa iba en teselas vectoriales generadas con GDAL; en el zoom 8 y menores faltaban y, además, las teselas de los zooms 9 y 10 de esa zona no se pueden decodificar (error de lectura), de modo que la capa dependía de teselas que tardaban, fallaban o no existían.
- Solución: las capas pequeñas (hasta 100.000 vértices, 41 de las 46 sin contar predios) ahora se sirven como **GeoJSON completo** (`data/geojson/<capa>.geojson`, EPSG:4326, comprimido con gzip: la clasificación del suelo pesa ~170 KB). MapLibre las trocea en el navegador, así no hay teselas que cargar ni fallar. Siguen en teselas: predios, POMCA (2), usos del suelo rural y protección hídrica.
- Cambios: `scripts/generar_teselas.py` decide el formato por número de vértices y escribe `formato` en `data/tiles/capas.json`; la API sirve `/geojson` (con GZip) y `/capas` devuelve `formato`, `tiles` o `geojson`; el visor usa fuente `geojson` o `vector` según la capa.
- Verificado (pestaña visible, consultando lo dibujado): el polígono SE está presente justo tras cada cambio de zoom y en reposo en barridos de zoom 6 a 19 subiendo y bajando, y en una animación continua 8↔16 (60 muestras, 0 ausencias).
- Pendiente: las 4 capas grandes que siguen en teselas pueden tener el mismo problema en algunas teselas (no verificado).

## 2026-10-29 — Inmuebles de demostración y búsqueda de ofertas por barrio
- Pedido: inventar precios e inmuebles en venta y arriendo, y poder elegir un barrio para que el mapa lleve allá y muestre sus ofertas.
- Datos: `scripts/sembrar_demo.py` crea 54 inmuebles ficticios (40 venta, 14 arriendo; 48 publicados, el resto borrador/vendido) sobre predios reales de 22 barrios y 9 veredas, con precios plausibles inventados (venta 38 M–1.505 M COP; arriendo 0,6–4,85 M/mes), propietarios y avalúos falsos, teléfonos «300 000 xxxx» y fotos de ejemplo. Marca `DEMO` en `notas_internas`; `--borrar` los quita. Respaldo previo: `data/db/respaldo_antes_demo.sqlite`.
- Fotos: `scripts/generar_fotos_demo.py` (15 imágenes) en `data/fotos`, servidas por la API en `/fotos`; el PDF las lee del disco; el panel de administración acepta rutas `/fotos/…`.
- Backend: `app/zonas.py` (barrio y vereda de cada punto con STRtree), `GET /zonas`, `GET /zonas/{tipo}/{nombre}`, filtros `barrio` y `vereda` en `/inmuebles`, y `barrio`/`vereda` en cada inmueble.
- Frontend: `ZonaSelector` (buscador con sugerencias sin distinguir tildes ni mayúsculas, Enter, flechas, barrios con más ofertas), `OfertasZona` (franja de tarjetas con filtro Venta/Arriendo y orden), contorno resaltado, popup con barrio y «/ mes» en arriendos, enlaces `?barrio=` y `?vereda=`.
- Verificado en el navegador: elegir «El Centro» lleva el mapa, resalta el barrio, deja 2 marcadores y 2 tarjetas; la tarjeta abre la ficha; buscar «alb» + Enter selecciona La Alborada; «Arriendo» filtra; el enlace `?barrio=popular` funciona. Vista móvil: la franja se ve bien, pero el mapa no se pintó en la emulación (limitación de la ventana de prueba).
- Limitación: los nombres de barrios vienen sin tildes en la fuente («ASOCIACION DE AMIGOS»).
