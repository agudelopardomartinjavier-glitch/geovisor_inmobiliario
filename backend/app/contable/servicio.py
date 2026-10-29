"""Acceso a datos compartido por los routers contables: tarifas desde `parametros`, consecutivos y saldos de cobros."""
import sqlite3
from datetime import date

from fastapi import HTTPException

from ..admin import parametros as par
from . import calculos as c

# Parámetros contables: valores de reserva si falta la fila (la fuente de verdad es la tabla). # CONFIRMAR los marcados en la migración 004.
RESERVA = {
    "comision.venta_pct": "3", "comision.arriendo_pct": "100", "comision.administracion_pct": "10",
    "reparto.asesor_pct_defecto": "50", "reparto.referido_pct_defecto": "0",
    "iva.pct": "19", "retefuente.pct": "11", "retefuente.base_minima_cop": "0", "reteica.por_mil": "10", "ica.por_mil": "10",
    "reteiva.pct_del_iva": "15", "liquidacion.iva_sobre_comision": "1", "canon.max_pct_valor_comercial": "1",
    "contrato.dias_alerta_renovacion": "90", "contrato.incremento_max_pct_ipc": "100", "mora.dias_gracia": "0", "mora.tasa_mensual_pct": "2",
}

def params(con: sqlite3.Connection) -> dict[str, float]:
    p = {**RESERVA, **par.todos(con)}
    return {k: float(v) for k, v in p.items() if k in RESERVA}

def tarifas(p: dict[str, float]) -> c.Tarifas:
    return c.Tarifas(iva_pct=p["iva.pct"], retefuente_pct=p["retefuente.pct"], reteica_por_mil=p["reteica.por_mil"],
                     reteiva_pct=p["reteiva.pct_del_iva"], retefuente_base_minima=int(p["retefuente.base_minima_cop"]))

def siguiente_consecutivo(con: sqlite3.Connection, tipo: str, hoy: date | None = None) -> tuple[str, int]:
    """Toma el próximo número del tipo (dentro de la transacción del llamador). Respeta el rango y la vigencia de la resolución."""
    r = con.execute("SELECT * FROM consecutivos WHERE tipo = ?", (tipo,)).fetchone()
    if not r:
        raise HTTPException(500, f"No hay consecutivo configurado para {tipo}")
    n = r["siguiente"]
    if r["hasta"] is not None and n > r["hasta"]:
        raise HTTPException(409, f"Se agotó el rango autorizado de {tipo} (hasta {r['hasta']}). Solicita una nueva resolución y actualiza el consecutivo.")
    if r["vigencia_hasta"] and (hoy or date.today()).isoformat() > r["vigencia_hasta"]:
        raise HTTPException(409, f"La resolución de {tipo} venció el {r['vigencia_hasta']}. Actualiza el consecutivo.")
    con.execute("UPDATE consecutivos SET siguiente = siguiente + 1 WHERE tipo = ?", (tipo,))
    return r["prefijo"], n

def etiqueta(prefijo: str, numero: int) -> str:
    return f"{prefijo}{numero}" if prefijo else str(numero)

def persona(con: sqlite3.Connection, persona_id: int, rol: str = "persona") -> sqlite3.Row:
    r = con.execute("SELECT * FROM personas WHERE id = ?", (persona_id,)).fetchone()
    if not r:
        raise HTTPException(404, f"{rol.capitalize()} no encontrado")
    return r

SQL_COBROS = """SELECT c.*, COALESCE((SELECT SUM(a.valor) FROM recibo_aplicaciones a JOIN recibos_caja r ON r.id = a.recibo_id AND r.estado = 'emitido'
                                      WHERE a.cobro_id = c.id), 0) AS pagado
                FROM cobros c WHERE c.anulado = 0 {donde} ORDER BY c.fecha_vencimiento, c.id"""

def cobros_con_saldo(con: sqlite3.Connection, donde: str = "", args: tuple = ()) -> list[dict]:
    """Cobros no anulados con lo pagado (solo recibos emitidos) y el saldo."""
    out = []
    for r in con.execute(SQL_COBROS.format(donde=donde), args):
        d = dict(r)
        d["saldo"] = d["valor"] - d["pagado"]
        out.append(d)
    return out

def propietario_de(con: sqlite3.Connection, inmueble_id: int) -> sqlite3.Row | None:
    return con.execute("SELECT p.* FROM inmueble_propietario ip JOIN personas p ON p.id = ip.persona_id WHERE ip.inmueble_id = ?", (inmueble_id,)).fetchone()

def inmueble(con: sqlite3.Connection, inmueble_id: int) -> sqlite3.Row:
    r = con.execute("SELECT * FROM inmuebles WHERE id = ?", (inmueble_id,)).fetchone()
    if not r:
        raise HTTPException(404, "Inmueble no encontrado")
    return r

def ipc(con: sqlite3.Connection) -> dict[int, float]:
    return {r["anio"]: r["pct"] for r in con.execute("SELECT anio, pct FROM ipc_anual")}
