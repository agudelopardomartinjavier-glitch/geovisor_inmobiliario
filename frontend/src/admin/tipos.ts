import type { Operacion, Tipo } from '../lib/types'

export type Estado = 'borrador' | 'publicado' | 'vendido'

export interface InmuebleAdmin {
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
  estado_publicacion: Estado
  fecha_publicacion: string | null
  lon: number | null
  lat: number | null
  propietario: string | null
  avaluo: number | null
  notas_internas: string | null
  creado_en: string
  actualizado_en: string
}

/** Cuerpo que acepta la API (POST/PUT). */
export interface InmuebleForm {
  tipo: Tipo
  operacion: Operacion
  estado_publicacion: Estado
  numero_predial: string | null
  lon: number | null
  lat: number | null
  precio: number | null
  area_terreno: number | null
  area_construida: number | null
  habitaciones: number | null
  banos: number | null
  descripcion: string | null
  fotos: string[]
  contacto: string | null
  propietario: string | null
  avaluo: number | null
  notas_internas: string | null
}

export const COLOR_ESTADO: Record<Estado, string> = { publicado: '#16a34a', borrador: '#f59e0b', vendido: '#6b7280' }

// ---------------------------------------------------------------- Fase 6: comparables
export type OperacionComp = 'oferta' | 'venta'

export interface Comparable {
  id: number
  tipo: Tipo
  operacion: OperacionComp
  precio: number
  area_terreno: number | null
  area_construida: number | null
  fecha: string | null
  fuente: string | null
  referencia: string | null
  contacto: string | null
  descripcion: string | null
  numero_predial: string | null
  sector: string | null
  lon: number | null
  lat: number | null
}

export type ComparableDatos = Omit<Comparable, 'id'>

export interface Vinculo {
  comparable: Comparable
  ajuste_pct: number
  incluir: boolean
  nota: string | null
  unitario: number | null
  ajustado: number | null
  distancia_m: number | null
}

export interface Sugerido {
  comparable: Comparable
  distancia_m: number
  unitario: number | null
}

export interface Valoracion {
  base: 'terreno' | 'construida'
  area_sujeto: number | null
  n: number
  media: number | null
  mediana: number | null
  desviacion: number | null
  cv_pct: number | null
  cv_ok: boolean | null
  umbral_cv_pct: number
  valor_estimado: number | null
  rango_bajo: number | null
  rango_alto: number | null
  avisos: string[]
  precio_publicado: number | null
  avaluo_registrado: number | null
  dif_precio_pct: number | null
  dif_avaluo_pct: number | null
}

export const COLOR_COMPARABLE = '#7c3aed'
