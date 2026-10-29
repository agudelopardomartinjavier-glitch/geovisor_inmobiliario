# Valoración y mercado (Fase 2) — definiciones y método

Todo es **privado** (solo administrador). Código: `backend/app/mercado.py` (cálculos puros, con pruebas) y `backend/app/admin/router_mercado.py`.
Los porcentajes y umbrales son parámetros (tabla `parametros`, `GET/PUT /admin/parametros`); los marcados «por confirmar» deben validarlos un avaluador o contador.

## 1. Historial de precios y avalúos
- Se llena **solo con triggers** sobre `inmuebles` (migración 003): cualquier cambio de `precio` o `avaluo` queda registrado con la fecha del día (Colombia, UTC-5), venga del panel, de un script o de SQL directo. Guardar sin cambiar el valor no crea filas.
- Cada precio guarda `precio_anterior` y un tipo: **inicial**, **rebaja** (bajó) o **aumento** (subió).
- Los datos que ya existían quedaron con **un punto de partida** (fecha de creación del inmueble); no se inventa historia anterior.
- Se pueden **agregar datos históricos a mano** (precios y avalúos de antes de usar el sistema). La serie se reordena y re-tipa sola. Solo se pueden borrar los manuales; los automáticos son el registro real.
- Fuentes de avalúo: registrado, comercial, catastral, por comparables, otro.

## 2. Tiempo en el mercado y rebajas
- **Días en el mercado** = suma de los tramos en que el estado fue «publicado». Se detiene al marcar «vendido» o al despublicar, y se reanuda si se vuelve a publicar. Si se vendió: **días hasta la venta** = desde la primera publicación hasta la venta.
- Historial de estados en `estado_historial` (también por trigger).
- **Rebajas**: cantidad de rebajas, **variación total** = (último − primer precio) / primer precio, **mayor rebaja** entre dos precios consecutivos, y días desde el último cambio.

## 3. Valor por m² del sector y mapa de calor
**Datos.** Valor por m² = precio ÷ área base, con el área base según el tipo (igual que la valoración por comparables): terreno para lote y finca; construida para casa, local y apartamento. Fuentes: comparables (ofertas y ventas cerradas) e inmuebles propios **en venta** publicados o vendidos. Los arriendos no entran (su precio es un canon mensual). Se mezclan solo datos del **mismo tipo** (por eso el mapa pide elegir el tipo).

**Sectores.** Cada dato se asigna al barrio (urbano) o vereda (rural) donde cae. Por sector: n, mediana, percentiles 25 y 75, mínimo y máximo. Con menos de 3 datos se marca «solo orientativo».

**Mapa de calor.** Superficie interpolada por **ponderación inversa a la distancia** (IDW, potencia 2) sobre una rejilla de 250 m:
1. Los valores se recortan al rango [percentil 5, percentil 95] para que un dato atípico no domine (con menos de 10 datos no se recorta).
2. Cada celda toma el promedio ponderado de los datos a ≤ 1.500 m, con peso 1/(distancia + media celda)².
3. **No se extrapola**: una celda se pinta solo si tiene al menos 2 datos dentro del radio. Lo que queda sin pintar es «sin información», no «barato».
4. Si hay demasiadas celdas (> 4.000) la celda crece automáticamente.
El color es una rampa de un solo tono (claro = más barato, oscuro = más caro) escalada entre el mínimo y el máximo del mapa mostrado; la leyenda indica los valores.
Parámetros: `mercado.celda_m` (250), `mercado.radio_influencia_m` (1500), `mercado.min_vecinos` (2), `mercado.recorte_percentil` (5).

**Cómo leerlo.** Es una guía visual de dónde está el mercado caro o barato según los datos que tienes; **no** es un avalúo. Con pocos datos (como los de demostración) las manchas reflejan pocos puntos.

## 4. Indicador «precio publicado vs. valor estimado por comparables»
**Método de comparables** (el de la valoración existente, `valoracion.py`): para cada comparable vinculado, valor unitario = precio ÷ área base; ajustado = unitario × (1 + ajuste %). **Valor estimado = promedio de los unitarios ajustados × área del inmueble.** Rango = ± 1 desviación estándar. Coeficiente de variación (CV) con umbral de referencia 7,5 % (informativo).

**Indicador** (solo ventas): `dif = (precio − estimado) / estimado`.
| Resultado | Condición |
|---|---|
| Por debajo | dif < −tolerancia |
| En rango | −tolerancia ≤ dif ≤ +tolerancia |
| Por encima | dif > +tolerancia |

La tolerancia es `valoracion.tolerancia_pct` (10 %, por confirmar). **Confianza**: alta con ≥ 3 comparables y CV dentro del umbral; media con ≥ 3; baja con menos. En arriendos no aplica (un canon mensual no se compara con un valor de venta; antes el panel mostraba esa comparación sin sentido y se corrigió).

## 5. Rentabilidad para el inversionista
**Rentabilidad bruta anual = canon mensual × 12 ÷ valor del inmueble.** Es bruta: no descuenta administración, predial, vacancia ni impuestos.
- **Inmueble en arriendo:** canon = precio publicado. Valor = avalúo registrado; si no hay, el valor estimado por comparables.
- **Inmueble en venta:** valor = precio de venta publicado (lo que paga el inversionista). Canon = el **canon esperado** que se digite; si no, la **mediana del canon por m²** de los arriendos publicados del mismo tipo y sector × el área del inmueble (mínimo 2 arriendos). Además se muestra la rentabilidad sobre el valor estimado.
- Sin datos suficientes no se calcula y se explica qué falta.
