# Geovisor inmobiliario – Acacías (Meta)

> Contexto inferido del README y del código (no hubo entrevista). Corrige lo que no corresponda.

## Qué es
Visor público de inmuebles en venta y arriendo sobre el mapa de Acacías, con el contexto que decide una compra:
catastro (predios), uso del suelo del POT y restricciones ambientales del POMCA. Incluye un panel privado `/admin`.

## Para quién
- Compradores y arrendatarios de Acacías y la región: consultan desde el celular o el computador, casi siempre de día.
- Asesores inmobiliarios y propietarios: comparten enlaces directos (`/?inmueble=ID`, `/?barrio=…`) por WhatsApp.
- Técnicos y avaluadores: consultan un predio por su número predial y leen sus cruces con POT y POMCA.

## Qué debe lograr el visor público
1. Encontrar ofertas por barrio, tipo, operación, precio y área, y verlas en el mapa.
2. Abrir la ficha de un inmueble y contactar (WhatsApp, ficha PDF, enlace).
3. Consultar cualquier predio: área, uso del suelo y restricciones.
4. Encender capas del POT/POMCA y leer su leyenda.

## Tono
Institucional y preciso, en español de Colombia. La información es de referencia y así se dice; nada de lenguaje de venta.

## Plataforma
web (React + Vite + Tailwind 4 + MapLibre). Modo de la superficie: Operate.
