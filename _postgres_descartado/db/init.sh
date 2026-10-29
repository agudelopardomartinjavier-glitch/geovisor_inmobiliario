#!/bin/bash
# Se ejecuta una sola vez al crear el volumen de PostGIS (docker-entrypoint-initdb.d).
set -e
psql -v ON_ERROR_STOP=1 -U "$POSTGRES_USER" -d "$POSTGRES_DB" -f /sql/01_esquema.sql
psql -v ON_ERROR_STOP=1 -U "$POSTGRES_USER" -d "$POSTGRES_DB" \
  -v pub_pw="$API_PUBLICO_PASSWORD" -v adm_pw="$API_ADMIN_PASSWORD" -v mar_pw="$MARTIN_RO_PASSWORD" \
  -f /sql/02_roles_rls.sql
