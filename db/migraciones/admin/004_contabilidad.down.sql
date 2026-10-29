DELETE FROM parametros WHERE clave IN (
 'comision.venta_pct','comision.arriendo_pct','comision.administracion_pct','reparto.asesor_pct_defecto','reparto.referido_pct_defecto',
 'iva.pct','retefuente.pct','retefuente.base_minima_cop','reteica.por_mil','ica.por_mil','reteiva.pct_del_iva','liquidacion.iva_sobre_comision',
 'canon.max_pct_valor_comercial','contrato.dias_alerta_renovacion','contrato.incremento_max_pct_ipc','mora.dias_gracia','mora.tasa_mensual_pct');
DROP TABLE IF EXISTS liquidaciones;
DROP TABLE IF EXISTS gastos;
DROP TABLE IF EXISTS paz_y_salvos;
DROP TABLE IF EXISTS recibo_aplicaciones;
DROP TABLE IF EXISTS recibos_caja;
DROP TABLE IF EXISTS cobros;
DROP TABLE IF EXISTS facturas;
DROP TABLE IF EXISTS comisiones;
DROP TABLE IF EXISTS contrato_codeudores;
DROP TABLE IF EXISTS contratos_arriendo;
DROP TABLE IF EXISTS ipc_anual;
DROP TABLE IF EXISTS consecutivos;
DROP TABLE IF EXISTS inmueble_propietario;
DROP TABLE IF EXISTS personas;
