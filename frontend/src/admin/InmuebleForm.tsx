import { useState } from 'react'
import type { Operacion, Tipo } from '../lib/types'
import type { Estado, InmuebleAdmin, InmuebleForm as Datos } from './tipos'

const TIPOS: Tipo[] = ['casa', 'lote', 'finca', 'local', 'apartamento']

export interface Borrador {
  tipo: Tipo; operacion: Operacion; estado: Estado
  numero_predial: string; lon: string; lat: string
  precio: string; area_terreno: string; area_construida: string; habitaciones: string; banos: string
  descripcion: string; fotos: string; contacto: string
  propietario: string; avaluo: string; notas_internas: string
}

export const borradorVacio = (): Borrador => ({
  tipo: 'casa', operacion: 'venta', estado: 'borrador', numero_predial: '', lon: '', lat: '',
  precio: '', area_terreno: '', area_construida: '', habitaciones: '', banos: '',
  descripcion: '', fotos: '', contacto: '', propietario: '', avaluo: '', notas_internas: '',
})

export const desdeInmueble = (i: InmuebleAdmin): Borrador => ({
  tipo: i.tipo, operacion: i.operacion, estado: i.estado_publicacion, numero_predial: i.numero_predial ?? '',
  lon: i.lon?.toString() ?? '', lat: i.lat?.toString() ?? '',
  precio: i.precio?.toString() ?? '', area_terreno: i.area_terreno?.toString() ?? '', area_construida: i.area_construida?.toString() ?? '',
  habitaciones: i.habitaciones?.toString() ?? '', banos: i.banos?.toString() ?? '',
  descripcion: i.descripcion ?? '', fotos: i.fotos.join('\n'), contacto: i.contacto ?? '',
  propietario: i.propietario ?? '', avaluo: i.avaluo?.toString() ?? '', notas_internas: i.notas_internas ?? '',
})

const num = (s: string) => (s.trim() === '' ? null : Number(s))
const txt = (s: string) => (s.trim() === '' ? null : s.trim())

export const aDatos = (b: Borrador): Datos => ({
  tipo: b.tipo, operacion: b.operacion, estado_publicacion: b.estado,
  numero_predial: txt(b.numero_predial), lon: num(b.lon), lat: num(b.lat),
  precio: num(b.precio), area_terreno: num(b.area_terreno), area_construida: num(b.area_construida),
  habitaciones: num(b.habitaciones), banos: num(b.banos),
  descripcion: txt(b.descripcion), fotos: b.fotos.split('\n').map((s) => s.trim()).filter(Boolean), contacto: txt(b.contacto),
  propietario: txt(b.propietario), avaluo: num(b.avaluo), notas_internas: txt(b.notas_internas),
})

const campo = 'mt-1 w-full rounded-md border border-gray-300 px-2 py-1.5 text-sm focus:border-emerald-600 focus:outline-none'

interface Props {
  id: number | null
  valor: Borrador
  onChange: (b: Borrador) => void
  onGuardar: () => Promise<void>
  onCancelar: () => void
  onEliminar?: () => Promise<void>
  error: string | null
}

export default function InmuebleForm({ id, valor, onChange, onGuardar, onCancelar, onEliminar, error }: Props) {
  const [ocupado, setOcupado] = useState(false)
  const set = <K extends keyof Borrador>(k: K, v: Borrador[K]) => onChange({ ...valor, [k]: v })
  const envolver = (f: () => Promise<void>) => async () => { setOcupado(true); try { await f() } finally { setOcupado(false) } }

  return (
    <form className="space-y-3 text-sm" onSubmit={(e) => { e.preventDefault(); void envolver(onGuardar)() }}>
      <h2 className="text-base font-bold">{id ? `Editar inmueble #${id}` : 'Nuevo inmueble'}</h2>
      <p className="rounded bg-emerald-50 p-2 text-xs text-emerald-900">
        Haz clic en el mapa para ubicar el inmueble; si pulsas sobre un predio se llena también el número predial.
      </p>

      <div className="grid grid-cols-2 gap-2">
        <label>Tipo
          <select className={campo} value={valor.tipo} onChange={(e) => set('tipo', e.target.value as Tipo)}>{TIPOS.map((t) => <option key={t}>{t}</option>)}</select>
        </label>
        <label>Operación
          <select className={campo} value={valor.operacion} onChange={(e) => set('operacion', e.target.value as Operacion)}><option>venta</option><option>arriendo</option></select>
        </label>
        <label className="col-span-2">Estado de publicación
          <select className={campo} value={valor.estado} onChange={(e) => set('estado', e.target.value as Estado)}><option>borrador</option><option>publicado</option><option>vendido</option></select>
        </label>
      </div>

      <label className="block">Número predial
        <input className={`${campo} font-mono text-xs`} inputMode="numeric" value={valor.numero_predial} onChange={(e) => set('numero_predial', e.target.value.replace(/\D/g, ''))} />
      </label>
      <div className="grid grid-cols-2 gap-2">
        <label>Longitud<input className={campo} type="number" step="any" value={valor.lon} onChange={(e) => set('lon', e.target.value)} /></label>
        <label>Latitud<input className={campo} type="number" step="any" value={valor.lat} onChange={(e) => set('lat', e.target.value)} /></label>
        <label>Precio (COP)<input className={campo} type="number" min={0} value={valor.precio} onChange={(e) => set('precio', e.target.value)} /></label>
        <label>Área terreno (m²)<input className={campo} type="number" min={0} step="any" value={valor.area_terreno} onChange={(e) => set('area_terreno', e.target.value)} /></label>
        <label>Área construida (m²)<input className={campo} type="number" min={0} step="any" value={valor.area_construida} onChange={(e) => set('area_construida', e.target.value)} /></label>
        <label>Habitaciones<input className={campo} type="number" min={0} value={valor.habitaciones} onChange={(e) => set('habitaciones', e.target.value)} /></label>
        <label>Baños<input className={campo} type="number" min={0} value={valor.banos} onChange={(e) => set('banos', e.target.value)} /></label>
        <label>Contacto<input className={campo} value={valor.contacto} onChange={(e) => set('contacto', e.target.value)} /></label>
      </div>
      <label className="block">Descripción pública
        <textarea className={campo} rows={3} value={valor.descripcion} onChange={(e) => set('descripcion', e.target.value)} />
      </label>
      <label className="block">Fotos (una URL por línea)
        <textarea className={`${campo} font-mono text-xs`} rows={2} value={valor.fotos} onChange={(e) => set('fotos', e.target.value)} />
      </label>

      <fieldset className="space-y-2 rounded-md border-2 border-dashed border-amber-400 bg-amber-50 p-3">
        <legend className="px-1 text-xs font-bold uppercase text-amber-800">Privado · nunca se publica</legend>
        <label className="block">Propietario<input className={campo} value={valor.propietario} onChange={(e) => set('propietario', e.target.value)} /></label>
        <label className="block">Avalúo (COP)<input className={campo} type="number" min={0} value={valor.avaluo} onChange={(e) => set('avaluo', e.target.value)} /></label>
        <label className="block">Notas internas<textarea className={campo} rows={3} value={valor.notas_internas} onChange={(e) => set('notas_internas', e.target.value)} /></label>
      </fieldset>

      {error && <p role="alert" className="rounded bg-red-50 p-2 text-sm text-red-700">{error}</p>}

      <div className="flex flex-wrap gap-2 pb-4">
        <button type="submit" disabled={ocupado} className="rounded-md bg-emerald-700 px-4 py-2 font-medium text-white disabled:opacity-50">{ocupado ? 'Guardando…' : 'Guardar'}</button>
        <button type="button" onClick={onCancelar} className="rounded-md border border-gray-300 px-4 py-2">Cancelar</button>
        {id && onEliminar && (
          <button
            type="button"
            disabled={ocupado}
            onClick={() => { if (window.confirm(`¿Eliminar definitivamente el inmueble #${id}? No se puede deshacer.`)) void envolver(onEliminar)() }}
            className="ml-auto rounded-md border border-red-300 px-3 py-2 text-red-700"
          >
            Eliminar
          </button>
        )}
      </div>
    </form>
  )
}
