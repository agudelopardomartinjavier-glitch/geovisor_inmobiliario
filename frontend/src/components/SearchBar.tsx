import { useState } from 'react'

interface Props {
  buscando: boolean
  error: string | null
  onBuscar: (numeroPredial: string) => void
}

export default function SearchBar({ buscando, error, onBuscar }: Props) {
  const [valor, setValor] = useState('')
  const limpio = valor.replace(/\D/g, '')

  return (
    <form
      className="space-y-1.5"
      onSubmit={(e) => {
        e.preventDefault()
        if (limpio.length >= 5) onBuscar(limpio)
      }}
    >
      <div className="flex gap-2">
        <label className="relative min-w-0 flex-1">
          <span className="sr-only">Número predial</span>
          <svg className="pointer-events-none absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-slate-400" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            <circle cx="9" cy="9" r="5.5" /><path d="m13.5 13.5 3.5 3.5" />
          </svg>
          <input
            inputMode="numeric"
            value={valor}
            onChange={(e) => setValor(e.target.value)}
            placeholder="Número predial (30 dígitos)"
            className="w-full rounded-xl border border-slate-200 bg-slate-50 py-2 pl-8 pr-2 font-mono text-xs placeholder:font-sans placeholder:text-slate-400 focus:border-emerald-500 focus:bg-white focus:outline-none"
          />
        </label>
        <button
          type="submit"
          disabled={limpio.length < 5 || buscando}
          className="rounded-xl bg-emerald-700 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-emerald-800 disabled:opacity-40"
        >
          {buscando ? '…' : 'Ir'}
        </button>
      </div>
      {error && <p role="alert" className="text-xs text-red-600">{error}</p>}
    </form>
  )
}
