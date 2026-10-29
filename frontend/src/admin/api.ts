import { API_URL, ApiError } from '../lib/api'
import type { Comparable, ComparableDatos, Estado, InmuebleAdmin, InmuebleForm, Sugerido, Valoracion, Vinculo } from './tipos'

const CLAVE = 'geovisor_admin_token'
export const guardarToken = (t: string | null) => {
  try { t ? sessionStorage.setItem(CLAVE, t) : sessionStorage.removeItem(CLAVE) } catch { /* sin storage */ }
}
export const leerToken = () => { try { return sessionStorage.getItem(CLAVE) } catch { return null } }

async function llamar<T>(ruta: string, init: RequestInit = {}): Promise<T> {
  const token = leerToken()
  const r = await fetch(`${API_URL}/admin${ruta}`, {
    ...init,
    headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}), ...init.headers },
  })
  if (!r.ok) {
    let msg = `Error ${r.status}`
    try {
      const j = await r.json()
      msg = typeof j.detail === 'string' ? j.detail : Array.isArray(j.detail) ? j.detail.map((d: { loc: string[]; msg: string }) => `${d.loc.slice(1).join('.')}: ${d.msg}`).join('; ') : msg
    } catch { /* sin cuerpo */ }
    throw new ApiError(r.status, msg)
  }
  return r.status === 204 ? (undefined as T) : r.json()
}

export const login = (usuario: string, password: string) =>
  llamar<{ token: string; usuario: string }>('/login', { method: 'POST', body: JSON.stringify({ usuario, password }) })
export const me = () => llamar<{ usuario: string }>('/me')
export const listar = (estado: string, q: string) => {
  const p = new URLSearchParams()
  if (estado) p.set('estado', estado)
  if (q) p.set('q', q)
  return llamar<InmuebleAdmin[]>(`/inmuebles?${p}`)
}
export const crear = (f: InmuebleForm) => llamar<InmuebleAdmin>('/inmuebles', { method: 'POST', body: JSON.stringify(f) })
export const editar = (id: number, f: InmuebleForm) => llamar<InmuebleAdmin>(`/inmuebles/${id}`, { method: 'PUT', body: JSON.stringify(f) })
export const cambiarEstado = (id: number, estado: Estado) =>
  llamar<InmuebleAdmin>(`/inmuebles/${id}/estado`, { method: 'PATCH', body: JSON.stringify({ estado_publicacion: estado }) })
export const eliminar = (id: number) => llamar<void>(`/inmuebles/${id}`, { method: 'DELETE' })

// ---------------------------------------------------------------- comparables
export const listarComparables = (tipo = '', q = '') => {
  const p = new URLSearchParams()
  if (tipo) p.set('tipo', tipo)
  if (q) p.set('q', q)
  return llamar<Comparable[]>(`/comparables?${p}`)
}
export const crearComparable = (d: ComparableDatos) => llamar<Comparable>('/comparables', { method: 'POST', body: JSON.stringify(d) })
export const editarComparable = (id: number, d: ComparableDatos) => llamar<Comparable>(`/comparables/${id}`, { method: 'PUT', body: JSON.stringify(d) })
export const eliminarComparable = (id: number) => llamar<void>(`/comparables/${id}`, { method: 'DELETE' })

export const vinculosDe = (inmuebleId: number) => llamar<Vinculo[]>(`/inmuebles/${inmuebleId}/comparables`)
export const vincular = (inmuebleId: number, cid: number, v: { ajuste_pct: number; incluir: boolean; nota: string | null }) =>
  llamar<Vinculo[]>(`/inmuebles/${inmuebleId}/comparables/${cid}`, { method: 'PUT', body: JSON.stringify(v) })
export const desvincular = (inmuebleId: number, cid: number) => llamar<Vinculo[]>(`/inmuebles/${inmuebleId}/comparables/${cid}`, { method: 'DELETE' })
export const sugeridosDe = (inmuebleId: number, radioM: number, meses: number) =>
  llamar<Sugerido[]>(`/inmuebles/${inmuebleId}/comparables-sugeridos?radio_m=${radioM}&meses=${meses}`)
export const valoracionDe = (inmuebleId: number) => llamar<Valoracion>(`/inmuebles/${inmuebleId}/valoracion`)

/** Descarga el informe PDF (requiere el token, por eso no es un enlace directo). */
export async function descargarInforme(inmuebleId: number): Promise<void> {
  const r = await fetch(`${API_URL}/admin/inmuebles/${inmuebleId}/informe.pdf`, { headers: { Authorization: `Bearer ${leerToken() ?? ''}` } })
  if (!r.ok) throw new ApiError(r.status, r.status === 401 ? 'Sesión vencida' : `No se pudo generar el informe (${r.status})`)
  const url = URL.createObjectURL(await r.blob())
  const a = document.createElement('a')
  a.href = url
  a.download = `valoracion-inmueble-${inmuebleId}.pdf`
  document.body.appendChild(a); a.click(); a.remove()
  setTimeout(() => URL.revokeObjectURL(url), 10_000)
}
