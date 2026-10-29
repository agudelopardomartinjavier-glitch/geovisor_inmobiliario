/** Tipos de la API contable (solo los campos que usa el panel). */
export interface Persona { id: number; tipo_persona: 'natural' | 'juridica'; nombre: string; documento_tipo: string; documento: string; email: string | null; telefono: string | null; direccion: string | null }
export type PersonaDatos = Omit<Persona, 'id'>

export interface FacturaResumen { id: number; tipo: 'factura' | 'nota_credito'; prefijo: string; numero: number; fecha: string; total: number; dian_estado: string }
export interface Factura extends FacturaResumen {
  numero_completo: string; comision_id: number | null; cliente_id: number; concepto: string; subtotal: number; iva: number
  dian_cufe: string | null; saldo_credito?: number; anulada?: boolean; motivo: string | null; aviso?: string | null
}

export type EstadoComision = 'pendiente' | 'facturada' | 'cobrada' | 'anulada'
export interface Comision {
  id: number; inmueble_id: number; tipo: 'venta' | 'arriendo'; base: number; pct_pactado: number; pagador: string; estado: EstadoComision; fecha: string; fecha_cobro: string | null
  valor_comision: number; iva: number; retefuente: number; reteica: number; reteiva: number; total_facturable: number; neto_a_recibir: number
  asesor: string | null; asesor_pct: number; referido: string | null; referido_pct: number; asesor_valor: number; referido_valor: number; inmobiliaria_valor: number
  facturas: FacturaResumen[]; facturado_pct: number
}
export interface ComisionDatos {
  inmueble_id: number; tipo: 'venta' | 'arriendo'; pagador: string; base: number | null; pct_pactado: number | null; pct_pagador_propietario: number | null
  aplica_iva: boolean; aplica_retenciones: boolean; asesor: string | null; asesor_pct: number | null; referido: string | null; referido_pct: number | null; fecha: string | null; nota: string | null
}

export interface Alerta { codigo: string; nivel: 'rojo' | 'amarillo'; texto: string; contrato_id?: number; inmueble_id?: number }
export interface CobroMora { id: number; periodo: string; concepto: string; fecha_vencimiento: string; valor: number; pagado: number; saldo: number; dias_mora: number; interes: number }
export interface Contrato {
  id: number; inmueble_id: number; arrendatario_id: number; uso: string; canon_inicial: number; fecha_inicio: string; fecha_fin: string; dia_pago: number; deposito: number
  comision_admin_pct: number; estado: 'vigente' | 'terminado'; arrendatario: Persona; codeudores: Persona[]
  canon_vigente: number; dias_para_vencer: number; alertas: Alerta[]; ley820: { aplica: boolean; limite: number | null; excede: boolean }
  mora: { saldo_vencido: number; interes: number; dias_max: number; cobros: CobroMora[] }
}
export interface ContratoDatos {
  inmueble_id: number; arrendatario_id: number; uso: string; canon_inicial: number; fecha_inicio: string; fecha_fin: string; dia_pago: number; deposito: number
  valor_comercial_ref: number | null; codeudores: number[]; notas: string | null
}
export interface Cobro { id: number; periodo: string; concepto: string; fecha_vencimiento: string; valor: number; pagado: number; saldo: number }
export interface Recibo { id: number; numero_completo: string; fecha: string; valor: number; medio: string; estado: 'emitido' | 'anulado'; sin_aplicar: number; aplicaciones: { periodo: string; valor: number }[] }

export interface Cartera {
  corte: string; saldo_vencido: number; interes_mora: number; por_cobrar: number; contratos_en_mora: number; tramos: Record<string, number>
  contratos: { contrato_id: number; inmueble_id: number; arrendatario: string; telefono: string | null; email: string | null; tramo: string; saldo_vencido: number; interes: number; dias_max: number }[]
}

export interface Gasto {
  id: number; inmueble_id: number; fecha: string; categoria: string; subtipo: string | null; descripcion: string; valor: number; a_cargo_de: string; proveedor: string | null
  estado_pago: string; tiene_soporte: boolean; soporte_nombre: string | null
}
export interface GastoDatos { inmueble_id: number; fecha: string; categoria: string; subtipo: string | null; descripcion: string; valor: number; a_cargo_de: string; proveedor: string | null; estado_pago: string }

export interface Liquidacion {
  propietario: string; periodo: string; canones_recibidos: number; comision: number; iva_comision: number; administracion: number; predial: number; reparaciones: number; otros: number
  saldo_a_girar: number; liquidacion_existente?: number | null
  detalle: { inmuebles: { inmueble_id: number; canones: number; comision: number; recaudos: { recibo: string; fecha: string; valor: number }[]; gastos: { fecha: string; descripcion: string; categoria: string; valor: number }[] }[] }
}
export interface LiquidacionGuardada extends Liquidacion { id: number; numero_completo: string; propietario_id: number; estado: 'cerrada' | 'girada'; fecha_giro: string | null }

export interface Consecutivo { tipo: string; prefijo: string; siguiente: number; hasta: number | null; resolucion_numero: string | null; resolucion_fecha: string | null; vigencia_hasta: string | null }
export interface Ipc { anio: number; pct: number; fuente: string | null }

export interface ResumenImpuestos {
  periodo: string; facturas: number; notas_credito: number; ingresos_netos: number; iva_generado: number; total_facturado: number
  retefuente: number; reteica: number; reteiva: number; ica_causado: number; ica_por_mil: number; ingresos_por_tipo: { venta: number; arriendo: number }; aviso: string
}
export interface ReporteComisiones { total_devengado: number; total_cobrado: number; parte_inmobiliaria: number; por_mes: { mes: string; devengado: number; iva: number; cobrado: number; comisiones: number }[]; por_asesor: { nombre: string; comisiones: number; valor: number }[] }
export interface FlujoCaja { total_entradas: number; total_salidas: number; neto: number; meses: { mes: string; recaudos: number; comisiones_cobradas: number; gastos_pagados: number; giros: number; neto: number; acumulado: number }[] }
export interface Ocupacion { corte: string; inmuebles_administrados: number; ocupados: number; vacantes: number; ocupacion_pct: number | null; detalle_vacantes: { inmueble_id: number; tipo: string; vacante_desde: string | null; dias_vacante: number | null }[] }
export interface RentabilidadInm { inmuebles: { inmueble_id: number; tipo: string; canon_mensual: number; valor: number | null; rentabilidad_teorica_pct: number | null; ingresos_periodo: number; gastos_propietario_periodo: number; rentabilidad_real_pct: number | null }[]; nota: string }
