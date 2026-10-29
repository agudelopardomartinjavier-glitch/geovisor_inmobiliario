import { useQuery } from '@tanstack/react-query'
import { listarParametros } from '../api'
import { alertasContratos, cartera } from './api'
import { Dato, Insignia, Seccion, Tabla, cop } from './ui'

/** Pantalla de inicio: lo que requiere atención hoy (el panel de alertas completo llega en la Fase 7). */
export default function Hoy() {
  const al = useQuery({ queryKey: ['c', 'alertas'], queryFn: alertasContratos })
  const ca = useQuery({ queryKey: ['c', 'cartera'], queryFn: cartera })
  const pr = useQuery({ queryKey: ['c', 'params'], queryFn: listarParametros })
  const sinConfirmar = (pr.data ?? []).filter((p) => p.requiere_confirmar).length
  const c = ca.data
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-2 lg:grid-cols-4">
        <Dato titulo="Cartera vencida" valor={cop(c?.saldo_vencido)} detalle={c ? `${c.contratos_en_mora} contrato(s) en mora` : ''} tono={c && c.saldo_vencido > 0 ? 'rojo' : undefined} />
        <Dato titulo="Intereses de mora" valor={cop(c?.interes_mora)} />
        <Dato titulo="Por cobrar (aún no vence)" valor={cop(c?.por_cobrar)} />
        <Dato titulo="Alertas de contratos" valor={al.data?.length ?? '—'} />
      </div>
      <Seccion titulo="Alertas de contratos de arriendo">
        <Tabla cab={['Nivel', 'Contrato', 'Alerta']} vacio="Sin alertas: todo al día."
          filas={(al.data ?? []).map((a) => [<Insignia key={a.codigo + a.contrato_id} texto={a.nivel === 'rojo' ? 'Urgente' : 'Atención'} tono={a.nivel} />, `#${a.contrato_id} (inmueble ${a.inmueble_id})`, a.texto])} />
      </Seccion>
      {sinConfirmar > 0 && (
        <p className="rounded-lg bg-amber-50 p-3 text-xs text-amber-900">
          Hay <b>{sinConfirmar} parámetros por confirmar</b> con un contador o abogado (IVA, retenciones, ICA, comisiones, tope del 1 %, etc.). Revísalos en <b>Configuración</b> antes de usar las cifras en operación real.
        </p>
      )}
    </div>
  )
}
