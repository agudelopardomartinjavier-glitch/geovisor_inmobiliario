import type { FeatureCollection, Geometry } from 'geojson'
import { useMemo, useState, type RefObject } from 'react'
import Map, { GeolocateControl, Layer, NavigationControl, ScaleControl, Source, type MapLayerMouseEvent, type MapRef } from 'react-map-gl/maplibre'
import type { StyleSpecification } from 'maplibre-gl'
import type { Capa, InmuebleCollection, InmuebleFeature, Predio } from '../lib/types'
import { CENTRO_INICIAL, COLOR_OPERACION, GRUPOS, MAPAS_BASE } from '../lib/mapa'
import { capasMapa, estiloDe } from '../lib/estilos'
import PropertyPopup from './PropertyPopup'

// Capas vacías que fijan el orden: base < ambiental < POT < catastro < (inmuebles y selección)
const ESTILO_BASE: StyleSpecification = {
  version: 8,
  // fuentes de las etiquetas, servidas desde public/fonts (sin depender de un servidor externo)
  glyphs: `${window.location.origin}${import.meta.env.BASE_URL}fonts/{fontstack}/{range}.pbf`,
  sources: {},
  layers: ['ancla-base', 'ancla-amb', 'ancla-pot', 'ancla-catastro', 'ancla-top'].map((id) => ({
    id,
    type: 'background' as const,
    paint: id === 'ancla-base' ? { 'background-color': '#e5e7eb' } : { 'background-opacity': 0 },
  })),
}

interface Props {
  mapRef: RefObject<MapRef | null>
  capas: Capa[]
  activadas: Set<string>
  visibles: Set<string>
  baseId: string
  inmuebles: InmuebleCollection | undefined
  inmuebleSel: InmuebleFeature | null
  predioSel: Predio | null
  /** Contorno del barrio o vereda elegidos (se resalta en el mapa). */
  zonaGeom: Geometry | null
  anclaPopup: 'bottom' | 'left'
  onSelectInmueble: (id: number | null) => void
  onSelectPredio: (numeroPredial: string) => void
}

function CapaVectorial({ capa, visible }: { capa: Capa; visible: boolean }) {
  const vis = visible ? 'visible' : 'none'
  // los polígonos sin relleno (barrios, veredas, manzanas) van arriba para que sus líneas no queden tapadas por los rellenos de colores
  const before = estiloDe(capa.nombre)?.relleno === 0 && capa.nombre !== 'predios' ? 'ancla-top' : GRUPOS[capa.grupo].ancla
  const capas = capasMapa(capa).map((l) => (
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    <Layer key={l.id} {...(l as any)} {...(capa.formato === 'mvt' ? { 'source-layer': capa.capa_fuente } : {})} layout={{ ...l.layout, visibility: vis }} beforeId={before} />
  ))
  // Las capas pequeñas van como GeoJSON: el navegador las trocea y nunca depende de teselas que puedan tardar o faltar,
  // así no parpadean ni desaparecen al acercar o alejar.
  return capa.formato === 'geojson' ? (
    <Source id={`src-${capa.nombre}`} type="geojson" data={capa.geojson!} buffer={128} tolerance={0.2}>{capas}</Source>
  ) : (
    <Source id={`src-${capa.nombre}`} type="vector" tiles={[capa.tiles!]} minzoom={capa.minzoom} maxzoom={capa.maxzoom}>{capas}</Source>
  )
}

export default function MapView({ mapRef, capas, activadas, visibles, baseId, inmuebles, inmuebleSel, predioSel, zonaGeom, anclaPopup, onSelectInmueble, onSelectPredio }: Props) {
  const [cursor, setCursor] = useState('')
  const estilo = useMemo(() => ESTILO_BASE, [])

  const alClick = (e: MapLayerMouseEvent) => {
    const f = e.features?.[0]
    if (!f) return onSelectInmueble(null)
    if (f.layer.id === 'inmuebles-circle') return onSelectInmueble(Number(f.properties?.id))
    if (f.layer.id === 'predios-fill' && f.properties?.numero_predial) onSelectPredio(String(f.properties.numero_predial))
  }

  return (
    <Map
      ref={mapRef}
      initialViewState={CENTRO_INICIAL}
      mapStyle={estilo}
      maxZoom={19.5}
      interactiveLayerIds={['inmuebles-circle', 'predios-fill']}
      cursor={cursor}
      onMouseMove={(e) => setCursor(e.features?.length ? 'pointer' : '')}
      onClick={alClick}
      style={{ width: '100%', height: '100%' }}
    >
      {MAPAS_BASE.map((m) => (
        <Source key={m.id} id={`base-${m.id}`} type="raster" tiles={m.tiles} tileSize={256} maxzoom={m.maxzoom} attribution={m.attribution}>
          <Layer id={`base-${m.id}`} type="raster" beforeId="ancla-amb" layout={{ visibility: baseId === m.id ? 'visible' : 'none' }} />
        </Source>
      ))}

      {capas.filter((c) => activadas.has(c.nombre)).map((c) => (
        <CapaVectorial key={c.nombre} capa={c} visible={visibles.has(c.nombre)} />
      ))}

      {zonaGeom && (
        <Source id="sel-zona" type="geojson" data={{ type: 'Feature', properties: {}, geometry: zonaGeom }}>
          <Layer id="sel-zona-fill" type="fill" paint={{ 'fill-color': '#10b981', 'fill-opacity': 0.1 }} />
          <Layer id="sel-zona-casing" type="line" paint={{ 'line-color': '#064e3b', 'line-width': 6, 'line-opacity': 0.55, 'line-blur': 1 }} />
          <Layer id="sel-zona-line" type="line" paint={{ 'line-color': '#ffffff', 'line-width': 2.6 }} />
        </Source>
      )}

      {predioSel && (
        <Source id="sel-predio" type="geojson" data={{ type: 'Feature', properties: {}, geometry: predioSel.geometry }}>
          <Layer id="sel-predio-fill" type="fill" paint={{ 'fill-color': '#22d3ee', 'fill-opacity': 0.25 }} />
          <Layer id="sel-predio-line" type="line" paint={{ 'line-color': '#06b6d4', 'line-width': 3 }} />
        </Source>
      )}

      {inmuebles && (
        <Source id="inmuebles" type="geojson" data={inmuebles as unknown as FeatureCollection}>
          <Layer
            id="inmuebles-circle"
            type="circle"
            paint={{
              'circle-radius': ['interpolate', ['linear'], ['zoom'], 10, 6, 17, 10],
              'circle-color': ['match', ['get', 'operacion'], 'venta', COLOR_OPERACION.venta, 'arriendo', COLOR_OPERACION.arriendo, '#6b7280'],
              'circle-stroke-width': 2,
              'circle-stroke-color': '#ffffff',
            }}
          />
        </Source>
      )}

      {inmuebleSel && (
        <PropertyPopup anclaje={anclaPopup} inmueble={inmuebleSel} onClose={() => onSelectInmueble(null)} onVerPredio={onSelectPredio} />
      )}

      <NavigationControl position="top-right" showCompass={false} />
      <GeolocateControl position="top-right" />
      <ScaleControl position="bottom-left" />
    </Map>
  )
}
