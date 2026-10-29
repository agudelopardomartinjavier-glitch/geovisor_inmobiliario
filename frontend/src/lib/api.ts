import type { Capa, FichaPublica, Filtros, InmuebleCollection, Predio, ZonaDetalle, Zona } from './types'

export const API_URL: string = (import.meta.env.VITE_API_URL ?? 'http://localhost:8000').replace(/\/$/, '')

export class ApiError extends Error {
  status: number
  constructor(status: number, message: string) {
    super(message)
    this.status = status
  }
}

async function get<T>(ruta: string): Promise<T> {
  const r = await fetch(`${API_URL}${ruta}`)
  if (!r.ok) throw new ApiError(r.status, r.status === 404 ? 'No encontrado' : `Error ${r.status}`)
  return r.json() as Promise<T>
}

export const getCapas = () => get<Capa[]>('/capas')

export function getInmuebles(f: Filtros) {
  const q = new URLSearchParams()
  if (f.zona) q.set(f.zona.tipo, f.zona.nombre)
  f.tipos.forEach((t) => q.append('tipo', t))
  if (f.operacion) q.set('operacion', f.operacion)
  if (f.precioMin) q.set('precio_min', f.precioMin)
  if (f.precioMax) q.set('precio_max', f.precioMax)
  if (f.areaMin) q.set('area_min', f.areaMin)
  if (f.areaMax) q.set('area_max', f.areaMax)
  return get<InmuebleCollection>(`/inmuebles?${q}`)
}

export const getFichaAmpliada = (id: number) => get<FichaPublica>(`/inmuebles/${id}/ficha`)

export const getPredio = (numeroPredial: string) => get<Predio>(`/predios/${encodeURIComponent(numeroPredial)}`)

export const getZonas = () => get<Zona[]>('/zonas')
export const getZona = (tipo: string, nombre: string) => get<ZonaDetalle>(`/zonas/${tipo}/${encodeURIComponent(nombre)}`)

/** Las fotos locales de la API vienen como /fotos/xxx.jpg: se completan con la URL de la API. */
export const urlFoto = (u: string) => (u.startsWith('/') ? `${API_URL}${u}` : u)
