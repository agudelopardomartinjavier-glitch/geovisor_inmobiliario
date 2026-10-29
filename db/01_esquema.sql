-- 01_esquema.sql — data/db/admin.sqlite  (SQLite plano, SOLO lo usa el backend en modo administrador)
-- Aquí viven los inmuebles con sus campos privados. El visor público NUNCA abre este archivo.
-- Coordenadas en EPSG:9377 (x = este, y = norte). Sin extensiones: funciona con sqlite3 puro.
PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS inmuebles (
    id                 INTEGER PRIMARY KEY AUTOINCREMENT,
    numero_predial     TEXT,  -- FK lógica a predios.numero_predial (publico.gpkg); no es único en el catastro
    tipo               TEXT NOT NULL CHECK (tipo IN ('casa','lote','finca','local','apartamento')),
    operacion          TEXT NOT NULL CHECK (operacion IN ('venta','arriendo')),
    precio             INTEGER CHECK (precio >= 0),
    area_terreno       REAL    CHECK (area_terreno >= 0),
    area_construida    REAL    CHECK (area_construida >= 0),
    habitaciones       INTEGER CHECK (habitaciones >= 0),
    banos              INTEGER CHECK (banos >= 0),
    descripcion        TEXT,
    fotos              TEXT NOT NULL DEFAULT '[]' CHECK (json_valid(fotos)),  -- array JSON de URLs
    contacto           TEXT,
    estado_publicacion TEXT NOT NULL DEFAULT 'borrador' CHECK (estado_publicacion IN ('borrador','publicado','vendido')),
    fecha_publicacion  TEXT,
    x                  REAL,  -- punto en EPSG:9377
    y                  REAL,
    -- SENSIBLES: nunca se copian a publico.gpkg
    propietario        TEXT,  -- dato personal, llenado a mano
    avaluo             INTEGER,
    notas_internas     TEXT,
    creado_en          TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ','now')),
    actualizado_en     TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ','now'))
);
CREATE INDEX IF NOT EXISTS inmuebles_predial_idx ON inmuebles (numero_predial);
CREATE INDEX IF NOT EXISTS inmuebles_estado_idx  ON inmuebles (estado_publicacion);
CREATE INDEX IF NOT EXISTS inmuebles_xy_idx      ON inmuebles (x, y);

-- fecha_publicacion se fija al pasar a 'publicado'; actualizado_en en cada cambio
CREATE TRIGGER IF NOT EXISTS inmuebles_ai AFTER INSERT ON inmuebles
WHEN NEW.estado_publicacion = 'publicado' AND NEW.fecha_publicacion IS NULL
BEGIN
    UPDATE inmuebles SET fecha_publicacion = strftime('%Y-%m-%dT%H:%M:%SZ','now') WHERE id = NEW.id;
END;

CREATE TRIGGER IF NOT EXISTS inmuebles_au AFTER UPDATE ON inmuebles
WHEN NEW.actualizado_en = OLD.actualizado_en
BEGIN
    UPDATE inmuebles SET
        actualizado_en    = strftime('%Y-%m-%dT%H:%M:%SZ','now'),
        fecha_publicacion = CASE WHEN NEW.estado_publicacion = 'publicado' AND NEW.fecha_publicacion IS NULL
                                 THEN strftime('%Y-%m-%dT%H:%M:%SZ','now') ELSE NEW.fecha_publicacion END
    WHERE id = NEW.id;
END;

-- ---------------------------------------------------------------- Fase 5: administración
CREATE TABLE IF NOT EXISTS admin_usuarios (
    usuario    TEXT PRIMARY KEY,
    clave_hash TEXT NOT NULL,  -- pbkdf2_sha256$iteraciones$salt$hash (ver backend/app/admin/auth.py)
    creado_en  TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ','now'))
);

CREATE TABLE IF NOT EXISTS auditoria (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    fecha       TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ','now')),
    usuario     TEXT,
    accion      TEXT NOT NULL,  -- login, login_fallido, crear, editar, estado, eliminar
    inmueble_id INTEGER,
    detalle     TEXT
);

-- ---------------------------------------------------------------- Fase 6: comparables (SOLO admin; nunca van a publico.gpkg)
CREATE TABLE IF NOT EXISTS comparables (
    id              INTEGER PRIMARY KEY AUTOINCREMENT,
    tipo            TEXT NOT NULL CHECK (tipo IN ('casa','lote','finca','local','apartamento')),
    operacion       TEXT NOT NULL CHECK (operacion IN ('oferta','venta')),   -- oferta de mercado o venta cerrada
    precio          INTEGER NOT NULL CHECK (precio > 0),
    area_terreno    REAL CHECK (area_terreno > 0),
    area_construida REAL CHECK (area_construida > 0),
    fecha           TEXT,            -- fecha de la oferta o de la escritura (AAAA-MM-DD)
    fuente          TEXT,            -- portal, escritura, corredor…
    referencia      TEXT,            -- enlace o número de documento
    contacto        TEXT,
    descripcion     TEXT,
    numero_predial  TEXT,
    sector          TEXT,            -- barrio o vereda
    x               REAL,            -- EPSG:9377
    y               REAL,
    creado_en       TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ','now')),
    actualizado_en  TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ','now')),
    CHECK (area_terreno IS NOT NULL OR area_construida IS NOT NULL)
);
CREATE INDEX IF NOT EXISTS comparables_tipo_idx ON comparables (tipo);
CREATE INDEX IF NOT EXISTS comparables_xy_idx   ON comparables (x, y);

CREATE TRIGGER IF NOT EXISTS comparables_au AFTER UPDATE ON comparables
WHEN NEW.actualizado_en = OLD.actualizado_en
BEGIN
    UPDATE comparables SET actualizado_en = strftime('%Y-%m-%dT%H:%M:%SZ','now') WHERE id = NEW.id;
END;

-- Comparables elegidos para valorar un inmueble, con su ajuste (homologación) en %
CREATE TABLE IF NOT EXISTS inmueble_comparables (
    inmueble_id  INTEGER NOT NULL REFERENCES inmuebles(id)   ON DELETE CASCADE,
    comparable_id INTEGER NOT NULL REFERENCES comparables(id) ON DELETE CASCADE,
    ajuste_pct   REAL NOT NULL DEFAULT 0 CHECK (ajuste_pct BETWEEN -90 AND 300),  -- + sube el valor unitario del comparable
    incluir      INTEGER NOT NULL DEFAULT 1 CHECK (incluir IN (0,1)),              -- 0 = excluido (p. ej. dato atípico)
    nota         TEXT,
    PRIMARY KEY (inmueble_id, comparable_id)
);
