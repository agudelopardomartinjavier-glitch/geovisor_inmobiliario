import { useState } from 'react'
import { Popup } from 'react-map-gl/maplibre'
import type { InmuebleFeature } from '../lib/types'
import { COLOR_OPERACION, bonito, fmtCOP, fmtNum } from '../lib/mapa'
import { urlFoto } from '../lib/api'
import { enlaceInmueble, enlaceWhatsapp, urlFichaPdf } from '../lib/whatsapp'

interface Props {
  anclaje?: 'bottom' | 'left'
  inmueble: InmuebleFeature
  onClose: () => void
  onVerPredio: (numeroPredial: string) => void
}

export default function PropertyPopup({ anclaje = 'bottom', inmueble, onClose, onVerPredio }: Props) {
  const p = inmueble.properties
  const [lon, lat] = inmueble.geometry.coordinates
  const foto = p.fotos[0]
  const wa = enlaceWhatsapp(p)
  const [copiado, setCopiado] = useState(false)

  return (
    <Popup longitude={lon} latitude={lat} anchor={anclaje} offset={anclaje === 'left' ? 16 : 14} maxWidth="300px" closeOnClick={false} onClose={onClose}>
      <div className="w-[280px] max-w-[80vw] text-sm">
        {foto && <img src={urlFoto(foto)} alt={`${p.tipo} en ${p.operacion}`} className={`${anclaje === 'left' ? 'h-28' : 'h-36'} w-full object-cover`} />}
        <div className="space-y-2 p-3">
          <div className="flex items-center gap-2">
            <span className="rounded px-1.5 py-0.5 text-[11px] font-semibold uppercase text-white" style={{ background: COLOR_OPERACION[p.operacion] }}>
              {p.operacion}
            </span>
            <span className="font-semibold capitalize">{p.tipo}</span>
          </div>
          <div className="text-lg font-bold">{fmtCOP(p.precio)}{p.operacion === 'arriendo' && <span className="text-xs font-medium text-gray-500"> / mes</span>}</div>
          {(p.barrio || p.vereda) && <p className="-mt-1 text-xs text-gray-500">{p.barrio ? `Barrio ${bonito(p.barrio)}` : `Vereda ${p.vereda}`}</p>}
          <dl className="grid grid-cols-2 gap-x-3 gap-y-0.5 text-xs text-gray-700">
            {p.area_terreno != null && (<><dt>Terreno</dt><dd className="text-right">{fmtNum(p.area_terreno, 1)} m²</dd></>)}
            {p.area_construida != null && (<><dt>Construido</dt><dd className="text-right">{fmtNum(p.area_construida, 1)} m²</dd></>)}
            {p.habitaciones != null && (<><dt>Habitaciones</dt><dd className="text-right">{p.habitaciones}</dd></>)}
            {p.banos != null && (<><dt>{p.banos === 1 ? 'Baño' : 'Baños'}</dt><dd className="text-right">{p.banos}</dd></>)}
          </dl>
          {p.descripcion && <p className="text-xs text-gray-600">{p.descripcion}</p>}
          {p.contacto && <p className="text-xs"><span className="text-gray-500">Contacto:</span> {p.contacto}</p>}
          <div className="flex flex-wrap gap-1.5">
            {wa && (
              <a href={wa} target="_blank" rel="noopener noreferrer" className="flex-1 rounded-md bg-[#25D366] px-2 py-1.5 text-center text-xs font-semibold text-white">
                Consultar por WhatsApp
              </a>
            )}
            <a href={urlFichaPdf(p.id)} target="_blank" rel="noopener noreferrer" className="rounded-md border border-gray-300 px-2 py-1.5 text-center text-xs">Ficha PDF</a>
            <button
              type="button"
              className="rounded-md border border-gray-300 px-2 py-1.5 text-xs"
              onClick={() => { void navigator.clipboard?.writeText(enlaceInmueble(p.id)).then(() => { setCopiado(true); setTimeout(() => setCopiado(false), 1800) }) }}
            >
              {copiado ? '¡Copiado!' : 'Copiar enlace'}
            </button>
          </div>
          {p.numero_predial && (
            <button type="button" onClick={() => onVerPredio(p.numero_predial!)} className="w-full rounded-md bg-emerald-700 py-1.5 text-xs font-medium text-white">
              Ver uso de suelo y restricciones del predio
            </button>
          )}
        </div>
      </div>
    </Popup>
  )
}
