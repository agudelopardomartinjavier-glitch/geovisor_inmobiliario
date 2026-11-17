import type { Geometry } from 'geojson'
import { memo, useMemo, useRef, useState, type ReactNode, type RefObject } from 'react'
import Map, { GeolocateControl, Layer, Marker, ScaleControl, Source, type MapLayerMouseEvent, type MapRef } from 'react-map-gl/maplibre'
import type { GeolocateControl as ControlUbicacion, StyleSpecification } from 'maplibre-gl'
import type { Capa, InmuebleFeature, Predio } from '../lib/types'
import { CENTRO_INICIAL, COLOR_OPERACION, GRUPOS, MAPAS_BASE, NOMBRE_TIPO, fmtCOP, fmtCorto, fmtGMS } from '../lib/mapa'
import { capasMapa, estiloDe } from '../lib/estilos'
import { Icono, type NombreIcono } from './ui'

// Capas vacías que fijan el orden: base < ambiental < POT < catastro < (inmuebles y selección)
const ESTILO_BASE: StyleSpecification = {
  version: 8,
  // fuentes de las etiquetas, servidas desde public/fonts (sin depender de un servidor externo)
  glyphs: `${window.location.origin}${import.meta.env.BASE_URL}fonts/{fontstack}/{range}.pbf`,
  sources: {},
  layers: ['ancla-base', 'ancla-amb', 'ancla-pot', 'ancla-catastro', 'ancla-top'].map((id) => ({
    id,
    type: 'background' as const,
    paint: id === 'ancla-base' ? { 'background-color': '#e4e2d8' } : { 'background-opacity': 0 },
  })),
}

/** Por debajo de este zoom los inmuebles se dibujan como puntos; por encima, como etiquetas de precio. */
const ZOOM_ETIQUETAS = 13.2

interface Props {
  mapRef: RefObject<MapRef | null>
  capas: Capa[]
  activadas: Set<string>
  visibles: Set<string>
  baseId: string
  onBase: (id: string) => void
  inmuebles: InmuebleFeature[]
  inmuebleSel: number | null
  inmuebleSobre: number | null
  predioSel: Predio | null
  /** Contorno del barrio o vereda elegidos (se resalta en el mapa). */
  zonaGeom: Geometry | null
  /** Corre los controles cuando el panel del predio ocupa la esquina derecha. */
  controlesCorridos: boolean
  onSelectInmueble: (id: number | null) => void
  onSobreInmueble: (id: number | null) => void
  onSelectPredio: (numeroPredial: string) => void
  /** Elementos flotantes de la esquina inferior izquierda (leyenda). */
  children?: ReactNode
}

function CapaVectorial({ capa, visible, predialSobre }: { capa: Capa; visible: boolean; predialSobre: string | null }) {
  const vis = visible ? 'visible' : 'none'
  // los polígonos sin relleno (barrios, veredas, manzanas) van arriba para que sus líneas no queden tapadas por los rellenos de colores
  const before = estiloDe(capa.nombre)?.relleno === 0 && capa.nombre !== 'predios' ? 'ancla-top' : GRUPOS[capa.grupo].ancla
  const fuente = capa.formato === 'mvt' ? { 'source-layer': capa.capa_fuente } : {}
  const capas = capasMapa(capa).map((l) => (
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    <Layer key={l.id} {...(l as any)} {...fuente} layout={{ ...l.layout, visibility: vis }} beforeId={before} />
  ))
  // el predio bajo el cursor se dibuja resaltado: avisa que se puede consultar con un clic
  const sobre = capa.nombre === 'predios' ? (
    <Layer key="predios-sobre" id="predios-sobre" type="line" {...fuente} beforeId="ancla-top"
      filter={['==', ['get', 'numero_predial'], predialSobre ?? '']}
      layout={{ visibility: vis }} paint={{ 'line-color': '#c8f04f', 'line-width': 2.5 }} />
  ) : null
  // Las capas pequeñas van como GeoJSON: el navegador las trocea y nunca depende de teselas que puedan tardar o faltar,
  // así no parpadean ni desaparecen al acercar o alejar.
  return capa.formato === 'geojson' ? (
    <Source id={`src-${capa.nombre}`} type="geojson" data={capa.geojson!} buffer={128} tolerance={0.2}>{capas}{sobre}</Source>
  ) : (
    <Source id={`src-${capa.nombre}`} type="vector" tiles={[capa.tiles!]} minzoom={capa.minzoom} maxzoom={capa.maxzoom}>{capas}{sobre}</Source>
  )
}

const Pin = memo(function Pin({ f, estado, compacto, onSelect, onSobre }: {
  f: InmuebleFeature
  estado: 'activo' | 'sobre' | undefined
  compacto: boolean
  onSelect: (id: number) => void
  onSobre: (id: number | null) => void
}) {
  const p = f.properties
  const [lon, lat] = f.geometry.coordinates
  return (
    <Marker longitude={lon} latitude={lat} anchor={compacto ? 'center' : 'bottom'} offset={compacto ? [0, 0] : [0, -5]}
      style={{ zIndex: estado === 'activo' ? 3 : estado === 'sobre' ? 2 : 1 }}
      onClick={(e) => { e.originalEvent.stopPropagation(); onSelect(f.id) }}>
      <button type="button" className="pin" data-estado={estado} data-compacto={compacto && !estado ? '' : undefined}
        style={{ '--op': COLOR_OPERACION[p.operacion] } as React.CSSProperties}
        aria-label={`${NOMBRE_TIPO[p.tipo]} en ${p.operacion}, ${fmtCOP(p.precio)}`}
        aria-pressed={estado === 'activo'}
        onMouseEnter={() => onSobre(f.id)} onMouseLeave={() => onSobre(null)}>
        {!(compacto && !estado) && <><i />{fmtCorto(p.precio)}</>}
      </button>
    </Marker>
  )
})

function BotonMapa({ icono, etiqueta, onClick, activo = false }: { icono: NombreIcono; etiqueta: string; onClick: () => void; activo?: boolean }) {
  return (
    <button type="button" aria-label={etiqueta} title={etiqueta} onClick={onClick}
      className={`grid size-9 place-items-center transition-colors duration-150 ${activo ? 'bg-marca text-tinta' : 'bg-hoja text-tinta hover:bg-papel'}`}>
      <Icono n={icono} className="size-[18px]" />
    </button>
  )
}

export default function MapView({ mapRef, capas, activadas, visibles, baseId, onBase, inmuebles, inmuebleSel, inmuebleSobre, predioSel, zonaGeom, controlesCorridos, onSelectInmueble, onSobreInmueble, onSelectPredio, children }: Props) {
  const [cursor, setCursor] = useState('')
  const [predialSobre, setPredialSobre] = useState<string | null>(null)
  const [compacto, setCompacto] = useState(CENTRO_INICIAL.zoom < ZOOM_ETIQUETAS)
  const [girado, setGirado] = useState(false)
  const [ubicando, setUbicando] = useState(false)
  const estilo = useMemo(() => ESTILO_BASE, [])
  const ubicacion = useRef<ControlUbicacion>(null)
  const lectura = useRef<HTMLSpanElement>(null)
  const lecturaZoom = useRef<HTMLSpanElement>(null)

  // la lectura de coordenadas se escribe directo en el DOM: no vuelve a dibujar el mapa en cada movimiento del cursor
  const escribir = (lat: number, lon: number) => { if (lectura.current) lectura.current.textContent = `${fmtGMS(lat, 'lat')}   ${fmtGMS(lon, 'lon')}` }

  const alMover = (e: MapLayerMouseEvent) => {
    escribir(e.lngLat.lat, e.lngLat.lng)
    const f = e.features?.[0]
    setCursor(f ? 'pointer' : '')
    const np = f?.properties?.numero_predial ? String(f.properties.numero_predial) : null
    setPredialSobre((a) => (a === np ? a : np))
  }

  const alClick = (e: MapLayerMouseEvent) => {
    const f = e.features?.[0]
    if (!f) return onSelectInmueble(null)
    if (f.properties?.numero_predial) onSelectPredio(String(f.properties.numero_predial))
  }

  const mapa = () => mapRef.current

  return (
    <Map
      ref={mapRef}
      initialViewState={CENTRO_INICIAL}
      mapStyle={estilo}
      maxZoom={19.5}
      interactiveLayerIds={['predios-fill']}
      cursor={cursor}
      attributionControl={{ compact: true }}
      onMouseMove={alMover}
      onMouseOut={() => setPredialSobre(null)}
      onClick={alClick}
      onLoad={(e) => { const c = e.target.getCenter(); escribir(c.lat, c.lng) }}
      onMove={(e) => {
        const z = e.viewState.zoom
        if (lecturaZoom.current) lecturaZoom.current.textContent = `z ${z.toFixed(1)}`
        setCompacto((c) => (c === z < ZOOM_ETIQUETAS ? c : !c))
        setGirado((g) => (g === (Math.abs(e.viewState.bearing) > 0.5 || e.viewState.pitch > 0.5) ? g : !g))
        if (!window.matchMedia('(hover: hover)').matches) escribir(e.viewState.latitude, e.viewState.longitude)
      }}
      style={{ width: '100%', height: '100%' }}
    >
      {MAPAS_BASE.map((m) => (
        <Source key={m.id} id={`base-${m.id}`} type="raster" tiles={m.tiles} tileSize={256} maxzoom={m.maxzoom} attribution={m.attribution}>
          <Layer id={`base-${m.id}`} type="raster" beforeId="ancla-amb" layout={{ visibility: baseId === m.id ? 'visible' : 'none' }} />
        </Source>
      ))}

      {capas.filter((c) => activadas.has(c.nombre)).map((c) => (
        <CapaVectorial key={c.nombre} capa={c} visible={visibles.has(c.nombre)} predialSobre={c.nombre === 'predios' ? predialSobre : null} />
      ))}

      {zonaGeom && (
        <Source id="sel-zona" type="geojson" data={{ type: 'Feature', properties: {}, geometry: zonaGeom }}>
          <Layer id="sel-zona-fill" type="fill" paint={{ 'fill-color': '#c8f04f', 'fill-opacity': 0.08 }} />
          <Layer id="sel-zona-casing" type="line" paint={{ 'line-color': '#14211b', 'line-width': 6, 'line-opacity': 0.6, 'line-blur': 1 }} />
          <Layer id="sel-zona-line" type="line" paint={{ 'line-color': '#c8f04f', 'line-width': 2.4 }} />
        </Source>
      )}

      {predioSel && (
        <Source id="sel-predio" type="geojson" data={{ type: 'Feature', properties: {}, geometry: predioSel.geometry }}>
          <Layer id="sel-predio-fill" type="fill" paint={{ 'fill-color': '#c8f04f', 'fill-opacity': 0.22 }} />
          <Layer id="sel-predio-casing" type="line" paint={{ 'line-color': '#14211b', 'line-width': 5.5, 'line-opacity': 0.7 }} />
          <Layer id="sel-predio-line" type="line" paint={{ 'line-color': '#c8f04f', 'line-width': 2.5 }} />
        </Source>
      )}

      {inmuebles.map((f) => (
        <Pin key={f.id} f={f} compacto={compacto} onSelect={onSelectInmueble} onSobre={onSobreInmueble}
          estado={f.id === inmuebleSel ? 'activo' : f.id === inmuebleSobre ? 'sobre' : undefined} />
      ))}

      {/* control nativo oculto: gestiona permisos y el punto de ubicación; lo dispara el botón propio */}
      <GeolocateControl ref={ubicacion} position="top-left" trackUserLocation
        onTrackUserLocationStart={() => setUbicando(true)} onTrackUserLocationEnd={() => setUbicando(false)} onError={() => setUbicando(false)} />
      <ScaleControl position="bottom-right" maxWidth={110} />

      <div className={`absolute top-[4.25rem] z-10 flex flex-col gap-2 transition-[right] duration-300 ease-salida md:top-3 ${controlesCorridos ? 'right-2 md:right-[24.5rem]' : 'right-2 md:right-3'}`}>
        <div className="flex flex-col divide-y divide-linea overflow-hidden rounded-lg border border-linea-2 shadow-flota">
          <BotonMapa icono="mas" etiqueta="Acercar" onClick={() => mapa()?.zoomIn()} />
          <BotonMapa icono="menos" etiqueta="Alejar" onClick={() => mapa()?.zoomOut()} />
        </div>
        <div className="flex flex-col divide-y divide-linea overflow-hidden rounded-lg border border-linea-2 shadow-flota">
          <BotonMapa icono="ubicar" etiqueta={ubicando ? 'Dejar de seguir mi ubicación' : 'Ir a mi ubicación'} activo={ubicando} onClick={() => ubicacion.current?.trigger()} />
          <BotonMapa icono="inicio" etiqueta="Ver todo Acacías" onClick={() => mapa()?.flyTo({ center: [CENTRO_INICIAL.longitude, CENTRO_INICIAL.latitude], zoom: CENTRO_INICIAL.zoom, bearing: 0, pitch: 0, duration: 1100 })} />
          {girado && <BotonMapa icono="norte" etiqueta="Orientar al norte" onClick={() => mapa()?.easeTo({ bearing: 0, pitch: 0, duration: 500 })} />}
        </div>
      </div>

      <div className="pointer-events-none absolute bottom-[5.25rem] left-2 z-10 flex flex-col items-start gap-2 md:bottom-3 md:left-3">
        {children}
        <div role="group" aria-label="Mapa base" className="pointer-events-auto flex gap-0.5 rounded-lg border border-linea-2 bg-hoja p-0.5 shadow-flota">
          {MAPAS_BASE.map((m) => (
            <button key={m.id} type="button" aria-pressed={baseId === m.id} onClick={() => onBase(m.id)}
              className={`flex items-center gap-2 rounded-md py-1 pl-1 pr-2.5 text-[13px] font-medium transition-colors duration-150 ${baseId === m.id ? 'bg-tinta text-hoja' : 'text-tinta-2 hover:text-tinta'}`}>
              <span className="size-6 rounded ring-1 ring-tinta/20" style={{ background: m.id === 'esri' ? 'linear-gradient(135deg,#3f5a22,#77705f 55%,#24415f)' : 'linear-gradient(135deg,#eceae2,#d3e2c8 55%,#bcd6f5)' }} />
              {m.id === 'esri' ? 'Satélite' : 'Calles'}
            </button>
          ))}
        </div>
      </div>

      <p className="pointer-events-none absolute bottom-3 left-1/2 z-10 hidden -translate-x-1/2 items-center gap-3 whitespace-pre rounded-md bg-tinta/85 px-2.5 py-1 font-mono text-[11px] font-medium text-hoja lg:flex" aria-hidden="true">
        <span ref={lectura} />
        <span ref={lecturaZoom} className="text-marca">z {CENTRO_INICIAL.zoom.toFixed(1)}</span>
      </p>
    </Map>
  )
}
