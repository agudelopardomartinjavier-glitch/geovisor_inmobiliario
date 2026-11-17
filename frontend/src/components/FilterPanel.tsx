import { useState } from 'react'
import type { Filtros, Operacion, Tipo } from '../lib/types'
import { NOMBRE_TIPO, fmtCorto, fmtNum } from '../lib/mapa'
import { Chip, Icono, Segmentado } from './ui'

const TIPOS = Object.entries(NOMBRE_TIPO).map(([id, nombre]) => ({ id: id as Tipo, nombre }))

export const FILTROS_VACIOS: Filtros = { zona: null, tipos: [], operacion: '', precioMin: '', precioMax: '', areaMin: '', areaMax: '' }

interface Props {
  filtros: Filtros
  onChange: (f: Filtros) => void
}

type CampoRango = 'precioMin' | 'precioMax' | 'areaMin' | 'areaMax'

function Campo({ etiqueta, prefijo, sufijo, valor, ayuda, onChange }: { etiqueta: string; prefijo?: string; sufijo?: string; valor: string; ayuda?: string; onChange: (v: string) => void }) {
  return (
    <label className="block text-xs font-medium text-tinta-2">
      {etiqueta}
      <span className="mt-1 flex h-9 items-center rounded-md border border-linea-2 bg-hoja transition-colors duration-150 focus-within:border-tinta hover:border-tinta-3">
        {prefijo && <span className="pl-2.5 text-sm text-tinta-3">{prefijo}</span>}
        <input
          className="cifras h-full w-full min-w-0 bg-transparent px-2 text-sm text-tinta focus:outline-none"
          type="number" min={0} inputMode="numeric" value={valor} placeholder="Sin límite"
          onChange={(e) => onChange(e.target.value)}
        />
        {sufijo && <span className="pr-2.5 text-sm text-tinta-3">{sufijo}</span>}
      </span>
      <span className="cifras mt-0.5 block h-4 text-[11px] font-normal text-tinta-3">{ayuda}</span>
    </label>
  )
}

export default function FilterPanel({ filtros, onChange }: Props) {
  const set = <K extends keyof Filtros>(k: K, v: Filtros[K]) => onChange({ ...filtros, [k]: v })
  const rangos = (['precioMin', 'precioMax', 'areaMin', 'areaMax'] as CampoRango[]).filter((k) => filtros[k] !== '').length
  const [masAbierto, setMasAbierto] = useState(rangos > 0)
  const activos = filtros.tipos.length + (filtros.operacion ? 1 : 0) + rangos
  const precio = (v: string) => (v && Number(v) > 0 ? fmtCorto(Number(v)) : undefined)
  const area = (v: string) => (v && Number(v) >= 10000 ? `${fmtNum(Number(v) / 10000, 2)} ha` : undefined)

  return (
    <div className="space-y-3">
      <Segmentado<Operacion | ''>
        etiqueta="Tipo de operación"
        valor={filtros.operacion}
        onChange={(o) => set('operacion', o)}
        opciones={[{ id: '', nombre: 'Todas' }, { id: 'venta', nombre: 'Venta' }, { id: 'arriendo', nombre: 'Arriendo' }]}
      />

      <div className="flex flex-wrap gap-1.5" role="group" aria-label="Tipo de inmueble">
        {TIPOS.map((t) => {
          const on = filtros.tipos.includes(t.id)
          return (
            <Chip key={t.id} activo={on} aria-pressed={on} onClick={() => set('tipos', on ? filtros.tipos.filter((x) => x !== t.id) : [...filtros.tipos, t.id])}>
              {on && <Icono n="check" className="-ml-1 size-3.5" />}
              {t.nombre}
            </Chip>
          )
        })}
      </div>

      <div className="flex items-center justify-between">
        <button type="button" aria-expanded={masAbierto} onClick={() => setMasAbierto((v) => !v)}
          className="-ml-1 flex items-center gap-1.5 rounded-md px-1 py-1 text-[13px] font-medium text-tinta-2 transition-colors hover:text-tinta">
          <Icono n="filtros" />
          Precio y área
          {rangos > 0 && <span className="cifras grid size-[18px] place-items-center rounded-full bg-marca text-[11px] font-semibold text-tinta">{rangos}</span>}
          <Icono n="angulo" className={`size-3.5 transition-transform duration-200 ease-salida ${masAbierto ? 'rotate-90' : ''}`} />
        </button>
        {activos > 0 && (
          <button type="button" onClick={() => onChange({ ...FILTROS_VACIOS, zona: filtros.zona })}
            className="rounded-md px-1 py-1 text-[13px] font-medium text-tinta underline decoration-linea-2 underline-offset-4 hover:decoration-tinta">
            Limpiar {activos === 1 ? 'filtro' : `${activos} filtros`}
          </button>
        )}
      </div>

      {masAbierto && (
        <div className="entra-vista grid grid-cols-2 gap-x-2.5 gap-y-1">
          <Campo etiqueta="Precio mínimo" prefijo="$" valor={filtros.precioMin} ayuda={precio(filtros.precioMin)} onChange={(v) => set('precioMin', v)} />
          <Campo etiqueta="Precio máximo" prefijo="$" valor={filtros.precioMax} ayuda={precio(filtros.precioMax)} onChange={(v) => set('precioMax', v)} />
          <Campo etiqueta="Área mínima" sufijo="m²" valor={filtros.areaMin} ayuda={area(filtros.areaMin)} onChange={(v) => set('areaMin', v)} />
          <Campo etiqueta="Área máxima" sufijo="m²" valor={filtros.areaMax} ayuda={area(filtros.areaMax)} onChange={(v) => set('areaMax', v)} />
        </div>
      )}
    </div>
  )
}
