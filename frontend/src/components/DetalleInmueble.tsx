import { useEffect, useRef, useState } from 'react'
import type { InmuebleFeature } from '../lib/types'
import { NOMBRE_TIPO, fmtCOP, fmtNum, lugarDe } from '../lib/mapa'
import { urlFoto } from '../lib/api'
import { enlaceInmueble, enlaceWhatsapp, urlFichaPdf } from '../lib/whatsapp'
import FichaAmpliada from './FichaAmpliada'
import { InsigniaSemaforo } from './Semaforo'
import { BotonIcono, Icono } from './ui'

interface Props {
  inmueble: InmuebleFeature
  onVolver: () => void
  onVerPredio: (numeroPredial: string) => void
  onCentrar: () => void
}

function Galeria({ fotos, alt }: { fotos: string[]; alt: string }) {
  const pista = useRef<HTMLDivElement>(null)
  const [i, setI] = useState(0)
  const ir = (n: number) => pista.current?.scrollTo({ left: n * pista.current.clientWidth, behavior: 'smooth' })

  if (!fotos.length) {
    return (
      <div className="grid aspect-[16/10] place-items-center bg-linea text-tinta-3">
        <span className="flex flex-col items-center gap-1 text-xs"><Icono n="foto" className="size-7" />Sin fotografías</span>
      </div>
    )
  }
  return (
    <div className="group relative bg-tinta">
      <div ref={pista} tabIndex={fotos.length > 1 ? 0 : -1} aria-label="Fotografías del inmueble"
        onScroll={(e) => setI(Math.round(e.currentTarget.scrollLeft / e.currentTarget.clientWidth))}
        className="flex aspect-[16/10] snap-x snap-mandatory overflow-x-auto [scrollbar-width:none]">
        {fotos.map((f, n) => <img key={f} src={urlFoto(f)} alt={n === 0 ? alt : `${alt}, foto ${n + 1}`} loading={n ? 'lazy' : 'eager'} className="size-full shrink-0 snap-center object-cover" />)}
      </div>
      {fotos.length > 1 && (
        <>
          <span className="cifras sobre-oscuro absolute bottom-2 right-2 rounded bg-tinta/80 px-1.5 py-0.5 text-xs font-medium text-hoja">{i + 1} / {fotos.length}</span>
          {(['atras', 'flecha'] as const).map((d) => {
            const destino = d === 'atras' ? i - 1 : i + 1
            const fuera = destino < 0 || destino >= fotos.length
            return (
              <button key={d} type="button" disabled={fuera} onClick={() => ir(destino)} aria-label={d === 'atras' ? 'Foto anterior' : 'Foto siguiente'}
                className={`absolute top-1/2 grid size-8 -translate-y-1/2 place-items-center rounded-full bg-hoja text-tinta shadow-flota transition-opacity duration-150 disabled:opacity-0 md:opacity-0 md:focus-visible:opacity-100 md:group-hover:opacity-100 md:disabled:opacity-0 md:group-hover:disabled:opacity-0 ${d === 'atras' ? 'left-2' : 'right-2'}`}>
                <Icono n={d} />
              </button>
            )
          })}
        </>
      )}
    </div>
  )
}

function Dato({ etiqueta, valor }: { etiqueta: string; valor: string }) {
  return (
    <div className="px-3 py-2.5 first:pl-0">
      <dt className="text-xs text-tinta-3">{etiqueta}</dt>
      <dd className="cifras mt-0.5 text-[15px] font-semibold text-tinta">{valor}</dd>
    </div>
  )
}

/** Ficha del inmueble dentro del panel: fotos, datos, contacto y la ficha ampliada. */
export default function DetalleInmueble({ inmueble, onVolver, onVerPredio, onCentrar }: Props) {
  const p = inmueble.properties
  const wa = enlaceWhatsapp(p)
  const [copiado, setCopiado] = useState(false)
  const lugar = lugarDe(p)
  const titulo = `${NOMBRE_TIPO[p.tipo]} en ${p.operacion}`
  const cabecera = useRef<HTMLHeadingElement>(null)
  useEffect(() => { cabecera.current?.focus({ preventScroll: true }) }, [p.id])

  const datos: [string, string][] = []
  if (p.area_terreno != null) datos.push(['Terreno', p.area_terreno >= 10000 ? `${fmtNum(p.area_terreno / 10000, 2)} ha` : `${fmtNum(p.area_terreno, 1)} m²`])
  if (p.area_construida != null) datos.push(['Construido', `${fmtNum(p.area_construida, 1)} m²`])
  if (p.habitaciones != null) datos.push(['Habitaciones', String(p.habitaciones)])
  if (p.banos != null) datos.push([p.banos === 1 ? 'Baño' : 'Baños', String(p.banos)])

  const secundario = 'flex h-10 items-center justify-center gap-2 rounded-md border border-linea-2 bg-hoja px-3 text-[13px] font-medium text-tinta transition-colors duration-150 hover:border-tinta'

  return (
    <article key={p.id} className="entra-lado">
      <div className="sticky top-0 z-10 flex items-center gap-1 border-b border-linea bg-papel px-2 py-1.5">
        <button type="button" onClick={onVolver} className="flex items-center gap-1.5 rounded-md py-1.5 pl-1.5 pr-2.5 text-[13px] font-medium text-tinta-2 transition-colors hover:bg-linea/70 hover:text-tinta">
          <Icono n="atras" /> Resultados
        </button>
        <span className="cifras ml-auto font-mono text-xs text-tinta-3">N.º {p.id}</span>
        <BotonIcono icono="ubicar" etiqueta="Centrar en el mapa" onClick={onCentrar} />
      </div>

      <Galeria fotos={p.fotos} alt={`${titulo}${lugar ? `, ${lugar}` : ''}`} />

      <div className="space-y-5 px-4 pb-6 pt-4">
        <header>
          <div className="flex flex-wrap items-center gap-2">
            <span className={`rounded px-1.5 py-0.5 text-xs font-semibold text-white ${p.operacion === 'venta' ? 'bg-venta' : 'bg-arriendo'}`}>{p.operacion === 'venta' ? 'Venta' : 'Arriendo'}</span>
            {p.semaforo && <InsigniaSemaforo color={p.semaforo} />}
          </div>
          <p className="cifras mt-2.5 text-[28px] font-semibold leading-none tracking-[-0.02em] text-tinta">
            {fmtCOP(p.precio)}{p.operacion === 'arriendo' && <span className="text-sm font-normal tracking-normal text-tinta-3"> /mes</span>}
          </p>
          <h2 ref={cabecera} tabIndex={-1} className="mt-2 text-base font-semibold text-tinta focus:outline-none">{titulo}</h2>
          {lugar && <p className="text-sm text-tinta-2">{lugar} · Acacías, Meta</p>}
        </header>

        {datos.length > 0 && (
          <dl className="flex divide-x divide-linea border-y border-linea">
            {datos.map(([k, v]) => <Dato key={k} etiqueta={k} valor={v} />)}
          </dl>
        )}

        {p.descripcion && <p className="max-w-[65ch] text-sm leading-relaxed text-tinta-2">{p.descripcion}</p>}

        <div className="space-y-2">
          {p.contacto && <p className="text-[13px] text-tinta-2"><span className="text-tinta-3">Contacto:</span> <span className="font-medium text-tinta">{p.contacto}</span></p>}
          {wa && (
            <a href={wa} target="_blank" rel="noopener noreferrer"
              className="flex h-11 items-center justify-center gap-2 rounded-md bg-[#25d366] px-4 text-sm font-semibold text-tinta transition-[filter] duration-150 hover:brightness-95">
              <Icono n="whatsapp" className="size-[18px]" /> Consultar por WhatsApp
            </a>
          )}
          <div className="grid grid-cols-2 gap-2">
            <a href={urlFichaPdf(p.id)} target="_blank" rel="noopener noreferrer" className={secundario}><Icono n="documento" /> Ficha PDF</a>
            <button type="button" className={secundario} aria-live="polite"
              onClick={() => { void navigator.clipboard?.writeText(enlaceInmueble(p.id)).then(() => { setCopiado(true); setTimeout(() => setCopiado(false), 1800) }) }}>
              <Icono n={copiado ? 'check' : 'enlace'} /> {copiado ? 'Enlace copiado' : 'Copiar enlace'}
            </button>
          </div>
          {p.numero_predial && (
            <button type="button" onClick={() => onVerPredio(p.numero_predial!)}
              className="flex w-full items-center gap-3 rounded-md bg-tinta px-3.5 py-2.5 text-left text-hoja transition-colors duration-150 hover:bg-[#22332b] sobre-oscuro">
              <Icono n="parcela" className="size-5 text-marca" />
              <span className="min-w-0 flex-1">
                <span className="block text-[13px] font-semibold">Uso del suelo y restricciones</span>
                <span className="block truncate font-mono text-[11px] text-hoja/70">Predio {p.numero_predial}</span>
              </span>
              <Icono n="flecha" />
            </button>
          )}
        </div>

        <FichaAmpliada id={p.id} tipo={p.tipo} esArriendo={p.operacion === 'arriendo'} />
      </div>
    </article>
  )
}
