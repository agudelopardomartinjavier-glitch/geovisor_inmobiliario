import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { anularComision, calcularComision, cobrarComision, comisiones, crearComision, enviarDian, facturar, notaCredito } from './api'
import type { Comision, ComisionDatos, EstadoComision } from './tipos'
import { Campo, Dato, Falla, Insignia, SelInmueble, SelPersona, Seccion, Tabla, boton, botonSec, campo, cop, hoyISO, num, txt } from './ui'

const TONO: Record<EstadoComision, 'amarillo' | 'azul' | 'verde' | 'gris'> = { pendiente: 'amarillo', facturada: 'azul', cobrada: 'verde', anulada: 'gris' }
const DIAN: Record<string, 'gris' | 'azul' | 'verde' | 'rojo'> = { no_enviada: 'gris', enviada: 'azul', aceptada: 'verde', rechazada: 'rojo' }

interface Borrador {
  inmueble: string; tipo: 'venta' | 'arriendo'; pagador: string; pctProp: string; base: string; pct: string
  asesor: string; asesorPct: string; referido: string; referidoPct: string; iva: boolean; ret: boolean; fecha: string; nota: string
}
const vacio = (): Borrador => ({ inmueble: '', tipo: 'venta', pagador: 'propietario', pctProp: '', base: '', pct: '', asesor: '', asesorPct: '', referido: '', referidoPct: '', iva: true, ret: true, fecha: hoyISO(), nota: '' })
const datos = (b: Borrador): ComisionDatos => ({
  inmueble_id: Number(b.inmueble), tipo: b.tipo, pagador: b.pagador, base: num(b.base), pct_pactado: num(b.pct), pct_pagador_propietario: b.pagador === 'compartida' ? num(b.pctProp) : null,
  aplica_iva: b.iva, aplica_retenciones: b.ret, asesor: txt(b.asesor), asesor_pct: num(b.asesorPct), referido: txt(b.referido), referido_pct: num(b.referidoPct), fecha: txt(b.fecha), nota: txt(b.nota),
})

type Calculo = Pick<Comision, 'valor_comision' | 'iva' | 'total_facturable' | 'retefuente' | 'reteica' | 'reteiva' | 'neto_a_recibir' | 'asesor_valor' | 'referido_valor' | 'inmobiliaria_valor'>

function Resultado({ c }: { c: Calculo }) {
  return (
    <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
      <Dato titulo="Comisión" valor={cop(c.valor_comision)} />
      <Dato titulo="IVA" valor={cop(c.iva)} />
      <Dato titulo="Total a facturar" valor={cop(c.total_facturable)} />
      <Dato titulo="Neto a recibir" valor={cop(c.neto_a_recibir)} detalle={`Retenciones: ${cop(c.retefuente + c.reteica + c.reteiva)}`} />
      <Dato titulo="Asesor" valor={cop(c.asesor_valor)} />
      <Dato titulo="Referido" valor={cop(c.referido_valor)} />
      <Dato titulo="Inmobiliaria" valor={cop(c.inmobiliaria_valor)} />
    </div>
  )
}

export default function Comisiones() {
  const qc = useQueryClient()
  const [b, setB] = useState<Borrador>(vacio())
  const [filtro, setFiltro] = useState('')
  const [fact, setFact] = useState<{ id: number; cliente: string; pct: string } | null>(null)
  const lista = useQuery({ queryKey: ['c', 'comisiones', filtro], queryFn: () => comisiones(filtro) })
  const refrescar = () => void qc.invalidateQueries({ queryKey: ['c'] })
  const vista = useMutation({ mutationFn: () => calcularComision(datos(b)) })
  const crear = useMutation({ mutationFn: () => crearComision(datos(b)), onSuccess: () => { setB(vacio()); vista.reset(); refrescar() } })
  const accion = useMutation({ mutationFn: (f: () => Promise<unknown>) => f(), onSuccess: refrescar })
  const emitir = useMutation({ mutationFn: () => facturar(fact!.id, Number(fact!.cliente), num(fact!.pct)), onSuccess: () => { setFact(null); refrescar() } })
  const set = <K extends keyof Borrador>(k: K, v: Borrador[K]) => { setB({ ...b, [k]: v }); vista.reset() }

  return (
    <div className="space-y-4">
      <Seccion titulo="Nueva comisión">
        <form className="space-y-3" onSubmit={(e) => { e.preventDefault(); crear.mutate() }}>
          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
            <Campo etiqueta="Inmueble"><SelInmueble valor={b.inmueble} onChange={(v) => set('inmueble', v)} /></Campo>
            <Campo etiqueta="Tipo">
              <select className={campo} value={b.tipo} onChange={(e) => set('tipo', e.target.value as Borrador['tipo'])}><option value="venta">Venta</option><option value="arriendo">Arriendo</option></select>
            </Campo>
            <Campo etiqueta="Quién paga">
              <select className={campo} value={b.pagador} onChange={(e) => set('pagador', e.target.value)}>
                <option value="propietario">Propietario</option>
                {b.tipo === 'venta' ? <option value="comprador">Comprador</option> : <option value="arrendatario">Arrendatario</option>}
                <option value="compartida">Compartida</option>
              </select>
            </Campo>
            {b.pagador === 'compartida' && (
              <Campo etiqueta="% que paga el propietario"><input className={campo} type="number" min={0} max={100} required value={b.pctProp} onChange={(e) => set('pctProp', e.target.value)} /></Campo>
            )}
            <Campo etiqueta="Base (vacío = precio o canon)"><input className={campo} type="number" min={1} value={b.base} onChange={(e) => set('base', e.target.value)} /></Campo>
            <Campo etiqueta="% pactado (vacío = por defecto)"><input className={campo} type="number" step="any" min={0} value={b.pct} onChange={(e) => set('pct', e.target.value)} /></Campo>
            <Campo etiqueta="Fecha"><input className={campo} type="date" value={b.fecha} onChange={(e) => set('fecha', e.target.value)} /></Campo>
            <Campo etiqueta="Asesor"><input className={campo} value={b.asesor} onChange={(e) => set('asesor', e.target.value)} /></Campo>
            <Campo etiqueta="% del asesor"><input className={campo} type="number" min={0} max={100} value={b.asesorPct} onChange={(e) => set('asesorPct', e.target.value)} placeholder="Por defecto" /></Campo>
            <Campo etiqueta="Referido"><input className={campo} value={b.referido} onChange={(e) => set('referido', e.target.value)} /></Campo>
            <Campo etiqueta="% del referido"><input className={campo} type="number" min={0} max={100} value={b.referidoPct} onChange={(e) => set('referidoPct', e.target.value)} placeholder="Por defecto" /></Campo>
          </div>
          <div className="flex flex-wrap items-center gap-4 text-xs">
            <label className="flex items-center gap-1"><input type="checkbox" checked={b.iva} onChange={(e) => set('iva', e.target.checked)} />Lleva IVA</label>
            <label className="flex items-center gap-1"><input type="checkbox" checked={b.ret} onChange={(e) => set('ret', e.target.checked)} />Le practican retenciones</label>
          </div>
          {vista.data && <Resultado c={vista.data} />}
          <Falla e={vista.error ?? crear.error} />
          <div className="flex gap-2">
            <button type="button" className={botonSec} disabled={!b.inmueble || vista.isPending} onClick={() => vista.mutate()}>Calcular (vista previa)</button>
            <button type="submit" className={boton} disabled={!b.inmueble || crear.isPending}>Registrar comisión</button>
          </div>
        </form>
      </Seccion>

      <Seccion titulo={`Comisiones (${lista.data?.length ?? 0})`}
        derecha={
          <select className="rounded-md border border-gray-300 px-2 py-1 text-xs" value={filtro} onChange={(e) => setFiltro(e.target.value)}>
            <option value="">Todas</option>{['pendiente', 'facturada', 'cobrada', 'anulada'].map((s) => <option key={s}>{s}</option>)}
          </select>
        }>
        <Falla e={accion.error} />
        <Tabla derecha={[3, 5, 6]} cab={['Fecha', 'Inmueble', 'Tipo · quién paga', 'Base', '% / estado', 'Comisión', 'Total', 'Documentos', 'Acciones']}
          filas={(lista.data ?? []).map((c) => [
            c.fecha, `#${c.inmueble_id}`, `${c.tipo} · ${c.pagador}`, cop(c.base),
            <span key="e">{c.pct_pactado} % <Insignia texto={c.estado} tono={TONO[c.estado]} /></span>, cop(c.valor_comision), cop(c.total_facturable),
            <ul key="f" className="space-y-0.5">
              {c.facturas.map((f) => (
                <li key={f.id} className="flex flex-wrap items-center gap-1">
                  <span>{f.prefijo}{f.numero}</span><span className="text-gray-500">{cop(f.total)}</span><Insignia texto={`DIAN: ${f.dian_estado}`} tono={DIAN[f.dian_estado] ?? 'gris'} />
                  {f.dian_estado !== 'aceptada' && <button type="button" className={botonSec} onClick={() => accion.mutate(() => enviarDian(f.id))}>Enviar</button>}
                  {f.tipo === 'factura' && (
                    <button type="button" className={botonSec} onClick={() => { const m = window.prompt('Motivo de la nota crédito (se acredita todo el saldo):'); if (m && m.trim().length >= 3) accion.mutate(() => notaCredito(f.id, m.trim(), null)) }}>Nota crédito</button>
                  )}
                </li>
              ))}
              {c.facturas.length === 0 && <li className="text-gray-400">—</li>}
            </ul>,
            <span key="a" className="flex flex-wrap gap-1">
              {(c.estado === 'pendiente' || (c.estado === 'facturada' && c.facturado_pct < 100)) && <button type="button" className={botonSec} onClick={() => setFact({ id: c.id, cliente: '', pct: '' })}>Facturar</button>}
              {c.estado === 'facturada' && <button type="button" className={botonSec} onClick={() => accion.mutate(() => cobrarComision(c.id, null))}>Marcar cobrada</button>}
              {c.estado === 'pendiente' && c.facturas.length === 0 && <button type="button" className={botonSec} onClick={() => { if (window.confirm('¿Anular la comisión?')) accion.mutate(() => anularComision(c.id)) }}>Anular</button>}
            </span>,
          ])} />
        {fact && (
          <form className="flex flex-wrap items-end gap-2 rounded-lg border border-emerald-200 bg-emerald-50 p-3" onSubmit={(e) => { e.preventDefault(); emitir.mutate() }}>
            <span className="text-xs font-semibold">Facturar comisión #{fact.id}</span>
            <Campo etiqueta="Cliente" className="w-64"><SelPersona valor={fact.cliente} onChange={(v) => setFact({ ...fact, cliente: v })} /></Campo>
            <Campo etiqueta="% de la comisión (vacío = lo que falta)"><input className={`${campo} w-40`} type="number" min={1} max={100} step="any" value={fact.pct} onChange={(e) => setFact({ ...fact, pct: e.target.value })} /></Campo>
            <button type="submit" className={boton} disabled={!fact.cliente || emitir.isPending}>Emitir factura</button>
            <button type="button" className={botonSec} onClick={() => setFact(null)}>Cancelar</button>
            <div className="basis-full"><Falla e={emitir.error} />{emitir.data?.aviso && <p className="text-xs text-amber-800">{emitir.data.aviso}</p>}</div>
          </form>
        )}
        <p className="text-[11px] text-gray-500">Las facturas no se editan: se corrigen con nota crédito. El envío a la DIAN usa el proveedor configurado en <code>.env</code> (por defecto ninguno: la factura queda solo en el sistema).</p>
      </Seccion>
    </div>
  )
}
