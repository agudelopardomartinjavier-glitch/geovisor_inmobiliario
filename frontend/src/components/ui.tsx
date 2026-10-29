import type { ReactNode } from 'react'

export function Logo({ className = 'size-9' }: { className?: string }) {
  return (
    <svg viewBox="0 0 40 40" className={className} aria-hidden="true">
      <rect width="40" height="40" rx="10" fill="#fbbf24" />
      <path d="M20 7c-5.5 0-9.5 4.1-9.5 9.4 0 6.7 9.5 16.6 9.5 16.6s9.5-9.9 9.5-16.6C29.5 11.1 25.5 7 20 7Z" fill="#064e3b" />
      <path d="M14.6 17.2 20 12.6l5.4 4.6v6h-3.6v-3.6h-3.6v3.6h-3.6v-6Z" fill="#fbbf24" />
    </svg>
  )
}

export function Tarjeta({ titulo, derecha, children }: { titulo: string; derecha?: ReactNode; children: ReactNode }) {
  return (
    <section className="rounded-2xl border border-slate-200/80 bg-white p-3.5 shadow-sm">
      <div className="mb-2.5 flex items-center justify-between">
        <h2 className="text-[11px] font-bold uppercase tracking-[0.12em] text-slate-500">{titulo}</h2>
        {derecha}
      </div>
      {children}
    </section>
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
      className={`relative inline-flex h-4.5 w-8 shrink-0 items-center rounded-full transition-colors ${activo ? 'bg-emerald-600' : 'bg-slate-300'}`}
    >
      <span className={`inline-block size-3.5 rounded-full bg-white shadow transition-transform ${activo ? 'translate-x-4' : 'translate-x-0.5'}`} />
    </button>
  )
}
