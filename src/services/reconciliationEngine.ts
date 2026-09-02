import type { FullFinanceState } from './storageService'
import type { TransaccionExtracto } from './statementParser'

export interface RegistroAppGenerico {
  id: string
  tipoModulo: 'GASTO_PERSONAL' | 'ALIMENTACION' | 'HOGAR' | 'SERVICIO' | 'INGRESO' | 'CUOTA_TARJETA'
  descripcion: string
  monto: number
  fecha: string
  cuentaId?: string
  tarjetaId?: string
  metodoPago?: string
}

export interface ItemAuditoria {
  id: string
  transaccionExtracto: TransaccionExtracto
  estado: 'CONCILIADO' | 'FALTANTE' | 'DIFERENCIA_VALOR' | 'CARGO_BANCARIO'
  registroAppCoincidente?: RegistroAppGenerico
  diferenciaMonto?: number
  notasAuditoria: string
}

export interface ReporteAuditoria {
  items: ItemAuditoria[]
  totalMovimientosExtracto: number
  totalMontoDebitosExtracto: number
  totalMontoCreditosExtracto: number
  cantidadConciliados: number
  cantidadFaltantes: number
  totalMontoFaltante: number
  cantidadCargosBancarios: number
  totalMontoCargosBancarios: number
  cantidadDiferencias: number
  porcentajeConciliacion: number
  registrosAppNoEnExtracto: RegistroAppGenerico[]
}

/**
 * Función que cruza y audita los datos del extracto contra la base de datos de la app
 */
export function auditarYConciliarExtracto(
  transacciones: TransaccionExtracto[],
  state: FullFinanceState,
  mesSeleccionado: string,
  filtroCuentaId?: string,
  filtroTarjetaId?: string
): ReporteAuditoria {
  // 1. Recopilar todos los registros del mes en la app
  const registrosApp: RegistroAppGenerico[] = []

  // Gastos personales
  ;(state.gastosPersonales || [])
    .filter((g) => g.fecha.startsWith(mesSeleccionado))
    .forEach((g) => {
      if (filtroTarjetaId && g.tarjetaId !== filtroTarjetaId) return
      if (filtroCuentaId && g.cuentaId !== filtroCuentaId) return
      registrosApp.push({
        id: g.id,
        tipoModulo: 'GASTO_PERSONAL',
        descripcion: g.descripcion,
        monto: g.monto,
        fecha: g.fecha,
        cuentaId: g.cuentaId,
        tarjetaId: g.tarjetaId,
        metodoPago: g.metodoPago,
      })
    })

  // Alimentación
  ;(state.alimentacion || [])
    .filter((a) => a.fecha.startsWith(mesSeleccionado))
    .forEach((a) => {
      if (filtroTarjetaId && a.tarjetaId !== filtroTarjetaId) return
      if (filtroCuentaId && a.cuentaId !== filtroCuentaId) return
      registrosApp.push({
        id: a.id,
        tipoModulo: 'ALIMENTACION',
        descripcion: `${a.tipoComida}: ${a.descripcion}`,
        monto: a.monto,
        fecha: a.fecha,
        cuentaId: a.cuentaId,
        tarjetaId: a.tarjetaId,
        metodoPago: a.metodoPago,
      })
    })

  // Compras de Hogar
  ;(state.comprasHogar || [])
    .filter((c) => c.fecha.startsWith(mesSeleccionado))
    .forEach((c) => {
      if (filtroTarjetaId && c.tarjetaId !== filtroTarjetaId) return
      if (filtroCuentaId && c.cuentaId !== filtroCuentaId) return
      registrosApp.push({
        id: c.id,
        tipoModulo: 'HOGAR',
        descripcion: c.descripcion,
        monto: c.monto,
        fecha: c.fecha,
        cuentaId: c.cuentaId,
        tarjetaId: c.tarjetaId,
        metodoPago: c.metodoPago,
      })
    })

  // Servicios Públicos pagados
  ;(state.servicios || [])
    .filter((s) => (s.periodo === mesSeleccionado || s.fechaVencimiento.startsWith(mesSeleccionado)) && s.pagado)
    .forEach((s) => {
      if (filtroTarjetaId && s.tarjetaId !== filtroTarjetaId) return
      if (filtroCuentaId && s.cuentaId !== filtroCuentaId) return
      registrosApp.push({
        id: s.id,
        tipoModulo: 'SERVICIO',
        descripcion: s.nombre,
        monto: s.monto,
        fecha: s.fechaPago || s.fechaVencimiento,
        cuentaId: s.cuentaId,
        tarjetaId: s.tarjetaId,
      })
    })

  // Compras a Cuotas activas de Tarjetas de Crédito
  ;(state.comprasCuotas || [])
    .filter((c) => {
      if (filtroTarjetaId && c.tarjetaId !== filtroTarjetaId) return false
      return c.fechaInicioCobro <= mesSeleccionado && c.estado === 'ACTIVA'
    })
    .forEach((c) => {
      registrosApp.push({
        id: c.id,
        tipoModulo: 'CUOTA_TARJETA',
        descripcion: `Cuota ${c.cuotasPagadas + 1}/${c.cuotasTotales}: ${c.descripcion}`,
        monto: c.valorCuota,
        fecha: `${mesSeleccionado}-15`,
        tarjetaId: c.tarjetaId,
        metodoPago: 'TARJETA_CREDITO',
      })
    })

  // Ingresos personales / Abonos a la tarjeta
  ;(state.ingresos || [])
    .filter((i) => i.fecha.startsWith(mesSeleccionado))
    .forEach((i) => {
      if (filtroCuentaId && i.cuentaId !== filtroCuentaId) return
      registrosApp.push({
        id: i.id,
        tipoModulo: 'INGRESO',
        descripcion: i.descripcion,
        monto: i.monto,
        fecha: i.fecha,
        cuentaId: i.cuentaId,
      })
    })

  const registrosAppUsados = new Set<string>()
  const items: ItemAuditoria[] = []

  // 2. Evaluar cada transacción del extracto
  transacciones.forEach((tx, idx) => {
    // Caso especial: Abono o Pago de Tarjeta de Crédito (pago de extracto del ciclo anterior)
    if (tx.clasificacionTarjeta === 'PAGO_ABONO' || (filtroTarjetaId && tx.tipo === 'CREDITO')) {
      items.push({
        id: `aud-${tx.id || idx}`,
        transaccionExtracto: tx,
        estado: 'CONCILIADO',
        notasAuditoria: 'Abono / Pago a la tarjeta de crédito correspondiente al ciclo de facturación anterior.',
      })
      return
    }

    // Caso especial: Cargo financiero bancario (4x1000, cuota manejo, etc.)
    if (tx.esCargoBancario) {
      items.push({
        id: `aud-${tx.id || idx}`,
        transaccionExtracto: tx,
        estado: 'CARGO_BANCARIO',
        notasAuditoria: 'Cobro o comisión bancaria directa (GMF 4x1000, cuota de manejo o interés).',
      })
      return
    }

    // Buscar coincidencia exacta (mismo monto y fecha cercana ± 4 días)
    const matchExacto = registrosApp.find((reg) => {
      if (registrosAppUsados.has(reg.id)) return false
      if (reg.monto !== tx.monto) return false

      // Comparar fechas dentro de un rango de ± 4 días (por desfase de procesamiento bancario)
      const diffDias = Math.abs(
        (new Date(reg.fecha).getTime() - new Date(tx.fecha).getTime()) / (1000 * 60 * 60 * 24)
      )
      return diffDias <= 4
    })

    if (matchExacto) {
      registrosAppUsados.add(matchExacto.id)
      items.push({
        id: `aud-${tx.id || idx}`,
        transaccionExtracto: tx,
        estado: 'CONCILIADO',
        registroAppCoincidente: matchExacto,
        notasAuditoria: `Coincide exactamente con el registro "${matchExacto.descripcion}" del ${matchExacto.fecha}.`,
      })
      return
    }

    // Buscar coincidencia por texto/comercio similar con monto diferente
    const matchTexto = registrosApp.find((reg) => {
      if (registrosAppUsados.has(reg.id)) return false
      const descTx = tx.descripcion.toLowerCase()
      const descReg = reg.descripcion.toLowerCase()

      // Verificar palabras clave compartidas
      const palabrasTx = descTx.split(/\s+/).filter((w) => w.length >= 4)
      const tienePalabra = palabrasTx.some((p) => descReg.includes(p))

      return tienePalabra
    })

    if (matchTexto && Math.abs(matchTexto.monto - tx.monto) <= matchTexto.monto * 0.25) {
      registrosAppUsados.add(matchTexto.id)
      const diff = tx.monto - matchTexto.monto
      items.push({
        id: `aud-${tx.id || idx}`,
        transaccionExtracto: tx,
        estado: 'DIFERENCIA_VALOR',
        registroAppCoincidente: matchTexto,
        diferenciaMonto: diff,
        notasAuditoria: `Monto diferente: En extracto es $${tx.monto.toLocaleString('es-CO')} y en la app anotaste $${matchTexto.monto.toLocaleString('es-CO')} (Diferencia: ${diff > 0 ? '+' : ''}$${diff.toLocaleString('es-CO')}).`,
      })
      return
    }

    // Si no coincide con nada, es un gasto faltante en la app
    items.push({
      id: `aud-${tx.id || idx}`,
      transaccionExtracto: tx,
      estado: 'FALTANTE',
      notasAuditoria: 'No se encontró en tus registros de la app. Olvidaste anotarlo o es una compra nueva.',
    })
  })

  // 3. Identificar registros de la app que no aparecieron en el extracto
  const registrosAppNoEnExtracto = registrosApp.filter((reg) => !registrosAppUsados.has(reg.id))

  // Totales
  const totalMontoDebitosExtracto = transacciones
    .filter((t) => t.tipo === 'DEBITO')
    .reduce((acc, t) => acc + t.monto, 0)

  const totalMontoCreditosExtracto = transacciones
    .filter((t) => t.tipo === 'CREDITO')
    .reduce((acc, t) => acc + t.monto, 0)

  const cantidadConciliados = items.filter((i) => i.estado === 'CONCILIADO').length
  const faltantes = items.filter((i) => i.estado === 'FALTANTE')
  const cantidadFaltantes = faltantes.length
  const totalMontoFaltante = faltantes.reduce((acc, i) => acc + i.transaccionExtracto.monto, 0)

  const cargosBancarios = items.filter((i) => i.estado === 'CARGO_BANCARIO')
  const cantidadCargosBancarios = cargosBancarios.length
  const totalMontoCargosBancarios = cargosBancarios.reduce((acc, i) => acc + i.transaccionExtracto.monto, 0)

  const cantidadDiferencias = items.filter((i) => i.estado === 'DIFERENCIA_VALOR').length

  const porcentajeConciliacion =
    transacciones.length > 0
      ? Math.round((cantidadConciliados / transacciones.length) * 100)
      : 100

  return {
    items,
    totalMovimientosExtracto: transacciones.length,
    totalMontoDebitosExtracto,
    totalMontoCreditosExtracto,
    cantidadConciliados,
    cantidadFaltantes,
    totalMontoFaltante,
    cantidadCargosBancarios,
    totalMontoCargosBancarios,
    cantidadDiferencias,
    porcentajeConciliacion,
    registrosAppNoEnExtracto,
  }
}
