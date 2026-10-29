import { useState, type ReactElement } from 'react'
import Cartera from './Cartera'
import Comisiones from './Comisiones'
import Configuracion from './Configuracion'
import Contratos from './Contratos'
import Gastos from './Gastos'
import Hoy from './Hoy'
import Liquidaciones from './Liquidaciones'
import Personas from './Personas'
import Reportes from './Reportes'

const SECCIONES: [string, string, () => ReactElement][] = [
  ['hoy', 'Hoy', () => <Hoy />],
  ['comisiones', 'Comisiones y facturas', () => <Comisiones />],
  ['contratos', 'Contratos y pagos', () => <Contratos />],
  ['cartera', 'Cartera', () => <Cartera />],
  ['gastos', 'Gastos', () => <Gastos />],
  ['liquidaciones', 'Cuentas del propietario', () => <Liquidaciones />],
  ['reportes', 'Reportes e impuestos', () => <Reportes />],
  ['personas', 'Personas', () => <Personas />],
  ['config', 'Configuración', () => <Configuracion />],
]

/** Contabilidad y administración (Fase 3): pantalla completa, solo administrador. */
export default function ContabilidadApp() {
  const [sec, setSec] = useState('hoy')
  const actual = SECCIONES.find(([k]) => k === sec) ?? SECCIONES[0]
  return (
    <div className="flex min-h-0 flex-1 flex-col bg-gray-50 md:flex-row">
      <nav className="flex shrink-0 gap-1 overflow-x-auto border-b bg-white p-2 md:w-52 md:flex-col md:border-b-0 md:border-r" aria-label="Secciones de contabilidad">
        {SECCIONES.map(([k, n]) => (
          <button key={k} type="button" aria-current={sec === k ? 'page' : undefined} onClick={() => setSec(k)}
            className={`whitespace-nowrap rounded-md px-3 py-2 text-left text-sm ${sec === k ? 'bg-emerald-700 font-semibold text-white' : 'text-gray-700 hover:bg-gray-100'}`}>{n}</button>
        ))}
      </nav>
      <main className="min-h-0 flex-1 overflow-y-auto p-4">
        <h1 className="mb-3 text-lg font-bold text-gray-900">{actual[1]}</h1>
        {actual[2]()}
      </main>
    </div>
  )
}
