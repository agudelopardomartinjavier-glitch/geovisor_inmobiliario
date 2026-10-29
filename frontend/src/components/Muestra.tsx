import type { Capa } from '../lib/types'
import { tipoGeom } from '../lib/mapa'
import { colorRepresentativo, estiloDe } from '../lib/estilos'

/** Pequeña muestra del símbolo de una capa: franjas de color si es categorizada; cuadro, línea o punto si no. */
export default function Muestra({ capa }: { capa: Pick<Capa, 'nombre' | 'geometria'> }) {
  const e = estiloDe(capa.nombre)
  const g = tipoGeom(capa.geometria)
  if (e?.cats && e.cats.length > 1) {
    const colores = [...new Set(e.cats.map((k) => k.c))].slice(0, 5)
    return (
      <span className="flex h-3.5 w-7 shrink-0 overflow-hidden rounded-[4px] ring-1 ring-black/15" aria-hidden="true">
        {colores.map((col) => <i key={col} className="h-full flex-1" style={{ background: col }} />)}
      </span>
    )
  }
  const col = colorRepresentativo(capa)
  if (g === 'linea') return <span className="h-0.5 w-7 shrink-0 rounded" style={{ background: col, boxShadow: '0 0 0 1px rgba(0,0,0,.18)' }} aria-hidden="true" />
  if (g === 'punto') return <span className="mx-2.5 size-2.5 shrink-0 rounded-full ring-1 ring-white" style={{ background: col, boxShadow: '0 0 0 1px rgba(0,0,0,.25)' }} aria-hidden="true" />
  const sinRelleno = e?.relleno === 0
  return <span className="h-3.5 w-7 shrink-0 rounded-[4px]" style={{ background: sinRelleno ? 'transparent' : col, border: `2px solid ${col}`, opacity: sinRelleno ? 1 : 0.9 }} aria-hidden="true" />
}
