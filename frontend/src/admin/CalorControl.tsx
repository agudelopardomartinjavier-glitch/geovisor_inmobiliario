import type { Tipo } from '../lib/types'
import { fmtCOP, fmtNum } from '../lib/mapa'
import type { MapaM2 } from './tipos'

/** Rampa secuencial de un solo tono (azul 100→700 de la paleta validada). Debe coincidir con la capa del mapa. */
export const RAMPA_CALOR: [number, string][] = [[0, '#cde2fb'], [0.25, '#86b6ef'], [0.5, '#3987e5'], [0.75, '#1c5cab'], [1, '#0d366b']]
const DEGRADE = `linear-gradient(to right, ${RAMPA_CALOR.map(([p, c]) => `${c} ${p * 100}%`).join(', ')})`
const TIPOS: Tipo[] = ['casa', 'lote', 'apartamento', 'local', 'finca']

interface Props {
  activo: boolean
  tipo: Tipo
  datos: MapaM2 | undefined
  cargando: boolean
  error: boolean
  onActivo: (v: boolean) => void
  onTipo: (t: Tipo) => void
}

export default function CalorControl({ activo, tipo, datos, cargando, error, onActivo, onTipo }: Props) {
  return (
    <div className="absolute left-2 top-2 z-10 w-64 max-w-[calc(100%-1rem)] rounded-lg border border-gray-200 bg-white/95 p-2.5 text-xs shadow">
      <label className="flex items-center justify-between gap-2 font-semibold text-gray-900">
        Mapa de calor · valor por m²
        <input type="checkbox" checked={activo} onChange={(e) => onActivo(e.target.checked)} aria-label="Mostrar mapa de calor de valor por metro cuadrado" />
      </label>
      {activo && (
        <div className="mt-2 space-y-2">
          <label className="block">Tipo de inmueble
            <select className="mt-1 w-full rounded border border-gray-300 px-2 py-1" value={tipo} onChange={(e) => onTipo(e.target.value as Tipo)}>
              {TIPOS.map((t) => <option key={t} value={t}>{t}</option>)}
            </select>
          </label>
          {cargando && <p className="text-gray-500">Calculando…</p>}
          {error && <p role="alert" className="text-red-700">No se pudo calcular el mapa.</p>}
          {datos && (
            <>
              <p className="text-gray-600">{datos.n_puntos} datos (comparables y ventas propias) · $/m² de {datos.base}</p>
              {datos.aviso && <p className="rounded bg-amber-50 p-1.5 text-amber-800">{datos.aviso}</p>}
              {datos.escala?.minimo != null && datos.escala.maximo != null && (
                <div>
                  <div className="h-2.5 rounded" style={{ background: DEGRADE }} aria-hidden="true" />
                  <div className="mt-0.5 flex justify-between text-[11px] text-gray-700"><span>{fmtCOP(datos.escala.minimo)}</span><span>{fmtCOP(datos.escala.maximo)}</span></div>
                  <p className="text-[10px] text-gray-500">Interpolado (IDW) sin extrapolar: solo se pinta a menos de {fmtNum(datos.radio_m ?? 0)} m de algún dato.</p>
                </div>
              )}
              {datos.sectores.length > 0 && (
                <details>
                  <summary className="cursor-pointer font-medium">Mediana por sector ({datos.sectores.length})</summary>
                  <table className="mt-1 w-full">
                    <thead><tr className="text-left text-gray-500"><th>Sector</th><th className="text-right">n</th><th className="text-right">$/m²</th></tr></thead>
                    <tbody>
                      {datos.sectores.map((s) => (
                        <tr key={s.zona} className="border-t border-gray-100">
                          <td className="py-0.5">{s.zona}</td>
                          <td className="text-right">{s.n}</td>
                          <td className="text-right">{fmtNum(s.mediana)}{!s.confiable && <span title="Menos de 3 datos: solo orientativo"> *</span>}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  <p className="text-[10px] text-gray-500">* menos de 3 datos: solo orientativo.</p>
                </details>
              )}
            </>
          )}
        </div>
      )}
    </div>
  )
}
