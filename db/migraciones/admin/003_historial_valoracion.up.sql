-- 003 (admin) — Fase 2: historial de precios y avalúos, historial de estados (tiempo en el mercado), canon esperado.
-- El historial se llena SOLO con triggers sobre `inmuebles`: así queda registrado el cambio de precio o de avalúo
-- venga de donde venga (panel, scripts, SQL directo). Las fechas son del día en Colombia (UTC-5).

CREATE TABLE precio_historial (
    id              INTEGER PRIMARY KEY AUTOINCREMENT,
    inmueble_id     INTEGER NOT NULL REFERENCES inmuebles(id) ON DELETE CASCADE,
    fecha           TEXT NOT NULL,                                -- AAAA-MM-DD
    precio          INTEGER NOT NULL CHECK (precio >= 0),
    precio_anterior INTEGER,
    tipo            TEXT NOT NULL CHECK (tipo IN ('inicial','rebaja','aumento')),
    nota            TEXT,
    origen          TEXT NOT NULL DEFAULT 'automatico' CHECK (origen IN ('automatico','manual')),
    creado_en       TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ','now'))
);
CREATE INDEX precio_historial_inm_idx ON precio_historial (inmueble_id, fecha);

CREATE TABLE avaluo_historial (
    id              INTEGER PRIMARY KEY AUTOINCREMENT,
    inmueble_id     INTEGER NOT NULL REFERENCES inmuebles(id) ON DELETE CASCADE,
    fecha           TEXT NOT NULL,
    valor           INTEGER NOT NULL CHECK (valor >= 0),
    fuente          TEXT NOT NULL DEFAULT 'registrado' CHECK (fuente IN ('registrado','comercial','catastral','comparables','otro')),
    nota            TEXT,
    origen          TEXT NOT NULL DEFAULT 'automatico' CHECK (origen IN ('automatico','manual')),
    creado_en       TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ','now'))
);
CREATE INDEX avaluo_historial_inm_idx ON avaluo_historial (inmueble_id, fecha);

CREATE TABLE estado_historial (
    id              INTEGER PRIMARY KEY AUTOINCREMENT,
    inmueble_id     INTEGER NOT NULL REFERENCES inmuebles(id) ON DELETE CASCADE,
    estado          TEXT NOT NULL CHECK (estado IN ('borrador','publicado','vendido')),
    fecha           TEXT NOT NULL,
    creado_en       TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ','now'))
);
CREATE INDEX estado_historial_inm_idx ON estado_historial (inmueble_id, fecha, id);

-- Canon mensual que el propietario o el asesor espera obtener (para la rentabilidad de inmuebles en venta). Privado.
CREATE TABLE inmueble_inversion (
    inmueble_id            INTEGER PRIMARY KEY REFERENCES inmuebles(id) ON DELETE CASCADE,
    canon_mensual_esperado INTEGER CHECK (canon_mensual_esperado >= 0),
    nota                   TEXT,
    actualizado_en         TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ','now'))
);

-- Datos que ya existen: un punto de partida por inmueble (no se inventa historia anterior).
INSERT INTO precio_historial (inmueble_id, fecha, precio, tipo)
    SELECT id, substr(creado_en, 1, 10), precio, 'inicial' FROM inmuebles WHERE precio IS NOT NULL;
INSERT INTO avaluo_historial (inmueble_id, fecha, valor, fuente)
    SELECT id, substr(creado_en, 1, 10), avaluo, 'registrado' FROM inmuebles WHERE avaluo IS NOT NULL;
INSERT INTO estado_historial (inmueble_id, estado, fecha)
    SELECT id, 'publicado', substr(fecha_publicacion, 1, 10) FROM inmuebles
    WHERE fecha_publicacion IS NOT NULL AND estado_publicacion IN ('publicado','vendido');
INSERT INTO estado_historial (inmueble_id, estado, fecha)
    SELECT id, 'vendido', substr(actualizado_en, 1, 10) FROM inmuebles WHERE estado_publicacion = 'vendido';
INSERT INTO estado_historial (inmueble_id, estado, fecha)
    SELECT id, 'borrador', substr(creado_en, 1, 10) FROM inmuebles WHERE estado_publicacion = 'borrador';

CREATE TRIGGER inmuebles_precio_ai AFTER INSERT ON inmuebles WHEN NEW.precio IS NOT NULL
BEGIN
    INSERT INTO precio_historial (inmueble_id, fecha, precio, tipo) VALUES (NEW.id, date('now','-5 hours'), NEW.precio, 'inicial');
END;
CREATE TRIGGER inmuebles_precio_au AFTER UPDATE OF precio ON inmuebles WHEN NEW.precio IS NOT OLD.precio AND NEW.precio IS NOT NULL
BEGIN
    INSERT INTO precio_historial (inmueble_id, fecha, precio, precio_anterior, tipo)
    VALUES (NEW.id, date('now','-5 hours'), NEW.precio, OLD.precio,
            CASE WHEN OLD.precio IS NULL THEN 'inicial' WHEN NEW.precio < OLD.precio THEN 'rebaja' ELSE 'aumento' END);
END;

CREATE TRIGGER inmuebles_avaluo_ai AFTER INSERT ON inmuebles WHEN NEW.avaluo IS NOT NULL
BEGIN
    INSERT INTO avaluo_historial (inmueble_id, fecha, valor, fuente) VALUES (NEW.id, date('now','-5 hours'), NEW.avaluo, 'registrado');
END;
CREATE TRIGGER inmuebles_avaluo_au AFTER UPDATE OF avaluo ON inmuebles WHEN NEW.avaluo IS NOT OLD.avaluo AND NEW.avaluo IS NOT NULL
BEGIN
    INSERT INTO avaluo_historial (inmueble_id, fecha, valor, fuente) VALUES (NEW.id, date('now','-5 hours'), NEW.avaluo, 'registrado');
END;

CREATE TRIGGER inmuebles_estado_ai AFTER INSERT ON inmuebles
BEGIN
    INSERT INTO estado_historial (inmueble_id, estado, fecha) VALUES (NEW.id, NEW.estado_publicacion, date('now','-5 hours'));
END;
CREATE TRIGGER inmuebles_estado_au AFTER UPDATE OF estado_publicacion ON inmuebles WHEN NEW.estado_publicacion IS NOT OLD.estado_publicacion
BEGIN
    INSERT INTO estado_historial (inmueble_id, estado, fecha) VALUES (NEW.id, NEW.estado_publicacion, date('now','-5 hours'));
END;

INSERT INTO parametros (clave, valor, descripcion, requiere_confirmar) VALUES
 ('valoracion.tolerancia_pct',     '10',   'Margen (±%) entre el precio publicado y el valor estimado para considerarlo «en rango»', 1),
 ('mercado.celda_m',               '250',  'Tamaño de celda (m) del mapa de calor de valor por m²', 0),
 ('mercado.radio_influencia_m',    '1500', 'Radio (m) dentro del cual un dato influye en una celda del mapa de calor', 1),
 ('mercado.min_vecinos',           '2',    'Datos mínimos dentro del radio para pintar una celda (evita extrapolar)', 1),
 ('mercado.recorte_percentil',     '5',    'Percentil que se recorta en cada extremo antes de interpolar (atípicos)', 1);
