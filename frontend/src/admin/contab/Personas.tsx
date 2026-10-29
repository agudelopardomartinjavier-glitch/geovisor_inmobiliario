import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useDebounce } from '../../lib/useDebounce'
import { borrarPersona, crearPersona, editarPersona, personas } from './api'
import type { Persona, PersonaDatos } from './tipos'
import { Campo, Falla, Seccion, Tabla, boton, botonSec, campo, txt } from './ui'

const vacia = (): PersonaDatos => ({ tipo_persona: 'natural', nombre: '', documento_tipo: 'CC', documento: '', email: null, telefono: null, direccion: null })

export default function Personas() {
  const qc = useQueryClient()
  const [q, setQ] = useState('')
  const qd = useDebounce(q)
  const [id, setId] = useState<number | null>(null)
  const [f, setF] = useState<PersonaDatos>(vacia())
  const lista = useQuery({ queryKey: ['c', 'personas', qd], queryFn: () => personas(qd) })
  const listo = () => { setId(null); setF(vacia()); void qc.invalidateQueries({ queryKey: ['c', 'personas'] }) }
  const guardar = useMutation({ mutationFn: () => (id ? editarPersona(id, f) : crearPersona(f)), onSuccess: listo })
  const borrar = useMutation({ mutationFn: (i: number) => borrarPersona(i), onSuccess: listo })
  const set = <K extends keyof PersonaDatos>(k: K, v: PersonaDatos[K]) => setF({ ...f, [k]: v })
  const editar = (p: Persona) => { setId(p.id); setF({ tipo_persona: p.tipo_persona, nombre: p.nombre, documento_tipo: p.documento_tipo, documento: p.documento, email: p.email, telefono: p.telefono, direccion: p.direccion }) }

  return (
    <div className="grid gap-4 lg:grid-cols-[1fr_22rem]">
      <Seccion titulo={`Personas (${lista.data?.length ?? 0})`} derecha={<input className="w-56 rounded-md border border-gray-300 px-2 py-1 text-xs" placeholder="Buscar nombre o documento" value={q} onChange={(e) => setQ(e.target.value)} />}>
        <p className="text-[11px] text-gray-500">Propietarios, arrendatarios, codeudores y clientes de facturas. Son datos personales: solo los ve el administrador.</p>
        <Tabla cab={['Nombre', 'Documento', 'Teléfono', 'Correo', '']}
          filas={(lista.data ?? []).map((p) => [p.nombre, `${p.documento_tipo} ${p.documento}`, p.telefono ?? '—', p.email ?? '—',
            <span key={p.id} className="flex gap-1"><button type="button" className={botonSec} onClick={() => editar(p)}>Editar</button>
              <button type="button" className={botonSec} onClick={() => { if (window.confirm(`¿Borrar a ${p.nombre}?`)) borrar.mutate(p.id) }}>Borrar</button></span>])} />
        <Falla e={borrar.error} />
      </Seccion>
      <Seccion titulo={id ? `Editar persona #${id}` : 'Nueva persona'}>
        <form className="space-y-2" onSubmit={(e) => { e.preventDefault(); guardar.mutate() }}>
          <div className="grid grid-cols-2 gap-2">
            <Campo etiqueta="Tipo"><select className={campo} value={f.tipo_persona} onChange={(e) => set('tipo_persona', e.target.value as PersonaDatos['tipo_persona'])}><option value="natural">Natural</option><option value="juridica">Jurídica</option></select></Campo>
            <Campo etiqueta="Documento"><select className={campo} value={f.documento_tipo} onChange={(e) => set('documento_tipo', e.target.value)}>{['CC', 'CE', 'NIT', 'PA', 'TI', 'otro'].map((d) => <option key={d}>{d}</option>)}</select></Campo>
          </div>
          <Campo etiqueta="Nombre o razón social"><input className={campo} required value={f.nombre} onChange={(e) => set('nombre', e.target.value)} /></Campo>
          <Campo etiqueta="N.º de documento"><input className={campo} required value={f.documento} onChange={(e) => set('documento', e.target.value)} /></Campo>
          <Campo etiqueta="Correo"><input className={campo} type="email" value={f.email ?? ''} onChange={(e) => set('email', txt(e.target.value))} /></Campo>
          <Campo etiqueta="Teléfono"><input className={campo} value={f.telefono ?? ''} onChange={(e) => set('telefono', txt(e.target.value))} /></Campo>
          <Campo etiqueta="Dirección"><input className={campo} value={f.direccion ?? ''} onChange={(e) => set('direccion', txt(e.target.value))} /></Campo>
          <Falla e={guardar.error} />
          <div className="flex gap-2"><button type="submit" disabled={guardar.isPending} className={boton}>{id ? 'Guardar cambios' : 'Crear persona'}</button>
            {id && <button type="button" className={botonSec} onClick={() => { setId(null); setF(vacia()) }}>Cancelar</button>}</div>
        </form>
      </Seccion>
    </div>
  )
}
