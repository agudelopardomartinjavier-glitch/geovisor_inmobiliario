import { API_URL } from './api'
import type { InmuebleProps } from './types'
import { fmtCOP } from './mapa'

/** Número global del negocio (solo dígitos con indicativo, p. ej. 573001234567). Vacío = no se usa. */
const GLOBAL: string = (import.meta.env.VITE_WHATSAPP_NUMERO ?? '').replace(/\D/g, '')
const URL_PUBLICA: string = (import.meta.env.VITE_PUBLIC_URL ?? '').replace(/\/$/, '')

/** Busca un celular colombiano (3XX XXX XXXX, con o sin +57 y con separadores) dentro del texto de contacto. */
export function celularDe(texto: string | null): string | null {
  const m = texto?.match(/(?:\+?57[\s-]*)?(3\d{2})[\s.-]*(\d{3})[\s.-]*(\d{4})/)
  return m ? `57${m[1]}${m[2]}${m[3]}` : null
}

export const enlaceInmueble = (id: number) => `${URL_PUBLICA || window.location.origin}/?inmueble=${id}`

/** Enlace wa.me con mensaje prellenado; null si no hay a quién escribir (ni en el contacto ni en VITE_WHATSAPP_NUMERO). */
export function enlaceWhatsapp(p: InmuebleProps): string | null {
  const numero = celularDe(p.contacto) ?? (GLOBAL || null)
  if (!numero) return null
  const precio = p.precio ? `, ${fmtCOP(p.precio)}` : ''
  const msg = `Hola, me interesa el inmueble N.º ${p.id} (${p.tipo} en ${p.operacion}${precio}) en Acacías. ` +
    `Lo vi en el geovisor: ${enlaceInmueble(p.id)} ¿Sigue disponible?`
  return `https://wa.me/${numero}?text=${encodeURIComponent(msg)}`
}

export const urlFichaPdf = (id: number) => `${API_URL}/inmuebles/${id}/ficha.pdf`
