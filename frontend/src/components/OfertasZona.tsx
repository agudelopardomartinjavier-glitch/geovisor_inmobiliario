import { useMemo, useState } from 'react'
import { urlFoto } from '../lib/api'
import { COLOR_OPERACION, bonito, fmtCOP, fmtNum } from '../lib/mapa'
import type { InmuebleFeature, Operacion, Zona } from '../lib/types'

interface Props {
  zona: Zona
  ofertas: InmuebleFeature[]
  cargando: boolean
  operacion: Operacion | ''
  onOperacion: (o: Operacion | '') => void
  seleccionado: number | null
  onSeleccionar: (id: number) => void
  onCerrar: () => void
}

type Orden = 'precio_asc' | 'precio_desc' | 'recientes'

/** Franja con las ofertas de la zona elegida, sobre el mapa. Al tocar una tarjeta se abre el inmueble. */
export default function OfertasZona({ zona, ofertas, cargando, operacion, onOperacion, seleccionado, onSeleccionar, onCerrar }: Props) {
  const [orden, setOrden] = useState<Orden>('precio_asc')
  const lista = useMemo(() => {
    const l = [...ofertas]
    if (orden === 'recientes') l.sort((a, b) => (b.properties.fecha_publicacion ?? '').localeCompare(a.properties.fecha_publicacion ?? ''))
    else l.sort((a, b) => ((a.properties.precio ?? 0) - (b.properties.precio ?? 0)) * (orden === 'precio_asc' ? 1 : -1))
    return l
  }, [ofertas, orden])

  return (
    <section aria-label={`Ofertas en ${bonito(zona.nombre)}`}
      className="absolute inset-x-2 bottom-2 z-10 overflow-hidden rounded-2xl border border-white/60 bg-white/95 shadow-2xl backdrop-blur">
      <header className="flex flex-wrap items-center gap-x-3 gap-y-1.5 border-b border-slate-200 px-3 py-2">
        <div className="min-w-0 basis-[calc(100%-2rem)] sm:basis-0 sm:flex-1">
          <h2 className="truncate text-sm font-bold text-slate-800">
            {cargando ? 'Buscando ofertas…' : `${lista.length} ${lista.length === 1 ? 'oferta' : 'ofertas'}`} en {zona.tipo === 'vereda' ? 'vereda ' : ''}{bonito(zona.nombre)}
          </h2>
        </div>
        <div className="grid grid-cols-3 gap-0.5 rounded-lg bg-slate-100 p-0.5 text-[11px] font-medium">
          {(['', 'venta', 'arriendo'] as (Operacion | '')[]).map((o) => (
            <button key={o || 'todas'} type="button" aria-pressed={operacion === o} onClick={() => onOperacion(o)}
              className={`rounded-md px-2.5 py-1 transition ${operacion === o ? 'bg-white text-emerald-800 shadow-sm' : 'text-slate-500'}`}>
              {o === '' ? 'Todas' : o === 'venta' ? 'Venta' : 'Arriendo'}
            </button>
          ))}
        </div>
        <select value={orden} onChange={(e) => setOrden(e.target.value as Orden)} aria-label="Ordenar ofertas"
          className="rounded-lg border border-slate-200 bg-white px-2 py-1 text-[11px] text-slate-600">
          <option value="precio_asc">Menor precio</option>
          <option value="precio_desc">Mayor precio</option>
          <option value="recientes">Más recientes</option>
        </select>
        <button type="button" onClick={onCerrar} aria-label="Cerrar ofertas" className="order-2 rounded-lg px-2 text-xl leading-none text-slate-400 hover:bg-slate-100 sm:order-none">×</button>
      </header>

      {lista.length === 0 ? (
        <p className="px-4 py-4 text-sm text-slate-500">
          {cargando ? '…' : <>No hay ofertas publicadas en {bonito(zona.nombre)} con estos filtros. Prueba con «Todas» o quita algún filtro.</>}
        </p>
      ) : (
        <ul className="flex gap-2.5 overflow-x-auto p-2.5">
          {lista.map((f) => {
            const p = f.properties
            return (
              <li key={f.id} className="w-56 shrink-0">
                <button type="button" onClick={() => onSeleccionar(f.id)} aria-pressed={seleccionado === f.id}
                  className={`block w-full overflow-hidden rounded-xl border bg-white text-left shadow-sm transition hover:shadow-md ${seleccionado === f.id ? 'border-emerald-600 ring-2 ring-emerald-500/40' : 'border-slate-200'}`}>
                  <div className="relative h-24 bg-slate-200">
                    {p.fotos[0] && <img src={urlFoto(p.fotos[0])} alt="" loading="lazy" className="size-full object-cover" />}
                    <span className="absolute left-2 top-2 rounded px-1.5 py-0.5 text-[10px] font-bold uppercase text-white shadow" style={{ background: COLOR_OPERACION[p.operacion] }}>{p.operacion}</span>
                  </div>
                  <div className="space-y-0.5 px-2.5 py-2">
                    <p className="text-[15px] font-bold leading-tight text-slate-900">{fmtCOP(p.precio)}{p.operacion === 'arriendo' && <span className="text-[11px] font-medium text-slate-500"> /mes</span>}</p>
                    <p className="text-xs font-semibold capitalize text-slate-700">{p.tipo}</p>
                    <p className="text-[11px] text-slate-500">
                      {[p.area_construida ? `${fmtNum(p.area_construida)} m² constr.` : p.area_terreno ? `${fmtNum(p.area_terreno)} m²` : null,
                        p.habitaciones ? `${p.habitaciones} hab.` : null, p.banos ? `${p.banos} ${p.banos === 1 ? 'baño' : 'baños'}` : null].filter(Boolean).join(' · ')}
                    </p>
                  </div>
                </button>
              </li>
            )
          })}
        </ul>
      )}
    </section>
  )
}
