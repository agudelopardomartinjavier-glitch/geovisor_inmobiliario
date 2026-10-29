"""Comparables de mercado y valoración por comparación. Solo administrador: nada de esto llega a publico.gpkg."""
import sqlite3
from datetime import date, timedelta
from typing import Annotated, Optional

from fastapi import APIRouter, HTTPException, Query, Response
from shapely.geometry import Point

from ..geo import a_4326, a_9377
from .. import mercado
from . import parametros as par
from . import valoracion as val
from .db import auditar, conexion
from .router import Admin, _punto_predio
from .schemas import ComparableIn, ComparableOut, Sugerido, VinculoIn, VinculoOut

router = APIRouter(prefix="/admin", tags=["admin · comparables"])

COLS = ("tipo", "operacion", "precio", "area_terreno", "area_construida", "fecha", "fuente", "referencia",
        "contacto", "descripcion", "numero_predial", "sector", "x", "y")

def _comp_out(r: sqlite3.Row) -> ComparableOut:
    d = {k: r[k] for k in r.keys() if k not in ("x", "y", "creado_en", "actualizado_en")}
    d["lon"] = d["lat"] = None
    if r["x"] is not None and r["y"] is not None:
        p = a_4326(Point(r["x"], r["y"]))
        d["lon"], d["lat"] = round(p.x, 7), round(p.y, 7)
    return ComparableOut(**d)

def _valores(d: ComparableIn, x_actual=None, y_actual=None) -> dict:
    v = d.model_dump(exclude={"lon", "lat"})
    if d.lon is not None and d.lat is not None:
        p = a_9377(Point(d.lon, d.lat)); v["x"], v["y"] = round(p.x, 3), round(p.y, 3)
    elif x_actual is not None:
        v["x"], v["y"] = x_actual, y_actual
    elif d.numero_predial:
        p = _punto_predio(d.numero_predial); v["x"], v["y"] = round(p.x, 3), round(p.y, 3)
    else:
        v["x"] = v["y"] = None
    if d.numero_predial:
        _punto_predio(d.numero_predial)
    return v

def _inmueble(con, inmueble_id: int) -> sqlite3.Row:
    r = con.execute("SELECT * FROM inmuebles WHERE id = ?", (inmueble_id,)).fetchone()
    if not r:
        raise HTTPException(404, "Inmueble no encontrado")
    return r

# ---------------------------------------------------------------- biblioteca de comparables
@router.get("/comparables", response_model=list[ComparableOut], summary="Lista de comparables")
def listar(_: Admin, tipo: Optional[str] = Query(None, pattern="^(casa|lote|finca|local|apartamento)$"), q: Optional[str] = Query(None, max_length=100)):
    sql, args = "SELECT * FROM comparables WHERE 1=1", []
    if tipo:
        sql += " AND tipo = ?"; args.append(tipo)
    if q:
        sql += " AND (sector LIKE ? OR fuente LIKE ? OR descripcion LIKE ? OR numero_predial LIKE ?)"; args += [f"%{q}%"] * 4
    with conexion() as con:
        return [_comp_out(r) for r in con.execute(sql + " ORDER BY COALESCE(fecha,'') DESC, id DESC", args)]

@router.post("/comparables", response_model=ComparableOut, status_code=201)
def crear(datos: ComparableIn, usuario: Admin):
    v = _valores(datos)
    with conexion() as con:
        cur = con.execute(f"INSERT INTO comparables ({', '.join(COLS)}) VALUES ({', '.join('?' * len(COLS))})", [v[c] for c in COLS])
        auditar(con, usuario, "crear_comparable", detalle={"comparable": cur.lastrowid})
        return _comp_out(con.execute("SELECT * FROM comparables WHERE id = ?", (cur.lastrowid,)).fetchone())

@router.put("/comparables/{cid}", response_model=ComparableOut)
def editar(cid: int, datos: ComparableIn, usuario: Admin):
    with conexion() as con:
        antes = con.execute("SELECT * FROM comparables WHERE id = ?", (cid,)).fetchone()
        if not antes:
            raise HTTPException(404, "Comparable no encontrado")
        v = _valores(datos, antes["x"], antes["y"])
        con.execute(f"UPDATE comparables SET {', '.join(c + ' = ?' for c in COLS)} WHERE id = ?", [v[c] for c in COLS] + [cid])
        auditar(con, usuario, "editar_comparable", detalle={"comparable": cid, "campos": [c for c in COLS if antes[c] != v[c]]})
        return _comp_out(con.execute("SELECT * FROM comparables WHERE id = ?", (cid,)).fetchone())

@router.delete("/comparables/{cid}", status_code=204, summary="Elimina el comparable y lo desvincula de todos los inmuebles")
def eliminar(cid: int, usuario: Admin):
    with conexion() as con:
        if not con.execute("SELECT 1 FROM comparables WHERE id = ?", (cid,)).fetchone():
            raise HTTPException(404, "Comparable no encontrado")
        con.execute("DELETE FROM comparables WHERE id = ?", (cid,))
        auditar(con, usuario, "eliminar_comparable", detalle={"comparable": cid})
    return Response(status_code=204)

# ---------------------------------------------------------------- comparables de un inmueble
def _vinculos(con, inm: sqlite3.Row) -> list[VinculoOut]:
    base = val.area_base(inm["tipo"])
    filas = con.execute("""SELECT c.*, v.ajuste_pct, v.incluir, v.nota FROM inmueble_comparables v
                           JOIN comparables c ON c.id = v.comparable_id WHERE v.inmueble_id = ? ORDER BY c.id""", (inm["id"],)).fetchall()
    out = []
    for r in filas:
        comp = val.Comp(r["id"], r["precio"], r["area_terreno"], r["area_construida"], r["ajuste_pct"], bool(r["incluir"]))
        u = val.unitarios([comp], base)[0]
        dist = val.distancia(inm["x"], inm["y"], r["x"], r["y"]) if None not in (inm["x"], r["x"]) else None
        out.append(VinculoOut(comparable=_comp_out(r), ajuste_pct=r["ajuste_pct"], incluir=bool(r["incluir"]), nota=r["nota"],
                              unitario=u["unitario"], ajustado=u["ajustado"], distancia_m=round(dist, 1) if dist is not None else None))
    return out

@router.get("/inmuebles/{inmueble_id}/comparables", response_model=list[VinculoOut])
def de_inmueble(inmueble_id: int, _: Admin):
    with conexion() as con:
        return _vinculos(con, _inmueble(con, inmueble_id))

@router.put("/inmuebles/{inmueble_id}/comparables/{cid}", response_model=list[VinculoOut], summary="Vincula un comparable (o actualiza su ajuste)")
def vincular(inmueble_id: int, cid: int, datos: VinculoIn, usuario: Admin):
    with conexion() as con:
        inm = _inmueble(con, inmueble_id)
        if not con.execute("SELECT 1 FROM comparables WHERE id = ?", (cid,)).fetchone():
            raise HTTPException(404, "Comparable no encontrado")
        con.execute("""INSERT INTO inmueble_comparables (inmueble_id, comparable_id, ajuste_pct, incluir, nota) VALUES (?,?,?,?,?)
                       ON CONFLICT(inmueble_id, comparable_id) DO UPDATE SET ajuste_pct = excluded.ajuste_pct, incluir = excluded.incluir, nota = excluded.nota""",
                    (inmueble_id, cid, datos.ajuste_pct, int(datos.incluir), datos.nota))
        auditar(con, usuario, "vincular", inmueble_id, {"comparable": cid, "ajuste_pct": datos.ajuste_pct, "incluir": datos.incluir})
        return _vinculos(con, inm)

@router.delete("/inmuebles/{inmueble_id}/comparables/{cid}", response_model=list[VinculoOut])
def desvincular(inmueble_id: int, cid: int, usuario: Admin):
    with conexion() as con:
        inm = _inmueble(con, inmueble_id)
        con.execute("DELETE FROM inmueble_comparables WHERE inmueble_id = ? AND comparable_id = ?", (inmueble_id, cid))
        auditar(con, usuario, "desvincular", inmueble_id, {"comparable": cid})
        return _vinculos(con, inm)

@router.get("/inmuebles/{inmueble_id}/comparables-sugeridos", response_model=list[Sugerido], summary="Comparables cercanos del mismo tipo aún no vinculados")
def sugeridos(inmueble_id: int, _: Admin, radio_m: Annotated[float, Query(gt=0, le=50000)] = 3000,
              meses: Annotated[int, Query(ge=1, le=240)] = 24, limite: Annotated[int, Query(ge=1, le=50)] = 15):
    with conexion() as con:
        inm = _inmueble(con, inmueble_id)
        if inm["x"] is None:
            raise HTTPException(422, "Ubica primero el inmueble para buscar comparables cercanos")
        desde = (date.today() - timedelta(days=round(meses * 30.44))).isoformat()
        base = val.area_base(inm["tipo"])
        filas = con.execute("""SELECT * FROM comparables WHERE tipo = ? AND x IS NOT NULL AND (fecha IS NULL OR fecha >= ?)
                               AND id NOT IN (SELECT comparable_id FROM inmueble_comparables WHERE inmueble_id = ?)""",
                            (inm["tipo"], desde, inmueble_id)).fetchall()
        res = []
        for r in filas:
            d = val.distancia(inm["x"], inm["y"], r["x"], r["y"])
            if d <= radio_m:
                u = val.unitarios([val.Comp(r["id"], r["precio"], r["area_terreno"], r["area_construida"])], base)[0]["unitario"]
                res.append(Sugerido(comparable=_comp_out(r), distancia_m=round(d, 1), unitario=u))
        return sorted(res, key=lambda s: s.distancia_m)[:limite]

def _calcular(con, inm: sqlite3.Row) -> tuple[dict, list[sqlite3.Row]]:
    """Valoración del inmueble y las filas de sus comparables vinculados."""
    base = val.area_base(inm["tipo"])
    filas = con.execute("""SELECT c.*, v.ajuste_pct, v.incluir, v.nota FROM inmueble_comparables v
                           JOIN comparables c ON c.id = v.comparable_id WHERE v.inmueble_id = ? ORDER BY c.id""", (inm["id"],)).fetchall()
    area = inm["area_terreno"] if base == "terreno" else inm["area_construida"]
    r = val.valorar(inm["tipo"], area, [val.Comp(f["id"], f["precio"], f["area_terreno"], f["area_construida"], f["ajuste_pct"], bool(f["incluir"])) for f in filas])
    est = r["valor_estimado"]
    r["precio_publicado"] = inm["precio"]
    r["avaluo_registrado"] = inm["avaluo"]
    venta = inm["operacion"] == "venta"      # en arriendo `precio` es un canon mensual: no se compara con un valor de venta
    r["dif_precio_pct"] = round(100 * (inm["precio"] - est) / est, 1) if est and inm["precio"] and venta else None
    tol = par.numero(par.todos(con), "valoracion.tolerancia_pct")
    r["indicador"] = mercado.indicador_precio(inm["precio"], est, r["n"], r["cv_ok"], tol) if venta else         {"clasificacion": "no_aplica", "dif_pct": None, "confianza": None, "tolerancia_pct": tol}
    r["dif_avaluo_pct"] = round(100 * (inm["avaluo"] - est) / est, 1) if est and inm["avaluo"] else None
    return r, filas

@router.get("/inmuebles/{inmueble_id}/valoracion", summary="Valor estimado por comparación de mercado")
def valoracion(inmueble_id: int, _: Admin):
    with conexion() as con:
        return _calcular(con, _inmueble(con, inmueble_id))[0]

@router.get("/inmuebles/{inmueble_id}/informe.pdf", summary="Informe PDF confidencial de la valoración", response_class=Response)
def informe(inmueble_id: int, usuario: Admin):
    from ..db import engine
    from ..pdf.informe import informe_pdf
    with conexion() as con:
        inm = _inmueble(con, inmueble_id)
        r, filas = _calcular(con, inm)
        auditar(con, usuario, "informe_pdf", inmueble_id)
        inm_d, vinc = dict(inm), [dict(f) for f in filas]
    with engine.connect() as pub:
        pdf = informe_pdf(pub, inm_d, vinc, r)
    return Response(pdf, media_type="application/pdf", headers={"Content-Disposition": f'inline; filename="valoracion-inmueble-{inmueble_id}.pdf"', "Cache-Control": "no-store"})
