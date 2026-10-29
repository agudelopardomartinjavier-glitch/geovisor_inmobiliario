"""Fase 2 (solo administrador): historial de precios y avalúos, tiempo en el mercado, valor por m² del sector (mapa de calor)
y rentabilidad del inversionista. Método y definiciones en docs/VALORACION.md."""
import sqlite3
from datetime import date
from typing import Annotated, Literal, Optional

import numpy as np
from fastapi import APIRouter, HTTPException, Query
from pydantic import BaseModel, Field

from .. import mercado, zonas
from ..geo import _t_a_4326
from . import parametros as par
from . import valoracion as val
from .db import auditar, conexion
from .router import Admin
from .router_comparables import _calcular

router = APIRouter(prefix="/admin", tags=["admin · mercado y valoración"])

Tipo = Literal["casa", "lote", "finca", "local", "apartamento"]
Fecha = Annotated[str, Field(pattern=r"^\d{4}-\d{2}-\d{2}$")]

class PrecioManual(BaseModel):
    fecha: Fecha
    precio: int = Field(ge=0, le=10**13)
    nota: Optional[str] = Field(default=None, max_length=300)

class AvaluoManual(BaseModel):
    fecha: Fecha
    valor: int = Field(ge=0, le=10**13)
    fuente: Literal["registrado", "comercial", "catastral", "comparables", "otro"] = "comercial"
    nota: Optional[str] = Field(default=None, max_length=300)

class InversionIn(BaseModel):
    canon_mensual_esperado: Optional[int] = Field(default=None, ge=0, le=10**11)
    nota: Optional[str] = Field(default=None, max_length=300)

def _inm(con: sqlite3.Connection, inmueble_id: int) -> sqlite3.Row:
    r = con.execute("SELECT * FROM inmuebles WHERE id = ?", (inmueble_id,)).fetchone()
    if not r:
        raise HTTPException(404, "Inmueble no encontrado")
    return r

def _area(tipo: str, terreno, construida):
    return terreno if val.area_base(tipo) == "terreno" else construida

def _zona(x: Optional[float], y: Optional[float]) -> Optional[str]:
    if x is None:
        return None
    z = zonas.zona_de(x, y)
    return z["barrio"] or z["vereda"]

# ---------------------------------------------------------------- datos de mercado ($/m²)
def _puntos(con: sqlite3.Connection, tipo: str, fuentes: set[str]) -> list[dict]:
    """Valor por m² (sobre el área base del tipo) de comparables y de inmuebles propios en venta. Ya con barrio/vereda."""
    pts = []
    if "comparables" in fuentes:
        for r in con.execute("SELECT id, precio, area_terreno, area_construida, x, y FROM comparables WHERE tipo = ? AND x IS NOT NULL", (tipo,)):
            a = _area(tipo, r["area_terreno"], r["area_construida"])
            if a:
                pts.append(dict(origen="comparable", id=r["id"], x=r["x"], y=r["y"], valor=r["precio"] / a))
    if "inmuebles" in fuentes:
        for r in con.execute("SELECT id, precio, area_terreno, area_construida, x, y FROM inmuebles WHERE tipo = ? AND operacion = 'venta' "
                             "AND estado_publicacion IN ('publicado','vendido') AND precio > 0 AND x IS NOT NULL", (tipo,)):
            a = _area(tipo, r["area_terreno"], r["area_construida"])
            if a:
                pts.append(dict(origen="inmueble", id=r["id"], x=r["x"], y=r["y"], valor=r["precio"] / a))
    for p in pts:
        p["zona"] = _zona(p["x"], p["y"])
    return pts

def _sectores(pts: list[dict]) -> list[dict]:
    por: dict[str, list[float]] = {}
    for p in pts:
        por.setdefault(p["zona"] or "Sin zona", []).append(p["valor"])
    out = [dict(zona=z, confiable=len(v) >= 3, **mercado.estadisticas(v)) for z, v in por.items()]
    return sorted(out, key=lambda s: -s["mediana"])

@router.get("/mercado/m2", summary="Valor por m² por sector y superficie interpolada para el mapa de calor")
def valor_m2(_: Admin, tipo: Tipo, fuentes: Annotated[list[Literal["comparables", "inmuebles"]], Query()] = ["comparables", "inmuebles"]):
    with conexion() as con:
        p = par.todos(con)
        pts = _puntos(con, tipo, set(fuentes))
    base = val.area_base(tipo)
    sectores = _sectores(pts)
    if len(pts) < 3:
        return dict(tipo=tipo, base=base, n_puntos=len(pts), sectores=sectores, celdas=None,
                    aviso="Se necesitan al menos 3 datos con ubicación y área para dibujar el mapa de calor.")
    x, y, v = (np.array([q[k] for q in pts], dtype=float) for k in ("x", "y", "valor"))
    sup = mercado.superficie_idw(x, y, v, par.numero(p, "mercado.celda_m"), par.numero(p, "mercado.radio_influencia_m"),
                                 int(par.numero(p, "mercado.min_vecinos")), par.numero(p, "mercado.recorte_percentil"))
    celdas = sup["celdas"]
    features = []
    if celdas:
        mitad = sup["celda"] / 2
        cx, cy = np.array([c[0] for c in celdas]), np.array([c[1] for c in celdas])
        xs = np.stack([cx - mitad, cx + mitad, cx + mitad, cx - mitad, cx - mitad], axis=1)
        ys = np.stack([cy - mitad, cy - mitad, cy + mitad, cy + mitad, cy - mitad], axis=1)
        lon, lat = _t_a_4326().transform(xs.ravel(), ys.ravel())
        lon, lat = np.round(lon.reshape(xs.shape), 6), np.round(lat.reshape(ys.shape), 6)
        rango = (sup["vmax"] - sup["vmin"]) or 1.0
        for i, (_, _, valor, n) in enumerate(celdas):
            features.append({"type": "Feature", "properties": {"valor_m2": round(valor), "n": n, "rel": round((valor - sup["vmin"]) / rango, 3)},
                             "geometry": {"type": "Polygon", "coordinates": [[[float(a), float(b)] for a, b in zip(lon[i], lat[i])]]}})
    return dict(tipo=tipo, base=base, n_puntos=len(pts), sectores=sectores,
                escala=dict(minimo=round(sup["vmin"]) if sup["vmin"] is not None else None, maximo=round(sup["vmax"]) if sup["vmax"] is not None else None),
                celda_m=round(sup["celda"]), radio_m=par.numero(p, "mercado.radio_influencia_m"),
                celdas={"type": "FeatureCollection", "features": features},
                aviso=None if features else "Ninguna celda reúne los datos mínimos dentro del radio de influencia.")

# ---------------------------------------------------------------- historial de un inmueble
def _filas(con, tabla: str, inmueble_id: int) -> list[dict]:
    return [dict(r) for r in con.execute(f"SELECT * FROM {tabla} WHERE inmueble_id = ? ORDER BY fecha, id", (inmueble_id,))]

@router.get("/inmuebles/{inmueble_id}/historial", summary="Historial de precios y avalúos, tiempo en el mercado y valor por m² del sector")
def historial(inmueble_id: int, _: Admin):
    with conexion() as con:
        inm = _inm(con, inmueble_id)
        precios, avaluos, estados = (_filas(con, t, inmueble_id) for t in ("precio_historial", "avaluo_historial", "estado_historial"))
        hoy = date.today()
        area = _area(inm["tipo"], inm["area_terreno"], inm["area_construida"])
        precio_m2 = round(inm["precio"] / area) if inm["precio"] and area and inm["operacion"] == "venta" else None
        zona = _zona(inm["x"], inm["y"])
        pts = [q for q in _puntos(con, inm["tipo"], {"comparables", "inmuebles"}) if not (q["origen"] == "inmueble" and q["id"] == inmueble_id)]
    del_sector = [q["valor"] for q in pts if zona and q["zona"] == zona]
    est = mercado.estadisticas(del_sector)
    return dict(
        precios=precios, avaluos=avaluos, estados=estados,
        mercado=mercado.dias_en_mercado([(e["fecha"], e["estado"]) for e in estados], hoy),
        rebajas=mercado.resumen_precios(precios, hoy),
        m2=dict(base=val.area_base(inm["tipo"]), precio_m2=precio_m2, zona=zona, sector=est,
                dif_pct=round(100 * (precio_m2 - est["mediana"]) / est["mediana"], 1) if precio_m2 and est["mediana"] else None,
                suficiente=est["n"] >= 3))

def _retipar(con: sqlite3.Connection, inmueble_id: int):
    """Tras insertar un precio histórico a mano, recalcula precio_anterior y tipo de toda la serie."""
    filas = con.execute("SELECT id, fecha, precio FROM precio_historial WHERE inmueble_id = ? ORDER BY fecha, id", (inmueble_id,)).fetchall()
    for f, (ant, tipo) in zip(filas, mercado.tipos_de_serie([(f["fecha"], f["precio"]) for f in filas])):
        con.execute("UPDATE precio_historial SET precio_anterior = ?, tipo = ? WHERE id = ?", (ant, tipo, f["id"]))

@router.post("/inmuebles/{inmueble_id}/precios", status_code=201, summary="Agrega un precio histórico (anterior al uso del sistema)")
def agregar_precio(inmueble_id: int, d: PrecioManual, usuario: Admin):
    with conexion() as con:
        _inm(con, inmueble_id)
        con.execute("INSERT INTO precio_historial (inmueble_id, fecha, precio, tipo, nota, origen) VALUES (?,?,?,'inicial',?, 'manual')",
                    (inmueble_id, d.fecha, d.precio, d.nota))
        _retipar(con, inmueble_id)
        auditar(con, usuario, "precio_historico", inmueble_id, {"fecha": d.fecha})
    return historial(inmueble_id, usuario)

@router.delete("/precios/{pid}", summary="Borra un precio histórico agregado a mano")
def borrar_precio(pid: int, usuario: Admin):
    with conexion() as con:
        r = con.execute("SELECT inmueble_id, origen FROM precio_historial WHERE id = ?", (pid,)).fetchone()
        if not r:
            raise HTTPException(404, "Registro no encontrado")
        if r["origen"] != "manual":
            raise HTTPException(409, "Los cambios de precio automáticos no se borran: son el registro real")
        con.execute("DELETE FROM precio_historial WHERE id = ?", (pid,))
        _retipar(con, r["inmueble_id"])
        auditar(con, usuario, "precio_historico_borrar", r["inmueble_id"], {"id": pid})
    return historial(r["inmueble_id"], usuario)

@router.post("/inmuebles/{inmueble_id}/avaluos", status_code=201, summary="Agrega un avalúo al historial")
def agregar_avaluo(inmueble_id: int, d: AvaluoManual, usuario: Admin):
    with conexion() as con:
        _inm(con, inmueble_id)
        con.execute("INSERT INTO avaluo_historial (inmueble_id, fecha, valor, fuente, nota, origen) VALUES (?,?,?,?,?, 'manual')",
                    (inmueble_id, d.fecha, d.valor, d.fuente, d.nota))
        auditar(con, usuario, "avaluo_historico", inmueble_id, {"fecha": d.fecha, "fuente": d.fuente})
    return historial(inmueble_id, usuario)

@router.delete("/avaluos/{aid}", summary="Borra un avalúo agregado a mano")
def borrar_avaluo(aid: int, usuario: Admin):
    with conexion() as con:
        r = con.execute("SELECT inmueble_id, origen FROM avaluo_historial WHERE id = ?", (aid,)).fetchone()
        if not r:
            raise HTTPException(404, "Registro no encontrado")
        if r["origen"] != "manual":
            raise HTTPException(409, "Los avalúos registrados en el inmueble no se borran desde aquí")
        con.execute("DELETE FROM avaluo_historial WHERE id = ?", (aid,))
        auditar(con, usuario, "avaluo_historico_borrar", r["inmueble_id"], {"id": aid})
    return historial(r["inmueble_id"], usuario)

# ---------------------------------------------------------------- rentabilidad del inversionista
def _inversion(con: sqlite3.Connection, inm: sqlite3.Row) -> dict:
    manual = con.execute("SELECT canon_mensual_esperado, nota FROM inmueble_inversion WHERE inmueble_id = ?", (inm["id"],)).fetchone()
    estimado = _calcular(con, inm)[0]["valor_estimado"]
    area = _area(inm["tipo"], inm["area_terreno"], inm["area_construida"])
    out = dict(operacion=inm["operacion"], canon_manual=manual["canon_mensual_esperado"] if manual else None, nota=manual["nota"] if manual else None,
               canon_mensual=None, origen_canon=None, valor_base=None, origen_valor=None, rentabilidad_pct=None,
               rentabilidad_sobre_estimado_pct=None, valor_estimado=estimado, canon_n=None, avisos=[])
    if inm["operacion"] == "arriendo":
        out["canon_mensual"], out["origen_canon"] = inm["precio"], "precio de arriendo publicado"
        if inm["avaluo"]:
            out["valor_base"], out["origen_valor"] = inm["avaluo"], "avalúo registrado"
        elif estimado:
            out["valor_base"], out["origen_valor"] = estimado, "valor estimado por comparables"
        else:
            out["avisos"].append("Sin avalúo ni valor estimado: registra uno de los dos para calcular la rentabilidad.")
    else:
        out["valor_base"], out["origen_valor"] = inm["precio"], "precio de venta publicado"
        if manual and manual["canon_mensual_esperado"]:
            out["canon_mensual"], out["origen_canon"] = manual["canon_mensual_esperado"], "canon esperado (manual)"
        else:
            zona = _zona(inm["x"], inm["y"])
            arr = []
            for r in con.execute("SELECT precio, area_terreno, area_construida, x, y FROM inmuebles WHERE tipo = ? AND operacion = 'arriendo' "
                                 "AND estado_publicacion IN ('publicado','vendido') AND precio > 0 AND x IS NOT NULL", (inm["tipo"],)):
                if zona and _zona(r["x"], r["y"]) == zona:
                    arr.append((r["precio"], _area(inm["tipo"], r["area_terreno"], r["area_construida"])))
            est = mercado.canon_estimado(arr, area)
            if est:
                out["canon_mensual"], out["origen_canon"], out["canon_n"] = est["canon"], f"mediana de {est['n']} arriendos del mismo tipo en {zona} ({est['canon_m2']:,} $/m²)".replace(",", "."), est["n"]
            else:
                out["avisos"].append("Sin canon: indica el canon esperado o publica al menos 2 arriendos del mismo tipo en el mismo sector.")
    out["rentabilidad_pct"] = mercado.rentabilidad_pct(out["canon_mensual"], out["valor_base"])
    if inm["operacion"] == "venta":
        out["rentabilidad_sobre_estimado_pct"] = mercado.rentabilidad_pct(out["canon_mensual"], estimado)
    return out

@router.get("/inmuebles/{inmueble_id}/inversion", summary="Rentabilidad bruta anual = canon anual / valor del inmueble")
def inversion(inmueble_id: int, _: Admin):
    with conexion() as con:
        return _inversion(con, _inm(con, inmueble_id))

@router.put("/inmuebles/{inmueble_id}/inversion", summary="Fija el canon mensual esperado (inmuebles en venta)")
def fijar_inversion(inmueble_id: int, d: InversionIn, usuario: Admin):
    with conexion() as con:
        inm = _inm(con, inmueble_id)
        con.execute("INSERT INTO inmueble_inversion (inmueble_id, canon_mensual_esperado, nota) VALUES (?,?,?) "
                    "ON CONFLICT(inmueble_id) DO UPDATE SET canon_mensual_esperado = excluded.canon_mensual_esperado, nota = excluded.nota, "
                    "actualizado_en = strftime('%Y-%m-%dT%H:%M:%SZ','now')", (inmueble_id, d.canon_mensual_esperado, d.nota))
        auditar(con, usuario, "canon_esperado", inmueble_id)
        return _inversion(con, inm)
