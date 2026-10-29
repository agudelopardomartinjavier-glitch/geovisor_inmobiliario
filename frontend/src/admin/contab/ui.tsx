import type { ReactNode } from 'react'
import { useQuery } from '@tanstack/react-query'
import { listar } from '../api'
import { fmtCOP } from '../../lib/mapa'
import { descargarArchivo, personas } from './api'

export const campo = 'mt-1 w-full rounded-md border border-gray-300 px-2 py-1.5 text-sm focus:border-emerald-600 focus:outline-none'
export const boton = 'rounded-md bg-emerald-700 px-3 py-1.5 text-sm font-medium text-white disabled:opacity-50'
export const botonSec = 'rounded-md border border-gray-300 px-2.5 py-1 text-xs hover:bg-gray-50 disabled:opacity-50'

export const hoyISO = () => new Date(Date.now() - 5 * 3600_000).toISOString().slice(0, 10)
export const mesActual = () => hoyISO().slice(0, 7)
export const num = (s: string) => (s.trim() === '' ? null : Number(s))
export const txt = (s: string) => (s.trim() === '' ? null : s.trim())

export function Campo({ etiqueta, children, className = '' }: { etiqueta: string; children: ReactNode; className?: string }) {
  return <label className={`block text-xs ${className}`}>{etiqueta}{children}</label>
}

export function Seccion({ titulo, derecha, children }: { titulo: string; derecha?: ReactNode; children: ReactNode }) {
  return (
    <section className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-sm font-bold text-gray-900">{titulo}</h2>
        {derecha}
      </div>
      <div className="space-y-3">{children}</div>
    </section>
  )
}

export const Falla = ({ e }: { e: unknown }) => (e ? <p role="alert" className="rounded bg-red-50 p-2 text-xs text-red-700">{(e as Error).message}</p> : null)

const TONOS = { verde: 'bg-emerald-100 text-emerald-800', amarillo: 'bg-amber-100 text-amber-800', rojo: 'bg-red-100 text-red-800', gris: 'bg-gray-100 text-gray-700', azul: 'bg-sky-100 text-sky-800' }
export const Insignia = ({ texto, tono = 'gris' }: { texto: string; tono?: keyof typeof TONOS }) => (
  <span className={`inline-block rounded-full px-2 py-0.5 text-[11px] font-semibold ${TONOS[tono]}`}>{texto}</span>
)

export function Tabla({ cab, filas, vacio = 'Sin datos.', derecha = [] }: { cab: string[]; filas: ReactNode[][]; vacio?: string; derecha?: number[] }) {
  if (!filas.length) return <p className="text-xs text-gray-500">{vacio}</p>
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-xs">
        <thead><tr className="text-left text-gray-500">{cab.map((c, i) => <th key={c + i} className={`px-1.5 py-1 font-medium ${derecha.includes(i) ? 'text-right' : ''}`}>{c}</th>)}</tr></thead>
        <tbody>
          {filas.map((f, i) => (
            <tr key={i} className="border-t border-gray-100 align-top">
              {f.map((c, j) => <td key={j} className={`px-1.5 py-1 ${derecha.includes(j) ? 'text-right' : ''}`}>{c}</td>)}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

export function Dato({ titulo, valor, detalle, tono }: { titulo: string; valor: ReactNode; detalle?: ReactNode; tono?: 'rojo' }) {
  return (
    <div className="rounded-lg border border-gray-200 p-2.5">
      <div className="text-[11px] text-gray-500">{titulo}</div>
      <div className={`text-lg font-bold ${tono === 'rojo' ? 'text-red-700' : 'text-gray-900'}`}>{valor}</div>
      {detalle && <div className="text-[11px] text-gray-600">{detalle}</div>}
    </div>
  )
}

/** Descarga con aviso de error (los PDF y Excel exigen el token, por eso no son enlaces directos). */
export const bajar = (ruta: string, nombre: string, abrir = false) => { descargarArchivo(ruta, nombre, abrir).catch((e: Error) => window.alert(e.message)) }

export const cop = (n: number | null | undefined) => (n == null ? '—' : fmtCOP(n))

export function SelInmueble({ valor, onChange, soloArriendo = false, vacio }: { valor: string; onChange: (v: string) => void; soloArriendo?: boolean; vacio?: string }) {
  const q = useQuery({ queryKey: ['c', 'inmuebles'], queryFn: () => listar('', ''), staleTime: 30_000 })
  const lista = (q.data ?? []).filter((i) => !soloArriendo || i.operacion === 'arriendo')
  return (
    <select className={campo} value={valor} onChange={(e) => onChange(e.target.value)} required={!vacio}>
      <option value="">{vacio ?? 'Elige un inmueble…'}</option>
      {lista.map((i) => <option key={i.id} value={i.id}>#{i.id} · {i.tipo} · {i.operacion}{i.numero_predial ? ` · …${i.numero_predial.slice(-6)}` : ''}</option>)}
    </select>
  )
}

export function SelPersona({ valor, onChange, vacio = 'Elige una persona…' }: { valor: string; onChange: (v: string) => void; vacio?: string }) {
  const q = useQuery({ queryKey: ['c', 'personas', ''], queryFn: () => personas(''), staleTime: 30_000 })
  return (
    <select className={campo} value={valor} onChange={(e) => onChange(e.target.value)}>
      <option value="">{vacio}</option>
      {(q.data ?? []).map((p) => <option key={p.id} value={p.id}>{p.nombre} · {p.documento_tipo} {p.documento}</option>)}
    </select>
  )
}
