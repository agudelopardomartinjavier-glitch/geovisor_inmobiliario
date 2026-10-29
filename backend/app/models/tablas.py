"""Definición (SQLAlchemy Core) de las tablas públicas. Solo columnas no sensibles; la geometría se lee como BLOB."""
from sqlalchemy import Column, Float, Integer, LargeBinary, MetaData, String, Table, Text

metadata = MetaData()

inmuebles_publicos = Table(
    "inmuebles_publicos", metadata,
    Column("id", Integer, primary_key=True),
    Column("numero_predial", String),
    Column("tipo", String), Column("operacion", String),
    Column("precio", Integer),
    Column("area_terreno", Float), Column("area_construida", Float),
    Column("habitaciones", Integer), Column("banos", Integer),
    Column("descripcion", Text), Column("fotos", Text), Column("contacto", String),
    Column("fecha_publicacion", String),
    Column("x", Float), Column("y", Float),
)

predios = Table(
    "predios", metadata,
    Column("id", Integer, primary_key=True),
    Column("numero_predial", String),
    Column("manzana_codigo", String), Column("vereda_codigo", String), Column("codigo_municipio", String),
    Column("geom", LargeBinary),
)

catalogo_capas = Table(
    "catalogo_capas", metadata,
    Column("nombre", String, primary_key=True),
    Column("grupo", String), Column("geometria", String), Column("entidades", Integer),
)

# Capas contra las que se cruza un predio: clave -> (tabla, columna FID, campos a mostrar, título)
# Solo se interpolan nombres de esta lista blanca en el SQL.
CRUCES_POT = {
    "clasificacion": ("cg_2_clasificacion_suelo", "gid", ("codigo", "convencion"), "Clasificación del suelo"),
    "uso_urbano":    ("cu_7_usos_del_suelo", "gid", ("codigo", "convencion"), "Uso del suelo urbano"),
    "uso_rural":     ("cr_5_usos_suelo", "gid", ("codigo", "convencion"), "Uso del suelo rural"),
    "tratamiento":   ("cu_6_tratamientos", "gid", ("convencion",), "Tratamiento urbano"),
    "amenaza":       ("cu_13_amenazas", "gid", ("codigo", "convencion"), "Amenazas (urbano)"),
    "destinacion":   ("cr_5_destinacion_especifica", "gid", ("codigo", "convencion"), "Destinación específica (rural)"),
}
CRUCES_POMCA = {
    "pomca_guayuriba":     ("pomca_guayuriba", "gid", ("nomenclat", "categ_orde", "zon_uym", "subz_uym"), "POMCA río Guayuriba"),
    "pomca_acacias_pajure": ("pomca_acacias_pajure", "gid", ("codigofin", "zonificaci"), "POMCA Acacías–Pajure"),
}
UBICACION = {
    "barrio": ("cu_3_barrios", "gid", ("codigo", "convencion")),
    "vereda": ("cr_2_veredas", "gid", ("numero", "vereda")),
}
