"""Fixtures compartidas: API completa sobre COPIAS de las bases reales (nunca toca data/db)."""
import os
import shutil
import sqlite3
import sys

import pytest

RAIZ = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
ADMIN_REAL = os.path.join(RAIZ, "data", "db", "admin.sqlite")
PUBLICO_REAL = os.path.join(RAIZ, "data", "db", "publico.gpkg")
HAY_DATOS = os.path.exists(ADMIN_REAL) and os.path.exists(PUBLICO_REAL)

@pytest.fixture(scope="session")
def cliente(tmp_path_factory):
    tmp = tmp_path_factory.mktemp("api")
    shutil.copy(ADMIN_REAL, tmp / "admin.sqlite")
    shutil.copy(PUBLICO_REAL, tmp / "publico.gpkg")
    os.environ.update(ADMIN_ENABLED="true", ADMIN_DB=str(tmp / "admin.sqlite"), DB_PUBLICO=str(tmp / "publico.gpkg"),
                      SOPORTES_DIR=str(tmp / "soportes"), ADMIN_SECRET="x" * 40)
    sys.path.insert(0, os.path.join(RAIZ, "scripts"))
    import migrar
    migrar.subir("admin", ruta=str(tmp / "admin.sqlite"), hacer_respaldo=False)
    migrar.subir("publico", ruta=str(tmp / "publico.gpkg"))
    from app.admin import auth
    con = sqlite3.connect(tmp / "admin.sqlite")
    con.execute("INSERT OR REPLACE INTO admin_usuarios (usuario, clave_hash) VALUES ('prueba', ?)", (auth.hash_password("clave-de-prueba"),))
    con.commit(); con.close()
    from fastapi.testclient import TestClient
    from app.main import app
    c = TestClient(app)
    tok = c.post("/admin/login", json={"usuario": "prueba", "password": "clave-de-prueba"}).json()["token"]
    c.headers_admin = {"Authorization": f"Bearer {tok}"}
    c.tmp = tmp
    return c

