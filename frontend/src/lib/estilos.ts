import type { ExpressionSpecification } from 'maplibre-gl'
import type { Capa } from './types'
import { tipoGeom } from './mapa'

/** Categoría de una capa: valor del campo, texto de leyenda, color y (en líneas) grosor / guiones. */
export interface Cat { v: string; e: string; c: string; w?: number; dash?: number[] }

interface Etiqueta {
  campo: string
  minzoom?: number
  maxzoom?: number
  tam?: [number, number]        // tamaño del texto en zoom bajo → alto
  mayus?: boolean
  color?: string
  halo?: string
  medium?: boolean
}

interface Estilo {
  titulo: string
  campo?: string                // campo por el que se colorea
  cats?: Cat[]
  fallback?: string
  color?: string                // color único si no hay categorías
  relleno?: number              // opacidad del relleno de polígonos (0 = sin relleno)
  ancho?: number                // grosor de línea / borde
  borde?: string                // color de borde distinto al del relleno
  dash?: number[]
  minzoom?: number
  etiqueta?: Etiqueta
  /** Si se define, las etiquetas usan este texto en lugar del campo tal cual (p. ej. quitar prefijos). */
}

const c = (v: string, e: string, col: string, extra: Partial<Cat> = {}): Cat => ({ v, e, c: col, ...extra })

/** Colores de uso general (elegidos para leerse bien sobre imagen satelital y sobre OSM). */
const ROJO = '#e53935', AMARILLO = '#fdd835', AZUL = '#1e88e5', VERDE = '#43a047', NARANJA = '#fb8c00'
const CICLO = ['#1e88e5', '#e53935', '#43a047', '#fb8c00', '#8e24aa', '#00acc1', '#fdd835', '#6d4c41', '#d81b60', '#7cb342', '#3949ab', '#ff7043', '#00897b', '#c0ca33']
const ciclo = (cods: [string, string][]): Cat[] => cods.map(([v, e], i) => c(v, e, CICLO[i % CICLO.length]))

export const ESTILOS: Record<string, Estilo> = {
  // ------------------------------------------------------------------ catastro
  predios: { titulo: 'Predios', color: '#facc15', relleno: 0.01, ancho: 1, minzoom: 12 },

  // ------------------------------------------------------------------ POT · general
  cg_2_clasificacion_suelo: {
    titulo: 'Clasificación del suelo', campo: 'codigo', relleno: 0.42, ancho: 1.6,
    cats: [c('SU', 'Suelo urbano', ROJO), c('SE', 'Suelo de expansión urbana', AMARILLO), c('SUCP', 'Urbano – centros poblados', NARANJA),
      c('SSU', 'Suelo suburbano', AZUL), c('SR', 'Suelo rural', VERDE)],
  },
  cg_5_unidades_planeamiento: {
    titulo: 'Unidades de planeamiento (UPR / UPZ)', campo: 'codigo', relleno: 0.4, ancho: 1.8,
    cats: [c('UPR1', 'UPR1 · Chichimene', '#ff7f0e'), c('UPR2', 'UPR2 · Dinamarca', '#1f77b4'), c('UPR3', 'UPR3 · Norte', '#2ca02c'),
      c('UPR4', 'UPR4 · Sur occidente', '#9467bd'), c('UPR5', 'UPR5 · Central', '#8c564b'), c('UPR6', 'UPR6 · Zona alta', '#17becf'),
      c('UPZ1', 'UPZ1', '#e377c2'), c('UPZ2', 'UPZ2', '#bcbd22'), c('UPZ3', 'UPZ3', '#d62728'), c('UPZ4', 'UPZ4', '#ffbb78')],
    etiqueta: { campo: 'codigo', minzoom: 9, maxzoom: 12, tam: [14, 18], mayus: true, medium: true },
  },
  cg_3_proteccion_hidrica: {
    titulo: 'Protección hídrica', campo: 'codigo', relleno: 0.4, ancho: 1,
    cats: [c('APH', 'Protección hídrica', '#4fc3f7'), c('APN', 'Protección de nacimiento', '#00acc1')],
  },
  cg_3_nacimientos: { titulo: 'Nacimientos de agua', color: '#00e5ff', minzoom: 11 },
  cg_4_vias_integracion_regional: {
    titulo: 'Vías de integración regional', campo: 'codigo', ancho: 3,
    cats: [c('DCAV', 'Doble calzada Acacías – Villavicencio', '#ff1744', { w: 4 }), c('VLMG', 'Ladrillera – Manzanares – Guayabetal', '#ff9100', { w: 3 })],
  },
  cg_6_acueducto_a_desarrollar: { titulo: 'Acueducto a desarrollar', color: '#40c4ff', ancho: 2.4, dash: [3, 2] },

  gen_areas_especiales: {
    titulo: 'Áreas especiales', campo: 'codigo', relleno: 0.4, ancho: 1.5,
    cats: [c('BNG', 'Bosque Los Guayupes', '#2e7d32'), c('CPO', 'Colonia Penal de Oriente', '#ff7043'), c('PNS', 'Parque Natural Sumapaz', '#1b5e20')],
    etiqueta: { campo: 'convencion', minzoom: 9, maxzoom: 15, tam: [10, 13], mayus: true },
  },
  gen_limites: {
    titulo: 'Límites', campo: 'codigo', ancho: 2,
    cats: [c('LM', 'Límite municipal', '#ff1744', { w: 3.2, dash: [4, 2] }), c('LV', 'Límite de vereda', '#ffffff', { w: 1.3, dash: [3, 2] }),
      c('PEU', 'Perímetro de expansión urbana', AMARILLO, { w: 2.2, dash: [3, 2] }), c('PECP', 'Perímetro expansión centro poblado', NARANJA, { w: 2, dash: [3, 2] })],
  },
  gen_vias: {
    titulo: 'Vías por orden', campo: 'codigo', ancho: 2.4,
    cats: [c('V1', 'Orden nacional', '#ff1744', { w: 3.6 }), c('V2', 'Orden departamental', '#ff9100', { w: 3 }), c('V3', 'Orden municipal', '#ffd600', { w: 2.2 })],
  },
  gen_hidrografia_lineas: {
    titulo: 'Hidrografía', campo: 'codigo', ancho: 1,
    cats: [c('RIO', 'Ríos', '#2979ff', { w: 2.4 }), c('CQ', 'Caños y quebradas', '#4fc3f7', { w: 1 })],
  },
  gen_humedales: { titulo: 'Humedales', color: '#26c6da', relleno: 0.5, ancho: 1 },
  gen_escuelas: { titulo: 'Escuelas (áreas)', color: '#7e57c2', relleno: 0.45, ancho: 1, minzoom: 12 },
  gen_escuelas_puntos: { titulo: 'Escuelas (puntos)', color: '#7e57c2', minzoom: 12 },
  gen_coordenadas: { titulo: 'Cuadrícula de coordenadas', color: '#ffffff', ancho: 0.6, dash: [2, 3] },
  gen_coordenadas_rotulos: { titulo: 'Rótulos de coordenadas', color: '#ffffff', minzoom: 99, etiqueta: { campo: 'texto', minzoom: 10, tam: [9, 11] } },

  // ------------------------------------------------------------------ POT · urbano
  cu_2_perimetros: {
    titulo: 'Perímetro urbano y de expansión', campo: 'capa_cad', relleno: 0.12, ancho: 3,
    cats: [c('A-URBANA', 'Área urbana', ROJO), c('A-EXPANSION', 'Expansión urbana', AMARILLO)],
  },
  cu_3_barrios: {
    // pedido: sin relleno, líneas amarillas y el nombre del barrio en el centro
    titulo: 'Barrios', color: '#ffeb3b', relleno: 0, ancho: 1.6,
    etiqueta: { campo: 'convencion', minzoom: 13.2, tam: [10, 14], mayus: true, medium: true },
  },
  cu_4_upz: {
    titulo: 'UPZ (zonas urbanas)', campo: 'upz', relleno: 0.4, ancho: 2,
    cats: [c('UPZ1', 'UPZ1', '#e377c2'), c('UPZ2', 'UPZ2', '#bcbd22'), c('UPZ3', 'UPZ3', '#d62728'), c('UPZ4', 'UPZ4', '#ffbb78')],
    etiqueta: { campo: 'upz', minzoom: 11, maxzoom: 15, tam: [14, 20], mayus: true, medium: true },
  },
  cu_6_tratamientos: {
    titulo: 'Tratamientos urbanísticos', campo: 'numero', relleno: 0.42, ancho: 1.2,
    cats: [c('1', 'Conservación', '#2e7d32'), c('2', 'Consolidación', AZUL), c('3', 'Renovación urbana', '#8e24aa'),
      c('4', 'Mejoramiento integral', NARANJA), c('5', 'Desarrollo', ROJO)],
  },
  cu_7_usos_del_suelo: {
    titulo: 'Usos del suelo urbano', campo: 'codigo', relleno: 0.45, ancho: 1,
    cats: [c('AAR1', 'Residencial I', '#fff176'), c('AAR2', 'Residencial II', '#ffca28'), c('AAR3', 'Residencial III', '#ff8f00'),
      c('AAC1', 'Comercial I', '#ef9a9a'), c('AAC2', 'Comercial II', '#e57373'), c('AAC3', 'Comercial III', '#c62828'),
      c('AAD1', 'Dotacional I', '#90caf9'), c('AAD2', 'Dotacional II', '#42a5f5'), c('AAD3', 'Dotacional III', '#1565c0'),
      c('AAI1', 'Industrial I', '#8e24aa')],
    etiqueta: { campo: 'codigo', minzoom: 14, tam: [10, 14], medium: true },
  },
  cu_8_conflictos_uso: {
    titulo: 'Conflictos de uso (urbano)', campo: 'codigo', relleno: 0.45, ancho: 1.2,
    cats: [c('ACU', 'Conflicto de uso del suelo', '#ff5252'), c('ACE', 'Conflicto especial – Caño Conejo', '#d500f9')],
  },
  cu_9_densidades: {
    titulo: 'Densidades', campo: 'codigo', relleno: 0.45, ancho: 1,
    cats: [c('AD', 'Alta densidad', '#b71c1c'), c('MD', 'Media densidad', '#f57c00'), c('BD', 'Baja densidad', '#fbc02d'),
      c('AR', 'Residencial restringida', '#9ccc65'), c('APA', 'Protección ambiental', '#2e7d32'), c('APD', 'Protección de drenaje', '#29b6f6')],
    etiqueta: { campo: 'codigo', minzoom: 14, tam: [10, 14], medium: true },
  },
  cu_10_espacio_publico: {
    titulo: 'Espacio público', campo: 'codigo', relleno: 0.5, ancho: 1,
    cats: [c('PZV', 'Parques y zonas verdes', '#66bb6a'), c('APD', 'Protección de drenaje', '#29b6f6'), c('APA', 'Protección ambiental', '#2e7d32'), c('AED', 'Equipamientos a desarrollar', '#ab47bc')],
  },
  cu_11_equipamientos: {
    titulo: 'Equipamientos colectivos', campo: 'codigo', relleno: 0.5, ancho: 1,
    cats: [c('COL', 'Colegios', '#5c6bc0'), c('PZV', 'Parques y zonas verdes', '#66bb6a')],
  },
  cu_12_proteccion: {
    titulo: 'Zonas de protección (urbano)', campo: 'codigo', relleno: 0.5, ancho: 1,
    cats: [c('AP', 'Área de protección', '#26a69a'), c('ZPE', 'Protección especial', '#2e7d32')],
  },
  cu_12_sistema_vial: {
    titulo: 'Sistema vial urbano', campo: 'codigo', ancho: 1.4, minzoom: 12,
    cats: [c('VN', 'Vía nacional', '#b71c1c', { w: 3.4 }), c('VA', 'Vía arteria', '#ef5350', { w: 2.6 }), c('VAS', 'Arteria secundaria', '#ff9800', { w: 2 }),
      c('AV1', 'Anillo vial 1', '#42a5f5', { w: 2.2 }), c('AV2', 'Anillo vial 2', '#42a5f5', { w: 2.2 }), c('AV3', 'Anillo vial 3', '#42a5f5', { w: 2.2 }), c('AV4', 'Anillo vial 4', '#42a5f5', { w: 2.2 }),
      c('AVP', 'Anillo paisajístico', '#66bb6a', { w: 2.2 }), c('CR', 'Ciclorruta', '#ab47bc', { w: 2 }), c('VP', 'Vía peatonal', '#a5d6a7', { w: 1.4, dash: [2, 2] }),
      c('BPV', 'Borde de perfil vial', '#ffffff', { w: 0.6 })],
  },
  cu_13_amenazas: {
    titulo: 'Amenazas (urbano)', campo: 'codigo', relleno: 0.5, ancho: 1.2,
    cats: [c('AIN', 'Amenaza por inundación', '#1e88e5'), c('ADZ', 'Amenaza por deslizamiento', '#ff7043')],
  },
  cu_15_acueducto: {
    titulo: 'Acueducto urbano', campo: 'codigo', relleno: 0.4, ancho: 1.2,
    cats: ciclo([['Z1AP', 'Zona 1'], ['Z2AP', 'Zona 2'], ['Z3AP', 'Zona 3'], ['Z4AP', 'Zona 4'], ['Z5AP', 'Zona 5']]),
  },
  cu_16_alcantarillado: {
    titulo: 'Alcantarillado sanitario', campo: 'codigo', relleno: 0.4, ancho: 1.2,
    cats: ciclo([['ASA-CC', 'Colector Centro'], ['ASA-CN', 'Colector Norte'], ['ASA-CNN', 'Colector nuevo'], ['ASA-CS', 'Colector Sur'], ['ASA-IA1', 'Interceptor Acaciítas 1'], ['ASA-IA2', 'Interceptor Acaciítas 2']]),
  },
  cu_17_alcantarillado_pluvial: {
    titulo: 'Alcantarillado pluvial', campo: 'codigo', relleno: 0.4, ancho: 1,
    cats: ciclo([['AACCP1', 'Caño Cola de Pato 1'], ['AACCP2', 'Caño Cola de Pato 2'], ['AADCS1', 'Caño Seco'], ['AARA1', 'Río Acacías 1'], ['AARA2', 'Río Acacías 2'],
      ['AARA3', 'Río Acacías 3'], ['AARA4', 'Río Acacías 4'], ['AARA4-5', 'Río Acacías 4-5'], ['AARA5', 'Río Acacías 5'], ['AARAI1', 'Acaciítas 1'], ['AARAI2', 'Acaciítas 2'],
      ['AARAI3', 'Acaciítas 3'], ['AARAI4', 'Acaciítas 4'], ['AARAI5', 'Acaciítas 5']]),
  },
  cu_5_eep_urbana: {
    titulo: 'Estructura ecológica urbana', campo: 'convencion', relleno: 0.5, ancho: 1, fallback: '#2e7d32',
    cats: [c('Parques y zonas verdes', 'Parques y zonas verdes', '#66bb6a'), c('Área de protección', 'Área de protección', '#26a69a'), c('Zona de protección especial', 'Protección especial', '#2e7d32')],
  },
  cu_1_manzanas: { titulo: 'Manzanas', color: '#ffffff', relleno: 0, ancho: 0.7, minzoom: 14.5 },
  cu_1_drenaje: { titulo: 'Drenajes urbanos', color: '#4fc3f7', ancho: 1.6 },
  cu_1_numero_barrio: { titulo: 'Número de barrio', color: '#ffeb3b', minzoom: 99, etiqueta: { campo: 'numero', minzoom: 15, tam: [10, 13], medium: true } },
  cu_1_perimetros: {
    titulo: 'Perímetros (líneas)', campo: 'convencion', ancho: 2.6, fallback: ROJO,
    cats: [c('Perímetro urbano', 'Perímetro urbano', ROJO, { w: 3 }), c('Perímetro de expansión urbana', 'Perímetro de expansión', AMARILLO, { w: 3, dash: [3, 2] })],
  },
  cu_1_puntos_perimetro: { titulo: 'Puntos del perímetro', color: '#ffeb3b', minzoom: 15 },

  // ------------------------------------------------------------------ POT · rural
  cr_2_veredas: {
    titulo: 'Veredas', color: '#ffffff', relleno: 0, ancho: 1.4, dash: [4, 2],
    etiqueta: { campo: 'vereda', minzoom: 11, tam: [9, 13], mayus: true },
  },
  cr_2_areas_manejo_especial: {
    titulo: 'Áreas de manejo especial', campo: 'codigo', relleno: 0.4, ancho: 1.5,
    cats: [c('CPO', 'Colonia Penal de Oriente', '#ff7043'), c('PNS', 'Parque Natural Sumapaz', '#1b5e20'), c('RNP', 'Reserva natural propuesta', '#7cb342')],
  },
  cr_5_usos_suelo: {
    titulo: 'Usos del suelo rural', campo: 'codigo', relleno: 0.42, ancho: 0.8,
    cats: [c('AADAS', 'Desarrollo agropecuario sostenible', '#aed581'), c('AAPAR', 'Agroindustrial restringida', '#ff9800'), c('AAPP', 'Productora protectora', '#2e7d32'),
      c('AAVC', 'Vivienda campestre', '#ec407a'), c('AAM', 'Actividad minera', '#795548'), c('AME', 'Manejo especial', '#00897b'),
      c('APNS', 'Parque Natural Sumapaz', '#1b5e20'), c('APSH', 'Protección sistema hídrico', '#00bcd4'), c('ASSU', 'Suelo suburbano', AZUL)],
    etiqueta: { campo: 'codigo', minzoom: 12, tam: [9, 13], medium: true },
  },
  cr_5_destinacion_especifica: {
    titulo: 'Destinación específica (rural)', campo: 'codigo', relleno: 0.5, ancho: 1,
    cats: [c('AP', 'Área de protección', '#26a69a'), c('PE', 'Parque ecoeficiente', '#7cb342'), c('PF', 'Planta de faenado', '#8d6e63')],
  },
  cr_9_conflictos_uso: { titulo: 'Conflictos de uso (rural)', color: '#ff5252', relleno: 0.45, ancho: 1.2 },
  cr_11_red_vial: {
    titulo: 'Red vial rural', campo: 'codigo', ancho: 1.8, fallback: '#ffd54f',
    cats: [c('LRV', 'Límite de reserva vial', '#ff1744', { w: 1.4, dash: [3, 2] }), c('SC', 'Vía sin categorizar', '#cfd8dc', { w: 1.2 }), c('VF', 'Vía férrea (propuesta)', '#212121', { w: 2, dash: [4, 2] }),
      c('VR1', 'Vía rural VR1', '#ff6d00', { w: 3 }), c('VR2-1', 'Vía rural VR2', '#ffab00', { w: 2.4 }), c('VR2-2', 'Vía rural VR2', '#ffab00', { w: 2.4 }),
      ...['VR3-1', 'VR3-2', 'VR3-3', 'VR3-4', 'VR3-5', 'VR3-6', 'VR3-7', 'VR3-8/VR3-10', 'VR3-9', 'VR3-11', 'VR3-12'].map((k) => c(k, 'Vía rural VR3', '#ffee58', { w: 2 }))],
  },
  cr_12_equipamientos_rurales: { titulo: 'Equipamientos rurales', color: '#5c6bc0', relleno: 0.5, ancho: 1.2 },
  cr_13_acueducto_rural: {
    titulo: 'Acueducto rural', campo: 'codigo', relleno: 0.4, ancho: 1.2,
    cats: ciclo([['AMON', 'Acueducto de montaña'], ['ANOR', 'Zona norte (ARVUDEA)'], ['ASUR', 'Zona sur (ACUA 7)'], ['AURB', 'Área urbana']]),
  },

  // ------------------------------------------------------------------ ambiental
  pomca_acacias_pajure: {
    titulo: 'POMCA Acacías–Pajure', campo: 'codigofin', relleno: 0.42, ancho: 1.4,
    cats: [c('CS', 'Conservación', '#2e7d32'), c('PR', 'Preservación', '#00897b'), c('RS', 'Restauración', '#9ccc65'), c('DE', 'Desarrollo económico', '#ffb300'), c('ZU', 'Zonas urbanas consolidadas', ROJO)],
  },
  pomca_guayuriba: {
    titulo: 'POMCA río Guayuriba', campo: 'nomenclat', relleno: 0.42, ancho: 0.6,
    cats: [c('CP1', 'Áreas SINAP', '#1b5e20'), c('CP21', 'Complementarias para la conservación', '#43a047'), c('CP22', 'Importancia ambiental', '#9ccc65'),
      c('CP24', 'Amenazas naturales', '#ff7043'), c('CP3', 'Restauración ecológica', '#26a69a'), c('CP4', 'Rehabilitación', '#ffca28'),
      c('UM1', 'Recuperación para uso múltiple', '#ab47bc'), c('UM3', 'Áreas urbanas y municipales', ROJO)],
  },
}

// ---------------------------------------------------------------------- utilidades de color por capa
const hashColor = (n: string) => {
  let h = 0
  for (const ch of n) h = (h * 31 + ch.charCodeAt(0)) % 360
  return `hsl(${h} 70% 50%)`
}

export const estiloDe = (nombre: string): Estilo | undefined => ESTILOS[nombre]
export const tituloCapa = (nombre: string): string => ESTILOS[nombre]?.titulo ?? nombre.toUpperCase().replaceAll('_', ' ')

export type Subgrupo = 'General' | 'Urbano' | 'Rural'
export const subgrupoPot = (nombre: string): Subgrupo => (nombre.startsWith('cu_') ? 'Urbano' : nombre.startsWith('cr_') ? 'Rural' : 'General')

/** Color representativo de la capa (para la leyenda cuando no tiene categorías). */
export const colorRepresentativo = (capa: Pick<Capa, 'nombre'>): string => {
  const e = ESTILOS[capa.nombre]
  return e?.color ?? e?.cats?.[0]?.c ?? hashColor(capa.nombre)
}

/** Categorías para la leyenda (sin repetir etiquetas iguales, p. ej. las VR3-x). */
export function leyendaDe(nombre: string): Cat[] {
  const cats = ESTILOS[nombre]?.cats ?? []
  const vistos = new Set<string>()
  return cats.filter((k) => (vistos.has(k.e) ? false : (vistos.add(k.e), true)))
}

// ---------------------------------------------------------------------- generación de capas MapLibre
export interface CapaMapa {
  id: string
  type: 'fill' | 'line' | 'circle' | 'symbol'
  paint: Record<string, unknown>
  layout?: Record<string, unknown>
  filter?: ExpressionSpecification
  minzoom?: number
  maxzoom?: number
}

const clave = (campo: string): ExpressionSpecification => ['to-string', ['get', campo]]

function colorPorCategoria(e: Estilo): unknown {
  if (!e.campo || !e.cats?.length) return e.color
  const m: unknown[] = ['match', clave(e.campo)]
  const vistos = new Set<string>()
  for (const k of e.cats) if (!vistos.has(k.v)) { vistos.add(k.v); m.push(k.v, k.c) }
  m.push(e.fallback ?? e.cats[0].c)
  return m
}

function anchoPorCategoria(e: Estilo): unknown {
  const base = e.ancho ?? 1.2
  if (!e.campo || !e.cats?.some((k) => k.w)) return base
  const m: unknown[] = ['match', clave(e.campo)]
  const vistos = new Set<string>()
  for (const k of e.cats) if (k.w && !vistos.has(k.v)) { vistos.add(k.v); m.push(k.v, k.w) }
  m.push(base)
  return m
}

const FUENTE = (medium?: boolean) => [medium ? 'Noto Sans Medium' : 'Noto Sans Regular']

export function capasMapa(capa: Capa): CapaMapa[] {
  const n = capa.nombre
  const e: Estilo = ESTILOS[n] ?? { titulo: tituloCapa(n), color: hashColor(n), relleno: 0.3, ancho: 1.2 }
  const g = tipoGeom(capa.geometria)
  const out: CapaMapa[] = []
  const mz = e.minzoom != null ? { minzoom: e.minzoom } : {}
  const color = colorPorCategoria(e) as string

  if (g === 'poligono') {
    const op = e.relleno ?? 0.35
    if (op > 0) out.push({ id: `${n}-fill`, type: 'fill', paint: { 'fill-color': color, 'fill-opacity': op }, ...mz })
    else if (n === 'predios') out.push({ id: `${n}-fill`, type: 'fill', paint: { 'fill-color': color, 'fill-opacity': 0.01 }, ...mz })
    const ancho = n === 'predios' ? ['interpolate', ['linear'], ['zoom'], 12, 0.3, 17, 1.4] : anchoPorCategoria(e)
    out.push({ id: `${n}-line`, type: 'line', paint: { 'line-color': e.borde ?? color, 'line-width': ancho, ...(e.dash ? { 'line-dasharray': e.dash } : {}) }, layout: { 'line-join': 'round' }, ...mz })
  } else if (g === 'linea') {
    const conGuiones = e.cats?.some((k) => k.dash)
    if (conGuiones && e.campo) {
      // line-dasharray no admite expresiones por dato: una capa por categoría que lo necesite
      const con = e.cats!.filter((k) => k.dash)
      const sinGuion = e.cats!.filter((k) => !k.dash)
      if (sinGuion.length) {
        out.push({ id: `${n}-line`, type: 'line', paint: { 'line-color': color, 'line-width': anchoPorCategoria(e) }, layout: { 'line-cap': 'round', 'line-join': 'round' },
          filter: ['!', ['in', clave(e.campo), ['literal', con.map((k) => k.v)]]] as ExpressionSpecification, ...mz })
      }
      con.forEach((k, i) => out.push({ id: `${n}-line-d${i}`, type: 'line', paint: { 'line-color': k.c, 'line-width': k.w ?? e.ancho ?? 1.4, 'line-dasharray': k.dash },
        filter: ['==', clave(e.campo!), k.v] as ExpressionSpecification, ...mz }))
    } else {
      out.push({ id: `${n}-line`, type: 'line', paint: { 'line-color': color, 'line-width': anchoPorCategoria(e), ...(e.dash ? { 'line-dasharray': e.dash } : {}) }, layout: { 'line-cap': 'round', 'line-join': 'round' }, ...mz })
    }
  } else if (e.minzoom !== 99) {
    out.push({ id: `${n}-pt`, type: 'circle', paint: { 'circle-color': color, 'circle-radius': ['interpolate', ['linear'], ['zoom'], 11, 2.5, 17, 5], 'circle-stroke-width': 1, 'circle-stroke-color': '#ffffff' }, ...mz })
  }

  if (e.etiqueta) {
    const t = e.etiqueta
    const [t0, t1] = t.tam ?? [10, 14]
    out.push({
      id: `${n}-etiqueta`, type: 'symbol',
      minzoom: t.minzoom ?? 11, ...(t.maxzoom != null ? { maxzoom: t.maxzoom } : {}),
      layout: {
        'text-field': ['to-string', ['get', t.campo]],
        'text-font': FUENTE(t.medium),
        'text-size': ['interpolate', ['linear'], ['zoom'], 10, t0, 18, t1],
        'text-max-width': 7,
        'text-padding': 3,
        'text-letter-spacing': 0.04,
        ...(t.mayus ? { 'text-transform': 'uppercase' } : {}),
        ...(g === 'linea' ? { 'symbol-placement': 'line' } : {}),
        ...(g === 'punto' ? { 'text-offset': [0, 0.8], 'text-anchor': 'top' } : {}),
      },
      paint: { 'text-color': t.color ?? '#ffffff', 'text-halo-color': t.halo ?? 'rgba(10,20,15,0.92)', 'text-halo-width': 1.7, 'text-halo-blur': 0.3 },
    })
  }
  return out
}
