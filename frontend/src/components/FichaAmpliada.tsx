import { Fragment, type ReactNode } from 'react'
import { useQuery } from '@tanstack/react-query'
import { getFichaAmpliada } from '../lib/api'
import { fmtCOP, fmtNum } from '../lib/mapa'
import type { Entorno, FichaPublica, Tipo } from '../lib/types'
import { CajaSemaforo } from './Semaforo'

const CONSERVACION: Record<string, string> = { nuevo: 'Nuevo', excelente: 'Excelente', bueno: 'Bueno', regular: 'Regular', para_remodelar: 'Para remodelar' }
const ORIENTACION: Record<string, string> = { N: 'Norte', NE: 'Nororiente', E: 'Oriente', SE: 'Suroriente', S: 'Sur', SO: 'Suroccidente', O: 'Occidente', NO: 'Noroccidente' }
const SERVICIOS: [keyof FichaPublica, string][] = [['agua', 'Agua'], ['alcantarillado', 'Alcantarillado'], ['gas', 'Gas'], ['energia', 'Energía'], ['internet', 'Internet']]
const ENTORNO: [keyof Entorno, string][] = [
  ['via_principal_m', 'Vía principal'], ['colegio_m', 'Colegio'], ['parque_m', 'Parque'], ['centro_salud_m', 'Centro de salud'], ['casco_urbano_m', 'Casco urbano'],
]
const ENTORNO_FINCA: [keyof Entorno, string][] = [['drenaje_m', 'Fuente de agua (drenaje)'], ['nacimiento_m', 'Nacimiento']]

const dist = (m: number | null | undefined) => (m == null ? 'Sin dato' : m === 0 ? 'En el inmueble' : m < 1000 ? `${fmtNum(m)} m` : `${fmtNum(m / 1000, 1)} km`)
const sn = (v: boolean | null) => (v == null ? null : v ? 'Sí' : 'No')

function Filas({ filas }: { filas: [string, string | number | null | undefined][] }) {
  const visibles = filas.filter(([, v]) => v != null && v !== '')
  if (!visibles.length) return null
  return (
    <dl className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-0.5 text-xs text-gray-700">
      {visibles.map(([k, v]) => (<Fragment key={k}><dt className="text-gray-500">{k}</dt><dd className="text-right">{v}</dd></Fragment>))}
    </dl>
  )
}

function Bloque({ titulo, children }: { titulo: string; children: ReactNode }) {
  return <div className="space-y-1"><h4 className="text-[10px] font-bold uppercase tracking-wide text-gray-500">{titulo}</h4>{children}</div>
}

const enlace = (url: string) => (url.startsWith('http') ? url : undefined)

export default function FichaAmpliada({ id, tipo, esArriendo }: { id: number; tipo: Tipo; esArriendo: boolean }) {
  const q = useQuery({ queryKey: ['ficha-ampliada', id], queryFn: () => getFichaAmpliada(id), staleTime: 60_000 })
  if (q.isLoading) return <p className="text-xs text-gray-500">Cargando ficha…</p>
  if (q.isError || !q.data) return <p className="text-xs text-red-600">No se pudo cargar la ficha ampliada.</p>
  const f = q.data
  const serv = SERVICIOS.map(([k, n]) => [n, f[k] as boolean | null] as const).filter(([, v]) => v != null)
  const enlaces = [['Video', f.video_url], ['Recorrido 360°', f.recorrido_360_url], ['Plano de planta', f.plano_url]].filter(([, u]) => u && enlace(u as string)) as [string, string][]
  const entorno: [keyof Entorno, string][] = tipo === 'finca' ? [...ENTORNO, ...ENTORNO_FINCA] : ENTORNO

  return (
    <div className="space-y-3">
      {f.semaforo && <CajaSemaforo color={f.semaforo.color} resumen={f.semaforo.resumen} />}

      <Bloque titulo="Características">
        <Filas filas={[
          ['Estrato', f.estrato], ['Antigüedad', f.antiguedad_anos != null ? `${f.antiguedad_anos} años` : null],
          ['Conservación', f.estado_conservacion ? CONSERVACION[f.estado_conservacion] : null],
          ['Pisos', f.pisos], ['Parqueaderos', f.parqueaderos], ['Depósito', sn(f.deposito)],
          ['Acabados', f.acabados], ['Orientación', f.orientacion ? ORIENTACION[f.orientacion] : null],
        ]} />
      </Bloque>

      {serv.length > 0 && (
        <Bloque titulo="Servicios">
          <ul className="flex flex-wrap gap-1">
            {serv.map(([n, v]) => (
              <li key={n} className={`rounded px-1.5 py-0.5 text-[11px] ${v ? 'bg-emerald-50 text-emerald-800' : 'bg-gray-100 text-gray-500 line-through'}`}>{n}{v ? '' : ' (no)'}</li>
            ))}
          </ul>
        </Bloque>
      )}

      {tipo === 'finca' && (
        <Bloque titulo="Finca">
          <Filas filas={[['Fuentes de agua', f.fuentes_agua], ['Suelo', f.tipo_suelo], ['Vocación', f.vocacion], ['Cultivos', f.cultivos], ['Mejoras', f.mejoras], ['Vía de acceso', f.via_acceso]]} />
        </Bloque>
      )}

      <Bloque titulo="Entorno (calculado con el mapa)">
        <Filas filas={entorno.map(([k, n]) => [n, k === 'centro_salud_m' && f.entorno[k] == null ? null : dist(f.entorno[k])])} />
        <p className="text-[10px] text-gray-400">Distancia en línea recta a lo más cercano. {f.entorno.centro_salud_m == null && 'Centros de salud: sin capa disponible.'}</p>
      </Bloque>

      <Bloque titulo={esArriendo ? 'Condiciones del arriendo' : 'Condiciones de venta'}>
        <Filas filas={[
          ['Negociable', sn(f.negociable)], ['Permuta', sn(f.permuta)], ['Financiación', sn(f.financiacion)],
          ['Administración mensual', f.administracion_mensual != null ? fmtCOP(f.administracion_mensual) : null],
          ['Disponible desde', f.disponible_desde],
        ]} />
      </Bloque>

      {enlaces.length > 0 && (
        <Bloque titulo="Medios">
          <div className="flex flex-wrap gap-1.5">
            {enlaces.map(([n, u]) => (
              <a key={n} href={u} target="_blank" rel="noopener noreferrer" className="rounded-md border border-gray-300 px-2 py-1 text-xs text-emerald-800">{n} ↗</a>
            ))}
          </div>
        </Bloque>
      )}
    </div>
  )
}
