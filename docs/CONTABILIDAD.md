# Módulo contable y administrativo (Fase 3)

Todo es **privado** (solo administrador; `admin.sqlite`). Cálculos en `backend/app/contable/calculos.py` (funciones puras, con pruebas) y rutas en `backend/app/contable/router_*.py`.
Dinero en **COP enteros**, redondeo «mitad hacia arriba». Ninguna tarifa va fija en el código: viven en la tabla `parametros` (`GET/PUT /admin/parametros`) y **cada comisión guarda copia de las tarifas que usó**, así cambiar un parámetro no altera lo ya registrado.

> **Importante:** los porcentajes son valores iniciales razonables, **no asesoría tributaria**. Los marcados «por confirmar» (columna «Confirmar») deben validarlos un contador o abogado antes de usarlos en operación real. En el código llevan el comentario `# CONFIRMAR`.

## Parámetros
| Clave | Valor inicial | Qué es | Confirmar |
|---|---|---|---|
| `comision.venta_pct` | 3 | Comisión por defecto en ventas (% del precio) | sí |
| `comision.arriendo_pct` | 100 | Comisión al arrendar (% de un canon mensual) | sí |
| `comision.administracion_pct` | 10 | Comisión de administración de un arriendo (% del canon recaudado) | sí |
| `reparto.asesor_pct_defecto` / `reparto.referido_pct_defecto` | 50 / 0 | Reparto de la comisión por defecto | sí |
| `iva.pct` | 19 | IVA sobre comisiones | sí |
| `retefuente.pct` | 11 | Retención en la fuente sobre la comisión | sí |
| `retefuente.base_minima_cop` | 0 | Base mínima para que aplique la retención | sí |
| `reteica.por_mil` | 10 | Retención de ICA (por mil) | sí |
| `reteiva.pct_del_iva` | 15 | Retención de IVA (% del IVA) | sí |
| `ica.por_mil` | 10 | ICA que causa la inmobiliaria sobre sus ingresos (por mil) | sí |
| `liquidacion.iva_sobre_comision` | 1 | La comisión de administración lleva IVA en la cuenta del propietario | sí |
| `canon.max_pct_valor_comercial` | 1 | Ley 820 de 2003: tope del canon mensual sobre el valor comercial (vivienda urbana) | sí |
| `contrato.incremento_max_pct_ipc` | 100 | Tope del incremento anual como % del IPC | sí |
| `contrato.dias_alerta_renovacion` | 90 | Días antes del vencimiento en que alerta | no |
| `mora.dias_gracia` / `mora.tasa_mensual_pct` | 0 / 2 | Gracia e interés de mora mensual (no puede superar la usura) | tasa: sí |

## Comisiones
`valor = base × % pactado` (base = precio de venta o canon mensual). `IVA = valor × IVA %`. Retenciones que practica quien paga: retefuente y reteICA sobre `valor`, reteIVA sobre el IVA. `neto a recibir = valor + IVA − retenciones`.
**Reparto** (asesor y referido): porcentajes de `valor` antes de IVA; la suma no puede pasar de 100 %. Quién paga: propietario, comprador, arrendatario o compartida (con el % que paga el propietario). Estados: pendiente → facturada → cobrada (o anulada). `POST /admin/comisiones/calcular` da una vista previa sin guardar.

## Facturación
- **Consecutivos** por tipo (`factura`, `nota_credito`, `recibo_caja`, `liquidacion`, `paz_y_salvo`) con prefijo, rango autorizado (`hasta`) y vigencia de la resolución. Se rechaza emitir fuera de rango o con resolución vencida, y **nunca se repiten números** (el siguiente debe superar el último emitido con ese prefijo). La numeración no se reutiliza aunque se borre un documento.
- Una comisión se puede facturar de una vez o en porciones (p. ej. 60 % al vendedor y el resto al comprador); la última porción se calcula por diferencia para que la suma coincida exacta con la comisión.
- Las facturas no se editan ni se borran: se corrigen con **nota crédito** (total o parcial, con consecutivo propio). Si todas las facturas de una comisión quedan acreditadas, vuelve a «pendiente».
- **Factura electrónica DIAN**: interfaz, no integración. `backend/app/contable/dian.py` define un adaptador (`enviar(documento) → RespuestaDian`); el sistema arma un documento normalizado (emisor, cliente, líneas, totales, factura de origen en notas crédito) y guarda lo que responda el proveedor (estado, CUFE/CUDE, respuesta). Se conecta un proveedor registrándolo con `registrar("nombre", Clase)` y poniendo `DIAN_PROVEEDOR=nombre` en `.env`; también `EMPRESA_NOMBRE` y `EMPRESA_NIT`. Por defecto (`ninguno`) la factura queda emitida solo en el sistema. `simulado` existe solo para pruebas y **no tiene validez fiscal**.

## Contratos de arriendo
Canon, fechas, día de pago, depósito, codeudores, uso y `comision_admin_pct`. No se permiten dos contratos vigentes que se crucen en el mismo inmueble.
- **Canon vigente**: en cada aniversario sube según el **IPC del año anterior** (`PUT /admin/ipc/{año}`), limitado a `contrato.incremento_max_pct_ipc` % de ese IPC; el IPC negativo no baja el canon. Si falta el IPC de un año **no se inventa el aumento**: se alerta y el canon sigue igual hasta cargarlo.
- **Regla del 1 % (Ley 820 de 2003)**: en vivienda urbana, alerta si el canon vigente supera `canon.max_pct_valor_comercial` % del valor comercial. El valor comercial es el indicado en el contrato; si falta, el avalúo del inmueble; si falta, el estimado por comparables.
- **Alertas** (`GET /admin/contratos/alertas`): renovación (vence en ≤ 90 días), vencido sin renovar, canon sobre el límite legal, IPC faltante y mora.

## Cartera y cobranza
`POST /admin/cobros/generar {periodo}` crea el canon del mes de todos los contratos vigentes (repetible: no duplica). Se pueden agregar cobros adicionales (administración, servicios…).
**Mora**: días = (corte − vencimiento) − días de gracia; interés simple = saldo × tasa mensual × días / 30. `GET /admin/cartera` lista lo vencido por contrato, con tramos 1-30, 31-60, 61-90 y más de 90 días.
**Recibos de caja** (consecutivo propio, PDF): el pago se aplica a los cobros más antiguos primero, o manualmente (se valida contra el saldo de cada cobro). Lo que sobra queda como saldo a favor sin aplicar. Un recibo anulado deja de contar y los cobros vuelven a quedar pendientes.
**Paz y salvo** (con PDF): solo se expide si no hay saldo vencido.

## Cuentas del propietario (liquidación mensual)
`saldo a girar = cánones recibidos − comisión − IVA de la comisión − administración − predial − reparaciones − otros`.
- *Cánones recibidos*: lo aplicado a cobros de canon con recibos emitidos en el mes (los anulados no cuentan).
- *Comisión*: por contrato, `comision_admin_pct` × lo recibido de ese contrato; luego el IVA según el parámetro.
- *Gastos descontados*: solo los **a cargo del propietario** con fecha en el mes: administración de propiedad horizontal → administración; impuesto con subtipo «predial» → predial; mantenimiento → reparaciones; el resto (servicios, seguros, otros impuestos…) → otros. Los gastos a cargo de la inmobiliaria o del arrendatario no se descuentan.
- Puede dar **negativo** (saldo a favor de la inmobiliaria). Vista previa (`/admin/liquidaciones/vista-previa`), cierre con consecutivo, giro y **PDF**. Un mes liquidado protege sus gastos (no se agregan ni borran); una liquidación girada no se borra.
- Pendiente de confirmar con un contador: tratamiento del IVA y de las retenciones al arrendador.

## Gastos
Por inmueble: mantenimiento, impuesto, servicio, seguro, administración PH u otro; a cargo de propietario, inmobiliaria o arrendatario; **soporte adjunto** (PDF/imagen, validado por contenido, guardado en `data/soportes/gastos/…`, solo con sesión).

## Impuestos (resumen para el contador)
`GET /admin/impuestos/resumen?periodo=AAAA-MM` (JSON) o `&formato=xlsx` (Excel con hojas Resumen, Facturas y notas crédito, Comisiones): ingresos netos, IVA generado, retefuente, reteICA, reteIVA y **ICA causado** (ingresos netos × tarifa por mil). Las notas crédito restan. Es un apoyo: el contador valida las cifras.

## Reportes (JSON o `formato=xlsx`)
- **Comisiones**: devengado (facturadas y cobradas) y cobrado por mes, por tipo y por asesor/referido.
- **Flujo de caja** (vista de caja, no contabilidad causada): entradas = recibos de caja + comisiones cobradas (netas de retenciones); salidas = gastos pagados (del propietario o de la inmobiliaria) + giros a propietarios.
- **Ocupación**: inmuebles con contrato vigente / inmuebles administrados (en arriendo no borrador o con contrato vigente), con la lista de vacantes y sus días.
- **Rentabilidad por inmueble**: teórica = canon anual / valor; real = (cánones recibidos − gastos del propietario) del periodo, anualizada, / valor.

## Seguridad
Los registros contables usan `ON DELETE RESTRICT`: un inmueble o una persona con movimientos no se puede borrar (409). La auditoría registra acciones e identificadores, nunca nombres, documentos ni valores personales.
**Pendiente (Fase 6):** roles (administrador / asesor / contador). Hoy cualquier sesión de administrador ve todo.
