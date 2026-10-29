-- 002 (admin) — parámetros configurables (porcentajes, umbrales, plazos). Nada de esto va fijo en el código.
-- requiere_confirmar = 1 → valor provisional que debe validar un contador o abogado (# CONFIRMAR en el código).
CREATE TABLE parametros (
    clave              TEXT PRIMARY KEY,
    valor              TEXT NOT NULL,
    descripcion        TEXT NOT NULL,
    requiere_confirmar INTEGER NOT NULL DEFAULT 0 CHECK (requiere_confirmar IN (0,1)),
    actualizado_en     TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ','now'))
);
INSERT INTO parametros (clave, valor, descripcion, requiere_confirmar) VALUES
 ('semaforo.umbral_rojo_pct',       '50', 'Porcentaje del predio afectado (amenaza o protección) a partir del cual el semáforo pasa a ROJO', 1),
 ('semaforo.umbral_amarillo_pct',   '5',  'Porcentaje mínimo del predio afectado para pasar a AMARILLO (menos se considera ruido del cruce)', 1),
 ('soportes.dias_alerta_vencimiento','30','Días antes del vencimiento de un soporte en que empieza la alerta', 0),
 ('soportes.vigencia_certificado_tradicion_dias','30','Vigencia asumida del certificado de tradición si no se indica fecha de vencimiento', 1),
 ('soportes.max_mb',                '15', 'Tamaño máximo de cada soporte adjunto (MB)', 0);
