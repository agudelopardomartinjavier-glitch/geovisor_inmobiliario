"""Fase 3 — terceros, comisiones, facturas y notas crédito de punta a punta sobre copias de las bases reales."""
import pytest

from conftest import HAY_DATOS

pytestmark = pytest.mark.skipif(not HAY_DATOS, reason="faltan las bases reales")

def H(c):
    return c.headers_admin

def _persona(c, doc, nombre="Persona de prueba", **kw):
    r = c.post("/admin/personas", json={"nombre": nombre, "documento": doc, "documento_tipo": kw.pop("documento_tipo", "CC"), **kw}, headers=H(c))
    assert r.status_code == 201, r.text
    return r.json()

def _venta(c):
    return next(i for i in c.get("/admin/inmuebles", headers=H(c)).json() if i["operacion"] == "venta" and i["precio"])

def test_rutas_exigen_sesion(cliente):
    for ruta in ("/admin/personas", "/admin/comisiones", "/admin/facturas", "/admin/consecutivos", "/admin/ipc"):
        assert cliente.get(ruta).status_code == 401, ruta

def test_personas_validan_y_no_se_duplican(cliente):
    p = _persona(cliente, "10203040", "Ana Pérez", email="ana@example.com")
    assert cliente.post("/admin/personas", json={"nombre": "Otra", "documento": "10203040"}, headers=H(cliente)).status_code == 409
    assert cliente.post("/admin/personas", json={"nombre": "X", "documento": "1"}, headers=H(cliente)).status_code == 422
    assert cliente.post("/admin/personas", json={"nombre": "Mal Correo", "documento": "5555555", "email": "no-es-correo"}, headers=H(cliente)).status_code == 422
    assert cliente.put(f"/admin/personas/{p['id']}", json={"nombre": "Ana P.", "documento": "10203040"}, headers=H(cliente)).json()["nombre"] == "Ana P."
    assert any(x["id"] == p["id"] for x in cliente.get("/admin/personas?q=1020", headers=H(cliente)).json())

def test_comision_de_venta_con_parametros_por_defecto(cliente):
    h, i = H(cliente), _venta(cliente)
    r = cliente.post("/admin/comisiones", json={"inmueble_id": i["id"], "tipo": "venta", "pagador": "propietario", "asesor": "maria", "asesor_pct": 50, "referido": "pedro", "referido_pct": 10}, headers=h)
    assert r.status_code == 201, r.text
    c = r.json()
    base = i["precio"]
    assert c["base"] == base and c["pct_pactado"] == 3 and c["estado"] == "pendiente"
    assert c["valor_comision"] == round(base * 0.03)
    assert c["iva"] == round(c["valor_comision"] * 0.19) and c["total_facturable"] == c["valor_comision"] + c["iva"]
    assert c["asesor_valor"] + c["referido_valor"] + c["inmobiliaria_valor"] == c["valor_comision"]
    assert (c["iva_pct"], c["retefuente_pct"]) == (19, 11)                         # copia de las tarifas usadas

def test_cambiar_un_parametro_cambia_la_comision_nueva_pero_no_la_vieja(cliente):
    h, i = H(cliente), _venta(cliente)
    antes = cliente.post("/admin/comisiones", json={"inmueble_id": i["id"], "tipo": "venta", "pagador": "propietario"}, headers=h).json()
    assert cliente.put("/admin/parametros/iva.pct", json={"valor": "0"}, headers=h).status_code == 200
    try:
        despues = cliente.post("/admin/comisiones", json={"inmueble_id": i["id"], "tipo": "venta", "pagador": "propietario"}, headers=h).json()
        assert despues["iva"] == 0 and despues["iva_pct"] == 0
        assert cliente.get(f"/admin/comisiones/{antes['id']}", headers=h).json()["iva"] == antes["iva"] > 0
    finally:
        cliente.put("/admin/parametros/iva.pct", json={"valor": "19"}, headers=h)

def test_validaciones_de_comision(cliente):
    h, i = H(cliente), _venta(cliente)
    malos = [{"tipo": "venta", "pagador": "arrendatario"}, {"tipo": "arriendo", "pagador": "comprador"}, {"tipo": "venta", "pagador": "compartida"},
             {"tipo": "venta", "pagador": "propietario", "asesor": "x", "asesor_pct": 80, "referido": "y", "referido_pct": 30},
             {"tipo": "venta", "pagador": "propietario", "pct_pactado": -1}]
    for m in malos:
        assert cliente.post("/admin/comisiones", json={"inmueble_id": i["id"], **m}, headers=h).status_code == 422, m
    assert cliente.post("/admin/comisiones", json={"inmueble_id": 999999, "tipo": "venta", "pagador": "propietario"}, headers=h).status_code == 404

def test_vista_previa_no_guarda(cliente):
    h, i = H(cliente), _venta(cliente)
    n = len(cliente.get("/admin/comisiones", headers=h).json())
    r = cliente.post("/admin/comisiones/calcular", json={"inmueble_id": i["id"], "tipo": "venta", "pagador": "comprador", "base": 100_000_000, "pct_pactado": 2}, headers=h)
    assert r.status_code == 200 and r.json()["valor_comision"] == 2_000_000
    assert len(cliente.get("/admin/comisiones", headers=h).json()) == n

def test_facturacion_parcial_consecutivos_y_estado(cliente):
    h, i = H(cliente), _venta(cliente)
    com = cliente.post("/admin/comisiones", json={"inmueble_id": i["id"], "tipo": "venta", "pagador": "compartida", "pct_pagador_propietario": 60,
                                                   "base": 333_333_333, "pct_pactado": 3}, headers=h).json()
    c1 = _persona(cliente, "900100200", "Vendedor SAS", documento_tipo="NIT", tipo_persona="juridica")
    c2 = _persona(cliente, "80123123", "Comprador Uno")
    f1 = cliente.post(f"/admin/comisiones/{com['id']}/facturar", json={"cliente_id": c1["id"], "pct_comision": 60}, headers=h)
    assert f1.status_code == 201, f1.text
    f1 = f1.json()
    assert f1["prefijo"] == "FE" and f1["subtotal"] == round(com["valor_comision"] * 0.6) and f1["aviso"]      # sin resolución DIAN: avisa
    assert cliente.get(f"/admin/comisiones/{com['id']}", headers=h).json()["estado"] == "pendiente"             # aún falta facturar
    assert cliente.post(f"/admin/comisiones/{com['id']}/facturar", json={"cliente_id": c2["id"], "pct_comision": 50}, headers=h).status_code == 422
    f2 = cliente.post(f"/admin/comisiones/{com['id']}/facturar", json={"cliente_id": c2["id"]}, headers=h).json()   # el resto
    assert f2["numero"] == f1["numero"] + 1                                                                      # consecutivo
    assert f1["subtotal"] + f2["subtotal"] == com["valor_comision"]
    assert f1["iva"] + f2["iva"] == com["iva"] and f1["total"] + f2["total"] == com["total_facturable"]
    assert cliente.get(f"/admin/comisiones/{com['id']}", headers=h).json()["estado"] == "facturada"
    assert cliente.post(f"/admin/comisiones/{com['id']}/facturar", json={"cliente_id": c2["id"]}, headers=h).status_code == 409
    assert cliente.put(f"/admin/comisiones/{com['id']}", json={"inmueble_id": i["id"], "tipo": "venta", "pagador": "propietario"}, headers=h).status_code == 409
    assert cliente.post(f"/admin/comisiones/{com['id']}/anular", headers=h).status_code == 409
    cob = cliente.post(f"/admin/comisiones/{com['id']}/cobrar", json={"fecha": "2026-10-20"}, headers=h).json()
    assert cob["estado"] == "cobrada" and cob["fecha_cobro"] == "2026-10-20"

def test_cobrar_exige_estar_facturada(cliente):
    h, i = H(cliente), _venta(cliente)
    com = cliente.post("/admin/comisiones", json={"inmueble_id": i["id"], "tipo": "venta", "pagador": "propietario"}, headers=h).json()
    assert cliente.post(f"/admin/comisiones/{com['id']}/cobrar", json={}, headers=h).status_code == 409
    assert cliente.post(f"/admin/comisiones/{com['id']}/anular", headers=h).json()["estado"] == "anulada"

def test_nota_credito_parcial_total_y_regreso_a_pendiente(cliente):
    h, i = H(cliente), _venta(cliente)
    com = cliente.post("/admin/comisiones", json={"inmueble_id": i["id"], "tipo": "venta", "pagador": "propietario", "base": 100_000_000, "pct_pactado": 3}, headers=h).json()
    cli = _persona(cliente, "70707070", "Cliente NC")
    f = cliente.post(f"/admin/comisiones/{com['id']}/facturar", json={"cliente_id": cli["id"]}, headers=h).json()
    assert cliente.get(f"/admin/comisiones/{com['id']}", headers=h).json()["estado"] == "facturada"
    assert cliente.post(f"/admin/facturas/{f['id']}/nota-credito", json={"motivo": "ab"}, headers=h).status_code == 422
    n1 = cliente.post(f"/admin/facturas/{f['id']}/nota-credito", json={"motivo": "Descuento acordado", "pct": 25}, headers=h).json()
    assert n1["tipo"] == "nota_credito" and n1["prefijo"] == "NC" and n1["subtotal"] == 750_000 and n1["factura_origen_id"] == f["id"]
    assert cliente.post(f"/admin/facturas/{f['id']}/nota-credito", json={"motivo": "Demasiado", "pct": 80}, headers=h).status_code == 422
    n2 = cliente.post(f"/admin/facturas/{f['id']}/nota-credito", json={"motivo": "Negocio caído"}, headers=h).json()
    assert n1["total"] + n2["total"] == f["total"] and n1["subtotal"] + n2["subtotal"] == f["subtotal"]
    ver = cliente.get(f"/admin/facturas/{f['id']}", headers=h).json()
    assert ver["anulada"] and ver["saldo_credito"] == 0 and len(ver["notas_credito"]) == 2
    assert cliente.post(f"/admin/facturas/{f['id']}/nota-credito", json={"motivo": "Otra vez"}, headers=h).status_code == 409
    assert cliente.get(f"/admin/comisiones/{com['id']}", headers=h).json()["estado"] == "pendiente"      # factura anulada: se puede volver a facturar

def test_consecutivo_respeta_rango_y_resolucion(cliente):
    h = H(cliente)
    act = next(x for x in cliente.get("/admin/consecutivos", headers=h).json() if x["tipo"] == "factura")
    if act["siguiente"] > 1:
        assert cliente.put("/admin/consecutivos/factura", json={"prefijo": act["prefijo"], "siguiente": 1}, headers=h).status_code == 409   # no repite números
    cliente.put("/admin/consecutivos/factura", json={"prefijo": "SETT", "siguiente": 1, "hasta": 2, "resolucion_numero": "18760000001",
                                                      "resolucion_fecha": "2026-01-01", "vigencia_hasta": "2027-01-01"}, headers=h)
    i = _venta(cliente)
    cli = _persona(cliente, "60606060", "Cliente Rango")
    try:
        for _ in range(2):
            com = cliente.post("/admin/comisiones", json={"inmueble_id": i["id"], "tipo": "venta", "pagador": "propietario", "base": 10_000_000, "pct_pactado": 1}, headers=h).json()
            ok = cliente.post(f"/admin/comisiones/{com['id']}/facturar", json={"cliente_id": cli["id"]}, headers=h)
            assert ok.status_code == 201 and ok.json()["prefijo"] == "SETT" and ok.json()["aviso"] is None
        com = cliente.post("/admin/comisiones", json={"inmueble_id": i["id"], "tipo": "venta", "pagador": "propietario", "base": 10_000_000, "pct_pactado": 1}, headers=h).json()
        agotado = cliente.post(f"/admin/comisiones/{com['id']}/facturar", json={"cliente_id": cli["id"]}, headers=h)
        assert agotado.status_code == 409 and "rango" in agotado.json()["detail"].lower()
        cliente.put("/admin/consecutivos/factura", json={"prefijo": "VENC", "siguiente": 1, "vigencia_hasta": "2020-01-01"}, headers=h)      # resolución vencida
        assert cliente.post(f"/admin/comisiones/{com['id']}/facturar", json={"cliente_id": cli["id"]}, headers=h).status_code == 409
    finally:
        cliente.put("/admin/consecutivos/factura", json={"prefijo": act["prefijo"], "siguiente": 9999}, headers=h)    # vuelve al prefijo original sin repetir

def test_dian_sin_proveedor_y_con_simulado(cliente, monkeypatch):
    from app import config
    h, i = H(cliente), _venta(cliente)
    cli = _persona(cliente, "50505050", "Cliente DIAN", email="dian@example.com")
    com = cliente.post("/admin/comisiones", json={"inmueble_id": i["id"], "tipo": "venta", "pagador": "propietario", "base": 10_000_000, "pct_pactado": 1}, headers=h).json()
    f = cliente.post(f"/admin/comisiones/{com['id']}/facturar", json={"cliente_id": cli["id"]}, headers=h).json()
    monkeypatch.setattr(config, "DIAN_PROVEEDOR", "ninguno")
    assert cliente.post(f"/admin/facturas/{f['id']}/enviar-dian", headers=h).status_code in (422, 501)
    monkeypatch.setattr(config, "DIAN_PROVEEDOR", "simulado")
    ok = cliente.post(f"/admin/facturas/{f['id']}/enviar-dian", headers=h).json()
    assert ok["dian_estado"] == "aceptada" and ok["dian_cufe"].startswith("SIMULADO-") and ok["dian_respuesta"]["simulado"] is True
    assert cliente.post(f"/admin/facturas/{f['id']}/enviar-dian", headers=h).status_code == 409           # ya aceptada
    nc = cliente.post(f"/admin/facturas/{f['id']}/nota-credito", json={"motivo": "Prueba de NC"}, headers=h).json()
    assert cliente.post(f"/admin/facturas/{nc['id']}/enviar-dian", headers=h).json()["dian_estado"] == "aceptada"

def test_ipc_se_carga_y_se_valida(cliente):
    h = H(cliente)
    assert cliente.put("/admin/ipc/2025", json={"pct": 5.1, "fuente": "DANE"}, headers=h).status_code == 200
    assert any(x["anio"] == 2025 and x["pct"] == 5.1 for x in cliente.get("/admin/ipc", headers=h).json())
    assert cliente.put("/admin/ipc/1800", json={"pct": 5}, headers=h).status_code == 422
    assert cliente.put("/admin/ipc/2024", json={"pct": 999}, headers=h).status_code == 422

def test_propietario_del_inmueble_y_borrado_protegido(cliente):
    h, i = H(cliente), _venta(cliente)
    p = _persona(cliente, "40404040", "Dueño de Prueba")
    assert cliente.put(f"/admin/inmuebles/{i['id']}/propietario", json={"persona_id": p["id"]}, headers=h).json()["id"] == p["id"]
    assert cliente.put(f"/admin/inmuebles/{i['id']}/propietario", json={"persona_id": 999999}, headers=h).status_code == 404
    assert cliente.delete(f"/admin/personas/{p['id']}", headers=h).status_code == 409        # es propietario de un inmueble: no se borra
    assert cliente.delete(f"/admin/inmuebles/{i['id']}/propietario", headers=h).status_code == 204
    assert cliente.delete(f"/admin/personas/{p['id']}", headers=h).status_code == 204
