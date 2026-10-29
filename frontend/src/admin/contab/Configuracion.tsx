import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { cambiarParametro, listarParametros } from '../api'
import { borrarIpc, consecutivos, fijarConsecutivo, fijarIpc, ipc } from './api'
import type { Consecutivo } from './tipos'
import { Campo, Falla, Insignia, Seccion, Tabla, boton, botonSec, campo, num, txt } from './ui'

const NOMBRE: Record<string, string> = { factura: 'Facturas', nota_credito: 'Notas crédito', recibo_caja: 'Recibos de caja', liquidacion: 'Liquidaciones', paz_y_salvo: 'Paz y salvos' }
const PREFIJOS = ['comision.', 'reparto.', 'iva.', 'retefuente.', 'reteica.', 'reteiva.', 'ica.', 'liquidacion.', 'canon.', 'contrato.', 'mora.']

function FilaConsecutivo({ c }: { c: Consecutivo }) {
  const qc = useQueryClient()
  const [v, setV] = useState({ prefijo: c.prefijo, siguiente: String(c.siguiente), hasta: c.hasta?.toString() ?? '', resolucion_numero: c.resolucion_numero ?? '', resolucion_fecha: c.resolucion_fecha ?? '', vigencia_hasta: c.vigencia_hasta ?? '' })
  const guardar = useMutation({
    mutationFn: () => fijarConsecutivo(c.tipo, { prefijo: v.prefijo, siguiente: Number(v.siguiente), hasta: num(v.hasta), resolucion_numero: txt(v.resolucion_numero), resolucion_fecha: txt(v.resolucion_fecha), vigencia_hasta: txt(v.vigencia_hasta) }),
    onSuccess: () => void qc.invalidateQueries({ queryKey: ['c', 'consecutivos'] }),
  })
  const i = 'rounded border border-gray-300 px-1.5 py-1 text-xs'
  return (
    <form className="grid grid-cols-2 items-end gap-2 rounded-lg border border-gray-200 p-2 sm:grid-cols-4 lg:grid-cols-8" onSubmit={(e) => { e.preventDefault(); guardar.mutate() }}>
      <div className="font-semibold text-xs">{NOMBRE[c.tipo] ?? c.tipo}</div>
      <label className="text-[11px]">Prefijo<input className={`${i} w-full`} value={v.prefijo} onChange={(e) => setV({ ...v, prefijo: e.target.value })} /></label>
      <label className="text-[11px]">Siguiente<input className={`${i} w-full`} type="number" min={1} value={v.siguiente} onChange={(e) => setV({ ...v, siguiente: e.target.value })} /></label>
      <label className="text-[11px]">Hasta (rango)<input className={`${i} w-full`} type="number" min={1} value={v.hasta} onChange={(e) => setV({ ...v, hasta: e.target.value })} /></label>
      <label className="text-[11px]">Resolución DIAN<input className={`${i} w-full`} value={v.resolucion_numero} onChange={(e) => setV({ ...v, resolucion_numero: e.target.value })} /></label>
      <label className="text-[11px]">Fecha resolución<input className={`${i} w-full`} type="date" value={v.resolucion_fecha} onChange={(e) => setV({ ...v, resolucion_fecha: e.target.value })} /></label>
      <label className="text-[11px]">Vigente hasta<input className={`${i} w-full`} type="date" value={v.vigencia_hasta} onChange={(e) => setV({ ...v, vigencia_hasta: e.target.value })} /></label>
      <div className="flex items-center gap-1"><button type="submit" className={botonSec} disabled={guardar.isPending}>Guardar</button>{guardar.isSuccess && <span className="text-emerald-700">✓</span>}</div>
      {guardar.error && <div className="col-span-full"><Falla e={guardar.error} /></div>}
    </form>
  )
}

export default function Configuracion() {
  const qc = useQueryClient()
  const cons = useQuery({ queryKey: ['c', 'consecutivos'], queryFn: consecutivos })
  const ipcs = useQuery({ queryKey: ['c', 'ipc'], queryFn: ipc })
  const pars = useQuery({ queryKey: ['c', 'params'], queryFn: listarParametros })
  const [nuevo, setNuevo] = useState({ anio: String(new Date().getFullYear() - 1), pct: '', fuente: 'DANE' })
  const [edit, setEdit] = useState<Record<string, string>>({})
  const guardarIpc = useMutation({ mutationFn: () => fijarIpc(Number(nuevo.anio), Number(nuevo.pct.replace(',', '.')), txt(nuevo.fuente)), onSuccess: () => { setNuevo({ ...nuevo, pct: '' }); void qc.invalidateQueries({ queryKey: ['c', 'ipc'] }) } })
  const quitarIpc = useMutation({ mutationFn: (a: number) => borrarIpc(a), onSuccess: () => void qc.invalidateQueries({ queryKey: ['c', 'ipc'] }) })
  const cambiar = useMutation({ mutationFn: (v: { clave: string; valor: string }) => cambiarParametro(v.clave, v.valor), onSuccess: () => { setEdit({}); void qc.invalidateQueries({ queryKey: ['c', 'params'] }) } })
  const contables = (pars.data ?? []).filter((p) => PREFIJOS.some((x) => p.clave.startsWith(x)))

  return (
    <div className="space-y-4">
      <Seccion titulo="Consecutivos y resolución DIAN">
        <p className="text-[11px] text-gray-500">Con el mismo prefijo el siguiente número nunca retrocede. Al llegar al final del rango o vencer la resolución no se pueden emitir más facturas. El prefijo nuevo (nueva resolución) puede empezar en 1.</p>
        <div className="space-y-2">{(cons.data ?? []).map((c) => <FilaConsecutivo key={c.tipo + c.prefijo + c.siguiente} c={c} />)}</div>
      </Seccion>

      <Seccion titulo="IPC anual (para el incremento del canon)">
        <form className="flex flex-wrap items-end gap-2" onSubmit={(e) => { e.preventDefault(); guardarIpc.mutate() }}>
          <Campo etiqueta="Año"><input className={`${campo} w-24`} type="number" min={1990} max={2100} value={nuevo.anio} onChange={(e) => setNuevo({ ...nuevo, anio: e.target.value })} /></Campo>
          <Campo etiqueta="IPC (variación anual, %)"><input className={`${campo} w-32`} inputMode="decimal" required value={nuevo.pct} onChange={(e) => setNuevo({ ...nuevo, pct: e.target.value })} /></Campo>
          <Campo etiqueta="Fuente"><input className={`${campo} w-36`} value={nuevo.fuente} onChange={(e) => setNuevo({ ...nuevo, fuente: e.target.value })} /></Campo>
          <button type="submit" className={boton} disabled={guardarIpc.isPending}>Guardar IPC</button>
        </form>
        <Falla e={guardarIpc.error ?? quitarIpc.error} />
        <Tabla derecha={[1]} cab={['Año', 'IPC %', 'Fuente', '']} filas={(ipcs.data ?? []).map((x) => [x.anio, x.pct.toLocaleString('es-CO'), x.fuente ?? '—', <button key={x.anio} type="button" className={botonSec} onClick={() => quitarIpc.mutate(x.anio)}>Quitar</button>])} vacio="Sin IPC cargado: los contratos no tendrán incremento hasta que lo cargues." />
        <p className="text-[11px] text-gray-500">El aumento de cada aniversario usa el IPC del año anterior. Carga el dato oficial (DANE); no lo inventes: sin IPC el canon no sube y se genera una alerta.</p>
      </Seccion>

      <Seccion titulo="Parámetros contables y de negocio">
        <p className="text-[11px] text-gray-500">Los marcados «por confirmar» son valores iniciales razonables, no asesoría tributaria: valídalos con tu contador o abogado.</p>
        <Falla e={cambiar.error} />
        <ul className="grid gap-2 lg:grid-cols-2">
          {contables.map((p) => (
            <li key={p.clave} className="rounded border border-gray-200 p-2">
              <div className="font-mono text-[11px]">{p.clave}{p.requiere_confirmar ? <> <Insignia texto="por confirmar" tono="amarillo" /></> : null}</div>
              <div className="text-[11px] text-gray-600">{p.descripcion}</div>
              <div className="mt-1 flex gap-2">
                <input className="w-24 rounded border border-gray-300 px-2 py-1 text-xs" inputMode="decimal" value={edit[p.clave] ?? p.valor} onChange={(e) => setEdit({ ...edit, [p.clave]: e.target.value })} aria-label={p.clave} />
                <button type="button" className={botonSec} disabled={edit[p.clave] == null || edit[p.clave] === p.valor || cambiar.isPending} onClick={() => cambiar.mutate({ clave: p.clave, valor: edit[p.clave]! })}>Guardar</button>
              </div>
            </li>
          ))}
        </ul>
      </Seccion>
    </div>
  )
}
