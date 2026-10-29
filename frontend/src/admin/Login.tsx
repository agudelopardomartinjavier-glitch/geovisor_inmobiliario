import { useState } from 'react'
import { guardarToken, login } from './api'

export default function Login({ onOk }: { onOk: (usuario: string) => void }) {
  const [usuario, setUsuario] = useState('')
  const [clave, setClave] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [cargando, setCargando] = useState(false)

  return (
    <div className="flex h-full items-center justify-center bg-gray-100 p-4">
      <form
        className="w-full max-w-sm space-y-4 rounded-xl bg-white p-6 shadow-lg"
        onSubmit={async (e) => {
          e.preventDefault()
          setCargando(true); setError(null)
          try {
            const r = await login(usuario, clave)
            guardarToken(r.token)
            onOk(r.usuario)
          } catch (err) {
            setError((err as Error).message)
          } finally {
            setCargando(false); setClave('')
          }
        }}
      >
        <div>
          <h1 className="text-lg font-bold text-emerald-800">Administración</h1>
          <p className="text-xs text-gray-500">Geovisor inmobiliario – Acacías</p>
        </div>
        <label className="block text-sm">
          Usuario
          <input className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2" autoComplete="username" value={usuario} onChange={(e) => setUsuario(e.target.value)} required />
        </label>
        <label className="block text-sm">
          Clave
          <input className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2" type="password" autoComplete="current-password" value={clave} onChange={(e) => setClave(e.target.value)} required />
        </label>
        {error && <p role="alert" className="text-sm text-red-600">{error}</p>}
        <button type="submit" disabled={cargando} className="w-full rounded-md bg-emerald-700 py-2 font-medium text-white disabled:opacity-50">
          {cargando ? 'Ingresando…' : 'Ingresar'}
        </button>
      </form>
    </div>
  )
}
