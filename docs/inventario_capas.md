# Inventario de capas

Proyecto origen: `D:/Contrato 500 Lincecias/Capas POT.qgz` (copia en `data/raw/Capas_POT_copia.qgz`).

**SENSIBLE** = campo que puede contener datos personales; no debe llegar a vistas ni vector tiles públicos.


## CG-2_CLASIFICACION_SUELO
- Fuente: `D:\Contrato 500 Lincecias\02_GENERAL\CG-02_Clasificacion_del_Territorio\CG-2_CLASIFICACION_SUELO.shp`
- Formato: ESRI Shapefile
- Geometría: Polygon
- CRS: EPSG:3116
- Entidades: 5
- Geometrías inválidas: 0 | vacías/nulas: 0


| Campo | Tipo | Ejemplos | Marca |
|---|---|---|---|
| codigo | String | SU; SE; SUCP | PREDIAL? |
| convencion | String | Suelo urbano; Suelo de expansión urbana; Suelo urbano centros poblados |  |
| area_m2 | Real | 5668460.47; 4721777.58; 1147212.64 |  |
| area_ha | Real | 566.846; 472.1778; 114.7213 |  |

## CG-3_NACIMIENTOS
- Fuente: `D:\Contrato 500 Lincecias\02_GENERAL\CG-03_Estructura_Ecologica_Principal\CG-3_NACIMIENTOS.shp`
- Formato: ESRI Shapefile
- Geometría: Point
- CRS: EPSG:3116
- Entidades: 332
- Geometrías inválidas: 0 | vacías/nulas: 0


| Campo | Tipo | Ejemplos | Marca |
|---|---|---|---|
| convencion | String | Nacimiento |  |
| x | Real | 1029241.06; 1037754.37; 1037575.12 |  |
| y | Real | 955075.25; 955015.5; 954273.0 |  |

## CG-3_PROTECCION_HIDRICA
- Fuente: `D:\Contrato 500 Lincecias\02_GENERAL\CG-03_Estructura_Ecologica_Principal\CG-3_PROTECCION_HIDRICA.shp`
- Formato: ESRI Shapefile
- Geometría: Polygon
- CRS: EPSG:3116
- Entidades: 442
- Geometrías inválidas: 0 | vacías/nulas: 0


| Campo | Tipo | Ejemplos | Marca |
|---|---|---|---|
| codigo | String | APN; APH | PREDIAL? |
| convencion | String | Área de protección de nacedero; Área de protección hídrica |  |
| area_m2 | Real | 31374.94; 31014.89; 31014.82 |  |
| area_ha | Real | 3.1375; 3.1015; 3.0284 |  |

## CG-4_VIAS_INTEGRACION_REGIONAL
- Fuente: `D:\Contrato 500 Lincecias\02_GENERAL\CG-04_Contexto_Regional\CG-4_VIAS_INTEGRACION_REGIONAL.shp`
- Formato: ESRI Shapefile
- Geometría: Line String
- CRS: EPSG:3116
- Entidades: 13
- Geometrías inválidas: 0 | vacías/nulas: 0


| Campo | Tipo | Ejemplos | Marca |
|---|---|---|---|
| codigo | String | VLMG; DCAV | PREDIAL? |
| convencion | String | Vía Ladrillera - Manzanares - Guayabetal; Doble calzada Acacías - Villavicencio |  |
| longitud_m | Real | 1486.83; 640.62; 305.61 |  |

## CG-5_GEN_AREAS_ESPECIALES
- Fuente: `D:\Contrato 500 Lincecias\00_CONVENCIONES_GENERALES_RURALES\GEN_AREAS_ESPECIALES.shp`
- Formato: ESRI Shapefile
- Geometría: Polygon
- CRS: EPSG:3116
- Entidades: 5
- Geometrías inválidas: 0 | vacías/nulas: 0


| Campo | Tipo | Ejemplos | Marca |
|---|---|---|---|
| codigo | String | PNS; BNG; CPO | PREDIAL? |
| convencion | String | Parque Natural Sumapaz; Bosque natural Los Guayupes; Colonia Penal de Oriente |  |
| area_m2 | Real | 42696022.66; 42696021.7; 127782199.87 |  |
| area_ha | Real | 4269.6023; 4269.6022; 12778.22 |  |

## CG-5_GEN_COORDENADAS
- Fuente: `D:\Contrato 500 Lincecias\00_CONVENCIONES_GENERALES_RURALES\GEN_COORDENADAS.shp`
- Formato: ESRI Shapefile
- Geometría: Line String
- CRS: EPSG:3116
- Entidades: 18
- Geometrías inválidas: 0 | vacías/nulas: 0


| Campo | Tipo | Ejemplos | Marca |
|---|---|---|---|
| convencion | String | Coordenadas |  |

## CG-5_GEN_COORDENADAS_ROTULOS
- Fuente: `D:\Contrato 500 Lincecias\00_CONVENCIONES_GENERALES_RURALES\GEN_COORDENADAS_ROTULOS.shp`
- Formato: ESRI Shapefile
- Geometría: Point
- CRS: EPSG:3116
- Entidades: 14
- Geometrías inválidas: 0 | vacías/nulas: 0


| Campo | Tipo | Ejemplos | Marca |
|---|---|---|---|
| texto | String | 1040000 m.E.; 1000000 m.E.; 1010000 m.E. |  |

## CG-5_GEN_ESCUELAS
- Fuente: `D:\Contrato 500 Lincecias\00_CONVENCIONES_GENERALES_RURALES\GEN_ESCUELAS.shp`
- Formato: ESRI Shapefile
- Geometría: Polygon
- CRS: EPSG:3116
- Entidades: 140
- Geometrías inválidas: 0 | vacías/nulas: 0


| Campo | Tipo | Ejemplos | Marca |
|---|---|---|---|
| codigo | String | ESC | PREDIAL? |
| convencion | String | Escuela o colegio |  |

## CG-5_GEN_ESCUELAS_PUNTOS
- Fuente: `D:\Contrato 500 Lincecias\00_CONVENCIONES_GENERALES_RURALES\GEN_ESCUELAS_PUNTOS.shp`
- Formato: ESRI Shapefile
- Geometría: Point
- CRS: EPSG:3116
- Entidades: 35
- Geometrías inválidas: 0 | vacías/nulas: 0


| Campo | Tipo | Ejemplos | Marca |
|---|---|---|---|
| convencion | String | Escuela o colegio |  |
| numero | String | 02; 03; 04 |  |

## CG-5_GEN_HIDROGRAFIA_LINEAS
- Fuente: `D:\Contrato 500 Lincecias\00_CONVENCIONES_GENERALES_RURALES\GEN_HIDROGRAFIA_LINEAS.shp`
- Formato: ESRI Shapefile
- Geometría: Line String
- CRS: EPSG:3116
- Entidades: 2097
- Geometrías inválidas: 0 | vacías/nulas: 0


| Campo | Tipo | Ejemplos | Marca |
|---|---|---|---|
| codigo | String | RIO; CQ | PREDIAL? |
| convencion | String | Ríos; Caño o quebrada |  |
| longitud_m | Real | 28705.97; 164435.45; 396.36 |  |

## CG-5_GEN_HUMEDALES
- Fuente: `D:\Contrato 500 Lincecias\00_CONVENCIONES_GENERALES_RURALES\GEN_HUMEDALES.shp`
- Formato: ESRI Shapefile
- Geometría: Polygon
- CRS: EPSG:3116
- Entidades: 58
- Geometrías inválidas: 0 | vacías/nulas: 0


| Campo | Tipo | Ejemplos | Marca |
|---|---|---|---|
| codigo | String | HUM | PREDIAL? |
| convencion | String | Humedal, estero o morichal |  |
| area_m2 | Real | 9605.39; 17398.87; 8384.88 |  |
| area_ha | Real | 0.9605; 1.7399; 0.8385 |  |

## CG-5_GEN_LIMITES
- Fuente: `D:\Contrato 500 Lincecias\00_CONVENCIONES_GENERALES_RURALES\GEN_LIMITES.shp`
- Formato: ESRI Shapefile
- Geometría: Line String
- CRS: EPSG:3116
- Entidades: 151
- Geometrías inválidas: 0 | vacías/nulas: 0


| Campo | Tipo | Ejemplos | Marca |
|---|---|---|---|
| codigo | String | LM; LV; PEU | PREDIAL? |
| convencion | String | Límite municipal; Límite de vereda; Perímetro de expansión urbana |  |
| longitud_m | Real | 217230.86; 58694.27; 29231.59 |  |

## CG-5_GEN_VIAS
- Fuente: `D:\Contrato 500 Lincecias\00_CONVENCIONES_GENERALES_RURALES\GEN_VIAS.shp`
- Formato: ESRI Shapefile
- Geometría: Line String
- CRS: EPSG:3116
- Entidades: 15
- Geometrías inválidas: 0 | vacías/nulas: 0


| Campo | Tipo | Ejemplos | Marca |
|---|---|---|---|
| codigo | String | V1; V2; V3 | PREDIAL? |
| convencion | String | Vía de orden nacional (primer orden); Vía de orden departamental (segundo orde; Vía de orden municipal (tercer orden) |  |
| longitud_m | Real | 25187.44; 30131.56; 14.81 |  |

## CG-5_UNIDADES_PLANEAMIENTO
- Fuente: `D:\Contrato 500 Lincecias\02_GENERAL\CG-05_Unidades_de_Planeamiento_UPR_UPZ\CG-5_UNIDADES_PLANEAMIENTO.shp`
- Formato: ESRI Shapefile
- Geometría: Polygon
- CRS: EPSG:3116
- Entidades: 10
- Geometrías inválidas: 0 | vacías/nulas: 0


| Campo | Tipo | Ejemplos | Marca |
|---|---|---|---|
| codigo | String | UPZ1; UPZ2; UPZ3 | PREDIAL? |
| convencion | String | Unidad de Planeamiento Zonal UPZ1; Unidad de Planeamiento Zonal UPZ2; Unidad de Planeamiento Zonal UPZ3 |  |
| area_m2 | Real | 1829673.95; 2790472.73; 3435476.51 |  |
| area_ha | Real | 182.9674; 279.0473; 343.5477 |  |

## CG-6_ACUEDUCTO_A_DESARROLLAR
- Fuente: `D:\Contrato 500 Lincecias\02_GENERAL\CG-06_Estructura_Funcional\CG-6_ACUEDUCTO_A_DESARROLLAR.shp`
- Formato: ESRI Shapefile
- Geometría: Line String
- CRS: EPSG:3116
- Entidades: 4
- Geometrías inválidas: 0 | vacías/nulas: 0


| Campo | Tipo | Ejemplos | Marca |
|---|---|---|---|
| codigo | String | SAD1; SAD2; SAD3 | PREDIAL? |
| convencion | String | Sistema de acueducto a desarrollar (cont; Sistema de acueducto a desarrollar (cont; Sistema de acueducto a desarrollar (cont |  |
| area_enc_h | Real | 33878.6; 27587.7; 24211.7 |  |
| igual_cr13 | String | Área aferencia acueducto zona norte (ARV; Área aferencia acueducto sur (ACUA 7) |  |

## CR-11_GEN_AREAS_ESPECIALES
- Fuente: `D:\Contrato 500 Lincecias\00_CONVENCIONES_GENERALES_RURALES\GEN_AREAS_ESPECIALES.shp`
- Formato: ESRI Shapefile
- Geometría: Polygon
- CRS: EPSG:3116
- Entidades: 5
- Geometrías inválidas: 0 | vacías/nulas: 0


| Campo | Tipo | Ejemplos | Marca |
|---|---|---|---|
| codigo | String | PNS; BNG; CPO | PREDIAL? |
| convencion | String | Parque Natural Sumapaz; Bosque natural Los Guayupes; Colonia Penal de Oriente |  |
| area_m2 | Real | 42696022.66; 42696021.7; 127782199.87 |  |
| area_ha | Real | 4269.6023; 4269.6022; 12778.22 |  |

## CR-11_GEN_COORDENADAS
- Fuente: `D:\Contrato 500 Lincecias\00_CONVENCIONES_GENERALES_RURALES\GEN_COORDENADAS.shp`
- Formato: ESRI Shapefile
- Geometría: Line String
- CRS: EPSG:3116
- Entidades: 18
- Geometrías inválidas: 0 | vacías/nulas: 0


| Campo | Tipo | Ejemplos | Marca |
|---|---|---|---|
| convencion | String | Coordenadas |  |

## CR-11_GEN_COORDENADAS_ROTULOS
- Fuente: `D:\Contrato 500 Lincecias\00_CONVENCIONES_GENERALES_RURALES\GEN_COORDENADAS_ROTULOS.shp`
- Formato: ESRI Shapefile
- Geometría: Point
- CRS: EPSG:3116
- Entidades: 14
- Geometrías inválidas: 0 | vacías/nulas: 0


| Campo | Tipo | Ejemplos | Marca |
|---|---|---|---|
| texto | String | 1040000 m.E.; 1000000 m.E.; 1010000 m.E. |  |

## CR-11_GEN_ESCUELAS
- Fuente: `D:\Contrato 500 Lincecias\00_CONVENCIONES_GENERALES_RURALES\GEN_ESCUELAS.shp`
- Formato: ESRI Shapefile
- Geometría: Polygon
- CRS: EPSG:3116
- Entidades: 140
- Geometrías inválidas: 0 | vacías/nulas: 0


| Campo | Tipo | Ejemplos | Marca |
|---|---|---|---|
| codigo | String | ESC | PREDIAL? |
| convencion | String | Escuela o colegio |  |

## CR-11_GEN_ESCUELAS_PUNTOS
- Fuente: `D:\Contrato 500 Lincecias\00_CONVENCIONES_GENERALES_RURALES\GEN_ESCUELAS_PUNTOS.shp`
- Formato: ESRI Shapefile
- Geometría: Point
- CRS: EPSG:3116
- Entidades: 35
- Geometrías inválidas: 0 | vacías/nulas: 0


| Campo | Tipo | Ejemplos | Marca |
|---|---|---|---|
| convencion | String | Escuela o colegio |  |
| numero | String | 02; 03; 04 |  |

## CR-11_GEN_HIDROGRAFIA_LINEAS
- Fuente: `D:\Contrato 500 Lincecias\00_CONVENCIONES_GENERALES_RURALES\GEN_HIDROGRAFIA_LINEAS.shp`
- Formato: ESRI Shapefile
- Geometría: Line String
- CRS: EPSG:3116
- Entidades: 2097
- Geometrías inválidas: 0 | vacías/nulas: 0


| Campo | Tipo | Ejemplos | Marca |
|---|---|---|---|
| codigo | String | RIO; CQ | PREDIAL? |
| convencion | String | Ríos; Caño o quebrada |  |
| longitud_m | Real | 28705.97; 164435.45; 396.36 |  |

## CR-11_GEN_HUMEDALES
- Fuente: `D:\Contrato 500 Lincecias\00_CONVENCIONES_GENERALES_RURALES\GEN_HUMEDALES.shp`
- Formato: ESRI Shapefile
- Geometría: Polygon
- CRS: EPSG:3116
- Entidades: 58
- Geometrías inválidas: 0 | vacías/nulas: 0


| Campo | Tipo | Ejemplos | Marca |
|---|---|---|---|
| codigo | String | HUM | PREDIAL? |
| convencion | String | Humedal, estero o morichal |  |
| area_m2 | Real | 9605.39; 17398.87; 8384.88 |  |
| area_ha | Real | 0.9605; 1.7399; 0.8385 |  |

## CR-11_GEN_LIMITES
- Fuente: `D:\Contrato 500 Lincecias\00_CONVENCIONES_GENERALES_RURALES\GEN_LIMITES.shp`
- Formato: ESRI Shapefile
- Geometría: Line String
- CRS: EPSG:3116
- Entidades: 151
- Geometrías inválidas: 0 | vacías/nulas: 0


| Campo | Tipo | Ejemplos | Marca |
|---|---|---|---|
| codigo | String | LM; LV; PEU | PREDIAL? |
| convencion | String | Límite municipal; Límite de vereda; Perímetro de expansión urbana |  |
| longitud_m | Real | 217230.86; 58694.27; 29231.59 |  |

## CR-11_GEN_VIAS
- Fuente: `D:\Contrato 500 Lincecias\00_CONVENCIONES_GENERALES_RURALES\GEN_VIAS.shp`
- Formato: ESRI Shapefile
- Geometría: Line String
- CRS: EPSG:3116
- Entidades: 15
- Geometrías inválidas: 0 | vacías/nulas: 0


| Campo | Tipo | Ejemplos | Marca |
|---|---|---|---|
| codigo | String | V1; V2; V3 | PREDIAL? |
| convencion | String | Vía de orden nacional (primer orden); Vía de orden departamental (segundo orde; Vía de orden municipal (tercer orden) |  |
| longitud_m | Real | 25187.44; 30131.56; 14.81 |  |

## CR-11_RED_VIAL
- Fuente: `D:\Contrato 500 Lincecias\03_RURAL\CR-11_Red_Vial_Rural\CR-11_RED_VIAL.shp`
- Formato: ESRI Shapefile
- Geometría: Line String
- CRS: EPSG:3116
- Entidades: 99
- Geometrías inválidas: 0 | vacías/nulas: 0


| Campo | Tipo | Ejemplos | Marca |
|---|---|---|---|
| codigo | String | VR1; VR2-1; VR3-1 | PREDIAL? |
| orden | String | Primer orden (nacional); Segundo orden (departamental); Tercer orden (municipal) |  |
| convencion | String | Vía rural VR1; Vía rural VR2-1; Vía rural VR3-1 |  |
| capa_cad | String | VR1; VR2-1; VR3-1 |  |
| longitud_m | Real | 25187.44; 30131.56; 14.81 |  |

## CR-12_EQUIPAMIENTOS_RURALES
- Fuente: `D:\Contrato 500 Lincecias\03_RURAL\CR-12_Equipamientos_Rurales\CR-12_EQUIPAMIENTOS_RURALES.shp`
- Formato: ESRI Shapefile
- Geometría: Polygon
- CRS: EPSG:3116
- Entidades: 1
- Geometrías inválidas: 0 | vacías/nulas: 0


| Campo | Tipo | Ejemplos | Marca |
|---|---|---|---|
| codigo | String | TER | PREDIAL? |
| convencion | String | Área para terminal de transportes |  |
| area_m2 | Real | 968161.66 |  |
| area_ha | Real | 96.8162 |  |

## CR-13_ACUEDUCTO_RURAL
- Fuente: `D:\Contrato 500 Lincecias\03_RURAL\CR-13_Acueducto_Rural\CR-13_ACUEDUCTO_RURAL.shp`
- Formato: ESRI Shapefile
- Geometría: Polygon
- CRS: EPSG:3116
- Entidades: 4
- Geometrías inválidas: 0 | vacías/nulas: 0


| Campo | Tipo | Ejemplos | Marca |
|---|---|---|---|
| codigo | String | AURB; ANOR; ASUR | PREDIAL? |
| convencion | String | Área aferencia acueducto área urbana; Área aferencia acueducto zona norte (ARV; Área aferencia acueducto sur (ACUA 7) |  |
| area_m2 | Real | 37816891.36; 275870373.68; 242072950.91 |  |
| area_ha | Real | 3781.6891; 27587.0374; 24207.2951 |  |

## CR-2_AREAS_MANEJO_ESPECIAL
- Fuente: `D:\Contrato 500 Lincecias\03_RURAL\CR-02_Division_Politico_Administrativa\CR-2_AREAS_MANEJO_ESPECIAL.shp`
- Formato: ESRI Shapefile
- Geometría: Polygon
- CRS: EPSG:3116
- Entidades: 3
- Geometrías inválidas: 0 | vacías/nulas: 0


| Campo | Tipo | Ejemplos | Marca |
|---|---|---|---|
| codigo | String | PNS; RNP; CPO | PREDIAL? |
| convencion | String | Parque Natural Sumapaz; Reserva Natural Propuesta; Colonia Penal de Oriente |  |
| area_ha | Real | 4235.77; 12949.02; 4574.23 |  |

## CR-2_GEN_AREAS_ESPECIALES
- Fuente: `D:\Contrato 500 Lincecias\00_CONVENCIONES_GENERALES_RURALES\GEN_AREAS_ESPECIALES.shp`
- Formato: ESRI Shapefile
- Geometría: Polygon
- CRS: EPSG:3116
- Entidades: 5
- Geometrías inválidas: 0 | vacías/nulas: 0


| Campo | Tipo | Ejemplos | Marca |
|---|---|---|---|
| codigo | String | PNS; BNG; CPO | PREDIAL? |
| convencion | String | Parque Natural Sumapaz; Bosque natural Los Guayupes; Colonia Penal de Oriente |  |
| area_m2 | Real | 42696022.66; 42696021.7; 127782199.87 |  |
| area_ha | Real | 4269.6023; 4269.6022; 12778.22 |  |

## CR-2_GEN_COORDENADAS_ROTULOS
- Fuente: `D:\Contrato 500 Lincecias\00_CONVENCIONES_GENERALES_RURALES\GEN_COORDENADAS_ROTULOS.shp`
- Formato: ESRI Shapefile
- Geometría: Point
- CRS: EPSG:3116
- Entidades: 14
- Geometrías inválidas: 0 | vacías/nulas: 0


| Campo | Tipo | Ejemplos | Marca |
|---|---|---|---|
| texto | String | 1040000 m.E.; 1000000 m.E.; 1010000 m.E. |  |

## CR-2_GEN_COORDENADAS
- Fuente: `D:\Contrato 500 Lincecias\00_CONVENCIONES_GENERALES_RURALES\GEN_COORDENADAS.shp`
- Formato: ESRI Shapefile
- Geometría: Line String
- CRS: EPSG:3116
- Entidades: 18
- Geometrías inválidas: 0 | vacías/nulas: 0


| Campo | Tipo | Ejemplos | Marca |
|---|---|---|---|
| convencion | String | Coordenadas |  |

## CR-2_GEN_ESCUELAS_PUNTOS
- Fuente: `D:\Contrato 500 Lincecias\00_CONVENCIONES_GENERALES_RURALES\GEN_ESCUELAS_PUNTOS.shp`
- Formato: ESRI Shapefile
- Geometría: Point
- CRS: EPSG:3116
- Entidades: 35
- Geometrías inválidas: 0 | vacías/nulas: 0


| Campo | Tipo | Ejemplos | Marca |
|---|---|---|---|
| convencion | String | Escuela o colegio |  |
| numero | String | 02; 03; 04 |  |

## CR-2_GEN_ESCUELAS
- Fuente: `D:\Contrato 500 Lincecias\00_CONVENCIONES_GENERALES_RURALES\GEN_ESCUELAS.shp`
- Formato: ESRI Shapefile
- Geometría: Polygon
- CRS: EPSG:3116
- Entidades: 140
- Geometrías inválidas: 0 | vacías/nulas: 0


| Campo | Tipo | Ejemplos | Marca |
|---|---|---|---|
| codigo | String | ESC | PREDIAL? |
| convencion | String | Escuela o colegio |  |

## CR-2_GEN_HIDROGRAFIA_LINEAS
- Fuente: `D:\Contrato 500 Lincecias\00_CONVENCIONES_GENERALES_RURALES\GEN_HIDROGRAFIA_LINEAS.shp`
- Formato: ESRI Shapefile
- Geometría: Line String
- CRS: EPSG:3116
- Entidades: 2097
- Geometrías inválidas: 0 | vacías/nulas: 0


| Campo | Tipo | Ejemplos | Marca |
|---|---|---|---|
| codigo | String | RIO; CQ | PREDIAL? |
| convencion | String | Ríos; Caño o quebrada |  |
| longitud_m | Real | 28705.97; 164435.45; 396.36 |  |

## CR-2_GEN_HUMEDALES
- Fuente: `D:\Contrato 500 Lincecias\00_CONVENCIONES_GENERALES_RURALES\GEN_HUMEDALES.shp`
- Formato: ESRI Shapefile
- Geometría: Polygon
- CRS: EPSG:3116
- Entidades: 58
- Geometrías inválidas: 0 | vacías/nulas: 0


| Campo | Tipo | Ejemplos | Marca |
|---|---|---|---|
| codigo | String | HUM | PREDIAL? |
| convencion | String | Humedal, estero o morichal |  |
| area_m2 | Real | 9605.39; 17398.87; 8384.88 |  |
| area_ha | Real | 0.9605; 1.7399; 0.8385 |  |

## CR-2_GEN_LIMITES
- Fuente: `D:\Contrato 500 Lincecias\00_CONVENCIONES_GENERALES_RURALES\GEN_LIMITES.shp`
- Formato: ESRI Shapefile
- Geometría: Line String
- CRS: EPSG:3116
- Entidades: 151
- Geometrías inválidas: 0 | vacías/nulas: 0


| Campo | Tipo | Ejemplos | Marca |
|---|---|---|---|
| codigo | String | LM; LV; PEU | PREDIAL? |
| convencion | String | Límite municipal; Límite de vereda; Perímetro de expansión urbana |  |
| longitud_m | Real | 217230.86; 58694.27; 29231.59 |  |

## CR-2_GEN_VIAS
- Fuente: `D:\Contrato 500 Lincecias\00_CONVENCIONES_GENERALES_RURALES\GEN_VIAS.shp`
- Formato: ESRI Shapefile
- Geometría: Line String
- CRS: EPSG:3116
- Entidades: 15
- Geometrías inválidas: 0 | vacías/nulas: 0


| Campo | Tipo | Ejemplos | Marca |
|---|---|---|---|
| codigo | String | V1; V2; V3 | PREDIAL? |
| convencion | String | Vía de orden nacional (primer orden); Vía de orden departamental (segundo orde; Vía de orden municipal (tercer orden) |  |
| longitud_m | Real | 25187.44; 30131.56; 14.81 |  |

## CR-2_VEREDAS
- Fuente: `D:\Contrato 500 Lincecias\03_RURAL\CR-02_Division_Politico_Administrativa\CR-2_VEREDAS.shp`
- Formato: ESRI Shapefile
- Geometría: Polygon
- CRS: EPSG:3116
- Entidades: 49
- Geometrías inválidas: 0 | vacías/nulas: 0


| Campo | Tipo | Ejemplos | Marca |
|---|---|---|---|
| numero | Integer64 | 36; 26; 3 |  |
| vereda | String | Portachuelo; Loma del Pañuelo; Brisas del Guayuriba |  |
| area_m2 | Real | 20693673.7; 2472621.86; 10282548.16 |  |
| area_ha | Real | 2069.3674; 247.2622; 1028.2548 |  |

## CR-5_DESTINACION_ESPECIFICA
- Fuente: `D:\Contrato 500 Lincecias\03_RURAL\CR-05_Reglamentacion_Usos_del_Suelo\CR-5_DESTINACION_ESPECIFICA.shp`
- Formato: ESRI Shapefile
- Geometría: Polygon
- CRS: EPSG:3116
- Entidades: 335
- Geometrías inválidas: 0 | vacías/nulas: 0


| Campo | Tipo | Ejemplos | Marca |
|---|---|---|---|
| codigo | String | PF; PE; AP | PREDIAL? |
| convencion | String | Planta de faenado (9); Área Parque Ecoeficiente (4a); Área de protección |  |
| area_m2 | Real | 734151.23; 27738754.1; 31374.94 |  |
| area_ha | Real | 73.4151; 2773.8754; 3.1375 |  |

## CR-5_GEN_AREAS_ESPECIALES
- Fuente: `D:\Contrato 500 Lincecias\00_CONVENCIONES_GENERALES_RURALES\GEN_AREAS_ESPECIALES.shp`
- Formato: ESRI Shapefile
- Geometría: Polygon
- CRS: EPSG:3116
- Entidades: 5
- Geometrías inválidas: 0 | vacías/nulas: 0


| Campo | Tipo | Ejemplos | Marca |
|---|---|---|---|
| codigo | String | PNS; BNG; CPO | PREDIAL? |
| convencion | String | Parque Natural Sumapaz; Bosque natural Los Guayupes; Colonia Penal de Oriente |  |
| area_m2 | Real | 42696022.66; 42696021.7; 127782199.87 |  |
| area_ha | Real | 4269.6023; 4269.6022; 12778.22 |  |

## CR-5_GEN_COORDENADAS
- Fuente: `D:\Contrato 500 Lincecias\00_CONVENCIONES_GENERALES_RURALES\GEN_COORDENADAS.shp`
- Formato: ESRI Shapefile
- Geometría: Line String
- CRS: EPSG:3116
- Entidades: 18
- Geometrías inválidas: 0 | vacías/nulas: 0


| Campo | Tipo | Ejemplos | Marca |
|---|---|---|---|
| convencion | String | Coordenadas |  |

## CR-5_GEN_COORDENADAS_ROTULOS
- Fuente: `D:\Contrato 500 Lincecias\00_CONVENCIONES_GENERALES_RURALES\GEN_COORDENADAS_ROTULOS.shp`
- Formato: ESRI Shapefile
- Geometría: Point
- CRS: EPSG:3116
- Entidades: 14
- Geometrías inválidas: 0 | vacías/nulas: 0


| Campo | Tipo | Ejemplos | Marca |
|---|---|---|---|
| texto | String | 1040000 m.E.; 1000000 m.E.; 1010000 m.E. |  |

## CR-5_GEN_ESCUELAS_PUNTOS
- Fuente: `D:\Contrato 500 Lincecias\00_CONVENCIONES_GENERALES_RURALES\GEN_ESCUELAS_PUNTOS.shp`
- Formato: ESRI Shapefile
- Geometría: Point
- CRS: EPSG:3116
- Entidades: 35
- Geometrías inválidas: 0 | vacías/nulas: 0


| Campo | Tipo | Ejemplos | Marca |
|---|---|---|---|
| convencion | String | Escuela o colegio |  |
| numero | String | 02; 03; 04 |  |

## CR-5_GEN_ESCUELAS
- Fuente: `D:\Contrato 500 Lincecias\00_CONVENCIONES_GENERALES_RURALES\GEN_ESCUELAS.shp`
- Formato: ESRI Shapefile
- Geometría: Polygon
- CRS: EPSG:3116
- Entidades: 140
- Geometrías inválidas: 0 | vacías/nulas: 0


| Campo | Tipo | Ejemplos | Marca |
|---|---|---|---|
| codigo | String | ESC | PREDIAL? |
| convencion | String | Escuela o colegio |  |

## CR-5_GEN_HIDROGRAFIA_LINEAS
- Fuente: `D:\Contrato 500 Lincecias\00_CONVENCIONES_GENERALES_RURALES\GEN_HIDROGRAFIA_LINEAS.shp`
- Formato: ESRI Shapefile
- Geometría: Line String
- CRS: EPSG:3116
- Entidades: 2097
- Geometrías inválidas: 0 | vacías/nulas: 0


| Campo | Tipo | Ejemplos | Marca |
|---|---|---|---|
| codigo | String | RIO; CQ | PREDIAL? |
| convencion | String | Ríos; Caño o quebrada |  |
| longitud_m | Real | 28705.97; 164435.45; 396.36 |  |

## CR-5_GEN_HUMEDALES
- Fuente: `D:\Contrato 500 Lincecias\00_CONVENCIONES_GENERALES_RURALES\GEN_HUMEDALES.shp`
- Formato: ESRI Shapefile
- Geometría: Polygon
- CRS: EPSG:3116
- Entidades: 58
- Geometrías inválidas: 0 | vacías/nulas: 0


| Campo | Tipo | Ejemplos | Marca |
|---|---|---|---|
| codigo | String | HUM | PREDIAL? |
| convencion | String | Humedal, estero o morichal |  |
| area_m2 | Real | 9605.39; 17398.87; 8384.88 |  |
| area_ha | Real | 0.9605; 1.7399; 0.8385 |  |

## CR-5_GEN_LIMITES
- Fuente: `D:\Contrato 500 Lincecias\00_CONVENCIONES_GENERALES_RURALES\GEN_LIMITES.shp`
- Formato: ESRI Shapefile
- Geometría: Line String
- CRS: EPSG:3116
- Entidades: 151
- Geometrías inválidas: 0 | vacías/nulas: 0


| Campo | Tipo | Ejemplos | Marca |
|---|---|---|---|
| codigo | String | LM; LV; PEU | PREDIAL? |
| convencion | String | Límite municipal; Límite de vereda; Perímetro de expansión urbana |  |
| longitud_m | Real | 217230.86; 58694.27; 29231.59 |  |

## CR-5_GEN_VIAS
- Fuente: `D:\Contrato 500 Lincecias\00_CONVENCIONES_GENERALES_RURALES\GEN_VIAS.shp`
- Formato: ESRI Shapefile
- Geometría: Line String
- CRS: EPSG:3116
- Entidades: 15
- Geometrías inválidas: 0 | vacías/nulas: 0


| Campo | Tipo | Ejemplos | Marca |
|---|---|---|---|
| codigo | String | V1; V2; V3 | PREDIAL? |
| convencion | String | Vía de orden nacional (primer orden); Vía de orden departamental (segundo orde; Vía de orden municipal (tercer orden) |  |
| longitud_m | Real | 25187.44; 30131.56; 14.81 |  |

## CR-5_USOS_SUELO
- Fuente: `D:\Contrato 500 Lincecias\03_RURAL\CR-05_Reglamentacion_Usos_del_Suelo\CR-5_USOS_SUELO.shp`
- Formato: ESRI Shapefile
- Geometría: Polygon
- CRS: EPSG:3116
- Entidades: 698
- Geometrías inválidas: 0 | vacías/nulas: 0


| Campo | Tipo | Ejemplos | Marca |
|---|---|---|---|
| numero | Integer64 | 1; 2; 3 |  |
| codigo | String | APNS; AME; AAPP | PREDIAL? |
| convencion | String | Área Parque Natural Sumapaz (APNS); Área de manejo especial "Bosque de los G; Área de Actividad Productora Protectora  |  |
| area_m2 | Real | 41741701.31; 80.37; 4219.53 |  |
| area_ha | Real | 4174.1701; 0.008; 0.422 |  |

## CR-9_CONFLICTOS_USO
- Fuente: `D:\Contrato 500 Lincecias\03_RURAL\CR-09_Conflictos_de_Uso\CR-9_CONFLICTOS_USO.shp`
- Formato: ESRI Shapefile
- Geometría: Polygon
- CRS: EPSG:3116
- Entidades: 2
- Geometrías inválidas: 0 | vacías/nulas: 0


| Campo | Tipo | Ejemplos | Marca |
|---|---|---|---|
| codigo | String | ACU | PREDIAL? |
| convencion | String | Área de conflicto de uso del suelo |  |
| area_m2 | Real | 152209.99; 27816.58 |  |
| area_ha | Real | 15.221; 2.7817 |  |

## CU-10_ESPACIO_PUBLICO
- Fuente: `D:\Contrato 500 Lincecias\01_URBANO\CU-10_Espacio_Publico\CU-10_ESPACIO_PUBLICO.shp`
- Formato: ESRI Shapefile
- Geometría: Polygon
- CRS: EPSG:3116
- Entidades: 73
- Geometrías inválidas: 0 | vacías/nulas: 0


| Campo | Tipo | Ejemplos | Marca |
|---|---|---|---|
| codigo | String | APD; APA; PZV | PREDIAL? |
| convencion | String | Zonas de protección de drenaje; Área de protección ambiental; Parques y zonas verdes |  |
| area_m2 | Real | 109969.18; 612416.71; 271085.94 |  |
| area_ha | Real | 10.9969; 61.2417; 27.1086 |  |

## CU-11_EQUIPAMIENTOS
- Fuente: `D:\Contrato 500 Lincecias\01_URBANO\CU-11_Equipamientos_Colectivos\CU-11_EQUIPAMIENTOS.shp`
- Formato: ESRI Shapefile
- Geometría: Polygon
- CRS: EPSG:3116
- Entidades: 69
- Geometrías inválidas: 0 | vacías/nulas: 0


| Campo | Tipo | Ejemplos | Marca |
|---|---|---|---|
| codigo | String | COL; PZV | PREDIAL? |
| convencion | String | Área de colegio; Parques y zonas verdes |  |
| cod_coleg | String | 1A; 1E; 2A |  |
| area_m2 | Real | 31367.4; 2760.74; 8362.94 |  |
| area_ha | Real | 3.1367; 0.2761; 0.8363 |  |

## CU-12_PROTECCION
- Fuente: `D:\Contrato 500 Lincecias\01_URBANO\CU-12_Sistema_Vial\CU-12_PROTECCION.shp`
- Formato: ESRI Shapefile
- Geometría: Polygon
- CRS: EPSG:3116
- Entidades: 16
- Geometrías inválidas: 0 | vacías/nulas: 0


| Campo | Tipo | Ejemplos | Marca |
|---|---|---|---|
| codigo | String | AP; ZPE | PREDIAL? |
| convencion | String | Área de protección; Zona de protección especial |  |
| area_m2 | Real | 109969.18; 612416.71; 271883.16 |  |
| area_ha | Real | 10.9969; 61.2417; 27.1883 |  |

## CU-12_SISTEMA_VIAL
- Fuente: `D:\Contrato 500 Lincecias\01_URBANO\CU-12_Sistema_Vial\CU-12_SISTEMA_VIAL.shp`
- Formato: ESRI Shapefile
- Geometría: Line String
- CRS: EPSG:3116
- Entidades: 976
- Geometrías inválidas: 0 | vacías/nulas: 0


| Campo | Tipo | Ejemplos | Marca |
|---|---|---|---|
| codigo | String | AV1; AV2; AV3 | PREDIAL? |
| convencion | String | Anillo vial No 01; Anillo vial No 02; Anillo vial No 03 |  |
| longitud_m | Real | 1883.31; 6171.38; 314.62 |  |

## CU-13_AMENAZAS
- Fuente: `D:\Contrato 500 Lincecias\01_URBANO\CU-13_Zonas_de_Amenaza\CU-13_AMENAZAS.shp`
- Formato: ESRI Shapefile
- Geometría: Polygon
- CRS: EPSG:3116
- Entidades: 18
- Geometrías inválidas: 0 | vacías/nulas: 0


| Campo | Tipo | Ejemplos | Marca |
|---|---|---|---|
| codigo | String | AIN; ADZ | PREDIAL? |
| convencion | String | Área de amenaza por inundación; Área de amenaza por deslizamiento |  |
| area_m2 | Real | 585906.15; 215792.96; 57059.46 |  |
| area_ha | Real | 58.5906; 21.5793; 5.7059 |  |

## CU-15_ACUEDUCTO
- Fuente: `D:\Contrato 500 Lincecias\01_URBANO\CU-15_Acueducto\CU-15_ACUEDUCTO.shp`
- Formato: ESRI Shapefile
- Geometría: Polygon
- CRS: EPSG:3116
- Entidades: 5
- Geometrías inválidas: 0 | vacías/nulas: 0


| Campo | Tipo | Ejemplos | Marca |
|---|---|---|---|
| codigo | String | Z1AP; Z2AP; Z3AP | PREDIAL? |
| convencion | String | Zona No 01 agua potable; Zona No 02 agua potable; Zona No 03 agua potable |  |
| area_m2 | Real | 2121519.63; 2596926.1; 2223944.44 |  |
| area_ha | Real | 212.152; 259.6926; 222.3944 |  |

## CU-16_ALCANTARILLADO
- Fuente: `D:\Contrato 500 Lincecias\01_URBANO\CU-16_Alcantarillado_Sanitario\CU-16_ALCANTARILLADO.shp`
- Formato: ESRI Shapefile
- Geometría: Polygon
- CRS: EPSG:3116
- Entidades: 6
- Geometrías inválidas: 0 | vacías/nulas: 0


| Campo | Tipo | Ejemplos | Marca |
|---|---|---|---|
| codigo | String | ASA-CC; ASA-CN; ASA-CNN | PREDIAL? |
| convencion | String | Área aferencia colector Centro; Área aferencia colector Norte; Área aferencia colector Nuevo (a constru |  |
| area_m2 | Real | 1325691.2; 1316522.47; 2912716.39 |  |
| area_ha | Real | 132.5691; 131.6522; 291.2716 |  |

## CU-17_ALCANTARILLADO_PLUVIAL
- Fuente: `D:\Contrato 500 Lincecias\01_URBANO\CU-17_Alcantarillado_Pluvial\CU-17_ALCANTARILLADO_PLUVIAL.shp`
- Formato: ESRI Shapefile
- Geometría: Polygon
- CRS: EPSG:3116
- Entidades: 19
- Geometrías inválidas: 0 | vacías/nulas: 0


| Campo | Tipo | Ejemplos | Marca |
|---|---|---|---|
| codigo | String | AARAI1; AARAI2; AARAI3 | PREDIAL? |
| convencion | String | Río Acaciítas – Drenaje natural Colinas ; Río Acaciítas – Aferencia a colector Col; Río Acaciítas – Aferencia a colector Cal |  |
| area_m2 | Real | 470892.2; 313500.34; 324546.72 |  |
| area_ha | Real | 47.0892; 31.35; 32.4547 |  |

## CU-1_DRENAJE
- Fuente: `D:\Contrato 500 Lincecias\01_URBANO\CU-01_Plano_Base_Urbana\CU-1_DRENAJE.shp`
- Formato: ESRI Shapefile
- Geometría: Line String
- CRS: EPSG:3116
- Entidades: 41
- Geometrías inválidas: 0 | vacías/nulas: 0


| Campo | Tipo | Ejemplos | Marca |
|---|---|---|---|
| convencion | String | Drenaje urbano |  |
| longitud_m | Real | 195.28; 319.19; 644.42 |  |

## CU-1_MANZANAS
- Fuente: `D:\Contrato 500 Lincecias\01_URBANO\CU-01_Plano_Base_Urbana\CU-1_MANZANAS.shp`
- Formato: ESRI Shapefile
- Geometría: Polygon
- CRS: EPSG:3116
- Entidades: 1088
- Geometrías inválidas: 0 | vacías/nulas: 0


| Campo | Tipo | Ejemplos | Marca |
|---|---|---|---|
| origen | String | linea cerrada; lineas abiertas unidas |  |
| area_m2 | Real | 3847.18; 3575.19; 4575.31 |  |
| area_ha | Real | 0.3847; 0.3575; 0.4575 |  |

## CU-1_NUMERO_BARRIO
- Fuente: `D:\Contrato 500 Lincecias\01_URBANO\CU-01_Plano_Base_Urbana\CU-1_NUMERO_BARRIO.shp`
- Formato: ESRI Shapefile
- Geometría: Point
- CRS: EPSG:3116
- Entidades: 97
- Geometrías inválidas: 0 | vacías/nulas: 0


| Campo | Tipo | Ejemplos | Marca |
|---|---|---|---|
| convencion | String | Número de barrio |  |
| numero | Integer64 | 1; 2; 12 |  |

## CU-1_PERIMETROS
- Fuente: `D:\Contrato 500 Lincecias\01_URBANO\CU-01_Plano_Base_Urbana\CU-1_PERIMETROS.shp`
- Formato: ESRI Shapefile
- Geometría: Line String
- CRS: EPSG:3116
- Entidades: 2
- Geometrías inválidas: 0 | vacías/nulas: 0


| Campo | Tipo | Ejemplos | Marca |
|---|---|---|---|
| convencion | String | Perímetro urbano; Perímetro de expansión urbana |  |
| longitud_m | Real | 35037.57; 32539.18 |  |

## CU-1_PUNTOS_PERIMETRO
- Fuente: `D:\Contrato 500 Lincecias\01_URBANO\CU-01_Plano_Base_Urbana\CU-1_PUNTOS_PERIMETRO.shp`
- Formato: ESRI Shapefile
- Geometría: Point
- CRS: EPSG:3116
- Entidades: 341
- Geometrías inválidas: 0 | vacías/nulas: 0


| Campo | Tipo | Ejemplos | Marca |
|---|---|---|---|
| convencion | String | Punto de perímetro urbano; Punto de perímetro de expansión urbana |  |
| numero | Integer64 | 1; 2; 3 |  |
| x | Real | 1032921.222; 1032908.012; 1032885.149 |  |
| y | Real | 931877.559; 931943.809; 931944.824 |  |
| dist_txt | Real | 22.2; 8.5; 26.7 |  |

## CU-2_PERIMETROS
- Fuente: `D:\Contrato 500 Lincecias\01_URBANO\CU-02_Perimetro_Urbano_y_Expansion\CU-2_PERIMETROS.shp`
- Formato: ESRI Shapefile
- Geometría: Polygon
- CRS: EPSG:3116
- Entidades: 2
- Geometrías inválidas: 0 | vacías/nulas: 0


| Campo | Tipo | Ejemplos | Marca |
|---|---|---|---|
| convencion | String | Área urbana; Área de expansión urbana |  |
| capa_cad | String | A-URBANA; A-EXPANSION |  |
| area_m2 | Real | 5670189.3; 4713846.58 |  |
| area_ha | Real | 567.0189; 471.3847 |  |

## CU-3_BARRIOS
- Fuente: `D:\Contrato 500 Lincecias\01_URBANO\CU-03_Division_Barrios\CU-3_BARRIOS.shp`
- Formato: ESRI Shapefile
- Geometría: Polygon
- CRS: EPSG:3116
- Entidades: 97
- Geometrías inválidas: 0 | vacías/nulas: 0


| Campo | Tipo | Ejemplos | Marca |
|---|---|---|---|
| codigo | String | 1; 2; 3 | PREDIAL? |
| convencion | String | PABLO EMILIO RIVEROS; DORADO ALTO; EVEREST |  |
| area_m2 | Real | 156852.91; 53814.44; 6789.92 |  |
| area_ha | Real | 15.6853; 5.3814; 0.679 |  |

## CU-4_UPZ
- Fuente: `D:\Contrato 500 Lincecias\01_URBANO\CU-04_UPZ\CU-4_UPZ.shp`
- Formato: ESRI Shapefile
- Geometría: Polygon
- CRS: EPSG:3116
- Entidades: 4
- Geometrías inválidas: 0 | vacías/nulas: 0


| Campo | Tipo | Ejemplos | Marca |
|---|---|---|---|
| upz | String | UPZ1; UPZ2; UPZ3 |  |
| area_m2 | Real | 1828849.83; 2789939.92; 3432335.8 |  |
| area_ha | Real | 182.885; 278.994; 343.2336 |  |
| origen | String | achurado DWG sin hueco de rotulo; contorno UPZ4_LINEA cerrado (gap 5 cm) |  |

## CU-5_EEP_URBANA
- Fuente: `D:\Contrato 500 Lincecias\01_URBANO\CU-05_Estructura_Ecologica_Principal_Urbana\CU-5_EEP_URBANA.shp`
- Formato: ESRI Shapefile
- Geometría: Polygon
- CRS: EPSG:3116
- Entidades: 68
- Geometrías inválidas: 0 | vacías/nulas: 0


| Campo | Tipo | Ejemplos | Marca |
|---|---|---|---|
| convencion | String | Área de protección; Zona de protección especial – parte alta; Zona de protección especial |  |
| capa_cad | String | AEP; Zon Proteccion Ambie; areas parques |  |
| patron | String | ANSI31; ANSI37 |  |
| area_m2 | Real | 109969.18; 612416.71; 271883.16 |  |
| area_ha | Real | 10.9969; 61.2417; 27.1883 |  |

## CU-6_TRATAMIENTOS
- Fuente: `D:\Contrato 500 Lincecias\01_URBANO\CU-06_Tratamientos_Urbanos\CU-6_TRATAMIENTOS.shp`
- Formato: ESRI Shapefile
- Geometría: Polygon
- CRS: EPSG:3116
- Entidades: 71
- Geometrías inválidas: 0 | vacías/nulas: 0


| Campo | Tipo | Ejemplos | Marca |
|---|---|---|---|
| numero | Integer64 | 1; 2; 3 |  |
| convencion | String | Tratamiento de conservación; Tratamiento de consolidación; Tratamiento de renovación urbana |  |
| capa_cad | String | T Conservacion; T Consolidacion; T Renovacion Urbana |  |
| area_m2 | Real | 123.13; 8566.74; 20474.87 |  |
| area_ha | Real | 0.0123; 0.8567; 2.0475 |  |

## CU-7_USOS_DEL_SUELO
- Fuente: `D:\Contrato 500 Lincecias\01_URBANO\CU-07_Usos_del_Suelo\CU-7_USOS_DEL_SUELO.shp`
- Formato: ESRI Shapefile
- Geometría: Polygon
- CRS: EPSG:3116
- Entidades: 35
- Geometrías inválidas: 0 | vacías/nulas: 0


| Campo | Tipo | Ejemplos | Marca |
|---|---|---|---|
| codigo | String | AAR1; AAR2; AAR3 | PREDIAL? |
| convencion | String | Área de actividad residencial I; Área de actividad residencial II; Área de actividad residencial III |  |
| area_m2 | Real | 297121.62; 62085.05; 245313.33 |  |
| area_ha | Real | 29.7122; 6.2085; 24.5313 |  |

## CU-8_CONFLICTOS_USO
- Fuente: `D:\Contrato 500 Lincecias\01_URBANO\CU-08_Conflictos_de_Uso\CU-8_CONFLICTOS_USO.shp`
- Formato: ESRI Shapefile
- Geometría: Polygon
- CRS: EPSG:3116
- Entidades: 15
- Geometrías inválidas: 0 | vacías/nulas: 0


| Campo | Tipo | Ejemplos | Marca |
|---|---|---|---|
| codigo | String | ACU; ACE | PREDIAL? |
| convencion | String | Áreas de conflictos de uso del suelo; Área de conflicto especial – Caño Conejo |  |
| area_m2 | Real | 1438.04; 3194.03; 4025.75 |  |
| area_ha | Real | 0.1438; 0.3194; 0.4026 |  |

## CU-9_DENSIDADES
- Fuente: `D:\Contrato 500 Lincecias\01_URBANO\CU-09_Densidades\CU-9_DENSIDADES.shp`
- Formato: ESRI Shapefile
- Geometría: Polygon
- CRS: EPSG:3116
- Entidades: 36
- Geometrías inválidas: 0 | vacías/nulas: 0


| Campo | Tipo | Ejemplos | Marca |
|---|---|---|---|
| codigo | String | AD; MD; BD | PREDIAL? |
| convencion | String | Alta densidad; Media densidad; Baja densidad |  |
| area_m2 | Real | 1015191.33; 1287234.13; 117522.12 |  |
| area_ha | Real | 101.5191; 128.7234; 11.7522 |  |

## Google Hybrid
- Tipo: raster XYZ (no se descargan teselas)
- URL: `https://mt1.google.com/vt/lyrs%3Dy%26x%3D%7Bx%7D%26y%3D%7By%7D%26z%3D%7Bz%7D`
- Nota: Google Hybrid solo uso interno; para la versión pública usar Esri World Imagery u otra con licencia.


## Base Catastral Acacias
- Fuente: `D:\Contrato 500 Lincecias\Base Catastral Acacias.gpkg`
- Formato: GPKG
- Geometría: Multi Polygon
- CRS: ESRI:103599
- Entidades: 31341
- Geometrías inválidas: 0 | vacías/nulas: 0


| Campo | Tipo | Ejemplos | Marca |
|---|---|---|---|
| OBJECTID | Integer | 1661388; 1661770; 1661771 |  |
| CODIGO | String | 500060100000002840001000000000; 500060100000008970007000000000; 500060100000008980003000000000 | PREDIAL? |
| MANZANA_CODIGO | String | 50006010000000284; 50006010000000897; 50006010000000898 | PREDIAL? |
| NUMERO_SUBTERRANEOS | Integer | 0 |  |
| CODIGO_ANTERIOR | String | 50006010002840001000; 50006010008970007000; 50006010008980003000 | PREDIAL? |
| USUARIO_LOG | String | MIGRACION_2021; edward.linares; VIANEY.SEGURA |  |
| FECHA_LOG | DateTime | 2021/12/01 00:00:00+00; 2022/04/20 11:13:31+00; 2022/11/08 14:55:40+00 |  |
| GLOBALID | String | {CA1298C9-EBCD-4D1F-B48B-D2450E3EED2F}; {7BEB327F-143D-4710-9AB6-F3192DB60026}; {107456DD-3B6C-417E-85F1-0C79B489AC27} |  |
| GLOBALID_SNC | String | {8ad1e052-cc4f-4216-823b-26a37be2514d}; {1114218c-371d-4889-8494-fc433845c55c}; {0c73904e-5620-44e9-92df-f09b47f0df30} |  |
| SHAPE_Length | Real | 65.4704371873723; 44.663595505483194; 134.4852181855726 |  |
| SHAPE_Area | Real | 209.09813785415028; 117.43136868073066; 854.3806329671711 |  |
| codigo_municipio | String | 50006 | PREDIAL? |
| CODIGO_DEPARTAMENTO | String |  | PREDIAL? |
| OBJECTID_2 | Integer | 1534151; 1535163; 1537412 |  |
| CODIGO_2 | String | 500060011000000080002000000000; 500060011000002480010000000000; 500060011000008360112000000000 | PREDIAL? |
| VEREDA_CODIGO | String | 50006001100000008; 50006001100000248; 50006001100000836 | PREDIAL? |
| NUMERO_SUBTERRANEOS_2 | Integer | 0; 444; 44 |  |
| CODIGO_ANTERIOR_2 | String | 50006001100080002000; 50006001102480010000; 50006001108360112000 | PREDIAL? |
| USUARIO_LOG_2 | String | MIGRACION_2021; edward.linares; carlos.bahamon |  |
| FECHA_LOG_2 | DateTime | 2021/12/01 00:00:00+00; 2023/09/12 11:13:23+00; 2023/08/23 12:22:51+00 |  |
| GLOBALID_2 | String | {5A00763E-F888-4E5A-8336-E104CF68C43C}; {01F36123-F0E1-4E12-88A5-FA5DDCB6EF0A}; {1B352E42-C1EC-43E4-8966-877357DD1F0D} |  |
| GLOBALID_SNC_2 | String | {2d2fa274-dbed-4432-be24-e8e8b9d8eae7}; {fd6ff1a1-4045-4686-9f10-ca4468089ae7}; {ae6c06d4-f5e2-470d-ba72-9496794bc451} |  |
| SHAPE_Length_2 | Real | 325.73198925083614; 745.9108155624324; 281.0130359121834 |  |
| SHAPE_Area_2 | Real | 5206.383690048524; 37098.0917596553; 1415.3567989550047 |  |
| codigo_municipio_2 | String | 50006; 25339; 50150 | PREDIAL? |
| CODIGO_DEPARTAMENTO_2 | String |  | PREDIAL? |

## ZA_POMCA_ACACIAS_PAJURE
- Fuente: `D:\SIGAcacias\SHP\ZA_POMCA_ACACIAS_PAJURE.shp`
- Formato: ESRI Shapefile
- Geometría: Polygon
- CRS: MAGNA_Colombia_CTM12
- Entidades: 5
- Geometrías inválidas: 3 | vacías/nulas: 0


| Campo | Tipo | Ejemplos | Marca |
|---|---|---|---|
| OBJECTID | Integer64 | 1; 2; 3 |  |
| CodigoFin | String | CS; DE; PR | PREDIAL? |
| Area | Real | 7088.04100909; 39391.8263422; 1840.21409278 |  |
| Zonificaci | String | Conservación; Desarrollo Económico; Preservación |  |
| Shape_Leng | Real | 1313435.1269; 2110135.96865; 136427.266235 |  |
| Shape_Area | Real | 70772430.4727; 393303677.592; 18376293.145 |  |

## ZA_POMCA_GUAYURIBA
- Fuente: `D:\SIGAcacias\SHP\ZA_POMCA_GUAYURIBA.shp`
- Formato: ESRI Shapefile
- Geometría: Polygon
- CRS: MAGNA_Colombia_CTM12
- Entidades: 8518
- Geometrías inválidas: 31 | vacías/nulas: 0


| Campo | Tipo | Ejemplos | Marca |
|---|---|---|---|
| OBJECTID | Integer64 | 1; 2; 3 |  |
| CAT_ORD | String | 01; 02 |  |
| ZO_US_MA | String | 02; 01; 03 |  |
| SZO_US_M | String | 03; 02; 01 |  |
| NOMENCLAT | String | CP22; CP21; CP1 |  |
| AREA_ha | Real | 1.25642589772; 0.246979753403; 3.62997787023 |  |
| Categ_Orde | String | Conservación  y Protección Ambiental; Uso Múltiple |  |
| Zon_UyM | String | Áreas de Protección; Áreas Protegidas; Áreas de Restauración |  |
| Subz_UyM | String | Áreas de importancia Ambiental; Áreas complementarias para la conservaci; Áreas SINAP |  |
| Shape_Leng | Real | 413.277608992; 184.358808668; 414.992066479 |  |
| Shape_Area | Real | 2392.34659839; 831.462459449; 749.409632138 |  |


# Resumen de campos marcados

- **CG-2_CLASIFICACION_SUELO**: codigo=PREDIAL?
- **CG-3_PROTECCION_HIDRICA**: codigo=PREDIAL?
- **CG-4_VIAS_INTEGRACION_REGIONAL**: codigo=PREDIAL?
- **CG-5_GEN_AREAS_ESPECIALES**: codigo=PREDIAL?
- **CG-5_GEN_ESCUELAS**: codigo=PREDIAL?
- **CG-5_GEN_HIDROGRAFIA_LINEAS**: codigo=PREDIAL?
- **CG-5_GEN_HUMEDALES**: codigo=PREDIAL?
- **CG-5_GEN_LIMITES**: codigo=PREDIAL?
- **CG-5_GEN_VIAS**: codigo=PREDIAL?
- **CG-5_UNIDADES_PLANEAMIENTO**: codigo=PREDIAL?
- **CG-6_ACUEDUCTO_A_DESARROLLAR**: codigo=PREDIAL?
- **CR-11_GEN_AREAS_ESPECIALES**: codigo=PREDIAL?
- **CR-11_GEN_ESCUELAS**: codigo=PREDIAL?
- **CR-11_GEN_HIDROGRAFIA_LINEAS**: codigo=PREDIAL?
- **CR-11_GEN_HUMEDALES**: codigo=PREDIAL?
- **CR-11_GEN_LIMITES**: codigo=PREDIAL?
- **CR-11_GEN_VIAS**: codigo=PREDIAL?
- **CR-11_RED_VIAL**: codigo=PREDIAL?
- **CR-12_EQUIPAMIENTOS_RURALES**: codigo=PREDIAL?
- **CR-13_ACUEDUCTO_RURAL**: codigo=PREDIAL?
- **CR-2_AREAS_MANEJO_ESPECIAL**: codigo=PREDIAL?
- **CR-2_GEN_AREAS_ESPECIALES**: codigo=PREDIAL?
- **CR-2_GEN_ESCUELAS**: codigo=PREDIAL?
- **CR-2_GEN_HIDROGRAFIA_LINEAS**: codigo=PREDIAL?
- **CR-2_GEN_HUMEDALES**: codigo=PREDIAL?
- **CR-2_GEN_LIMITES**: codigo=PREDIAL?
- **CR-2_GEN_VIAS**: codigo=PREDIAL?
- **CR-5_DESTINACION_ESPECIFICA**: codigo=PREDIAL?
- **CR-5_GEN_AREAS_ESPECIALES**: codigo=PREDIAL?
- **CR-5_GEN_ESCUELAS**: codigo=PREDIAL?
- **CR-5_GEN_HIDROGRAFIA_LINEAS**: codigo=PREDIAL?
- **CR-5_GEN_HUMEDALES**: codigo=PREDIAL?
- **CR-5_GEN_LIMITES**: codigo=PREDIAL?
- **CR-5_GEN_VIAS**: codigo=PREDIAL?
- **CR-5_USOS_SUELO**: codigo=PREDIAL?
- **CR-9_CONFLICTOS_USO**: codigo=PREDIAL?
- **CU-10_ESPACIO_PUBLICO**: codigo=PREDIAL?
- **CU-11_EQUIPAMIENTOS**: codigo=PREDIAL?
- **CU-12_PROTECCION**: codigo=PREDIAL?
- **CU-12_SISTEMA_VIAL**: codigo=PREDIAL?
- **CU-13_AMENAZAS**: codigo=PREDIAL?
- **CU-15_ACUEDUCTO**: codigo=PREDIAL?
- **CU-16_ALCANTARILLADO**: codigo=PREDIAL?
- **CU-17_ALCANTARILLADO_PLUVIAL**: codigo=PREDIAL?
- **CU-3_BARRIOS**: codigo=PREDIAL?
- **CU-7_USOS_DEL_SUELO**: codigo=PREDIAL?
- **CU-8_CONFLICTOS_USO**: codigo=PREDIAL?
- **CU-9_DENSIDADES**: codigo=PREDIAL?
- **Base Catastral Acacias**: CODIGO=PREDIAL?, MANZANA_CODIGO=PREDIAL?, CODIGO_ANTERIOR=PREDIAL?, codigo_municipio=PREDIAL?, CODIGO_DEPARTAMENTO=PREDIAL?, CODIGO_2=PREDIAL?, VEREDA_CODIGO=PREDIAL?, CODIGO_ANTERIOR_2=PREDIAL?, codigo_municipio_2=PREDIAL?, CODIGO_DEPARTAMENTO_2=PREDIAL?
- **ZA_POMCA_ACACIAS_PAJURE**: CodigoFin=PREDIAL?