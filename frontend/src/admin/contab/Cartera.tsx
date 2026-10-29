import { useQuery } from '@tanstack/react-query'
import { cartera } from './api'
import { Dato, Insignia, Seccion, Tabla, cop } from './ui'

const TRAMOS: [string, string][] = [['1-30', '1 a 30 días'], ['31-60', '31 a 60 días'], ['61-90', '61 a 90 días'], ['mas_de_90', 'Más de 90 días']]
const TONO = { '1-30': 'amarillo', '31-60': 'amarillo', '61-90': 'rojo', mas_de_90: 'rojo', al_dia: 'verde' } as const

export default function Cartera() {
  const q = useQuery({ queryKey: ['c', 'cartera'], queryFn: cartera })
  const c = q.data
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-2 lg:grid-cols-4">
        <Dato titulo="Saldo vencido" valor={cop(c?.saldo_vencido)} tono={c && c.saldo_vencido > 0 ? 'rojo' : undefined} detalle={c ? `${c.contratos_en_mora} contrato(s)` : ''} />
        <Dato titulo="Intereses de mora (estimados)" valor={cop(c?.interes_mora)} detalle="Tasa mensual del parámetro mora.tasa_mensual_pct" />
        <Dato titulo="Por cobrar (aún no vence)" valor={cop(c?.por_cobrar)} />
        <Dato titulo="Corte" valor={c?.corte ?? '—'} />
      </div>
      <Seccion titulo="Edad de la cartera">
        <div className="grid grid-cols-2 gap-2 lg:grid-cols-4">
          {TRAMOS.map(([k, n]) => <Dato key={k} titulo={n} valor={cop(c?.tramos[k] ?? 0)} />)}
        </div>
      </Seccion>
      <Seccion titulo="Contratos en mora">
        <Tabla derecha={[4, 5, 6]} cab={['Contrato', 'Arrendatario', 'Contacto', 'Mora', 'Saldo vencido', 'Intereses', 'Días']}
          filas={(c?.contratos ?? []).map((f) => [`#${f.contrato_id} (inm. ${f.inmueble_id})`, f.arrendatario, [f.telefono, f.email].filter(Boolean).join(' · ') || '—',
            <Insignia key="t" texto={f.tramo.replace('mas_de_90', '+90')} tono={TONO[f.tramo as keyof typeof TONO] ?? 'gris'} />, cop(f.saldo_vencido), cop(f.interes), f.dias_max])}
          vacio="No hay cartera vencida." />
        <p className="text-[11px] text-gray-500">Para registrar un pago o expedir el paz y salvo, abre el contrato en la sección «Contratos».</p>
      </Seccion>
    </div>
  )
}
