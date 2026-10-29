import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { borrarLiquidacion, cerrarLiquidacion, fijarPropietario, girarLiquidacion, liquidaciones, vistaPreviaLiquidacion } from './api'
import type { Liquidacion } from './tipos'
import { Campo, Dato, Falla, Insignia, SelInmueble, SelPersona, Seccion, Tabla, bajar, boton, botonSec, cop, mesActual } from './ui'

function Resumen({ l }: { l: Liquidacion }) {
  const filas: [string, number, boolean][] = [['Cánones recibidos', l.canones_recibidos, false], ['(−) Comisión de administración', l.comision, true], ['(−) IVA de la comisión', l.iva_comision, true],
    ['(−) Administración (propiedad horizontal)', l.administracion, true], ['(−) Impuesto predial', l.predial, true], ['(−) Reparaciones y mantenimiento', l.reparaciones, true], ['(−) Otros gastos del propietario', l.otros, true]]
  return (
    <div className="space-y-3">
      <Tabla derecha={[1]} cab={['Concepto', 'Valor']} filas={[...filas.map(([n, v]) => [n, cop(v)]), [<b key="n">{l.saldo_a_girar >= 0 ? 'Saldo a girar al propietario' : 'Saldo a favor de la inmobiliaria'}</b>, <b key="v" className={l.saldo_a_girar < 0 ? 'text-red-700' : 'text-emerald-800'}>{cop(l.saldo_a_girar)}</b>]]} />
      {l.detalle.inmuebles.map((i) => (
        <details key={i.inmueble_id} className="rounded border border-gray-200 p-2 text-xs">
          <summary className="cursor-pointer font-medium">Inmueble #{i.inmueble_id}: cánones {cop(i.canones)} · comisión {cop(i.comision)} · {i.gastos.length} gasto(s)</summary>
          <div className="mt-2 grid gap-3 lg:grid-cols-2">
            <Tabla derecha={[2]} cab={['Recibo', 'Fecha', 'Valor']} filas={i.recaudos.map((r) => [r.recibo, r.fecha, cop(r.valor)])} vacio="Sin cánones recibidos." />
            <Tabla derecha={[3]} cab={['Fecha', 'Gasto', 'Categoría', 'Valor']} filas={i.gastos.map((g) => [g.fecha, g.descripcion, g.categoria, cop(g.valor)])} vacio="Sin gastos del propietario." />
          </div>
        </details>
      ))}
    </div>
  )
}

export default function Liquidaciones() {
  const qc = useQueryClient()
  const [prop, setProp] = useState('')
  const [periodo, setPeriodo] = useState(mesActual())
  const [asig, setAsig] = useState({ inmueble: '', persona: '' })
  const lista = useQuery({ queryKey: ['c', 'liquidaciones'], queryFn: liquidaciones })
  const vista = useMutation({ mutationFn: () => vistaPreviaLiquidacion(Number(prop), periodo) })
  const refrescar = () => void qc.invalidateQueries({ queryKey: ['c'] })
  const cerrar = useMutation({ mutationFn: () => cerrarLiquidacion(Number(prop), periodo), onSuccess: (l) => { vista.reset(); refrescar(); bajar(`/liquidaciones/${l.id}/pdf`, `liquidacion-${l.numero_completo}.pdf`, true) } })
  const girar = useMutation({ mutationFn: (id: number) => girarLiquidacion(id, window.prompt('Referencia del giro (transferencia, cheque…):') || null), onSuccess: refrescar })
  const borrar = useMutation({ mutationFn: (id: number) => borrarLiquidacion(id), onSuccess: refrescar })
  const asignar = useMutation({ mutationFn: () => fijarPropietario(Number(asig.inmueble), Number(asig.persona)), onSuccess: () => setAsig({ inmueble: '', persona: '' }) })

  return (
    <div className="space-y-4">
      <Seccion titulo="Propietario de cada inmueble">
        <form className="flex flex-wrap items-end gap-2" onSubmit={(e) => { e.preventDefault(); asignar.mutate() }}>
          <Campo etiqueta="Inmueble" className="w-60"><SelInmueble valor={asig.inmueble} onChange={(v) => setAsig({ ...asig, inmueble: v })} /></Campo>
          <Campo etiqueta="Propietario" className="w-64"><SelPersona valor={asig.persona} onChange={(v) => setAsig({ ...asig, persona: v })} /></Campo>
          <button type="submit" className={botonSec} disabled={!asig.inmueble || !asig.persona || asignar.isPending}>Asignar</button>
          {asignar.isSuccess && <span className="text-xs text-emerald-700">Asignado ✓</span>}
        </form>
        <Falla e={asignar.error} />
        <p className="text-[11px] text-gray-500">La cuenta del propietario suma los inmuebles que tenga asignados. Crea primero a la persona en «Personas».</p>
      </Seccion>

      <Seccion titulo="Cuenta del propietario · liquidación mensual">
        <form className="flex flex-wrap items-end gap-2" onSubmit={(e) => { e.preventDefault(); vista.mutate() }}>
          <Campo etiqueta="Propietario" className="w-72"><SelPersona valor={prop} onChange={(v) => { setProp(v); vista.reset() }} /></Campo>
          <Campo etiqueta="Mes"><input className="mt-1 rounded-md border border-gray-300 px-2 py-1.5 text-sm" type="month" value={periodo} onChange={(e) => { setPeriodo(e.target.value); vista.reset() }} /></Campo>
          <button type="submit" className={botonSec} disabled={!prop || vista.isPending}>Vista previa</button>
        </form>
        <Falla e={vista.error ?? cerrar.error} />
        {vista.data && (
          <>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3"><Dato titulo="Propietario" valor={vista.data.propietario} /><Dato titulo="Periodo" valor={vista.data.periodo} />
              <Dato titulo="Saldo" valor={cop(vista.data.saldo_a_girar)} tono={vista.data.saldo_a_girar < 0 ? 'rojo' : undefined} /></div>
            <Resumen l={vista.data} />
            {vista.data.liquidacion_existente
              ? <p className="rounded bg-amber-50 p-2 text-xs text-amber-900">Este mes ya está liquidado (liquidación #{vista.data.liquidacion_existente}). Bórrala abajo si debe rehacerse.</p>
              : <button type="button" className={boton} disabled={cerrar.isPending} onClick={() => { if (window.confirm('¿Cerrar la liquidación? Se le asigna un consecutivo y se protegen los gastos del mes.')) cerrar.mutate() }}>Cerrar liquidación y generar PDF</button>}
          </>
        )}
      </Seccion>

      <Seccion titulo={`Liquidaciones cerradas (${lista.data?.length ?? 0})`}>
        <Falla e={girar.error ?? borrar.error} />
        <Tabla derecha={[3]} cab={['N.º', 'Periodo', 'Propietario', 'Saldo a girar', 'Estado', '']}
          filas={(lista.data ?? []).map((l) => [l.numero_completo, l.periodo, l.propietario ?? `#${l.propietario_id}`, cop(l.saldo_a_girar),
            <Insignia key="e" texto={l.estado === 'girada' ? `girada ${l.fecha_giro ?? ''}` : 'cerrada'} tono={l.estado === 'girada' ? 'verde' : 'azul'} />,
            <span key="a" className="flex flex-wrap gap-1"><button type="button" className={botonSec} onClick={() => bajar(`/liquidaciones/${l.id}/pdf`, `liquidacion-${l.numero_completo}.pdf`, true)}>PDF</button>
              {l.estado === 'cerrada' && l.saldo_a_girar > 0 && <button type="button" className={botonSec} onClick={() => girar.mutate(l.id)}>Marcar girada</button>}
              {l.estado === 'cerrada' && <button type="button" className={botonSec} onClick={() => { if (window.confirm('¿Borrar la liquidación para rehacerla? El número no se reutiliza.')) borrar.mutate(l.id) }}>Borrar</button>}</span>])} />
      </Seccion>
    </div>
  )
}
