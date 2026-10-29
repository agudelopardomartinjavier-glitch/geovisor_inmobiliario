import type { Geometry } from 'geojson'

export type Tipo = 'casa' | 'lote' | 'finca' | 'local' | 'apartamento'
export type Operacion = 'venta' | 'arriendo'

export interface InmuebleProps {
  id: number
  numero_predial: string | null
  tipo: Tipo
  operacion: Operacion
  precio: number | null
  area_terreno: number | null
  area_construida: number | null
  habitaciones: number | null
  banos: number | null
  descripcion: string | null
  fotos: string[]
  contacto: string | null
  fecha_publicacion: string | null
  barrio: string | null
  vereda: string | null
}

export interface InmuebleFeature {
  type: 'Feature'
  id: number
  geometry: { type: 'Point'; coordinates: [number, number] }
  properties: InmuebleProps
}

export interface InmuebleCollection {
  type: 'FeatureCollection'
  features: InmuebleFeature[]
  total: number
}

export interface ZonaRef { tipo: 'barrio' | 'vereda'; nombre: string }

export interface Filtros {
  zona: ZonaRef | null
  tipos: Tipo[]
  operacion: Operacion | ''
  precioMin: string
  precioMax: string
  areaMin: string
  areaMax: string
}

export interface Capa {
  nombre: string
  grupo: 'catastro' | 'pot' | 'ambiental'
  geometria: string | null
  entidades: number | null
  minzoom: number
  maxzoom: number
  formato: 'mvt' | 'geojson'
  tiles: string | null
  geojson: string | null
  capa_fuente: string
}

export interface Cruce {
  atributos: Record<string, string | number | null>
  area_m2: number
  porcentaje_predio: number
}

export interface GrupoCruce {
  clave: string
  titulo: string
  items: Cruce[]
}

export interface Predio {
  numero_predial: string
  registros: number
  codigo_municipio: string | null
  manzana_codigo: string | null
  vereda_codigo: string | null
  area_m2: number
  bbox: [number, number, number, number]
  centroide: [number, number]
  ubicacion: Record<string, string | null>
  geometry: Geometry
  uso_suelo: GrupoCruce[]
  pomca: GrupoCruce[]
  inmuebles_publicados: number[]
}

export interface Zona extends ZonaRef {
  lon: number
  lat: number
  bbox: [number, number, number, number]
  venta: number
  arriendo: number
  total: number
}

export interface ZonaDetalle extends Zona {
  geometry: Geometry
}
