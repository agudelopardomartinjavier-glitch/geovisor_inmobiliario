-- 01_esquema.sql — esquemas, tablas base e índices. SRID de trabajo: 9377 (MAGNA-SIRGAS Origen Nacional).
CREATE EXTENSION IF NOT EXISTS postgis;

CREATE SCHEMA IF NOT EXISTS catastro;      -- predios (insumo interno; el público solo ve la vista)
CREATE SCHEMA IF NOT EXISTS pot;           -- capas del POT (las tablas las crea scripts/cargar_datos.py)
CREATE SCHEMA IF NOT EXISTS ambiental;     -- POMCA (idem)
CREATE SCHEMA IF NOT EXISTS inmobiliario;  -- inmuebles (con campos privados)
CREATE SCHEMA IF NOT EXISTS vista_publica; -- vistas sin campos sensibles (lo único que consume el rol público)

-- ---------------------------------------------------------------- catastro.predios
-- Solo se cargan los campos necesarios; se omiten usuario_log, globalid, etc.
-- numero_predial = COALESCE(codigo, codigo_2) de la base catastral. NO es único:
-- hay códigos repetidos (p. ej. PH/condominios y un código placeholder), por eso la PK es id.
CREATE TABLE IF NOT EXISTS catastro.predios (
    id               bigserial PRIMARY KEY,
    numero_predial   text NOT NULL,
    codigo_anterior  text,
    manzana_codigo   text,
    vereda_codigo    text,
    codigo_municipio text,
    geom             geometry(MultiPolygon, 9377) NOT NULL
);
CREATE INDEX IF NOT EXISTS predios_geom_gix   ON catastro.predios USING gist (geom);
CREATE INDEX IF NOT EXISTS predios_numero_idx ON catastro.predios (numero_predial);

-- ---------------------------------------------------------------- inmobiliario.inmuebles
CREATE TABLE IF NOT EXISTS inmobiliario.inmuebles (
    id                 bigserial PRIMARY KEY,
    numero_predial     text,  -- FK lógica a catastro.predios.numero_predial (no es FK real: no es único)
    tipo               text NOT NULL CHECK (tipo IN ('casa','lote','finca','local','apartamento')),
    operacion          text NOT NULL CHECK (operacion IN ('venta','arriendo')),
    precio             numeric(16,0) CHECK (precio >= 0),
    area_terreno       numeric(14,2) CHECK (area_terreno >= 0),
    area_construida    numeric(14,2) CHECK (area_construida >= 0),
    habitaciones       smallint CHECK (habitaciones >= 0),
    banos              smallint CHECK (banos >= 0),
    descripcion        text,
    fotos              text[] NOT NULL DEFAULT '{}',
    contacto           text,
    estado_publicacion text NOT NULL DEFAULT 'borrador' CHECK (estado_publicacion IN ('borrador','publicado','vendido')),
    fecha_publicacion  timestamptz,
    geom               geometry(Point, 9377),
    -- SENSIBLES (nunca salen en vistas públicas ni en vector tiles públicos)
    propietario        text,
    avaluo             numeric(16,0),
    notas_internas     text,
    creado_en          timestamptz NOT NULL DEFAULT now(),
    actualizado_en     timestamptz NOT NULL DEFAULT now()
);
COMMENT ON COLUMN inmobiliario.inmuebles.propietario     IS 'SENSIBLE: dato personal, llenado a mano por el administrador';
COMMENT ON COLUMN inmobiliario.inmuebles.avaluo          IS 'SENSIBLE';
COMMENT ON COLUMN inmobiliario.inmuebles.notas_internas  IS 'SENSIBLE';

CREATE INDEX IF NOT EXISTS inmuebles_geom_gix     ON inmobiliario.inmuebles USING gist (geom);
CREATE INDEX IF NOT EXISTS inmuebles_predial_idx  ON inmobiliario.inmuebles (numero_predial);
CREATE INDEX IF NOT EXISTS inmuebles_estado_idx   ON inmobiliario.inmuebles (estado_publicacion);

CREATE OR REPLACE FUNCTION inmobiliario.tg_inmuebles_fechas() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
    NEW.actualizado_en := now();
    IF NEW.estado_publicacion = 'publicado' AND NEW.fecha_publicacion IS NULL THEN
        NEW.fecha_publicacion := now();
    END IF;
    RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS inmuebles_fechas ON inmobiliario.inmuebles;
CREATE TRIGGER inmuebles_fechas BEFORE INSERT OR UPDATE ON inmobiliario.inmuebles
    FOR EACH ROW EXECUTE FUNCTION inmobiliario.tg_inmuebles_fechas();
