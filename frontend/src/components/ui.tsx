import { useEffect, useState, type ButtonHTMLAttributes, type ReactNode } from 'react'

/** Marca: una parcela con su punto de localización. */
export function Logo({ className = 'size-9' }: { className?: string }) {
  return (
    <svg viewBox="0 0 40 40" className={className} aria-hidden="true">
      <rect width="40" height="40" rx="8" fill="#14211b" />
      <path d="M9 14.5 22.5 9 31 15.5v12L18.5 31 9 26.5v-12Z" fill="none" stroke="#fdfdfb" strokeWidth="1.6" strokeLinejoin="round" />
      <path d="M22.5 9v8.5L31 27.5M22.5 17.5 9 21" fill="none" stroke="#fdfdfb" strokeOpacity=".45" strokeWidth="1.2" />
      <circle cx="17" cy="23.5" r="3.6" fill="#c8f04f" />
    </svg>
  )
}

const TRAZOS = {
  buscar: <><circle cx="9" cy="9" r="5.5" /><path d="m13.2 13.2 3.8 3.8" /></>,
  cerrar: <path d="m5 5 10 10M15 5 5 15" />,
  atras: <path d="M11.5 4.5 6 10l5.5 5.5M6 10h9" />,
  flecha: <path d="M4 10h11M10.5 5.5 15 10l-4.5 4.5" />,
  angulo: <path d="m7.5 4.5 5.5 5.5-5.5 5.5" />,
  mas: <path d="M10 4v12M4 10h12" />,
  menos: <path d="M4 10h12" />,
  capas: <><path d="m10 3 7 4-7 4-7-4 7-4Z" /><path d="m3 10.5 7 4 7-4M3 14l7 4 7-4" /></>,
  casa: <><path d="M3.5 9.5 10 4l6.5 5.5" /><path d="M5.5 8.5V16h9V8.5" /><path d="M8.5 16v-4h3v4" /></>,
  ubicar: <><circle cx="10" cy="10" r="5" /><circle cx="10" cy="10" r="1.4" fill="currentColor" stroke="none" /><path d="M10 2.5V5M10 15v2.5M2.5 10H5M15 10h2.5" /></>,
  inicio: <><path d="M3 3h5M3 3v5M17 3h-5M17 3v5M3 17h5M3 17v-5M17 17h-5M17 17v-5" /></>,
  norte: <><path d="m10 3 4 12-4-2.5L6 15l4-12Z" /></>,
  filtros: <><path d="M3 6h14M3 14h14" /><circle cx="7.5" cy="6" r="2" fill="var(--color-hoja)" /><circle cx="12.5" cy="14" r="2" fill="var(--color-hoja)" /></>,
  pin: <><path d="M10 17.5s5.5-4.8 5.5-9.3a5.5 5.5 0 1 0-11 0c0 4.500 5.5 9.3 5.5 9.3Z" /><circle cx="10" cy="8.2" r="1.9" /></>,
  parcela: <><path d="M3 6.500 11 3l6 4v7.500L9 17l-6-3V6.500Z" /><path d="M11 3v6l6 5.500M11 9 3 11" /></>,
  documento: <><path d="M5.5 2.500h6l3.500 3.500v11.500h-9.500v-15Z" /><path d="M11.500 2.500V6H15M8 10h4.500M8 13h4.500" /></>,
  enlace: <><path d="M8.500 11.500a3 3 0 0 0 4.300 0l2.700-2.700a3 3 0 0 0-4.300-4.300l-.9.9" /><path d="M11.500 8.500a3 3 0 0 0-4.300 0l-2.700 2.700a3 3 0 0 0 4.300 4.300l.9-.9" /></>,
  check: <path d="m4.500 10.500 3.500 3.500 7.500-8" />,
  leyenda: <><path d="M3.500 5.500h3v3h-3zM3.500 11.500h3v3h-3z" /><path d="M9.500 7h7M9.500 13h7" /></>,
  lista: <path d="M4 5.500h12M4 10h12M4 14.500h12" />,
  whatsapp: <><path d="M3.500 16.500 4.600 13a6.500 6.500 0 1 1 2.500 2.400l-3.600 1.100Z" /><path d="M7.800 7.600c.3 2.300 1.900 3.900 4.300 4.600l1-1.100-1.500-.9-.6.500c-.8-.4-1.400-1-1.800-1.800l.5-.6-.9-1.500-1 .8Z" fill="currentColor" stroke="none" /></>,
  externo: <path d="M8 5H5v10h10v-3M11 4.500h4.500V9M15.500 4.500 9.500 10.500" />,
  foto: <><rect x="3" y="4.500" width="14" height="11" rx="1.500" /><path d="m3.500 13.500 3.500-3.500 3 3 2.500-2 4 3.500" /><circle cx="12.800" cy="8" r="1.100" /></>,
} as const

export type NombreIcono = keyof typeof TRAZOS

/** Iconos propios: mismo trazo (1.5) y misma caja en todo el visor. */
export function Icono({ n, className = 'size-4' }: { n: NombreIcono; className?: string }) {
  return (
    <svg viewBox="0 0 20 20" className={`shrink-0 ${className}`} fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      {TRAZOS[n]}
    </svg>
  )
}

export function Interruptor({ activo, onChange, etiqueta }: { activo: boolean; onChange: () => void; etiqueta: string }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={activo}
      aria-label={etiqueta}
      onClick={(e) => { e.preventDefault(); onChange() }}
      className={`relative inline-flex h-5 w-9 shrink-0 items-center rounded-full border transition-colors duration-150 ${activo ? 'border-tinta bg-tinta' : 'border-linea-2 bg-linea'}`}
    >
      <span className={`inline-block size-3.5 rounded-full transition-transform duration-200 ease-salida ${activo ? 'translate-x-[18px] bg-marca' : 'translate-x-0.5 bg-hoja shadow-sm'}`} />
    </button>
  )
}

/** Selector de opción única (Todas / Venta / Arriendo, pestañas…). */
export function Segmentado<T extends string>({ opciones, valor, onChange, etiqueta, className = '' }: {
  opciones: { id: T; nombre: ReactNode }[]
  valor: T
  onChange: (v: T) => void
  etiqueta: string
  className?: string
}) {
  return (
    <div role="group" aria-label={etiqueta} className={`grid auto-cols-fr grid-flow-col gap-0.5 rounded-lg bg-linea/70 p-0.5 ${className}`}>
      {opciones.map((o) => (
        <button
          key={o.id}
          type="button"
          aria-pressed={valor === o.id}
          onClick={() => onChange(o.id)}
          className={`rounded-md px-2.5 py-1.5 text-[13px] font-medium transition-colors duration-150 ${valor === o.id ? 'bg-hoja text-tinta shadow-sm' : 'text-tinta-2 hover:text-tinta'}`}
        >
          {o.nombre}
        </button>
      ))}
    </div>
  )
}

export function Chip({ activo = false, className = '', children, ...resto }: ButtonHTMLAttributes<HTMLButtonElement> & { activo?: boolean }) {
  return (
    <button
      type="button"
      {...resto}
      className={`inline-flex shrink-0 items-center gap-1.5 rounded-full border px-3 py-1 text-[13px] font-medium transition-colors duration-150 disabled:opacity-45 ${activo ? 'border-tinta bg-tinta text-hoja' : 'border-linea-2 bg-hoja text-tinta-2 hover:border-tinta hover:text-tinta'} ${className}`}
    >
      {children}
    </button>
  )
}

/** Botón cuadrado de icono; siempre con etiqueta accesible y `title`. */
export function BotonIcono({ icono, etiqueta, className = '', ...resto }: ButtonHTMLAttributes<HTMLButtonElement> & { icono: NombreIcono; etiqueta: string }) {
  return (
    <button type="button" aria-label={etiqueta} title={etiqueta} {...resto}
      className={`grid size-8 shrink-0 place-items-center rounded-md text-tinta-2 transition-colors duration-150 hover:bg-linea/70 hover:text-tinta ${className}`}>
      <Icono n={icono} />
    </button>
  )
}

/** `true` en pantallas angostas (el panel pasa a ser una hoja inferior). */
export function useMovil(): boolean {
  const [movil, setMovil] = useState(() => window.matchMedia('(max-width: 767px)').matches)
  useEffect(() => {
    const mq = window.matchMedia('(max-width: 767px)')
    const f = () => setMovil(mq.matches)
    mq.addEventListener('change', f)
    return () => mq.removeEventListener('change', f)
  }, [])
  return movil
}
