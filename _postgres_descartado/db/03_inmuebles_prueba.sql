-- 03_inmuebles_prueba.sql — 3 inmuebles FICTICIOS sobre predios reales (solo para probar). Idempotente.
-- Requiere catastro.predios cargado (scripts/cargar_datos.py lo ejecuta al final).
-- Se escogen solo predios con numero_predial único. 2 quedan 'publicado' y 1 'borrador' para probar el filtro público.
DELETE FROM inmobiliario.inmuebles WHERE descripcion LIKE '[PRUEBA]%';

WITH cand AS (
    SELECT p.numero_predial,
           ST_PointOnSurface(p.geom) AS g,
           ST_Area(p.geom)           AS a,
           substr(p.numero_predial, 6, 2) AS zona   -- 01 = urbano, 00 = rural
    FROM catastro.predios p
    JOIN (SELECT numero_predial FROM catastro.predios GROUP BY 1 HAVING count(*) = 1) u USING (numero_predial)
)
INSERT INTO inmobiliario.inmuebles
    (numero_predial, tipo, operacion, precio, area_terreno, area_construida, habitaciones, banos,
     descripcion, fotos, contacto, estado_publicacion, geom, propietario, avaluo, notas_internas)
(SELECT numero_predial, 'casa', 'venta', 320000000, round(a::numeric, 2), 95, 3, 2,
        '[PRUEBA] Casa ficticia en zona urbana.', ARRAY['https://placehold.co/800x600?text=Casa'],
        'Contacto ficticio 300 000 0000', 'publicado', g, 'Propietario Ficticio 1', 290000000, 'Dato de prueba'
   FROM cand WHERE zona = '01' AND a BETWEEN 120 AND 250 ORDER BY numero_predial LIMIT 1)
UNION ALL
(SELECT numero_predial, 'lote', 'venta', 150000000, round(a::numeric, 2), NULL, NULL, NULL,
        '[PRUEBA] Lote ficticio urbano.', ARRAY['https://placehold.co/800x600?text=Lote'],
        'Contacto ficticio 300 000 0001', 'publicado', g, 'Propietario Ficticio 2', 130000000, 'Dato de prueba'
   FROM cand WHERE zona = '01' AND a BETWEEN 300 AND 900 ORDER BY numero_predial DESC LIMIT 1)
UNION ALL
(SELECT numero_predial, 'finca', 'venta', 1800000000, round(a::numeric, 2), 120, 4, 3,
        '[PRUEBA] Finca ficticia rural (borrador, no debe verse en el visor público).',
        ARRAY['https://placehold.co/800x600?text=Finca'],
        'Contacto ficticio 300 000 0002', 'borrador', g, 'Propietario Ficticio 3', 1500000000, 'Dato de prueba'
   FROM cand WHERE zona = '00' AND a > 50000 ORDER BY numero_predial LIMIT 1);
