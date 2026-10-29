import type { ColorSemaforo, FichaPublica, Operacion, Tipo } from '../lib/types'

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
  indicador: { clasificacion: 'por_debajo' | 'en_rango' | 'por_encima' | 'sin_dato' | 'no_aplica'; dif_pct: number | null; confianza: 'alta' | 'media' | 'baja' | null; tolerancia_pct: number }
}

export const COLOR_COMPARABLE = '#7c3aed'

// ---------------------------------------------------------------- Fase 1: ficha ampliada, jurídico, soportes, semáforo

export type FichaAdmin = Omit<FichaPublica, 'semaforo'> & { entorno_calculado_en: string | null }
export type FichaDatos = Omit<FichaAdmin, 'inmueble_id' | 'entorno' | 'entorno_calculado_en'>

export interface Juridico {
  matricula_inmobiliaria: string | null
  escritura_numero: string | null
  escritura_fecha: string | null
  notaria: string | null
  hipoteca: boolean | null
  embargo: boolean | null
  afectacion_vivienda_familiar: boolean | null
  servidumbres: string | null
  litigios: string | null
  sucesion_pendiente: boolean | null
  linderos: string | null
  predial_estado: 'al_dia' | 'mora' | 'desconocido'
  predial_ultimo_anio_pagado: number | null
  valorizacion_estado: 'sin_cobro' | 'pendiente' | 'pagada' | 'desconocido'
  paz_salvo_predial_fecha: string | null
  paz_salvo_valorizacion_fecha: string | null
  notas: string | null
}

export type TipoSoporte = 'certificado_tradicion' | 'escritura' | 'linderos' | 'paz_salvo_predial' | 'paz_salvo_valorizacion' | 'otro'
export const NOMBRE_SOPORTE: Record<TipoSoporte, string> = {
  certificado_tradicion: 'Certificado de tradición', escritura: 'Copia de escritura', linderos: 'Fotos de linderos',
  paz_salvo_predial: 'Paz y salvo predial', paz_salvo_valorizacion: 'Paz y salvo de valorización', otro: 'Otro',
}

export interface Soporte {
  id: number
  inmueble_id: number
  tipo: TipoSoporte
  nombre_original: string
  mime: string
  tamano: number
  fecha_documento: string | null
  fecha_vencimiento: string | null
  creado_en: string
  estado: 'vigente' | 'por_vencer' | 'vencido' | 'sin_vencimiento'
  dias_para_vencer: number | null
}

export interface Hallazgo { categoria: 'juridico' | 'ambiental' | 'normativo'; nivel: 'amarillo' | 'rojo'; codigo: string; texto: string }
export interface SemaforoAdmin {
  inmueble_id: number
  color: ColorSemaforo
  resumen_publico: string
  categorias: string[]
  detalle: { mediciones: Record<string, unknown>; hallazgos: Hallazgo[]; umbrales: { rojo_pct: number; amarillo_pct: number; vigencia_certificado_dias: number } }
  reglas_version: string
  calculado_en: string
}

export interface Parametro { clave: string; valor: string; descripcion: string; requiere_confirmar: number; actualizado_en: string }

// ---------------------------------------------------------------- Fase 2: historial, mercado y rentabilidad
export interface PrecioHist { id: number; fecha: string; precio: number; precio_anterior: number | null; tipo: 'inicial' | 'rebaja' | 'aumento'; nota: string | null; origen: 'automatico' | 'manual' }
export interface AvaluoHist { id: number; fecha: string; valor: number; fuente: string; nota: string | null; origen: 'automatico' | 'manual' }
export interface EstadoHist { id: number; fecha: string; estado: Estado }
export interface Estadisticas { n: number; mediana: number | null; p25: number | null; p75: number | null; minimo: number | null; maximo: number | null }

export interface Historial {
  precios: PrecioHist[]
  avaluos: AvaluoHist[]
  estados: EstadoHist[]
  mercado: { dias: number; publicado_desde: string | null; publicado_ahora: boolean; vendido_el: string | null; dias_hasta_venta: number | null }
  rebajas: { n_cambios: number; n_rebajas: number; variacion_pct: number | null; rebaja_maxima_pct: number | null; dias_desde_ultimo_cambio: number | null }
  m2: { base: 'terreno' | 'construida'; precio_m2: number | null; zona: string | null; sector: Estadisticas; dif_pct: number | null; suficiente: boolean }
}

export interface Inversion {
  operacion: Operacion
  canon_manual: number | null
  nota: string | null
  canon_mensual: number | null
  origen_canon: string | null
  valor_base: number | null
  origen_valor: string | null
  rentabilidad_pct: number | null
  rentabilidad_sobre_estimado_pct: number | null
  valor_estimado: number | null
  avisos: string[]
}

export interface SectorM2 extends Estadisticas { zona: string; confiable: boolean }
export interface MapaM2 {
  tipo: Tipo
  base: 'terreno' | 'construida'
  n_puntos: number
  sectores: SectorM2[]
  celdas: GeoJSON.FeatureCollection | null
  escala?: { minimo: number | null; maximo: number | null }
  celda_m?: number
  radio_m?: number
  aviso: string | null
}
