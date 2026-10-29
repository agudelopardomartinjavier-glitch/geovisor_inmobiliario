"""Recalcula el entorno (distancias) y el semáforo de un inmueble y los guarda en admin.sqlite."""
import json
import sqlite3
from dataclasses import asdict
from datetime import date

from .. import entorno, semaforo, semaforo_espacial
from ..db import engine
from . import parametros
from .db import conexion

def _params(con):
    p = parametros.todos(con)
    return (parametros.numero(p, "semaforo.umbral_rojo_pct"), parametros.numero(p, "semaforo.umbral_amarillo_pct"),
            int(parametros.numero(p, "soportes.vigencia_certificado_tradicion_dias")))

def recalcular(inmueble_id: int, con: sqlite3.Connection | None = None, recalcular_entorno: bool = True) -> semaforo.Resultado | None:
    """Mide el entorno y el semáforo. Con `con` reutiliza la transacción del llamador; sin ella abre la suya."""
    if con is None:
        with conexion() as c:
            return recalcular(inmueble_id, c, recalcular_entorno)
    inm = con.execute("SELECT id, tipo, numero_predial, x, y FROM inmuebles WHERE id = ?", (inmueble_id,)).fetchone()
    if not inm:
        return None
    rojo, amarillo, dias_cert = _params(con)
    with engine.connect() as pub:
        if recalcular_entorno and inm["x"] is not None:
            ent = entorno.calcular(pub, inm["x"], inm["y"])
            con.execute(
                "INSERT INTO inmueble_ficha (inmueble_id, entorno, entorno_calculado_en) VALUES (?, ?, strftime('%Y-%m-%dT%H:%M:%SZ','now')) "
                "ON CONFLICT(inmueble_id) DO UPDATE SET entorno = excluded.entorno, entorno_calculado_en = excluded.entorno_calculado_en",
                (inmueble_id, json.dumps(ent, ensure_ascii=False)))
        entrada, mediciones = semaforo_espacial.medir(pub, inm["tipo"], inm["numero_predial"], inm["x"], inm["y"])
    j = con.execute("SELECT * FROM inmueble_juridico WHERE inmueble_id = ?", (inmueble_id,)).fetchone()
    entrada.juridico = dict(j) if j else None
    entrada.soportes = [dict(r) for r in con.execute(
        "SELECT tipo, fecha_documento, fecha_vencimiento FROM inmueble_soportes WHERE inmueble_id = ?", (inmueble_id,))]
    entrada.hoy = date.today()
    res = semaforo.evaluar(entrada, rojo, amarillo, dias_cert)
    detalle = {"mediciones": mediciones, "hallazgos": [asdict(h) for h in res.hallazgos],
               "umbrales": {"rojo_pct": rojo, "amarillo_pct": amarillo, "vigencia_certificado_dias": dias_cert}}
    con.execute(
        "INSERT INTO inmueble_semaforo (inmueble_id, color, resumen_publico, categorias, detalle, reglas_version) VALUES (?,?,?,?,?,?) "
        "ON CONFLICT(inmueble_id) DO UPDATE SET color=excluded.color, resumen_publico=excluded.resumen_publico, categorias=excluded.categorias, "
        "detalle=excluded.detalle, reglas_version=excluded.reglas_version, calculado_en=strftime('%Y-%m-%dT%H:%M:%SZ','now')",
        (inmueble_id, res.color, res.resumen_publico, json.dumps(res.categorias), json.dumps(detalle, ensure_ascii=False), semaforo.REGLAS_VERSION))
    return res
