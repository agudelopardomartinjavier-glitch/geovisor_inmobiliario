# Sistema visual del visor público

**Mundo:** la plancha catastral impresa. Papel, tinta, líneas finas, cifras tabulares y un resaltador para marcar lo elegido.
El mapa es el protagonista; el panel es el margen del plano. Fuente de verdad de los valores: `frontend/src/index.css` (`@theme`).

## Color
| Token | Valor | Uso |
|---|---|---|
| `papel` | `#f4f3ee` | fondo de paneles |
| `hoja` | `#fdfdfb` | campos, tarjetas, controles flotantes |
| `tinta` | `#14211b` | texto y acción principal |
| `tinta-2` / `tinta-3` | `#47534d` / `#66716b` | texto secundario / de apoyo |
| `linea` / `linea-2` | `#dddbd1` / `#c4c2b6` | divisores / bordes de control |
| `marca` | `#c8f04f` | resaltador: selección y estado activo, siempre con texto `tinta` |
| `venta` / `arriendo` | `#d2362a` / `#2a62d8` | operación del inmueble (siempre con texto al lado) |

El color de la interfaz es neutro a propósito: los colores fuertes pertenecen a las capas del mapa y al semáforo.

## Tipografía
- Hanken Grotesk (variable, autoalojada) para toda la interfaz. Escala fija: 12 · 13 · 14 · 15 · 17 · 28 px.
- IBM Plex Mono solo para datos: número predial, códigos de zona, coordenadas y escala.
- Cifras con `.cifras` (tabulares) en precios, áreas y conteos.

## Forma y profundidad
Radios pequeños (6–8 px; 12 px en paneles flotantes). Secciones separadas por líneas, no por tarjetas.
Sombra solo en lo que flota sobre el mapa (`shadow-flota`, `shadow-panel`).

## Estructura
- Escritorio: columna izquierda de 25 rem (marca, buscador único, pestañas Inmuebles / Capas) y mapa a la derecha.
- Celular: buscador flotante arriba y el panel como hoja inferior que se recoge para ver el mapa.
- La ficha del inmueble se abre dentro del panel; la consulta de predio es un panel flotante a la derecha (hoja inferior en celular).
- Sobre el mapa: zoom / ubicación / vista inicial (arriba derecha), leyenda y mapa base (abajo izquierda), coordenadas y escala (abajo).

## Movimiento
150–300 ms, salida exponencial (`--ease-salida`), solo para cambios de estado. Respeta `prefers-reduced-motion`.

## Reglas
- La selección se marca con `marca`; la acción principal con `tinta`. Nunca texto de color `marca`.
- Iconos: solo los de `Icono` en `components/ui.tsx` (trazo 1.5, caja 20).
- El panel `/admin` todavía usa el estilo anterior (slate/emerald); no forma parte de este sistema aún.
