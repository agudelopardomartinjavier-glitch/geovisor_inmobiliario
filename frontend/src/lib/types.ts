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
  semaforo?: ColorSemaforo | null
}

export type ColorSemaforo = 'verde' | 'amarillo' | 'rojo'

export interface Entorno {
  via_principal_m: number | null
  colegio_m: number | null
  parque_m: number | null
  centro_salud_m: number | null
  casco_urbano_m: number | null
  drenaje_m: number | null
  nacimiento_m: number | null
}

/** Ficha ampliada pública. El semáforo trae solo color y resumen; el detalle es privado. */
export interface FichaPublica {
  inmueble_id: number
  estrato: number | null
  antiguedad_anos: number | null
  estado_conservacion: string | null
  pisos: number | null
  parqueaderos: number | null
  deposito: boolean | null
  acabados: string | null
  orientacion: string | null
  agua: boolean | null
  alcantarillado: boolean | null
  gas: boolean | null
  energia: boolean | null
  internet: boolean | null
  fuentes_agua: string | null
  tipo_suelo: string | null
  vocacion: string | null
  cultivos: string | null
  mejoras: string | null
  via_acceso: string | null
  video_url: string | null
  recorrido_360_url: string | null
  plano_url: string | null
  negociable: boolean | null
  permuta: boolean | null
  financiacion: boolean | null
  administracion_mensual: number | null
  disponible_desde: string | null
  entorno: Partial<Entorno>
  semaforo: { color: ColorSemaforo; resumen: string } | null
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
