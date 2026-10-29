import { useEffect, useState, type ReactNode } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { InsigniaSemaforo } from '../components/Semaforo'
import { fmtNum } from '../lib/mapa'
import {
  cambiarParametro, descargarSoporte, eliminarSoporte, guardarFicha, guardarJuridico, listarParametros, listarSoportes,
  recalcularSemaforo, subirSoporte, verFicha, verJuridico, verSemaforo,
} from './api'
import { NOMBRE_SOPORTE, type FichaDatos, type Juridico, type Soporte, type TipoSoporte } from './tipos'

const campo = 'mt-1 w-full rounded-md border border-gray-300 px-2 py-1.5 text-sm focus:border-emerald-600 focus:outline-none'
const boton = 'rounded-md bg-emerald-700 px-3 py-1.5 text-sm font-medium text-white disabled:opacity-50'

type Tri = '' | 'si' | 'no'
const aTri = (v: boolean | null | undefined): Tri => (v == null ? '' : v ? 'si' : 'no')
const deTri = (t: Tri): boolean | null => (t === '' ? null : t === 'si')
const num = (s: string) => (s.trim() === '' ? null : Number(s))
const txt = (s: string) => (s.trim() === '' ? null : s.trim())

function Seccion({ titulo, color, children, abierta = false }: { titulo: string; color: string; children: ReactNode; abierta?: boolean }) {
  return (
    <details open={abierta} className={`rounded-lg border-2 ${color} bg-white`}>
      <summary className="cursor-pointer select-none px-3 py-2 text-sm font-bold">{titulo}</summary>
      <div className="space-y-3 border-t p-3">{children}</div>
    </details>
  )
}

function SelTri({ etiqueta, valor, onChange }: { etiqueta: string; valor: Tri; onChange: (t: Tri) => void }) {
  return (
    <label className="text-xs">{etiqueta}
      <select className={campo} value={valor} onChange={(e) => onChange(e.target.value as Tri)}>
        <option value="">Sin dato</option><option value="si">Sí</option><option value="no">No</option>
      </select>
    </label>
  )
}

const Mensaje = ({ e }: { e: unknown }) => (e ? <p role="alert" className="rounded bg-red-50 p-2 text-xs text-red-700">{(e as Error).message}</p> : null)

// ---------------------------------------------------------------- ficha ampliada
interface BFicha {
  estrato: string; antiguedad_anos: string; estado_conservacion: string; pisos: string; parqueaderos: string; deposito: Tri
  acabados: string; orientacion: string; agua: Tri; alcantarillado: Tri; gas: Tri; energia: Tri; internet: Tri
  fuentes_agua: string; tipo_suelo: string; vocacion: string; cultivos: string; mejoras: string; via_acceso: string
  video_url: string; recorrido_360_url: string; plano_url: string
  negociable: Tri; permuta: Tri; financiacion: Tri; administracion_mensual: string; disponible_desde: string
}
const s = (v: string | number | null | undefined) => (v == null ? '' : String(v))

function FormFicha({ id, tipo }: { id: number; tipo: string }) {
  const qc = useQueryClient()
  const q = useQuery({ queryKey: ['f-ficha', id], queryFn: () => verFicha(id) })
  const [b, setB] = useState<BFicha | null>(null)
  useEffect(() => {
    const f = q.data
    if (f) setB({
      estrato: s(f.estrato), antiguedad_anos: s(f.antiguedad_anos), estado_conservacion: s(f.estado_conservacion), pisos: s(f.pisos), parqueaderos: s(f.parqueaderos),
      deposito: aTri(f.deposito), acabados: s(f.acabados), orientacion: s(f.orientacion), agua: aTri(f.agua), alcantarillado: aTri(f.alcantarillado),
      gas: aTri(f.gas), energia: aTri(f.energia), internet: aTri(f.internet), fuentes_agua: s(f.fuentes_agua), tipo_suelo: s(f.tipo_suelo),
      vocacion: s(f.vocacion), cultivos: s(f.cultivos), mejoras: s(f.mejoras), via_acceso: s(f.via_acceso), video_url: s(f.video_url),
      recorrido_360_url: s(f.recorrido_360_url), plano_url: s(f.plano_url), negociable: aTri(f.negociable), permuta: aTri(f.permuta),
      financiacion: aTri(f.financiacion), administracion_mensual: s(f.administracion_mensual), disponible_desde: s(f.disponible_desde),
    })
  }, [q.data])
  const guardar = useMutation({
    mutationFn: () => {
      const x = b!
      const d: FichaDatos = {
        estrato: num(x.estrato), antiguedad_anos: num(x.antiguedad_anos), estado_conservacion: txt(x.estado_conservacion), pisos: num(x.pisos),
        parqueaderos: num(x.parqueaderos), deposito: deTri(x.deposito), acabados: txt(x.acabados), orientacion: txt(x.orientacion),
        agua: deTri(x.agua), alcantarillado: deTri(x.alcantarillado), gas: deTri(x.gas), energia: deTri(x.energia), internet: deTri(x.internet),
        fuentes_agua: txt(x.fuentes_agua), tipo_suelo: txt(x.tipo_suelo), vocacion: txt(x.vocacion), cultivos: txt(x.cultivos),
        mejoras: txt(x.mejoras), via_acceso: txt(x.via_acceso), video_url: txt(x.video_url), recorrido_360_url: txt(x.recorrido_360_url),
        plano_url: txt(x.plano_url), negociable: deTri(x.negociable), permuta: deTri(x.permuta), financiacion: deTri(x.financiacion),
        administracion_mensual: num(x.administracion_mensual), disponible_desde: txt(x.disponible_desde),
      }
      return guardarFicha(id, d)
    },
    onSuccess: () => void qc.invalidateQueries({ queryKey: ['f-ficha', id] }),
  })
  if (!b) return <p className="text-xs text-gray-500">{q.isError ? 'No se pudo cargar.' : 'Cargando…'}</p>
  const set = <K extends keyof BFicha>(k: K, v: BFicha[K]) => setB({ ...b, [k]: v })
  const ent = q.data?.entorno ?? {}
  const m = (v: number | null | undefined) => (v == null ? 'sin dato' : `${fmtNum(v)} m`)

  return (
    <form className="space-y-3" onSubmit={(e) => { e.preventDefault(); guardar.mutate() }}>
      <p className="text-[11px] text-gray-500">Todo lo de esta sección es <b>público</b> (se muestra en la ficha del visor).</p>
      <div className="grid grid-cols-2 gap-2 text-xs">
        <label>Estrato<input className={campo} type="number" min={1} max={6} value={b.estrato} onChange={(e) => set('estrato', e.target.value)} /></label>
        <label>Antigüedad (años)<input className={campo} type="number" min={0} value={b.antiguedad_anos} onChange={(e) => set('antiguedad_anos', e.target.value)} /></label>
        <label>Conservación
          <select className={campo} value={b.estado_conservacion} onChange={(e) => set('estado_conservacion', e.target.value)}>
            <option value="">Sin dato</option><option value="nuevo">Nuevo</option><option value="excelente">Excelente</option><option value="bueno">Bueno</option><option value="regular">Regular</option><option value="para_remodelar">Para remodelar</option>
          </select>
        </label>
        <label>Orientación
          <select className={campo} value={b.orientacion} onChange={(e) => set('orientacion', e.target.value)}>
            <option value="">Sin dato</option>{['N', 'NE', 'E', 'SE', 'S', 'SO', 'O', 'NO'].map((o) => <option key={o}>{o}</option>)}
          </select>
        </label>
        <label>Pisos<input className={campo} type="number" min={0} value={b.pisos} onChange={(e) => set('pisos', e.target.value)} /></label>
        <label>Parqueaderos<input className={campo} type="number" min={0} value={b.parqueaderos} onChange={(e) => set('parqueaderos', e.target.value)} /></label>
        <SelTri etiqueta="Depósito" valor={b.deposito} onChange={(v) => set('deposito', v)} />
        <label>Acabados<input className={campo} value={b.acabados} onChange={(e) => set('acabados', e.target.value)} /></label>
      </div>
      <div className="grid grid-cols-3 gap-2">
        <SelTri etiqueta="Agua" valor={b.agua} onChange={(v) => set('agua', v)} />
        <SelTri etiqueta="Alcantarillado" valor={b.alcantarillado} onChange={(v) => set('alcantarillado', v)} />
        <SelTri etiqueta="Gas" valor={b.gas} onChange={(v) => set('gas', v)} />
        <SelTri etiqueta="Energía" valor={b.energia} onChange={(v) => set('energia', v)} />
        <SelTri etiqueta="Internet" valor={b.internet} onChange={(v) => set('internet', v)} />
      </div>
      {tipo === 'finca' && (
        <div className="grid grid-cols-1 gap-2 text-xs">
          <label>Fuentes de agua<input className={campo} value={b.fuentes_agua} onChange={(e) => set('fuentes_agua', e.target.value)} /></label>
          <label>Tipo de suelo<input className={campo} value={b.tipo_suelo} onChange={(e) => set('tipo_suelo', e.target.value)} /></label>
          <label>Vocación<input className={campo} value={b.vocacion} onChange={(e) => set('vocacion', e.target.value)} /></label>
          <label>Cultivos<input className={campo} value={b.cultivos} onChange={(e) => set('cultivos', e.target.value)} /></label>
          <label>Mejoras<input className={campo} value={b.mejoras} onChange={(e) => set('mejoras', e.target.value)} /></label>
          <label>Vía de acceso<input className={campo} value={b.via_acceso} onChange={(e) => set('via_acceso', e.target.value)} /></label>
        </div>
      )}
      <div className="grid grid-cols-1 gap-2 text-xs">
        <label>Video (enlace)<input className={campo} type="url" value={b.video_url} onChange={(e) => set('video_url', e.target.value)} /></label>
        <label>Recorrido 360° (enlace)<input className={campo} type="url" value={b.recorrido_360_url} onChange={(e) => set('recorrido_360_url', e.target.value)} /></label>
        <label>Plano de planta (enlace)<input className={campo} type="url" value={b.plano_url} onChange={(e) => set('plano_url', e.target.value)} /></label>
      </div>
      <div className="grid grid-cols-3 gap-2">
        <SelTri etiqueta="Negociable" valor={b.negociable} onChange={(v) => set('negociable', v)} />
        <SelTri etiqueta="Permuta" valor={b.permuta} onChange={(v) => set('permuta', v)} />
        <SelTri etiqueta="Financiación" valor={b.financiacion} onChange={(v) => set('financiacion', v)} />
      </div>
      <div className="grid grid-cols-2 gap-2 text-xs">
        <label>Administración mensual (COP)<input className={campo} type="number" min={0} value={b.administracion_mensual} onChange={(e) => set('administracion_mensual', e.target.value)} /></label>
        <label>Disponible desde<input className={campo} type="date" value={b.disponible_desde} onChange={(e) => set('disponible_desde', e.target.value)} /></label>
      </div>
      <div className="rounded bg-sky-50 p-2 text-xs text-sky-900">
        <b>Entorno calculado con el mapa</b> (se actualiza al mover el inmueble):
        vía principal {m(ent.via_principal_m)} · colegio {m(ent.colegio_m)} · parque {m(ent.parque_m)} · casco urbano {m(ent.casco_urbano_m)}
        {tipo === 'finca' && <> · drenaje {m(ent.drenaje_m)} · nacimiento {m(ent.nacimiento_m)}</>} · centro de salud: sin capa en el proyecto
      </div>
      <Mensaje e={guardar.error} />
      <button type="submit" disabled={guardar.isPending} className={boton}>{guardar.isPending ? 'Guardando…' : guardar.isSuccess ? 'Guardado ✓' : 'Guardar ficha'}</button>
    </form>
  )
}

// ---------------------------------------------------------------- jurídico
interface BJur {
  matricula_inmobiliaria: string; escritura_numero: string; escritura_fecha: string; notaria: string
  hipoteca: Tri; embargo: Tri; afectacion_vivienda_familiar: Tri; sucesion_pendiente: Tri
  servidumbres: string; litigios: string; linderos: string
  predial_estado: Juridico['predial_estado']; predial_ultimo_anio_pagado: string; valorizacion_estado: Juridico['valorizacion_estado']
  paz_salvo_predial_fecha: string; paz_salvo_valorizacion_fecha: string; notas: string
}
const vacioJur: BJur = {
  matricula_inmobiliaria: '', escritura_numero: '', escritura_fecha: '', notaria: '', hipoteca: '', embargo: '', afectacion_vivienda_familiar: '', sucesion_pendiente: '',
  servidumbres: '', litigios: '', linderos: '', predial_estado: 'desconocido', predial_ultimo_anio_pagado: '', valorizacion_estado: 'desconocido',
  paz_salvo_predial_fecha: '', paz_salvo_valorizacion_fecha: '', notas: '',
}

function FormJuridico({ id }: { id: number }) {
  const qc = useQueryClient()
  const q = useQuery({ queryKey: ['f-jur', id], queryFn: () => verJuridico(id) })
  const [b, setB] = useState<BJur | null>(null)
  useEffect(() => {
    if (q.isSuccess) {
      const j = q.data
      setB(j ? {
        matricula_inmobiliaria: s(j.matricula_inmobiliaria), escritura_numero: s(j.escritura_numero), escritura_fecha: s(j.escritura_fecha), notaria: s(j.notaria),
        hipoteca: aTri(j.hipoteca), embargo: aTri(j.embargo), afectacion_vivienda_familiar: aTri(j.afectacion_vivienda_familiar), sucesion_pendiente: aTri(j.sucesion_pendiente),
        servidumbres: s(j.servidumbres), litigios: s(j.litigios), linderos: s(j.linderos), predial_estado: j.predial_estado,
        predial_ultimo_anio_pagado: s(j.predial_ultimo_anio_pagado), valorizacion_estado: j.valorizacion_estado,
        paz_salvo_predial_fecha: s(j.paz_salvo_predial_fecha), paz_salvo_valorizacion_fecha: s(j.paz_salvo_valorizacion_fecha), notas: s(j.notas),
      } : vacioJur)
    }
  }, [q.data, q.isSuccess])
  const guardar = useMutation({
    mutationFn: () => {
      const x = b!
      return guardarJuridico(id, {
        matricula_inmobiliaria: txt(x.matricula_inmobiliaria), escritura_numero: txt(x.escritura_numero), escritura_fecha: txt(x.escritura_fecha), notaria: txt(x.notaria),
        hipoteca: deTri(x.hipoteca), embargo: deTri(x.embargo), afectacion_vivienda_familiar: deTri(x.afectacion_vivienda_familiar), sucesion_pendiente: deTri(x.sucesion_pendiente),
        servidumbres: txt(x.servidumbres), litigios: txt(x.litigios), linderos: txt(x.linderos), predial_estado: x.predial_estado,
        predial_ultimo_anio_pagado: num(x.predial_ultimo_anio_pagado), valorizacion_estado: x.valorizacion_estado,
        paz_salvo_predial_fecha: txt(x.paz_salvo_predial_fecha), paz_salvo_valorizacion_fecha: txt(x.paz_salvo_valorizacion_fecha), notas: txt(x.notas),
      })
    },
    onSuccess: () => { void qc.invalidateQueries({ queryKey: ['f-jur', id] }); void qc.invalidateQueries({ queryKey: ['f-semaforo', id] }) },
  })
  if (!b) return <p className="text-xs text-gray-500">{q.isError ? 'No se pudo cargar.' : 'Cargando…'}</p>
  const set = <K extends keyof BJur>(k: K, v: BJur[K]) => setB({ ...b, [k]: v })

  return (
    <form className="space-y-3 text-xs" onSubmit={(e) => { e.preventDefault(); guardar.mutate() }}>
      <p className="rounded bg-amber-50 p-2 text-amber-900"><b>Privado.</b> Nada de esto se publica; el visor solo muestra el color del semáforo. «Sin dato» cuenta como no verificado.</p>
      <div className="grid grid-cols-2 gap-2">
        <label className="col-span-2">Matrícula inmobiliaria<input className={campo} value={b.matricula_inmobiliaria} onChange={(e) => set('matricula_inmobiliaria', e.target.value)} placeholder="Ej. 230-12345" /></label>
        <label>N.º de escritura<input className={campo} value={b.escritura_numero} onChange={(e) => set('escritura_numero', e.target.value)} /></label>
        <label>Fecha de escritura<input className={campo} type="date" value={b.escritura_fecha} onChange={(e) => set('escritura_fecha', e.target.value)} /></label>
        <label className="col-span-2">Notaría<input className={campo} value={b.notaria} onChange={(e) => set('notaria', e.target.value)} /></label>
      </div>
      <div className="grid grid-cols-2 gap-2">
        <SelTri etiqueta="Hipoteca" valor={b.hipoteca} onChange={(v) => set('hipoteca', v)} />
        <SelTri etiqueta="Embargo" valor={b.embargo} onChange={(v) => set('embargo', v)} />
        <SelTri etiqueta="Afectación a vivienda familiar" valor={b.afectacion_vivienda_familiar} onChange={(v) => set('afectacion_vivienda_familiar', v)} />
        <SelTri etiqueta="Sucesión pendiente" valor={b.sucesion_pendiente} onChange={(v) => set('sucesion_pendiente', v)} />
      </div>
      <label className="block">Servidumbres (vacío = ninguna)<textarea className={campo} rows={2} value={b.servidumbres} onChange={(e) => set('servidumbres', e.target.value)} /></label>
      <label className="block">Litigios (vacío = ninguno)<textarea className={campo} rows={2} value={b.litigios} onChange={(e) => set('litigios', e.target.value)} /></label>
      <label className="block">Linderos<textarea className={campo} rows={3} value={b.linderos} onChange={(e) => set('linderos', e.target.value)} /></label>
      <div className="grid grid-cols-2 gap-2">
        <label>Impuesto predial
          <select className={campo} value={b.predial_estado} onChange={(e) => set('predial_estado', e.target.value as BJur['predial_estado'])}>
            <option value="desconocido">Sin dato</option><option value="al_dia">Al día</option><option value="mora">En mora</option>
          </select>
        </label>
        <label>Último año pagado<input className={campo} type="number" min={1900} max={2100} value={b.predial_ultimo_anio_pagado} onChange={(e) => set('predial_ultimo_anio_pagado', e.target.value)} /></label>
        <label>Valorización
          <select className={campo} value={b.valorizacion_estado} onChange={(e) => set('valorizacion_estado', e.target.value as BJur['valorizacion_estado'])}>
            <option value="desconocido">Sin dato</option><option value="sin_cobro">Sin cobro</option><option value="pendiente">Pendiente</option><option value="pagada">Pagada</option>
          </select>
        </label>
        <span />
        <label>Paz y salvo predial (fecha)<input className={campo} type="date" value={b.paz_salvo_predial_fecha} onChange={(e) => set('paz_salvo_predial_fecha', e.target.value)} /></label>
        <label>Paz y salvo valorización (fecha)<input className={campo} type="date" value={b.paz_salvo_valorizacion_fecha} onChange={(e) => set('paz_salvo_valorizacion_fecha', e.target.value)} /></label>
      </div>
      <label className="block">Notas jurídicas<textarea className={campo} rows={2} value={b.notas} onChange={(e) => set('notas', e.target.value)} /></label>
      <Mensaje e={guardar.error} />
      <button type="submit" disabled={guardar.isPending} className={boton}>{guardar.isPending ? 'Guardando…' : guardar.isSuccess ? 'Guardado ✓ (semáforo recalculado)' : 'Guardar jurídico'}</button>
    </form>
  )
}

// ---------------------------------------------------------------- soportes
const ESTADO_SOPORTE: Record<Soporte['estado'], string> = {
  vigente: 'bg-emerald-100 text-emerald-800', por_vencer: 'bg-amber-100 text-amber-800', vencido: 'bg-red-100 text-red-800', sin_vencimiento: 'bg-gray-100 text-gray-600',
}
const TEXTO_ESTADO: Record<Soporte['estado'], string> = { vigente: 'Vigente', por_vencer: 'Por vencer', vencido: 'Vencido', sin_vencimiento: 'Sin vencimiento' }

function Soportes({ id }: { id: number }) {
  const qc = useQueryClient()
  const q = useQuery({ queryKey: ['f-soportes', id], queryFn: () => listarSoportes(id) })
  const [tipo, setTipo] = useState<TipoSoporte>('certificado_tradicion')
  const [fDoc, setFDoc] = useState('')
  const [fVenc, setFVenc] = useState('')
  const [archivo, setArchivo] = useState<File | null>(null)
  const refrescar = () => { void qc.invalidateQueries({ queryKey: ['f-soportes', id] }); void qc.invalidateQueries({ queryKey: ['f-semaforo', id] }) }
  const subir = useMutation({
    mutationFn: () => subirSoporte(id, archivo!, tipo, fDoc, fVenc),
    onSuccess: () => { setArchivo(null); setFDoc(''); setFVenc(''); refrescar() },
  })
  const borrar = useMutation({ mutationFn: (sid: number) => eliminarSoporte(sid), onSuccess: refrescar })
  const bajar = useMutation({ mutationFn: (x: Soporte) => descargarSoporte(x) })

  return (
    <div className="space-y-3 text-xs">
      <p className="rounded bg-amber-50 p-2 text-amber-900"><b>Privado.</b> PDF, JPG, PNG o WEBP (se valida el contenido). Sin fecha de vencimiento, el certificado de tradición se considera vigente 30 días desde su fecha (parámetro).</p>
      <ul className="space-y-1.5">
        {q.data?.map((x) => (
          <li key={x.id} className="rounded border border-gray-200 p-2">
            <div className="flex items-start justify-between gap-2">
              <span className="font-medium">{NOMBRE_SOPORTE[x.tipo]}</span>
              <span className={`shrink-0 rounded-full px-2 py-0.5 text-[11px] font-semibold ${ESTADO_SOPORTE[x.estado]}`}>
                {TEXTO_ESTADO[x.estado]}{x.dias_para_vencer != null && x.estado !== 'sin_vencimiento' ? (x.dias_para_vencer < 0 ? ` hace ${-x.dias_para_vencer} d` : ` · ${x.dias_para_vencer} d`) : ''}
              </span>
            </div>
            <div className="break-all text-gray-600">{x.nombre_original} · {fmtNum(x.tamano / 1024)} KB{x.fecha_documento ? ` · doc. ${x.fecha_documento}` : ''}{x.fecha_vencimiento ? ` · vence ${x.fecha_vencimiento}` : ''}</div>
            <div className="mt-1 flex gap-2">
              <button type="button" onClick={() => bajar.mutate(x)} className="rounded border border-gray-300 px-2 py-0.5">Descargar</button>
              <button type="button" onClick={() => { if (window.confirm('¿Eliminar este soporte? No se puede deshacer.')) borrar.mutate(x.id) }} className="rounded border border-red-300 px-2 py-0.5 text-red-700">Eliminar</button>
            </div>
          </li>
        ))}
        {q.data?.length === 0 && <li className="text-gray-500">Sin soportes todavía.</li>}
      </ul>
      <Mensaje e={bajar.error ?? borrar.error} />
      <form className="space-y-2 rounded border border-dashed border-gray-300 p-2" onSubmit={(e) => { e.preventDefault(); if (archivo) subir.mutate() }}>
        <div className="grid grid-cols-2 gap-2">
          <label className="col-span-2">Tipo
            <select className={campo} value={tipo} onChange={(e) => setTipo(e.target.value as TipoSoporte)}>
              {(Object.keys(NOMBRE_SOPORTE) as TipoSoporte[]).map((t) => <option key={t} value={t}>{NOMBRE_SOPORTE[t]}</option>)}
            </select>
          </label>
          <label>Fecha del documento<input className={campo} type="date" value={fDoc} onChange={(e) => setFDoc(e.target.value)} /></label>
          <label>Fecha de vencimiento<input className={campo} type="date" value={fVenc} onChange={(e) => setFVenc(e.target.value)} /></label>
        </div>
        <input type="file" accept="application/pdf,image/jpeg,image/png,image/webp" onChange={(e) => setArchivo(e.target.files?.[0] ?? null)} aria-label="Archivo del soporte" />
        <Mensaje e={subir.error} />
        <button type="submit" disabled={!archivo || subir.isPending} className={boton}>{subir.isPending ? 'Subiendo…' : 'Subir soporte'}</button>
      </form>
    </div>
  )
}

// ---------------------------------------------------------------- semáforo (detalle privado) y parámetros
function SemaforoDetalle({ id }: { id: number }) {
  const qc = useQueryClient()
  const q = useQuery({ queryKey: ['f-semaforo', id], queryFn: () => verSemaforo(id) })
  const params = useQuery({ queryKey: ['f-params'], queryFn: listarParametros })
  const recalcular = useMutation({ mutationFn: () => recalcularSemaforo(id), onSuccess: (d) => qc.setQueryData(['f-semaforo', id], d) })
  const [edit, setEdit] = useState<Record<string, string>>({})
  const cambiar = useMutation({
    mutationFn: (v: { clave: string; valor: string }) => cambiarParametro(v.clave, v.valor),
    onSuccess: () => { setEdit({}); void qc.invalidateQueries({ queryKey: ['f-params'] }) },
  })
  const d = q.data
  return (
    <div className="space-y-3 text-xs">
      {d ? (
        <>
          <div className="flex flex-wrap items-center gap-2">
            <InsigniaSemaforo color={d.color} />
            <span className="text-gray-500">reglas v{d.reglas_version} · calculado {d.calculado_en.replace('T', ' ').slice(0, 16)}</span>
          </div>
          <p className="rounded bg-gray-50 p-2"><b>Lo que ve el público:</b> {d.resumen_publico}</p>
          <ul className="space-y-1">
            {d.detalle.hallazgos.map((h) => (
              <li key={h.codigo} className={`rounded border-l-4 p-1.5 ${h.nivel === 'rojo' ? 'border-red-500 bg-red-50' : 'border-amber-400 bg-amber-50'}`}>
                <b>{h.codigo}</b> · {h.categoria} — {h.texto}
              </li>
            ))}
            {d.detalle.hallazgos.length === 0 && <li className="text-emerald-700">Sin hallazgos.</li>}
          </ul>
          <details><summary className="cursor-pointer text-gray-500">Mediciones del cruce espacial</summary>
            <pre className="mt-1 max-h-48 overflow-auto rounded bg-gray-50 p-2 text-[11px]">{JSON.stringify(d.detalle.mediciones, null, 2)}</pre>
          </details>
        </>
      ) : (
        <p className="text-gray-500">Aún sin calcular.</p>
      )}
      <Mensaje e={recalcular.error} />
      <button type="button" onClick={() => recalcular.mutate()} disabled={recalcular.isPending} className={boton}>{recalcular.isPending ? 'Calculando…' : 'Recalcular semáforo y entorno'}</button>

      <details><summary className="cursor-pointer font-semibold">Parámetros configurables</summary>
        <ul className="mt-2 space-y-2">
          {params.data?.map((p) => (
            <li key={p.clave} className="rounded border border-gray-200 p-2">
              <div className="font-mono text-[11px]">{p.clave}{p.requiere_confirmar ? <span className="ml-1 rounded bg-amber-100 px-1 font-sans text-amber-800">por confirmar</span> : null}</div>
              <div className="text-gray-600">{p.descripcion}</div>
              <div className="mt-1 flex gap-2">
                <input className="w-24 rounded border border-gray-300 px-2 py-1" inputMode="decimal" value={edit[p.clave] ?? p.valor} onChange={(e) => setEdit({ ...edit, [p.clave]: e.target.value })} aria-label={p.clave} />
                <button type="button" disabled={edit[p.clave] == null || edit[p.clave] === p.valor || cambiar.isPending} onClick={() => cambiar.mutate({ clave: p.clave, valor: edit[p.clave]! })} className="rounded border border-emerald-600 px-2 text-emerald-700 disabled:opacity-40">Guardar</button>
              </div>
            </li>
          ))}
        </ul>
        <Mensaje e={cambiar.error} />
        <p className="mt-1 text-gray-500">Tras cambiar un parámetro, recalcula el semáforo (aquí o con «recalcular todos»).</p>
      </details>
    </div>
  )
}

export default function FichaPanel({ inmuebleId, tipo }: { inmuebleId: number; tipo: string }) {
  const sem = useQuery({ queryKey: ['f-semaforo', inmuebleId], queryFn: () => verSemaforo(inmuebleId) })
  return (
    <section className="mt-4 space-y-2 border-t-2 border-emerald-300 pt-4">
      <div className="flex items-center justify-between gap-2">
        <h2 className="text-base font-bold text-emerald-900">Ficha, jurídico y semáforo</h2>
        {sem.data && <InsigniaSemaforo color={sem.data.color} />}
      </div>
      <Seccion titulo="Ficha ampliada (pública)" color="border-emerald-200"><FormFicha key={inmuebleId} id={inmuebleId} tipo={tipo} /></Seccion>
      <Seccion titulo="Jurídico y normativo (privado)" color="border-amber-300"><FormJuridico key={inmuebleId} id={inmuebleId} /></Seccion>
      <Seccion titulo="Soportes con vencimiento (privado)" color="border-amber-300"><Soportes key={inmuebleId} id={inmuebleId} /></Seccion>
      <Seccion titulo="Semáforo jurídico-ambiental · detalle (privado)" color="border-slate-300"><SemaforoDetalle key={inmuebleId} id={inmuebleId} /></Seccion>
    </section>
  )
}
