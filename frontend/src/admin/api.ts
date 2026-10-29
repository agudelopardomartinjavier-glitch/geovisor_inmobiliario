import { API_URL, ApiError } from '../lib/api'
import type { Comparable, ComparableDatos, Estado, FichaAdmin, FichaDatos, Historial, InmuebleAdmin, Inversion, MapaM2, InmuebleForm, Juridico, Parametro, SemaforoAdmin, Soporte, Sugerido, TipoSoporte, Valoracion, Vinculo } from './tipos'

const CLAVE = 'geovisor_admin_token'
export const guardarToken = (t: string | null) => {
  try { t ? sessionStorage.setItem(CLAVE, t) : sessionStorage.removeItem(CLAVE) } catch { /* sin storage */ }
}
export const leerToken = () => { try { return sessionStorage.getItem(CLAVE) } catch { return null } }

export async function llamar<T>(ruta: string, init: RequestInit = {}): Promise<T> {
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

// ---------------------------------------------------------------- Fase 1: ficha ampliada, jurídico, soportes, semáforo
export const verFicha = (id: number) => llamar<FichaAdmin>(`/inmuebles/${id}/ficha`)
export const guardarFicha = (id: number, d: FichaDatos) => llamar<FichaAdmin>(`/inmuebles/${id}/ficha`, { method: 'PUT', body: JSON.stringify(d) })
export const verJuridico = (id: number) => llamar<Juridico | null>(`/inmuebles/${id}/juridico`)
export const guardarJuridico = (id: number, d: Juridico) => llamar<Juridico>(`/inmuebles/${id}/juridico`, { method: 'PUT', body: JSON.stringify(d) })
export const listarSoportes = (id: number) => llamar<Soporte[]>(`/inmuebles/${id}/soportes`)
export const eliminarSoporte = (sid: number) => llamar<void>(`/soportes/${sid}`, { method: 'DELETE' })
export const verSemaforo = (id: number) => llamar<SemaforoAdmin | null>(`/inmuebles/${id}/semaforo`)
export const recalcularSemaforo = (id: number) => llamar<SemaforoAdmin | null>(`/inmuebles/${id}/semaforo/recalcular`, { method: 'POST' })
export const listarParametros = () => llamar<Parametro[]>('/parametros')
export const cambiarParametro = (clave: string, valor: string) => llamar<{ clave: string; valor: string }>(`/parametros/${encodeURIComponent(clave)}`, { method: 'PUT', body: JSON.stringify({ valor }) })

/** El cuerpo de la petición es el archivo mismo (sin multipart); los datos van en la URL. */
export async function subirSoporte(id: number, archivo: File, tipo: TipoSoporte, fechaDocumento: string, fechaVencimiento: string): Promise<Soporte> {
  const p = new URLSearchParams({ tipo, nombre: archivo.name })
  if (fechaDocumento) p.set('fecha_documento', fechaDocumento)
  if (fechaVencimiento) p.set('fecha_vencimiento', fechaVencimiento)
  const r = await fetch(`${API_URL}/admin/inmuebles/${id}/soportes?${p}`, { method: 'POST', body: archivo, headers: { Authorization: `Bearer ${leerToken() ?? ''}` } })
  if (!r.ok) {
    let msg = `Error ${r.status}`
    try { const j = await r.json(); if (typeof j.detail === 'string') msg = j.detail } catch { /* sin cuerpo */ }
    throw new ApiError(r.status, msg)
  }
  return r.json()
}

/** Los soportes son privados: se descargan con el token, no con un enlace directo. */
export async function descargarSoporte(s: Soporte): Promise<void> {
  const r = await fetch(`${API_URL}/admin/soportes/${s.id}/archivo`, { headers: { Authorization: `Bearer ${leerToken() ?? ''}` } })
  if (!r.ok) throw new ApiError(r.status, r.status === 401 ? 'Sesión vencida' : `No se pudo descargar (${r.status})`)
  const url = URL.createObjectURL(await r.blob())
  const a = document.createElement('a')
  a.href = url; a.download = s.nombre_original
  document.body.appendChild(a); a.click(); a.remove()
  setTimeout(() => URL.revokeObjectURL(url), 10_000)
}

// ---------------------------------------------------------------- Fase 2: historial, mercado y rentabilidad
export const verHistorial = (id: number) => llamar<Historial>(`/inmuebles/${id}/historial`)
export const agregarPrecio = (id: number, d: { fecha: string; precio: number; nota: string | null }) =>
  llamar<Historial>(`/inmuebles/${id}/precios`, { method: 'POST', body: JSON.stringify(d) })
export const borrarPrecio = (pid: number) => llamar<Historial>(`/precios/${pid}`, { method: 'DELETE' })
export const agregarAvaluo = (id: number, d: { fecha: string; valor: number; fuente: string; nota: string | null }) =>
  llamar<Historial>(`/inmuebles/${id}/avaluos`, { method: 'POST', body: JSON.stringify(d) })
export const borrarAvaluo = (aid: number) => llamar<Historial>(`/avaluos/${aid}`, { method: 'DELETE' })
export const verInversion = (id: number) => llamar<Inversion>(`/inmuebles/${id}/inversion`)
export const fijarCanon = (id: number, canon: number | null) =>
  llamar<Inversion>(`/inmuebles/${id}/inversion`, { method: 'PUT', body: JSON.stringify({ canon_mensual_esperado: canon, nota: null }) })
export const mercadoM2 = (tipo: string) => llamar<MapaM2>(`/mercado/m2?tipo=${tipo}`)

/** Descarga un archivo del API con el token (PDF, Excel…). `abrir` lo muestra en otra pestaña en vez de guardarlo. */
export async function descargarArchivo(ruta: string, nombre: string, abrir = false): Promise<void> {
  const r = await fetch(`${API_URL}/admin${ruta}`, { headers: { Authorization: `Bearer ${leerToken() ?? ''}` } })
  if (!r.ok) {
    let msg = r.status === 401 ? 'Sesión vencida' : `No se pudo descargar (${r.status})`
    try { const j = await r.json(); if (typeof j.detail === 'string') msg = j.detail } catch { /* sin cuerpo */ }
    throw new ApiError(r.status, msg)
  }
  const url = URL.createObjectURL(await r.blob())
  if (abrir) window.open(url, '_blank')
  else {
    const a = document.createElement('a')
    a.href = url; a.download = nombre
    document.body.appendChild(a); a.click(); a.remove()
  }
  setTimeout(() => URL.revokeObjectURL(url), 60_000)
}

/** Sube un archivo como cuerpo de la petición (sin multipart). */
export async function subirArchivo<T>(ruta: string, archivo: File): Promise<T> {
  const r = await fetch(`${API_URL}/admin${ruta}${ruta.includes('?') ? '&' : '?'}nombre=${encodeURIComponent(archivo.name)}`, { method: 'POST', body: archivo, headers: { Authorization: `Bearer ${leerToken() ?? ''}` } })
  if (!r.ok) {
    let msg = `Error ${r.status}`
    try { const j = await r.json(); if (typeof j.detail === 'string') msg = j.detail } catch { /* sin cuerpo */ }
    throw new ApiError(r.status, msg)
  }
  return r.json()
}
