import { useMemo, useState } from 'react'
import type { Capa } from '../lib/types'
import { GRUPOS } from '../lib/mapa'
import { subgrupoPot, tituloCapa, type Subgrupo } from '../lib/estilos'
import Muestra from './Muestra'
import { Chip, Icono, Interruptor } from './ui'

interface Props {
  capas: Capa[]
  cargando: boolean
  error: boolean
  visibles: Set<string>
  onToggle: (nombre: string) => void
  onPreset: (nombres: string[]) => void
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
      <label className="flex cursor-pointer items-center gap-3 rounded-md px-2 py-[7px] text-[13px] transition-colors duration-150 hover:bg-hoja">
        <Muestra capa={capa} />
        <span className={`min-w-0 flex-1 truncate ${activa ? 'font-medium text-tinta' : 'text-tinta-2'}`} title={tituloCapa(capa.nombre)}>{tituloCapa(capa.nombre)}</span>
        <Interruptor activo={activa} onChange={onToggle} etiqueta={`Mostrar ${tituloCapa(capa.nombre)}`} />
      </label>
    </li>
  )
}

export default function LayerControl({ capas, cargando, error, visibles, onToggle, onPreset }: Props) {
  const [abiertos, setAbiertos] = useState<Record<string, boolean>>({ catastro: true, pot: true })
  const [filtro, setFiltro] = useState('')
  const f = filtro.trim().toLowerCase()

  const grupos = useMemo(
    () => ORDEN.map((g) => ({ g, lista: capas.filter((c) => c.grupo === g && (!f || tituloCapa(c.nombre).toLowerCase().includes(f))) })).filter((x) => x.lista.length),
    [capas, f],
  )
  const activas = capas.filter((c) => visibles.has(c.nombre) && c.nombre !== 'predios').length
  const vistaActiva = (v: string[]) => v.length > 0 && v.every((n) => visibles.has(n)) && activas === v.length

  if (error) return <p className="px-4 py-6 text-sm text-alerta">No se pudo cargar el catálogo de capas: el servidor de datos no respondió.</p>
  if (cargando) return <div className="space-y-2.5 px-4 py-4" aria-busy="true" aria-label="Cargando capas">{[0, 1, 2, 3, 4, 5].map((i) => <span key={i} className="esqueleto block h-5" />)}</div>

  return (
    <div className="entra-vista space-y-4 px-4 py-4">
      <section>
        <div className="mb-2 flex items-baseline justify-between">
          <h3 className="text-sm font-semibold text-tinta">Vistas rápidas</h3>
          {activas > 0 && (
            <button type="button" onClick={() => onPreset([])} className="cifras text-[13px] font-medium text-tinta underline decoration-linea-2 underline-offset-4 hover:decoration-tinta">
              Ocultar {activas === 1 ? 'la capa activa' : `las ${activas} capas`}
            </button>
          )}
        </div>
        <div className="flex flex-wrap gap-1.5">
          {VISTAS.map((v) => {
            const on = vistaActiva(v.capas)
            return <Chip key={v.nombre} activo={on} aria-pressed={on} onClick={() => onPreset(on ? [] : v.capas)}>{v.nombre}</Chip>
          })}
        </div>
      </section>

      <section>
        <label className="relative block">
          <span className="sr-only">Buscar capa</span>
          <Icono n="buscar" className="pointer-events-none absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-tinta-3" />
          <input value={filtro} onChange={(e) => setFiltro(e.target.value)} placeholder={`Buscar entre ${capas.length} capas`}
            className="h-9 w-full rounded-md border border-linea-2 bg-hoja pl-8 pr-2 text-sm text-tinta transition-colors placeholder:text-tinta-3 hover:border-tinta-3 focus:border-tinta focus:outline-none" />
        </label>

        <div className="mt-2 divide-y divide-linea border-y border-linea">
          {grupos.map(({ g, lista }) => {
            const abierto = !!f || !!abiertos[g]
            const n = lista.filter((c) => visibles.has(c.nombre)).length
            return (
              <div key={g}>
                <button type="button" aria-expanded={abierto} onClick={() => setAbiertos((a) => ({ ...a, [g]: !a[g] }))}
                  className="flex w-full items-center gap-2 py-2.5 text-left text-sm font-semibold text-tinta">
                  <Icono n="angulo" className={`size-3.5 text-tinta-3 transition-transform duration-200 ease-salida ${abierto ? 'rotate-90' : ''}`} />
                  <span className="flex-1">{GRUPOS[g].titulo}</span>
                  <span className="cifras text-xs font-normal text-tinta-3">
                    {n > 0 && <span className="mr-1.5 rounded-full bg-marca px-1.5 py-px font-semibold text-tinta">{n} {n === 1 ? 'activa' : 'activas'}</span>}
                    {lista.length}
                  </span>
                </button>
                {abierto && (
                  <div className="-mx-2 pb-2">
                    {g === 'pot' ? (
                      SUBGRUPOS.map((sg) => {
                        const sub = lista.filter((c) => subgrupoPot(c.nombre) === sg)
                        if (!sub.length) return null
                        return (
                          <div key={sg} className="mb-1">
                            <p className="px-2 pb-0.5 pt-1.5 text-xs font-medium text-tinta-3">{sg}</p>
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
        </div>
        {grupos.length === 0 && <p className="mt-3 text-[13px] text-tinta-2">Ninguna capa coincide con «{filtro}».</p>}
      </section>

      <p className="text-xs leading-relaxed text-tinta-3">Datos: catastro, POT y POMCA de Acacías. Imagen satelital: Esri World Imagery. Información de referencia.</p>
    </div>
  )
}
