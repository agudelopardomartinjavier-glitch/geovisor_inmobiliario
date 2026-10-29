import { descargarArchivo, llamar, subirArchivo } from '../api'
import type {
  Alerta, Cartera, Cobro, Comision, ComisionDatos, Consecutivo, Contrato, ContratoDatos, Factura, FlujoCaja, Gasto, GastoDatos, Ipc, Liquidacion, LiquidacionGuardada,
  Ocupacion, Persona, PersonaDatos, Recibo, RentabilidadInm, ReporteComisiones, ResumenImpuestos,
} from './tipos'

const post = <T,>(r: string, b?: unknown) => llamar<T>(r, { method: 'POST', body: b === undefined ? undefined : JSON.stringify(b) })
const put = <T,>(r: string, b: unknown) => llamar<T>(r, { method: 'PUT', body: JSON.stringify(b) })
const qs = (o: Record<string, string | number | null | undefined>) => {
  const p = new URLSearchParams()
  for (const [k, v] of Object.entries(o)) if (v !== null && v !== undefined && v !== '') p.set(k, String(v))
  const s = p.toString()
  return s ? `?${s}` : ''
}

// terceros
export const personas = (q = '') => llamar<Persona[]>(`/personas${qs({ q })}`)
export const crearPersona = (d: PersonaDatos) => post<Persona>('/personas', d)
export const editarPersona = (id: number, d: PersonaDatos) => put<Persona>(`/personas/${id}`, d)
export const borrarPersona = (id: number) => llamar<void>(`/personas/${id}`, { method: 'DELETE' })
export const propietarioDe = (inm: number) => llamar<Persona | null>(`/inmuebles/${inm}/propietario`)
export const fijarPropietario = (inm: number, persona_id: number) => put<Persona>(`/inmuebles/${inm}/propietario`, { persona_id })

// comisiones y facturas
export const comisiones = (estado = '') => llamar<Comision[]>(`/comisiones${qs({ estado })}`)
export const calcularComision = (d: ComisionDatos) => post<Comision>('/comisiones/calcular', d)
export const crearComision = (d: ComisionDatos) => post<Comision>('/comisiones', d)
export const anularComision = (id: number) => post<Comision>(`/comisiones/${id}/anular`)
export const cobrarComision = (id: number, fecha: string | null) => post<Comision>(`/comisiones/${id}/cobrar`, { fecha })
export const facturar = (id: number, cliente_id: number, pct_comision: number | null) => post<Factura>(`/comisiones/${id}/facturar`, { cliente_id, pct_comision })
export const notaCredito = (id: number, motivo: string, pct: number | null) => post<Factura>(`/facturas/${id}/nota-credito`, { motivo, pct })
export const enviarDian = (id: number) => post<Factura>(`/facturas/${id}/enviar-dian`)
export const verFactura = (id: number) => llamar<Factura>(`/facturas/${id}`)

// contratos, cobros, cartera, recibos
export const contratos = (estado = '') => llamar<Contrato[]>(`/contratos${qs({ estado })}`)
export const crearContrato = (d: ContratoDatos) => post<Contrato>('/contratos', d)
export const terminarContrato = (id: number) => post<Contrato>(`/contratos/${id}/terminar`, {})
export const alertasContratos = () => llamar<Alerta[]>('/contratos/alertas')
export const cobrosDe = (id: number) => llamar<Cobro[]>(`/contratos/${id}/cobros`)
export const generarCobros = (periodo: string) => post<{ creados: unknown[]; ya_existian: number; avisos: string[] }>('/cobros/generar', { periodo })
export const cartera = () => llamar<Cartera>('/cartera')
export const recibosDe = (id: number) => llamar<Recibo[]>(`/recibos${qs({ contrato_id: id })}`)
export const crearRecibo = (d: { valor: number; fecha: string | null; medio: string; referencia: string | null; contrato_id: number }) => post<Recibo>('/recibos', d)
export const anularRecibo = (id: number) => post<Recibo>(`/recibos/${id}/anular`)
export const pazYSalvo = (id: number, nota: string | null) => post<{ id: number; numero_completo: string }>(`/contratos/${id}/paz-y-salvo`, { nota })

// gastos
export const gastos = (inmueble_id: number | null) => llamar<Gasto[]>(`/gastos${qs({ inmueble_id })}`)
export const crearGasto = (d: GastoDatos) => post<Gasto>('/gastos', d)
export const borrarGasto = (id: number) => llamar<void>(`/gastos/${id}`, { method: 'DELETE' })
export const soporteGasto = (id: number, f: File) => subirArchivo<Gasto>(`/gastos/${id}/soporte`, f)

// liquidaciones
export const vistaPreviaLiquidacion = (propietario_id: number, periodo: string) => llamar<Liquidacion>(`/liquidaciones/vista-previa${qs({ propietario_id, periodo })}`)
export const liquidaciones = () => llamar<LiquidacionGuardada[]>('/liquidaciones')
export const cerrarLiquidacion = (propietario_id: number, periodo: string) => post<LiquidacionGuardada>('/liquidaciones', { propietario_id, periodo })
export const girarLiquidacion = (id: number, referencia: string | null) => post<LiquidacionGuardada>(`/liquidaciones/${id}/girar`, { referencia })
export const borrarLiquidacion = (id: number) => llamar<void>(`/liquidaciones/${id}`, { method: 'DELETE' })

// reportes e impuestos
export const impuestos = (periodo: string) => llamar<ResumenImpuestos>(`/impuestos/resumen${qs({ periodo })}`)
export const repComisiones = (desde: string, hasta: string) => llamar<ReporteComisiones>(`/reportes/comisiones${qs({ desde, hasta })}`)
export const repFlujo = (desde: string, hasta: string) => llamar<FlujoCaja>(`/reportes/flujo-caja${qs({ desde, hasta })}`)
export const repOcupacion = () => llamar<Ocupacion>('/reportes/ocupacion')
export const repRentabilidad = () => llamar<RentabilidadInm>('/reportes/rentabilidad')

// configuración
export const consecutivos = () => llamar<Consecutivo[]>('/consecutivos')
export const fijarConsecutivo = (tipo: string, d: Omit<Consecutivo, 'tipo'>) => put<Consecutivo>(`/consecutivos/${tipo}`, d)
export const ipc = () => llamar<Ipc[]>('/ipc')
export const fijarIpc = (anio: number, pct: number, fuente: string | null) => put<Ipc>(`/ipc/${anio}`, { pct, fuente })
export const borrarIpc = (anio: number) => llamar<void>(`/ipc/${anio}`, { method: 'DELETE' })

export { descargarArchivo }
