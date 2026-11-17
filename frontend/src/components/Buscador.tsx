import { useEffect, useMemo, useRef, useState } from 'react'
import { bonito } from '../lib/mapa'
import type { Zona, ZonaRef } from '../lib/types'
import { Icono } from './ui'

interface Props {
  zonas: Zona[]
  buscandoPredio: boolean
  errorPredio: string | null
  onZona: (z: ZonaRef) => void
  onPredio: (numeroPredial: string) => void
}

type Opcion = { clase: 'zona'; zona: Zona } | { clase: 'predio'; numero: string }

const normal = (s: string) => s.normalize('NFD').replace(/\p{M}/gu, '').toLowerCase()

function Cuentas({ z }: { z: Zona }) {
  if (!z.total) return <span className="text-xs text-tinta-3">sin ofertas</span>
  return (
    <span className="cifras flex shrink-0 items-center gap-2.5 text-xs text-tinta-2">
      {z.venta > 0 && <span className="flex items-center gap-1"><i className="size-2 rounded-full bg-venta" />{z.venta} venta</span>}
      {z.arriendo > 0 && <span className="flex items-center gap-1"><i className="size-2 rounded-full bg-arriendo" />{z.arriendo} arriendo</span>}
    </span>
  )
}

/**
 * Un solo campo para llegar a cualquier parte: escribe un barrio o vereda para ver sus ofertas,
 * o un número predial para consultar el predio. Tecla «/» para enfocarlo.
 */
export default function Buscador({ zonas, buscandoPredio, errorPredio, onZona, onPredio }: Props) {
  const [texto, setTexto] = useState('')
  const [abierto, setAbierto] = useState(false)
  const [activo, setActivo] = useState(0)
  const entrada = useRef<HTMLInputElement>(null)

  const limpio = texto.trim()
  const digitos = limpio.replace(/[\s.-]/g, '')
  const esPredial = /^\d{5,}$/.test(digitos)

  const opciones = useMemo<Opcion[]>(() => {
    if (esPredial) return [{ clase: 'predio', numero: digitos }]
    const t = normal(limpio)
    const base = t
      ? zonas.filter((z) => normal(z.nombre).includes(t)).sort((a, b) => Number(normal(b.nombre).startsWith(t)) - Number(normal(a.nombre).startsWith(t)) || b.total - a.total)
      : zonas.filter((z) => z.total > 0)
    return base.slice(0, 8).map((zona) => ({ clase: 'zona', zona }))
  }, [zonas, limpio, digitos, esPredial])

  useEffect(() => {
    const alTeclear = (e: KeyboardEvent) => {
      const en = e.target as HTMLElement
      if (e.key !== '/' || e.ctrlKey || e.metaKey || /^(INPUT|TEXTAREA|SELECT)$/.test(en.tagName)) return
      e.preventDefault()
      entrada.current?.focus()
    }
    window.addEventListener('keydown', alTeclear)
    return () => window.removeEventListener('keydown', alTeclear)
  }, [])

  const elegir = (o: Opcion) => {
    if (o.clase === 'predio') onPredio(o.numero)
    else { onZona({ tipo: o.zona.tipo, nombre: o.zona.nombre }); setTexto('') }
    setAbierto(false); setActivo(0)
    entrada.current?.blur()
  }

  return (
    <div className="relative">
      <label className="relative block">
        <span className="sr-only">Buscar barrio, vereda o número predial</span>
        <Icono n="buscar" className="pointer-events-none absolute left-3 top-1/2 size-[18px] -translate-y-1/2 text-tinta-3" />
        <input
          ref={entrada}
          role="combobox"
          aria-expanded={abierto}
          aria-controls="lista-busqueda"
          aria-autocomplete="list"
          autoComplete="off"
          spellCheck={false}
          value={texto}
          placeholder="Barrio, vereda o número predial"
          onChange={(e) => { setTexto(e.target.value); setAbierto(true); setActivo(0) }}
          onFocus={() => setAbierto(true)}
          onBlur={() => setTimeout(() => setAbierto(false), 150)}
          onKeyDown={(e) => {
            if (e.key === 'ArrowDown') { e.preventDefault(); setAbierto(true); setActivo((a) => Math.min(a + 1, opciones.length - 1)) }
            else if (e.key === 'ArrowUp') { e.preventDefault(); setActivo((a) => Math.max(a - 1, 0)) }
            else if (e.key === 'Enter' && opciones[activo]) { e.preventDefault(); elegir(opciones[activo]) }
            else if (e.key === 'Escape') { setAbierto(false); entrada.current?.blur() }
          }}
          className="h-11 w-full rounded-lg border border-linea-2 bg-hoja pl-10 pr-10 text-[15px] text-tinta shadow-flota transition-colors duration-150 placeholder:text-tinta-3 hover:border-tinta-3 focus:border-tinta focus:outline-none md:shadow-none"
        />
        {texto ? (
          <button type="button" aria-label="Borrar búsqueda" onMouseDown={(e) => e.preventDefault()} onClick={() => { setTexto(''); entrada.current?.focus() }}
            className="absolute right-1.5 top-1/2 grid size-8 -translate-y-1/2 place-items-center rounded-md text-tinta-3 hover:bg-linea/70 hover:text-tinta">
            <Icono n="cerrar" className="size-3.5" />
          </button>
        ) : (
          <kbd className="pointer-events-none absolute right-3 top-1/2 hidden -translate-y-1/2 rounded border border-linea-2 px-1.5 font-mono text-[11px] leading-5 text-tinta-3 md:block">/</kbd>
        )}
      </label>

      {buscandoPredio && <p className="mt-1.5 text-xs text-tinta-2" role="status">Consultando el predio…</p>}
      {errorPredio && !buscandoPredio && <p role="alert" className="mt-1.5 text-xs font-medium text-alerta">{errorPredio}</p>}

      {abierto && (
        <ul id="lista-busqueda" role="listbox" className="entra-menu absolute inset-x-0 top-full z-50 mt-1.5 max-h-[min(24rem,60dvh)] overflow-y-auto rounded-lg border border-linea-2 bg-hoja p-1 shadow-panel">
          {!limpio && opciones.length > 0 && <li className="px-2.5 pb-1 pt-2 text-xs font-medium text-tinta-3">Zonas con ofertas publicadas</li>}
          {opciones.map((o, i) => (
            <li key={o.clase === 'zona' ? o.zona.tipo + o.zona.nombre : 'predio'} role="option" aria-selected={i === activo}>
              <button
                type="button"
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => elegir(o)}
                onMouseEnter={() => setActivo(i)}
                className={`flex w-full items-center gap-2.5 rounded-md px-2.5 py-2 text-left text-sm ${i === activo ? 'bg-marca/45' : ''}`}
              >
                {o.clase === 'zona' ? (
                  <>
                    <Icono n="pin" className="size-4 text-tinta-3" />
                    <span className="min-w-0 flex-1 truncate">
                      <span className="font-medium text-tinta">{bonito(o.zona.nombre)}</span>
                      <span className="ml-1.5 text-xs text-tinta-3">{o.zona.tipo === 'vereda' ? 'Vereda' : 'Barrio'}</span>
                    </span>
                    <Cuentas z={o.zona} />
                  </>
                ) : (
                  <>
                    <Icono n="parcela" className="size-4 text-tinta-3" />
                    <span className="min-w-0 flex-1">
                      <span className="block font-medium text-tinta">Consultar predio</span>
                      <span className="block break-all font-mono text-xs text-tinta-2">{o.numero}</span>
                    </span>
                    <Icono n="flecha" className="size-4 text-tinta-3" />
                  </>
                )}
              </button>
            </li>
          ))}
          {opciones.length === 0 && (
            <li className="px-2.5 py-3 text-sm text-tinta-2">
              {zonas.length === 0 ? 'Cargando barrios y veredas…' : <>Ningún barrio ni vereda coincide con «{limpio}». Para un predio, escribe su número (mínimo 5 dígitos).</>}
            </li>
          )}
        </ul>
      )}
    </div>
  )
}
