import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { anularRecibo, cobrosDe, contratos, crearContrato, crearRecibo, generarCobros, pazYSalvo, recibosDe, terminarContrato } from './api'
import type { Contrato } from './tipos'
import { Campo, Falla, Insignia, SelInmueble, SelPersona, Seccion, Tabla, bajar, boton, botonSec, campo, cop, hoyISO, mesActual, num, txt } from './ui'

const MEDIOS = ['efectivo', 'transferencia', 'consignacion', 'pse', 'cheque', 'otro']

function Detalle({ k, onCambio }: { k: Contrato; onCambio: () => void }) {
  const qc = useQueryClient()
  const cobros = useQuery({ queryKey: ['c', 'cobros', k.id], queryFn: () => cobrosDe(k.id) })
  const recibos = useQuery({ queryKey: ['c', 'recibos', k.id], queryFn: () => recibosDe(k.id) })
  const [pago, setPago] = useState({ valor: '', fecha: hoyISO(), medio: 'efectivo', referencia: '' })
  const refrescar = () => { void qc.invalidateQueries({ queryKey: ['c'] }); onCambio() }
  const pagar = useMutation({
    mutationFn: () => crearRecibo({ valor: Number(pago.valor), fecha: txt(pago.fecha), medio: pago.medio, referencia: txt(pago.referencia), contrato_id: k.id }),
    onSuccess: () => { setPago({ ...pago, valor: '', referencia: '' }); refrescar() },
  })
  const anular = useMutation({ mutationFn: (id: number) => anularRecibo(id), onSuccess: refrescar })
  const paz = useMutation({
    mutationFn: () => pazYSalvo(k.id, null),
    onSuccess: (r) => { refrescar(); bajar(`/paz-y-salvos/${r.id}/pdf`, `paz-y-salvo-${r.numero_completo}.pdf`, true) },
  })
  const total = (cobros.data ?? []).reduce((s, c) => s + c.saldo, 0)

  return (
    <div className="mt-3 grid gap-4 border-t pt-3 lg:grid-cols-2">
      <div className="space-y-2">
        <h4 className="text-xs font-bold">Cobros del contrato</h4>
        <Tabla derecha={[3, 4, 5]} cab={['Periodo', 'Concepto', 'Vence', 'Valor', 'Pagado', 'Saldo']}
          filas={(cobros.data ?? []).map((c) => [c.periodo, c.concepto, c.fecha_vencimiento, cop(c.valor), cop(c.pagado), <b key="s" className={c.saldo > 0 ? 'text-red-700' : 'text-emerald-700'}>{cop(c.saldo)}</b>])}
          vacio="Aún no hay cobros: genéralos con «Generar cobros del mes»." />
        <p className="text-xs">Saldo total: <b>{cop(total)}</b></p>
        <div className="flex gap-2">
          <button type="button" className={botonSec} disabled={paz.isPending} onClick={() => paz.mutate()}>Expedir paz y salvo</button>
        </div>
        <Falla e={paz.error} />
      </div>
      <div className="space-y-2">
        <h4 className="text-xs font-bold">Pagos (recibos de caja)</h4>
        <form className="grid grid-cols-2 gap-2 rounded-lg bg-emerald-50 p-2" onSubmit={(e) => { e.preventDefault(); pagar.mutate() }}>
          <Campo etiqueta="Valor recibido"><input className={campo} type="number" min={1} required value={pago.valor} onChange={(e) => setPago({ ...pago, valor: e.target.value })} /></Campo>
          <Campo etiqueta="Fecha"><input className={campo} type="date" value={pago.fecha} onChange={(e) => setPago({ ...pago, fecha: e.target.value })} /></Campo>
          <Campo etiqueta="Medio"><select className={campo} value={pago.medio} onChange={(e) => setPago({ ...pago, medio: e.target.value })}>{MEDIOS.map((m) => <option key={m}>{m}</option>)}</select></Campo>
          <Campo etiqueta="Referencia"><input className={campo} value={pago.referencia} onChange={(e) => setPago({ ...pago, referencia: e.target.value })} /></Campo>
          <div className="col-span-2 flex items-center gap-2"><button type="submit" className={boton} disabled={pagar.isPending}>Registrar pago</button><span className="text-[11px] text-gray-600">Se aplica primero a lo más antiguo.</span></div>
          <div className="col-span-2"><Falla e={pagar.error} /></div>
        </form>
        <Tabla derecha={[2]} cab={['Recibo', 'Fecha', 'Valor', 'Estado', '']}
          filas={(recibos.data ?? []).map((r) => [r.numero_completo, r.fecha, cop(r.valor), <Insignia key="e" texto={r.estado === 'anulado' ? 'anulado' : r.sin_aplicar > 0 ? `saldo a favor ${cop(r.sin_aplicar)}` : 'aplicado'} tono={r.estado === 'anulado' ? 'gris' : 'verde'} />,
            <span key="a" className="flex gap-1"><button type="button" className={botonSec} onClick={() => bajar(`/recibos/${r.id}/pdf`, `recibo-${r.numero_completo}.pdf`, true)}>PDF</button>
              {r.estado === 'emitido' && <button type="button" className={botonSec} onClick={() => { if (window.confirm('¿Anular este recibo? Los cobros vuelven a quedar pendientes.')) anular.mutate(r.id) }}>Anular</button>}</span>])}
          vacio="Sin pagos registrados." />
        <Falla e={anular.error} />
      </div>
    </div>
  )
}

export default function Contratos() {
  const qc = useQueryClient()
  const lista = useQuery({ queryKey: ['c', 'contratos'], queryFn: () => contratos() })
  const [abierto, setAbierto] = useState<number | null>(null)
  const [periodo, setPeriodo] = useState(mesActual())
  const [f, setF] = useState({ inmueble: '', arrendatario: '', codeudor: '', canon: '', inicio: hoyISO(), fin: '', dia: '5', deposito: '', valorComercial: '', uso: 'vivienda_urbana' })
  const refrescar = () => void qc.invalidateQueries({ queryKey: ['c'] })
  const generar = useMutation({ mutationFn: () => generarCobros(periodo), onSuccess: refrescar })
  const crear = useMutation({
    mutationFn: () => crearContrato({
      inmueble_id: Number(f.inmueble), arrendatario_id: Number(f.arrendatario), uso: f.uso, canon_inicial: Number(f.canon), fecha_inicio: f.inicio, fecha_fin: f.fin, dia_pago: Number(f.dia),
      deposito: Number(f.deposito || 0), valor_comercial_ref: num(f.valorComercial), codeudores: f.codeudor ? [Number(f.codeudor)] : [], notas: null,
    }),
    onSuccess: () => { setF({ ...f, canon: '', fin: '', deposito: '', valorComercial: '', arrendatario: '', codeudor: '' }); refrescar() },
  })
  const terminar = useMutation({ mutationFn: (id: number) => terminarContrato(id), onSuccess: refrescar })
  const set = (k: keyof typeof f, v: string) => setF({ ...f, [k]: v })

  return (
    <div className="space-y-4">
      <Seccion titulo="Nuevo contrato de arriendo">
        <form className="space-y-2" onSubmit={(e) => { e.preventDefault(); crear.mutate() }}>
          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
            <Campo etiqueta="Inmueble"><SelInmueble valor={f.inmueble} onChange={(v) => set('inmueble', v)} soloArriendo /></Campo>
            <Campo etiqueta="Arrendatario"><SelPersona valor={f.arrendatario} onChange={(v) => set('arrendatario', v)} /></Campo>
            <Campo etiqueta="Codeudor (opcional)"><SelPersona valor={f.codeudor} onChange={(v) => set('codeudor', v)} vacio="Sin codeudor" /></Campo>
            <Campo etiqueta="Uso"><select className={campo} value={f.uso} onChange={(e) => set('uso', e.target.value)}><option value="vivienda_urbana">Vivienda urbana</option><option value="comercial">Comercial</option><option value="otro">Otro</option></select></Campo>
            <Campo etiqueta="Canon mensual inicial (COP)"><input className={campo} type="number" min={1} required value={f.canon} onChange={(e) => set('canon', e.target.value)} /></Campo>
            <Campo etiqueta="Inicio"><input className={campo} type="date" required value={f.inicio} onChange={(e) => set('inicio', e.target.value)} /></Campo>
            <Campo etiqueta="Vencimiento"><input className={campo} type="date" required value={f.fin} onChange={(e) => set('fin', e.target.value)} /></Campo>
            <Campo etiqueta="Día de pago (1–28)"><input className={campo} type="number" min={1} max={28} required value={f.dia} onChange={(e) => set('dia', e.target.value)} /></Campo>
            <Campo etiqueta="Depósito (COP)"><input className={campo} type="number" min={0} value={f.deposito} onChange={(e) => set('deposito', e.target.value)} /></Campo>
            <Campo etiqueta="Valor comercial (regla del 1 %)"><input className={campo} type="number" min={1} value={f.valorComercial} onChange={(e) => set('valorComercial', e.target.value)} placeholder="Vacío = avalúo o estimado" /></Campo>
          </div>
          <Falla e={crear.error} />
          <button type="submit" className={boton} disabled={crear.isPending || !f.inmueble || !f.arrendatario}>Crear contrato</button>
        </form>
      </Seccion>

      <Seccion titulo={`Contratos (${lista.data?.length ?? 0})`}
        derecha={
          <form className="flex items-center gap-2 text-xs" onSubmit={(e) => { e.preventDefault(); generar.mutate() }}>
            <input className="rounded-md border border-gray-300 px-2 py-1" type="month" value={periodo} onChange={(e) => setPeriodo(e.target.value)} aria-label="Mes de los cobros" />
            <button type="submit" className={botonSec} disabled={generar.isPending}>Generar cobros del mes</button>
          </form>
        }>
        {generar.data && (
          <p className="rounded bg-emerald-50 p-2 text-xs text-emerald-900">Cobros de {periodo}: {generar.data.creados.length} creados, {generar.data.ya_existian} ya existían.{generar.data.avisos.map((a) => <span key={a} className="block text-amber-800">⚠ {a}</span>)}</p>
        )}
        <Falla e={generar.error ?? terminar.error} />
        <ul className="space-y-3">
          {(lista.data ?? []).map((k) => (
            <li key={k.id} className="rounded-lg border border-gray-200 p-3">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div>
                  <div className="text-sm font-semibold">Contrato #{k.id} · inmueble #{k.inmueble_id} · {k.arrendatario.nombre} <Insignia texto={k.estado} tono={k.estado === 'vigente' ? 'verde' : 'gris'} /></div>
                  <div className="text-xs text-gray-600">
                    Canon vigente <b>{cop(k.canon_vigente)}</b> (inicial {cop(k.canon_inicial)}) · {k.fecha_inicio} → {k.fecha_fin} ({k.dias_para_vencer >= 0 ? `faltan ${k.dias_para_vencer} d` : `venció hace ${-k.dias_para_vencer} d`}) · pago el {k.dia_pago} · depósito {cop(k.deposito)}
                    {k.codeudores.length > 0 && <> · codeudor: {k.codeudores.map((c) => c.nombre).join(', ')}</>}
                  </div>
                </div>
                <div className="flex gap-1">
                  <button type="button" className={botonSec} onClick={() => setAbierto(abierto === k.id ? null : k.id)}>{abierto === k.id ? 'Ocultar' : 'Cobros y pagos'}</button>
                  {k.estado === 'vigente' && <button type="button" className={botonSec} onClick={() => { if (window.confirm('¿Terminar este contrato?')) terminar.mutate(k.id) }}>Terminar</button>}
                </div>
              </div>
              {k.alertas.length > 0 && (
                <ul className="mt-2 space-y-1">{k.alertas.map((a) => <li key={a.codigo} className="flex items-start gap-2 text-xs"><Insignia texto={a.nivel === 'rojo' ? 'Urgente' : 'Atención'} tono={a.nivel} /><span>{a.texto}</span></li>)}</ul>
              )}
              {abierto === k.id && <Detalle k={k} onCambio={refrescar} />}
            </li>
          ))}
          {lista.data?.length === 0 && <li className="text-xs text-gray-500">Sin contratos todavía.</li>}
        </ul>
      </Seccion>
    </div>
  )
}
