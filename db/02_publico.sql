-- 02_publico.sql — tablas no espaciales que se añaden a data/db/publico.gpkg (GeoPackage = SQLite).
-- Las capas espaciales (predios, POT, POMCA) las crea scripts/crear_db.py con GDAL.
-- inmuebles_publicos es una COPIA solo de los inmuebles 'publicado' y sin campos sensibles
-- (la rellena sincronizar_publico() en scripts/db_comun.py). Es tabla plana (x, y) para poder
-- escribirla con sqlite3 puro, sin las funciones espaciales que exigen los triggers del GeoPackage.
CREATE TABLE IF NOT EXISTS inmuebles_publicos (
    id                INTEGER PRIMARY KEY,
    numero_predial    TEXT,
    tipo              TEXT NOT NULL,
    operacion         TEXT NOT NULL,
    precio            INTEGER,
    area_terreno      REAL,
    area_construida   REAL,
    habitaciones      INTEGER,
    banos             INTEGER,
    descripcion       TEXT,
    fotos             TEXT NOT NULL DEFAULT '[]',
    contacto          TEXT,
    fecha_publicacion TEXT,
    x                 REAL NOT NULL,
    y                 REAL NOT NULL
);
CREATE INDEX IF NOT EXISTS inmuebles_publicos_predial_idx ON inmuebles_publicos (numero_predial);
CREATE INDEX IF NOT EXISTS inmuebles_publicos_filtros_idx ON inmuebles_publicos (tipo, operacion, precio);

-- Catálogo de capas para el LayerControl del frontend
CREATE TABLE IF NOT EXISTS catalogo_capas (
    nombre   TEXT PRIMARY KEY,
    grupo    TEXT NOT NULL CHECK (grupo IN ('catastro','pot','ambiental')),
    geometria TEXT,
    entidades INTEGER
);
