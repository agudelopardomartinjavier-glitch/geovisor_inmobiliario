import type { ColorSemaforo } from '../lib/types'

export const SEMAFORO: Record<ColorSemaforo, { etiqueta: string; fondo: string; punto: string; texto: string }> = {
  verde: { etiqueta: 'Riesgo bajo', fondo: 'bg-emerald-50 border-emerald-300', punto: 'bg-emerald-500', texto: 'text-emerald-900' },
  amarillo: { etiqueta: 'Requiere verificación', fondo: 'bg-amber-50 border-amber-300', punto: 'bg-amber-400', texto: 'text-amber-900' },
  rojo: { etiqueta: 'Riesgo alto', fondo: 'bg-red-50 border-red-300', punto: 'bg-red-500', texto: 'text-red-900' },
}

/** Punto + etiqueta corta. Va siempre con texto (no solo color) para quien no distingue colores. */
export function InsigniaSemaforo({ color }: { color: ColorSemaforo }) {
  const s = SEMAFORO[color]
  return (
    <span className={`inline-flex items-center gap-1 rounded-full border px-1.5 py-0.5 text-[11px] font-semibold ${s.fondo} ${s.texto}`} title="Semáforo jurídico-ambiental (indicador preliminar)">
      <span className={`size-2 rounded-full ${s.punto}`} aria-hidden="true" />
      {s.etiqueta}
    </span>
  )
}

export function CajaSemaforo({ color, resumen }: { color: ColorSemaforo; resumen: string }) {
  const s = SEMAFORO[color]
  return (
    <div className={`rounded-md border p-2 text-xs ${s.fondo} ${s.texto}`}>
      <div className="mb-0.5 flex items-center gap-1.5 font-semibold">
        <span className={`size-2.5 rounded-full ${s.punto}`} aria-hidden="true" />
        Semáforo jurídico-ambiental: {s.etiqueta.toLowerCase()}
      </div>
      <p>{resumen}</p>
      <p className="mt-1 text-[10px] opacity-75">Indicador preliminar automático; no reemplaza el estudio de títulos ni el concepto de planeación.</p>
    </div>
  )
}
