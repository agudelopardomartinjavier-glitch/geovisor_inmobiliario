import type { Cruce, GrupoCruce, Predio } from '../lib/types'
import { fmtNum } from '../lib/mapa'

interface Props {
  predio: Predio
  onClose: () => void
  onVerInmueble: (id: number) => void
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
      <h4 className="text-xs font-semibold text-gray-700">{g.titulo}</h4>
      <ul className="mt-1 space-y-1">
        {g.items.map((it, i) => {
          const e = etiqueta(it.atributos)
          return (
            <li key={i} className="rounded bg-gray-50 px-2 py-1 text-xs">
              <div className="flex items-start justify-between gap-2">
                <span>
                  {e.codigo && <b className="mr-1 rounded bg-emerald-100 px-1 text-emerald-900">{e.codigo}</b>}
                  {e.texto}
                </span>
                <span className="shrink-0 text-gray-500">{fmtNum(it.porcentaje_predio, 1)}%</span>
              </div>
              <div className="mt-1 h-1 rounded bg-gray-200"><div className="h-1 rounded bg-emerald-600" style={{ width: `${Math.min(100, it.porcentaje_predio)}%` }} /></div>
            </li>
          )
        })}
      </ul>
    </div>
  )
}

export default function PredioPanel({ predio, onClose, onVerInmueble }: Props) {
  const lugar = predio.ubicacion.barrio ? `Barrio ${predio.ubicacion.barrio}` : predio.ubicacion.vereda ? `Vereda ${predio.ubicacion.vereda}` : null
  return (
    <aside className="absolute inset-x-0 bottom-0 z-20 flex max-h-[58%] flex-col overflow-hidden rounded-t-2xl bg-white shadow-2xl ring-1 ring-black/5 md:inset-x-auto md:bottom-auto md:right-3 md:top-3 md:max-h-[calc(100%-1.5rem)] md:w-96 md:rounded-2xl">
      <div className="flex items-start justify-between gap-2 bg-gradient-to-r from-emerald-800 to-teal-700 px-4 py-3 text-white">
        <div className="min-w-0">
          <h3 className="text-[10px] font-bold uppercase tracking-[0.14em] text-emerald-100">Predio</h3>
          <p className="break-all font-mono text-sm font-semibold">{predio.numero_predial}</p>
        </div>
        <button type="button" onClick={onClose} aria-label="Cerrar" className="rounded-lg px-1.5 text-2xl leading-none text-white/80 hover:bg-white/15">×</button>
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto p-4">
      <p className="text-xs text-slate-600">
        {lugar && <>{lugar} · </>}Área catastral {fmtNum(predio.area_m2, 0)} m² ({fmtNum(predio.area_m2 / 10000, 2)} ha)
        {predio.registros > 1 && <> · {predio.registros} registros con este número</>}
      </p>

      <div className="mt-3 space-y-3">
        <h3 className="text-xs font-semibold uppercase tracking-wide text-gray-500">Uso del suelo (POT)</h3>
        {predio.uso_suelo.length ? predio.uso_suelo.map((g) => <Grupo key={g.clave} g={g} />) : <p className="text-xs text-gray-500">Sin información del POT para este predio.</p>}

        <h3 className="pt-1 text-xs font-semibold uppercase tracking-wide text-gray-500">Restricciones ambientales (POMCA)</h3>
        {predio.pomca.length ? predio.pomca.map((g) => <Grupo key={g.clave} g={g} />) : <p className="text-xs text-gray-500">No intersecta zonas POMCA cargadas.</p>}

        {predio.inmuebles_publicados.length > 0 && (
          <div>
            <h3 className="text-xs font-semibold uppercase tracking-wide text-gray-500">Inmuebles publicados aquí</h3>
            <div className="mt-1 flex flex-wrap gap-1.5">
              {predio.inmuebles_publicados.map((id) => (
                <button key={id} type="button" onClick={() => onVerInmueble(id)} className="rounded-full border border-emerald-700 px-2.5 py-0.5 text-xs text-emerald-800">
                  Ver inmueble #{id}
                </button>
              ))}
            </div>
          </div>
        )}
        <p className="border-t pt-2 text-[11px] text-gray-500">Información de referencia basada en el POT y el POMCA cargados; no reemplaza el concepto de uso de suelo oficial.</p>
      </div>
      </div>
    </aside>
  )
}
