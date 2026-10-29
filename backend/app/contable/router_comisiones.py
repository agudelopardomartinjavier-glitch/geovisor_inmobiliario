"""Comisiones (porcentaje, quién paga, estado, IVA, retenciones, reparto), facturación con consecutivos, notas crédito y
envío a la DIAN a través del adaptador (ver dian.py). Solo administrador. Cálculos en calculos.py."""
import json
import sqlite3
from datetime import date
from typing import Literal, Optional

from fastapi import APIRouter, HTTPException, Query
from pydantic import BaseModel, Field

from .. import config
from ..admin.db import auditar, conexion
from ..admin.router import Admin
from . import calculos as c
from . import dian
from . import servicio as sv

router = APIRouter(prefix="/admin", tags=["admin · contabilidad · comisiones y facturas"])

Fecha = Optional[str]
_F = r"^\d{4}-\d{2}-\d{2}$"
CALC = ("valor_comision", "iva", "retefuente", "reteica", "reteiva", "total_facturable", "neto_a_recibir", "asesor_valor", "referido_valor", "inmobiliaria_valor")

class ComisionIn(BaseModel):
    inmueble_id: int
    tipo: Literal["venta", "arriendo"]
    contrato_id: Optional[int] = None
    base: Optional[int] = Field(default=None, gt=0, le=10**13, description="Precio de venta o canon mensual; si falta se toma del inmueble o contrato")
    pct_pactado: Optional[float] = Field(default=None, gt=0, le=1000, description="Si falta se usa el porcentaje por defecto del tipo")
    pagador: Literal["propietario", "comprador", "arrendatario", "compartida"]
    pct_pagador_propietario: Optional[float] = Field(default=None, ge=0, le=100)
    aplica_iva: bool = True
    aplica_retenciones: bool = True
    asesor: Optional[str] = Field(default=None, max_length=120)
    asesor_pct: Optional[float] = Field(default=None, ge=0, le=100)
    referido: Optional[str] = Field(default=None, max_length=120)
    referido_pct: Optional[float] = Field(default=None, ge=0, le=100)
    fecha: Optional[str] = Field(default=None, pattern=_F)
    nota: Optional[str] = Field(default=None, max_length=500)

class CobroComisionIn(BaseModel):
    fecha: Optional[str] = Field(default=None, pattern=_F)
    nota: Optional[str] = Field(default=None, max_length=300)

def _resolver(con: sqlite3.Connection, d: ComisionIn) -> dict:
    """Completa y valida los datos (base, porcentajes, reparto) y calcula la comisión con las tarifas de hoy."""
    inm = sv.inmueble(con, d.inmueble_id)
    p = sv.params(con)
    contrato = None
    if d.contrato_id is not None:
        contrato = con.execute("SELECT * FROM contratos_arriendo WHERE id = ?", (d.contrato_id,)).fetchone()
        if not contrato or contrato["inmueble_id"] != d.inmueble_id:
            raise HTTPException(422, "El contrato no existe o no es de ese inmueble")
    if d.tipo == "venta" and d.pagador == "arrendatario":
        raise HTTPException(422, "En una venta el pagador no puede ser el arrendatario")
    if d.tipo == "arriendo" and d.pagador == "comprador":
        raise HTTPException(422, "En un arriendo el pagador no puede ser el comprador")
    if d.pagador == "compartida" and d.pct_pagador_propietario is None:
        raise HTTPException(422, "En una comisión compartida indica el % que paga el propietario")
    base = d.base or (inm["precio"] if d.tipo == "venta" else (contrato["canon_inicial"] if contrato else None))
    if not base:
        raise HTTPException(422, "Indica la base (precio de venta o canon): el inmueble no tiene precio o falta el contrato")
    pct = d.pct_pactado or p["comision.venta_pct" if d.tipo == "venta" else "comision.arriendo_pct"]
    asesor_pct = d.asesor_pct if d.asesor_pct is not None else (p["reparto.asesor_pct_defecto"] if d.asesor else 0)
    referido_pct = d.referido_pct if d.referido_pct is not None else (p["reparto.referido_pct_defecto"] if d.referido else 0)
    try:
        calc = c.calcular_comision(base, pct, sv.tarifas(p), d.aplica_iva, d.aplica_retenciones, asesor_pct, referido_pct)
    except ValueError as e:
        raise HTTPException(422, str(e))
    t = sv.tarifas(p)
    return dict(inmueble_id=d.inmueble_id, tipo=d.tipo, contrato_id=d.contrato_id, base=base, pct_pactado=pct, pagador=d.pagador,
                pct_pagador_propietario=d.pct_pagador_propietario if d.pagador == "compartida" else None,
                fecha=d.fecha or date.today().isoformat(), aplica_iva=int(d.aplica_iva), aplica_retenciones=int(d.aplica_retenciones),
                iva_pct=t.iva_pct, retefuente_pct=t.retefuente_pct, reteica_por_mil=t.reteica_por_mil, reteiva_pct=t.reteiva_pct,
                retefuente_base_minima=t.retefuente_base_minima, asesor=d.asesor, asesor_pct=asesor_pct, referido=d.referido,
                referido_pct=referido_pct, nota=d.nota, **calc)

def _guardar(con, v: dict, usuario: str, id_: Optional[int] = None) -> int:
    cols = [k for k in v]
    if id_ is None:
        cur = con.execute(f"INSERT INTO comisiones ({', '.join(cols)}, creado_por) VALUES ({', '.join('?' * (len(cols) + 1))})", [v[k] for k in cols] + [usuario])
        return cur.lastrowid
    con.execute(f"UPDATE comisiones SET {', '.join(k + ' = ?' for k in cols)} WHERE id = ?", [v[k] for k in cols] + [id_])
    return id_

def _comision(con, cid: int) -> sqlite3.Row:
    r = con.execute("SELECT * FROM comisiones WHERE id = ?", (cid,)).fetchone()
    if not r:
        raise HTTPException(404, "Comisión no encontrada")
    return r

def _facturado(con, cid: int) -> dict:
    """Lo ya facturado de una comisión (facturas, sin restar notas crédito: esas se manejan aparte)."""
    r = con.execute("SELECT COALESCE(SUM(pct_comision),0) pct, COALESCE(SUM(subtotal),0) subtotal, COALESCE(SUM(iva),0) iva, "
                    "COALESCE(SUM(retefuente),0) retefuente, COALESCE(SUM(reteica),0) reteica, COALESCE(SUM(reteiva),0) reteiva "
                    "FROM facturas WHERE comision_id = ? AND tipo = 'factura'", (cid,)).fetchone()
    return dict(r)

def _salida(con, r: sqlite3.Row) -> dict:
    d = dict(r)
    d["facturas"] = [dict(f) for f in con.execute("SELECT id, tipo, prefijo, numero, fecha, total, dian_estado FROM facturas WHERE comision_id = ? ORDER BY id", (r["id"],))]
    d["facturado_pct"] = round(_facturado(con, r["id"])["pct"], 4)
    return d

@router.post("/comisiones", status_code=201, summary="Registra una comisión (calcula IVA, retenciones y reparto)")
def crear_comision(d: ComisionIn, usuario: Admin):
    with conexion() as con:
        v = _resolver(con, d)
        cid = _guardar(con, v, usuario)
        auditar(con, usuario, "comision_crear", d.inmueble_id, {"comision": cid, "tipo": d.tipo})
        return _salida(con, _comision(con, cid))

@router.post("/comisiones/calcular", summary="Calcula una comisión sin guardarla (vista previa)")
def calcular_comision(d: ComisionIn, _: Admin):
    with conexion() as con:
        return _resolver(con, d)

@router.get("/comisiones", summary="Comisiones (filtros: estado, tipo, inmueble, fechas)")
def listar_comisiones(_: Admin, estado: Optional[str] = None, tipo: Optional[Literal["venta", "arriendo"]] = None, inmueble_id: Optional[int] = None,
                      desde: Optional[str] = Query(None, pattern=_F), hasta: Optional[str] = Query(None, pattern=_F)):
    cond, args = [], []
    for col, val, op in (("estado", estado, "="), ("tipo", tipo, "="), ("inmueble_id", inmueble_id, "="), ("fecha", desde, ">="), ("fecha", hasta, "<=")):
        if val is not None:
            cond.append(f"{col} {op} ?"); args.append(val)
    with conexion() as con:
        filas = con.execute("SELECT * FROM comisiones" + (" WHERE " + " AND ".join(cond) if cond else "") + " ORDER BY fecha DESC, id DESC", args).fetchall()
        return [_salida(con, r) for r in filas]

@router.get("/comisiones/{cid}")
def ver_comision(cid: int, _: Admin):
    with conexion() as con:
        return _salida(con, _comision(con, cid))

@router.put("/comisiones/{cid}", summary="Corrige una comisión (solo mientras está pendiente)")
def editar_comision(cid: int, d: ComisionIn, usuario: Admin):
    with conexion() as con:
        if _comision(con, cid)["estado"] != "pendiente":
            raise HTTPException(409, "Solo se edita una comisión pendiente; si ya se facturó, anula la factura con una nota crédito")
        _guardar(con, _resolver(con, d), usuario, cid)
        auditar(con, usuario, "comision_editar", d.inmueble_id, {"comision": cid})
        return _salida(con, _comision(con, cid))

@router.post("/comisiones/{cid}/anular")
def anular_comision(cid: int, usuario: Admin):
    with conexion() as con:
        r = _comision(con, cid)
        if con.execute("SELECT 1 FROM facturas WHERE comision_id = ? AND tipo = 'factura'", (cid,)).fetchone():
            raise HTTPException(409, "Tiene facturas: anúlalas primero con una nota crédito")
        con.execute("UPDATE comisiones SET estado = 'anulada' WHERE id = ?", (cid,))
        auditar(con, usuario, "comision_anular", r["inmueble_id"], {"comision": cid})
        return _salida(con, _comision(con, cid))

@router.post("/comisiones/{cid}/cobrar", summary="Marca la comisión como cobrada (debe estar facturada)")
def cobrar_comision(cid: int, d: CobroComisionIn, usuario: Admin):
    with conexion() as con:
        r = _comision(con, cid)
        if r["estado"] != "facturada":
            raise HTTPException(409, f"La comisión está «{r['estado']}»: solo se cobra una comisión facturada")
        con.execute("UPDATE comisiones SET estado = 'cobrada', fecha_cobro = ?, nota = COALESCE(?, nota) WHERE id = ?", (d.fecha or date.today().isoformat(), d.nota, cid))
        auditar(con, usuario, "comision_cobrar", r["inmueble_id"], {"comision": cid})
        return _salida(con, _comision(con, cid))

# ---------------------------------------------------------------- facturas
class FacturarIn(BaseModel):
    cliente_id: int
    pct_comision: Optional[float] = Field(default=None, gt=0, le=100, description="Porción de la comisión que cubre; por defecto, todo lo que falta")
    fecha: Optional[str] = Field(default=None, pattern=_F)
    concepto: Optional[str] = Field(default=None, max_length=300)

def _factura(con, fid: int) -> sqlite3.Row:
    r = con.execute("SELECT * FROM facturas WHERE id = ?", (fid,)).fetchone()
    if not r:
        raise HTTPException(404, "Factura no encontrada")
    return r

def _acreditado(con, fid: int) -> dict:
    r = con.execute("SELECT COALESCE(SUM(subtotal),0) subtotal, COALESCE(SUM(iva),0) iva, COALESCE(SUM(total),0) total, COALESCE(SUM(retefuente),0) retefuente, "
                    "COALESCE(SUM(reteica),0) reteica, COALESCE(SUM(reteiva),0) reteiva FROM facturas WHERE factura_origen_id = ? AND tipo = 'nota_credito'", (fid,)).fetchone()
    return dict(r)

def _factura_salida(con, r: sqlite3.Row) -> dict:
    d = dict(r)
    if d["tipo"] == "factura":
        ac = _acreditado(con, r["id"])
        d["acreditado"] = ac["total"]
        d["saldo_credito"] = r["total"] - ac["total"]
        d["anulada"] = r["total"] > 0 and ac["total"] >= r["total"]
        d["notas_credito"] = [dict(n) for n in con.execute("SELECT id, prefijo, numero, fecha, total, motivo FROM facturas WHERE factura_origen_id = ? ORDER BY id", (r["id"],))]
    d["numero_completo"] = sv.etiqueta(r["prefijo"], r["numero"])
    d["dian_respuesta"] = json.loads(d["dian_respuesta"]) if d.get("dian_respuesta") else None
    return d

@router.post("/comisiones/{cid}/facturar", status_code=201, summary="Emite una factura (con consecutivo) por toda la comisión o una porción")
def facturar(cid: int, d: FacturarIn, usuario: Admin):
    with conexion() as con:
        com = _comision(con, cid)
        if com["estado"] not in ("pendiente", "facturada"):
            raise HTTPException(409, f"La comisión está «{com['estado']}»: no se puede facturar")
        cliente = sv.persona(con, d.cliente_id, "cliente")
        ya = _facturado(con, cid)
        faltante = round(100 - ya["pct"], 6)
        if faltante <= 0:
            raise HTTPException(409, "La comisión ya está facturada por completo")
        pct = d.pct_comision if d.pct_comision is not None else faltante
        if pct > faltante + 1e-9:
            raise HTTPException(422, f"Solo falta facturar el {faltante:g} % de la comisión")
        es_resto = abs(pct - faltante) < 1e-9
        monto = c.porcion_comision(dict(com), pct, ya, es_resto)
        hoy = d.fecha or date.today().isoformat()
        prefijo, numero = sv.siguiente_consecutivo(con, "factura", date.fromisoformat(hoy))
        concepto = d.concepto or f"Comisión por {'venta' if com['tipo'] == 'venta' else 'arrendamiento'} del inmueble {com['inmueble_id']}"
        cur = con.execute("INSERT INTO facturas (tipo, prefijo, numero, fecha, comision_id, cliente_id, concepto, pct_comision, subtotal, iva, total, retefuente, reteica, reteiva, creado_por) "
                          "VALUES ('factura',?,?,?,?,?,?,?,?,?,?,?,?,?,?)",
                          (prefijo, numero, hoy, cid, cliente["id"], concepto, pct, monto["subtotal"], monto["iva"], monto["total"], monto["retefuente"], monto["reteica"], monto["reteiva"], usuario))
        if es_resto:
            con.execute("UPDATE comisiones SET estado = 'facturada' WHERE id = ? AND estado = 'pendiente'", (cid,))
        auditar(con, usuario, "factura_emitir", com["inmueble_id"], {"factura": cur.lastrowid, "comision": cid})
        out = _factura_salida(con, _factura(con, cur.lastrowid))
        r = con.execute("SELECT resolucion_numero FROM consecutivos WHERE tipo = 'factura'").fetchone()
        out["aviso"] = None if r["resolucion_numero"] else "El consecutivo de facturas no tiene resolución DIAN registrada: configúralo antes de facturar electrónicamente."
        return out

@router.get("/facturas", summary="Facturas y notas crédito")
def listar_facturas(_: Admin, tipo: Optional[Literal["factura", "nota_credito"]] = None, desde: Optional[str] = Query(None, pattern=_F), hasta: Optional[str] = Query(None, pattern=_F)):
    cond, args = [], []
    for col, val, op in (("tipo", tipo, "="), ("fecha", desde, ">="), ("fecha", hasta, "<=")):
        if val is not None:
            cond.append(f"{col} {op} ?"); args.append(val)
    with conexion() as con:
        return [_factura_salida(con, r) for r in con.execute("SELECT * FROM facturas" + (" WHERE " + " AND ".join(cond) if cond else "") + " ORDER BY fecha DESC, id DESC", args)]

@router.get("/facturas/{fid}")
def ver_factura(fid: int, _: Admin):
    with conexion() as con:
        return _factura_salida(con, _factura(con, fid))

class NotaCreditoIn(BaseModel):
    motivo: str = Field(min_length=3, max_length=300)
    pct: Optional[float] = Field(default=None, gt=0, le=100, description="Porción de la factura que se acredita; por defecto, todo el saldo")
    fecha: Optional[str] = Field(default=None, pattern=_F)

@router.post("/facturas/{fid}/nota-credito", status_code=201, summary="Emite una nota crédito (total o parcial) sobre una factura")
def nota_credito(fid: int, d: NotaCreditoIn, usuario: Admin):
    with conexion() as con:
        f = _factura(con, fid)
        if f["tipo"] != "factura":
            raise HTTPException(422, "Solo se emiten notas crédito sobre facturas")
        ac = _acreditado(con, fid)
        if ac["total"] >= f["total"]:
            raise HTTPException(409, "La factura ya está acreditada por completo")
        # porción en % del total de la factura; el resto exacto se calcula por diferencia
        ya_pct = round(100 * ac["subtotal"] / f["subtotal"], 6) if f["subtotal"] else 0
        faltante = round(100 - ya_pct, 6)
        pct = d.pct if d.pct is not None else faltante
        if pct > faltante + 1e-9:
            raise HTTPException(422, f"Solo se puede acreditar el {faltante:g} % restante de la factura")
        es_resto = abs(pct - faltante) < 1e-9
        origen = dict(valor_comision=f["subtotal"], iva=f["iva"], retefuente=f["retefuente"], reteica=f["reteica"], reteiva=f["reteiva"])
        m = c.porcion_comision(origen, pct, ac, es_resto)
        hoy = d.fecha or date.today().isoformat()
        prefijo, numero = sv.siguiente_consecutivo(con, "nota_credito", date.fromisoformat(hoy))
        cur = con.execute("INSERT INTO facturas (tipo, prefijo, numero, fecha, comision_id, factura_origen_id, cliente_id, concepto, subtotal, iva, total, retefuente, reteica, reteiva, motivo, creado_por) "
                          "VALUES ('nota_credito',?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)",
                          (prefijo, numero, hoy, f["comision_id"], fid, f["cliente_id"], f"Nota crédito sobre {sv.etiqueta(f['prefijo'], f['numero'])}",
                           m["subtotal"], m["iva"], m["total"], m["retefuente"], m["reteica"], m["reteiva"], d.motivo, usuario))
        # si todas las facturas de la comisión quedaron acreditadas y no se había cobrado, la comisión vuelve a estar pendiente
        if f["comision_id"]:
            t = con.execute("SELECT COALESCE(SUM(CASE WHEN tipo='factura' THEN total END),0) f, COALESCE(SUM(CASE WHEN tipo='nota_credito' THEN total END),0) n "
                            "FROM facturas WHERE comision_id = ?", (f["comision_id"],)).fetchone()
            if t["f"] and t["n"] >= t["f"]:
                con.execute("UPDATE comisiones SET estado = 'pendiente' WHERE id = ? AND estado = 'facturada'", (f["comision_id"],))
        auditar(con, usuario, "nota_credito_emitir", None, {"nota": cur.lastrowid, "factura": fid})
        return _factura_salida(con, _factura(con, cur.lastrowid))

# ---------------------------------------------------------------- DIAN (adaptador)
def documento_dian(con, f: sqlite3.Row) -> dict:
    """Documento normalizado que recibe el adaptador (no depende de ningún proveedor)."""
    cli = sv.persona(con, f["cliente_id"], "cliente")
    origen = _factura(con, f["factura_origen_id"]) if f["factura_origen_id"] else None
    iva_pct = round(100 * f["iva"] / f["subtotal"], 4) if f["subtotal"] else 0
    return {
        "tipo": f["tipo"], "prefijo": f["prefijo"], "numero": f["numero"], "fecha": f["fecha"],
        "emisor": {"nombre": config.EMPRESA_NOMBRE, "nit": config.EMPRESA_NIT},
        "cliente": {"nombre": cli["nombre"], "documento_tipo": cli["documento_tipo"], "documento": cli["documento"], "email": cli["email"], "direccion": cli["direccion"]},
        "lineas": [{"descripcion": f["concepto"], "cantidad": 1, "valor_unitario": f["subtotal"], "iva_pct": iva_pct, "iva": f["iva"]}],
        "totales": {"subtotal": f["subtotal"], "iva": f["iva"], "total": f["total"], "retefuente": f["retefuente"], "reteica": f["reteica"], "reteiva": f["reteiva"]},
        "factura_origen": {"prefijo": origen["prefijo"], "numero": origen["numero"], "cufe": origen["dian_cufe"]} if origen else None,
        "motivo": f["motivo"],
    }

@router.post("/facturas/{fid}/enviar-dian", summary="Envía la factura o nota crédito al proveedor de facturación electrónica configurado")
def enviar_dian(fid: int, usuario: Admin):
    with conexion() as con:
        f = _factura(con, fid)
        if f["dian_estado"] == "aceptada":
            raise HTTPException(409, "El documento ya fue aceptado por la DIAN")
        if not (config.EMPRESA_NIT and config.EMPRESA_NOMBRE) and config.DIAN_PROVEEDOR != "simulado":
            raise HTTPException(422, "Configura EMPRESA_NOMBRE y EMPRESA_NIT en .env antes de enviar a la DIAN")
        try:
            resp = dian.obtener(config.DIAN_PROVEEDOR).enviar(documento_dian(con, f))
        except dian.ProveedorNoConfigurado as e:
            raise HTTPException(501, str(e))
        con.execute("UPDATE facturas SET dian_estado = ?, dian_cufe = ?, dian_respuesta = ?, dian_fecha = strftime('%Y-%m-%dT%H:%M:%SZ','now') WHERE id = ?",
                    (resp.estado, resp.cufe, json.dumps({"mensaje": resp.mensaje, **resp.cruda}, ensure_ascii=False), fid))
        auditar(con, usuario, "dian_enviar", None, {"factura": fid, "estado": resp.estado})
        return _factura_salida(con, _factura(con, fid))
