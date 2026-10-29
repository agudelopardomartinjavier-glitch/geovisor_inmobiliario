import { useState, type ReactNode } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { fmtCOP, fmtNum } from '../lib/mapa'
import { agregarAvaluo, agregarPrecio, borrarAvaluo, borrarPrecio, fijarCanon, verHistorial, verInversion } from './api'
import LineaTiempo from './LineaTiempo'
import type { Historial } from './tipos'

const campo = 'mt-1 w-full rounded-md border border-gray-300 px-2 py-1.5 text-sm focus:border-emerald-600 focus:outline-none'
const boton = 'rounded-md bg-sky-700 px-3 py-1.5 text-sm font-medium text-white disabled:opacity-50'
const FUENTE: Record<string, string> = { registrado: 'Registrado', comercial: 'Avalúo comercial', catastral: 'Catastral', comparables: 'Por comparables', otro: 'Otro' }
const pct = (n: number | null, dec = 1) => (n == null ? '—' : `${n > 0 ? '+' : ''}${fmtNum(n, dec)} %`)
const hoyISO = () => new Date(Date.now() - 5 * 3600_000).toISOString().slice(0, 10)

function Dato({ titulo, valor, detalle }: { titulo: string; valor: ReactNode; detalle?: ReactNode }) {
  return (
    <div className="rounded-lg border border-gray-200 bg-white p-2.5">
      <div className="text-[11px] text-gray-500">{titulo}</div>
      <div className="text-lg font-bold text-gray-900">{valor}</div>
      {detalle && <div className="text-[11px] text-gray-600">{detalle}</div>}
    </div>
  )
}

function Mercado({ h }: { h: Historial }) {
  const m = h.mercado, r = h.rebajas, s = h.m2
  return (
    <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
      <Dato titulo="Tiempo en el mercado" valor={`${fmtNum(m.dias)} d`}
        detalle={m.publicado_desde ? (m.vendido_el ? `Vendido en ${m.dias_hasta_venta} d (${m.vendido_el})` : `${m.publicado_ahora ? 'Publicado' : 'Despublicado'} · desde ${m.publicado_desde}`) : 'Aún no se ha publicado'} />
      <Dato titulo="Rebajas de precio" valor={r.n_rebajas}
        detalle={r.n_cambios === 0 ? 'Sin cambios de precio' : `Variación total ${pct(r.variacion_pct)}${r.rebaja_maxima_pct ? ` · mayor rebaja −${fmtNum(r.rebaja_maxima_pct, 1)} %` : ''}${r.dias_desde_ultimo_cambio != null ? ` · último cambio hace ${r.dias_desde_ultimo_cambio} d` : ''}`} />
      <Dato titulo={`Valor por m² (${s.base})`} valor={s.precio_m2 != null ? fmtCOP(s.precio_m2) : '—'}
        detalle={s.precio_m2 == null ? 'Solo para ventas con área' : s.sector.mediana == null ? `Sin datos del sector${s.zona ? ` (${s.zona})` : ''}` :
          <>Sector {s.zona}: mediana {fmtCOP(s.sector.mediana)} ({s.sector.n} datos) · <b>{pct(s.dif_pct)}</b>{!s.suficiente && <span className="text-amber-700"> · pocos datos, tómalo como orientación</span>}</>} />
    </div>
  )
}

function Tablas({ h, onPrecio, onAvaluo }: { h: Historial; onPrecio: (id: number) => void; onAvaluo: (id: number) => void }) {
  return (
    <div className="space-y-3 text-xs">
      <div>
        <h4 className="mb-1 font-semibold">Precios</h4>
        <table className="w-full">
          <thead><tr className="text-left text-gray-500"><th>Fecha</th><th className="text-right">Precio</th><th className="text-right">Cambio</th><th /></tr></thead>
          <tbody>
            {[...h.precios].reverse().map((p) => (
              <tr key={p.id} className="border-t border-gray-100">
                <td className="py-1">{p.fecha}{p.origen === 'manual' && <span className="ml-1 rounded bg-gray-100 px-1 text-[10px] text-gray-600">manual</span>}{p.nota && <div className="text-[10px] text-gray-500">{p.nota}</div>}</td>
                <td className="text-right">{fmtCOP(p.precio)}</td>
                <td className="text-right">
                  {p.tipo === 'inicial' ? <span className="text-gray-500">Inicial</span> :
                    <span className="font-semibold text-gray-900">
                      {p.tipo === 'rebaja' ? '▼ Rebaja' : '▲ Aumento'} {p.precio_anterior ? pct((100 * (p.precio - p.precio_anterior)) / p.precio_anterior) : ''}
                    </span>}
                </td>
                <td className="pl-1 text-right">{p.origen === 'manual' && <button type="button" aria-label="Borrar precio histórico" onClick={() => onPrecio(p.id)} className="text-red-600">×</button>}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div>
        <h4 className="mb-1 font-semibold">Avalúos</h4>
        <table className="w-full">
          <thead><tr className="text-left text-gray-500"><th>Fecha</th><th>Fuente</th><th className="text-right">Valor</th><th /></tr></thead>
          <tbody>
            {[...h.avaluos].reverse().map((a) => (
              <tr key={a.id} className="border-t border-gray-100">
                <td className="py-1">{a.fecha}{a.nota && <div className="text-[10px] text-gray-500">{a.nota}</div>}</td>
                <td>{FUENTE[a.fuente] ?? a.fuente}</td>
                <td className="text-right">{fmtCOP(a.valor)}</td>
                <td className="pl-1 text-right">{a.origen === 'manual' && <button type="button" aria-label="Borrar avalúo" onClick={() => onAvaluo(a.id)} className="text-red-600">×</button>}</td>
              </tr>
            ))}
            {h.avaluos.length === 0 && <tr><td colSpan={4} className="py-1 text-gray-500">Sin avalúos.</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  )
}

function Agregar({ id, onListo }: { id: number; onListo: (h: Historial) => void }) {
  const [fecha, setFecha] = useState(hoyISO())
  const [valor, setValor] = useState('')
  const [nota, setNota] = useState('')
  const [fuente, setFuente] = useState('comercial')
  const [que, setQue] = useState<'precio' | 'avaluo'>('precio')
  const guardar = useMutation({
    mutationFn: () => (que === 'precio'
      ? agregarPrecio(id, { fecha, precio: Number(valor), nota: nota.trim() || null })
      : agregarAvaluo(id, { fecha, valor: Number(valor), fuente, nota: nota.trim() || null })),
    onSuccess: (h) => { setValor(''); setNota(''); onListo(h) },
  })
  return (
    <details className="rounded border border-dashed border-gray-300 p-2 text-xs">
      <summary className="cursor-pointer font-medium">Agregar un dato histórico</summary>
      <form className="mt-2 grid grid-cols-2 gap-2" onSubmit={(e) => { e.preventDefault(); guardar.mutate() }}>
        <label>Qué
          <select className={campo} value={que} onChange={(e) => setQue(e.target.value as 'precio' | 'avaluo')}><option value="precio">Precio publicado</option><option value="avaluo">Avalúo</option></select>
        </label>
        <label>Fecha<input className={campo} type="date" required value={fecha} onChange={(e) => setFecha(e.target.value)} /></label>
        <label>Valor (COP)<input className={campo} type="number" min={0} required value={valor} onChange={(e) => setValor(e.target.value)} /></label>
        {que === 'avaluo'
          ? <label>Fuente<select className={campo} value={fuente} onChange={(e) => setFuente(e.target.value)}>{Object.entries(FUENTE).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select></label>
          : <span />}
        <label className="col-span-2">Nota<input className={campo} value={nota} onChange={(e) => setNota(e.target.value)} placeholder="Opcional" /></label>
        {guardar.error && <p role="alert" className="col-span-2 rounded bg-red-50 p-1.5 text-red-700">{(guardar.error as Error).message}</p>}
        <button type="submit" disabled={guardar.isPending} className={`${boton} col-span-2`}>{guardar.isPending ? 'Guardando…' : 'Agregar'}</button>
      </form>
      <p className="mt-1 text-[11px] text-gray-500">Para datos de antes de usar el sistema. Los cambios futuros de precio y avalúo se registran solos al editar el inmueble.</p>
    </details>
  )
}

function Rentabilidad({ id }: { id: number }) {
  const qc = useQueryClient()
  const q = useQuery({ queryKey: ['inversion', id], queryFn: () => verInversion(id) })
  const [canon, setCanon] = useState<string | null>(null)
  const guardar = useMutation({
    mutationFn: () => fijarCanon(id, canon && canon.trim() !== '' ? Number(canon) : null),
    onSuccess: (r) => { qc.setQueryData(['inversion', id], r); setCanon(null) },
  })
  const r = q.data
  if (!r) return <p className="text-xs text-gray-500">{q.isError ? 'No se pudo calcular.' : 'Calculando…'}</p>
  return (
    <div className="space-y-2 text-xs">
      <div className="rounded-lg bg-sky-50 p-3">
        <div className="text-[11px] text-sky-900">Rentabilidad bruta anual = canon anual ÷ valor del inmueble</div>
        <div className="text-2xl font-bold text-sky-950">{r.rentabilidad_pct != null ? `${fmtNum(r.rentabilidad_pct, 2)} %` : '—'}</div>
        <dl className="mt-1 grid grid-cols-[auto_1fr] gap-x-3 gap-y-0.5 text-gray-700">
          <dt>Canon mensual</dt><dd className="text-right">{r.canon_mensual != null ? fmtCOP(r.canon_mensual) : '—'}{r.origen_canon && <span className="block text-[10px] text-gray-500">{r.origen_canon}</span>}</dd>
          <dt>Canon anual</dt><dd className="text-right">{r.canon_mensual != null ? fmtCOP(r.canon_mensual * 12) : '—'}</dd>
          <dt>Valor del inmueble</dt><dd className="text-right">{r.valor_base != null ? fmtCOP(r.valor_base) : '—'}{r.origen_valor && <span className="block text-[10px] text-gray-500">{r.origen_valor}</span>}</dd>
          {r.rentabilidad_sobre_estimado_pct != null && (<><dt>Sobre el valor estimado</dt><dd className="text-right">{fmtNum(r.rentabilidad_sobre_estimado_pct, 2)} %</dd></>)}
        </dl>
        {r.avisos.map((a) => <p key={a} className="mt-1 rounded bg-amber-50 p-1.5 text-amber-800">⚠ {a}</p>)}
      </div>
      {r.operacion === 'venta' && (
        <form className="flex items-end gap-2" onSubmit={(e) => { e.preventDefault(); guardar.mutate() }}>
          <label className="flex-1">Canon mensual esperado (COP)
            <input className={campo} type="number" min={0} value={canon ?? r.canon_manual ?? ''} onChange={(e) => setCanon(e.target.value)} placeholder="Vacío = estimar con arriendos del sector" />
          </label>
          <button type="submit" disabled={canon === null || guardar.isPending} className={boton}>Guardar</button>
        </form>
      )}
      {guardar.error && <p role="alert" className="rounded bg-red-50 p-1.5 text-red-700">{(guardar.error as Error).message}</p>}
    </div>
  )
}

export default function HistorialPanel({ inmuebleId }: { inmuebleId: number }) {
  const qc = useQueryClient()
  const q = useQuery({ queryKey: ['historial', inmuebleId], queryFn: () => verHistorial(inmuebleId) })
  const puesto = (h: Historial) => { qc.setQueryData(['historial', inmuebleId], h) }
  const bp = useMutation({ mutationFn: (pid: number) => borrarPrecio(pid), onSuccess: puesto })
  const ba = useMutation({ mutationFn: (aid: number) => borrarAvaluo(aid), onSuccess: puesto })
  const h = q.data
  return (
    <section className="mt-4 space-y-3 border-t-2 border-sky-300 pt-4 text-sm">
      <h2 className="text-base font-bold text-sky-900">Historial, mercado y rentabilidad</h2>
      {!h ? <p className="text-xs text-gray-500">{q.isError ? 'No se pudo cargar el historial.' : 'Cargando…'}</p> : (
        <>
          <Mercado h={h} />
          <LineaTiempo precios={h.precios} avaluos={h.avaluos} />
          <Tablas h={h} onPrecio={(i) => { if (window.confirm('¿Borrar este precio histórico?')) bp.mutate(i) }} onAvaluo={(i) => { if (window.confirm('¿Borrar este avalúo?')) ba.mutate(i) }} />
          {(bp.error || ba.error) && <p role="alert" className="rounded bg-red-50 p-1.5 text-xs text-red-700">{((bp.error ?? ba.error) as Error).message}</p>}
          <Agregar id={inmuebleId} onListo={puesto} />
          <Rentabilidad key={inmuebleId} id={inmuebleId} />
        </>
      )}
    </section>
  )
}
