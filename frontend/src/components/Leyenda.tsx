import { useState } from 'react'
import type { Capa } from '../lib/types'
import { COLOR_OPERACION } from '../lib/mapa'
import { leyendaDe, tituloCapa } from '../lib/estilos'

/** Leyenda flotante: muestra las categorías de colores de las capas activas. */
export default function Leyenda({ capas, visibles, ocultaEnMovil = false, elevada = false }: { capas: Capa[]; visibles: Set<string>; ocultaEnMovil?: boolean; elevada?: boolean }) {
  const [abierta, setAbierta] = useState(() => window.innerWidth >= 768)
  const activas = capas.filter((c) => visibles.has(c.nombre) && leyendaDe(c.nombre).length > 0)

  return (
    <div className={`pointer-events-auto absolute left-3 z-10 ${elevada ? 'bottom-[15.5rem]' : 'bottom-9'} ${ocultaEnMovil ? 'hidden md:block' : ''} w-[15.5rem] max-w-[calc(100%-1.5rem)] overflow-hidden rounded-2xl border border-white/60 bg-white/92 shadow-xl backdrop-blur`}>
      <button type="button" aria-expanded={abierta} onClick={() => setAbierta((a) => !a)}
        className="flex w-full items-center justify-between px-3 py-2 text-left text-[11px] font-bold uppercase tracking-[0.12em] text-slate-600">
        <span>Leyenda{activas.length ? ` · ${activas.length}` : ''}</span>
        <span className={`text-sm transition-transform ${abierta ? 'rotate-90' : ''}`}>›</span>
      </button>
      {abierta && (
        <div className="max-h-[42vh] space-y-3 overflow-y-auto border-t border-slate-200 px-3 py-2.5">
          <div>
            <p className="mb-1 text-xs font-semibold text-slate-700">Inmuebles</p>
            <div className="flex gap-4 text-xs text-slate-600">
              {(['venta', 'arriendo'] as const).map((o) => (
                <span key={o} className="flex items-center gap-1.5 capitalize"><i className="inline-block size-3 rounded-full ring-2 ring-white" style={{ background: COLOR_OPERACION[o], boxShadow: '0 0 0 1px rgba(0,0,0,.25)' }} />{o}</span>
              ))}
            </div>
          </div>
          {activas.map((c) => (
            <div key={c.nombre}>
              <p className="mb-1 text-xs font-semibold text-slate-700">{tituloCapa(c.nombre)}</p>
              <ul className="space-y-0.5">
                {leyendaDe(c.nombre).map((k) => (
                  <li key={k.v} className="flex items-center gap-2 text-[11.5px] leading-tight text-slate-600">
                    <i className="h-2.5 w-5 shrink-0 rounded-sm ring-1 ring-black/15" style={{ background: k.c }} />
                    <span>{k.e}</span>
                  </li>
                ))}
              </ul>
            </div>
          ))}
          {activas.length === 0 && <p className="text-xs text-slate-500">Activa una capa de colores (por ejemplo «Clasificación del suelo») para ver su leyenda aquí.</p>}
        </div>
      )}
    </div>
  )
}
