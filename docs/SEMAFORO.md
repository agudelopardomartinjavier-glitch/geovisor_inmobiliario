# Semáforo de riesgo jurídico-ambiental (reglas v1.0)

Indicador **preliminar y automático**. No reemplaza el estudio de títulos ni el concepto de la oficina de planeación.
El código está en `backend/app/semaforo.py` (reglas, funciones puras con pruebas) y `backend/app/semaforo_espacial.py` (cruce con las capas).

## Cómo se asigna el color
Se evalúan las reglas de abajo. **Gana el peor nivel**: si alguna regla es roja → ROJO; si no, y alguna es amarilla → AMARILLO; si ninguna → VERDE.

Los porcentajes son «% del área del predio». El predio se toma del catastro por número predial (si el número se repite, como en propiedad horizontal, se unen las geometrías); sin predio se usa el punto del inmueble.
Los umbrales son **parámetros** (tabla `parametros`, editables en `PUT /admin/parametros/{clave}`):

| Parámetro | Valor inicial | Qué hace |
|---|---|---|
| `semaforo.umbral_rojo_pct` | 50 | Amenaza o protección ≥ este % → ROJO (# CONFIRMAR) |
| `semaforo.umbral_amarillo_pct` | 5 | Amenaza, protección o conflicto ≥ este % → AMARILLO; menos se ignora (astillas del cruce) (# CONFIRMAR) |
| `soportes.vigencia_certificado_tradicion_dias` | 30 | Vigencia asumida del certificado de tradición si no tiene fecha de vencimiento (# CONFIRMAR con abogado) |

### Ambiental (cruce espacial)
| Código | Nivel | Regla | Capas |
|---|---|---|---|
| A1 | rojo | Amenaza (inundación o deslizamiento) ≥ umbral rojo | `cu_13_amenazas` |
| A2 | amarillo | Amenaza entre umbral amarillo y umbral rojo | `cu_13_amenazas` |
| A3 | rojo | Protección ≥ umbral rojo | `cu_12_proteccion`, `cg_3_proteccion_hidrica` (rondas y nacimientos), `gen_humedales`, `cr_2_areas_manejo_especial`, `gen_areas_especiales`, uso rural de protección (AAPP, APSH, APNS, AME en `cr_5_usos_suelo`), POMCA Guayuriba «Conservación y Protección Ambiental», POMCA Acacías–Pajure CS/PR/RS |
| A4 | amarillo | Protección entre umbral amarillo y rojo | las mismas |
| A0 | amarillo | No hay ubicación ni predio: no se pudo medir | — |

Las capas de protección se **unen** antes de medir el porcentaje (una zona que está en dos capas no se cuenta doble).

### Normativo (uso del suelo)
| Código | Nivel | Regla |
|---|---|---|
| N1 | amarillo | Conflicto de uso del suelo ≥ umbral amarillo (`cu_8_conflictos_uso`, `cr_9_conflictos_uso`) |
| N2 | amarillo | El predio no cae en ninguna capa de uso del suelo |
| N3 | amarillo | El uso dominante exige verificar el tipo de inmueble (tabla `USO_A_TIPOS_A_VERIFICAR`: p. ej. local en área residencial, casa en área minera o de protección) (# CONFIRMAR con un asesor urbanístico) |

El uso dominante es el de mayor área: urbano (`cu_7_usos_del_suelo`) si la clasificación dominante es SU, SE o SUCP; si no, rural (`cr_5_usos_suelo`).

### Jurídico (módulo privado)
| Código | Nivel | Regla |
|---|---|---|
| J1 | rojo | Embargo |
| J2 | rojo | Litigio informado |
| J3 | rojo | Sucesión pendiente |
| J4 | amarillo | Hipoteca vigente |
| J5 | amarillo | Afectación a vivienda familiar |
| J6 | amarillo | Servidumbres registradas |
| J7 | amarillo | Predial en mora |
| J8 | amarillo | Valorización pendiente |
| J9 | amarillo | Estado jurídico incompleto: falta la matrícula o algún gravamen (hipoteca, embargo, afectación, sucesión) está sin confirmar |
| J10 | amarillo | Sin certificado de tradición vigente (falta, está vencido o, sin fecha de vencimiento, tiene más de la vigencia asumida) |
| J0 | amarillo | Módulo jurídico sin diligenciar |

Consecuencia práctica: **mientras no se diligencie lo jurídico, ningún inmueble puede quedar en verde**. Es intencional: verde significa «verificado».

## Qué ve el público
Solo el **color** y un **resumen genérico** por categorías («Requiere verificación en: aspectos jurídicos y uso del suelo…»). Nunca el motivo exacto (embargo, litigio, porcentajes, matrícula). Hay pruebas automáticas que lo verifican (`tests/test_api_ficha.py`).
El detalle completo (hallazgos y mediciones) se guarda en `inmueble_semaforo.detalle` y solo lo devuelve `GET /admin/inmuebles/{id}/semaforo`.

## Limitaciones conocidas
- **Amenazas:** la capa del POT (`cu_13_amenazas`) cubre solo el área urbana. En suelo rural no hay dato de amenaza: el semáforo no la evalúa (el detalle privado lo indica).
- **Centros de salud:** no hay capa en el proyecto; la distancia queda en «sin dato». Para incorporarla, agregar la capa a `data/geovisor.gpkg`, regenerar con `scripts/crear_db.py` y añadirla a `FUENTES` en `backend/app/entorno.py`.
- La compatibilidad de uso (N3) es una tabla simplificada; las fichas normativas reales del POT pueden ser más finas.
- Se recalcula al crear/editar un inmueble, guardar lo jurídico y subir o borrar soportes. Un soporte que **vence con el paso del tiempo** no dispara el recálculo solo: usar `POST /admin/semaforo/recalcular` (o programarlo a diario en la Fase 7).
