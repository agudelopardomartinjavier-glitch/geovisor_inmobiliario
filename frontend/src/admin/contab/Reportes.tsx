import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { impuestos, repComisiones, repFlujo, repOcupacion, repRentabilidad } from './api'
import { Campo, Dato, Seccion, Tabla, bajar, botonSec, cop, hoyISO, mesActual } from './ui'

const pct = (n: number | null) => (n == null ? '—' : `${n.toLocaleString('es-CO', { maximumFractionDigits: 2 })} %`)

function Excel({ ruta, nombre }: { ruta: string; nombre: string }) {
  return <button type="button" className={botonSec} onClick={() => bajar(ruta, `${nombre}.xlsx`)}>Descargar Excel</button>
}

export default function Reportes() {
  const [periodo, setPeriodo] = useState(mesActual())
  const [desde, setDesde] = useState(`${hoyISO().slice(0, 4)}-01-01`)
  const [hasta, setHasta] = useState(hoyISO())
  const imp = useQuery({ queryKey: ['c', 'imp', periodo], queryFn: () => impuestos(periodo), retry: false })
  const com = useQuery({ queryKey: ['c', 'rep-com', desde, hasta], queryFn: () => repComisiones(desde, hasta), retry: false })
  const flu = useQuery({ queryKey: ['c', 'rep-flu', desde, hasta], queryFn: () => repFlujo(desde, hasta), retry: false })
  const ocu = useQuery({ queryKey: ['c', 'rep-ocu'], queryFn: repOcupacion })
  const ren = useQuery({ queryKey: ['c', 'rep-ren'], queryFn: repRentabilidad })
  const i = imp.data

  return (
    <div className="space-y-4">
      <Seccion titulo="Resumen mensual para el contador"
        derecha={<div className="flex items-center gap-2"><input className="rounded-md border border-gray-300 px-2 py-1 text-xs" type="month" value={periodo} onChange={(e) => setPeriodo(e.target.value)} aria-label="Mes"
          /><Excel ruta={`/impuestos/resumen?periodo=${periodo}&formato=xlsx`} nombre={`resumen-contador-${periodo}`} /></div>}>
        {i && (
          <>
            <div className="grid grid-cols-2 gap-2 lg:grid-cols-4">
              <Dato titulo="Ingresos netos (antes de IVA)" valor={cop(i.ingresos_netos)} detalle={`${i.facturas} factura(s) − ${i.notas_credito} nota(s) crédito`} />
              <Dato titulo="IVA generado" valor={cop(i.iva_generado)} />
              <Dato titulo="ICA causado" valor={cop(i.ica_causado)} detalle={`${i.ica_por_mil} por mil`} />
              <Dato titulo="Total facturado" valor={cop(i.total_facturado)} />
              <Dato titulo="Retención en la fuente" valor={cop(i.retefuente)} />
              <Dato titulo="Retención de ICA" valor={cop(i.reteica)} />
              <Dato titulo="Retención de IVA" valor={cop(i.reteiva)} />
              <Dato titulo="Comisiones por venta / arriendo" valor={`${cop(i.ingresos_por_tipo.venta)} / ${cop(i.ingresos_por_tipo.arriendo)}`} />
            </div>
            <p className="rounded bg-amber-50 p-2 text-[11px] text-amber-900">{i.aviso}</p>
          </>
        )}
      </Seccion>

      <Seccion titulo="Ingresos por comisión y flujo de caja"
        derecha={<div className="flex flex-wrap items-center gap-2 text-xs"><Campo etiqueta="Desde"><input className="ml-1 rounded-md border border-gray-300 px-2 py-1" type="date" value={desde} onChange={(e) => setDesde(e.target.value)} /></Campo>
          <Campo etiqueta="Hasta"><input className="ml-1 rounded-md border border-gray-300 px-2 py-1" type="date" value={hasta} onChange={(e) => setHasta(e.target.value)} /></Campo></div>}>
        <div className="grid gap-4 lg:grid-cols-2">
          <div className="space-y-2">
            <div className="flex items-center justify-between"><h3 className="text-xs font-bold">Comisiones</h3><Excel ruta={`/reportes/comisiones?desde=${desde}&hasta=${hasta}&formato=xlsx`} nombre="comisiones" /></div>
            {com.data && <div className="grid grid-cols-3 gap-2"><Dato titulo="Devengado" valor={cop(com.data.total_devengado)} /><Dato titulo="Cobrado" valor={cop(com.data.total_cobrado)} /><Dato titulo="Parte inmobiliaria" valor={cop(com.data.parte_inmobiliaria)} /></div>}
            <Tabla derecha={[1, 2, 3]} cab={['Mes', 'Devengado', 'IVA', 'Cobrado']} filas={(com.data?.por_mes ?? []).map((m) => [m.mes, cop(m.devengado), cop(m.iva), cop(m.cobrado)])} vacio="Sin comisiones en el rango." />
            <Tabla derecha={[1, 2]} cab={['Asesor / referido', 'Comisiones', 'Valor']} filas={(com.data?.por_asesor ?? []).map((a) => [a.nombre, a.comisiones, cop(a.valor)])} vacio="Sin repartos a asesores." />
          </div>
          <div className="space-y-2">
            <div className="flex items-center justify-between"><h3 className="text-xs font-bold">Flujo de caja</h3><Excel ruta={`/reportes/flujo-caja?desde=${desde}&hasta=${hasta}&formato=xlsx`} nombre="flujo-caja" /></div>
            {flu.data && <div className="grid grid-cols-3 gap-2"><Dato titulo="Entradas" valor={cop(flu.data.total_entradas)} /><Dato titulo="Salidas" valor={cop(flu.data.total_salidas)} /><Dato titulo="Neto" valor={cop(flu.data.neto)} tono={flu.data.neto < 0 ? 'rojo' : undefined} /></div>}
            <Tabla derecha={[1, 2, 3, 4, 5]} cab={['Mes', 'Recaudos', 'Comisiones', 'Gastos', 'Giros', 'Neto']}
              filas={(flu.data?.meses ?? []).map((m) => [m.mes, cop(m.recaudos), cop(m.comisiones_cobradas), cop(m.gastos_pagados), cop(m.giros), cop(m.neto)])} vacio="Sin movimientos en el rango." />
            <p className="text-[11px] text-gray-500">Vista de caja: entradas = recibos + comisiones cobradas (netas de retenciones); salidas = gastos pagados + giros a propietarios.</p>
          </div>
        </div>
      </Seccion>

      <Seccion titulo="Ocupación" derecha={<Excel ruta="/reportes/ocupacion?formato=xlsx" nombre="ocupacion" />}>
        {ocu.data && <div className="grid grid-cols-2 gap-2 lg:grid-cols-4"><Dato titulo="Ocupación" valor={pct(ocu.data.ocupacion_pct)} detalle={`${ocu.data.ocupados} de ${ocu.data.inmuebles_administrados} inmuebles`} />
          <Dato titulo="Vacantes" valor={ocu.data.vacantes} /></div>}
        <Tabla cab={['Inmueble', 'Tipo', 'Vacante desde', 'Días vacante']} filas={(ocu.data?.detalle_vacantes ?? []).map((v) => [`#${v.inmueble_id}`, v.tipo, v.vacante_desde ?? '—', v.dias_vacante ?? '—'])} vacio="Sin vacantes." />
      </Seccion>

      <Seccion titulo="Rentabilidad por inmueble" derecha={<Excel ruta="/reportes/rentabilidad?formato=xlsx" nombre="rentabilidad" />}>
        <Tabla derecha={[2, 3, 4, 5, 6, 7]} cab={['Inmueble', 'Tipo', 'Canon mensual', 'Valor', 'Rentab. teórica', 'Ingresos 12 m', 'Gastos propietario', 'Rentab. real']}
          filas={(ren.data?.inmuebles ?? []).map((r) => [`#${r.inmueble_id}`, r.tipo, cop(r.canon_mensual), cop(r.valor), pct(r.rentabilidad_teorica_pct), cop(r.ingresos_periodo), cop(r.gastos_propietario_periodo), pct(r.rentabilidad_real_pct)])}
          vacio="Aún no hay contratos vigentes." />
        {ren.data && <p className="text-[11px] text-gray-500">{ren.data.nota}</p>}
      </Seccion>
    </div>
  )
}
