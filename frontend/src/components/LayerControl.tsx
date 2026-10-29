import { useMemo, useState } from 'react'
import type { Capa } from '../lib/types'
import { GRUPOS, MAPAS_BASE } from '../lib/mapa'
import { subgrupoPot, tituloCapa, type Subgrupo } from '../lib/estilos'
import Muestra from './Muestra'
import { Interruptor } from './ui'

interface Props {
  capas: Capa[]
  visibles: Set<string>
  onToggle: (nombre: string) => void
  onPreset: (nombres: string[]) => void
  baseId: string
  onBase: (id: string) => void
}

/** Vistas rápidas: activan un conjunto de capas pensado para una lectura concreta. */
const VISTAS: { nombre: string; capas: string[] }[] = [
  { nombre: 'Clasificación del suelo', capas: ['cg_2_clasificacion_suelo'] },
  { nombre: 'Barrios', capas: ['cu_3_barrios'] },
  { nombre: 'Usos urbanos', capas: ['cu_7_usos_del_suelo', 'cu_3_barrios'] },
  { nombre: 'Usos rurales', capas: ['cr_5_usos_suelo', 'cr_2_veredas'] },
  { nombre: 'UPR / UPZ', capas: ['cg_5_unidades_planeamiento'] },
  { nombre: 'Ambiental', capas: ['pomca_acacias_pajure', 'cg_3_proteccion_hidrica', 'gen_hidrografia_lineas'] },
]

const ORDEN: Capa['grupo'][] = ['catastro', 'pot', 'ambiental']
const SUBGRUPOS: Subgrupo[] = ['Urbano', 'Rural', 'General']

function Fila({ capa, activa, onToggle }: { capa: Capa; activa: boolean; onToggle: () => void }) {
  return (
    <li>
      <label className={`flex cursor-pointer items-center gap-2.5 rounded-lg px-2 py-1.5 text-[13px] transition-colors hover:bg-slate-50 ${activa ? 'bg-emerald-50/70' : ''}`}>
        <Muestra capa={capa} />
        <span className="min-w-0 flex-1 truncate" title={tituloCapa(capa.nombre)}>{tituloCapa(capa.nombre)}</span>
        <Interruptor activo={activa} onChange={onToggle} etiqueta={`Mostrar ${tituloCapa(capa.nombre)}`} />
      </label>
    </li>
  )
}

export default function LayerControl({ capas, visibles, onToggle, onPreset, baseId, onBase }: Props) {
  const [abiertos, setAbiertos] = useState<Record<string, boolean>>({ catastro: true, pot: true })
  const [filtro, setFiltro] = useState('')
  const f = filtro.trim().toLowerCase()

  const coincide = (c: Capa) => !f || tituloCapa(c.nombre).toLowerCase().includes(f)
  const grupos = useMemo(
    () => ORDEN.map((g) => ({ g, lista: capas.filter((c) => c.grupo === g && coincide(c)) })).filter((x) => x.lista.length),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [capas, f],
  )
  const activas = capas.filter((c) => visibles.has(c.nombre) && c.nombre !== 'predios').length

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-2">
        {MAPAS_BASE.map((m) => (
          <button
            key={m.id}
            type="button"
            aria-pressed={baseId === m.id}
            onClick={() => onBase(m.id)}
            className={`flex items-center gap-2 rounded-xl border px-2.5 py-2 text-left text-xs font-medium transition ${baseId === m.id ? 'border-emerald-600 bg-emerald-50 text-emerald-900 shadow-sm' : 'border-slate-200 text-slate-600 hover:bg-slate-50'}`}
          >
            <span className="size-6 shrink-0 rounded-md ring-1 ring-black/10" style={{ background: m.id === 'esri' ? 'linear-gradient(135deg,#365314,#78716c 55%,#1e3a5f)' : 'linear-gradient(135deg,#e7e5e4,#d6e4cf 55%,#bfdbfe)' }} />
            {m.nombre}
          </button>
        ))}
      </div>

      <div>
        <p className="mb-1.5 text-[11px] font-semibold text-slate-500">Vistas rápidas</p>
        <div className="flex flex-wrap gap-1.5">
          {VISTAS.map((v) => (
            <button key={v.nombre} type="button" onClick={() => onPreset(v.capas)}
              className="rounded-full border border-emerald-200 bg-emerald-50/60 px-2.5 py-1 text-[11px] font-medium text-emerald-900 transition hover:border-emerald-500 hover:bg-emerald-100">
              {v.nombre}
            </button>
          ))}
          <button type="button" onClick={() => onPreset([])} disabled={activas === 0}
            className="rounded-full border border-slate-200 px-2.5 py-1 text-[11px] font-medium text-slate-500 transition hover:bg-slate-100 disabled:opacity-40">
            Ocultar capas{activas ? ` (${activas})` : ''}
          </button>
        </div>
      </div>

      <input
        value={filtro}
        onChange={(e) => setFiltro(e.target.value)}
        placeholder="Buscar capa…"
        aria-label="Buscar capa"
        className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-1.5 text-sm placeholder:text-slate-400 focus:border-emerald-500 focus:bg-white focus:outline-none"
      />

      <div className="space-y-1.5">
        {grupos.map(({ g, lista }) => {
          const abierto = !!f || abiertos[g]
          const n = lista.filter((c) => visibles.has(c.nombre)).length
          return (
            <div key={g} className="overflow-hidden rounded-xl border border-slate-200">
              <button type="button" aria-expanded={abierto} onClick={() => setAbiertos((a) => ({ ...a, [g]: !a[g] }))}
                className="flex w-full items-center justify-between bg-slate-50 px-3 py-2 text-left text-[13px] font-semibold text-slate-700">
                <span>{GRUPOS[g].titulo}</span>
                <span className="flex items-center gap-2 text-[11px] font-medium text-slate-500">
                  {n > 0 && <span className="rounded-full bg-emerald-600 px-1.5 py-px text-white">{n}</span>}
                  {lista.length}
                  <span className={`transition-transform ${abierto ? 'rotate-90' : ''}`}>›</span>
                </span>
              </button>
              {abierto && (
                <div className="max-h-[22rem] overflow-y-auto p-1.5">
                  {g === 'pot' ? (
                    SUBGRUPOS.map((sg) => {
                      const sub = lista.filter((c) => subgrupoPot(c.nombre) === sg)
                      if (!sub.length) return null
                      return (
                        <div key={sg} className="mb-1">
                          <p className="px-2 pb-0.5 pt-1.5 text-[10px] font-bold uppercase tracking-[0.12em] text-slate-400">{sg}</p>
                          <ul>{sub.map((c) => <Fila key={c.nombre} capa={c} activa={visibles.has(c.nombre)} onToggle={() => onToggle(c.nombre)} />)}</ul>
                        </div>
                      )
                    })
                  ) : (
                    <ul>{lista.map((c) => <Fila key={c.nombre} capa={c} activa={visibles.has(c.nombre)} onToggle={() => onToggle(c.nombre)} />)}</ul>
                  )}
                </div>
              )}
            </div>
          )
        })}
        {grupos.length === 0 && <p className="px-1 text-xs text-slate-500">Ninguna capa coincide con «{filtro}».</p>}
      </div>
    </div>
  )
}
