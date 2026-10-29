"""Rutas /admin: login, CRUD de inmuebles con campos privados y publicación. Todo (salvo /login) exige token."""
import json
import sqlite3
from typing import Annotated, Optional

from fastapi import APIRouter, Depends, HTTPException, Query, Request, Response
from shapely.geometry import Point
from shapely.ops import unary_union
from sqlalchemy import select

from .. import config
from ..db import engine
from ..geo import a_4326, a_9377, gpkg_a_shapely
from ..models.tablas import predios
from . import auth
from .db import auditar, conexion, sincronizar_publico
from .ficha_servicio import recalcular
from .schemas import EstadoIn, InmuebleAdmin, InmuebleIn, LoginIn, TokenOut

router = APIRouter(prefix="/admin", tags=["admin"])
Admin = Annotated[str, Depends(auth.admin_actual)]

CAMPOS = ("numero_predial", "tipo", "operacion", "precio", "area_terreno", "area_construida", "habitaciones", "banos",
          "descripcion", "fotos", "contacto", "estado_publicacion", "x", "y", "propietario", "avaluo", "notas_internas")

def _salida(r: sqlite3.Row) -> InmuebleAdmin:
    d = dict(r)
    x, y = d.pop("x"), d.pop("y")
    d["lon"], d["lat"] = (None, None)
    if x is not None and y is not None:
        pt = a_4326(Point(x, y))
        d["lon"], d["lat"] = round(pt.x, 7), round(pt.y, 7)
    d["fotos"] = json.loads(d["fotos"] or "[]")
    return InmuebleAdmin(**d)

def _punto_predio(numero_predial: str):
    with engine.connect() as c:
        filas = c.execute(select(predios.c.geom).where(predios.c.numero_predial == numero_predial)).all()
    if not filas:
        raise HTTPException(422, f"El número predial {numero_predial} no existe en el catastro")
    g = unary_union([gpkg_a_shapely(f.geom) for f in filas if f.geom])
    return g.representative_point()

def _valores(d: InmuebleIn, x_actual: Optional[float] = None, y_actual: Optional[float] = None) -> dict:
    """Convierte el JSON del panel en columnas; resuelve la ubicación (lon/lat > ubicación actual > centro del predio)."""
    v = d.model_dump(exclude={"lon", "lat"})
    v["fotos"] = json.dumps(d.fotos, ensure_ascii=False)
    if d.lon is not None and d.lat is not None:
        p = a_9377(Point(d.lon, d.lat))
        v["x"], v["y"] = round(p.x, 3), round(p.y, 3)
    elif x_actual is not None:
        v["x"], v["y"] = x_actual, y_actual
    elif d.numero_predial:
        p = _punto_predio(d.numero_predial)
        v["x"], v["y"] = round(p.x, 3), round(p.y, 3)
    else:
        v["x"] = v["y"] = None
    if d.numero_predial:
        _punto_predio(d.numero_predial)  # valida que exista
    if d.estado_publicacion == "publicado" and v["x"] is None:
        raise HTTPException(422, "Para publicar hay que ubicar el inmueble (clic en el mapa o número predial)")
    return v

# ---------------------------------------------------------------- sesión
@router.post("/login", response_model=TokenOut, summary="Inicia sesión y devuelve un token Bearer")
def login(datos: LoginIn, request: Request):
    intentos = auth.limitar_login(request)
    with conexion() as con:
        fila = con.execute("SELECT clave_hash FROM admin_usuarios WHERE usuario = ?", (datos.usuario,)).fetchone()
        # se verifica siempre una clave para no revelar por tiempo si el usuario existe
        ok = auth.verificar_password(datos.password, fila["clave_hash"] if fila else auth.hash_password("x"))
        if not (fila and ok):
            auth.registrar_fallo(intentos)
            auditar(con, datos.usuario[:64], "login_fallido", detalle=request.client.host if request.client else None)
            con.commit()
            raise HTTPException(401, "Usuario o clave incorrectos")
        auditar(con, datos.usuario, "login")
    return TokenOut(token=auth.crear_token(datos.usuario), usuario=datos.usuario)

@router.get("/me", summary="Usuario de la sesión")
def me(usuario: Admin):
    return {"usuario": usuario}

# ---------------------------------------------------------------- inmuebles
@router.get("/inmuebles", response_model=list[InmuebleAdmin], summary="Todos los inmuebles, con campos privados")
def listar(_: Admin, estado: Optional[str] = Query(None, pattern="^(borrador|publicado|vendido)$"), q: Optional[str] = Query(None, max_length=100)):
    sql, args = "SELECT * FROM inmuebles WHERE 1=1", []
    if estado:
        sql += " AND estado_publicacion = ?"; args.append(estado)
    if q:
        sql += " AND (numero_predial LIKE ? OR propietario LIKE ? OR descripcion LIKE ? OR notas_internas LIKE ?)"
        args += [f"%{q}%"] * 4
    with conexion() as con:
        return [_salida(r) for r in con.execute(sql + " ORDER BY actualizado_en DESC, id DESC", args)]

@router.get("/inmuebles/{inmueble_id}", response_model=InmuebleAdmin)
def detalle(inmueble_id: int, _: Admin):
    with conexion() as con:
        r = con.execute("SELECT * FROM inmuebles WHERE id = ?", (inmueble_id,)).fetchone()
    if not r:
        raise HTTPException(404, "Inmueble no encontrado")
    return _salida(r)

@router.post("/inmuebles", response_model=InmuebleAdmin, status_code=201, summary="Crea un inmueble")
def crear(datos: InmuebleIn, usuario: Admin):
    v = _valores(datos)
    with conexion() as con:
        cur = con.execute(f"INSERT INTO inmuebles ({', '.join(CAMPOS)}) VALUES ({', '.join('?' * len(CAMPOS))})", [v[c] for c in CAMPOS])
        nuevo = cur.lastrowid
        auditar(con, usuario, "crear", nuevo, {"estado": datos.estado_publicacion, "numero_predial": datos.numero_predial})
        recalcular(nuevo, con)   # entorno + semáforo
        r = con.execute("SELECT * FROM inmuebles WHERE id = ?", (nuevo,)).fetchone()
    sincronizar_publico()
    return _salida(r)

@router.put("/inmuebles/{inmueble_id}", response_model=InmuebleAdmin, summary="Reemplaza los datos de un inmueble")
def editar(inmueble_id: int, datos: InmuebleIn, usuario: Admin):
    with conexion() as con:
        antes = con.execute("SELECT * FROM inmuebles WHERE id = ?", (inmueble_id,)).fetchone()
        if not antes:
            raise HTTPException(404, "Inmueble no encontrado")
        v = _valores(datos, antes["x"], antes["y"])
        con.execute(f"UPDATE inmuebles SET {', '.join(c + ' = ?' for c in CAMPOS)} WHERE id = ?", [v[c] for c in CAMPOS] + [inmueble_id])
        cambios = [c for c in CAMPOS if antes[c] != v[c]]
        auditar(con, usuario, "editar", inmueble_id, {"campos": cambios})  # solo nombres de campos, no valores sensibles
        recalcular(inmueble_id, con, recalcular_entorno=any(c in cambios for c in ("x", "y")))
        r = con.execute("SELECT * FROM inmuebles WHERE id = ?", (inmueble_id,)).fetchone()
    sincronizar_publico()
    return _salida(r)

@router.patch("/inmuebles/{inmueble_id}/estado", response_model=InmuebleAdmin, summary="Publica, despublica o marca como vendido")
def cambiar_estado(inmueble_id: int, datos: EstadoIn, usuario: Admin):
    with conexion() as con:
        antes = con.execute("SELECT * FROM inmuebles WHERE id = ?", (inmueble_id,)).fetchone()
        if not antes:
            raise HTTPException(404, "Inmueble no encontrado")
        if datos.estado_publicacion == "publicado" and antes["x"] is None:
            raise HTTPException(422, "Para publicar hay que ubicar el inmueble")
        con.execute("UPDATE inmuebles SET estado_publicacion = ? WHERE id = ?", (datos.estado_publicacion, inmueble_id))
        auditar(con, usuario, "estado", inmueble_id, {"de": antes["estado_publicacion"], "a": datos.estado_publicacion})
        r = con.execute("SELECT * FROM inmuebles WHERE id = ?", (inmueble_id,)).fetchone()
    sincronizar_publico()
    return _salida(r)

@router.delete("/inmuebles/{inmueble_id}", status_code=204, summary="Elimina un inmueble (irreversible)")
def eliminar(inmueble_id: int, usuario: Admin):
    with conexion() as con:
        r = con.execute("SELECT numero_predial FROM inmuebles WHERE id = ?", (inmueble_id,)).fetchone()
        if not r:
            raise HTTPException(404, "Inmueble no encontrado")
        try:
            con.execute("DELETE FROM inmuebles WHERE id = ?", (inmueble_id,))
        except sqlite3.IntegrityError:
            raise HTTPException(409, "El inmueble tiene movimientos contables (comisiones, contratos, gastos…): no se puede eliminar. Márcalo como vendido o despublícalo.")
        auditar(con, usuario, "eliminar", inmueble_id, {"numero_predial": r["numero_predial"]})
    sincronizar_publico()
    return Response(status_code=204)
