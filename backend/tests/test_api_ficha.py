"""Prueba de integración de la Fase 1 sobre COPIAS de las bases reales (nunca toca data/db). Se omite si no existen los datos."""
import os
import shutil
import sqlite3
import sys

import pytest

RAIZ = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
ADMIN_REAL = os.path.join(RAIZ, "data", "db", "admin.sqlite")
PUBLICO_REAL = os.path.join(RAIZ, "data", "db", "publico.gpkg")
pytestmark = pytest.mark.skipif(not (os.path.exists(ADMIN_REAL) and os.path.exists(PUBLICO_REAL)), reason="faltan las bases reales")

PDF = b"%PDF-1.4\n1 0 obj<<>>endobj\ntrailer<<>>\n%%EOF"

def _inmueble_publicado(c):
    r = c.get("/inmuebles")
    f = next(f for f in r.json()["features"] if f["properties"]["numero_predial"])
    return f["id"]

def test_rutas_admin_exigen_sesion(cliente):
    for ruta in ("/admin/inmuebles/1/ficha", "/admin/inmuebles/1/juridico", "/admin/inmuebles/1/soportes",
                 "/admin/inmuebles/1/semaforo", "/admin/parametros", "/admin/alertas/soportes", "/admin/soportes/1/archivo"):
        assert cliente.get(ruta).status_code == 401, ruta

def test_recalcular_todos_y_color_publico(cliente):
    h = cliente.headers_admin
    r = cliente.post("/admin/semaforo/recalcular", headers=h)
    assert r.status_code == 200, r.text
    assert r.json()["inmuebles"] >= 1 and sum(r.json()[k] for k in ("verde", "amarillo", "rojo")) == r.json()["inmuebles"]
    lista = cliente.get("/inmuebles").json()["features"]
    assert lista and all(f["properties"]["semaforo"] in ("verde", "amarillo", "rojo") for f in lista)

def test_ficha_ampliada_y_entorno_automatico(cliente):
    h, i = cliente.headers_admin, _inmueble_publicado(cliente)
    cuerpo = {"estrato": 3, "antiguedad_anos": 12, "estado_conservacion": "bueno", "pisos": 2, "parqueaderos": 1, "deposito": True,
              "orientacion": "NE", "agua": True, "gas": False, "internet": True, "negociable": True, "administracion_mensual": 150000,
              "disponible_desde": "2026-11-15", "video_url": "https://example.com/v.mp4"}
    r = cliente.put(f"/admin/inmuebles/{i}/ficha", json=cuerpo, headers=h)
    assert r.status_code == 200, r.text
    pub = cliente.get(f"/inmuebles/{i}/ficha").json()
    assert pub["estrato"] == 3 and pub["deposito"] is True and pub["gas"] is False and pub["alcantarillado"] is None
    assert pub["administracion_mensual"] == 150000 and pub["disponible_desde"] == "2026-11-15"
    ent = pub["entorno"]
    assert ent["colegio_m"] is not None and ent["via_principal_m"] is not None   # calculados con las capas
    assert ent["centro_salud_m"] is None                                          # no hay capa: sin dato, no inventado
    assert pub["semaforo"]["color"] in ("verde", "amarillo", "rojo")

def test_validaciones_de_la_ficha(cliente):
    h, i = cliente.headers_admin, _inmueble_publicado(cliente)
    for malo in ({"estrato": 9}, {"orientacion": "X"}, {"video_url": "javascript:alert(1)"}, {"disponible_desde": "15/11/2026"}):
        assert cliente.put(f"/admin/inmuebles/{i}/ficha", json=malo, headers=h).status_code == 422, malo

def test_juridico_cambia_semaforo_y_no_se_filtra(cliente):
    h, i = cliente.headers_admin, _inmueble_publicado(cliente)
    j = {"matricula_inmobiliaria": "230-98765-SECRETA", "embargo": True, "hipoteca": False, "afectacion_vivienda_familiar": False,
         "sucesion_pendiente": False, "litigios": "Proceso ejecutivo reservado", "predial_estado": "al_dia"}
    assert cliente.put(f"/admin/inmuebles/{i}/juridico", json=j, headers=h).status_code == 200
    priv = cliente.get(f"/admin/inmuebles/{i}/semaforo", headers=h).json()
    assert priv["color"] == "rojo" and any(x["codigo"] == "J1" for x in priv["detalle"]["hallazgos"])
    pub_ficha = cliente.get(f"/inmuebles/{i}/ficha")
    assert pub_ficha.json()["semaforo"]["color"] == "rojo"
    todo_publico = pub_ficha.text + cliente.get(f"/inmuebles/{i}").text + cliente.get("/inmuebles").text + cliente.get(f"/inmuebles/{i}/ficha.pdf").text
    for secreto in ("SECRETA", "reservado", "embargo", "Embargo", "J1", "matricula"):
        assert secreto not in todo_publico, secreto
    assert cliente.get(f"/admin/inmuebles/{i}/juridico", headers=h).json()["embargo"] is True

def test_soportes_tipo_real_vencimiento_y_descarga_privada(cliente):
    h, i = cliente.headers_admin, _inmueble_publicado(cliente)
    base = f"/admin/inmuebles/{i}/soportes"
    mal = cliente.post(base, params={"tipo": "escritura", "nombre": "x.pdf"}, content=b"MZ-ejecutable", headers=h)
    assert mal.status_code == 415                                                      # se valida el contenido, no la extensión
    assert cliente.post(base, params={"tipo": "otro", "nombre": "x.pdf"}, content=b"", headers=h).status_code == 422
    ok = cliente.post(base, params={"tipo": "certificado_tradicion", "nombre": "../../etc/pasaporte.pdf", "fecha_documento": "2020-01-01"}, content=PDF, headers=h)
    assert ok.status_code == 201, ok.text
    s = ok.json()
    assert s["estado"] == "vencido" and s["mime"] == "application/pdf"                 # certificado de 2020: vencido por vigencia
    carpeta = cliente.tmp / "soportes" / str(i)                                                  # solo los soportes jurídicos de este inmueble
    guardados = [p for p in carpeta.rglob("*") if p.is_file()]
    assert len(guardados) == 1 and ".." not in str(guardados[0].relative_to(carpeta))   # el nombre del usuario no entra en la ruta
    assert cliente.get(f"/admin/soportes/{s['id']}/archivo").status_code == 401
    d = cliente.get(f"/admin/soportes/{s['id']}/archivo", headers=h)
    assert d.status_code == 200 and d.content == PDF and "attachment" in d.headers["content-disposition"]
    assert any(a["id"] == s["id"] for a in cliente.get("/admin/alertas/soportes", headers=h).json())
    assert cliente.get("/soportes").status_code == 404 and cliente.get("/data/soportes").status_code == 404   # no hay ruta pública
    assert cliente.delete(f"/admin/soportes/{s['id']}", headers=h).status_code == 204
    assert not any(carpeta.rglob("*.pdf"))

def test_parametros_configurables_cambian_el_resultado(cliente):
    h, i = cliente.headers_admin, _inmueble_publicado(cliente)
    assert cliente.put("/admin/parametros/inexistente", json={"valor": "1"}, headers=h).status_code == 404
    assert cliente.put("/admin/parametros/semaforo.umbral_rojo_pct", json={"valor": "abc"}, headers=h).status_code == 422
    assert cliente.put("/admin/parametros/semaforo.umbral_rojo_pct", json={"valor": "20"}, headers=h).status_code == 200
    det = cliente.post(f"/admin/inmuebles/{i}/semaforo/recalcular", headers=h).json()["detalle"]
    assert det["umbrales"]["rojo_pct"] == 20

def test_auditoria_no_guarda_valores_sensibles(cliente):
    con = sqlite3.connect(cliente.tmp / "admin.sqlite")
    texto = " ".join(str(r) for r in con.execute("SELECT accion, detalle FROM auditoria"))
    con.close()
    assert "juridico" in texto and "230-98765-SECRETA" not in texto and "reservado" not in texto
