import { Suspense, lazy, useEffect, useMemo, useRef, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import type { MapRef } from 'react-map-gl/maplibre'
import { getCapas } from '../lib/api'
import type { Tipo } from '../lib/types'
import { fmtCOP, fmtNum } from '../lib/mapa'
import { useDebounce } from '../lib/useDebounce'
import {
  cambiarEstado, crear, crearComparable, editar, editarComparable, eliminar, eliminarComparable,
  guardarToken, leerToken, listar, listarComparables, me, mercadoM2, vinculosDe,
} from './api'
import AdminMap from './AdminMap'
import ComparableForm, { compADatos, compDesde, compVacio, type BorradorComp } from './ComparableForm'
import InmuebleForm, { aDatos, borradorVacio, desdeInmueble, type Borrador } from './InmuebleForm'
import CalorControl from './CalorControl'
import FichaPanel from './FichaPanel'
import HistorialPanel from './HistorialPanel'
import Login from './Login'
import ValoracionPanel from './ValoracionPanel'
import { COLOR_COMPARABLE, COLOR_ESTADO, type Comparable, type Estado, type InmuebleAdmin } from './tipos'

const ContabilidadApp = lazy(() => import('./contab/ContabilidadApp'))   // se carga solo al abrir «Contabilidad»

type Modo = { tipo: 'lista' } | { tipo: 'form'; id: number | null }
type Pestana = 'inmuebles' | 'comparables'

export default function AdminApp() {
  const [usuario, setUsuario] = useState<string | null>(null)
  const [verificando, setVerificando] = useState(!!leerToken())

  useEffect(() => {
    if (!leerToken()) return
    me().then((r) => setUsuario(r.usuario)).catch(() => guardarToken(null)).finally(() => setVerificando(false))
  }, [])

  if (verificando) return <div className="p-6 text-sm text-gray-500">Verificando sesión…</div>
  if (!usuario) return <Login onOk={setUsuario} />
  return <Panel usuario={usuario} onSalir={() => { guardarToken(null); setUsuario(null) }} />
}

function Panel({ usuario, onSalir }: { usuario: string; onSalir: () => void }) {
  const qc = useQueryClient()
  const mapRef = useRef<MapRef>(null)
  const [pestana, setPestana] = useState<Pestana>('inmuebles')
  const [vista, setVista] = useState<'mapa' | 'contab'>('mapa')

  // --- inmuebles
  const [modo, setModo] = useState<Modo>({ tipo: 'lista' })
  const [borrador, setBorrador] = useState<Borrador>(borradorVacio())
  const [error, setError] = useState<string | null>(null)
  const [estadoFiltro, setEstadoFiltro] = useState('')
  const [busqueda, setBusqueda] = useState('')
  const q = useDebounce(busqueda)

  // --- comparables
  const [modoComp, setModoComp] = useState<Modo>({ tipo: 'lista' })
  const [borradorComp, setBorradorComp] = useState<BorradorComp>(compVacio())
  const [errorComp, setErrorComp] = useState<string | null>(null)
  const [tipoComp, setTipoComp] = useState('')
  const [busquedaComp, setBusquedaComp] = useState('')
  const qComp = useDebounce(busquedaComp)

  // --- mapa de calor de valor por m²
  const [calorActivo, setCalorActivo] = useState(false)
  const [calorTipo, setCalorTipo] = useState<Tipo>('casa')
  const calor = useQuery({ queryKey: ['mercado-m2', calorTipo], queryFn: () => mercadoM2(calorTipo), enabled: calorActivo, staleTime: 60_000, retry: false })

  const capas = useQuery({ queryKey: ['capas'], queryFn: getCapas })
  const lista = useQuery({ queryKey: ['admin-inmuebles', estadoFiltro, q], queryFn: () => listar(estadoFiltro, q), retry: false })
  const todos = useQuery({ queryKey: ['admin-inmuebles', '', ''], queryFn: () => listar('', ''), retry: false })
  const comps = useQuery({ queryKey: ['admin-comparables', tipoComp, qComp], queryFn: () => listarComparables(tipoComp, qComp), retry: false })
  const todosComps = useQuery({ queryKey: ['admin-comparables', '', ''], queryFn: () => listarComparables(), retry: false })

  const id = modo.tipo === 'form' ? modo.id : null
  const idComp = modoComp.tipo === 'form' ? modoComp.id : null
  const vinculos = useQuery({ queryKey: ['vinculos', id], queryFn: () => vinculosDe(id!), enabled: id != null })
  const vinculados = useMemo(() => new Set(vinculos.data?.map((v) => v.comparable.id) ?? []), [vinculos.data])

  // sesión vencida → volver al login
  useEffect(() => {
    const e = [lista.error, todos.error, comps.error].find(Boolean) as { status?: number } | undefined
    if (e?.status === 401) onSalir()
  }, [lista.error, todos.error, comps.error, onSalir])

  const refrescar = () => qc.invalidateQueries({ queryKey: ['admin-inmuebles'] })
  const refrescarComps = () => qc.invalidateQueries({ queryKey: ['admin-comparables'] })

  const guardar = useMutation({
    mutationFn: () => (id ? editar(id, aDatos(borrador)) : crear(aDatos(borrador))),
    onSuccess: () => {
      setModo({ tipo: 'lista' }); setError(null); void refrescar()
      for (const k of ['historial', 'inversion', 'valoracion', 'mercado-m2', 'f-semaforo']) void qc.invalidateQueries({ queryKey: [k] })
    },
    onError: (e: Error) => setError(e.message),
  })
  const borrar = useMutation({
    mutationFn: () => eliminar(id!),
    onSuccess: () => { setModo({ tipo: 'lista' }); void refrescar() },
    onError: (e: Error) => setError(e.message),
  })
  const estado = useMutation({
    mutationFn: (v: { id: number; estado: Estado }) => cambiarEstado(v.id, v.estado),
    onSuccess: () => void refrescar(),
    onError: (e: Error) => window.alert(e.message),
  })

  const guardarComp = useMutation({
    mutationFn: () => (idComp ? editarComparable(idComp, compADatos(borradorComp)) : crearComparable(compADatos(borradorComp))),
    onSuccess: () => { setModoComp({ tipo: 'lista' }); setErrorComp(null); void refrescarComps(); if (volverA.current) { setPestana('inmuebles'); volverA.current = false } },
    onError: (e: Error) => setErrorComp(e.message),
  })
  const borrarComp = useMutation({
    mutationFn: () => eliminarComparable(idComp!),
    onSuccess: () => { setModoComp({ tipo: 'lista' }); void refrescarComps(); void qc.invalidateQueries({ queryKey: ['vinculos'] }); void qc.invalidateQueries({ queryKey: ['valoracion'] }) },
    onError: (e: Error) => setErrorComp(e.message),
  })

  /** true = al terminar el comparable se vuelve al inmueble que se estaba valorando */
  const volverA = useRef(false)

  const abrir = (i: InmuebleAdmin | null) => {
    setError(null)
    setBorrador(i ? desdeInmueble(i) : borradorVacio())
    setModo({ tipo: 'form', id: i?.id ?? null })
    if (i?.lon != null && i.lat != null) mapRef.current?.flyTo({ center: [i.lon, i.lat], zoom: 17 })
  }
  const abrirComp = (c: Comparable | null, desdeInmueble = false) => {
    setErrorComp(null)
    volverA.current = desdeInmueble
    setBorradorComp(c ? compDesde(c) : { ...compVacio(desdeInmueble ? (borrador.tipo === 'finca' ? 'finca' : borrador.tipo) : 'lote'), ...(desdeInmueble ? { lon: borrador.lon, lat: borrador.lat } : {}) })
    setModoComp({ tipo: 'form', id: c?.id ?? null })
    setPestana('comparables')
    if (c?.lon != null && c.lat != null) mapRef.current?.flyTo({ center: [c.lon, c.lat], zoom: 17 })
  }

  const enInmuebles = pestana === 'inmuebles'
  const editando = enInmuebles ? modo.tipo === 'form' : modoComp.tipo === 'form'
  const bp = enInmuebles ? borrador : borradorComp
  const punto = editando && bp.lon !== '' && bp.lat !== '' ? { lon: Number(bp.lon), lat: Number(bp.lat) } : null

  const tab = (p: Pestana, texto: string) => (
    <button type="button" onClick={() => setPestana(p)} aria-pressed={pestana === p}
      className={`flex-1 border-b-2 py-2 text-sm font-medium ${pestana === p ? (p === 'inmuebles' ? 'border-emerald-700 text-emerald-800' : 'border-violet-700 text-violet-800') : 'border-transparent text-gray-500'}`}>
      {texto}
    </button>
  )

  return (
    <div className="flex h-full flex-col">
      <header className="flex items-center justify-between bg-emerald-800 px-4 py-2 text-white">
        <h1 className="text-sm font-semibold">Administración · Geovisor inmobiliario Acacías</h1>
        <div className="flex items-center gap-3 text-xs">
          <button type="button" onClick={() => setVista(vista === 'mapa' ? 'contab' : 'mapa')} className="rounded border border-white/40 bg-white/10 px-2 py-1 font-medium">
            {vista === 'mapa' ? 'Contabilidad' : '← Inmuebles y mapa'}
          </button>
          <a href="/" target="_blank" rel="noopener noreferrer" className="rounded border border-white/40 bg-white/10 px-2 py-1 font-medium">Ver visor público ↗</a>
          <span>{usuario}</span>
          <button type="button" onClick={onSalir} className="rounded border border-white/40 px-2 py-1">Salir</button>
        </div>
      </header>

      {vista === 'contab' ? (
        <Suspense fallback={<div className="p-6 text-sm text-gray-500">Cargando contabilidad…</div>}><ContabilidadApp /></Suspense>
      ) : (
      <div className="flex min-h-0 flex-1 flex-col md:flex-row">
        <section className="order-2 flex min-h-0 flex-1 flex-col bg-white md:order-1 md:w-[26rem] md:flex-none md:border-r">
          <nav className="flex border-b" aria-label="Secciones">
            {tab('inmuebles', `Inmuebles (${todos.data?.length ?? 0})`)}
            {tab('comparables', `Comparables (${todosComps.data?.length ?? 0})`)}
          </nav>

          <div className="min-h-0 flex-1 overflow-y-auto p-4">
            {enInmuebles ? (
              modo.tipo === 'form' ? (
                <>
                  <InmuebleForm
                    id={id}
                    valor={borrador}
                    onChange={setBorrador}
                    error={error}
                    onGuardar={() => guardar.mutateAsync().then(() => undefined, () => undefined)}
                    onCancelar={() => setModo({ tipo: 'lista' })}
                    onEliminar={id ? () => borrar.mutateAsync().then(() => undefined, () => undefined) : undefined}
                  />
                  {id && <FichaPanel inmuebleId={id} tipo={borrador.tipo} />}
                  {id && <HistorialPanel inmuebleId={id} />}
                  {id ? <ValoracionPanel inmuebleId={id} onNuevoComparable={() => abrirComp(null, true)} /> : (
                    <p className="mt-2 border-t pt-3 text-xs text-gray-500">Guarda el inmueble para valorarlo con comparables.</p>
                  )}
                </>
              ) : (
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <h2 className="text-base font-bold">Inmuebles ({lista.data?.length ?? 0})</h2>
                    <button type="button" onClick={() => abrir(null)} className="rounded-md bg-emerald-700 px-3 py-1.5 text-sm font-medium text-white">+ Nuevo</button>
                  </div>
                  <div className="flex gap-2">
                    <input value={busqueda} onChange={(e) => setBusqueda(e.target.value)} placeholder="Buscar predial, propietario, notas…" className="min-w-0 flex-1 rounded-md border border-gray-300 px-2 py-1.5 text-sm" />
                    <select value={estadoFiltro} onChange={(e) => setEstadoFiltro(e.target.value)} className="rounded-md border border-gray-300 px-2 text-sm">
                      <option value="">Todos</option><option value="borrador">Borrador</option><option value="publicado">Publicado</option><option value="vendido">Vendido</option>
                    </select>
                  </div>
                  {lista.isError && <p className="text-sm text-red-600">No se pudo cargar la lista.</p>}
                  <ul className="space-y-2">
                    {lista.data?.map((i) => (
                      <li key={i.id} className="rounded-lg border border-gray-200 p-3 text-sm">
                        <div className="flex items-start justify-between gap-2">
                          <button type="button" onClick={() => abrir(i)} className="min-w-0 text-left">
                            <span className="font-semibold">#{i.id} · <span className="capitalize">{i.tipo}</span> en {i.operacion}</span>
                            <span className="block text-xs text-gray-600">{fmtCOP(i.precio)}</span>
                          </button>
                          <span className="shrink-0 rounded-full px-2 py-0.5 text-[11px] font-semibold text-white" style={{ background: COLOR_ESTADO[i.estado_publicacion] }}>{i.estado_publicacion}</span>
                        </div>
                        <dl className="mt-1 space-y-0.5 text-xs text-gray-600">
                          {i.numero_predial && <dd className="break-all font-mono">{i.numero_predial}</dd>}
                          {i.propietario && <dd><span className="text-amber-700">Propietario:</span> {i.propietario}</dd>}
                          {i.avaluo != null && <dd><span className="text-amber-700">Avalúo:</span> {fmtCOP(i.avaluo)}</dd>}
                          {i.notas_internas && <dd className="italic"><span className="not-italic text-amber-700">Nota:</span> {i.notas_internas}</dd>}
                        </dl>
                        <div className="mt-2 flex flex-wrap gap-2 text-xs">
                          <button type="button" onClick={() => abrir(i)} className="rounded border border-gray-300 px-2 py-1">Editar / valorar</button>
                          {i.estado_publicacion !== 'publicado' ? (
                            <button type="button" onClick={() => estado.mutate({ id: i.id, estado: 'publicado' })} className="rounded border border-emerald-600 px-2 py-1 text-emerald-700">Publicar</button>
                          ) : (
                            <>
                              <button type="button" onClick={() => estado.mutate({ id: i.id, estado: 'borrador' })} className="rounded border border-amber-500 px-2 py-1 text-amber-700">Despublicar</button>
                              <button type="button" onClick={() => estado.mutate({ id: i.id, estado: 'vendido' })} className="rounded border border-gray-400 px-2 py-1 text-gray-700">Marcar vendido</button>
                            </>
                          )}
                        </div>
                      </li>
                    ))}
                    {lista.data?.length === 0 && <li className="text-sm text-gray-500">No hay inmuebles con ese filtro.</li>}
                  </ul>
                </div>
              )
            ) : modoComp.tipo === 'form' ? (
              <ComparableForm
                id={idComp}
                valor={borradorComp}
                onChange={setBorradorComp}
                error={errorComp}
                onGuardar={() => guardarComp.mutateAsync().then(() => undefined, () => undefined)}
                onCancelar={() => { setModoComp({ tipo: 'lista' }); if (volverA.current) { setPestana('inmuebles'); volverA.current = false } }}
                onEliminar={idComp ? () => borrarComp.mutateAsync().then(() => undefined, () => undefined) : undefined}
              />
            ) : (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h2 className="text-base font-bold">Comparables ({comps.data?.length ?? 0})</h2>
                  <button type="button" onClick={() => abrirComp(null)} className="rounded-md bg-violet-700 px-3 py-1.5 text-sm font-medium text-white">+ Nuevo</button>
                </div>
                <div className="flex gap-2">
                  <input value={busquedaComp} onChange={(e) => setBusquedaComp(e.target.value)} placeholder="Buscar sector, fuente, predial…" className="min-w-0 flex-1 rounded-md border border-gray-300 px-2 py-1.5 text-sm" />
                  <select value={tipoComp} onChange={(e) => setTipoComp(e.target.value)} className="rounded-md border border-gray-300 px-2 text-sm">
                    <option value="">Todos</option>{['casa', 'lote', 'finca', 'local', 'apartamento'].map((t) => <option key={t}>{t}</option>)}
                  </select>
                </div>
                <ul className="space-y-2">
                  {comps.data?.map((c) => {
                    const area = c.area_terreno ?? c.area_construida
                    return (
                      <li key={c.id}>
                        <button type="button" onClick={() => abrirComp(c)} className="w-full rounded-lg border border-gray-200 p-3 text-left text-sm hover:border-violet-400">
                          <div className="flex items-start justify-between gap-2">
                            <span className="font-semibold">#{c.id} · <span className="capitalize">{c.tipo}</span> {c.sector && <>· {c.sector}</>}</span>
                            <span className="shrink-0 rounded-full px-2 py-0.5 text-[11px] font-semibold text-white" style={{ background: c.operacion === 'venta' ? '#0f766e' : COLOR_COMPARABLE }}>{c.operacion}</span>
                          </div>
                          <div className="text-xs text-gray-600">
                            {fmtCOP(c.precio)} · {c.area_terreno ? `${fmtNum(c.area_terreno, 1)} m² terreno` : ''}{c.area_terreno && c.area_construida ? ' · ' : ''}{c.area_construida ? `${fmtNum(c.area_construida, 1)} m² constr.` : ''}
                            {area ? <> · <b>{fmtNum(c.precio / area)}</b> $/m²</> : null}
                          </div>
                          <div className="text-[11px] text-gray-500">{c.fecha ?? 'sin fecha'}{c.fuente ? ` · ${c.fuente}` : ''}{c.lon == null ? ' · sin ubicación' : ''}</div>
                        </button>
                      </li>
                    )
                  })}
                  {comps.data?.length === 0 && <li className="text-sm text-gray-500">No hay comparables todavía.</li>}
                </ul>
              </div>
            )}
          </div>
        </section>

        <main className="relative order-1 h-[40vh] md:order-2 md:h-auto md:flex-1">
          <CalorControl activo={calorActivo} tipo={calorTipo} datos={calor.data} cargando={calor.isFetching} error={calor.isError} onActivo={setCalorActivo} onTipo={setCalorTipo} />
          <AdminMap
            mapRef={mapRef}
            predios={capas.data?.find((c) => c.nombre === 'predios')}
            inmuebles={todos.data ?? []}
            comparables={todosComps.data ?? []}
            calor={calorActivo ? calor.data?.celdas ?? null : null}
            vinculados={vinculados}
            seleccionado={enInmuebles ? id : null}
            compSeleccionado={enInmuebles ? null : idComp}
            punto={punto}
            colorPunto={enInmuebles ? '#dc2626' : COLOR_COMPARABLE}
            editando={editando}
            onSeleccionar={(i) => { const x = todos.data?.find((v) => v.id === i); if (x) { setPestana('inmuebles'); abrir(x) } }}
            onSeleccionarComparable={(i) => { const x = todosComps.data?.find((v) => v.id === i); if (x) abrirComp(x) }}
            onUbicar={(lon, lat, np) => {
              if (enInmuebles) setBorrador((b) => ({ ...b, lon: lon.toFixed(7), lat: lat.toFixed(7), numero_predial: np ?? b.numero_predial }))
              else setBorradorComp((b) => ({ ...b, lon: lon.toFixed(7), lat: lat.toFixed(7), numero_predial: np ?? b.numero_predial }))
            }}
          />
        </main>
      </div>
      )}
    </div>
  )
}
