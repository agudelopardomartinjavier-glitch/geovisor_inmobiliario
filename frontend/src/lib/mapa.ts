import type { Capa } from './types'

/** Mapas base configurables. Google Hybrid se omite a propósito: sus términos no permiten teselas directas en un visor público. */
export interface MapaBase {
  id: string
  nombre: string
  tiles: string[]
  attribution: string
  maxzoom: number
}

export const MAPAS_BASE: MapaBase[] = [
  {
    id: 'esri',
    nombre: 'Satélite (Esri)',
    tiles: ['https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}'],
    attribution: 'Imágenes © Esri, Maxar, Earthstar Geographics',
    maxzoom: 18, // Esri no tiene imagen más allá: MapLibre amplía la última
  },
  {
    id: 'osm',
    nombre: 'Calles (OSM)',
    tiles: ['https://tile.openstreetmap.org/{z}/{x}/{y}.png'],
    attribution: '© colaboradores de OpenStreetMap',
    maxzoom: 19,
  },
]

export const CENTRO_INICIAL = { longitude: -73.75, latitude: 3.99, zoom: 12 }

export const GRUPOS: Record<Capa['grupo'], { titulo: string; ancla: string }> = {
  // `ancla` = id de la capa vacía ANTES de la cual se insertan las capas del grupo (fija el orden de apilado)
  ambiental: { titulo: 'Ambiental (POMCA)', ancla: 'ancla-pot' },
  pot: { titulo: 'POT de Acacías', ancla: 'ancla-catastro' },
  catastro: { titulo: 'Catastro', ancla: 'ancla-top' },
}

/** Color estable por nombre de capa (la leyenda y el mapa usan el mismo). */
export function colorCapa(c: Pick<Capa, 'nombre' | 'grupo'>): string {
  if (c.nombre === 'predios') return '#facc15'
  let h = 0
  for (const ch of c.nombre) h = (h * 31 + ch.charCodeAt(0)) % 360
  const base = c.grupo === 'ambiental' ? 120 : 0
  return `hsl(${(h + base) % 360} 70% 50%)`
}

export type TipoGeom = 'poligono' | 'linea' | 'punto'
export function tipoGeom(g: string | null): TipoGeom {
  const s = (g ?? '').toUpperCase()
  if (s.includes('POLYGON')) return 'poligono'
  if (s.includes('LINE')) return 'linea'
  return 'punto'
}

export const COLOR_OPERACION = { venta: '#dc2626', arriendo: '#2563eb' } as const

export const fmtCOP = (n: number | null) =>
  n == null ? '—' : new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(n)

export const fmtNum = (n: number | null, dec = 0) =>
  n == null ? '—' : new Intl.NumberFormat('es-CO', { maximumFractionDigits: dec }).format(n)

/** «LA PRIMAVERA II ETAPA» → «La Primavera II Etapa»; «ASOCIACION DE AMIGOS» → «Asociacion de Amigos». */
export const bonito = (s: string) =>
  s.toLowerCase().split(/(\s+)/).map((w, i) => {
    if (/^(i{1,3}|iv|v|vi{0,3})$/.test(w)) return w.toUpperCase()
    if (i > 0 && /^(de|del|la|las|los|el|y|en|a)$/.test(w)) return w
    return w.replace(/^([(-]?)(\p{L})/u, (_m, a: string, b: string) => a + b.toUpperCase())
  }).join('')
