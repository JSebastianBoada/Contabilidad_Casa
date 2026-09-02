import type { FullFinanceState } from '../services/storageService'
import { formatMoney } from './formatters'

export type ModuloMovimiento =
  | 'INGRESOS'
  | 'HOGAR'
  | 'ARRIENDO'
  | 'SERVICIOS'
  | 'ALIMENTACION'
  | 'PERSONAL'
  | 'TARJETAS'
  | 'TRANSFERENCIAS'

export type TipoMovimiento = 'INGRESO' | 'GASTO' | 'TRANSFERENCIA' | 'CUOTA_TARJETA'

export interface MovimientoGeneral {
  id: string
  fecha: string
  modulo: ModuloMovimiento
  moduloLabel: string
  descripcion: string
  categoria: string
  tipo: TipoMovimiento
  monto: number
  cuentaId?: string
  cuentaNombre?: string
  cuentaTipo?: string
  tarjetaId?: string
  tarjetaNombre?: string
  medioPagoLabel: string
  medioPagoColor?: string
  pagado?: boolean
  responsable?: string
  periodo?: string
  notas?: string
  destinatarioCuentaNombre?: string
}

export interface FiltrosMovimientos {
  mes?: string // 'YYYY-MM' o 'TODOS'
  modulo?: ModuloMovimiento | 'TODOS'
  tipo?: TipoMovimiento | 'TODOS'
  cuentaId?: string
  tarjetaId?: string
  busqueda?: string
}

/**
 * Consolida todas las fuentes de datos (ingresos, hogar, arriendo, servicios, alimentación,
 * personal, transferencias y pagos de cuotas) en una lista unificada y cronológica.
 */
export function consolidarMovimientos(
  state: FullFinanceState,
  filtros?: FiltrosMovimientos
): MovimientoGeneral[] {
  const list: MovimientoGeneral[] = []

  const mapaCuentas = new Map((state.cuentas || []).map((c) => [c.id, c]))
  const mapaTarjetas = new Map((state.tarjetas || []).map((t) => [t.id, t]))

  // 1. Ingresos
  ;(state.ingresos || []).forEach((i) => {
    const c = i.cuentaId ? mapaCuentas.get(i.cuentaId) : undefined
    list.push({
      id: i.id,
      fecha: i.fecha,
      modulo: 'INGRESOS',
      moduloLabel: 'Ingresos',
      descripcion: i.descripcion,
      categoria: i.tipo.replace(/_/g, ' '),
      tipo: 'INGRESO',
      monto: i.monto,
      cuentaId: i.cuentaId,
      cuentaNombre: c?.nombre || 'Cuenta',
      cuentaTipo: c?.tipo,
      medioPagoLabel: c?.nombre || 'Cuenta Bancaria',
      medioPagoColor: c?.color || '#10b981',
      notas: i.notas,
      periodo: i.fecha.slice(0, 7),
    })
  })

  // 2. Gastos de Arriendos
  ;(state.arriendos || []).forEach((a) => {
    const c = a.cuentaId ? mapaCuentas.get(a.cuentaId) : undefined
    const t = a.tarjetaId ? mapaTarjetas.get(a.tarjetaId) : undefined
    const fecha = a.fechaPago || a.fechaLimite || `${a.mesCorrespondiente}-05`
    const medioLabel = t?.nombre || c?.nombre || (a.pagado ? 'Cuenta Débito' : 'Por Pagar')

    list.push({
      id: a.id,
      fecha,
      modulo: 'ARRIENDO',
      moduloLabel: 'Arriendo',
      descripcion: a.arrendador ? `Arriendo: ${a.arrendador}` : 'Arriendo de Vivienda',
      categoria: 'Vivienda',
      tipo: 'GASTO',
      monto: a.monto,
      cuentaId: a.cuentaId,
      cuentaNombre: c?.nombre,
      cuentaTipo: c?.tipo,
      tarjetaId: a.tarjetaId,
      tarjetaNombre: t?.nombre,
      medioPagoLabel: medioLabel,
      medioPagoColor: t ? '#8b5cf6' : c?.color || '#3b82f6',
      pagado: a.pagado,
      responsable: a.responsablePago || 'YO',
      periodo: a.mesCorrespondiente,
      notas: a.notas,
    })
  })

  // 3. Gastos de Servicios Públicos
  ;(state.servicios || []).forEach((s) => {
    const c = s.cuentaId ? mapaCuentas.get(s.cuentaId) : undefined
    const t = s.tarjetaId ? mapaTarjetas.get(s.tarjetaId) : undefined
    const fecha = s.fechaPago || s.fechaVencimiento
    const medioLabel = t?.nombre || c?.nombre || (s.pagado ? 'Cuenta Débito' : 'Pendiente')

    list.push({
      id: s.id,
      fecha,
      modulo: 'SERVICIOS',
      moduloLabel: 'Servicios',
      descripcion: s.nombre,
      categoria: s.tipo,
      tipo: 'GASTO',
      monto: s.monto,
      cuentaId: s.cuentaId,
      cuentaNombre: c?.nombre,
      cuentaTipo: c?.tipo,
      tarjetaId: s.tarjetaId,
      tarjetaNombre: t?.nombre,
      medioPagoLabel: medioLabel,
      medioPagoColor: t ? '#8b5cf6' : c?.color || '#3b82f6',
      pagado: s.pagado,
      responsable: s.responsablePago || 'MAMA',
      periodo: s.periodo || s.fechaVencimiento.slice(0, 7),
      notas: s.notas || (s.consumo ? `Consumo: ${s.consumo}` : undefined),
    })
  })

  // 4. Compras del Hogar
  ;(state.comprasHogar || []).forEach((ch) => {
    const c = ch.cuentaId ? mapaCuentas.get(ch.cuentaId) : undefined
    const t = ch.tarjetaId ? mapaTarjetas.get(ch.tarjetaId) : undefined
    const isTc = Boolean(ch.tarjetaId) || ch.metodoPago === 'TARJETA_CREDITO'
    const medioLabel = t?.nombre || c?.nombre || (isTc ? 'Tarjeta de Crédito' : 'Cuenta')

    list.push({
      id: ch.id,
      fecha: ch.fecha,
      modulo: 'HOGAR',
      moduloLabel: 'Hogar',
      descripcion: ch.descripcion,
      categoria: ch.categoria.replace(/_/g, ' '),
      tipo: 'GASTO',
      monto: ch.monto,
      cuentaId: ch.cuentaId,
      cuentaNombre: c?.nombre,
      cuentaTipo: c?.tipo,
      tarjetaId: ch.tarjetaId,
      tarjetaNombre: t?.nombre,
      medioPagoLabel: medioLabel,
      medioPagoColor: isTc ? '#8b5cf6' : c?.color || '#3b82f6',
      periodo: ch.fecha.slice(0, 7),
      notas: ch.lugar ? `Lugar: ${ch.lugar}` : ch.notas,
    })
  })

  // 5. Alimentación y Mercado
  ;(state.alimentacion || []).forEach((al) => {
    const c = al.cuentaId ? mapaCuentas.get(al.cuentaId) : undefined
    const t = al.tarjetaId ? mapaTarjetas.get(al.tarjetaId) : undefined
    const isTc = Boolean(al.tarjetaId) || al.metodoPago === 'TARJETA_CREDITO'
    const medioLabel = t?.nombre || c?.nombre || (isTc ? 'Tarjeta de Crédito' : 'Cuenta')

    list.push({
      id: al.id,
      fecha: al.fecha,
      modulo: 'ALIMENTACION',
      moduloLabel: 'Alimentación',
      descripcion: `${al.descripcion}${al.tipoComida ? ` (${al.tipoComida})` : ''}`,
      categoria: al.tipoComida.replace(/_/g, ' '),
      tipo: 'GASTO',
      monto: al.monto,
      cuentaId: al.cuentaId,
      cuentaNombre: c?.nombre,
      cuentaTipo: c?.tipo,
      tarjetaId: al.tarjetaId,
      tarjetaNombre: t?.nombre,
      medioPagoLabel: medioLabel,
      medioPagoColor: isTc ? '#8b5cf6' : c?.color || '#10b981',
      responsable: al.beneficiario || 'YO',
      periodo: al.fecha.slice(0, 7),
      notas: al.lugarOProveedor ? `Lugar: ${al.lugarOProveedor}` : al.notas,
    })
  })

  // 6. Gastos Personales y Ocio
  ;(state.gastosPersonales || []).forEach((gp) => {
    const c = gp.cuentaId ? mapaCuentas.get(gp.cuentaId) : undefined
    const t = gp.tarjetaId ? mapaTarjetas.get(gp.tarjetaId) : undefined
    const isTc = Boolean(gp.tarjetaId) || gp.metodoPago === 'TARJETA_CREDITO'
    const medioLabel = t?.nombre || c?.nombre || (isTc ? 'Tarjeta de Crédito' : 'Cuenta')

    list.push({
      id: gp.id,
      fecha: gp.fecha,
      modulo: 'PERSONAL',
      moduloLabel: 'Personal',
      descripcion: gp.descripcion,
      categoria: gp.categoria.replace(/_/g, ' '),
      tipo: 'GASTO',
      monto: gp.monto,
      cuentaId: gp.cuentaId,
      cuentaNombre: c?.nombre,
      cuentaTipo: c?.tipo,
      tarjetaId: gp.tarjetaId,
      tarjetaNombre: t?.nombre,
      medioPagoLabel: medioLabel,
      medioPagoColor: isTc ? '#8b5cf6' : c?.color || '#f59e0b',
      periodo: gp.fecha.slice(0, 7),
      notas: gp.notas,
    })
  })

  // 7. Pagos Globales de Tarjetas de Crédito (Pagos Mínimos, Totales o Facturación del Mes)
  ;(state.pagosTarjetas || []).forEach((pt) => {
    const c = mapaCuentas.get(pt.cuentaId)
    const t = mapaTarjetas.get(pt.tarjetaId)

    list.push({
      id: pt.id,
      fecha: pt.fecha,
      modulo: 'TARJETAS',
      moduloLabel: 'Tarjetas',
      descripcion: pt.descripcion || `Pago ${pt.tipoPago === 'MINIMO' ? 'Mínimo' : pt.tipoPago === 'TOTAL' ? 'Total' : 'Parcial'} ${t?.nombre || 'Tarjeta'}`,
      categoria: 'Pago Tarjeta de Crédito',
      tipo: 'CUOTA_TARJETA',
      monto: pt.monto,
      cuentaId: pt.cuentaId,
      cuentaNombre: c?.nombre || 'Cuenta Débito',
      cuentaTipo: c?.tipo,
      tarjetaId: pt.tarjetaId,
      tarjetaNombre: t?.nombre || 'Tarjeta de Crédito',
      medioPagoLabel: c ? `${c.nombre} -> ${t?.nombre || 'Tarjeta'}` : t?.nombre || 'Tarjeta',
      medioPagoColor: '#8b5cf6',
      periodo: pt.mes || pt.fecha.slice(0, 7),
      notas: `Pago liquidado desde ${c?.nombre || 'cuenta'} para pagar tarjeta`,
    })
  })

  // 8. Pagos individuales de cuotas de compras diferidas
  ;(state.comprasCuotas || []).forEach((compra) => {
    const t = mapaTarjetas.get(compra.tarjetaId)
    ;(compra.historialPagos || []).forEach((pago, idx) => {
      const yaRegistradoGlobal = (state.pagosTarjetas || []).some(
        (pt) => pt.tarjetaId === compra.tarjetaId && pt.fecha === pago.fechaPago && pt.cuentaId === pago.cuentaId
      )
      if (yaRegistradoGlobal) return

      const c = pago.cuentaId ? mapaCuentas.get(pago.cuentaId) : undefined
      list.push({
        id: `pago-cuota-${compra.id}-${pago.numeroCuota}-${idx}`,
        fecha: pago.fechaPago,
        modulo: 'TARJETAS',
        moduloLabel: 'Tarjetas',
        descripcion: `Cuota ${pago.numeroCuota}/${compra.cuotasTotales} - ${compra.descripcion}`,
        categoria: 'Pago Cuota Tarjeta',
        tipo: 'CUOTA_TARJETA',
        monto: pago.montoPagado || compra.valorCuota,
        cuentaId: pago.cuentaId,
        cuentaNombre: c?.nombre || 'Cuenta Débito',
        cuentaTipo: c?.tipo,
        tarjetaId: compra.tarjetaId,
        tarjetaNombre: t?.nombre || 'Tarjeta de Crédito',
        medioPagoLabel: c ? `${c.nombre} -> ${t?.nombre || 'Tarjeta'}` : t?.nombre || 'Tarjeta',
        medioPagoColor: '#8b5cf6',
        periodo: pago.fechaPago.slice(0, 7),
        notas: `Capital: ${formatMoney(pago.abonoCapital)} | Interés: ${formatMoney(pago.interes)}`,
      })
    })
  })

  // 8. Transferencias entre Cuentas
  ;(state.transferencias || []).forEach((tr) => {
    const origen = mapaCuentas.get(tr.cuentaOrigenId)
    const destino = mapaCuentas.get(tr.cuentaDestinoId)

    list.push({
      id: tr.id,
      fecha: tr.fecha,
      modulo: 'TRANSFERENCIAS',
      moduloLabel: 'Transferencia',
      descripcion: tr.descripcion || `Transferencia de ${origen?.nombre || 'Origen'} a ${destino?.nombre || 'Destino'}`,
      categoria: 'Movimiento Interno',
      tipo: 'TRANSFERENCIA',
      monto: tr.monto,
      cuentaId: tr.cuentaOrigenId,
      cuentaNombre: origen?.nombre,
      cuentaTipo: origen?.tipo,
      destinatarioCuentaNombre: destino?.nombre,
      medioPagoLabel: `${origen?.nombre || 'Origen'} -> ${destino?.nombre || 'Destino'}`,
      medioPagoColor: '#06b6d4',
      periodo: tr.fecha.slice(0, 7),
    })
  })

  // Aplicar filtros
  let resultado = list

  if (filtros) {
    const { mes, modulo, tipo, cuentaId, tarjetaId, busqueda } = filtros

    if (mes && mes !== 'TODOS') {
      resultado = resultado.filter((m) => m.fecha.startsWith(mes) || m.periodo === mes)
    }

    if (modulo && modulo !== 'TODOS') {
      resultado = resultado.filter((m) => m.modulo === modulo)
    }

    if (tipo && tipo !== 'TODOS') {
      resultado = resultado.filter((m) => m.tipo === tipo)
    }

    if (cuentaId && cuentaId !== 'TODOS') {
      resultado = resultado.filter(
        (m) => m.cuentaId === cuentaId || (m.modulo === 'TRANSFERENCIAS' && m.id.includes(cuentaId))
      )
    }

    if (tarjetaId && tarjetaId !== 'TODOS') {
      resultado = resultado.filter((m) => m.tarjetaId === tarjetaId)
    }

    if (busqueda && busqueda.trim()) {
      const q = busqueda.trim().toLowerCase()
      resultado = resultado.filter(
        (m) =>
          m.descripcion.toLowerCase().includes(q) ||
          m.categoria.toLowerCase().includes(q) ||
          m.moduloLabel.toLowerCase().includes(q) ||
          m.medioPagoLabel.toLowerCase().includes(q) ||
          (m.responsable && m.responsable.toLowerCase().includes(q)) ||
          (m.notas && m.notas.toLowerCase().includes(q)) ||
          String(m.monto).includes(q)
      )
    }
  }

  // Ordenar por fecha descendente más reciente primero
  return resultado.sort((a, b) => b.fecha.localeCompare(a.fecha))
}
