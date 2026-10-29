-- 001 (admin) — Fase 1: ficha ampliada, jurídico (privado), soportes y semáforo jurídico-ambiental.
-- Todas las tablas cuelgan de inmuebles(id) con ON DELETE CASCADE. Los campos NULL significan "sin dato".
-- Booleanos: 0 = no, 1 = sí, NULL = desconocido.

CREATE TABLE inmueble_ficha (
    inmueble_id         INTEGER PRIMARY KEY REFERENCES inmuebles(id) ON DELETE CASCADE,
    -- físicos
    estrato             INTEGER CHECK (estrato BETWEEN 1 AND 6),
    antiguedad_anos     INTEGER CHECK (antiguedad_anos >= 0),
    estado_conservacion TEXT CHECK (estado_conservacion IN ('nuevo','excelente','bueno','regular','para_remodelar')),
    pisos               INTEGER CHECK (pisos >= 0),
    parqueaderos        INTEGER CHECK (parqueaderos >= 0),
    deposito            INTEGER CHECK (deposito IN (0,1)),
    acabados            TEXT,
    orientacion         TEXT CHECK (orientacion IN ('N','NE','E','SE','S','SO','O','NO')),
    -- servicios públicos
    agua                INTEGER CHECK (agua IN (0,1)),
    alcantarillado      INTEGER CHECK (alcantarillado IN (0,1)),
    gas                 INTEGER CHECK (gas IN (0,1)),
    energia             INTEGER CHECK (energia IN (0,1)),
    internet            INTEGER CHECK (internet IN (0,1)),
    -- fincas
    fuentes_agua        TEXT,
    tipo_suelo          TEXT,
    vocacion            TEXT,
    cultivos            TEXT,
    mejoras             TEXT,
    via_acceso          TEXT,
    -- medios
    video_url           TEXT,
    recorrido_360_url   TEXT,
    plano_url           TEXT,
    -- condiciones de venta / arriendo
    negociable          INTEGER CHECK (negociable IN (0,1)),
    permuta             INTEGER CHECK (permuta IN (0,1)),
    financiacion        INTEGER CHECK (financiacion IN (0,1)),
    administracion_mensual INTEGER CHECK (administracion_mensual >= 0),   -- COP, propiedad horizontal
    disponible_desde    TEXT,                                              -- AAAA-MM-DD
    -- entorno calculado automáticamente con las capas (distancias en metros, ver backend/app/entorno.py)
    entorno             TEXT NOT NULL DEFAULT '{}' CHECK (json_valid(entorno)),
    entorno_calculado_en TEXT,
    actualizado_en      TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ','now'))
);

CREATE TABLE inmueble_juridico (
    inmueble_id         INTEGER PRIMARY KEY REFERENCES inmuebles(id) ON DELETE CASCADE,
    -- identificación
    matricula_inmobiliaria TEXT,
    escritura_numero    TEXT,
    escritura_fecha     TEXT,
    notaria             TEXT,
    -- estado jurídico
    hipoteca            INTEGER CHECK (hipoteca IN (0,1)),
    embargo             INTEGER CHECK (embargo IN (0,1)),
    afectacion_vivienda_familiar INTEGER CHECK (afectacion_vivienda_familiar IN (0,1)),
    servidumbres        TEXT,    -- texto libre; vacío = ninguna registrada
    litigios            TEXT,    -- texto libre; vacío = ninguno
    sucesion_pendiente  INTEGER CHECK (sucesion_pendiente IN (0,1)),
    linderos            TEXT,
    -- tributos
    predial_estado      TEXT NOT NULL DEFAULT 'desconocido' CHECK (predial_estado IN ('al_dia','mora','desconocido')),
    predial_ultimo_anio_pagado INTEGER,
    valorizacion_estado TEXT NOT NULL DEFAULT 'desconocido' CHECK (valorizacion_estado IN ('sin_cobro','pendiente','pagada','desconocido')),
    paz_salvo_predial_fecha        TEXT,
    paz_salvo_valorizacion_fecha   TEXT,
    notas               TEXT,
    actualizado_en      TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ','now'))
);

CREATE TABLE inmueble_soportes (
    id                INTEGER PRIMARY KEY AUTOINCREMENT,
    inmueble_id       INTEGER NOT NULL REFERENCES inmuebles(id) ON DELETE CASCADE,
    tipo              TEXT NOT NULL CHECK (tipo IN ('certificado_tradicion','escritura','linderos','paz_salvo_predial','paz_salvo_valorizacion','otro')),
    archivo           TEXT NOT NULL,      -- ruta relativa dentro de SOPORTES_DIR (nunca se sirve como estático)
    nombre_original   TEXT NOT NULL,
    mime              TEXT NOT NULL,
    tamano            INTEGER NOT NULL,
    fecha_documento   TEXT,
    fecha_vencimiento TEXT,
    creado_en         TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ','now'))
);
CREATE INDEX inmueble_soportes_inm_idx ON inmueble_soportes (inmueble_id);
CREATE INDEX inmueble_soportes_venc_idx ON inmueble_soportes (fecha_vencimiento);

CREATE TABLE inmueble_semaforo (
    inmueble_id      INTEGER PRIMARY KEY REFERENCES inmuebles(id) ON DELETE CASCADE,
    color            TEXT NOT NULL CHECK (color IN ('verde','amarillo','rojo')),
    resumen_publico  TEXT NOT NULL,                              -- lo único que ve el público junto con el color
    categorias       TEXT NOT NULL DEFAULT '[]' CHECK (json_valid(categorias)),   -- p. ej. ["juridico","ambiental"]
    detalle          TEXT NOT NULL DEFAULT '{}' CHECK (json_valid(detalle)),      -- PRIVADO: hallazgos y mediciones
    reglas_version   TEXT NOT NULL,
    calculado_en     TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ','now'))
);
