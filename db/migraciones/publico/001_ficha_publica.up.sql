-- 001 (publico) — copia PÚBLICA de la ficha ampliada y del semáforo. Sin ningún dato jurídico ni privado:
-- del semáforo solo viaja el color y el resumen corto (el detalle vive en admin.sqlite).
CREATE TABLE inmueble_ficha_publica (
    inmueble_id         INTEGER PRIMARY KEY,
    estrato             INTEGER, antiguedad_anos INTEGER, estado_conservacion TEXT, pisos INTEGER, parqueaderos INTEGER,
    deposito            INTEGER, acabados TEXT, orientacion TEXT,
    agua INTEGER, alcantarillado INTEGER, gas INTEGER, energia INTEGER, internet INTEGER,
    fuentes_agua TEXT, tipo_suelo TEXT, vocacion TEXT, cultivos TEXT, mejoras TEXT, via_acceso TEXT,
    video_url TEXT, recorrido_360_url TEXT, plano_url TEXT,
    negociable INTEGER, permuta INTEGER, financiacion INTEGER, administracion_mensual INTEGER, disponible_desde TEXT,
    entorno             TEXT NOT NULL DEFAULT '{}',
    semaforo_color      TEXT,
    semaforo_resumen    TEXT
);
