"""Personas (propietarios, arrendatarios, codeudores, clientes), propietario de cada inmueble, consecutivos e IPC. Solo administrador."""
import re
import sqlite3
from typing import Literal, Optional

from fastapi import APIRouter, HTTPException, Query
from pydantic import BaseModel, Field, field_validator

from ..admin.db import auditar, conexion
from ..admin.router import Admin
from . import servicio as sv

router = APIRouter(prefix="/admin", tags=["admin · contabilidad · terceros"])

def _limpio(v):
    return None if isinstance(v, str) and not v.strip() else (v.strip() if isinstance(v, str) else v)

class PersonaIn(BaseModel):
    tipo_persona: Literal["natural", "juridica"] = "natural"
    nombre: str = Field(min_length=2, max_length=200)
    documento_tipo: Literal["CC", "CE", "NIT", "PA", "TI", "otro"] = "CC"
    documento: str = Field(min_length=3, max_length=25, pattern=r"^[0-9A-Za-z.\-]+$")
    email: Optional[str] = Field(default=None, max_length=200)
    telefono: Optional[str] = Field(default=None, max_length=40)
    direccion: Optional[str] = Field(default=None, max_length=300)

    @field_validator("email", "telefono", "direccion", mode="before")
    @classmethod
    def _v(cls, v):
        return _limpio(v)

    @field_validator("email")
    @classmethod
    def _email(cls, v):
        if v is not None and not re.match(r"^[^@\s]+@[^@\s]+\.[^@\s]+$", v):
            raise ValueError("Correo no válido")
        return v

    @field_validator("nombre", "documento", mode="before")
    @classmethod
    def _t(cls, v):
        return _limpio(v)

CAMPOS = ("tipo_persona", "nombre", "documento_tipo", "documento", "email", "telefono", "direccion")

def _dup(e: sqlite3.IntegrityError):
    if "UNIQUE" in str(e):
        raise HTTPException(409, "Ya existe una persona con ese tipo y número de documento")
    raise e

@router.get("/personas", summary="Personas (busca por nombre o documento)")
def listar_personas(_: Admin, q: Optional[str] = Query(None, max_length=80)):
    sql, args = "SELECT * FROM personas", []
    if q:
        sql += " WHERE nombre LIKE ? OR documento LIKE ?"
        args = [f"%{q}%", f"%{q}%"]
    with conexion() as con:
        return [dict(r) for r in con.execute(sql + " ORDER BY nombre LIMIT 500", args)]

@router.post("/personas", status_code=201)
def crear_persona(d: PersonaIn, usuario: Admin):
    with conexion() as con:
        try:
            cur = con.execute(f"INSERT INTO personas ({', '.join(CAMPOS)}) VALUES ({', '.join('?' * len(CAMPOS))})", [getattr(d, k) for k in CAMPOS])
        except sqlite3.IntegrityError as e:
            _dup(e)
        auditar(con, usuario, "persona_crear", None, {"persona": cur.lastrowid})   # sin datos personales en la auditoría
        return dict(sv.persona(con, cur.lastrowid))

@router.get("/personas/{persona_id}")
def ver_persona(persona_id: int, _: Admin):
    with conexion() as con:
        return dict(sv.persona(con, persona_id))

@router.put("/personas/{persona_id}")
def editar_persona(persona_id: int, d: PersonaIn, usuario: Admin):
    with conexion() as con:
        sv.persona(con, persona_id)
        try:
            con.execute(f"UPDATE personas SET {', '.join(k + ' = ?' for k in CAMPOS)} WHERE id = ?", [getattr(d, k) for k in CAMPOS] + [persona_id])
        except sqlite3.IntegrityError as e:
            _dup(e)
        auditar(con, usuario, "persona_editar", None, {"persona": persona_id})
        return dict(sv.persona(con, persona_id))

@router.delete("/personas/{persona_id}", status_code=204)
def borrar_persona(persona_id: int, usuario: Admin):
    with conexion() as con:
        sv.persona(con, persona_id)
        try:
            con.execute("DELETE FROM personas WHERE id = ?", (persona_id,))
        except sqlite3.IntegrityError:
            raise HTTPException(409, "La persona tiene movimientos (contratos, facturas, recibos…): no se puede borrar")
        auditar(con, usuario, "persona_borrar", None, {"persona": persona_id})

# ---------------------------------------------------------------- propietario del inmueble
class PropietarioIn(BaseModel):
    persona_id: int

@router.get("/inmuebles/{inmueble_id}/propietario")
def ver_propietario(inmueble_id: int, _: Admin):
    with conexion() as con:
        sv.inmueble(con, inmueble_id)
        p = sv.propietario_de(con, inmueble_id)
        return dict(p) if p else None

@router.put("/inmuebles/{inmueble_id}/propietario")
def fijar_propietario(inmueble_id: int, d: PropietarioIn, usuario: Admin):
    with conexion() as con:
        sv.inmueble(con, inmueble_id)
        sv.persona(con, d.persona_id, "propietario")
        con.execute("INSERT INTO inmueble_propietario (inmueble_id, persona_id) VALUES (?,?) ON CONFLICT(inmueble_id) DO UPDATE SET persona_id = excluded.persona_id",
                    (inmueble_id, d.persona_id))
        auditar(con, usuario, "propietario_asignar", inmueble_id, {"persona": d.persona_id})
        return dict(sv.propietario_de(con, inmueble_id))

@router.delete("/inmuebles/{inmueble_id}/propietario", status_code=204)
def quitar_propietario(inmueble_id: int, usuario: Admin):
    with conexion() as con:
        con.execute("DELETE FROM inmueble_propietario WHERE inmueble_id = ?", (inmueble_id,))
        auditar(con, usuario, "propietario_quitar", inmueble_id)

# ---------------------------------------------------------------- consecutivos
class ConsecutivoIn(BaseModel):
    prefijo: str = Field(default="", max_length=10, pattern=r"^[A-Za-z0-9]*$")
    siguiente: int = Field(ge=1)
    hasta: Optional[int] = Field(default=None, ge=1)
    resolucion_numero: Optional[str] = Field(default=None, max_length=40)
    resolucion_fecha: Optional[str] = Field(default=None, pattern=r"^\d{4}-\d{2}-\d{2}$")
    vigencia_hasta: Optional[str] = Field(default=None, pattern=r"^\d{4}-\d{2}-\d{2}$")

@router.get("/consecutivos")
def ver_consecutivos(_: Admin):
    with conexion() as con:
        return [dict(r) for r in con.execute("SELECT * FROM consecutivos ORDER BY tipo")]

@router.put("/consecutivos/{tipo}", summary="Configura prefijo, rango y resolución de un consecutivo")
def fijar_consecutivo(tipo: Literal["factura", "nota_credito", "recibo_caja", "liquidacion", "paz_y_salvo"], d: ConsecutivoIn, usuario: Admin):
    with conexion() as con:
        # nunca se repiten números: el siguiente debe ser mayor que el último emitido con ese prefijo
        donde = {"factura": ("facturas", " AND tipo = 'factura'"), "nota_credito": ("facturas", " AND tipo = 'nota_credito'"), "recibo_caja": ("recibos_caja", ""),
                 "liquidacion": ("liquidaciones", ""), "paz_y_salvo": ("paz_y_salvos", "")}[tipo]
        ultimo = con.execute(f"SELECT COALESCE(MAX(numero), 0) FROM {donde[0]} WHERE prefijo = ?{donde[1]}", (d.prefijo,)).fetchone()[0]
        if d.siguiente <= ultimo:
            raise HTTPException(409, f"Con el prefijo «{d.prefijo}» ya se emitió hasta el número {ultimo}: el siguiente debe ser mayor")
        if d.hasta is not None and d.hasta < d.siguiente:
            raise HTTPException(422, "El fin del rango no puede ser menor que el siguiente número")
        con.execute("UPDATE consecutivos SET prefijo=?, siguiente=?, hasta=?, resolucion_numero=?, resolucion_fecha=?, vigencia_hasta=? WHERE tipo=?",
                    (d.prefijo, d.siguiente, d.hasta, d.resolucion_numero, d.resolucion_fecha, d.vigencia_hasta, tipo))
        auditar(con, usuario, "consecutivo", None, {"tipo": tipo})
        return dict(con.execute("SELECT * FROM consecutivos WHERE tipo = ?", (tipo,)).fetchone())

# ---------------------------------------------------------------- IPC anual (para el incremento del canon)
class IpcIn(BaseModel):
    pct: float = Field(ge=-50, le=500)
    fuente: Optional[str] = Field(default=None, max_length=200)

@router.get("/ipc")
def ver_ipc(_: Admin):
    with conexion() as con:
        return [dict(r) for r in con.execute("SELECT * FROM ipc_anual ORDER BY anio DESC")]

@router.put("/ipc/{anio}", summary="Carga o corrige el IPC de un año (variación anual, %)")
def fijar_ipc(anio: int, d: IpcIn, usuario: Admin):
    if not 1990 <= anio <= 2100:
        raise HTTPException(422, "Año fuera de rango")
    with conexion() as con:
        con.execute("INSERT INTO ipc_anual (anio, pct, fuente) VALUES (?,?,?) ON CONFLICT(anio) DO UPDATE SET pct = excluded.pct, fuente = excluded.fuente", (anio, d.pct, d.fuente))
        auditar(con, usuario, "ipc", None, {"anio": anio, "pct": d.pct})
    return {"anio": anio, "pct": d.pct, "fuente": d.fuente}

@router.delete("/ipc/{anio}", status_code=204)
def borrar_ipc(anio: int, usuario: Admin):
    with conexion() as con:
        con.execute("DELETE FROM ipc_anual WHERE anio = ?", (anio,))
        auditar(con, usuario, "ipc_borrar", None, {"anio": anio})
