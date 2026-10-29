# Reporte de Fase 2 — consolidación

Generado: 2026-10-29  
Salida: `data/geovisor.gpkg` (EPSG:9377, geometrías MULTI, reparadas con `makevalid`).

Convención de nombres: minúsculas, sin tildes, espacios/guiones → `_`. Capa catastral = `predios`; POMCA sin prefijo `za_`.

| Origen | Capa | CRS origen | Ent. orig. | Ent. final | Inválidas orig. | Inválidas final | Vacías final |
|---|---|---|---|---|---|---|---|
| catastro\Base Catastral Acacias.gpkg | predios | ESRI:103599 | 31341 | 31341 | 0 | 0 | 0 |
| pot\CG-2_CLASIFICACION_SUELO.shp | cg_2_clasificacion_suelo | EPSG:3116 | 5 | 5 | 0 | 0 | 0 |
| pot\CG-3_NACIMIENTOS.shp | cg_3_nacimientos | EPSG:3116 | 332 | 332 | 0 | 0 | 0 |
| pot\CG-3_PROTECCION_HIDRICA.shp | cg_3_proteccion_hidrica | EPSG:3116 | 442 | 442 | 0 | 0 | 0 |
| pot\CG-4_VIAS_INTEGRACION_REGIONAL.shp | cg_4_vias_integracion_regional | EPSG:3116 | 13 | 13 | 0 | 0 | 0 |
| pot\CG-5_UNIDADES_PLANEAMIENTO.shp | cg_5_unidades_planeamiento | EPSG:3116 | 10 | 10 | 0 | 0 | 0 |
| pot\CG-6_ACUEDUCTO_A_DESARROLLAR.shp | cg_6_acueducto_a_desarrollar | EPSG:3116 | 4 | 4 | 0 | 0 | 0 |
| pot\CR-11_RED_VIAL.shp | cr_11_red_vial | EPSG:3116 | 99 | 99 | 0 | 0 | 0 |
| pot\CR-12_EQUIPAMIENTOS_RURALES.shp | cr_12_equipamientos_rurales | EPSG:3116 | 1 | 1 | 0 | 0 | 0 |
| pot\CR-13_ACUEDUCTO_RURAL.shp | cr_13_acueducto_rural | EPSG:3116 | 4 | 4 | 0 | 0 | 0 |
| pot\CR-2_AREAS_MANEJO_ESPECIAL.shp | cr_2_areas_manejo_especial | EPSG:3116 | 3 | 3 | 0 | 0 | 0 |
| pot\CR-2_VEREDAS.shp | cr_2_veredas | EPSG:3116 | 49 | 49 | 0 | 0 | 0 |
| pot\CR-5_DESTINACION_ESPECIFICA.shp | cr_5_destinacion_especifica | EPSG:3116 | 335 | 335 | 0 | 0 | 0 |
| pot\CR-5_USOS_SUELO.shp | cr_5_usos_suelo | EPSG:3116 | 698 | 698 | 0 | 0 | 0 |
| pot\CR-9_CONFLICTOS_USO.shp | cr_9_conflictos_uso | EPSG:3116 | 2 | 2 | 0 | 0 | 0 |
| pot\CU-10_ESPACIO_PUBLICO.shp | cu_10_espacio_publico | EPSG:3116 | 73 | 73 | 0 | 0 | 0 |
| pot\CU-11_EQUIPAMIENTOS.shp | cu_11_equipamientos | EPSG:3116 | 69 | 69 | 0 | 0 | 0 |
| pot\CU-12_PROTECCION.shp | cu_12_proteccion | EPSG:3116 | 16 | 16 | 0 | 0 | 0 |
| pot\CU-12_SISTEMA_VIAL.shp | cu_12_sistema_vial | EPSG:3116 | 976 | 976 | 0 | 0 | 0 |
| pot\CU-13_AMENAZAS.shp | cu_13_amenazas | EPSG:3116 | 18 | 18 | 0 | 0 | 0 |
| pot\CU-15_ACUEDUCTO.shp | cu_15_acueducto | EPSG:3116 | 5 | 5 | 0 | 0 | 0 |
| pot\CU-16_ALCANTARILLADO.shp | cu_16_alcantarillado | EPSG:3116 | 6 | 6 | 0 | 0 | 0 |
| pot\CU-17_ALCANTARILLADO_PLUVIAL.shp | cu_17_alcantarillado_pluvial | EPSG:3116 | 19 | 19 | 0 | 0 | 0 |
| pot\CU-1_DRENAJE.shp | cu_1_drenaje | EPSG:3116 | 41 | 41 | 0 | 0 | 0 |
| pot\CU-1_MANZANAS.shp | cu_1_manzanas | EPSG:3116 | 1088 | 1088 | 0 | 0 | 0 |
| pot\CU-1_NUMERO_BARRIO.shp | cu_1_numero_barrio | EPSG:3116 | 97 | 97 | 0 | 0 | 0 |
| pot\CU-1_PERIMETROS.shp | cu_1_perimetros | EPSG:3116 | 2 | 2 | 0 | 0 | 0 |
| pot\CU-1_PUNTOS_PERIMETRO.shp | cu_1_puntos_perimetro | EPSG:3116 | 341 | 341 | 0 | 0 | 0 |
| pot\CU-2_PERIMETROS.shp | cu_2_perimetros | EPSG:3116 | 2 | 2 | 0 | 0 | 0 |
| pot\CU-3_BARRIOS.shp | cu_3_barrios | EPSG:3116 | 97 | 97 | 0 | 0 | 0 |
| pot\CU-4_UPZ.shp | cu_4_upz | EPSG:3116 | 4 | 4 | 0 | 0 | 0 |
| pot\CU-5_EEP_URBANA.shp | cu_5_eep_urbana | EPSG:3116 | 68 | 68 | 0 | 0 | 0 |
| pot\CU-6_TRATAMIENTOS.shp | cu_6_tratamientos | EPSG:3116 | 71 | 71 | 0 | 0 | 0 |
| pot\CU-7_USOS_DEL_SUELO.shp | cu_7_usos_del_suelo | EPSG:3116 | 35 | 35 | 0 | 0 | 0 |
| pot\CU-8_CONFLICTOS_USO.shp | cu_8_conflictos_uso | EPSG:3116 | 15 | 15 | 0 | 0 | 0 |
| pot\CU-9_DENSIDADES.shp | cu_9_densidades | EPSG:3116 | 36 | 36 | 0 | 0 | 0 |
| pot\GEN_AREAS_ESPECIALES.shp | gen_areas_especiales | EPSG:3116 | 5 | 5 | 0 | 0 | 0 |
| pot\GEN_COORDENADAS.shp | gen_coordenadas | EPSG:3116 | 18 | 18 | 0 | 0 | 0 |
| pot\GEN_COORDENADAS_ROTULOS.shp | gen_coordenadas_rotulos | EPSG:3116 | 14 | 14 | 0 | 0 | 0 |
| pot\GEN_ESCUELAS.shp | gen_escuelas | EPSG:3116 | 140 | 140 | 0 | 0 | 0 |
| pot\GEN_ESCUELAS_PUNTOS.shp | gen_escuelas_puntos | EPSG:3116 | 35 | 35 | 0 | 0 | 0 |
| pot\GEN_HIDROGRAFIA_LINEAS.shp | gen_hidrografia_lineas | EPSG:3116 | 2097 | 2097 | 0 | 0 | 0 |
| pot\GEN_HUMEDALES.shp | gen_humedales | EPSG:3116 | 58 | 58 | 0 | 0 | 0 |
| pot\GEN_LIMITES.shp | gen_limites | EPSG:3116 | 151 | 151 | 0 | 0 | 0 |
| pot\GEN_VIAS.shp | gen_vias | EPSG:3116 | 15 | 15 | 0 | 0 | 0 |
| pomca\ZA_POMCA_ACACIAS_PAJURE.shp | pomca_acacias_pajure | MAGNA_Colombia_CTM12 | 5 | 5 | 3 | 0 | 0 |
| pomca\ZA_POMCA_GUAYURIBA.shp | pomca_guayuriba | MAGNA_Colombia_CTM12 | 8518 | 8518 | 31 | 0 | 0 |

**Totales:** 47 capas; entidades origen 47473, final 47473; inválidas 34 → 0.


## Campos renombrados

- **predios**: `OBJECTID`→`objectid`, `CODIGO`→`codigo`, `MANZANA_CODIGO`→`manzana_codigo`, `NUMERO_SUBTERRANEOS`→`numero_subterraneos`, `CODIGO_ANTERIOR`→`codigo_anterior`, `USUARIO_LOG`→`usuario_log`, `FECHA_LOG`→`fecha_log`, `GLOBALID`→`globalid`, `GLOBALID_SNC`→`globalid_snc`, `SHAPE_Length`→`shape_length`, `SHAPE_Area`→`shape_area`, `CODIGO_DEPARTAMENTO`→`codigo_departamento`, `OBJECTID_2`→`objectid_2`, `CODIGO_2`→`codigo_2`, `VEREDA_CODIGO`→`vereda_codigo`, `NUMERO_SUBTERRANEOS_2`→`numero_subterraneos_2`, `CODIGO_ANTERIOR_2`→`codigo_anterior_2`, `USUARIO_LOG_2`→`usuario_log_2`, `FECHA_LOG_2`→`fecha_log_2`, `GLOBALID_2`→`globalid_2`, `GLOBALID_SNC_2`→`globalid_snc_2`, `SHAPE_Length_2`→`shape_length_2`, `SHAPE_Area_2`→`shape_area_2`, `CODIGO_DEPARTAMENTO_2`→`codigo_departamento_2`
- **pomca_acacias_pajure**: `OBJECTID`→`objectid`, `CodigoFin`→`codigofin`, `Area`→`area`, `Zonificaci`→`zonificaci`, `Shape_Leng`→`shape_leng`, `Shape_Area`→`shape_area`
- **pomca_guayuriba**: `OBJECTID`→`objectid`, `CAT_ORD`→`cat_ord`, `ZO_US_MA`→`zo_us_ma`, `SZO_US_M`→`szo_us_m`, `NOMENCLAT`→`nomenclat`, `AREA_ha`→`area_ha`, `Categ_Orde`→`categ_orde`, `Zon_UyM`→`zon_uym`, `Subz_UyM`→`subz_uym`, `Shape_Leng`→`shape_leng`, `Shape_Area`→`shape_area`