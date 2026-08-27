import type { CompraCuota } from '../types/finance'

/**
 * Calcula el valor de la cuota mensual para una compra con tarjeta de crédito
 * utilizando la fórmula estándar de amortización (sistema francés / cuota fija).
 * 
 * Si la tasa es 0 o es a 1 cuota, la cuota es monto / cuotas.
 */
export function calcularCuotaMensual(
  monto: number,
  cuotas: number,
  tasaMensualPct: number
): number {
  if (cuotas <= 1 || tasaMensualPct <= 0) {
    return Math.round(monto / Math.max(1, cuotas))
  }

  const i = tasaMensualPct / 100
  const n = cuotas
  const factor = Math.pow(1 + i, n)
  const cuota = (monto * (i * factor)) / (factor - 1)

  return Math.round(cuota)
}

export interface DetalleTablaAmortizacion {
  numeroCuota: number
  saldoInicial: number
  cuotaTotal: number
  abonoCapital: number
  intereses: number
  saldoFinal: number
}

/**
 * Genera la tabla completa de amortización de una compra a cuotas
 */
export function generarTablaAmortizacion(
  monto: number,
  cuotas: number,
  tasaMensualPct: number
): DetalleTablaAmortizacion[] {
  const tabla: DetalleTablaAmortizacion[] = []
  let saldo = monto
  const cuotaFija = calcularCuotaMensual(monto, cuotas, tasaMensualPct)
  const i = tasaMensualPct > 0 ? tasaMensualPct / 100 : 0

  for (let c = 1; c <= cuotas; c++) {
    const interes = i > 0 ? Math.round(saldo * i) : 0
    let capital = cuotaFija - interes

    if (c === cuotas || capital > saldo) {
      capital = saldo
    }

    const saldoFinal = Math.max(0, saldo - capital)

    tabla.push({
      numeroCuota: c,
      saldoInicial: Math.round(saldo),
      cuotaTotal: Math.round(capital + interes),
      abonoCapital: Math.round(capital),
      intereses: Math.round(interes),
      saldoFinal: Math.round(saldoFinal),
    })

    saldo = saldoFinal
  }

  return tabla
}

/**
 * Calcula el total de cuotas proyectadas que deben pagarse en un mes específico (YYYY-MM)
 */
export function calcularCuotasMes(
  compras: CompraCuota[],
  mesObjetivo: string
): { totalMes: number; detalle: { compra: CompraCuota; cuotaNumero: number; valor: number }[] } {
  let totalMes = 0
  const detalle: { compra: CompraCuota; cuotaNumero: number; valor: number }[] = []

  for (const compra of compras) {
    if (compra.estado !== 'ACTIVA') continue

    const [startYear, startMonth] = (compra.fechaInicioCobro || compra.fechaCompra.slice(0, 7))
      .split('-')
      .map(Number)
    const [targetYear, targetMonth] = mesObjetivo.split('-').map(Number)

    const monthDiff = (targetYear - startYear) * 12 + (targetMonth - startMonth)
    const cuotaIndex = monthDiff + 1

    if (cuotaIndex >= 1 && cuotaIndex <= compra.cuotasTotales) {
      if (compra.cuotasPagadas < cuotaIndex) {
        totalMes += compra.valorCuota
        detalle.push({
          compra,
          cuotaNumero: cuotaIndex,
          valor: compra.valorCuota,
        })
      }
    }
  }

  return { totalMes, detalle }
}

/**
 * Calcula el estado de ejecución de un presupuesto
 */
export function calcularEstadoPresupuesto(
  gastoActual: number,
  limite: number
): {
  porcentaje: number
  estado: 'normal' | 'alerta' | 'excedido'
  diferencia: number
} {
  if (limite <= 0) {
    return {
      porcentaje: gastoActual > 0 ? 100 : 0,
      estado: gastoActual > 0 ? 'excedido' : 'normal',
      diferencia: -gastoActual,
    }
  }

  const porcentaje = Math.round((gastoActual / limite) * 100)
  const diferencia = limite - gastoActual

  let estado: 'normal' | 'alerta' | 'excedido' = 'normal'
  if (porcentaje >= 100) {
    estado = 'excedido'
  } else if (porcentaje >= 80) {
    estado = 'alerta'
  }

  return { porcentaje, estado, diferencia }
}
