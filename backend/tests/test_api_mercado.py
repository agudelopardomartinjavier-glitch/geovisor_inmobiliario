"""Fase 2 de punta a punta sobre copias de las bases reales."""
import pytest

from conftest import HAY_DATOS

pytestmark = pytest.mark.skipif(not HAY_DATOS, reason="faltan las bases reales")

def _admin_inmuebles(c):
    return c.get("/admin/inmuebles", headers=c.headers_admin).json()

def _con(c, **filtro):
    return next(i for i in _admin_inmuebles(c) if all(i[k] == v for k, v in filtro.items()))

def _cuerpo(i, **cambios):
    d = {k: i[k] for k in ("tipo", "operacion", "numero_predial", "lon", "lat", "precio", "area_terreno", "area_construida", "habitaciones",
                           "banos", "descripcion", "fotos", "contacto", "propietario", "avaluo", "notas_internas")}
    d["estado_publicacion"] = i["estado_publicacion"]
    d.update(cambios)
    return d

def test_rutas_exigen_sesion(cliente):
    for ruta in ("/admin/inmuebles/1/historial", "/admin/inmuebles/1/inversion", "/admin/mercado/m2?tipo=casa"):
        assert cliente.get(ruta).status_code == 401, ruta

def test_el_historial_existe_desde_el_inicio(cliente):
    h = cliente.get("/admin/inmuebles/1/historial", headers=cliente.headers_admin).json()
    assert h["precios"] and h["precios"][0]["tipo"] == "inicial" and h["avaluos"] and h["estados"]
    assert set(h["mercado"]) >= {"dias", "publicado_desde", "publicado_ahora", "vendido_el", "dias_hasta_venta"}

def test_una_rebaja_queda_registrada_sola(cliente):
    h, i = cliente.headers_admin, _con(cliente, estado_publicacion="publicado", operacion="venta")
    antes = len(cliente.get(f"/admin/inmuebles/{i['id']}/historial", headers=h).json()["precios"])
    # guardar sin cambiar el precio NO agrega una fila
    assert cliente.put(f"/admin/inmuebles/{i['id']}", json=_cuerpo(i), headers=h).status_code == 200
    assert len(cliente.get(f"/admin/inmuebles/{i['id']}/historial", headers=h).json()["precios"]) == antes
    nuevo = int(i["precio"] * 0.9)
    assert cliente.put(f"/admin/inmuebles/{i['id']}", json=_cuerpo(i, precio=nuevo), headers=h).status_code == 200
    hist = cliente.get(f"/admin/inmuebles/{i['id']}/historial", headers=h).json()
    ult = hist["precios"][-1]
    assert len(hist["precios"]) == antes + 1 and ult["tipo"] == "rebaja" and ult["precio"] == nuevo and ult["precio_anterior"] == i["precio"]
    assert hist["rebajas"]["n_rebajas"] >= 1 and hist["rebajas"]["variacion_pct"] <= -9.9

def test_avaluo_cambiado_en_el_inmueble_entra_al_historial(cliente):
    h, i = cliente.headers_admin, _con(cliente, estado_publicacion="publicado", operacion="venta")
    n = len(cliente.get(f"/admin/inmuebles/{i['id']}/historial", headers=h).json()["avaluos"])
    assert cliente.put(f"/admin/inmuebles/{i['id']}", json=_cuerpo(i, avaluo=(i["avaluo"] or 100_000_000) + 7_000_000), headers=h).status_code == 200
    assert len(cliente.get(f"/admin/inmuebles/{i['id']}/historial", headers=h).json()["avaluos"]) == n + 1

def test_precio_historico_manual_reordena_y_solo_se_borra_lo_manual(cliente):
    h, i = cliente.headers_admin, _con(cliente, estado_publicacion="publicado", operacion="venta")
    base = f"/admin/inmuebles/{i['id']}"
    r = cliente.post(f"{base}/precios", json={"fecha": "2020-01-15", "precio": 999_000_000, "nota": "precio de lanzamiento"}, headers=h)
    assert r.status_code == 201, r.text
    pr = r.json()["precios"]
    assert pr[0]["fecha"] == "2020-01-15" and pr[0]["tipo"] == "inicial" and pr[0]["origen"] == "manual"
    assert pr[1]["tipo"] == "rebaja" and pr[1]["precio_anterior"] == 999_000_000          # la serie se re-tipa
    assert cliente.delete(f"/admin/precios/{pr[1]['id']}", headers=h).status_code == 409   # los automáticos no se borran
    assert cliente.delete(f"/admin/precios/{pr[0]['id']}", headers=h).status_code == 200
    assert cliente.post(f"{base}/precios", json={"fecha": "15/01/2020", "precio": 1}, headers=h).status_code == 422

def test_avaluo_manual(cliente):
    h, i = cliente.headers_admin, _con(cliente, estado_publicacion="publicado")
    r = cliente.post(f"/admin/inmuebles/{i['id']}/avaluos", json={"fecha": "2025-03-01", "valor": 250_000_000, "fuente": "comercial"}, headers=h)
    assert r.status_code == 201 and any(a["origen"] == "manual" and a["valor"] == 250_000_000 for a in r.json()["avaluos"])
    assert cliente.post(f"/admin/inmuebles/{i['id']}/avaluos", json={"fecha": "2025-03-01", "valor": 1, "fuente": "inventada"}, headers=h).status_code == 422

def test_valor_por_m2_del_sector_y_mapa_de_calor(cliente):
    h = cliente.headers_admin
    tipos = [t for t in ("casa", "lote", "apartamento", "local", "finca")
             if cliente.get(f"/admin/mercado/m2?tipo={t}", headers=h).json()["n_puntos"] >= 3]
    assert tipos, "los datos de demostración deberían dar al menos un tipo con 3 puntos"
    r = cliente.get(f"/admin/mercado/m2?tipo={tipos[0]}", headers=h).json()
    assert r["sectores"] and all(s["mediana"] > 0 for s in r["sectores"])
    assert r["base"] in ("terreno", "construida")
    assert r["celdas"]["type"] == "FeatureCollection"
    if r["celdas"]["features"]:
        f = r["celdas"]["features"][0]
        ring = f["geometry"]["coordinates"][0]
        assert len(ring) == 5 and ring[0] == ring[-1]
        assert -75 < ring[0][0] < -73 and 3 < ring[0][1] < 5                       # Acacías, en grados
        assert all(0 <= c["properties"]["rel"] <= 1 for c in r["celdas"]["features"])
        assert r["escala"]["minimo"] <= r["escala"]["maximo"]
    solo = cliente.get(f"/admin/mercado/m2?tipo={tipos[0]}&fuentes=comparables", headers=h).json()
    assert solo["n_puntos"] <= r["n_puntos"]
    assert cliente.get("/admin/mercado/m2?tipo=castillo", headers=h).status_code == 422

def test_rentabilidad_de_un_arriendo(cliente):
    h = cliente.headers_admin
    i = next(i for i in _admin_inmuebles(cliente) if i["operacion"] == "arriendo" and i["precio"])
    assert cliente.put(f"/admin/inmuebles/{i['id']}", json=_cuerpo(i, avaluo=240_000_000), headers=h).status_code == 200
    i = cliente.get(f"/admin/inmuebles/{i['id']}", headers=h).json()
    r = cliente.get(f"/admin/inmuebles/{i['id']}/inversion", headers=h).json()
    assert r["canon_mensual"] == i["precio"] and r["valor_base"] == i["avaluo"] and r["origen_valor"] == "avalúo registrado"
    assert r["rentabilidad_pct"] == pytest.approx(i["precio"] * 12 / i["avaluo"] * 100, abs=0.01)

def test_rentabilidad_de_una_venta_con_canon_esperado(cliente):
    h = cliente.headers_admin
    i = next(i for i in _admin_inmuebles(cliente) if i["operacion"] == "venta" and i["precio"])
    r = cliente.put(f"/admin/inmuebles/{i['id']}/inversion", json={"canon_mensual_esperado": 2_000_000}, headers=h).json()
    assert r["canon_mensual"] == 2_000_000 and r["valor_base"] == i["precio"] and r["origen_canon"] == "canon esperado (manual)"
    assert r["rentabilidad_pct"] == pytest.approx(2_000_000 * 12 / i["precio"] * 100, abs=0.01)
    assert cliente.put(f"/admin/inmuebles/{i['id']}/inversion", json={"canon_mensual_esperado": -5}, headers=h).status_code == 422

def test_indicador_de_precio_solo_en_ventas(cliente):
    h = cliente.headers_admin
    venta = next(i for i in _admin_inmuebles(cliente) if i["operacion"] == "venta")
    arr = next(i for i in _admin_inmuebles(cliente) if i["operacion"] == "arriendo")
    v = cliente.get(f"/admin/inmuebles/{venta['id']}/valoracion", headers=h).json()
    assert v["indicador"]["clasificacion"] in ("sin_dato", "por_debajo", "en_rango", "por_encima") and v["indicador"]["tolerancia_pct"] == 10
    a = cliente.get(f"/admin/inmuebles/{arr['id']}/valoracion", headers=h).json()
    assert a["indicador"]["clasificacion"] == "no_aplica" and a["dif_precio_pct"] is None   # un canon mensual no se compara con un valor de venta
