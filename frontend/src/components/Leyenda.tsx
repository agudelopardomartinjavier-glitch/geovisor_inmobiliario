import { useState } from 'react'
import type { Capa } from '../lib/types'
import { leyendaDe, tituloCapa } from '../lib/estilos'
import { Icono } from './ui'

/** Leyenda flotante: operación de los inmuebles y categorías de las capas de colores activas. */
export default function Leyenda({ capas, visibles }: { capas: Capa[]; visibles: Set<string> }) {
  const [abierta, setAbierta] = useState(() => window.innerWidth >= 768)
  const activas = capas.filter((c) => visibles.has(c.nombre) && leyendaDe(c.nombre).length > 0)

  if (!abierta) {
    return (
      <button type="button" aria-expanded={false} onClick={() => setAbierta(true)}
        className="pointer-events-auto flex h-9 items-center gap-2 rounded-lg border border-linea-2 bg-hoja px-3 text-[13px] font-medium text-tinta shadow-flota transition-colors hover:border-tinta">
        <Icono n="leyenda" /> Leyenda
        {activas.length > 0 && <span className="cifras grid size-[18px] place-items-center rounded-full bg-marca text-[11px] font-semibold">{activas.length}</span>}
      </button>
    )
  }

  return (
    <div className="entra-vista pointer-events-auto w-60 max-w-[calc(100vw-1.5rem)] overflow-hidden rounded-lg border border-linea-2 bg-hoja shadow-flota">
      <button type="button" aria-expanded onClick={() => setAbierta(false)}
        className="flex w-full items-center justify-between px-3 py-2 text-left text-[13px] font-semibold text-tinta">
        <span className="flex items-center gap-2"><Icono n="leyenda" /> Leyenda</span>
        <Icono n="cerrar" className="size-3.5 text-tinta-3" />
      </button>
      <div className="max-h-[38dvh] space-y-3 overflow-y-auto border-t border-linea px-3 py-2.5">
        <div>
          <p className="mb-1 text-xs font-medium text-tinta-2">Inmuebles</p>
          <div className="flex gap-4 text-[13px] text-tinta">
            <span className="flex items-center gap-1.5"><i className="size-2.5 rounded-full bg-venta" />Venta</span>
            <span className="flex items-center gap-1.5"><i className="size-2.5 rounded-full bg-arriendo" />Arriendo</span>
          </div>
        </div>
        {activas.map((c) => (
          <div key={c.nombre}>
            <p className="mb-1 text-xs font-medium text-tinta-2">{tituloCapa(c.nombre)}</p>
            <ul className="space-y-1">
              {leyendaDe(c.nombre).map((k) => (
                <li key={k.v} className="flex items-center gap-2 text-xs leading-tight text-tinta">
                  <i className="h-2.5 w-5 shrink-0 rounded-[2px] ring-1 ring-tinta/20" style={{ background: k.c }} />
                  <span>{k.e}</span>
                </li>
              ))}
            </ul>
          </div>
        ))}
        {activas.length === 0 && <p className="text-xs leading-relaxed text-tinta-3">Activa una capa de colores en la pestaña Capas (por ejemplo «Clasificación del suelo») y sus categorías aparecerán aquí.</p>}
      </div>
    </div>
  )
}
