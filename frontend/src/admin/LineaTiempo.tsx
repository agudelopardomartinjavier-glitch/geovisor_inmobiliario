import { useMemo, useRef, useState } from 'react'
import { fmtCOP } from '../lib/mapa'
import type { AvaluoHist, PrecioHist } from './tipos'

// Dos series categóricas (slots 1 y 2 de la paleta validada). Misma unidad (COP) → un solo eje.
const SERIE = { precio: '#2a78d6', avaluo: '#eb6834' } as const
const TINTA = '#0b0b0b', TINTA2 = '#52514e', REJILLA = '#e4e3df', SUPERFICIE = '#fcfcfb'
const W = 520, H = 230, M = { t: 14, r: 64, b: 28, l: 52 }

const DIA = 86_400_000
const t = (f: string) => new Date(`${f}T12:00:00`).getTime()
const corto = (v: number) => (v >= 1e9 ? `${(v / 1e9).toLocaleString('es-CO', { maximumFractionDigits: 1 })} mil M` : `${Math.round(v / 1e6).toLocaleString('es-CO')} M`)
const fechaCorta = (ms: number) => new Date(ms).toLocaleDateString('es-CO', { day: '2-digit', month: 'short', year: '2-digit' })

interface Pto { x: number; v: number }

/** Línea escalonada: el precio o avalúo vale lo mismo hasta que cambia; se extiende hasta hoy. */
function escalon(pts: Pto[], fin: number): Pto[] {
  const out: Pto[] = []
  pts.forEach((p, i) => {
    if (i > 0) out.push({ x: p.x, v: pts[i - 1].v })
    out.push(p)
  })
  if (pts.length) out.push({ x: fin, v: pts[pts.length - 1].v })
  return out
}

export default function LineaTiempo({ precios, avaluos }: { precios: PrecioHist[]; avaluos: AvaluoHist[] }) {
  const [hover, setHover] = useState<number | null>(null)
  const [tabla, setTabla] = useState(false)
  const svg = useRef<SVGSVGElement>(null)

  const d = useMemo(() => {
    const p: Pto[] = precios.map((r) => ({ x: t(r.fecha), v: r.precio }))
    const a: Pto[] = avaluos.map((r) => ({ x: t(r.fecha), v: r.valor }))
    const todos = [...p, ...a]
    if (!todos.length) return null
    const hoy = Date.now()
    const x0 = Math.min(...todos.map((q) => q.x)), x1 = Math.max(hoy, ...todos.map((q) => q.x))
    const xs = x1 === x0 ? [x0 - 15 * DIA, x1 + 15 * DIA] : [x0, x1]
    const vmax = Math.max(...todos.map((q) => q.v)), vmin = Math.min(...todos.map((q) => q.v))
    const pad = (vmax - vmin) * 0.15 || vmax * 0.1 || 1
    const lo = Math.max(0, vmin - pad), hi = vmax + pad
    return { p, a, xs, lo, hi }
  }, [precios, avaluos])

  if (!d) return <p className="text-xs text-gray-500">Todavía no hay precios ni avalúos registrados.</p>

  const X = (ms: number) => M.l + ((ms - d.xs[0]) / (d.xs[1] - d.xs[0])) * (W - M.l - M.r)
  const Y = (v: number) => H - M.b - ((v - d.lo) / (d.hi - d.lo)) * (H - M.t - M.b)
  const ruta = (pts: Pto[]) => escalon(pts, d.xs[1]).map((q, i) => `${i ? 'L' : 'M'}${X(q.x).toFixed(1)},${Y(q.v).toFixed(1)}`).join(' ')
  const yTicks = [0, 1, 2, 3].map((i) => d.lo + ((d.hi - d.lo) * i) / 3)
  const xTicks = [0, 1, 2, 3].map((i) => d.xs[0] + ((d.xs[1] - d.xs[0]) * i) / 3)

  const valorEn = (pts: Pto[], x: number) => { let v: number | null = null; for (const q of pts) if (q.x <= x) v = q.v; return v }
  const fechas = [...new Set([...d.p, ...d.a].map((q) => q.x))].sort((a, b) => a - b)
  const alMover = (e: React.PointerEvent) => {
    const r = svg.current!.getBoundingClientRect()
    const x = d.xs[0] + (((e.clientX - r.left) / r.width) * W - M.l) / (W - M.l - M.r) * (d.xs[1] - d.xs[0])
    setHover(fechas.reduce((m, f) => (Math.abs(f - x) < Math.abs(m - x) ? f : m), fechas[0]))
  }
  const ultimoP = d.p[d.p.length - 1], ultimoA = d.a[d.a.length - 1]
  const hp = hover != null ? valorEn(d.p, hover) : null, ha = hover != null ? valorEn(d.a, hover) : null
  const lado = hover != null && X(hover) > W * 0.6

  return (
    <figure className="space-y-2 rounded-lg border border-gray-200 p-2" style={{ background: SUPERFICIE }}>
      <figcaption className="flex flex-wrap items-center justify-between gap-2 text-xs" style={{ color: TINTA }}>
        <span className="font-semibold">Precio publicado y avalúo en el tiempo (COP)</span>
        <ul className="flex gap-3" aria-label="Leyenda">
          <li className="flex items-center gap-1"><span className="inline-block h-0.5 w-4 rounded" style={{ background: SERIE.precio }} />Precio</li>
          <li className="flex items-center gap-1"><span className="inline-block h-0.5 w-4 rounded" style={{ background: SERIE.avaluo }} />Avalúo</li>
        </ul>
      </figcaption>

      {!tabla ? (
        <div className="relative">
          <svg ref={svg} viewBox={`0 0 ${W} ${H}`} className="w-full touch-none" role="img"
            aria-label={`Línea de tiempo: ${d.p.length} precios y ${d.a.length} avalúos`}
            onPointerMove={alMover} onPointerLeave={() => setHover(null)}>
            {yTicks.map((v) => (
              <g key={v}>
                <line x1={M.l} x2={W - M.r} y1={Y(v)} y2={Y(v)} stroke={REJILLA} strokeWidth="1" />
                <text x={M.l - 6} y={Y(v) + 3} textAnchor="end" fontSize="10" fill={TINTA2}>{corto(v)}</text>
              </g>
            ))}
            {xTicks.map((ms) => <text key={ms} x={X(ms)} y={H - 8} textAnchor="middle" fontSize="10" fill={TINTA2}>{fechaCorta(ms)}</text>)}

            {d.a.length > 0 && <path d={ruta(d.a)} fill="none" stroke={SERIE.avaluo} strokeWidth="2" strokeLinejoin="round" />}
            {d.p.length > 0 && <path d={ruta(d.p)} fill="none" stroke={SERIE.precio} strokeWidth="2" strokeLinejoin="round" />}
            {d.a.map((q, i) => <circle key={`a${i}`} cx={X(q.x)} cy={Y(q.v)} r="4" fill={SERIE.avaluo} stroke={SUPERFICIE} strokeWidth="2" />)}
            {d.p.map((q, i) => <circle key={`p${i}`} cx={X(q.x)} cy={Y(q.v)} r="4" fill={SERIE.precio} stroke={SUPERFICIE} strokeWidth="2" />)}

            {/* rótulo directo al final de cada serie (texto en tinta, el color lo lleva la marca) */}
            {ultimoP && <text x={W - M.r + 6} y={Y(ultimoP.v) + (ultimoA && Math.abs(Y(ultimoA.v) - Y(ultimoP.v)) < 12 ? -5 : 3)} fontSize="10" fill={TINTA}>Precio</text>}
            {ultimoA && <text x={W - M.r + 6} y={Y(ultimoA.v) + (ultimoP && Math.abs(Y(ultimoA.v) - Y(ultimoP.v)) < 12 ? 9 : 3)} fontSize="10" fill={TINTA}>Avalúo</text>}

            {hover != null && (
              <g pointerEvents="none">
                <line x1={X(hover)} x2={X(hover)} y1={M.t} y2={H - M.b} stroke={TINTA2} strokeWidth="1" strokeDasharray="3 3" />
                {hp != null && <circle cx={X(hover)} cy={Y(hp)} r="5" fill={SERIE.precio} stroke={SUPERFICIE} strokeWidth="2" />}
                {ha != null && <circle cx={X(hover)} cy={Y(ha)} r="5" fill={SERIE.avaluo} stroke={SUPERFICIE} strokeWidth="2" />}
              </g>
            )}
          </svg>
          {hover != null && (
            <div className="pointer-events-none absolute top-1 rounded-md border border-gray-200 bg-white px-2 py-1 text-[11px] shadow" style={{ [lado ? 'right' : 'left']: 56, color: TINTA }}>
              <div className="font-semibold">{fechaCorta(hover)}</div>
              {hp != null && <div><span className="mr-1 inline-block size-2 rounded-full" style={{ background: SERIE.precio }} />Precio {fmtCOP(hp)}</div>}
              {ha != null && <div><span className="mr-1 inline-block size-2 rounded-full" style={{ background: SERIE.avaluo }} />Avalúo {fmtCOP(ha)}</div>}
            </div>
          )}
        </div>
      ) : (
        <table className="w-full text-xs" style={{ color: TINTA }}>
          <thead><tr className="text-left" style={{ color: TINTA2 }}><th className="py-1">Fecha</th><th>Serie</th><th className="text-right">Valor</th></tr></thead>
          <tbody>
            {[...d.p.map((q) => ({ ...q, s: 'Precio' })), ...d.a.map((q) => ({ ...q, s: 'Avalúo' }))].sort((a, b) => a.x - b.x).map((q, i) => (
              <tr key={i} className="border-t border-gray-100"><td className="py-0.5">{fechaCorta(q.x)}</td><td>{q.s}</td><td className="text-right">{fmtCOP(q.v)}</td></tr>
            ))}
          </tbody>
        </table>
      )}
      <button type="button" onClick={() => setTabla((v) => !v)} className="text-[11px] underline" style={{ color: TINTA2 }}>{tabla ? 'Ver gráfico' : 'Ver como tabla'}</button>
    </figure>
  )
}
