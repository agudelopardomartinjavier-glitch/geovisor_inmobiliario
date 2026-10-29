"""Gastos por inmueble (con soporte adjunto), cuentas del propietario (liquidación mensual con PDF), impuestos (resumen para el
contador con Excel) y reportes (comisiones, flujo de caja, ocupación, rentabilidad). Solo administrador."""
import json
import sqlite3
from datetime import date, timedelta
from typing import Literal, Optional

from fastapi import APIRouter, HTTPException, Query, Request, Response
from fastapi.responses import FileResponse
from pydantic import BaseModel, Field

from ..admin import archivos
from ..admin import parametros as par
from ..admin.db import auditar, conexion
from ..admin.router import Admin
from . import calculos as c
from . import excel
from . import servicio as sv

router = APIRouter(prefix="/admin", tags=["admin · contabilidad · gastos, cuentas y reportes"])
_F = r"^\d{4}-\d{2}-\d{2}$"
_P = r"^\d{4}-(0[1-9]|1[0-2])$"
Formato = Literal["json", "xlsx"]

# ---------------------------------------------------------------- gastos
class GastoIn(BaseModel):
    inmueble_id: int
    fecha: str = Field(pattern=_F)
    categoria: Literal["mantenimiento", "impuesto", "servicio", "seguro", "administracion_ph", "otro"]
    subtipo: Optional[str] = Field(default=None, max_length=60, description="p. ej. «predial» dentro de impuesto")
    descripcion: str = Field(min_length=2, max_length=300)
    valor: int = Field(gt=0, le=10**12)
    a_cargo_de: Literal["propietario", "inmobiliaria", "arrendatario"] = "propietario"
    proveedor: Optional[str] = Field(default=None, max_length=150)
    estado_pago: Literal["pagado", "pendiente"] = "pagado"

CAMPOS_GASTO = ("inmueble_id", "fecha", "categoria", "subtipo", "descripcion", "valor", "a_cargo_de", "proveedor", "estado_pago")

def _gasto(con, gid: int) -> sqlite3.Row:
    r = con.execute("SELECT * FROM gastos WHERE id = ?", (gid,)).fetchone()
    if not r:
        raise HTTPException(404, "Gasto no encontrado")
    return r

def _gasto_salida(r: sqlite3.Row) -> dict:
    d = {k: r[k] for k in r.keys() if not k.startswith("soporte_")}
    d["tiene_soporte"] = bool(r["soporte_archivo"])
    d["soporte_nombre"] = r["soporte_nombre"]
    return d

def _liquidado(con, inmueble_id: int, fecha: str) -> Optional[sqlite3.Row]:
    """Liquidación ya cerrada que incluye (por propietario y mes) un gasto de ese inmueble y fecha."""
    return con.execute("SELECT l.* FROM liquidaciones l JOIN inmueble_propietario ip ON ip.persona_id = l.propietario_id WHERE ip.inmueble_id = ? AND l.periodo = ?",
                       (inmueble_id, fecha[:7])).fetchone()

def _bloquear_si_liquidado(con, inmueble_id: int, fecha: str, a_cargo: str):
    l = _liquidado(con, inmueble_id, fecha) if a_cargo == "propietario" else None
    if l:
        raise HTTPException(409, f"Ese mes ya está liquidado al propietario (liquidación {sv.etiqueta(l['prefijo'], l['numero'])}): borra la liquidación si debe corregirse")

@router.post("/gastos", status_code=201, summary="Registra un gasto del inmueble")
def crear_gasto(d: GastoIn, usuario: Admin):
    with conexion() as con:
        sv.inmueble(con, d.inmueble_id)
        _bloquear_si_liquidado(con, d.inmueble_id, d.fecha, d.a_cargo_de)
        cur = con.execute(f"INSERT INTO gastos ({', '.join(CAMPOS_GASTO)}, creado_por) VALUES ({', '.join('?' * (len(CAMPOS_GASTO) + 1))})", [getattr(d, k) for k in CAMPOS_GASTO] + [usuario])
        auditar(con, usuario, "gasto_crear", d.inmueble_id, {"gasto": cur.lastrowid, "categoria": d.categoria})
        return _gasto_salida(_gasto(con, cur.lastrowid))

@router.get("/gastos")
def listar_gastos(_: Admin, inmueble_id: Optional[int] = None, categoria: Optional[str] = None, a_cargo_de: Optional[str] = None,
                  desde: Optional[str] = Query(None, pattern=_F), hasta: Optional[str] = Query(None, pattern=_F)):
    cond, args = [], []
    for col, val, op in (("inmueble_id", inmueble_id, "="), ("categoria", categoria, "="), ("a_cargo_de", a_cargo_de, "="), ("fecha", desde, ">="), ("fecha", hasta, "<=")):
        if val is not None:
            cond.append(f"{col} {op} ?"); args.append(val)
    with conexion() as con:
        return [_gasto_salida(r) for r in con.execute("SELECT * FROM gastos" + (" WHERE " + " AND ".join(cond) if cond else "") + " ORDER BY fecha DESC, id DESC", args)]

@router.get("/gastos/{gid}")
def ver_gasto(gid: int, _: Admin):
    with conexion() as con:
        return _gasto_salida(_gasto(con, gid))

@router.put("/gastos/{gid}")
def editar_gasto(gid: int, d: GastoIn, usuario: Admin):
    with conexion() as con:
        antes = _gasto(con, gid)
        _bloquear_si_liquidado(con, antes["inmueble_id"], antes["fecha"], antes["a_cargo_de"])
        sv.inmueble(con, d.inmueble_id)
        _bloquear_si_liquidado(con, d.inmueble_id, d.fecha, d.a_cargo_de)
        con.execute(f"UPDATE gastos SET {', '.join(k + ' = ?' for k in CAMPOS_GASTO)} WHERE id = ?", [getattr(d, k) for k in CAMPOS_GASTO] + [gid])
        auditar(con, usuario, "gasto_editar", d.inmueble_id, {"gasto": gid})
        return _gasto_salida(_gasto(con, gid))

@router.delete("/gastos/{gid}", status_code=204)
def borrar_gasto(gid: int, usuario: Admin):
    with conexion() as con:
        g = _gasto(con, gid)
        _bloquear_si_liquidado(con, g["inmueble_id"], g["fecha"], g["a_cargo_de"])
        con.execute("DELETE FROM gastos WHERE id = ?", (gid,))
        auditar(con, usuario, "gasto_borrar", g["inmueble_id"], {"gasto": gid})
    archivos.borrar(g["soporte_archivo"])

@router.post("/gastos/{gid}/soporte", summary="Adjunta el soporte del gasto (el cuerpo es el archivo: PDF, JPG, PNG o WEBP)")
async def subir_soporte_gasto(gid: int, request: Request, usuario: Admin, nombre: str = Query(min_length=1, max_length=200)):
    with conexion() as con:
        g = _gasto(con, gid)
        max_b = int(par.numero(par.todos(con), "soportes.max_mb") * 1024 * 1024)
    if int(request.headers.get("content-length") or 0) > max_b:
        raise HTTPException(413, f"El archivo supera {max_b // 1024 // 1024} MB")
    cuerpo = await request.body()
    mime, ext = archivos.validar(cuerpo, max_b)
    rel = archivos.guardar(f"gastos/{g['inmueble_id']}", cuerpo, ext)
    try:
        with conexion() as con:
            con.execute("UPDATE gastos SET soporte_archivo = ?, soporte_nombre = ?, soporte_mime = ?, soporte_tamano = ? WHERE id = ?", (rel, nombre.strip()[:200], mime, len(cuerpo), gid))
            auditar(con, usuario, "gasto_soporte", g["inmueble_id"], {"gasto": gid})
            out = _gasto_salida(_gasto(con, gid))
    except Exception:
        archivos.borrar(rel)
        raise
    archivos.borrar(g["soporte_archivo"])      # reemplaza el soporte anterior
    return out

@router.get("/gastos/{gid}/soporte", summary="Descarga el soporte (exige sesión)")
def descargar_soporte_gasto(gid: int, usuario: Admin):
    with conexion() as con:
        g = _gasto(con, gid)
        if not g["soporte_archivo"]:
            raise HTTPException(404, "El gasto no tiene soporte")
        auditar(con, usuario, "gasto_soporte_descargar", g["inmueble_id"], {"gasto": gid})
    return FileResponse(archivos.ruta_segura(g["soporte_archivo"]), media_type=g["soporte_mime"], filename=g["soporte_nombre"], content_disposition_type="attachment",
                        headers={"Cache-Control": "private, no-store", "X-Content-Type-Options": "nosniff"})

# ---------------------------------------------------------------- liquidación al propietario
def _calcular_liquidacion(con, propietario_id: int, periodo: str) -> dict:
    ini, fin = c.rango_mes(periodo)
    prop = sv.persona(con, propietario_id, "propietario")
    inmuebles = [r["inmueble_id"] for r in con.execute("SELECT inmueble_id FROM inmueble_propietario WHERE persona_id = ? ORDER BY inmueble_id", (propietario_id,))]
    if not inmuebles:
        raise HTTPException(422, "El propietario no tiene inmuebles asignados (asígnalo en la ficha del inmueble)")
    p = sv.params(con)
    canones, comision, gastos_cls, detalle = 0, 0, {"administracion": 0, "predial": 0, "reparaciones": 0, "otros": 0}, []
    for iid in inmuebles:
        inm = sv.inmueble(con, iid)
        recaudos = [dict(r) for r in con.execute(
            "SELECT r.prefijo, r.numero, r.fecha, cb.periodo, k.id AS contrato_id, k.comision_admin_pct AS pct, a.valor FROM recibo_aplicaciones a "
            "JOIN recibos_caja r ON r.id = a.recibo_id AND r.estado = 'emitido' JOIN cobros cb ON cb.id = a.cobro_id AND cb.concepto = 'canon' "
            "JOIN contratos_arriendo k ON k.id = cb.contrato_id WHERE k.inmueble_id = ? AND r.fecha BETWEEN ? AND ? ORDER BY r.fecha, r.id", (iid, ini, fin))]
        por_contrato: dict[int, list] = {}
        for r in recaudos:
            r["recibo"] = sv.etiqueta(r["prefijo"], r["numero"])
            por_contrato.setdefault(r["contrato_id"], []).append(r)
        canon_inm = sum(r["valor"] for r in recaudos)
        com_inm = sum(c.pct_de(sum(x["valor"] for x in rs), rs[0]["pct"]) for rs in por_contrato.values())
        gs = [dict(r) for r in con.execute("SELECT id, fecha, categoria, subtipo, descripcion, valor FROM gastos WHERE inmueble_id = ? AND a_cargo_de = 'propietario' AND fecha BETWEEN ? AND ? ORDER BY fecha, id", (iid, ini, fin))]
        for g in gs:
            gastos_cls[c.clasificar_gasto(g["categoria"], g["subtipo"])] += g["valor"]
        canones += canon_inm
        comision += com_inm
        detalle.append(dict(inmueble_id=iid, numero_predial=inm["numero_predial"], canones=canon_inm, comision=com_inm, recaudos=recaudos, gastos=gs))
    liq = c.liquidar(canones, 0, p["iva.pct"], bool(p["liquidacion.iva_sobre_comision"]), gastos_cls, comision=comision)
    return dict(propietario_id=propietario_id, propietario=prop["nombre"], periodo=periodo, **liq,
                detalle=dict(inmuebles=detalle, iva_pct=p["iva.pct"], cobra_iva=bool(p["liquidacion.iva_sobre_comision"])))

def _liq(con, lid: int) -> sqlite3.Row:
    r = con.execute("SELECT l.*, p.nombre AS propietario FROM liquidaciones l JOIN personas p ON p.id = l.propietario_id WHERE l.id = ?", (lid,)).fetchone()
    if not r:
        raise HTTPException(404, "Liquidación no encontrada")
    return r

def _liq_salida(r: sqlite3.Row) -> dict:
    d = dict(r)
    d["detalle"] = json.loads(d["detalle"])
    d["numero_completo"] = sv.etiqueta(r["prefijo"], r["numero"])
    return d

class LiquidarIn(BaseModel):
    propietario_id: int
    periodo: str = Field(pattern=_P)

@router.get("/liquidaciones/vista-previa", summary="Calcula la cuenta del propietario del mes sin guardarla")
def vista_previa_liquidacion(_: Admin, propietario_id: int, periodo: str = Query(pattern=_P)):
    with conexion() as con:
        out = _calcular_liquidacion(con, propietario_id, periodo)
        ex = con.execute("SELECT id FROM liquidaciones WHERE propietario_id = ? AND periodo = ?", (propietario_id, periodo)).fetchone()
        out["liquidacion_existente"] = ex["id"] if ex else None
        return out

@router.post("/liquidaciones", status_code=201, summary="Cierra la liquidación del mes de un propietario (consecutivo propio)")
def cerrar_liquidacion(d: LiquidarIn, usuario: Admin):
    if d.periodo > date.today().strftime("%Y-%m"):
        raise HTTPException(422, "No se liquida un mes futuro")
    with conexion() as con:
        if con.execute("SELECT 1 FROM liquidaciones WHERE propietario_id = ? AND periodo = ?", (d.propietario_id, d.periodo)).fetchone():
            raise HTTPException(409, "Ese propietario ya tiene liquidación de ese mes")
        v = _calcular_liquidacion(con, d.propietario_id, d.periodo)
        prefijo, numero = sv.siguiente_consecutivo(con, "liquidacion")
        cur = con.execute("INSERT INTO liquidaciones (prefijo, numero, propietario_id, periodo, canones_recibidos, comision, iva_comision, administracion, predial, reparaciones, otros, saldo_a_girar, detalle, creado_por) "
                          "VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?)", (prefijo, numero, d.propietario_id, d.periodo, v["canones_recibidos"], v["comision"], v["iva_comision"], v["administracion"], v["predial"],
                                                                   v["reparaciones"], v["otros"], v["saldo_a_girar"], json.dumps(v["detalle"], ensure_ascii=False), usuario))
        auditar(con, usuario, "liquidacion_cerrar", None, {"liquidacion": cur.lastrowid, "periodo": d.periodo})
        return _liq_salida(_liq(con, cur.lastrowid))

@router.get("/liquidaciones")
def listar_liquidaciones(_: Admin, propietario_id: Optional[int] = None, periodo: Optional[str] = Query(None, pattern=_P)):
    cond, args = [], []
    for col, val in (("l.propietario_id", propietario_id), ("l.periodo", periodo)):
        if val is not None:
            cond.append(f"{col} = ?"); args.append(val)
    with conexion() as con:
        return [_liq_salida(r) for r in con.execute("SELECT l.*, p.nombre AS propietario FROM liquidaciones l JOIN personas p ON p.id = l.propietario_id"
                                                    + (" WHERE " + " AND ".join(cond) if cond else "") + " ORDER BY l.periodo DESC, l.id DESC", args)]

@router.get("/liquidaciones/{lid}")
def ver_liquidacion(lid: int, _: Admin):
    with conexion() as con:
        return _liq_salida(_liq(con, lid))

class GiroIn(BaseModel):
    fecha: Optional[str] = Field(default=None, pattern=_F)
    referencia: Optional[str] = Field(default=None, max_length=120)

@router.post("/liquidaciones/{lid}/girar", summary="Marca el saldo como girado al propietario")
def girar_liquidacion(lid: int, d: GiroIn, usuario: Admin):
    with conexion() as con:
        l = _liq(con, lid)
        if l["estado"] == "girada":
            raise HTTPException(409, "Ya está girada")
        if l["saldo_a_girar"] <= 0:
            raise HTTPException(409, "No hay saldo a favor del propietario para girar")
        con.execute("UPDATE liquidaciones SET estado = 'girada', fecha_giro = ?, referencia_giro = ? WHERE id = ?", (d.fecha or date.today().isoformat(), d.referencia, lid))
        auditar(con, usuario, "liquidacion_girar", None, {"liquidacion": lid})
        return _liq_salida(_liq(con, lid))

@router.delete("/liquidaciones/{lid}", status_code=204, summary="Borra una liquidación cerrada (no girada) para rehacerla; el número no se reutiliza")
def borrar_liquidacion(lid: int, usuario: Admin):
    with conexion() as con:
        l = _liq(con, lid)
        if l["estado"] == "girada":
            raise HTTPException(409, "Una liquidación girada no se borra")
        con.execute("DELETE FROM liquidaciones WHERE id = ?", (lid,))
        auditar(con, usuario, "liquidacion_borrar", None, {"liquidacion": lid, "periodo": l["periodo"]})

@router.get("/liquidaciones/{lid}/pdf", response_class=Response, summary="Cuenta del propietario en PDF")
def liquidacion_pdf_(lid: int, usuario: Admin):
    from ..pdf.contable import liquidacion_pdf
    with conexion() as con:
        liq = _liq_salida(_liq(con, lid))
        prop = dict(sv.persona(con, liq["propietario_id"], "propietario"))
        auditar(con, usuario, "liquidacion_pdf", None, {"liquidacion": lid})
    return Response(liquidacion_pdf(liq, prop), media_type="application/pdf", headers={"Content-Disposition": f'inline; filename="liquidacion-{liq["numero_completo"]}.pdf"', "Cache-Control": "no-store"})

# ---------------------------------------------------------------- impuestos (resumen para el contador)
@router.get("/impuestos/resumen", summary="Resumen mensual para el contador (IVA, retenciones, ICA); formato=xlsx para Excel")
def resumen_impuestos(_: Admin, periodo: str = Query(pattern=_P), formato: Formato = "json"):
    ini, fin = c.rango_mes(periodo)
    with conexion() as con:
        p = sv.params(con)
        docs = [dict(r) for r in con.execute("SELECT f.*, pe.nombre AS cliente, pe.documento_tipo, pe.documento FROM facturas f JOIN personas pe ON pe.id = f.cliente_id WHERE f.fecha BETWEEN ? AND ? ORDER BY f.fecha, f.id", (ini, fin))]
        coms = [dict(r) for r in con.execute("SELECT * FROM comisiones WHERE estado IN ('facturada','cobrada') AND fecha BETWEEN ? AND ? ORDER BY fecha, id", (ini, fin))]
    res = c.resumen_impuestos(docs, p["ica.por_mil"])
    por_tipo = {"venta": 0, "arriendo": 0}
    for cm in coms:
        por_tipo[cm["tipo"]] += cm["valor_comision"]
    out = dict(periodo=periodo, **res, ingresos_por_tipo=por_tipo, parametros={k: p[k] for k in ("iva.pct", "retefuente.pct", "reteica.por_mil", "ica.por_mil", "reteiva.pct_del_iva")},
               aviso="Valores calculados con parámetros por confirmar: valídalos con tu contador antes de declarar.", documentos=docs)
    if formato == "json":
        return out
    hojas = {
        "Resumen": [["Concepto", "Valor"], ["Periodo", periodo], ["Facturas emitidas", res["facturas"]], ["Notas crédito emitidas", res["notas_credito"]], ["Ingresos netos (antes de IVA)", res["ingresos_netos"]],
                    ["IVA generado (neto de notas)", res["iva_generado"]], ["Total facturado", res["total_facturado"]], ["Retención en la fuente", res["retefuente"]], ["Retención de ICA", res["reteica"]],
                    ["Retención de IVA", res["reteiva"]], [f"ICA causado ({res['ica_por_mil']:g} por mil)", res["ica_causado"]], ["Ingresos comisión por ventas", por_tipo["venta"]],
                    ["Ingresos comisión por arriendos", por_tipo["arriendo"]], ["Nota", out["aviso"]]],
        "Facturas y notas crédito": [["Tipo", "Número", "Fecha", "Cliente", "Documento", "Concepto", "Subtotal", "IVA", "Total", "ReteFuente", "ReteICA", "ReteIVA", "DIAN", "CUFE/CUDE"]] +
                                    [[d["tipo"], sv.etiqueta(d["prefijo"], d["numero"]), d["fecha"], d["cliente"], f"{d['documento_tipo']} {d['documento']}", d["concepto"], d["subtotal"], d["iva"], d["total"],
                                      d["retefuente"], d["reteica"], d["reteiva"], d["dian_estado"], d["dian_cufe"]] for d in docs],
        "Comisiones": [["Fecha", "Tipo", "Inmueble", "Base", "% pactado", "Comisión", "IVA", "Estado", "Pagador", "Asesor", "Valor asesor", "Referido", "Valor referido", "Inmobiliaria"]] +
                      [[m["fecha"], m["tipo"], m["inmueble_id"], m["base"], m["pct_pactado"], m["valor_comision"], m["iva"], m["estado"], m["pagador"], m["asesor"], m["asesor_valor"], m["referido"],
                        m["referido_valor"], m["inmobiliaria_valor"]] for m in coms],
    }
    return excel.respuesta(hojas, f"resumen-contador-{periodo}")

# ---------------------------------------------------------------- reportes
def _mes(f: str) -> str:
    return f[:7]

@router.get("/reportes/comisiones", summary="Ingresos por comisión: devengado, cobrado, por tipo y por asesor")
def reporte_comisiones(_: Admin, desde: str = Query(pattern=_F), hasta: str = Query(pattern=_F), formato: Formato = "json"):
    with conexion() as con:
        dev = [dict(r) for r in con.execute("SELECT * FROM comisiones WHERE estado IN ('facturada','cobrada') AND fecha BETWEEN ? AND ?", (desde, hasta))]
        cob = [dict(r) for r in con.execute("SELECT * FROM comisiones WHERE estado = 'cobrada' AND fecha_cobro BETWEEN ? AND ?", (desde, hasta))]
    meses: dict[str, dict] = {}
    for m in dev:
        x = meses.setdefault(_mes(m["fecha"]), dict(mes=_mes(m["fecha"]), devengado=0, iva=0, cobrado=0, comisiones=0))
        x["devengado"] += m["valor_comision"]; x["iva"] += m["iva"]; x["comisiones"] += 1
    for m in cob:
        meses.setdefault(_mes(m["fecha_cobro"]), dict(mes=_mes(m["fecha_cobro"]), devengado=0, iva=0, cobrado=0, comisiones=0))["cobrado"] += m["valor_comision"]
    por_tipo = {t: sum(m["valor_comision"] for m in dev if m["tipo"] == t) for t in ("venta", "arriendo")}
    asesores: dict[str, dict] = {}
    for m in dev:
        for nombre, valor in ((m["asesor"], m["asesor_valor"]), (m["referido"], m["referido_valor"])):
            if nombre:
                a = asesores.setdefault(nombre, dict(nombre=nombre, comisiones=0, valor=0)); a["comisiones"] += 1; a["valor"] += valor
    out = dict(desde=desde, hasta=hasta, total_devengado=sum(m["valor_comision"] for m in dev), total_cobrado=sum(m["valor_comision"] for m in cob),
               parte_inmobiliaria=sum(m["inmobiliaria_valor"] for m in dev), por_mes=sorted(meses.values(), key=lambda m: m["mes"]), por_tipo=por_tipo, por_asesor=sorted(asesores.values(), key=lambda a: -a["valor"]))
    if formato == "json":
        return out
    return excel.respuesta({"Por mes": [["Mes", "Devengado", "IVA", "Cobrado", "N.º comisiones"]] + [[m["mes"], m["devengado"], m["iva"], m["cobrado"], m["comisiones"]] for m in out["por_mes"]],
                            "Por asesor": [["Asesor/Referido", "Comisiones", "Valor"]] + [[a["nombre"], a["comisiones"], a["valor"]] for a in out["por_asesor"]]}, f"comisiones-{desde}-{hasta}")

@router.get("/reportes/flujo-caja", summary="Flujo de caja mensual de la inmobiliaria")
def flujo_caja(_: Admin, desde: str = Query(pattern=_F), hasta: str = Query(pattern=_F), formato: Formato = "json"):
    """Entradas: recibos de caja (cánones y otros recaudos) + comisiones cobradas (neto de retenciones). Salidas: gastos pagados a cargo
    del propietario o de la inmobiliaria + giros a propietarios. # CONFIRMAR con un contador: es una vista de caja, no contabilidad causada."""
    meses: dict[str, dict] = {}
    def m(f):
        return meses.setdefault(_mes(f), dict(mes=_mes(f), recaudos=0, comisiones_cobradas=0, gastos_pagados=0, giros=0))
    with conexion() as con:
        for r in con.execute("SELECT fecha, valor FROM recibos_caja WHERE estado = 'emitido' AND fecha BETWEEN ? AND ?", (desde, hasta)):
            m(r["fecha"])["recaudos"] += r["valor"]
        for r in con.execute("SELECT fecha_cobro, neto_a_recibir FROM comisiones WHERE estado = 'cobrada' AND fecha_cobro BETWEEN ? AND ?", (desde, hasta)):
            m(r["fecha_cobro"])["comisiones_cobradas"] += r["neto_a_recibir"]
        for r in con.execute("SELECT fecha, valor FROM gastos WHERE estado_pago = 'pagado' AND a_cargo_de IN ('propietario','inmobiliaria') AND fecha BETWEEN ? AND ?", (desde, hasta)):
            m(r["fecha"])["gastos_pagados"] += r["valor"]
        for r in con.execute("SELECT fecha_giro, saldo_a_girar FROM liquidaciones WHERE estado = 'girada' AND fecha_giro BETWEEN ? AND ?", (desde, hasta)):
            m(r["fecha_giro"])["giros"] += r["saldo_a_girar"]
    filas = sorted(meses.values(), key=lambda x: x["mes"])
    acum = 0
    for f in filas:
        f["entradas"] = f["recaudos"] + f["comisiones_cobradas"]
        f["salidas"] = f["gastos_pagados"] + f["giros"]
        f["neto"] = f["entradas"] - f["salidas"]
        acum += f["neto"]
        f["acumulado"] = acum
    out = dict(desde=desde, hasta=hasta, meses=filas, total_entradas=sum(f["entradas"] for f in filas), total_salidas=sum(f["salidas"] for f in filas), neto=acum)
    if formato == "json":
        return out
    return excel.respuesta({"Flujo de caja": [["Mes", "Recaudos (recibos)", "Comisiones cobradas (neto)", "Entradas", "Gastos pagados", "Giros a propietarios", "Salidas", "Neto", "Acumulado"]] +
                            [[f["mes"], f["recaudos"], f["comisiones_cobradas"], f["entradas"], f["gastos_pagados"], f["giros"], f["salidas"], f["neto"], f["acumulado"]] for f in filas]}, f"flujo-caja-{desde}-{hasta}")

@router.get("/reportes/ocupacion", summary="Ocupación de los inmuebles en arriendo a una fecha")
def ocupacion(_: Admin, corte: Optional[str] = Query(None, pattern=_F), formato: Formato = "json"):
    hoy = corte or date.today().isoformat()
    with conexion() as con:
        ocupados = {r["inmueble_id"]: dict(r) for r in con.execute(
            "SELECT inmueble_id, id AS contrato_id, fecha_fin, canon_inicial FROM contratos_arriendo WHERE estado = 'vigente' AND fecha_inicio <= ? AND fecha_fin >= ?", (hoy, hoy))}
        admin = {r["id"]: dict(r) for r in con.execute(
            "SELECT id, tipo, numero_predial FROM inmuebles WHERE (operacion = 'arriendo' AND estado_publicacion != 'borrador') OR id IN (SELECT inmueble_id FROM contratos_arriendo WHERE estado = 'vigente')")}
        vac = []
        for iid, i in admin.items():
            if iid not in ocupados:
                ult = con.execute("SELECT MAX(COALESCE(fecha_terminacion, fecha_fin)) FROM contratos_arriendo WHERE inmueble_id = ?", (iid,)).fetchone()[0]
                vac.append(dict(inmueble_id=iid, tipo=i["tipo"], numero_predial=i["numero_predial"], vacante_desde=ult,
                                dias_vacante=(date.fromisoformat(hoy) - date.fromisoformat(ult)).days if ult and ult <= hoy else None))
    total = len(admin)
    out = dict(corte=hoy, inmuebles_administrados=total, ocupados=len(ocupados), vacantes=len(vac), ocupacion_pct=round(100 * len(ocupados) / total, 1) if total else None,
               detalle_ocupados=list(ocupados.values()), detalle_vacantes=sorted(vac, key=lambda v: -(v["dias_vacante"] or 0)))
    if formato == "json":
        return out
    return excel.respuesta({"Vacantes": [["Inmueble", "Tipo", "Predial", "Vacante desde", "Días vacante"]] + [[v["inmueble_id"], v["tipo"], v["numero_predial"], v["vacante_desde"], v["dias_vacante"]] for v in out["detalle_vacantes"]],
                            "Ocupados": [["Inmueble", "Contrato", "Vence", "Canon inicial"]] + [[o["inmueble_id"], o["contrato_id"], o["fecha_fin"], o["canon_inicial"]] for o in out["detalle_ocupados"]]}, f"ocupacion-{hoy}")

@router.get("/reportes/rentabilidad", summary="Rentabilidad por inmueble: teórica (canon anual / valor) y real (cánones − gastos del propietario)")
def rentabilidad(_: Admin, corte: Optional[str] = Query(None, pattern=_F), meses: int = Query(12, ge=1, le=60), formato: Formato = "json"):
    from ..admin.router_comparables import _calcular
    hoy = date.fromisoformat(corte) if corte else date.today()
    desde = (hoy.replace(day=1) - timedelta(days=30 * (meses - 1))).replace(day=1).isoformat()
    filas = []
    with conexion() as con:
        p, ipc = sv.params(con), sv.ipc(con)
        for k in con.execute("SELECT * FROM contratos_arriendo WHERE estado = 'vigente' AND fecha_inicio <= ? AND fecha_fin >= ?", (hoy.isoformat(), hoy.isoformat())):
            inm = sv.inmueble(con, k["inmueble_id"])
            canon = c.canon_vigente(k["canon_inicial"], date.fromisoformat(k["fecha_inicio"]), hoy, ipc, p["contrato.incremento_max_pct_ipc"], bool(k["incremento_ipc"]))["canon"]
            valor = k["valor_comercial_ref"] or inm["avaluo"] or _calcular(con, inm)[0]["valor_estimado"]
            ingresos = con.execute("SELECT COALESCE(SUM(a.valor),0) FROM recibo_aplicaciones a JOIN recibos_caja r ON r.id = a.recibo_id AND r.estado = 'emitido' JOIN cobros cb ON cb.id = a.cobro_id AND cb.concepto = 'canon' "
                                   "JOIN contratos_arriendo kk ON kk.id = cb.contrato_id WHERE kk.inmueble_id = ? AND r.fecha BETWEEN ? AND ?", (inm["id"], desde, hoy.isoformat())).fetchone()[0]
            gastos = con.execute("SELECT COALESCE(SUM(valor),0) FROM gastos WHERE inmueble_id = ? AND a_cargo_de = 'propietario' AND fecha BETWEEN ? AND ?", (inm["id"], desde, hoy.isoformat())).fetchone()[0]
            real = round(100 * (ingresos - gastos) * (12 / meses) / valor, 2) if valor else None
            filas.append(dict(inmueble_id=inm["id"], tipo=inm["tipo"], contrato_id=k["id"], canon_mensual=canon, valor=valor, rentabilidad_teorica_pct=round(100 * canon * 12 / valor, 2) if valor else None,
                              ingresos_periodo=ingresos, gastos_propietario_periodo=gastos, rentabilidad_real_pct=real))
    out = dict(corte=hoy.isoformat(), desde=desde, meses=meses, inmuebles=filas,
               nota="Rentabilidad real = (cánones recibidos − gastos a cargo del propietario) del periodo, anualizada, sobre el valor del inmueble. Bruta de impuestos de renta.")
    if formato == "json":
        return out
    return excel.respuesta({"Rentabilidad": [["Inmueble", "Tipo", "Contrato", "Canon mensual", "Valor", "Rentab. teórica %", "Ingresos periodo", "Gastos propietario", "Rentab. real %"]] +
                            [[f["inmueble_id"], f["tipo"], f["contrato_id"], f["canon_mensual"], f["valor"], f["rentabilidad_teorica_pct"], f["ingresos_periodo"], f["gastos_propietario_periodo"], f["rentabilidad_real_pct"]] for f in filas]},
                           f"rentabilidad-{hoy.isoformat()}")
