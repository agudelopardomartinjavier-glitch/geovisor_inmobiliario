import { useMemo, useState } from 'react'
import { bonito } from '../lib/mapa'
import type { Zona, ZonaRef } from '../lib/types'

interface Props {
  zonas: Zona[]
  seleccion: ZonaRef | null
  onSeleccionar: (z: ZonaRef | null) => void
}

const normal = (s: string) => s.normalize('NFD').replace(/\p{M}/gu, '').toLowerCase()
function Cuentas({ z }: { z: Zona }) {
  if (!z.total) return <span className="text-[11px] text-slate-400">sin ofertas</span>
  return (
    <span className="flex shrink-0 gap-1 text-[10.5px] font-semibold">
      {z.venta > 0 && <span className="rounded-full bg-red-100 px-1.5 py-px text-red-700">{z.venta} venta</span>}
      {z.arriendo > 0 && <span className="rounded-full bg-blue-100 px-1.5 py-px text-blue-700">{z.arriendo} arriendo</span>}
    </span>
  )
}

/** «Quiero ver ofertas en X barrio»: escribe, elige y el mapa lleva allá con sus ofertas. */
export default function ZonaSelector({ zonas, seleccion, onSeleccionar }: Props) {
  const [texto, setTexto] = useState('')
  const [abierto, setAbierto] = useState(false)
  const [activo, setActivo] = useState(0)

  const t = normal(texto.trim())
  const lista = useMemo(() => {
    const base = t ? zonas.filter((z) => normal(z.nombre).includes(t)) : zonas.filter((z) => z.total > 0)
    return base.slice(0, 8)
  }, [zonas, t])
  const destacadas = useMemo(() => zonas.filter((z) => z.tipo === 'barrio' && z.total > 0).slice(0, 6), [zonas])
  const actual = seleccion ? zonas.find((z) => z.tipo === seleccion.tipo && z.nombre === seleccion.nombre) : null

  const elegir = (z: Zona) => {
    onSeleccionar({ tipo: z.tipo, nombre: z.nombre })
    setTexto(''); setAbierto(false); setActivo(0)
  }

  return (
    <div className="space-y-2.5">
      {actual ? (
        <div className="flex items-center gap-2 rounded-xl border border-emerald-300 bg-emerald-50 px-3 py-2">
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-semibold text-emerald-900">{actual.tipo === 'vereda' ? 'Vereda ' : ''}{bonito(actual.nombre)}</p>
            <p className="text-[11px] text-emerald-700">{actual.total ? `${actual.total} ${actual.total === 1 ? 'oferta' : 'ofertas'} publicadas` : 'Sin ofertas publicadas por ahora'}</p>
          </div>
          <button type="button" onClick={() => onSeleccionar(null)} className="rounded-lg border border-emerald-300 bg-white px-2.5 py-1 text-xs font-medium text-emerald-800 hover:bg-emerald-100">
            Ver todo
          </button>
        </div>
      ) : null}

      <div className="relative">
        <label className="relative block">
          <span className="sr-only">Buscar barrio o vereda</span>
          <svg className="pointer-events-none absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-slate-400" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M10 18s6-5.2 6-10a6 6 0 1 0-12 0c0 4.8 6 10 6 10Z" /><circle cx="10" cy="8" r="2" />
          </svg>
          <input
            role="combobox"
            aria-expanded={abierto}
            aria-controls="lista-zonas"
            value={texto}
            placeholder={actual ? 'Cambiar de barrio o vereda…' : 'Escribe un barrio o vereda…'}
            onChange={(e) => { setTexto(e.target.value); setAbierto(true); setActivo(0) }}
            onFocus={() => setAbierto(true)}
            onBlur={() => setTimeout(() => setAbierto(false), 150)}
            onKeyDown={(e) => {
              if (e.key === 'ArrowDown') { e.preventDefault(); setActivo((a) => Math.min(a + 1, lista.length - 1)) }
              else if (e.key === 'ArrowUp') { e.preventDefault(); setActivo((a) => Math.max(a - 1, 0)) }
              else if (e.key === 'Enter' && lista[activo]) { e.preventDefault(); elegir(lista[activo]) }
              else if (e.key === 'Escape') setAbierto(false)
            }}
            className="w-full rounded-xl border border-slate-200 bg-slate-50 py-2 pl-8 pr-2 text-sm placeholder:text-slate-400 focus:border-emerald-500 focus:bg-white focus:outline-none"
          />
        </label>
        {abierto && (
          <ul id="lista-zonas" role="listbox" className="absolute inset-x-0 top-full z-40 mt-1 max-h-72 overflow-y-auto rounded-xl border border-slate-200 bg-white p-1 shadow-xl">
            {!t && <li className="px-2.5 pb-1 pt-1.5 text-[10px] font-bold uppercase tracking-[0.12em] text-slate-400">Con más ofertas</li>}
            {lista.map((z, i) => (
              <li key={z.tipo + z.nombre} role="option" aria-selected={i === activo}>
                <button
                  type="button"
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => elegir(z)}
                  onMouseEnter={() => setActivo(i)}
                  className={`flex w-full items-center justify-between gap-2 rounded-lg px-2.5 py-1.5 text-left text-[13px] ${i === activo ? 'bg-emerald-50' : ''}`}
                >
                  <span className="min-w-0 truncate"><span className="font-medium text-slate-800">{bonito(z.nombre)}</span> <span className="text-[10px] uppercase text-slate-400">{z.tipo}</span></span>
                  <Cuentas z={z} />
                </button>
              </li>
            ))}
            {lista.length === 0 && <li className="px-2.5 py-2 text-xs text-slate-500">No hay barrios ni veredas que coincidan con «{texto}».</li>}
          </ul>
        )}
      </div>

      {!actual && destacadas.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {destacadas.map((z) => (
            <button key={z.nombre} type="button" onClick={() => elegir(z)}
              className="rounded-full border border-emerald-200 bg-emerald-50/60 px-2.5 py-1 text-[11px] font-medium text-emerald-900 transition hover:border-emerald-500 hover:bg-emerald-100">
              {bonito(z.nombre)} <span className="text-emerald-600">· {z.total}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
