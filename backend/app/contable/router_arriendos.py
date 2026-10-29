"""Contratos de arriendo (canon con IPC, depósito, codeudores, alertas, regla del 1 % de la Ley 820), cobros, cartera y mora,
recibos de caja y paz y salvo. Solo administrador. Cálculos en calculos.py."""
import sqlite3
from datetime import date
from typing import Literal, Optional

from fastapi import APIRouter, HTTPException, Query, Response
from pydantic import BaseModel, Field, model_validator

from ..admin.db import auditar, conexion
from ..admin.router import Admin
from . import calculos as c
from . import servicio as sv

router = APIRouter(prefix="/admin", tags=["admin · contabilidad · arriendos y cartera"])
_F = r"^\d{4}-\d{2}-\d{2}$"
_P = r"^\d{4}-(0[1-9]|1[0-2])$"

# ---------------------------------------------------------------- contratos
class ContratoIn(BaseModel):
    inmueble_id: int
    arrendatario_id: int
    uso: Literal["vivienda_urbana", "comercial", "otro"] = "vivienda_urbana"
    canon_inicial: int = Field(gt=0, le=10**11)
    fecha_inicio: str = Field(pattern=_F)
    fecha_fin: str = Field(pattern=_F)
    dia_pago: int = Field(default=5, ge=1, le=28)
    deposito: int = Field(default=0, ge=0, le=10**11)
    comision_admin_pct: Optional[float] = Field(default=None, ge=0, le=100, description="Por defecto, el parámetro comision.administracion_pct")
    valor_comercial_ref: Optional[int] = Field(default=None, gt=0, le=10**13)
    incremento_ipc: bool = True
    notas: Optional[str] = Field(default=None, max_length=1000)
    codeudores: list[int] = Field(default_factory=list, max_length=5)

    @model_validator(mode="after")
    def _fechas(self):
        if date.fromisoformat(self.fecha_fin) <= date.fromisoformat(self.fecha_inicio):
            raise ValueError("La fecha de fin debe ser posterior a la de inicio")
        if self.arrendatario_id in self.codeudores:
            raise ValueError("El arrendatario no puede ser su propio codeudor")
        return self

def _contrato(con, kid: int) -> sqlite3.Row:
    r = con.execute("SELECT * FROM contratos_arriendo WHERE id = ?", (kid,)).fetchone()
    if not r:
        raise HTTPException(404, "Contrato no encontrado")
    return r

def _valor_comercial(con, k: sqlite3.Row, inm: sqlite3.Row) -> tuple[Optional[int], Optional[str]]:
    """Base de la regla del 1 %: el valor comercial del contrato; si falta, el avalúo; si falta, el estimado por comparables."""
    if k["valor_comercial_ref"]:
        return k["valor_comercial_ref"], "valor comercial indicado en el contrato"
    if inm["avaluo"]:
        return inm["avaluo"], "avalúo registrado del inmueble"
    from ..admin.router_comparables import _calcular   # import tardío: evita ciclos
    est = _calcular(con, inm)[0]["valor_estimado"]
    return (est, "valor estimado por comparables") if est else (None, None)

def _mora_contrato(con, kid: int, hoy: date, p: dict) -> dict:
    vencidos = []
    for cb in sv.cobros_con_saldo(con, "AND c.contrato_id = ?", (kid,)):
        venc = date.fromisoformat(cb["fecha_vencimiento"])
        if cb["saldo"] > 0 and venc <= hoy:
            d = c.dias_mora(venc, hoy, int(p["mora.dias_gracia"]))
            vencidos.append(dict(id=cb["id"], periodo=cb["periodo"], concepto=cb["concepto"], fecha_vencimiento=cb["fecha_vencimiento"], valor=cb["valor"], pagado=cb["pagado"],
                                 saldo=cb["saldo"], dias_mora=d, interes=c.interes_mora(cb["saldo"], d, p["mora.tasa_mensual_pct"])))
    return dict(cobros=vencidos, saldo_vencido=sum(v["saldo"] for v in vencidos), interes=sum(v["interes"] for v in vencidos),
                dias_max=max((v["dias_mora"] for v in vencidos), default=0))

def _estado(con, k: sqlite3.Row, hoy: date, p: dict, ipc: dict) -> dict:
    """Canon vigente, regla del 1 %, vencimiento, mora y la lista de alertas de un contrato."""
    inm = sv.inmueble(con, k["inmueble_id"])
    cv = c.canon_vigente(k["canon_inicial"], date.fromisoformat(k["fecha_inicio"]), hoy, ipc, p["contrato.incremento_max_pct_ipc"], bool(k["incremento_ipc"]))
    valor, origen = _valor_comercial(con, k, inm)
    ley = c.limite_canon_ley820(cv["canon"], valor, k["uso"], p["canon.max_pct_valor_comercial"])
    ley["valor_comercial"], ley["origen_valor"] = valor, origen
    dias = c.dias_para_vencer(date.fromisoformat(k["fecha_fin"]), hoy)
    mora = _mora_contrato(con, k["id"], hoy, p)
    alertas = []
    if k["estado"] == "vigente":
        if dias < 0:
            alertas.append(dict(codigo="vencido", nivel="rojo", texto=f"El contrato venció hace {-dias} días y sigue vigente: renueva o termínalo"))
        elif dias <= p["contrato.dias_alerta_renovacion"]:
            alertas.append(dict(codigo="renovacion", nivel="amarillo", texto=f"El contrato vence en {dias} días ({k['fecha_fin']}): gestiona la renovación"))
        if ley["excede"]:
            alertas.append(dict(codigo="canon_ley820", nivel="rojo", texto=f"El canon ({cv['canon']:,}) supera el {p['canon.max_pct_valor_comercial']:g} % del valor comercial (máximo {ley['limite']:,}; exceso {ley['exceso']:,})".replace(",", ".")))
        if cv["faltantes"]:
            alertas.append(dict(codigo="ipc_faltante", nivel="amarillo", texto=f"Falta cargar el IPC de {', '.join(map(str, cv['faltantes']))} para aplicar el incremento del canon"))
        if mora["saldo_vencido"] > 0:
            alertas.append(dict(codigo="mora", nivel="rojo", texto=f"Cartera en mora: {mora['saldo_vencido']:,} con hasta {mora['dias_max']} días".replace(",", ".")))
    return dict(canon_vigente=cv["canon"], aumentos=cv["aumentos"], ipc_faltante=cv["faltantes"], ley820=ley, dias_para_vencer=dias, mora=mora, alertas=alertas)

def _salida(con, k: sqlite3.Row, hoy: date, p: dict, ipc: dict) -> dict:
    d = dict(k)
    d["incremento_ipc"] = bool(d["incremento_ipc"])
    d["arrendatario"] = dict(sv.persona(con, k["arrendatario_id"], "arrendatario"))
    d["codeudores"] = [dict(r) for r in con.execute("SELECT p.* FROM contrato_codeudores cc JOIN personas p ON p.id = cc.persona_id WHERE cc.contrato_id = ?", (k["id"],))]
    d.update(_estado(con, k, hoy, p, ipc))
    return d

def _hoy(corte: Optional[str]) -> date:
    return date.fromisoformat(corte) if corte else date.today()

@router.post("/contratos", status_code=201, summary="Crea un contrato de arriendo")
def crear_contrato(d: ContratoIn, usuario: Admin):
    with conexion() as con:
        sv.inmueble(con, d.inmueble_id)
        sv.persona(con, d.arrendatario_id, "arrendatario")
        for pid in d.codeudores:
            sv.persona(con, pid, "codeudor")
        if con.execute("SELECT 1 FROM contratos_arriendo WHERE inmueble_id = ? AND estado = 'vigente' AND fecha_inicio < ? AND fecha_fin > ?",
                       (d.inmueble_id, d.fecha_fin, d.fecha_inicio)).fetchone():
            raise HTTPException(409, "El inmueble ya tiene un contrato vigente que se cruza con esas fechas")
        p = sv.params(con)
        pct = d.comision_admin_pct if d.comision_admin_pct is not None else p["comision.administracion_pct"]
        cur = con.execute("INSERT INTO contratos_arriendo (inmueble_id, arrendatario_id, uso, canon_inicial, fecha_inicio, fecha_fin, dia_pago, deposito, comision_admin_pct, "
                          "valor_comercial_ref, incremento_ipc, notas) VALUES (?,?,?,?,?,?,?,?,?,?,?,?)",
                          (d.inmueble_id, d.arrendatario_id, d.uso, d.canon_inicial, d.fecha_inicio, d.fecha_fin, d.dia_pago, d.deposito, pct, d.valor_comercial_ref, int(d.incremento_ipc), d.notas))
        for pid in set(d.codeudores):
            con.execute("INSERT INTO contrato_codeudores (contrato_id, persona_id) VALUES (?,?)", (cur.lastrowid, pid))
        auditar(con, usuario, "contrato_crear", d.inmueble_id, {"contrato": cur.lastrowid})
        return _salida(con, _contrato(con, cur.lastrowid), date.today(), p, sv.ipc(con))

@router.get("/contratos", summary="Contratos con canon vigente, vencimiento y alertas")
def listar_contratos(_: Admin, estado: Optional[Literal["vigente", "terminado"]] = None, inmueble_id: Optional[int] = None, corte: Optional[str] = Query(None, pattern=_F)):
    cond, args = [], []
    if estado:
        cond.append("estado = ?"); args.append(estado)
    if inmueble_id:
        cond.append("inmueble_id = ?"); args.append(inmueble_id)
    with conexion() as con:
        p, ipc = sv.params(con), sv.ipc(con)
        return [_salida(con, k, _hoy(corte), p, ipc) for k in con.execute("SELECT * FROM contratos_arriendo" + (" WHERE " + " AND ".join(cond) if cond else "") + " ORDER BY fecha_fin", args)]

@router.get("/contratos/alertas", summary="Alertas de todos los contratos vigentes (renovación, 1 %, IPC, mora)")
def alertas_contratos(_: Admin, corte: Optional[str] = Query(None, pattern=_F)):
    with conexion() as con:
        p, ipc, out = sv.params(con), sv.ipc(con), []
        for k in con.execute("SELECT * FROM contratos_arriendo WHERE estado = 'vigente' ORDER BY fecha_fin"):
            for a in _estado(con, k, _hoy(corte), p, ipc)["alertas"]:
                out.append(dict(contrato_id=k["id"], inmueble_id=k["inmueble_id"], **a))
        return sorted(out, key=lambda a: (a["nivel"] != "rojo", a["contrato_id"]))

@router.get("/contratos/{kid}")
def ver_contrato(kid: int, _: Admin, corte: Optional[str] = Query(None, pattern=_F)):
    with conexion() as con:
        return _salida(con, _contrato(con, kid), _hoy(corte), sv.params(con), sv.ipc(con))

class TerminarIn(BaseModel):
    fecha: Optional[str] = Field(default=None, pattern=_F)
    nota: Optional[str] = Field(default=None, max_length=500)

@router.post("/contratos/{kid}/terminar")
def terminar_contrato(kid: int, d: TerminarIn, usuario: Admin):
    with conexion() as con:
        k = _contrato(con, kid)
        if k["estado"] != "vigente":
            raise HTTPException(409, "El contrato ya está terminado")
        con.execute("UPDATE contratos_arriendo SET estado = 'terminado', fecha_terminacion = ?, notas = COALESCE(?, notas) WHERE id = ?", (d.fecha or date.today().isoformat(), d.nota, kid))
        auditar(con, usuario, "contrato_terminar", k["inmueble_id"], {"contrato": kid})
        return _salida(con, _contrato(con, kid), date.today(), sv.params(con), sv.ipc(con))

# ---------------------------------------------------------------- cobros
class GenerarIn(BaseModel):
    periodo: str = Field(pattern=_P)

@router.post("/cobros/generar", summary="Genera el cobro del canon del mes para todos los contratos vigentes (repetible: no duplica)")
def generar_cobros(d: GenerarIn, usuario: Admin):
    ini, fin = c.rango_mes(d.periodo)
    with conexion() as con:
        p, ipc = sv.params(con), sv.ipc(con)
        creados, existentes, avisos = [], 0, []
        for k in con.execute("SELECT * FROM contratos_arriendo WHERE estado = 'vigente' AND fecha_inicio <= ? AND fecha_fin >= ?", (fin, ini)):
            venc = c.fecha_vencimiento_periodo(d.periodo, k["dia_pago"])
            cv = c.canon_vigente(k["canon_inicial"], date.fromisoformat(k["fecha_inicio"]), venc, ipc, p["contrato.incremento_max_pct_ipc"], bool(k["incremento_ipc"]))
            if cv["faltantes"]:
                avisos.append(f"Contrato {k['id']}: falta el IPC de {', '.join(map(str, cv['faltantes']))}; el cobro sale sin ese incremento")
            try:
                cur = con.execute("INSERT INTO cobros (contrato_id, periodo, concepto, fecha_vencimiento, valor) VALUES (?, ?, 'canon', ?, ?)", (k["id"], d.periodo, venc.isoformat(), cv["canon"]))
                creados.append(dict(cobro_id=cur.lastrowid, contrato_id=k["id"], valor=cv["canon"], fecha_vencimiento=venc.isoformat()))
            except sqlite3.IntegrityError:
                existentes += 1
        auditar(con, usuario, "cobros_generar", None, {"periodo": d.periodo, "creados": len(creados)})
        return dict(periodo=d.periodo, creados=creados, ya_existian=existentes, avisos=avisos)

class CobroIn(BaseModel):
    periodo: str = Field(pattern=_P)
    concepto: Literal["administracion", "servicios", "mora", "otro"] = "otro"
    valor: int = Field(gt=0, le=10**11)
    fecha_vencimiento: str = Field(pattern=_F)
    nota: Optional[str] = Field(default=None, max_length=300)

@router.post("/contratos/{kid}/cobros", status_code=201, summary="Agrega un cobro adicional (administración, servicios, mora…)")
def crear_cobro(kid: int, d: CobroIn, usuario: Admin):
    with conexion() as con:
        k = _contrato(con, kid)
        cur = con.execute("INSERT INTO cobros (contrato_id, periodo, concepto, fecha_vencimiento, valor, nota) VALUES (?,?,?,?,?,?)", (kid, d.periodo, d.concepto, d.fecha_vencimiento, d.valor, d.nota))
        auditar(con, usuario, "cobro_crear", k["inmueble_id"], {"cobro": cur.lastrowid})
        return sv.cobros_con_saldo(con, "AND c.id = ?", (cur.lastrowid,))[0]

@router.get("/contratos/{kid}/cobros")
def cobros_de(kid: int, _: Admin):
    with conexion() as con:
        _contrato(con, kid)
        return sv.cobros_con_saldo(con, "AND c.contrato_id = ?", (kid,))

@router.post("/cobros/{cid}/anular", summary="Anula un cobro (no se borra)")
def anular_cobro(cid: int, usuario: Admin):
    with conexion() as con:
        r = sv.cobros_con_saldo(con, "AND c.id = ?", (cid,))
        if not r:
            raise HTTPException(404, "Cobro no encontrado")
        if r[0]["pagado"] > 0:
            raise HTTPException(409, "El cobro tiene pagos aplicados: anula primero los recibos")
        con.execute("UPDATE cobros SET anulado = 1 WHERE id = ?", (cid,))
        auditar(con, usuario, "cobro_anular", None, {"cobro": cid})
        return {"id": cid, "anulado": True}

# ---------------------------------------------------------------- cartera y cobranza
@router.get("/cartera", summary="Cartera: cobros vencidos, días de mora, intereses y tramos de edad")
def cartera(_: Admin, corte: Optional[str] = Query(None, pattern=_F)):
    hoy = _hoy(corte)
    with conexion() as con:
        p = sv.params(con)
        filas, tramos, por_cobrar = [], {t: 0 for t in ("1-30", "31-60", "61-90", "mas_de_90")}, 0
        for cb in sv.cobros_con_saldo(con, "AND c.fecha_vencimiento > ?", (hoy.isoformat(),)):
            por_cobrar += cb["saldo"]
        for k in con.execute("SELECT k.id, k.inmueble_id, k.estado, pe.nombre AS arrendatario, pe.telefono, pe.email FROM contratos_arriendo k JOIN personas pe ON pe.id = k.arrendatario_id"):
            m = _mora_contrato(con, k["id"], hoy, p)
            if not m["saldo_vencido"]:
                continue
            for v in m["cobros"]:
                if v["dias_mora"] > 0:
                    tramos[c.tramo_mora(v["dias_mora"])] += v["saldo"]
            filas.append(dict(contrato_id=k["id"], inmueble_id=k["inmueble_id"], contrato_estado=k["estado"], arrendatario=k["arrendatario"], telefono=k["telefono"], email=k["email"],
                              tramo=c.tramo_mora(m["dias_max"]), **m))
        filas.sort(key=lambda f: -f["dias_max"])
        return dict(corte=hoy.isoformat(), saldo_vencido=sum(f["saldo_vencido"] for f in filas), interes_mora=sum(f["interes"] for f in filas), por_cobrar=por_cobrar,
                    tramos=tramos, contratos_en_mora=len(filas), contratos=filas)

# ---------------------------------------------------------------- recibos de caja
class AplicacionIn(BaseModel):
    cobro_id: int
    valor: int = Field(gt=0)

class ReciboIn(BaseModel):
    valor: int = Field(gt=0, le=10**12)
    fecha: Optional[str] = Field(default=None, pattern=_F)
    medio: Literal["efectivo", "transferencia", "consignacion", "pse", "cheque", "otro"] = "efectivo"
    referencia: Optional[str] = Field(default=None, max_length=100)
    nota: Optional[str] = Field(default=None, max_length=300)
    persona_id: Optional[int] = None
    contrato_id: Optional[int] = Field(default=None, description="Si se indica y no hay `aplicaciones`, el pago se aplica solo a los cobros más antiguos de ese contrato")
    aplicaciones: Optional[list[AplicacionIn]] = None

def _recibo_salida(con, r: sqlite3.Row) -> dict:
    d = dict(r)
    d["numero_completo"] = sv.etiqueta(r["prefijo"], r["numero"])
    d["aplicaciones"] = [dict(a) for a in con.execute(
        "SELECT a.id, a.cobro_id, a.valor, cb.periodo, cb.concepto, cb.contrato_id FROM recibo_aplicaciones a JOIN cobros cb ON cb.id = a.cobro_id WHERE a.recibo_id = ? ORDER BY a.id", (r["id"],))]
    d["sin_aplicar"] = r["valor"] - sum(a["valor"] for a in d["aplicaciones"])
    return d

@router.post("/recibos", status_code=201, summary="Emite un recibo de caja y aplica el pago a los cobros")
def crear_recibo(d: ReciboIn, usuario: Admin):
    with conexion() as con:
        persona_id, saldos = d.persona_id, {}
        if d.contrato_id is not None:
            k = _contrato(con, d.contrato_id)
            persona_id = persona_id or k["arrendatario_id"]
        if persona_id:
            sv.persona(con, persona_id)
        if d.aplicaciones is not None:
            ids = [a.cobro_id for a in d.aplicaciones]
            saldos = {cb["id"]: cb["saldo"] for cb in sv.cobros_con_saldo(con, f"AND c.id IN ({','.join('?' * len(ids))})", tuple(ids)) if cb["saldo"] > 0} if ids else {}
            aplic = [(a.cobro_id, a.valor) for a in d.aplicaciones]
            try:
                c.validar_aplicaciones(d.valor, aplic, saldos)
            except ValueError as e:
                raise HTTPException(422, str(e))
        elif d.contrato_id is not None:
            pend = [cb for cb in sv.cobros_con_saldo(con, "AND c.contrato_id = ?", (d.contrato_id,)) if cb["saldo"] > 0]
            aplic, _sobra = c.aplicar_pago(d.valor, pend)
        else:
            aplic = []
        hoy = d.fecha or date.today().isoformat()
        prefijo, numero = sv.siguiente_consecutivo(con, "recibo_caja", date.fromisoformat(hoy))
        cur = con.execute("INSERT INTO recibos_caja (prefijo, numero, fecha, persona_id, valor, medio, referencia, nota, creado_por) VALUES (?,?,?,?,?,?,?,?,?)",
                          (prefijo, numero, hoy, persona_id, d.valor, d.medio, d.referencia, d.nota, usuario))
        for cid, v in aplic:
            con.execute("INSERT INTO recibo_aplicaciones (recibo_id, cobro_id, valor) VALUES (?,?,?)", (cur.lastrowid, cid, v))
        auditar(con, usuario, "recibo_emitir", None, {"recibo": cur.lastrowid})
        return _recibo_salida(con, con.execute("SELECT * FROM recibos_caja WHERE id = ?", (cur.lastrowid,)).fetchone())

@router.get("/recibos")
def listar_recibos(_: Admin, contrato_id: Optional[int] = None, desde: Optional[str] = Query(None, pattern=_F), hasta: Optional[str] = Query(None, pattern=_F)):
    cond, args = [], []
    if desde:
        cond.append("r.fecha >= ?"); args.append(desde)
    if hasta:
        cond.append("r.fecha <= ?"); args.append(hasta)
    if contrato_id:
        cond.append("EXISTS (SELECT 1 FROM recibo_aplicaciones a JOIN cobros cb ON cb.id = a.cobro_id WHERE a.recibo_id = r.id AND cb.contrato_id = ?)"); args.append(contrato_id)
    with conexion() as con:
        return [_recibo_salida(con, r) for r in con.execute("SELECT r.* FROM recibos_caja r" + (" WHERE " + " AND ".join(cond) if cond else "") + " ORDER BY r.fecha DESC, r.id DESC", args)]

def _recibo(con, rid: int) -> sqlite3.Row:
    r = con.execute("SELECT * FROM recibos_caja WHERE id = ?", (rid,)).fetchone()
    if not r:
        raise HTTPException(404, "Recibo no encontrado")
    return r

@router.get("/recibos/{rid}")
def ver_recibo(rid: int, _: Admin):
    with conexion() as con:
        return _recibo_salida(con, _recibo(con, rid))

@router.post("/recibos/{rid}/anular", summary="Anula un recibo: los cobros vuelven a quedar pendientes")
def anular_recibo(rid: int, usuario: Admin):
    with conexion() as con:
        r = _recibo(con, rid)
        if r["estado"] == "anulado":
            raise HTTPException(409, "El recibo ya está anulado")
        con.execute("UPDATE recibos_caja SET estado = 'anulado' WHERE id = ?", (rid,))
        auditar(con, usuario, "recibo_anular", None, {"recibo": rid})
        return _recibo_salida(con, _recibo(con, rid))

@router.get("/recibos/{rid}/pdf", response_class=Response)
def recibo_pdf_(rid: int, usuario: Admin):
    from ..pdf.contable import recibo_pdf
    with conexion() as con:
        r = _recibo(con, rid)
        d = _recibo_salida(con, r)
        persona = dict(sv.persona(con, r["persona_id"])) if r["persona_id"] else None
        auditar(con, usuario, "recibo_pdf", None, {"recibo": rid})
    return Response(recibo_pdf(d, persona), media_type="application/pdf", headers={"Content-Disposition": f'inline; filename="recibo-{d["numero_completo"]}.pdf"', "Cache-Control": "no-store"})

# ---------------------------------------------------------------- paz y salvo
class PazIn(BaseModel):
    nota: Optional[str] = Field(default=None, max_length=300)

@router.post("/contratos/{kid}/paz-y-salvo", status_code=201, summary="Expide el paz y salvo (solo si no hay saldo vencido)")
def paz_y_salvo(kid: int, d: PazIn, usuario: Admin):
    with conexion() as con:
        k = _contrato(con, kid)
        hoy = date.today()
        m = _mora_contrato(con, kid, hoy, sv.params(con))
        if m["saldo_vencido"] > 0:
            raise HTTPException(409, f"No se puede expedir: hay {m['saldo_vencido']:,} vencidos en {len(m['cobros'])} cobro(s)".replace(",", "."))
        prefijo, numero = sv.siguiente_consecutivo(con, "paz_y_salvo", hoy)
        cur = con.execute("INSERT INTO paz_y_salvos (prefijo, numero, contrato_id, fecha, nota, creado_por) VALUES (?,?,?,?,?,?)", (prefijo, numero, kid, hoy.isoformat(), d.nota, usuario))
        auditar(con, usuario, "paz_y_salvo", k["inmueble_id"], {"contrato": kid, "paz_y_salvo": cur.lastrowid})
        return dict(id=cur.lastrowid, numero_completo=sv.etiqueta(prefijo, numero), contrato_id=kid, fecha=hoy.isoformat(), nota=d.nota)

@router.get("/paz-y-salvos")
def listar_paz(_: Admin, contrato_id: Optional[int] = None):
    with conexion() as con:
        sql, args = "SELECT * FROM paz_y_salvos", ()
        if contrato_id:
            sql, args = sql + " WHERE contrato_id = ?", (contrato_id,)
        return [dict(r, numero_completo=sv.etiqueta(r["prefijo"], r["numero"])) for r in con.execute(sql + " ORDER BY id DESC", args)]

@router.get("/paz-y-salvos/{pid}/pdf", response_class=Response)
def paz_pdf(pid: int, usuario: Admin):
    from ..pdf.contable import paz_y_salvo_pdf
    with conexion() as con:
        ps = con.execute("SELECT * FROM paz_y_salvos WHERE id = ?", (pid,)).fetchone()
        if not ps:
            raise HTTPException(404, "Paz y salvo no encontrado")
        k = _contrato(con, ps["contrato_id"])
        inm = sv.inmueble(con, k["inmueble_id"])
        ult = con.execute("SELECT MAX(r.fecha) FROM recibos_caja r JOIN recibo_aplicaciones a ON a.recibo_id = r.id JOIN cobros cb ON cb.id = a.cobro_id "
                          "WHERE cb.contrato_id = ? AND r.estado = 'emitido'", (k["id"],)).fetchone()[0]
        auditar(con, usuario, "paz_y_salvo_pdf", k["inmueble_id"], {"paz_y_salvo": pid})
        datos = dict(ps, numero_completo=sv.etiqueta(ps["prefijo"], ps["numero"]))
        pdf = paz_y_salvo_pdf(datos, dict(k), dict(sv.persona(con, k["arrendatario_id"])), dict(inm), ult)
    return Response(pdf, media_type="application/pdf", headers={"Content-Disposition": f'inline; filename="paz-y-salvo-{datos["numero_completo"]}.pdf"', "Cache-Control": "no-store"})
