import { useEffect, useMemo, useRef, useState } from 'react'
import { urlFoto } from '../lib/api'
import { NOMBRE_TIPO, fmtCOP, fmtNum, lugarDe } from '../lib/mapa'
import type { InmuebleFeature, InmuebleProps } from '../lib/types'
import { SEMAFORO } from './Semaforo'
import { Icono } from './ui'

interface Props {
  inmuebles: InmuebleFeature[]
  cargando: boolean
  primeraCarga: boolean
  error: boolean
  hayFiltros: boolean
  sobre: number | null
  onSobre: (id: number | null) => void
  onAbrir: (id: number) => void
  onLimpiar: () => void
  onReintentar: () => void
}

type Orden = 'recientes' | 'precio_asc' | 'precio_desc'

export const datosClave = (p: InmuebleProps) =>
  [
    p.area_construida ? `${fmtNum(p.area_construida)} m² construidos` : p.area_terreno ? (p.area_terreno >= 10000 ? `${fmtNum(p.area_terreno / 10000, 1)} ha` : `${fmtNum(p.area_terreno)} m²`) : null,
    p.habitaciones ? `${p.habitaciones} hab.` : null,
    p.banos ? `${p.banos} ${p.banos === 1 ? 'baño' : 'baños'}` : null,
  ].filter(Boolean).join(' · ')

function Fila({ f, resaltada, onSobre, onAbrir }: { f: InmuebleFeature; resaltada: boolean; onSobre: (id: number | null) => void; onAbrir: (id: number) => void }) {
  const p = f.properties
  const ref = useRef<HTMLLIElement>(null)
  const dentro = useRef(false)
  // si el resalte viene del mapa (no del propio cursor sobre la fila), la fila se acerca a la vista
  useEffect(() => {
    if (resaltada && !dentro.current) ref.current?.scrollIntoView({ block: 'nearest', behavior: 'smooth' })
  }, [resaltada])

  return (
    <li ref={ref}>
      <button
        type="button"
        onClick={() => onAbrir(f.id)}
        onMouseEnter={() => { dentro.current = true; onSobre(f.id) }}
        onMouseLeave={() => { dentro.current = false; onSobre(null) }}
        onFocus={() => onSobre(f.id)}
        onBlur={() => onSobre(null)}
        className={`group flex w-full gap-3 rounded-lg border p-2 text-left transition-colors duration-150 ${resaltada ? 'border-tinta bg-hoja' : 'border-transparent hover:bg-hoja'}`}
      >
        <span className="relative block h-[4.75rem] w-24 shrink-0 overflow-hidden rounded-md bg-linea">
          {p.fotos[0]
            ? <img src={urlFoto(p.fotos[0])} alt="" loading="lazy" className="size-full object-cover transition-transform duration-500 ease-salida group-hover:scale-105" />
            : <span className="grid size-full place-items-center text-tinta-3"><Icono n="foto" className="size-6" /></span>}
        </span>
        <span className="min-w-0 flex-1 py-0.5">
          <span className="flex items-baseline justify-between gap-2">
            <span className="cifras truncate text-base font-semibold leading-tight text-tinta">
              {fmtCOP(p.precio)}{p.operacion === 'arriendo' && <span className="text-xs font-normal text-tinta-3"> /mes</span>}
            </span>
            {p.semaforo && <i className={`size-2 shrink-0 translate-y-[-1px] rounded-full ${SEMAFORO[p.semaforo].punto}`} title={`Semáforo jurídico-ambiental: ${SEMAFORO[p.semaforo].etiqueta.toLowerCase()}`} />}
          </span>
          <span className="mt-1 flex items-center gap-1.5 text-[13px] text-tinta">
            <i className={`size-2 shrink-0 rounded-full ${p.operacion === 'venta' ? 'bg-venta' : 'bg-arriendo'}`} />
            <span className="truncate">{NOMBRE_TIPO[p.tipo]} en {p.operacion}</span>
          </span>
          <span className="mt-0.5 block truncate text-[13px] text-tinta-2">{lugarDe(p) ?? 'Acacías'}</span>
          <span className="cifras mt-0.5 block truncate text-xs text-tinta-3">{datosClave(p)}</span>
        </span>
      </button>
    </li>
  )
}

/** Resultados de la búsqueda, sincronizados con el mapa: pasar el cursor resalta el marcador y viceversa. */
export default function ListaInmuebles({ inmuebles, cargando, primeraCarga, error, hayFiltros, sobre, onSobre, onAbrir, onLimpiar, onReintentar }: Props) {
  const [orden, setOrden] = useState<Orden>('recientes')
  const lista = useMemo(() => {
    const l = [...inmuebles]
    if (orden === 'recientes') l.sort((a, b) => (b.properties.fecha_publicacion ?? '').localeCompare(a.properties.fecha_publicacion ?? ''))
    else l.sort((a, b) => ((a.properties.precio ?? 0) - (b.properties.precio ?? 0)) * (orden === 'precio_asc' ? 1 : -1))
    return l
  }, [inmuebles, orden])

  if (error) {
    return (
      <div className="px-4 py-8 text-sm text-tinta-2">
        <p className="font-semibold text-tinta">No se pudieron cargar los inmuebles.</p>
        <p className="mt-1">El servidor de datos no respondió. Revisa tu conexión e inténtalo de nuevo.</p>
        <button type="button" onClick={onReintentar} className="mt-3 rounded-md bg-tinta px-3.5 py-2 text-[13px] font-medium text-hoja transition-colors hover:bg-tinta-2">Reintentar</button>
      </div>
    )
  }

  if (primeraCarga) {
    return (
      <ul className="space-y-1 px-2 py-2" aria-busy="true" aria-label="Cargando inmuebles">
        {[0, 1, 2, 3, 4].map((i) => (
          <li key={i} className="flex gap-3 p-2">
            <span className="esqueleto h-[4.75rem] w-24 shrink-0" />
            <span className="flex-1 space-y-2 py-1"><span className="esqueleto block h-4 w-2/5" /><span className="esqueleto block h-3 w-3/5" /><span className="esqueleto block h-3 w-4/5" /></span>
          </li>
        ))}
      </ul>
    )
  }

  return (
    <div>
      <div className="sticky top-0 z-10 flex items-center justify-between gap-3 border-b border-linea bg-papel px-4 py-2">
        <p className="cifras text-[13px] text-tinta-2" role="status">
          <span className="font-semibold text-tinta">{lista.length}</span> {lista.length === 1 ? 'inmueble' : 'inmuebles'}{cargando && ' · actualizando…'}
        </p>
        <label className="flex items-center gap-1.5 text-[13px] text-tinta-2">
          <span className="sr-only">Ordenar por</span>
          <select value={orden} onChange={(e) => setOrden(e.target.value as Orden)}
            className="rounded-md border border-transparent bg-transparent py-1 pl-1 pr-0.5 text-[13px] font-medium text-tinta transition-colors hover:border-linea-2 focus:border-tinta focus:outline-none">
            <option value="recientes">Más recientes</option>
            <option value="precio_asc">Menor precio</option>
            <option value="precio_desc">Mayor precio</option>
          </select>
        </label>
        {cargando && <span className="absolute inset-x-0 bottom-[-1px] h-0.5 overflow-hidden"><span className="avance block h-full w-2/5 bg-tinta" /></span>}
      </div>

      {lista.length === 0 ? (
        <div className="px-4 py-8 text-sm text-tinta-2">
          <p className="font-semibold text-tinta">Ningún inmueble coincide.</p>
          <p className="mt-1">{hayFiltros ? 'Amplía el rango de precio o área, o quita algún filtro para ver más ofertas.' : 'Todavía no hay inmuebles publicados. Puedes explorar el catastro y las capas del POT en el mapa.'}</p>
          {hayFiltros && <button type="button" onClick={onLimpiar} className="mt-3 rounded-md bg-tinta px-3.5 py-2 text-[13px] font-medium text-hoja transition-colors hover:bg-tinta-2">Quitar todos los filtros</button>}
        </div>
      ) : (
        <ul className="space-y-0.5 px-2 py-2">
          {lista.map((f) => <Fila key={f.id} f={f} resaltada={sobre === f.id} onSobre={onSobre} onAbrir={onAbrir} />)}
        </ul>
      )}
    </div>
  )
}
