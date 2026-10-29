import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { fmtCOP, fmtNum } from '../lib/mapa'
import { descargarInforme, desvincular, sugeridosDe, valoracionDe, vincular, vinculosDe } from './api'
import type { Vinculo } from './tipos'

interface Props {
  inmuebleId: number
  onNuevoComparable: () => void
}

const pct = (n: number | null) => (n == null ? '—' : `${n > 0 ? '+' : ''}${fmtNum(n, 1)} %`)

function FilaVinculo({ v, onGuardar, onQuitar }: { v: Vinculo; onGuardar: (aj: number, inc: boolean) => void; onQuitar: () => void }) {
  const c = v.comparable
  const [aj, setAj] = useState(String(v.ajuste_pct))
  return (
    <tr className={v.incluir ? '' : 'text-gray-400 line-through decoration-gray-300'}>
      <td className="py-1 pr-1">
        <input type="checkbox" checked={v.incluir} title="Incluir en el cálculo" onChange={(e) => onGuardar(Number(aj) || 0, e.target.checked)} />
      </td>
      <td className="py-1 pr-2">
        <div className="font-medium">#{c.id} {c.sector ?? ''}</div>
        <div className="text-[11px]">{c.fecha ?? 's/f'} · {c.operacion} · {fmtCOP(c.precio)}{v.distancia_m != null && <> · {fmtNum(v.distancia_m)} m</>}</div>
      </td>
      <td className="py-1 pr-2 text-right">{v.unitario != null ? fmtNum(v.unitario) : <span title="Sin el área base">—</span>}</td>
      <td className="py-1 pr-1">
        <input
          className="w-16 rounded border border-gray-300 px-1 py-0.5 text-right"
          type="number" step="0.5" min={-90} max={300} value={aj}
          onChange={(e) => setAj(e.target.value)}
          onBlur={() => { const n = Number(aj) || 0; if (n !== v.ajuste_pct) onGuardar(n, v.incluir) }}
          aria-label="Ajuste en porcentaje"
        />
      </td>
      <td className="py-1 text-right">{v.ajustado != null ? fmtNum(v.ajustado) : '—'}</td>
      <td className="py-1 pl-1"><button type="button" onClick={onQuitar} className="text-red-600" aria-label="Quitar comparable">×</button></td>
    </tr>
  )
}

export default function ValoracionPanel({ inmuebleId, onNuevoComparable }: Props) {
  const qc = useQueryClient()
  const [radio, setRadio] = useState('3000')
  const [meses, setMeses] = useState('24')
  const [buscar, setBuscar] = useState(false)

  const vinculos = useQuery({ queryKey: ['vinculos', inmuebleId], queryFn: () => vinculosDe(inmuebleId) })
  const valor = useQuery({ queryKey: ['valoracion', inmuebleId], queryFn: () => valoracionDe(inmuebleId) })
  const sugeridos = useQuery({ queryKey: ['sugeridos', inmuebleId, radio, meses], queryFn: () => sugeridosDe(inmuebleId, Number(radio), Number(meses)), enabled: buscar, retry: false })

  const refrescar = () => { for (const k of ['vinculos', 'valoracion', 'sugeridos']) void qc.invalidateQueries({ queryKey: [k, inmuebleId] }) }
  const guardar = useMutation({
    mutationFn: (v: { cid: number; aj: number; inc: boolean; nota: string | null }) => vincular(inmuebleId, v.cid, { ajuste_pct: v.aj, incluir: v.inc, nota: v.nota }),
    onSuccess: refrescar, onError: (e: Error) => window.alert(e.message),
  })
  const quitar = useMutation({ mutationFn: (cid: number) => desvincular(inmuebleId, cid), onSuccess: refrescar })

  const r = valor.data
  const base = r?.base === 'terreno' ? 'terreno' : 'construida'

  return (
    <section className="mt-2 space-y-3 border-t-2 border-violet-300 pt-4 text-sm">
      <div className="flex items-center justify-between gap-2">
        <h2 className="text-base font-bold text-violet-900">Valoración por comparables</h2>
        <button type="button" onClick={() => { descargarInforme(inmuebleId).catch((e: Error) => window.alert(e.message)) }}
          className="shrink-0 rounded-md border border-violet-600 px-2.5 py-1 text-xs font-medium text-violet-700">
          Informe PDF
        </button>
      </div>

      {r && (
        <div className="space-y-2 rounded-lg bg-violet-50 p-3">
          {r.valor_estimado != null ? (
            <>
              <div className="text-xs text-violet-800">Valor estimado (área de {base}: {fmtNum(r.area_sujeto, 1)} m²)</div>
              <div className="text-xl font-bold text-violet-900">{fmtCOP(r.valor_estimado)}</div>
              {r.rango_bajo != null && <div className="text-xs text-gray-600">Rango ± 1 desv. est.: {fmtCOP(r.rango_bajo)} – {fmtCOP(r.rango_alto)}</div>}
            </>
          ) : (
            <div className="text-sm text-gray-600">Aún no hay valor estimado.</div>
          )}
          <dl className="grid grid-cols-2 gap-x-3 text-xs text-gray-700">
            <dt>Comparables usados</dt><dd className="text-right">{r.n}</dd>
            <dt>Promedio unitario</dt><dd className="text-right">{r.media != null ? `${fmtNum(r.media)} $/m²` : '—'}</dd>
            <dt>Mediana unitaria</dt><dd className="text-right">{r.mediana != null ? `${fmtNum(r.mediana)} $/m²` : '—'}</dd>
            <dt>Desviación estándar</dt><dd className="text-right">{r.desviacion != null ? fmtNum(r.desviacion) : '—'}</dd>
            <dt>Coef. de variación</dt>
            <dd className={`text-right font-semibold ${r.cv_ok == null ? '' : r.cv_ok ? 'text-emerald-700' : 'text-amber-700'}`}>
              {r.cv_pct != null ? `${fmtNum(r.cv_pct, 2)} %` : '—'} <span className="font-normal text-gray-500">(ref. ≤ {r.umbral_cv_pct} %)</span>
            </dd>
            {r.precio_publicado != null && (<><dt>Precio publicado</dt><dd className="text-right">{fmtCOP(r.precio_publicado)} <span className="text-gray-500">({pct(r.dif_precio_pct)})</span></dd></>)}
            {r.avaluo_registrado != null && (<><dt>Avalúo registrado</dt><dd className="text-right">{fmtCOP(r.avaluo_registrado)} <span className="text-gray-500">({pct(r.dif_avaluo_pct)})</span></dd></>)}
          </dl>
          {r.avisos.map((a) => <p key={a} className="rounded bg-amber-50 p-1.5 text-xs text-amber-800">⚠ {a}</p>)}
          <p className="text-[11px] text-gray-500">Estimación de apoyo: promedio de valores unitarios ajustados × área. Revísala con criterio profesional antes de usarla.</p>
        </div>
      )}

      <div>
        <div className="mb-1 flex items-center justify-between">
          <h3 className="font-semibold">Comparables vinculados ({vinculos.data?.length ?? 0})</h3>
          <button type="button" onClick={onNuevoComparable} className="text-xs text-violet-700 underline">+ Crear comparable</button>
        </div>
        {vinculos.data && vinculos.data.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead className="text-left text-[11px] text-gray-500">
                <tr><th /><th>Comparable</th><th className="text-right">$/m²</th><th className="text-right">Ajuste %</th><th className="text-right">Ajustado</th><th /></tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {vinculos.data.map((v) => (
                  <FilaVinculo
                    key={v.comparable.id + '-' + v.ajuste_pct + '-' + v.incluir}
                    v={v}
                    onGuardar={(aj, inc) => guardar.mutate({ cid: v.comparable.id, aj, inc, nota: v.nota })}
                    onQuitar={() => quitar.mutate(v.comparable.id)}
                  />
                ))}
              </tbody>
            </table>
            <p className="mt-1 text-[11px] text-gray-500">Ajuste en %: positivo sube el valor unitario del comparable (p. ej. mejor ubicación del inmueble); negativo lo baja (p. ej. −5 % por negociación en ofertas).</p>
          </div>
        ) : (
          <p className="text-xs text-gray-500">Ninguno todavía. Busca sugeridos o crea uno nuevo.</p>
        )}
      </div>

      <div className="space-y-2 rounded-lg border border-gray-200 p-3">
        <h3 className="font-semibold">Comparables sugeridos</h3>
        <div className="flex flex-wrap items-end gap-2 text-xs">
          <label>Radio (m)<input className="mt-0.5 block w-20 rounded border border-gray-300 px-1 py-1" type="number" min={100} value={radio} onChange={(e) => setRadio(e.target.value)} /></label>
          <label>Últimos (meses)<input className="mt-0.5 block w-20 rounded border border-gray-300 px-1 py-1" type="number" min={1} value={meses} onChange={(e) => setMeses(e.target.value)} /></label>
          <button type="button" onClick={() => setBuscar(true)} className="rounded bg-violet-700 px-3 py-1.5 text-white">Buscar</button>
        </div>
        {sugeridos.isError && <p className="text-xs text-red-600">{(sugeridos.error as Error).message}</p>}
        {sugeridos.data?.length === 0 && <p className="text-xs text-gray-500">No hay comparables del mismo tipo en ese radio y período.</p>}
        <ul className="space-y-1">
          {sugeridos.data?.map((s) => (
            <li key={s.comparable.id} className="flex items-center justify-between gap-2 rounded bg-gray-50 px-2 py-1 text-xs">
              <span className="min-w-0">
                <b>#{s.comparable.id}</b> {s.comparable.sector ?? ''} · {fmtCOP(s.comparable.precio)} · {s.unitario != null ? `${fmtNum(s.unitario)} $/m²` : 's/área base'} · {fmtNum(s.distancia_m)} m
              </span>
              <button type="button" onClick={() => guardar.mutate({ cid: s.comparable.id, aj: s.comparable.operacion === 'oferta' ? -5 : 0, inc: true, nota: null })} className="shrink-0 rounded border border-violet-600 px-2 py-0.5 text-violet-700">
                Vincular
              </button>
            </li>
          ))}
        </ul>
        {sugeridos.data && sugeridos.data.length > 0 && <p className="text-[11px] text-gray-500">Las ofertas se vinculan con −5 % de ajuste por negociación (puedes cambiarlo).</p>}
      </div>
    </section>
  )
}
