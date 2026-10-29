import { useEffect, useMemo, useRef, useState } from 'react'
import { keepPreviousData, useQuery } from '@tanstack/react-query'
import type { MapRef } from 'react-map-gl/maplibre'
import { getCapas, getInmuebles, getPredio, getZona, getZonas } from './lib/api'
import { useDebounce } from './lib/useDebounce'
import type { Filtros, Operacion, ZonaRef } from './lib/types'
import MapView from './components/MapView'
import FilterPanel, { FILTROS_VACIOS } from './components/FilterPanel'
import LayerControl from './components/LayerControl'
import SearchBar from './components/SearchBar'
import PredioPanel from './components/PredioPanel'
import Leyenda from './components/Leyenda'
import ZonaSelector from './components/ZonaSelector'
import OfertasZona from './components/OfertasZona'
import { Logo, Tarjeta } from './components/ui'

const CAPAS_INICIALES = ['predios']

export default function App() {
  const mapRef = useRef<MapRef>(null)
  const [menu, setMenu] = useState(false)
  const [filtros, setFiltros] = useState<Filtros>(FILTROS_VACIOS)
  const filtrosDeb = useDebounce(filtros)
  const [baseId, setBaseId] = useState('esri')
  const [visibles, setVisibles] = useState<Set<string>>(new Set(CAPAS_INICIALES))
  const [activadas, setActivadas] = useState<Set<string>>(new Set(CAPAS_INICIALES))
  const [inmuebleId, setInmuebleId] = useState<number | null>(null)
  const [predial, setPredial] = useState<string | null>(null)
  const zoomPendiente = useRef(false)
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

  const inmuebleSel = useMemo(
    () => inmuebles.data?.features.find((f) => f.id === inmuebleId) ?? null,
    [inmuebles.data, inmuebleId],
  )

  // Zoom al predio buscado (no al hacer clic en el mapa, para no mover la vista)
  useEffect(() => {
    const p = predio.data
    if (!p || !zoomPendiente.current) return
    zoomPendiente.current = false
    const movil = window.innerWidth < 768
    mapRef.current?.fitBounds([[p.bbox[0], p.bbox[1]], [p.bbox[2], p.bbox[3]]], {
      padding: movil ? { top: 70, left: 40, right: 40, bottom: 300 } : { top: 80, left: 80, right: 440, bottom: 80 },
      maxZoom: 19,
      duration: 1200,
    })
  }, [predio.data])

  // Enlace directo ?inmueble=ID (el que lleva el mensaje de WhatsApp): abre la ficha y centra el mapa
  useEffect(() => {
    if (enlaceAbierto.current || !inmuebles.data) return
    const id = Number(new URLSearchParams(window.location.search).get('inmueble'))
    if (!id) { enlaceAbierto.current = true; return }
    const f = inmuebles.data.features.find((x) => x.id === id)
    enlaceAbierto.current = true
    if (f) {
      setInmuebleId(id)
      mapRef.current?.flyTo({ center: f.geometry.coordinates, zoom: 17, padding: { top: 380, bottom: 0, left: 0, right: 0 }, duration: 1200 })
    }
  }, [inmuebles.data])

  /** «Quiero ver ofertas en X barrio»: filtra, resalta el contorno y lleva el mapa allá. */
  const elegirZona = (z: ZonaRef | null) => {
    zonaPendiente.current = !!z
    setInmuebleId(null)
    setPredial(null)
    setFiltros((f) => ({ ...f, zona: z }))
    if (z) setMenu(false)
  }

  useEffect(() => {
    const z = zonaDetalle.data
    if (!z || !zonaPendiente.current) return
    zonaPendiente.current = false
    const movil = window.innerWidth < 768
    mapRef.current?.fitBounds([[z.bbox[0], z.bbox[1]], [z.bbox[2], z.bbox[3]]], {
      padding: movil ? { top: 70, left: 24, right: 24, bottom: 290 } : { top: 70, left: 70, right: 70, bottom: 270 },
      maxZoom: 17, duration: 1400,
    })
  }, [zonaDetalle.data])

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
  }, [zonas.data])

  /** Al tocar una tarjeta de la franja de ofertas: abre el inmueble y lo centra sin que lo tape la franja. */
  const verInmueble = (id: number) => {
    setInmuebleId(id)
    const f = inmuebles.data?.features.find((x) => x.id === id)
    if (f) {
      const movil = window.innerWidth < 768
      mapRef.current?.flyTo({ center: f.geometry.coordinates, zoom: Math.max(mapRef.current.getZoom(), 16), padding: movil ? { top: 0, bottom: 300, left: 0, right: 0 } : { top: 0, bottom: 250, left: 0, right: 0 }, duration: 900 })
    }
  }

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

  const buscar = (np: string) => {
    zoomPendiente.current = true
    setInmuebleId(null)
    setPredial(np)
    setMenu(false)
  }

  const errorBusqueda = predio.isError && predial ? (predio.error as { status?: number }).status === 404 ? 'No se encontró ese número predial.' : 'No se pudo consultar el predio.' : null

  return (
    <div className="flex h-full flex-col bg-slate-100 md:flex-row">
      {menu && <div className="fixed inset-0 z-20 bg-slate-900/50 backdrop-blur-[1px] md:hidden" onClick={() => setMenu(false)} />}
      <aside
        className={`fixed inset-y-0 left-0 z-30 flex w-[88%] max-w-sm flex-col bg-slate-100 shadow-2xl transition-transform md:static md:w-[21.5rem] md:max-w-none md:shrink-0 md:translate-x-0 md:shadow-none md:ring-1 md:ring-slate-200 ${menu ? 'translate-x-0' : '-translate-x-full'}`}
      >
        <header className="relative overflow-hidden bg-gradient-to-br from-emerald-900 via-emerald-800 to-teal-700 px-4 pb-4 pt-5 text-white">
          <div className="pointer-events-none absolute -right-8 -top-10 size-36 rounded-full bg-white/10" />
          <div className="pointer-events-none absolute -bottom-12 right-10 size-28 rounded-full bg-amber-300/15" />
          <div className="relative flex items-center gap-3">
            <Logo />
            <div className="min-w-0 flex-1">
              <h1 className="text-[17px] font-bold leading-tight tracking-tight">Geovisor inmobiliario</h1>
              <p className="text-xs text-emerald-100/90">Acacías · Meta</p>
            </div>
            <button type="button" aria-label="Cerrar menú" onClick={() => setMenu(false)} className="rounded-lg p-1 text-2xl leading-none text-white/80 hover:bg-white/10 md:hidden">×</button>
          </div>
        </header>

        <div className="min-h-0 flex-1 space-y-3 overflow-y-auto p-3">
          <Tarjeta titulo="Ofertas por barrio">
            <ZonaSelector zonas={zonas.data ?? []} seleccion={filtros.zona} onSeleccionar={elegirZona} />
          </Tarjeta>
          <Tarjeta titulo="Buscar predio">
            <SearchBar buscando={predio.isFetching} error={errorBusqueda} onBuscar={buscar} />
          </Tarjeta>
          <Tarjeta titulo="Inmuebles" derecha={<span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[11px] font-semibold text-emerald-800">{inmuebles.isFetching ? 'cargando…' : `${inmuebles.data?.total ?? 0} publicados`}</span>}>
            <FilterPanel filtros={filtros} onChange={setFiltros} />
          </Tarjeta>
          <Tarjeta titulo="Mapa y capas">
            {capas.isError && <p className="mb-2 text-xs text-red-600">No se pudo conectar con la API ({import.meta.env.VITE_API_URL}).</p>}
            <LayerControl capas={capas.data ?? []} visibles={visibles} onToggle={toggleCapa} onPreset={aplicarVista} baseId={baseId} onBase={setBaseId} />
          </Tarjeta>
          <p className="px-1 pb-2 text-[11px] leading-snug text-slate-400">Satélite: Esri World Imagery. Datos: catastro, POT y POMCA de Acacías. Información de referencia.</p>
        </div>
      </aside>

      <main className="relative min-h-0 flex-1">
        <MapView
          mapRef={mapRef}
          capas={capas.data ?? []}
          activadas={activadas}
          visibles={visibles}
          baseId={baseId}
          inmuebles={inmuebles.data}
          inmuebleSel={inmuebleSel}
          predioSel={predial && predio.data ? predio.data : null}
          zonaGeom={filtros.zona && zonaDetalle.data ? zonaDetalle.data.geometry : null}
          anclaPopup={filtros.zona ? 'left' : 'bottom'}
          onSelectInmueble={setInmuebleId}
          onSelectPredio={(np) => { setInmuebleId(null); setPredial(np) }}
        />
        <Leyenda capas={capas.data ?? []} visibles={visibles} ocultaEnMovil={!!filtros.zona} elevada={!!filtros.zona} />
        {filtros.zona && (() => {
          const z = zonas.data?.find((x) => x.tipo === filtros.zona!.tipo && x.nombre === filtros.zona!.nombre)
          return z ? (
            <OfertasZona
              zona={z}
              ofertas={inmuebles.data?.features ?? []}
              cargando={inmuebles.isFetching || filtros !== filtrosDeb}
              operacion={filtros.operacion}
              onOperacion={(o: Operacion | '') => setFiltros((f) => ({ ...f, operacion: o }))}
              seleccionado={inmuebleId}
              onSeleccionar={verInmueble}
              onCerrar={() => elegirZona(null)}
            />
          ) : null
        })()}
        <button
          type="button"
          onClick={() => setMenu(true)}
          className="absolute left-3 top-3 z-10 flex items-center gap-2 rounded-xl bg-emerald-800 px-3.5 py-2 text-sm font-semibold text-white shadow-lg md:hidden"
        >
          <span aria-hidden="true">☰</span> Filtros y capas
        </button>
        {predial && predio.data && (
          <PredioPanel
            predio={predio.data}
            onClose={() => setPredial(null)}
            onVerInmueble={(id) => {
              setInmuebleId(id)
              const f = inmuebles.data?.features.find((x) => x.id === id)
              if (f) {
                const movil = window.innerWidth < 768
                // deja libre el área del panel y la altura de la ficha para que el popup no quede tapado
                mapRef.current?.flyTo({ center: f.geometry.coordinates, zoom: 17, padding: movil ? { top: 0, bottom: 320, left: 0, right: 0 } : { top: 340, bottom: 0, left: 0, right: 420 } })
              }
            }}
          />
        )}
      </main>
    </div>
  )
}
