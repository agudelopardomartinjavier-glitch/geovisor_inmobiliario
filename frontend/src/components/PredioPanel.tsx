import { useState } from 'react'
import type { Cruce, GrupoCruce, Predio } from '../lib/types'
import { bonito, fmtNum } from '../lib/mapa'
import { BotonIcono, Icono } from './ui'

interface Props {
  predio: Predio
  onClose: () => void
  onVerInmueble: (id: number) => void
  onCentrar: () => void
}

/** Muestra "CÓDIGO · descripción" a partir de los atributos de una capa. */
function etiqueta(a: Cruce['atributos']): { codigo: string | null; texto: string } {
  const v = (k: string) => (a[k] == null || a[k] === '' ? null : String(a[k]))
  if (v('convencion')) return { codigo: v('codigo') ?? v('numero'), texto: v('convencion')! }
  if (v('vereda')) return { codigo: v('numero'), texto: v('vereda')! }
  if (v('zonificaci')) return { codigo: v('codigofin'), texto: v('zonificaci')! }
  const resto = ['categ_orde', 'zon_uym', 'subz_uym'].map(v).filter(Boolean)
  return { codigo: v('nomenclat'), texto: resto.join(' · ') }
}

function Grupo({ g }: { g: GrupoCruce }) {
  return (
    <div>
      <h4 className="text-[13px] font-medium text-tinta-2">{g.titulo}</h4>
      <ul className="mt-1">
        {g.items.map((it, i) => {
          const e = etiqueta(it.atributos)
          return (
            <li key={i} className="border-b border-linea py-2 text-[13px] last:border-0">
              <div className="flex items-start justify-between gap-3">
                <span className="text-tinta">
                  {e.codigo && <span className="mr-1.5 rounded border border-linea-2 bg-hoja px-1 py-px font-mono text-[11px] font-medium">{e.codigo}</span>}
                  {e.texto}
                </span>
                <span className="cifras shrink-0 font-semibold text-tinta">{fmtNum(it.porcentaje_predio, 1)} %</span>
              </div>
              <div className="mt-1.5 h-1 bg-linea" role="presentation"><div className="h-1 bg-tinta" style={{ width: `${Math.min(100, it.porcentaje_predio)}%` }} /></div>
            </li>
          )
        })}
      </ul>
    </div>
  )
}

function Seccion({ titulo, vacio, grupos }: { titulo: string; vacio: string; grupos: GrupoCruce[] }) {
  return (
    <section>
      <h3 className="text-sm font-semibold text-tinta">{titulo}</h3>
      <div className="mt-2 space-y-3">
        {grupos.length ? grupos.map((g) => <Grupo key={g.clave} g={g} />) : <p className="text-[13px] text-tinta-3">{vacio}</p>}
      </div>
    </section>
  )
}

/** Consulta de un predio: área, uso del suelo según el POT y restricciones del POMCA. */
export default function PredioPanel({ predio, onClose, onVerInmueble, onCentrar }: Props) {
  const [copiado, setCopiado] = useState(false)
  const lugar = predio.ubicacion.barrio ? `Barrio ${bonito(predio.ubicacion.barrio)}` : predio.ubicacion.vereda ? `Vereda ${bonito(predio.ubicacion.vereda)}` : null
  return (
    <aside aria-label="Consulta de predio"
      className="entra-abajo md:entra-lado absolute inset-x-0 bottom-0 z-30 flex max-h-[62dvh] flex-col overflow-hidden rounded-t-xl border border-linea-2 bg-papel shadow-panel md:inset-x-auto md:bottom-auto md:right-3 md:top-3 md:max-h-[calc(100%-1.5rem)] md:w-[23rem] md:rounded-xl">
      <header className="border-b border-linea px-4 pb-3 pt-3">
        <div className="flex items-center justify-between gap-2">
          <h2 className="flex items-center gap-2 text-base font-semibold text-tinta"><Icono n="parcela" className="size-[18px]" /> Predio</h2>
          <div className="flex">
            <BotonIcono icono="ubicar" etiqueta="Centrar el predio en el mapa" onClick={onCentrar} />
            <BotonIcono icono="cerrar" etiqueta="Cerrar la consulta del predio" onClick={onClose} />
          </div>
        </div>
        <button type="button" title="Copiar número predial"
          onClick={() => { void navigator.clipboard?.writeText(predio.numero_predial).then(() => { setCopiado(true); setTimeout(() => setCopiado(false), 1600) }) }}
          className="group mt-1 flex w-full items-start gap-2 rounded text-left">
          <span className="break-all font-mono text-[13px] font-medium leading-snug text-tinta">{predio.numero_predial}</span>
          <span className="mt-px flex shrink-0 items-center gap-1 text-xs text-tinta-3 group-hover:text-tinta" aria-live="polite"><Icono n={copiado ? 'check' : 'enlace'} className="size-3.5" />{copiado ? 'Copiado' : 'Copiar'}</span>
        </button>
      </header>

      <div className="min-h-0 flex-1 space-y-5 overflow-y-auto px-4 pb-4 pt-3">
        <dl className="flex divide-x divide-linea border-b border-linea pb-3">
          <div className="pr-4">
            <dt className="text-xs text-tinta-3">Área catastral</dt>
            <dd className="cifras mt-0.5 text-[15px] font-semibold text-tinta">{fmtNum(predio.area_m2, 0)} m² <span className="font-normal text-tinta-2">· {fmtNum(predio.area_m2 / 10000, 2)} ha</span></dd>
          </div>
          {lugar && (
            <div className="min-w-0 pl-4">
              <dt className="text-xs text-tinta-3">Ubicación</dt>
              <dd className="mt-0.5 truncate text-[15px] font-semibold text-tinta">{lugar}</dd>
            </div>
          )}
        </dl>
        {predio.registros > 1 && <p className="text-[13px] text-tinta-2">Hay {predio.registros} registros catastrales con este número.</p>}

        {predio.inmuebles_publicados.length > 0 && (
          <section>
            <h3 className="text-sm font-semibold text-tinta">Inmuebles publicados aquí</h3>
            <div className="mt-2 flex flex-wrap gap-1.5">
              {predio.inmuebles_publicados.map((id) => (
                <button key={id} type="button" onClick={() => onVerInmueble(id)}
                  className="flex items-center gap-1.5 rounded-md bg-marca px-3 py-1.5 text-[13px] font-semibold text-tinta transition-colors hover:bg-marca-2">
                  Ver inmueble N.º {id} <Icono n="flecha" className="size-3.5" />
                </button>
              ))}
            </div>
          </section>
        )}

        <Seccion titulo="Uso del suelo (POT)" vacio="Sin información del POT para este predio." grupos={predio.uso_suelo} />
        <Seccion titulo="Restricciones ambientales (POMCA)" vacio="No intersecta zonas POMCA cargadas." grupos={predio.pomca} />

        <p className="border-t border-linea pt-3 text-xs leading-relaxed text-tinta-3">Información de referencia basada en el POT y el POMCA cargados; no reemplaza el concepto de uso de suelo oficial.</p>
      </div>
    </aside>
  )
}
