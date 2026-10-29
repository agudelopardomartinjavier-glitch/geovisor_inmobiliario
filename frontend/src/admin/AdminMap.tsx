import { useMemo, type RefObject } from 'react'
import Map, { Layer, Marker, NavigationControl, ScaleControl, Source, type MapLayerMouseEvent, type MapRef } from 'react-map-gl/maplibre'
import type { StyleSpecification } from 'maplibre-gl'
import type { Capa } from '../lib/types'
import { CENTRO_INICIAL, MAPAS_BASE } from '../lib/mapa'
import { RAMPA_CALOR } from './CalorControl'
import { COLOR_COMPARABLE, COLOR_ESTADO, type Comparable, type InmuebleAdmin } from './tipos'

const ESTILO: StyleSpecification = { version: 8, sources: {}, layers: [{ id: 'fondo', type: 'background', paint: { 'background-color': '#e5e7eb' } }] }

interface Props {
  mapRef: RefObject<MapRef | null>
  predios: Capa | undefined
  inmuebles: InmuebleAdmin[]
  comparables: Comparable[]
  /** Celdas del mapa de calor de valor por m² (propiedad `rel` 0–1) o null. */
  calor: GeoJSON.FeatureCollection | null
  /** Comparables vinculados al inmueble que se está editando (se resaltan). */
  vinculados: Set<number>
  seleccionado: number | null
  compSeleccionado: number | null
  /** Punto que se está editando (marcador). */
  punto: { lon: number; lat: number } | null
  colorPunto: string
  editando: boolean
  onSeleccionar: (id: number) => void
  onSeleccionarComparable: (id: number) => void
  onUbicar: (lon: number, lat: number, numeroPredial: string | null) => void
}

export default function AdminMap({ mapRef, predios, inmuebles, comparables, calor, vinculados, seleccionado, compSeleccionado, punto, colorPunto, editando, onSeleccionar, onSeleccionarComparable, onUbicar }: Props) {
  const geoInmuebles = useMemo(
    () => ({
      type: 'FeatureCollection' as const,
      features: inmuebles.filter((i) => i.lon != null && i.lat != null).map((i) => ({
        type: 'Feature' as const,
        geometry: { type: 'Point' as const, coordinates: [i.lon!, i.lat!] },
        properties: { id: i.id, estado: i.estado_publicacion, sel: i.id === seleccionado ? 1 : 0 },
      })),
    }),
    [inmuebles, seleccionado],
  )
  const geoComparables = useMemo(
    () => ({
      type: 'FeatureCollection' as const,
      features: comparables.filter((c) => c.lon != null && c.lat != null).map((c) => ({
        type: 'Feature' as const,
        geometry: { type: 'Point' as const, coordinates: [c.lon!, c.lat!] },
        properties: { id: c.id, sel: c.id === compSeleccionado ? 1 : 0, vinc: vinculados.has(c.id) ? 1 : 0 },
      })),
    }),
    [comparables, compSeleccionado, vinculados],
  )

  const alClick = (e: MapLayerMouseEvent) => {
    if (!editando) {
      const inm = e.features?.find((f) => f.layer.id === 'adm-inmuebles')
      if (inm) return onSeleccionar(Number(inm.properties?.id))
      const cmp = e.features?.find((f) => f.layer.id === 'adm-comparables')
      if (cmp) onSeleccionarComparable(Number(cmp.properties?.id))
      return
    }
    const predio = e.features?.find((f) => f.layer.id === 'adm-predios-fill')
    onUbicar(e.lngLat.lng, e.lngLat.lat, predio?.properties?.numero_predial ? String(predio.properties.numero_predial) : null)
  }

  return (
    <Map
      ref={mapRef}
      initialViewState={CENTRO_INICIAL}
      mapStyle={ESTILO}
      maxZoom={19.5}
      interactiveLayerIds={['adm-comparables', 'adm-inmuebles', 'adm-predios-fill']}
      cursor={editando ? 'crosshair' : undefined}
      onClick={alClick}
      style={{ width: '100%', height: '100%' }}
    >
      <Source id="adm-base" type="raster" tiles={MAPAS_BASE[0].tiles} tileSize={256} maxzoom={MAPAS_BASE[0].maxzoom} attribution={MAPAS_BASE[0].attribution}>
        <Layer id="adm-base" type="raster" />
      </Source>

      {calor && (
        <Source id="adm-calor" type="geojson" data={calor}>
          <Layer id="adm-calor" type="fill" paint={{ 'fill-color': ['interpolate', ['linear'], ['get', 'rel'], ...RAMPA_CALOR.flat()] as never, 'fill-opacity': 0.72, 'fill-antialias': false }} />
        </Source>
      )}

      {predios && (
        <Source id="adm-src-predios" type="vector" tiles={[predios.tiles!]} minzoom={predios.minzoom} maxzoom={predios.maxzoom}>
          <Layer id="adm-predios-fill" type="fill" source-layer={predios.capa_fuente} paint={{ 'fill-color': '#facc15', 'fill-opacity': 0.01 }} />
          <Layer id="adm-predios-line" type="line" source-layer={predios.capa_fuente} paint={{ 'line-color': '#facc15', 'line-width': ['interpolate', ['linear'], ['zoom'], 12, 0.3, 17, 1.4] }} />
        </Source>
      )}

      <Source id="adm-comparables" type="geojson" data={geoComparables}>
        <Layer
          id="adm-comparables"
          type="circle"
          paint={{
            'circle-radius': ['case', ['==', ['get', 'sel'], 1], 9, ['==', ['get', 'vinc'], 1], 8, 5],
            'circle-color': COLOR_COMPARABLE,
            'circle-opacity': ['case', ['==', ['get', 'vinc'], 1], 1, 0.75],
            'circle-stroke-width': ['case', ['==', ['get', 'vinc'], 1], 3, 1.5],
            'circle-stroke-color': ['case', ['==', ['get', 'vinc'], 1], '#fde047', '#ffffff'],
          }}
        />
      </Source>

      <Source id="adm-inmuebles" type="geojson" data={geoInmuebles}>
        <Layer
          id="adm-inmuebles"
          type="circle"
          paint={{
            'circle-radius': ['case', ['==', ['get', 'sel'], 1], 11, 8],
            'circle-color': ['match', ['get', 'estado'], 'publicado', COLOR_ESTADO.publicado, 'borrador', COLOR_ESTADO.borrador, COLOR_ESTADO.vendido],
            'circle-stroke-width': ['case', ['==', ['get', 'sel'], 1], 4, 2],
            'circle-stroke-color': '#ffffff',
          }}
        />
      </Source>

      {editando && punto && <Marker longitude={punto.lon} latitude={punto.lat} color={colorPunto} />}

      <NavigationControl position="top-right" showCompass={false} />
      <ScaleControl position="bottom-left" />
    </Map>
  )
}
