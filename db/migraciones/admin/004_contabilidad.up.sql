-- 004 (admin) — Fase 3: contabilidad y administración (comisiones, facturación, arriendos, cartera, cuentas del propietario, gastos).
-- TODO es privado (admin.sqlite). Valores en COP enteros. Fechas AAAA-MM-DD.
-- Los registros contables NO se borran en cascada: ON DELETE RESTRICT (un inmueble con movimientos no se puede eliminar).
-- Las tarifas (IVA, retenciones, ICA, comisiones) viven en `parametros` y cada documento guarda copia de las que usó.

CREATE TABLE personas (
    id             INTEGER PRIMARY KEY AUTOINCREMENT,
    tipo_persona   TEXT NOT NULL DEFAULT 'natural' CHECK (tipo_persona IN ('natural','juridica')),
    nombre         TEXT NOT NULL,
    documento_tipo TEXT NOT NULL DEFAULT 'CC' CHECK (documento_tipo IN ('CC','CE','NIT','PA','TI','otro')),
    documento      TEXT NOT NULL,
    email          TEXT,
    telefono       TEXT,
    direccion      TEXT,
    creado_en      TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ','now')),
    UNIQUE (documento_tipo, documento)
);

CREATE TABLE inmueble_propietario (
    inmueble_id INTEGER PRIMARY KEY REFERENCES inmuebles(id) ON DELETE CASCADE,
    persona_id  INTEGER NOT NULL REFERENCES personas(id) ON DELETE RESTRICT
);

-- Consecutivos por tipo de documento. La factura electrónica exige resolución DIAN con rango autorizado.
CREATE TABLE consecutivos (
    tipo              TEXT PRIMARY KEY CHECK (tipo IN ('factura','nota_credito','recibo_caja','liquidacion','paz_y_salvo')),
    prefijo           TEXT NOT NULL DEFAULT '',
    siguiente         INTEGER NOT NULL DEFAULT 1 CHECK (siguiente >= 1),
    hasta             INTEGER,            -- fin del rango autorizado (NULL = sin tope)
    resolucion_numero TEXT,
    resolucion_fecha  TEXT,
    vigencia_hasta    TEXT
);
INSERT INTO consecutivos (tipo, prefijo) VALUES ('factura','FE'), ('nota_credito','NC'), ('recibo_caja','RC'), ('liquidacion','LQ'), ('paz_y_salvo','PS');

CREATE TABLE ipc_anual (
    anio   INTEGER PRIMARY KEY CHECK (anio BETWEEN 1990 AND 2100),
    pct    REAL NOT NULL CHECK (pct >= -50 AND pct <= 500),
    fuente TEXT
);

CREATE TABLE contratos_arriendo (
    id                  INTEGER PRIMARY KEY AUTOINCREMENT,
    inmueble_id         INTEGER NOT NULL REFERENCES inmuebles(id) ON DELETE RESTRICT,
    arrendatario_id     INTEGER NOT NULL REFERENCES personas(id) ON DELETE RESTRICT,
    uso                 TEXT NOT NULL DEFAULT 'vivienda_urbana' CHECK (uso IN ('vivienda_urbana','comercial','otro')),
    canon_inicial       INTEGER NOT NULL CHECK (canon_inicial > 0),
    fecha_inicio        TEXT NOT NULL,
    fecha_fin           TEXT NOT NULL,
    dia_pago            INTEGER NOT NULL DEFAULT 5 CHECK (dia_pago BETWEEN 1 AND 28),
    deposito            INTEGER NOT NULL DEFAULT 0 CHECK (deposito >= 0),
    comision_admin_pct  REAL NOT NULL CHECK (comision_admin_pct BETWEEN 0 AND 100),   -- % del canon recaudado que cobra la inmobiliaria
    valor_comercial_ref INTEGER CHECK (valor_comercial_ref > 0),                      -- base de la regla del 1 % (si falta se usa avalúo/estimado)
    incremento_ipc      INTEGER NOT NULL DEFAULT 1 CHECK (incremento_ipc IN (0,1)),
    estado              TEXT NOT NULL DEFAULT 'vigente' CHECK (estado IN ('vigente','terminado')),
    fecha_terminacion   TEXT,
    notas               TEXT,
    creado_en           TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ','now')),
    CHECK (fecha_fin > fecha_inicio)
);
CREATE INDEX contratos_inmueble_idx ON contratos_arriendo (inmueble_id, estado);

CREATE TABLE contrato_codeudores (
    contrato_id INTEGER NOT NULL REFERENCES contratos_arriendo(id) ON DELETE CASCADE,
    persona_id  INTEGER NOT NULL REFERENCES personas(id) ON DELETE RESTRICT,
    PRIMARY KEY (contrato_id, persona_id)
);

CREATE TABLE comisiones (
    id                     INTEGER PRIMARY KEY AUTOINCREMENT,
    inmueble_id            INTEGER NOT NULL REFERENCES inmuebles(id) ON DELETE RESTRICT,
    tipo                   TEXT NOT NULL CHECK (tipo IN ('venta','arriendo')),
    contrato_id            INTEGER REFERENCES contratos_arriendo(id) ON DELETE RESTRICT,
    base                   INTEGER NOT NULL CHECK (base > 0),                 -- precio de venta o canon mensual
    pct_pactado            REAL NOT NULL CHECK (pct_pactado > 0 AND pct_pactado <= 1000),
    pagador                TEXT NOT NULL CHECK (pagador IN ('propietario','comprador','arrendatario','compartida')),
    pct_pagador_propietario REAL CHECK (pct_pagador_propietario BETWEEN 0 AND 100),   -- solo si es compartida
    estado                 TEXT NOT NULL DEFAULT 'pendiente' CHECK (estado IN ('pendiente','facturada','cobrada','anulada')),
    fecha                  TEXT NOT NULL,
    fecha_cobro            TEXT,
    -- tarifas aplicadas (copia de `parametros` al crear)
    aplica_iva             INTEGER NOT NULL DEFAULT 1 CHECK (aplica_iva IN (0,1)),
    aplica_retenciones     INTEGER NOT NULL DEFAULT 1 CHECK (aplica_retenciones IN (0,1)),
    iva_pct                REAL NOT NULL, retefuente_pct REAL NOT NULL, reteica_por_mil REAL NOT NULL, reteiva_pct REAL NOT NULL,
    retefuente_base_minima INTEGER NOT NULL DEFAULT 0,
    -- resultado
    valor_comision         INTEGER NOT NULL, iva INTEGER NOT NULL, retefuente INTEGER NOT NULL, reteica INTEGER NOT NULL, reteiva INTEGER NOT NULL,
    total_facturable       INTEGER NOT NULL, neto_a_recibir INTEGER NOT NULL,
    -- reparto
    asesor                 TEXT, asesor_pct REAL NOT NULL DEFAULT 0 CHECK (asesor_pct BETWEEN 0 AND 100),
    referido               TEXT, referido_pct REAL NOT NULL DEFAULT 0 CHECK (referido_pct BETWEEN 0 AND 100),
    asesor_valor           INTEGER NOT NULL DEFAULT 0, referido_valor INTEGER NOT NULL DEFAULT 0, inmobiliaria_valor INTEGER NOT NULL,
    nota                   TEXT,
    creado_por             TEXT,
    creado_en              TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ','now')),
    CHECK (asesor_pct + referido_pct <= 100)
);
CREATE INDEX comisiones_fecha_idx ON comisiones (fecha);

CREATE TABLE facturas (
    id                INTEGER PRIMARY KEY AUTOINCREMENT,
    tipo              TEXT NOT NULL DEFAULT 'factura' CHECK (tipo IN ('factura','nota_credito')),
    prefijo           TEXT NOT NULL DEFAULT '',
    numero            INTEGER NOT NULL,
    fecha             TEXT NOT NULL,
    comision_id       INTEGER REFERENCES comisiones(id) ON DELETE RESTRICT,
    factura_origen_id INTEGER REFERENCES facturas(id) ON DELETE RESTRICT,     -- para notas crédito
    cliente_id        INTEGER NOT NULL REFERENCES personas(id) ON DELETE RESTRICT,
    concepto          TEXT NOT NULL,
    pct_comision      REAL,                                                  -- porción de la comisión que cubre (facturas)
    subtotal          INTEGER NOT NULL CHECK (subtotal >= 0),
    iva               INTEGER NOT NULL CHECK (iva >= 0),
    total             INTEGER NOT NULL CHECK (total >= 0),
    retefuente        INTEGER NOT NULL DEFAULT 0, reteica INTEGER NOT NULL DEFAULT 0, reteiva INTEGER NOT NULL DEFAULT 0,
    motivo            TEXT,
    dian_estado       TEXT NOT NULL DEFAULT 'no_enviada' CHECK (dian_estado IN ('no_enviada','enviada','aceptada','rechazada')),
    dian_cufe         TEXT,
    dian_respuesta    TEXT,
    dian_fecha        TEXT,
    creado_por        TEXT,
    creado_en         TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ','now')),
    UNIQUE (tipo, prefijo, numero),
    CHECK (tipo = 'factura' OR factura_origen_id IS NOT NULL)
);
CREATE INDEX facturas_fecha_idx ON facturas (fecha);

CREATE TABLE cobros (
    id                INTEGER PRIMARY KEY AUTOINCREMENT,
    contrato_id       INTEGER NOT NULL REFERENCES contratos_arriendo(id) ON DELETE RESTRICT,
    periodo           TEXT NOT NULL CHECK (periodo GLOB '[0-9][0-9][0-9][0-9]-[0-9][0-9]'),
    concepto          TEXT NOT NULL DEFAULT 'canon' CHECK (concepto IN ('canon','administracion','servicios','mora','otro')),
    fecha_vencimiento TEXT NOT NULL,
    valor             INTEGER NOT NULL CHECK (valor > 0),
    anulado           INTEGER NOT NULL DEFAULT 0 CHECK (anulado IN (0,1)),
    nota              TEXT,
    creado_en         TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ','now'))
);
CREATE UNIQUE INDEX cobros_canon_unico ON cobros (contrato_id, periodo) WHERE concepto = 'canon';
CREATE INDEX cobros_venc_idx ON cobros (fecha_vencimiento);

CREATE TABLE recibos_caja (
    id         INTEGER PRIMARY KEY AUTOINCREMENT,
    prefijo    TEXT NOT NULL DEFAULT '',
    numero     INTEGER NOT NULL,
    fecha      TEXT NOT NULL,
    persona_id INTEGER REFERENCES personas(id) ON DELETE RESTRICT,
    valor      INTEGER NOT NULL CHECK (valor > 0),
    medio      TEXT NOT NULL DEFAULT 'efectivo' CHECK (medio IN ('efectivo','transferencia','consignacion','pse','cheque','otro')),
    referencia TEXT,
    nota       TEXT,
    estado     TEXT NOT NULL DEFAULT 'emitido' CHECK (estado IN ('emitido','anulado')),
    creado_por TEXT,
    creado_en  TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ','now')),
    UNIQUE (prefijo, numero)
);
CREATE INDEX recibos_fecha_idx ON recibos_caja (fecha);

CREATE TABLE recibo_aplicaciones (
    id        INTEGER PRIMARY KEY AUTOINCREMENT,
    recibo_id INTEGER NOT NULL REFERENCES recibos_caja(id) ON DELETE CASCADE,
    cobro_id  INTEGER NOT NULL REFERENCES cobros(id) ON DELETE RESTRICT,
    valor     INTEGER NOT NULL CHECK (valor > 0)
);
CREATE INDEX aplicaciones_cobro_idx ON recibo_aplicaciones (cobro_id);

CREATE TABLE paz_y_salvos (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    prefijo     TEXT NOT NULL DEFAULT '',
    numero      INTEGER NOT NULL,
    contrato_id INTEGER NOT NULL REFERENCES contratos_arriendo(id) ON DELETE RESTRICT,
    fecha       TEXT NOT NULL,
    nota        TEXT,
    creado_por  TEXT,
    creado_en   TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ','now')),
    UNIQUE (prefijo, numero)
);

CREATE TABLE gastos (
    id              INTEGER PRIMARY KEY AUTOINCREMENT,
    inmueble_id     INTEGER NOT NULL REFERENCES inmuebles(id) ON DELETE RESTRICT,
    fecha           TEXT NOT NULL,
    categoria       TEXT NOT NULL CHECK (categoria IN ('mantenimiento','impuesto','servicio','seguro','administracion_ph','otro')),
    subtipo         TEXT,                                  -- p. ej. 'predial' dentro de impuesto
    descripcion     TEXT NOT NULL,
    valor           INTEGER NOT NULL CHECK (valor > 0),
    a_cargo_de      TEXT NOT NULL DEFAULT 'propietario' CHECK (a_cargo_de IN ('propietario','inmobiliaria','arrendatario')),
    proveedor       TEXT,
    estado_pago     TEXT NOT NULL DEFAULT 'pagado' CHECK (estado_pago IN ('pagado','pendiente')),
    soporte_archivo TEXT, soporte_nombre TEXT, soporte_mime TEXT, soporte_tamano INTEGER,
    creado_por      TEXT,
    creado_en       TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ','now'))
);
CREATE INDEX gastos_inm_fecha_idx ON gastos (inmueble_id, fecha);

CREATE TABLE liquidaciones (
    id                INTEGER PRIMARY KEY AUTOINCREMENT,
    prefijo           TEXT NOT NULL DEFAULT '',
    numero            INTEGER NOT NULL,
    propietario_id    INTEGER NOT NULL REFERENCES personas(id) ON DELETE RESTRICT,
    periodo           TEXT NOT NULL CHECK (periodo GLOB '[0-9][0-9][0-9][0-9]-[0-9][0-9]'),
    estado            TEXT NOT NULL DEFAULT 'cerrada' CHECK (estado IN ('cerrada','girada')),
    canones_recibidos INTEGER NOT NULL, comision INTEGER NOT NULL, iva_comision INTEGER NOT NULL,
    administracion    INTEGER NOT NULL, predial INTEGER NOT NULL, reparaciones INTEGER NOT NULL, otros INTEGER NOT NULL,
    saldo_a_girar     INTEGER NOT NULL,                    -- puede ser negativo: saldo a favor de la inmobiliaria
    detalle           TEXT NOT NULL DEFAULT '{}' CHECK (json_valid(detalle)),
    fecha_giro        TEXT,
    referencia_giro   TEXT,
    creado_por        TEXT,
    creado_en         TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ','now')),
    UNIQUE (propietario_id, periodo),
    UNIQUE (prefijo, numero)
);

-- Parámetros fiscales y de negocio. Todos configurables; los marcados (1) deben validarlos un contador o abogado.
INSERT INTO parametros (clave, valor, descripcion, requiere_confirmar) VALUES
 ('comision.venta_pct',            '3',    'Comisión por defecto en ventas (% del precio)', 1),
 ('comision.arriendo_pct',         '100',  'Comisión por defecto al arrendar (% de un canon mensual)', 1),
 ('comision.administracion_pct',   '10',   'Comisión por defecto por administrar un arriendo (% del canon recaudado)', 1),
 ('reparto.asesor_pct_defecto',    '50',   'Parte de la comisión que se lleva el asesor por defecto (%)', 1),
 ('reparto.referido_pct_defecto',  '0',    'Parte de la comisión que se lleva el referido por defecto (%)', 1),
 ('iva.pct',                       '19',   'IVA sobre comisiones (%)', 1),
 ('retefuente.pct',                '11',   'Retención en la fuente que practican sobre la comisión (%; comisiones/honorarios)', 1),
 ('retefuente.base_minima_cop',    '0',    'Base mínima de la comisión para que aplique retención en la fuente (COP)', 1),
 ('reteica.por_mil',               '10',   'Retención de ICA sobre la comisión (por mil)', 1),
 ('ica.por_mil',                   '10',   'Tarifa de ICA que causa la inmobiliaria sobre sus ingresos (por mil)', 1),
 ('reteiva.pct_del_iva',           '15',   'Retención de IVA (% del IVA facturado)', 1),
 ('liquidacion.iva_sobre_comision','1',    '1 = la comisión de administración lleva IVA en la liquidación al propietario; 0 = no', 1),
 ('canon.max_pct_valor_comercial', '1',    'Ley 820 de 2003 (vivienda urbana): el canon mensual no puede exceder este % del valor comercial', 1),
 ('contrato.dias_alerta_renovacion','90',  'Días antes del vencimiento del contrato en que empieza la alerta de renovación', 0),
 ('contrato.incremento_max_pct_ipc','100', 'Tope del incremento anual como % del IPC del año anterior (Ley 820: 100 %)', 1),
 ('mora.dias_gracia',              '0',    'Días después del vencimiento antes de contar mora', 0),
 ('mora.tasa_mensual_pct',         '2',    'Interés de mora mensual sobre el saldo vencido (%; no puede superar la tasa de usura)', 1);
