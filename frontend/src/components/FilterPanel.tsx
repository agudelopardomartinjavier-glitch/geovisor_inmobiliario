import type { Filtros, Operacion, Tipo } from '../lib/types'

const TIPOS: { id: Tipo; nombre: string }[] = [
  { id: 'casa', nombre: 'Casa' },
  { id: 'lote', nombre: 'Lote' },
  { id: 'finca', nombre: 'Finca' },
  { id: 'local', nombre: 'Local' },
  { id: 'apartamento', nombre: 'Apartamento' },
]

export const FILTROS_VACIOS: Filtros = { zona: null, tipos: [], operacion: '', precioMin: '', precioMax: '', areaMin: '', areaMax: '' }

interface Props {
  filtros: Filtros
  onChange: (f: Filtros) => void
}

const input = 'mt-1 w-full rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1.5 text-sm focus:border-emerald-500 focus:bg-white focus:outline-none'

export default function FilterPanel({ filtros, onChange }: Props) {
  const set = <K extends keyof Filtros>(k: K, v: Filtros[K]) => onChange({ ...filtros, [k]: v })
  const hayFiltros = JSON.stringify(filtros) !== JSON.stringify(FILTROS_VACIOS)

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-1.5">
        {TIPOS.map((t) => {
          const on = filtros.tipos.includes(t.id)
          return (
            <button
              key={t.id}
              type="button"
              aria-pressed={on}
              onClick={() => set('tipos', on ? filtros.tipos.filter((x) => x !== t.id) : [...filtros.tipos, t.id])}
              className={`rounded-full border px-3 py-1 text-xs font-medium transition ${on ? 'border-emerald-700 bg-emerald-700 text-white shadow-sm' : 'border-slate-200 bg-white text-slate-600 hover:border-emerald-400'}`}
            >
              {t.nombre}
            </button>
          )
        })}
      </div>

      <div className="grid grid-cols-3 gap-0.5 rounded-xl bg-slate-100 p-0.5 text-xs font-medium">
        {(['', 'venta', 'arriendo'] as (Operacion | '')[]).map((o) => (
          <button
            key={o || 'todas'}
            type="button"
            aria-pressed={filtros.operacion === o}
            onClick={() => set('operacion', o)}
            className={`rounded-[10px] py-1.5 transition ${filtros.operacion === o ? 'bg-white text-emerald-800 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
          >
            {o === '' ? 'Todas' : o === 'venta' ? 'Venta' : 'Arriendo'}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-2 gap-2.5">
        <label className="text-[11px] font-medium text-slate-500">Precio mín. (COP)
          <input className={input} type="number" min={0} inputMode="numeric" value={filtros.precioMin} onChange={(e) => set('precioMin', e.target.value)} />
        </label>
        <label className="text-[11px] font-medium text-slate-500">Precio máx. (COP)
          <input className={input} type="number" min={0} inputMode="numeric" value={filtros.precioMax} onChange={(e) => set('precioMax', e.target.value)} />
        </label>
        <label className="text-[11px] font-medium text-slate-500">Área mín. (m²)
          <input className={input} type="number" min={0} inputMode="numeric" value={filtros.areaMin} onChange={(e) => set('areaMin', e.target.value)} />
        </label>
        <label className="text-[11px] font-medium text-slate-500">Área máx. (m²)
          <input className={input} type="number" min={0} inputMode="numeric" value={filtros.areaMax} onChange={(e) => set('areaMax', e.target.value)} />
        </label>
      </div>

      {hayFiltros && (
        <button type="button" onClick={() => onChange(FILTROS_VACIOS)} className="text-xs font-medium text-emerald-700 underline decoration-dotted underline-offset-2">
          Limpiar filtros
        </button>
      )}
    </div>
  )
}
