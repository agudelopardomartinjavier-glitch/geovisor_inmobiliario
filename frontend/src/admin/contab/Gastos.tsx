import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { borrarGasto, crearGasto, gastos, soporteGasto } from './api'
import { Campo, Falla, Insignia, SelInmueble, Seccion, Tabla, bajar, boton, botonSec, campo, cop, hoyISO, txt } from './ui'

const CATEGORIAS: [string, string][] = [['mantenimiento', 'Mantenimiento / reparaciones'], ['impuesto', 'Impuesto'], ['servicio', 'Servicio público'], ['seguro', 'Seguro'], ['administracion_ph', 'Administración (propiedad horizontal)'], ['otro', 'Otro']]

export default function Gastos() {
  const qc = useQueryClient()
  const [filtro, setFiltro] = useState('')
  const [f, setF] = useState({ inmueble: '', fecha: hoyISO(), categoria: 'mantenimiento', subtipo: '', descripcion: '', valor: '', aCargo: 'propietario', proveedor: '', estado: 'pagado' })
  const [archivo, setArchivo] = useState<File | null>(null)
  const lista = useQuery({ queryKey: ['c', 'gastos', filtro], queryFn: () => gastos(filtro ? Number(filtro) : null) })
  const refrescar = () => void qc.invalidateQueries({ queryKey: ['c', 'gastos'] })
  const crear = useMutation({
    mutationFn: async () => {
      const g = await crearGasto({ inmueble_id: Number(f.inmueble), fecha: f.fecha, categoria: f.categoria, subtipo: txt(f.subtipo), descripcion: f.descripcion, valor: Number(f.valor), a_cargo_de: f.aCargo, proveedor: txt(f.proveedor), estado_pago: f.estado })
      if (archivo) await soporteGasto(g.id, archivo)
      return g
    },
    onSuccess: () => { setF({ ...f, descripcion: '', valor: '', subtipo: '', proveedor: '' }); setArchivo(null); refrescar() },
  })
  const borrar = useMutation({ mutationFn: (id: number) => borrarGasto(id), onSuccess: refrescar })
  const adjuntar = useMutation({ mutationFn: (v: { id: number; f: File }) => soporteGasto(v.id, v.f), onSuccess: refrescar })
  const set = (k: keyof typeof f, v: string) => setF({ ...f, [k]: v })

  return (
    <div className="space-y-4">
      <Seccion titulo="Nuevo gasto">
        <form className="space-y-2" onSubmit={(e) => { e.preventDefault(); crear.mutate() }}>
          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
            <Campo etiqueta="Inmueble"><SelInmueble valor={f.inmueble} onChange={(v) => set('inmueble', v)} /></Campo>
            <Campo etiqueta="Fecha"><input className={campo} type="date" required value={f.fecha} onChange={(e) => set('fecha', e.target.value)} /></Campo>
            <Campo etiqueta="Categoría"><select className={campo} value={f.categoria} onChange={(e) => set('categoria', e.target.value)}>{CATEGORIAS.map(([k, n]) => <option key={k} value={k}>{n}</option>)}</select></Campo>
            <Campo etiqueta="Subtipo (p. ej. «predial»)"><input className={campo} value={f.subtipo} onChange={(e) => set('subtipo', e.target.value)} placeholder={f.categoria === 'impuesto' ? 'predial' : ''} /></Campo>
            <Campo etiqueta="Descripción" className="sm:col-span-2"><input className={campo} required minLength={2} value={f.descripcion} onChange={(e) => set('descripcion', e.target.value)} /></Campo>
            <Campo etiqueta="Valor (COP)"><input className={campo} type="number" min={1} required value={f.valor} onChange={(e) => set('valor', e.target.value)} /></Campo>
            <Campo etiqueta="A cargo de"><select className={campo} value={f.aCargo} onChange={(e) => set('aCargo', e.target.value)}><option value="propietario">Propietario</option><option value="inmobiliaria">Inmobiliaria</option><option value="arrendatario">Arrendatario</option></select></Campo>
            <Campo etiqueta="Proveedor"><input className={campo} value={f.proveedor} onChange={(e) => set('proveedor', e.target.value)} /></Campo>
            <Campo etiqueta="Estado"><select className={campo} value={f.estado} onChange={(e) => set('estado', e.target.value)}><option value="pagado">Pagado</option><option value="pendiente">Pendiente</option></select></Campo>
            <Campo etiqueta="Soporte (PDF o imagen)"><input className="mt-1 block w-full text-xs" type="file" accept="application/pdf,image/jpeg,image/png,image/webp" onChange={(e) => setArchivo(e.target.files?.[0] ?? null)} /></Campo>
          </div>
          <p className="text-[11px] text-gray-500">Solo los gastos <b>a cargo del propietario</b> se descuentan en su cuenta mensual: administración PH, predial y reparaciones tienen línea propia.</p>
          <Falla e={crear.error} />
          <button type="submit" className={boton} disabled={crear.isPending || !f.inmueble}>Registrar gasto</button>
        </form>
      </Seccion>
      <Seccion titulo={`Gastos (${lista.data?.length ?? 0})`} derecha={<div className="w-56"><SelInmueble valor={filtro} onChange={setFiltro} vacio="Todos los inmuebles" /></div>}>
        <Falla e={borrar.error ?? adjuntar.error} />
        <Tabla derecha={[5]} cab={['Fecha', 'Inmueble', 'Categoría', 'Descripción', 'A cargo de', 'Valor', 'Soporte', '']}
          filas={(lista.data ?? []).map((g) => [g.fecha, `#${g.inmueble_id}`, g.subtipo ? `${g.categoria} · ${g.subtipo}` : g.categoria, g.descripcion, <Insignia key="c" texto={g.a_cargo_de} tono={g.a_cargo_de === 'propietario' ? 'azul' : 'gris'} />, cop(g.valor),
            g.tiene_soporte ? <button key="s" type="button" className={botonSec} onClick={() => bajar(`/gastos/${g.id}/soporte`, g.soporte_nombre ?? `gasto-${g.id}`)}>Descargar</button>
              : <label key="s" className="cursor-pointer text-[11px] text-emerald-800 underline">Adjuntar<input type="file" className="hidden" accept="application/pdf,image/jpeg,image/png,image/webp" onChange={(e) => { const a = e.target.files?.[0]; if (a) adjuntar.mutate({ id: g.id, f: a }) }} /></label>,
            <button key="b" type="button" className={botonSec} onClick={() => { if (window.confirm('¿Borrar este gasto?')) borrar.mutate(g.id) }}>Borrar</button>])} />
      </Seccion>
    </div>
  )
}
