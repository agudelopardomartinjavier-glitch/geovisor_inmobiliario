import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { keepPreviousData, useQuery } from '@tanstack/react-query'
import type { MapRef } from 'react-map-gl/maplibre'
import { getCapas, getInmuebles, getPredio, getZona, getZonas } from './lib/api'
import { bonito } from './lib/mapa'
import { useDebounce } from './lib/useDebounce'
import type { Filtros, ZonaRef } from './lib/types'
import MapView from './components/MapView'
import FilterPanel, { FILTROS_VACIOS } from './components/FilterPanel'
import LayerControl from './components/LayerControl'
import Buscador from './components/Buscador'
import PredioPanel from './components/PredioPanel'
import Leyenda from './components/Leyenda'
import ListaInmuebles from './components/ListaInmuebles'
import DetalleInmueble from './components/DetalleInmueble'
import { Chip, Icono, Logo, useMovil } from './components/ui'

const CAPAS_INICIALES = ['predios']
type Pestana = 'inmuebles' | 'capas'

export default function App() {
  const mapRef = useRef<MapRef>(null)
  const movil = useMovil()
  const [pestana, setPestana] = useState<Pestana>('inmuebles')
  /** En pantallas angostas el panel es una hoja inferior: recogida deja ver el mapa. */
  const [hoja, setHoja] = useState(false)
  const [filtros, setFiltros] = useState<Filtros>(FILTROS_VACIOS)
  const filtrosDeb = useDebounce(filtros)
  const [baseId, setBaseId] = useState('esri')
  const [visibles, setVisibles] = useState<Set<string>>(new Set(CAPAS_INICIALES))
  const [activadas, setActivadas] = useState<Set<string>>(new Set(CAPAS_INICIALES))
  const [inmuebleId, setInmuebleId] = useState<number | null>(null)
  const [sobreId, setSobreId] = useState<number | null>(null)
  const [predial, setPredial] = useState<string | null>(null)
  const zoomPendiente = useRef(false)
  const cuerpo = useRef<HTMLDivElement>(null)
  // solo en desarrollo: deja el mapa en window.__map para poder probarlo desde la consola
  useEffect(() => {
    if (!import.meta.env.DEV) return
    const t = setInterval(() => {
      const m = mapRef.current?.getMap()
      if (m) { (window as unknown as { __map?: unknown }).__map = m; clearInterval(t) }
    }, 300)
    return () => clearInterval(t)
  }, [])
  const enlaceAbierto = useRef(false)
  const zonaPendiente = useRef(false)

  const capas = useQuery({ queryKey: ['capas'], queryFn: getCapas })
  const inmuebles = useQuery({ queryKey: ['inmuebles', filtrosDeb], queryFn: () => getInmuebles(filtrosDeb), placeholderData: keepPreviousData })
  const zonas = useQuery({ queryKey: ['zonas'], queryFn: getZonas })
  const zonaSel = filtros.zona
  const zonaDetalle = useQuery({ queryKey: ['zona', zonaSel?.tipo, zonaSel?.nombre], queryFn: () => getZona(zonaSel!.tipo, zonaSel!.nombre), enabled: !!zonaSel, retry: false })
  const predio = useQuery({ queryKey: ['predio', predial], queryFn: () => getPredio(predial!), enabled: !!predial, retry: false })

  const lista = useMemo(() => inmuebles.data?.features ?? [], [inmuebles.data])
  const inmuebleSel = useMemo(() => lista.find((f) => f.id === inmuebleId) ?? null, [lista, inmuebleId])
  const predioAbierto = !!predial && !!predio.data

  /** Márgenes para que lo enfocado no quede bajo la hoja inferior (móvil) ni bajo el panel del predio (escritorio). */
  const margen = useCallback(
    (conPredio: boolean) => (window.innerWidth < 768 ? { top: 90, left: 36, right: 36, bottom: 110 } : { top: 70, left: 70, right: conPredio ? 440 : 70, bottom: 70 }),
    [],
  )

  // Zoom al predio buscado (no al hacer clic en el mapa, para no mover la vista)
  useEffect(() => {
    const p = predio.data
    if (!p || !zoomPendiente.current) return
    zoomPendiente.current = false
    mapRef.current?.fitBounds([[p.bbox[0], p.bbox[1]], [p.bbox[2], p.bbox[3]]], { padding: margen(true), maxZoom: 19, duration: 1200 })
  }, [predio.data, margen])

  const volarA = useCallback((id: number, zoomMin = 16) => {
    const f = inmuebles.data?.features.find((x) => x.id === id)
    const m = mapRef.current
    if (!f || !m) return
    m.flyTo({ center: f.geometry.coordinates, zoom: Math.max(m.getZoom(), zoomMin), padding: margen(!!predial), duration: 900 })
  }, [inmuebles.data, margen, predial])

  /** Abre la ficha de un inmueble en el panel. Desde la lista o un enlace, además lleva el mapa hasta él. */
  const abrirInmueble = useCallback((id: number | null) => {
    setInmuebleId(id)
    if (id == null) return
    setPestana('inmuebles')
    setHoja(true)
    cuerpo.current?.scrollTo({ top: 0 })
  }, [])
  const abrirYVolar = useCallback((id: number) => { abrirInmueble(id); volarA(id) }, [abrirInmueble, volarA])

  // Enlace directo ?inmueble=ID (el que lleva el mensaje de WhatsApp): abre la ficha y centra el mapa
  useEffect(() => {
    if (enlaceAbierto.current || !inmuebles.data) return
    const id = Number(new URLSearchParams(window.location.search).get('inmueble'))
    enlaceAbierto.current = true
    if (id && inmuebles.data.features.some((x) => x.id === id)) {
      abrirInmueble(id)
      volarA(id, 17)
    }
  }, [inmuebles.data, abrirInmueble, volarA])

  /** «Quiero ver ofertas en X barrio»: filtra, resalta el contorno y lleva el mapa allá. */
  const elegirZona = useCallback((z: ZonaRef | null) => {
    zonaPendiente.current = !!z
    setInmuebleId(null)
    setPredial(null)
    setFiltros((f) => ({ ...f, zona: z }))
    if (z) { setPestana('inmuebles'); setHoja(false) }
  }, [])

  useEffect(() => {
    const z = zonaDetalle.data
    if (!z || !zonaPendiente.current) return
    zonaPendiente.current = false
    mapRef.current?.fitBounds([[z.bbox[0], z.bbox[1]], [z.bbox[2], z.bbox[3]]], { padding: margen(false), maxZoom: 17, duration: 1400 })
  }, [zonaDetalle.data, margen])

  // Enlace directo ?barrio=NOMBRE o ?vereda=NOMBRE
  const zonaEnlace = useRef(false)
  useEffect(() => {
    if (zonaEnlace.current || !zonas.data) return
    zonaEnlace.current = true
    const q = new URLSearchParams(window.location.search)
    const tipo = q.get('barrio') ? 'barrio' : q.get('vereda') ? 'vereda' : null
    const nombre = q.get(tipo ?? '')
    const z = tipo && nombre ? zonas.data.find((x) => x.tipo === tipo && x.nombre.toLowerCase() === nombre.toLowerCase()) : null
    if (z) elegirZona({ tipo: z.tipo, nombre: z.nombre })
  }, [zonas.data, elegirZona])

  // Escape cierra lo último que se abrió: primero el predio, luego la ficha del inmueble
  useEffect(() => {
    const alTeclear = (e: KeyboardEvent) => {
      if (e.key !== 'Escape' || /^(INPUT|TEXTAREA|SELECT)$/.test((e.target as HTMLElement).tagName)) return
      if (predial) setPredial(null)
      else if (inmuebleId != null) setInmuebleId(null)
    }
    window.addEventListener('keydown', alTeclear)
    return () => window.removeEventListener('keydown', alTeclear)
  }, [predial, inmuebleId])

  const toggleCapa = (nombre: string) => {
    setVisibles((v) => {
      const n = new Set(v)
      if (!n.delete(nombre)) n.add(nombre)
      return n
    })
    setActivadas((a) => (a.has(nombre) ? a : new Set(a).add(nombre)))
  }

  /** Vista rápida: deja visibles solo estas capas (los predios conservan su estado). */
  const aplicarVista = (nombres: string[]) => {
    setVisibles((v) => new Set([...(v.has('predios') ? ['predios'] : []), ...nombres]))
    setActivadas((a) => new Set([...a, ...nombres]))
  }

  const buscarPredio = useCallback((np: string, conZoom = true) => {
    zoomPendiente.current = conZoom
    if (conZoom) setInmuebleId(null)
    setPredial(np)
    setHoja(false)
  }, [])
  const predioDelMapa = useCallback((np: string) => { zoomPendiente.current = false; setPredial(np) }, [])

  const errorBusqueda = predio.isError && predial ? ((predio.error as { status?: number }).status === 404 ? 'No se encontró ese número predial. Revisa los dígitos.' : 'No se pudo consultar el predio. Inténtalo de nuevo.') : null

  const zonaActual = zonaSel ? zonas.data?.find((x) => x.tipo === zonaSel.tipo && x.nombre === zonaSel.nombre) ?? null : null
  const destacadas = useMemo(() => (zonas.data ?? []).filter((z) => z.tipo === 'barrio' && z.total > 0).slice(0, 8), [zonas.data])
  const capasActivas = (capas.data ?? []).filter((c) => visibles.has(c.nombre) && c.nombre !== 'predios').length
  const hayFiltros = JSON.stringify(filtros) !== JSON.stringify(FILTROS_VACIOS)
  const total = inmuebles.data?.total ?? 0
  const recogida = movil && !hoja

  const pestanas: { id: Pestana; nombre: string; n: number; icono: 'lista' | 'capas' }[] = [
    { id: 'inmuebles', nombre: 'Inmuebles', n: total, icono: 'lista' },
    { id: 'capas', nombre: 'Capas', n: capasActivas, icono: 'capas' },
  ]

  return (
    <div className="visor relative h-full overflow-hidden bg-papel md:grid md:grid-cols-[25rem_minmax(0,1fr)] md:grid-rows-[auto_minmax(0,1fr)]">
      <header className="pointer-events-none absolute inset-x-2 top-2 z-40 md:pointer-events-auto md:static md:col-start-1 md:row-start-1 md:border-r md:border-linea-2 md:px-4 md:pb-3 md:pt-4">
        <div className="mb-3 hidden items-center gap-3 md:flex">
          <Logo />
          <div className="min-w-0">
            <h1 className="text-[17px] font-semibold leading-tight tracking-[-0.01em] text-tinta">Geovisor inmobiliario</h1>
            <p className="text-[13px] text-tinta-2">Acacías, Meta</p>
          </div>
        </div>
        <div className="pointer-events-auto flex items-start gap-2">
          <h1 className="md:hidden"><span className="sr-only">Geovisor inmobiliario de Acacías, Meta</span><Logo className="size-11 rounded-lg shadow-flota" /></h1>
          <div className="min-w-0 flex-1">
            <Buscador zonas={zonas.data ?? []} buscandoPredio={predio.isFetching} errorPredio={errorBusqueda} onZona={elegirZona} onPredio={buscarPredio} />
          </div>
        </div>
      </header>

      <section aria-label="Inmuebles y capas"
        className={`absolute inset-x-0 bottom-0 z-20 flex h-[76dvh] flex-col rounded-t-xl border-t border-linea-2 bg-papel shadow-panel transition-transform duration-300 ease-salida md:static md:col-start-1 md:row-start-2 md:h-auto md:min-h-0 md:translate-y-0 md:rounded-none md:border-r md:border-t-0 md:shadow-none ${recogida ? 'translate-y-[calc(100%-4rem)]' : 'translate-y-0'}`}>
        <button type="button" aria-expanded={!recogida} onClick={() => setHoja((v) => !v)} className="flex shrink-0 flex-col items-center pb-0.5 pt-2 md:hidden"
          aria-label={recogida ? 'Mostrar el panel de inmuebles y capas' : 'Recoger el panel para ver el mapa'}>
          <span className="h-1 w-9 rounded-full bg-linea-2" />
        </button>

        <div role="tablist" aria-label="Contenido del panel" className="flex shrink-0 gap-5 border-b border-linea-2 px-4">
          {pestanas.map((t) => (
            <button key={t.id} role="tab" type="button" id={`pestana-${t.id}`} aria-selected={pestana === t.id} aria-controls="cuerpo-panel"
              onClick={() => { setPestana(t.id); if (movil) setHoja(pestana === t.id ? !hoja : true) }}
              className={`relative flex items-center gap-2 py-2.5 text-sm transition-colors duration-150 ${pestana === t.id ? 'font-semibold text-tinta' : 'font-medium text-tinta-3 hover:text-tinta'}`}>
              <Icono n={t.icono} />
              {t.nombre}
              <span className={`cifras rounded-full px-1.5 text-xs font-semibold leading-5 ${t.id === 'capas' && t.n > 0 ? 'bg-marca text-tinta' : 'bg-linea/80 text-tinta-2'}`}>{t.id === 'inmuebles' && inmuebles.isLoading ? '…' : t.n}</span>
              {pestana === t.id && <span className="absolute inset-x-0 -bottom-px h-0.5 bg-tinta" />}
            </button>
          ))}
        </div>

        <div ref={cuerpo} id="cuerpo-panel" role="tabpanel" aria-labelledby={`pestana-${pestana}`} inert={recogida} className="min-h-0 flex-1 overflow-y-auto overscroll-contain">
          {pestana === 'capas' ? (
            <LayerControl capas={capas.data ?? []} cargando={capas.isLoading} error={capas.isError} visibles={visibles} onToggle={toggleCapa} onPreset={aplicarVista} />
          ) : inmuebleSel ? (
            <DetalleInmueble inmueble={inmuebleSel} onVolver={() => setInmuebleId(null)} onVerPredio={(np) => buscarPredio(np, false)} onCentrar={() => { volarA(inmuebleSel.id, 17); if (movil) setHoja(false) }} />
          ) : (
            <div className="entra-vista">
              <div className="space-y-3 border-b border-linea px-4 py-3.5">
                {zonaActual ? (
                  <div className="flex items-center gap-2.5 rounded-lg bg-marca px-3 py-2">
                    <Icono n="pin" className="size-[18px]" />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-semibold text-tinta">{zonaActual.tipo === 'vereda' ? 'Vereda ' : 'Barrio '}{bonito(zonaActual.nombre)}</p>
                      <p className="cifras text-xs text-tinta/75">{zonaActual.total ? `${zonaActual.total} ${zonaActual.total === 1 ? 'oferta publicada' : 'ofertas publicadas'}` : 'Sin ofertas publicadas por ahora'}</p>
                    </div>
                    <button type="button" onClick={() => elegirZona(null)} className="flex shrink-0 items-center gap-1 rounded-md border border-tinta/30 px-2 py-1 text-[13px] font-medium text-tinta transition-colors hover:border-tinta hover:bg-marca-2">
                      Ver todo Acacías
                    </button>
                  </div>
                ) : destacadas.length > 0 && (
                  <div>
                    <h2 className="mb-1.5 text-[13px] font-medium text-tinta-2">Ofertas por barrio</h2>
                    <div className="-mx-4 flex gap-1.5 overflow-x-auto px-4 pb-0.5 [scrollbar-width:none]">
                      {destacadas.map((z) => (
                        <Chip key={z.nombre} onClick={() => elegirZona({ tipo: z.tipo, nombre: z.nombre })}>
                          {bonito(z.nombre)} <span className="cifras text-tinta-3">{z.total}</span>
                        </Chip>
                      ))}
                    </div>
                  </div>
                )}
                <FilterPanel filtros={filtros} onChange={setFiltros} />
              </div>
              <ListaInmuebles
                inmuebles={lista}
                cargando={inmuebles.isFetching || filtros !== filtrosDeb}
                primeraCarga={inmuebles.isLoading}
                error={inmuebles.isError}
                hayFiltros={hayFiltros}
                sobre={sobreId}
                onSobre={setSobreId}
                onAbrir={abrirYVolar}
                onLimpiar={() => setFiltros(FILTROS_VACIOS)}
                onReintentar={() => void inmuebles.refetch()}
              />
            </div>
          )}
        </div>
      </section>

      <main className="absolute inset-0 md:static md:col-start-2 md:row-span-2 md:row-start-1 md:min-h-0">
        <div className="relative size-full">
          <MapView
            mapRef={mapRef}
            capas={capas.data ?? []}
            activadas={activadas}
            visibles={visibles}
            baseId={baseId}
            onBase={setBaseId}
            inmuebles={lista}
            inmuebleSel={inmuebleId}
            inmuebleSobre={sobreId}
            predioSel={predioAbierto ? predio.data! : null}
            zonaGeom={filtros.zona && zonaDetalle.data ? zonaDetalle.data.geometry : null}
            controlesCorridos={predioAbierto}
            onSelectInmueble={abrirInmueble}
            onSobreInmueble={setSobreId}
            onSelectPredio={predioDelMapa}
          >
            <Leyenda capas={capas.data ?? []} visibles={visibles} />
          </MapView>
          {capas.isError && (
            <p role="alert" className="absolute left-1/2 top-[4.25rem] z-10 w-max max-w-[calc(100%-1.5rem)] -translate-x-1/2 rounded-md bg-alerta px-3 py-2 text-[13px] font-medium text-white shadow-flota md:top-3">
              No hay conexión con el servidor de datos. El mapa se muestra sin capas.
            </p>
          )}
          {predioAbierto && (
            <PredioPanel
              predio={predio.data!}
              onClose={() => setPredial(null)}
              onCentrar={() => mapRef.current?.fitBounds([[predio.data!.bbox[0], predio.data!.bbox[1]], [predio.data!.bbox[2], predio.data!.bbox[3]]], { padding: margen(true), maxZoom: 19, duration: 900 })}
              onVerInmueble={(id) => { abrirInmueble(id); volarA(id, 17) }}
            />
          )}
        </div>
      </main>
    </div>
  )
}
