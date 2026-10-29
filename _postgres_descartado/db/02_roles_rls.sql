-- 02_roles_rls.sql — roles, privilegios por columna, RLS y vistas públicas.
-- Variables psql requeridas: pub_pw, adm_pw, mar_pw  (psql -v pub_pw=... -v adm_pw=... -v mar_pw=...)
--
-- Defensa en profundidad para el rol público:
--   1) solo tiene GRANT SELECT sobre columnas no sensibles;
--   2) RLS en inmobiliario.inmuebles: solo filas 'publicado';
--   3) lee mediante vistas con security_invoker (se evalúan con sus propios permisos, no con los del dueño).

-- Roles de grupo (sin login)
SELECT 'CREATE ROLE publico NOLOGIN'  WHERE NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'publico') \gexec
SELECT 'CREATE ROLE "admin" NOLOGIN'  WHERE NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'admin')   \gexec

-- Roles de conexión
SELECT format('CREATE ROLE api_publico LOGIN PASSWORD %L IN ROLE publico', :'pub_pw')
  WHERE NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'api_publico') \gexec
SELECT format('CREATE ROLE api_admin LOGIN PASSWORD %L IN ROLE "admin"', :'adm_pw')
  WHERE NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'api_admin')   \gexec
SELECT format('CREATE ROLE martin_ro LOGIN PASSWORD %L IN ROLE publico', :'mar_pw')
  WHERE NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'martin_ro')   \gexec

-- Cerrar lo que PostgreSQL abre por defecto
REVOKE ALL ON SCHEMA public FROM PUBLIC;
GRANT USAGE ON SCHEMA public TO publico, "admin";   -- PostGIS (tipos y funciones)
GRANT USAGE ON SCHEMA catastro, pot, ambiental, inmobiliario, vista_publica TO publico, "admin";

-- Capas del POT y POMCA: lectura completa (no contienen datos personales); aplica a tablas futuras
GRANT SELECT ON ALL TABLES IN SCHEMA pot, ambiental TO publico, "admin";
ALTER DEFAULT PRIVILEGES IN SCHEMA pot       GRANT SELECT ON TABLES TO publico, "admin";
ALTER DEFAULT PRIVILEGES IN SCHEMA ambiental GRANT SELECT ON TABLES TO publico, "admin";

-- Predios: el público solo ve columnas de identificación y geometría
GRANT SELECT (numero_predial, manzana_codigo, vereda_codigo, codigo_municipio, geom) ON catastro.predios TO publico;
GRANT SELECT ON catastro.predios TO "admin";

-- Inmuebles: público = columnas no sensibles; admin = todo
GRANT SELECT (id, numero_predial, tipo, operacion, precio, area_terreno, area_construida,
              habitaciones, banos, descripcion, fotos, contacto, estado_publicacion,
              fecha_publicacion, geom)
  ON inmobiliario.inmuebles TO publico;
GRANT SELECT, INSERT, UPDATE, DELETE ON inmobiliario.inmuebles TO "admin";
GRANT USAGE, SELECT ON SEQUENCE inmobiliario.inmuebles_id_seq TO "admin";

-- RLS
ALTER TABLE inmobiliario.inmuebles ENABLE ROW LEVEL SECURITY;
ALTER TABLE inmobiliario.inmuebles FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS pol_publico_lectura ON inmobiliario.inmuebles;
DROP POLICY IF EXISTS pol_admin_todo      ON inmobiliario.inmuebles;
CREATE POLICY pol_publico_lectura ON inmobiliario.inmuebles
    FOR SELECT TO publico USING (estado_publicacion = 'publicado');
CREATE POLICY pol_admin_todo ON inmobiliario.inmuebles
    FOR ALL TO "admin" USING (true) WITH CHECK (true);

-- Vistas públicas (sin propietario, avaluo, notas_internas)
CREATE OR REPLACE VIEW vista_publica.inmuebles WITH (security_invoker = true) AS
SELECT id, numero_predial, tipo, operacion, precio, area_terreno, area_construida,
       habitaciones, banos, descripcion, fotos, contacto, fecha_publicacion, geom
FROM inmobiliario.inmuebles
WHERE estado_publicacion = 'publicado';

CREATE OR REPLACE VIEW vista_publica.predios WITH (security_invoker = true) AS
SELECT id, numero_predial, manzana_codigo, vereda_codigo, codigo_municipio, geom
FROM catastro.predios;

GRANT SELECT ON vista_publica.inmuebles, vista_publica.predios TO publico, "admin";
