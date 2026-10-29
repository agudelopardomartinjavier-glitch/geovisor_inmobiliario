import { useState } from 'react'
import type { Tipo } from '../lib/types'
import type { Comparable, ComparableDatos, OperacionComp } from './tipos'

const TIPOS: Tipo[] = ['casa', 'lote', 'finca', 'local', 'apartamento']

export interface BorradorComp {
  tipo: Tipo; operacion: OperacionComp; precio: string; area_terreno: string; area_construida: string
  fecha: string; fuente: string; referencia: string; contacto: string; descripcion: string
  numero_predial: string; sector: string; lon: string; lat: string
}

export const compVacio = (tipo: Tipo = 'lote'): BorradorComp => ({
  tipo, operacion: 'oferta', precio: '', area_terreno: '', area_construida: '', fecha: new Date().toISOString().slice(0, 10),
  fuente: '', referencia: '', contacto: '', descripcion: '', numero_predial: '', sector: '', lon: '', lat: '',
})

export const compDesde = (c: Comparable): BorradorComp => ({
  tipo: c.tipo, operacion: c.operacion, precio: String(c.precio), area_terreno: c.area_terreno?.toString() ?? '', area_construida: c.area_construida?.toString() ?? '',
  fecha: c.fecha ?? '', fuente: c.fuente ?? '', referencia: c.referencia ?? '', contacto: c.contacto ?? '', descripcion: c.descripcion ?? '',
  numero_predial: c.numero_predial ?? '', sector: c.sector ?? '', lon: c.lon?.toString() ?? '', lat: c.lat?.toString() ?? '',
})

const n = (s: string) => (s.trim() === '' ? null : Number(s))
const t = (s: string) => (s.trim() === '' ? null : s.trim())

export const compADatos = (b: BorradorComp): ComparableDatos => ({
  tipo: b.tipo, operacion: b.operacion, precio: Number(b.precio), area_terreno: n(b.area_terreno), area_construida: n(b.area_construida),
  fecha: t(b.fecha), fuente: t(b.fuente), referencia: t(b.referencia), contacto: t(b.contacto), descripcion: t(b.descripcion),
  numero_predial: t(b.numero_predial), sector: t(b.sector), lon: n(b.lon), lat: n(b.lat),
})

const campo = 'mt-1 w-full rounded-md border border-gray-300 px-2 py-1.5 text-sm focus:border-violet-600 focus:outline-none'

interface Props {
  id: number | null
  valor: BorradorComp
  onChange: (b: BorradorComp) => void
  onGuardar: () => Promise<void>
  onCancelar: () => void
  onEliminar?: () => Promise<void>
  error: string | null
}

export default function ComparableForm({ id, valor, onChange, onGuardar, onCancelar, onEliminar, error }: Props) {
  const [ocupado, setOcupado] = useState(false)
  const set = <K extends keyof BorradorComp>(k: K, v: BorradorComp[K]) => onChange({ ...valor, [k]: v })
  const envolver = (f: () => Promise<void>) => async () => { setOcupado(true); try { await f() } finally { setOcupado(false) } }
  const p = Number(valor.precio), at = Number(valor.area_terreno), ac = Number(valor.area_construida)

  return (
    <form className="space-y-3 text-sm" onSubmit={(e) => { e.preventDefault(); void envolver(onGuardar)() }}>
      <h2 className="text-base font-bold">{id ? `Editar comparable #${id}` : 'Nuevo comparable'}</h2>
      <p className="rounded bg-violet-50 p-2 text-xs text-violet-900">Haz clic en el mapa para ubicarlo; si pulsas un predio se llena el número predial.</p>
      <div className="grid grid-cols-2 gap-2">
        <label>Tipo<select className={campo} value={valor.tipo} onChange={(e) => set('tipo', e.target.value as Tipo)}>{TIPOS.map((x) => <option key={x}>{x}</option>)}</select></label>
        <label>Clase de dato<select className={campo} value={valor.operacion} onChange={(e) => set('operacion', e.target.value as OperacionComp)}><option value="oferta">Oferta de mercado</option><option value="venta">Venta cerrada</option></select></label>
        <label>Precio (COP)<input className={campo} type="number" min={1} required value={valor.precio} onChange={(e) => set('precio', e.target.value)} /></label>
        <label>Fecha<input className={campo} type="date" value={valor.fecha} onChange={(e) => set('fecha', e.target.value)} /></label>
        <label>Área terreno (m²)<input className={campo} type="number" min={0} step="any" value={valor.area_terreno} onChange={(e) => set('area_terreno', e.target.value)} /></label>
        <label>Área construida (m²)<input className={campo} type="number" min={0} step="any" value={valor.area_construida} onChange={(e) => set('area_construida', e.target.value)} /></label>
      </div>
      {p > 0 && (at > 0 || ac > 0) && (
        <p className="text-xs text-gray-600">
          {at > 0 && <>Unitario terreno: <b>{Math.round(p / at).toLocaleString('es-CO')}</b> $/m² · </>}
          {ac > 0 && <>Unitario construido: <b>{Math.round(p / ac).toLocaleString('es-CO')}</b> $/m²</>}
        </p>
      )}
      <label className="block">Sector (barrio o vereda)<input className={campo} value={valor.sector} onChange={(e) => set('sector', e.target.value)} /></label>
      <label className="block">Número predial (opcional)<input className={`${campo} font-mono text-xs`} inputMode="numeric" value={valor.numero_predial} onChange={(e) => set('numero_predial', e.target.value.replace(/\D/g, ''))} /></label>
      <div className="grid grid-cols-2 gap-2">
        <label>Longitud<input className={campo} type="number" step="any" value={valor.lon} onChange={(e) => set('lon', e.target.value)} /></label>
        <label>Latitud<input className={campo} type="number" step="any" value={valor.lat} onChange={(e) => set('lat', e.target.value)} /></label>
        <label>Fuente<input className={campo} placeholder="Portal, escritura, corredor…" value={valor.fuente} onChange={(e) => set('fuente', e.target.value)} /></label>
        <label>Contacto de la fuente<input className={campo} value={valor.contacto} onChange={(e) => set('contacto', e.target.value)} /></label>
      </div>
      <label className="block">Referencia (enlace o N.º de documento)<input className={campo} value={valor.referencia} onChange={(e) => set('referencia', e.target.value)} /></label>
      <label className="block">Descripción<textarea className={campo} rows={3} value={valor.descripcion} onChange={(e) => set('descripcion', e.target.value)} /></label>
      {error && <p role="alert" className="rounded bg-red-50 p-2 text-sm text-red-700">{error}</p>}
      <div className="flex flex-wrap gap-2 pb-4">
        <button type="submit" disabled={ocupado} className="rounded-md bg-violet-700 px-4 py-2 font-medium text-white disabled:opacity-50">{ocupado ? 'Guardando…' : 'Guardar'}</button>
        <button type="button" onClick={onCancelar} className="rounded-md border border-gray-300 px-4 py-2">Cancelar</button>
        {id && onEliminar && (
          <button type="button" disabled={ocupado} onClick={() => { if (window.confirm(`¿Eliminar el comparable #${id}? También se quitará de los inmuebles que lo usan.`)) void envolver(onEliminar)() }} className="ml-auto rounded-md border border-red-300 px-3 py-2 text-red-700">Eliminar</button>
        )}
      </div>
    </form>
  )
}
