"""Fase 1 (solo administrador): ficha ampliada, módulo jurídico, soportes con vencimiento, semáforo y parámetros.
Nada de lo jurídico llega a publico.gpkg; de la ficha viaja la parte pública y del semáforo solo color + resumen."""
import json
import sqlite3
import uuid
from datetime import date, timedelta
from typing import Annotated, Optional

from fastapi import APIRouter, HTTPException, Query, Request
from fastapi.responses import FileResponse

from .. import config
from . import parametros as par
from .archivos import tipo_real as _tipo_real
from .db import auditar, conexion, sincronizar_publico
from .ficha_servicio import recalcular
from .router import Admin
from .schemas_ficha import FichaIn, FichaOut, JuridicoIn, JuridicoOut, ParametroIn, SemaforoAdmin, SoporteOut, TipoSoporte

router = APIRouter(prefix="/admin", tags=["admin · ficha y jurídico"])

BOOLS_FICHA = ("deposito", "agua", "alcantarillado", "gas", "energia", "internet", "negociable", "permuta", "financiacion")
CAMPOS_FICHA = tuple(FichaIn.model_fields)
BOOLS_JUR = ("hipoteca", "embargo", "afectacion_vivienda_familiar", "sucesion_pendiente")
CAMPOS_JUR = tuple(JuridicoIn.model_fields)

def _existe(con: sqlite3.Connection, inmueble_id: int):
    if not con.execute("SELECT 1 FROM inmuebles WHERE id = ?", (inmueble_id,)).fetchone():
        raise HTTPException(404, "Inmueble no encontrado")

def _a_bd(v):
    return int(v) if isinstance(v, bool) else v

def _desde_bd(d: dict, bools: tuple) -> dict:
    return {k: (None if v is None else bool(v)) if k in bools else v for k, v in d.items()}

# ---------------------------------------------------------------- ficha ampliada
@router.get("/inmuebles/{inmueble_id}/ficha", response_model=FichaOut, summary="Ficha ampliada (con el entorno calculado)")
def ver_ficha(inmueble_id: int, _: Admin):
    with conexion() as con:
        _existe(con, inmueble_id)
        r = con.execute("SELECT * FROM inmueble_ficha WHERE inmueble_id = ?", (inmueble_id,)).fetchone()
    d = _desde_bd(dict(r), BOOLS_FICHA) if r else {"inmueble_id": inmueble_id}
    d["entorno"] = json.loads(d.get("entorno") or "{}")
    return FichaOut(**d)

@router.put("/inmuebles/{inmueble_id}/ficha", response_model=FichaOut, summary="Guarda la ficha ampliada")
def guardar_ficha(inmueble_id: int, datos: FichaIn, usuario: Admin):
    v = {k: _a_bd(getattr(datos, k)) for k in CAMPOS_FICHA}
    with conexion() as con:
        _existe(con, inmueble_id)
        sets = ", ".join(f"{c} = excluded.{c}" for c in CAMPOS_FICHA)
        con.execute(f"INSERT INTO inmueble_ficha (inmueble_id, {', '.join(CAMPOS_FICHA)}) VALUES (?, {', '.join('?' * len(CAMPOS_FICHA))}) "
                    f"ON CONFLICT(inmueble_id) DO UPDATE SET {sets}, actualizado_en = strftime('%Y-%m-%dT%H:%M:%SZ','now')",
                    [inmueble_id] + [v[c] for c in CAMPOS_FICHA])
        auditar(con, usuario, "ficha", inmueble_id, {"campos": [c for c in CAMPOS_FICHA if v[c] is not None]})
    sincronizar_publico()
    return ver_ficha(inmueble_id, usuario)

# ---------------------------------------------------------------- jurídico (privado)
@router.get("/inmuebles/{inmueble_id}/juridico", response_model=Optional[JuridicoOut], summary="Datos jurídicos (null si no se han diligenciado)")
def ver_juridico(inmueble_id: int, _: Admin):
    with conexion() as con:
        _existe(con, inmueble_id)
        r = con.execute("SELECT * FROM inmueble_juridico WHERE inmueble_id = ?", (inmueble_id,)).fetchone()
    return JuridicoOut(**_desde_bd(dict(r), BOOLS_JUR)) if r else None

@router.put("/inmuebles/{inmueble_id}/juridico", response_model=JuridicoOut, summary="Guarda el módulo jurídico y recalcula el semáforo")
def guardar_juridico(inmueble_id: int, datos: JuridicoIn, usuario: Admin):
    v = {k: _a_bd(getattr(datos, k)) for k in CAMPOS_JUR}
    with conexion() as con:
        _existe(con, inmueble_id)
        sets = ", ".join(f"{c} = excluded.{c}" for c in CAMPOS_JUR)
        con.execute(f"INSERT INTO inmueble_juridico (inmueble_id, {', '.join(CAMPOS_JUR)}) VALUES (?, {', '.join('?' * len(CAMPOS_JUR))}) "
                    f"ON CONFLICT(inmueble_id) DO UPDATE SET {sets}, actualizado_en = strftime('%Y-%m-%dT%H:%M:%SZ','now')",
                    [inmueble_id] + [v[c] for c in CAMPOS_JUR])
        auditar(con, usuario, "juridico", inmueble_id, {"campos": [c for c in CAMPOS_JUR if v[c] not in (None, "desconocido")]})  # nunca los valores
        recalcular(inmueble_id, con, recalcular_entorno=False)
    sincronizar_publico()
    return ver_juridico(inmueble_id, usuario)

# ---------------------------------------------------------------- soportes
def _estado(r: sqlite3.Row, hoy: date, dias_alerta: int, vig_cert: int) -> tuple[str, Optional[int]]:
    venc = r["fecha_vencimiento"]
    if not venc and r["tipo"] == "certificado_tradicion" and r["fecha_documento"]:
        venc = (date.fromisoformat(r["fecha_documento"]) + timedelta(days=vig_cert)).isoformat()
    if not venc:
        return "sin_vencimiento", None
    dias = (date.fromisoformat(venc) - hoy).days
    return ("vencido" if dias < 0 else "por_vencer" if dias <= dias_alerta else "vigente"), dias

def _soporte_out(r: sqlite3.Row, p: dict) -> SoporteOut:
    est, dias = _estado(r, date.today(), int(par.numero(p, "soportes.dias_alerta_vencimiento")), int(par.numero(p, "soportes.vigencia_certificado_tradicion_dias")))
    d = {k: r[k] for k in ("id", "inmueble_id", "tipo", "nombre_original", "mime", "tamano", "fecha_documento", "fecha_vencimiento", "creado_en")}
    return SoporteOut(**d, estado=est, dias_para_vencer=dias)

@router.get("/inmuebles/{inmueble_id}/soportes", response_model=list[SoporteOut])
def listar_soportes(inmueble_id: int, _: Admin):
    with conexion() as con:
        _existe(con, inmueble_id)
        p = par.todos(con)
        return [_soporte_out(r, p) for r in con.execute("SELECT * FROM inmueble_soportes WHERE inmueble_id = ? ORDER BY creado_en DESC, id DESC", (inmueble_id,))]

@router.post("/inmuebles/{inmueble_id}/soportes", response_model=SoporteOut, status_code=201,
             summary="Sube un soporte (el cuerpo es el archivo; PDF, JPG, PNG o WEBP)")
async def subir_soporte(inmueble_id: int, request: Request, usuario: Admin, tipo: TipoSoporte,
                        nombre: Annotated[str, Query(min_length=1, max_length=200)],
                        fecha_documento: Annotated[Optional[str], Query(pattern=r"^\d{4}-\d{2}-\d{2}$")] = None,
                        fecha_vencimiento: Annotated[Optional[str], Query(pattern=r"^\d{4}-\d{2}-\d{2}$")] = None):
    with conexion() as con:
        _existe(con, inmueble_id)
        max_b = int(par.numero(par.todos(con), "soportes.max_mb") * 1024 * 1024)
    if int(request.headers.get("content-length") or 0) > max_b:
        raise HTTPException(413, f"El archivo supera {max_b // 1024 // 1024} MB")
    cuerpo = await request.body()
    if not cuerpo or len(cuerpo) > max_b:
        raise HTTPException(413 if cuerpo else 422, "Archivo vacío" if not cuerpo else f"El archivo supera {max_b // 1024 // 1024} MB")
    real = _tipo_real(cuerpo[:16])
    if not real:
        raise HTTPException(415, "Solo se aceptan PDF, JPG, PNG o WEBP")
    mime, ext = real
    rel = f"{inmueble_id}/{uuid.uuid4().hex}{ext}"          # el nombre del usuario NUNCA forma parte de la ruta
    destino = config.SOPORTES_DIR / rel
    destino.parent.mkdir(parents=True, exist_ok=True)
    destino.write_bytes(cuerpo)
    try:
        with conexion() as con:
            cur = con.execute("INSERT INTO inmueble_soportes (inmueble_id, tipo, archivo, nombre_original, mime, tamano, fecha_documento, fecha_vencimiento) "
                              "VALUES (?,?,?,?,?,?,?,?)", (inmueble_id, tipo, rel, nombre.strip()[:200], mime, len(cuerpo), fecha_documento, fecha_vencimiento))
            auditar(con, usuario, "soporte_subir", inmueble_id, {"soporte": cur.lastrowid, "tipo": tipo})
            recalcular(inmueble_id, con, recalcular_entorno=False)
            r = con.execute("SELECT * FROM inmueble_soportes WHERE id = ?", (cur.lastrowid,)).fetchone()
            out = _soporte_out(r, par.todos(con))
    except Exception:
        destino.unlink(missing_ok=True)
        raise
    sincronizar_publico()
    return out

@router.get("/soportes/{soporte_id}/archivo", summary="Descarga un soporte (exige sesión)")
def descargar_soporte(soporte_id: int, usuario: Admin):
    with conexion() as con:
        r = con.execute("SELECT * FROM inmueble_soportes WHERE id = ?", (soporte_id,)).fetchone()
        if not r:
            raise HTTPException(404, "Soporte no encontrado")
        auditar(con, usuario, "soporte_descargar", r["inmueble_id"], {"soporte": soporte_id})
    ruta = (config.SOPORTES_DIR / r["archivo"]).resolve()
    if config.SOPORTES_DIR.resolve() not in ruta.parents or not ruta.is_file():
        raise HTTPException(404, "El archivo ya no está en el servidor")
    return FileResponse(ruta, media_type=r["mime"], filename=r["nombre_original"], content_disposition_type="attachment",
                        headers={"Cache-Control": "private, no-store", "X-Content-Type-Options": "nosniff"})

@router.delete("/soportes/{soporte_id}", status_code=204, summary="Elimina un soporte (registro y archivo)")
def eliminar_soporte(soporte_id: int, usuario: Admin):
    with conexion() as con:
        r = con.execute("SELECT * FROM inmueble_soportes WHERE id = ?", (soporte_id,)).fetchone()
        if not r:
            raise HTTPException(404, "Soporte no encontrado")
        con.execute("DELETE FROM inmueble_soportes WHERE id = ?", (soporte_id,))
        auditar(con, usuario, "soporte_eliminar", r["inmueble_id"], {"soporte": soporte_id, "tipo": r["tipo"]})
        recalcular(r["inmueble_id"], con, recalcular_entorno=False)
    ruta = (config.SOPORTES_DIR / r["archivo"]).resolve()
    if config.SOPORTES_DIR.resolve() in ruta.parents:
        ruta.unlink(missing_ok=True)
    sincronizar_publico()

@router.get("/alertas/soportes", response_model=list[SoporteOut], summary="Soportes vencidos o por vencer, de todos los inmuebles")
def alertas_soportes(_: Admin):
    with conexion() as con:
        p = par.todos(con)
        todos = [_soporte_out(r, p) for r in con.execute("SELECT * FROM inmueble_soportes")]
    return sorted((s for s in todos if s.estado in ("vencido", "por_vencer")), key=lambda s: s.dias_para_vencer or 0)

# ---------------------------------------------------------------- semáforo (detalle privado)
@router.get("/inmuebles/{inmueble_id}/semaforo", response_model=Optional[SemaforoAdmin], summary="Semáforo con todo el detalle (privado)")
def ver_semaforo(inmueble_id: int, _: Admin):
    with conexion() as con:
        _existe(con, inmueble_id)
        r = con.execute("SELECT * FROM inmueble_semaforo WHERE inmueble_id = ?", (inmueble_id,)).fetchone()
    if not r:
        return None
    d = dict(r)
    d["categorias"], d["detalle"] = json.loads(d["categorias"]), json.loads(d["detalle"])
    return SemaforoAdmin(**d)

@router.post("/inmuebles/{inmueble_id}/semaforo/recalcular", response_model=Optional[SemaforoAdmin])
def recalcular_uno(inmueble_id: int, usuario: Admin):
    with conexion() as con:
        _existe(con, inmueble_id)
        recalcular(inmueble_id, con)
        auditar(con, usuario, "semaforo_recalcular", inmueble_id)
    sincronizar_publico()
    return ver_semaforo(inmueble_id, usuario)

@router.post("/semaforo/recalcular", summary="Recalcula entorno y semáforo de TODOS los inmuebles")
def recalcular_todos(usuario: Admin):
    with conexion() as con:
        ids = [r[0] for r in con.execute("SELECT id FROM inmuebles ORDER BY id")]
    conteo = {"verde": 0, "amarillo": 0, "rojo": 0}
    for i in ids:
        res = recalcular(i)
        if res:
            conteo[res.color] += 1
    with conexion() as con:
        auditar(con, usuario, "semaforo_recalcular_todos", None, {"inmuebles": len(ids)})
    sincronizar_publico()
    return {"inmuebles": len(ids), **conteo}

# ---------------------------------------------------------------- parámetros
@router.get("/parametros", summary="Parámetros configurables")
def ver_parametros(_: Admin):
    with conexion() as con:
        return [dict(r) for r in con.execute("SELECT clave, valor, descripcion, requiere_confirmar, actualizado_en FROM parametros ORDER BY clave")]

@router.put("/parametros/{clave}", summary="Cambia un parámetro")
def cambiar_parametro(clave: str, datos: ParametroIn, usuario: Admin):
    try:
        float(datos.valor.replace(",", "."))
    except ValueError:
        raise HTTPException(422, "El valor debe ser numérico")
    with conexion() as con:
        antes = con.execute("SELECT valor FROM parametros WHERE clave = ?", (clave,)).fetchone()
        if not antes:
            raise HTTPException(404, "Parámetro no encontrado")
        con.execute("UPDATE parametros SET valor = ?, actualizado_en = strftime('%Y-%m-%dT%H:%M:%SZ','now') WHERE clave = ?", (datos.valor.replace(",", "."), clave))
        auditar(con, usuario, "parametro", None, {"clave": clave, "de": antes["valor"], "a": datos.valor})
    return {"clave": clave, "valor": datos.valor.replace(",", ".")}
