"""Migraciones (subir/bajar sin perder datos existentes) y sincronización admin -> público (nada privado sale)."""
import os
import sqlite3
import sys

import pytest

RAIZ = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
sys.path.insert(0, os.path.join(RAIZ, "scripts"))
import migrar  # noqa: E402
from app.admin.sync import sincronizar  # noqa: E402

def _admin(tmp_path):
    ruta = str(tmp_path / "admin.sqlite")
    con = sqlite3.connect(ruta)
    con.executescript(open(os.path.join(RAIZ, "db", "01_esquema.sql"), encoding="utf8").read())
    con.execute("INSERT INTO inmuebles (tipo, operacion, precio, estado_publicacion, x, y, propietario, avaluo, notas_internas) "
                "VALUES ('casa','venta',300000000,'publicado',1000,2000,'Dueño Secreto',250000000,'nota privada')")
    con.execute("INSERT INTO inmuebles (tipo, operacion, estado_publicacion, x, y) VALUES ('lote','venta','borrador',1,1)")
    con.commit(); con.close()
    return ruta

def _publico(tmp_path):
    ruta = str(tmp_path / "publico.gpkg")
    con = sqlite3.connect(ruta)
    con.executescript(open(os.path.join(RAIZ, "db", "02_publico.sql"), encoding="utf8").read())
    con.commit(); con.close()
    return ruta

def test_migraciones_suben_y_bajan_sin_tocar_los_datos(tmp_path):
    ruta = _admin(tmp_path)
    assert migrar.subir("admin", ruta=ruta, hacer_respaldo=False) == [1, 2, 3, 4]
    assert migrar.subir("admin", ruta=ruta, hacer_respaldo=False) == []              # idempotente
    con = sqlite3.connect(ruta)
    tablas = {r[0] for r in con.execute("SELECT name FROM sqlite_master WHERE type='table'")}
    assert {"inmueble_ficha", "inmueble_juridico", "inmueble_soportes", "inmueble_semaforo", "parametros"} <= tablas
    assert con.execute("SELECT valor FROM parametros WHERE clave='semaforo.umbral_rojo_pct'").fetchone()[0] == "50"
    con.close()
    assert migrar.bajar("admin", pasos=4, ruta=ruta, hacer_respaldo=False) == [4, 3, 2, 1]
    con = sqlite3.connect(ruta)
    tablas = {r[0] for r in con.execute("SELECT name FROM sqlite_master WHERE type='table'")}
    assert not ({"inmueble_ficha", "inmueble_juridico", "inmueble_soportes", "inmueble_semaforo", "parametros", "precio_historial", "estado_historial", "personas", "contratos_arriendo", "facturas", "liquidaciones"} & tablas)
    assert not [r for r in con.execute("SELECT name FROM sqlite_master WHERE type='trigger' AND name LIKE 'inmuebles_%_a_'")]
    assert con.execute("SELECT count(*) FROM inmuebles").fetchone()[0] == 2           # los inmuebles siguen ahí
    con.close()

def test_migracion_con_error_no_deja_nada_a_medias(tmp_path, monkeypatch):
    ruta = _admin(tmp_path)
    d = tmp_path / "mig"; (d / "admin").mkdir(parents=True)
    (d / "admin" / "001_mala.up.sql").write_text("CREATE TABLE a (x INTEGER);\nCREATE TABLE a (y INTEGER);")
    (d / "admin" / "001_mala.down.sql").write_text("DROP TABLE a;")
    monkeypatch.setattr(migrar, "DIR_MIG", str(d))
    with pytest.raises(sqlite3.OperationalError):
        migrar.subir("admin", ruta=ruta, hacer_respaldo=False)
    con = sqlite3.connect(ruta)
    assert con.execute("SELECT 1 FROM sqlite_master WHERE name='a'").fetchone() is None
    assert con.execute("SELECT count(*) FROM schema_migraciones").fetchone()[0] == 0
    con.close()

def test_respaldo_previo_de_admin(tmp_path, monkeypatch):
    ruta = _admin(tmp_path)
    monkeypatch.setattr(migrar, "DIR_RESP", str(tmp_path / "resp"))
    migrar.subir("admin", ruta=ruta)
    copias = os.listdir(tmp_path / "resp")
    assert len(copias) == 1
    con = sqlite3.connect(tmp_path / "resp" / copias[0])
    assert con.execute("SELECT count(*) FROM inmuebles").fetchone()[0] == 2
    con.close()

def test_sync_publica_solo_lo_publico(tmp_path):
    adm, pub = _admin(tmp_path), _publico(tmp_path)
    migrar.subir("admin", ruta=adm, hacer_respaldo=False); migrar.subir("publico", ruta=pub)
    con = sqlite3.connect(adm)
    con.execute("INSERT INTO inmueble_ficha (inmueble_id, estrato, agua, negociable, entorno) VALUES (1, 3, 1, 0, '{\"colegio_m\": 450}')")
    con.execute("INSERT INTO inmueble_juridico (inmueble_id, matricula_inmobiliaria, embargo, litigios) VALUES (1, '236-1', 1, 'Proceso reservado')")
    con.execute("INSERT INTO inmueble_semaforo (inmueble_id, color, resumen_publico, categorias, detalle, reglas_version) "
                "VALUES (1, 'rojo', 'Riesgo alto en: aspectos jurídicos.', '[\"juridico\"]', '{\"hallazgos\": [\"Embargo registrado\"]}', '1.0')")
    con.commit(); con.close()

    assert sincronizar(adm, pub) == 1                    # el borrador no sale
    p = sqlite3.connect(pub)
    fila = p.execute("SELECT estrato, agua, negociable, entorno, semaforo_color, semaforo_resumen FROM inmueble_ficha_publica WHERE inmueble_id=1").fetchone()
    assert fila == (3, 1, 0, '{"colegio_m": 450}', "rojo", "Riesgo alto en: aspectos jurídicos.")
    assert p.execute("SELECT count(*) FROM inmueble_ficha_publica").fetchone()[0] == 1
    # ninguna columna ni valor privado en todo el archivo público
    cols = {c[1] for t in ("inmuebles_publicos", "inmueble_ficha_publica") for c in p.execute(f"PRAGMA table_info({t})")}
    assert not ({"propietario", "avaluo", "notas_internas", "embargo", "litigios", "matricula_inmobiliaria", "detalle"} & cols)
    volcado = "\n".join(p.iterdump())
    for secreto in ("Dueño Secreto", "nota privada", "Proceso reservado", "Embargo registrado", "236-1"):
        assert secreto not in volcado
    p.close()

def test_sync_inmueble_publicado_sin_ficha_lleva_entorno_vacio(tmp_path):
    adm, pub = _admin(tmp_path), _publico(tmp_path)
    migrar.subir("admin", ruta=adm, hacer_respaldo=False); migrar.subir("publico", ruta=pub)
    sincronizar(adm, pub)
    p = sqlite3.connect(pub)
    assert p.execute("SELECT entorno, semaforo_color FROM inmueble_ficha_publica WHERE inmueble_id=1").fetchone() == ("{}", None)
    p.close()

def test_historiales_se_llenan_con_datos_existentes_y_con_triggers(tmp_path):
    ruta = _admin(tmp_path)                                   # ya tiene 2 inmuebles (uno con precio y avalúo, publicado)
    con = sqlite3.connect(ruta)
    con.execute("UPDATE inmuebles SET fecha_publicacion = '2026-09-01T10:00:00Z' WHERE id = 1"); con.commit(); con.close()
    migrar.subir("admin", ruta=ruta, hacer_respaldo=False)
    con = sqlite3.connect(ruta)
    # relleno inicial: un punto de partida por dato existente
    assert con.execute("SELECT precio, tipo FROM precio_historial WHERE inmueble_id=1").fetchall() == [(300000000, "inicial")]
    assert con.execute("SELECT valor FROM avaluo_historial WHERE inmueble_id=1").fetchall() == [(250000000,)]
    assert con.execute("SELECT estado, fecha FROM estado_historial WHERE inmueble_id=1").fetchall() == [("publicado", "2026-09-01")]
    assert con.execute("SELECT estado FROM estado_historial WHERE inmueble_id=2").fetchall() == [("borrador",)]
    # triggers: cambio real de precio -> rebaja; mismo precio -> nada; subida -> aumento; primer precio -> inicial
    con.execute("UPDATE inmuebles SET precio = 270000000 WHERE id = 1")
    con.execute("UPDATE inmuebles SET precio = 270000000, descripcion = 'x' WHERE id = 1")
    con.execute("UPDATE inmuebles SET precio = 280000000 WHERE id = 1")
    con.execute("UPDATE inmuebles SET precio = 150000000 WHERE id = 2")
    assert con.execute("SELECT tipo, precio_anterior, precio FROM precio_historial WHERE inmueble_id=1 ORDER BY id").fetchall() == [
        ("inicial", None, 300000000), ("rebaja", 300000000, 270000000), ("aumento", 270000000, 280000000)]
    assert con.execute("SELECT tipo FROM precio_historial WHERE inmueble_id=2").fetchall() == [("inicial",)]
    con.execute("UPDATE inmuebles SET precio = NULL WHERE id = 2")                         # borrar el precio no inventa historia
    assert con.execute("SELECT count(*) FROM precio_historial WHERE inmueble_id=2").fetchone()[0] == 1
    con.execute("UPDATE inmuebles SET avaluo = 260000000 WHERE id = 1")
    assert con.execute("SELECT count(*) FROM avaluo_historial WHERE inmueble_id=1").fetchone()[0] == 2
    con.execute("UPDATE inmuebles SET estado_publicacion = 'vendido' WHERE id = 1")
    assert con.execute("SELECT estado FROM estado_historial WHERE inmueble_id=1 ORDER BY id DESC LIMIT 1").fetchone()[0] == "vendido"
    con.execute("INSERT INTO inmuebles (tipo, operacion, precio, avaluo, estado_publicacion) VALUES ('lote','venta',1000,900,'borrador')")
    nuevo = con.execute("SELECT max(id) FROM inmuebles").fetchone()[0]
    assert con.execute("SELECT count(*) FROM precio_historial WHERE inmueble_id=?", (nuevo,)).fetchone()[0] == 1
    assert con.execute("SELECT count(*) FROM estado_historial WHERE inmueble_id=?", (nuevo,)).fetchone()[0] == 1
    con.commit(); con.close()
