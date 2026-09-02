import type { FullFinanceState } from '../services/storageService'
import { formatMoney } from './formatters'
import { calcularCuotasMes } from './financialCalculations'

export interface SubScore {
  titulo: string
  puntos: number
  maxPuntos: number
  descripcion: string
  estado: 'excelente' | 'bueno' | 'alerta' | 'critico'
}

export interface DiagnosticoSalud {
  scoreTotal: number
  nivel: 'EXCELENTE' | 'SALUDABLE' | 'ATENCION' | 'RIESGO'
  color: string
  resumen: string
  subscores: {
    fondoEmergencia: SubScore
    tasaAhorro: SubScore
    endeudamiento: SubScore
    regla503020: SubScore
  }
}

export interface Distribucion503020 {
  ingresosTotales: number
  necesidades: {
    monto: number
    porcentaje: number
    metaPorcentaje: number
    metaMonto: number
    diferencia: number
    estado: 'ok' | 'excedido'
  }
  deseos: {
    monto: number
    porcentaje: number
    metaPorcentaje: number
    metaMonto: number
    diferencia: number
    estado: 'ok' | 'excedido'
  }
  ahorroDeuda: {
    monto: number
    porcentaje: number
    metaPorcentaje: number
    metaMonto: number
    diferencia: number
    estado: 'ok' | 'deficit'
  }
}

export interface ConsejoFinanciero {
  id: string
  categoria: 'DEUDAS' | 'AHORRO' | 'GASTOS_HORMIGA' | 'PRESUPUESTO' | 'LIQUIDEZ'
  tipo: 'CRITICAL' | 'WARNING' | 'OPPORTUNITY' | 'SUCCESS'
  titulo: string
  mensaje: string
  impactoEstimado?: string
  accionSugerida?: string
  rutaSugerida?: string
}

// 1. Cálculo integral de la salud financiera (Score 0 - 100)
export function calcularSaludFinanciera(state: FullFinanceState, selectedMonth: string): DiagnosticoSalud {
  const ingresos = (state.ingresos || [])
    .filter((i) => i.fecha.startsWith(selectedMonth))
    .reduce((acc, i) => acc + i.monto, 0)

  const arriendos = (state.arriendos || [])
    .filter((a) => a.mesCorrespondiente === selectedMonth && a.pagado)
    .reduce((acc, a) => acc + a.monto, 0)

  const servicios = (state.servicios || [])
    .filter((s) => (s.periodo === selectedMonth || s.fechaVencimiento.startsWith(selectedMonth)) && s.pagado)
    .reduce((acc, s) => acc + s.monto, 0)

  const comprasHogar = (state.comprasHogar || [])
    .filter((c) => c.fecha.startsWith(selectedMonth))
    .reduce((acc, c) => acc + c.monto, 0)

  const alimentacion = (state.alimentacion || [])
    .filter((a) => a.fecha.startsWith(selectedMonth))
    .reduce((acc, a) => acc + a.monto, 0)

  const gastosPersonales = (state.gastosPersonales || [])
    .filter((g) => g.fecha.startsWith(selectedMonth))
    .reduce((acc, g) => acc + g.monto, 0)

  const { totalMes: cuotasTarjetas } = calcularCuotasMes(state.comprasCuotas || [], selectedMonth)

  const totalGastosMes = arriendos + servicios + comprasHogar + alimentacion + gastosPersonales + cuotasTarjetas
  const balanceNeto = ingresos - totalGastosMes
  const liquidezTotal = (state.cuentas || []).reduce((acc, c) => acc + c.saldo, 0)
  const gastosFijosBasicos = arriendos + servicios + (alimentacion * 0.7) // ~70% de mercado es básico

  // Pilar 1: Fondo de Emergencia (25 puntos)
  const mesesCobertura = gastosFijosBasicos > 0 ? liquidezTotal / gastosFijosBasicos : liquidezTotal > 0 ? 6 : 0
  let ptsFondo = 0
  let estadoFondo: SubScore['estado'] = 'critico'
  if (mesesCobertura >= 3) {
    ptsFondo = 25
    estadoFondo = 'excelente'
  } else if (mesesCobertura >= 1.5) {
    ptsFondo = 18
    estadoFondo = 'bueno'
  } else if (mesesCobertura >= 0.5) {
    ptsFondo = 10
    estadoFondo = 'alerta'
  } else {
    ptsFondo = 3
    estadoFondo = 'critico'
  }

  // Pilar 2: Tasa de Ahorro y Balance Neto (25 puntos)
  const tasaAhorro = ingresos > 0 ? (balanceNeto / ingresos) * 100 : 0
  let ptsAhorro = 0
  let estadoAhorro: SubScore['estado'] = 'critico'
  if (tasaAhorro >= 20) {
    ptsAhorro = 25
    estadoAhorro = 'excelente'
  } else if (tasaAhorro >= 10) {
    ptsAhorro = 18
    estadoAhorro = 'bueno'
  } else if (tasaAhorro >= 0) {
    ptsAhorro = 10
    estadoAhorro = 'alerta'
  } else {
    ptsAhorro = 0
    estadoAhorro = 'critico'
  }

  // Pilar 3: Nivel de Endeudamiento sobre Ingresos (25 puntos)
  const ratioEndeudamiento = ingresos > 0 ? (cuotasTarjetas / ingresos) * 100 : cuotasTarjetas > 0 ? 50 : 0
  let ptsEndeudamiento = 0
  let estadoEndeudamiento: SubScore['estado'] = 'critico'
  if (ratioEndeudamiento <= 10) {
    ptsEndeudamiento = 25
    estadoEndeudamiento = 'excelente'
  } else if (ratioEndeudamiento <= 20) {
    ptsEndeudamiento = 20
    estadoEndeudamiento = 'bueno'
  } else if (ratioEndeudamiento <= 35) {
    ptsEndeudamiento = 10
    estadoEndeudamiento = 'alerta'
  } else {
    ptsEndeudamiento = 2
    estadoEndeudamiento = 'critico'
  }

  // Pilar 4: Estructura de Gastos y Necesidades (25 puntos)
  const necesidades = arriendos + servicios + comprasHogar + (alimentacion * 0.75)
  const pctNecesidades = ingresos > 0 ? (necesidades / ingresos) * 100 : 60
  let ptsRegla = 0
  let estadoRegla: SubScore['estado'] = 'critico'
  if (pctNecesidades <= 50) {
    ptsRegla = 25
    estadoRegla = 'excelente'
  } else if (pctNecesidades <= 65) {
    ptsRegla = 18
    estadoRegla = 'bueno'
  } else if (pctNecesidades <= 80) {
    ptsRegla = 10
    estadoRegla = 'alerta'
  } else {
    ptsRegla = 4
    estadoRegla = 'critico'
  }

  const scoreTotal = Math.min(100, Math.max(0, ptsFondo + ptsAhorro + ptsEndeudamiento + ptsRegla))

  let nivel: DiagnosticoSalud['nivel'] = 'RIESGO'
  let color = '#f43f5e'
  let resumen = 'Tu presupuesto presenta señales de alerta en liquidez o endeudamiento. Se requiere un plan de ajuste prioritario.'

  if (scoreTotal >= 85) {
    nivel = 'EXCELENTE'
    color = '#10b981'
    resumen = '¡Tus finanzas están en un estado óptimo! Cuentas con buen colchón de liquidez, bajo endeudamiento y excelente tasa de ahorro.'
  } else if (scoreTotal >= 70) {
    nivel = 'SALUDABLE'
    color = '#059669'
    resumen = 'Manejo financiero saludable y controlado. Tienes margen para optimizar gastos hormiga y potenciar tu fondo de ahorro.'
  } else if (scoreTotal >= 50) {
    nivel = 'ATENCION'
    color = '#f59e0b'
    resumen = 'Tus gastos se encuentran cerca de tus ingresos o las cuotas de tarjeta están copando margen. Revisa las recomendaciones.'
  }

  return {
    scoreTotal,
    nivel,
    color,
    resumen,
    subscores: {
      fondoEmergencia: {
        titulo: 'Fondo de Emergencia',
        puntos: ptsFondo,
        maxPuntos: 25,
        descripcion: `Tu liquidez (${formatMoney(liquidezTotal)}) cubre ${mesesCobertura.toFixed(1)} meses de gastos básicos.`,
        estado: estadoFondo,
      },
      tasaAhorro: {
        titulo: 'Capacidad de Ahorro',
        puntos: ptsAhorro,
        maxPuntos: 25,
        descripcion: `Ahorras el ${tasaAhorro.toFixed(0)}% de tus ingresos (${formatMoney(Math.max(0, balanceNeto))} netos).`,
        estado: estadoAhorro,
      },
      endeudamiento: {
        titulo: 'Nivel de Endeudamiento',
        puntos: ptsEndeudamiento,
        maxPuntos: 25,
        descripcion: `Tus cuotas de tarjetas representan el ${ratioEndeudamiento.toFixed(0)}% de tu ingreso neto.`,
        estado: estadoEndeudamiento,
      },
      regla503020: {
        titulo: 'Balance Necesidades / Ocio',
        puntos: ptsRegla,
        maxPuntos: 25,
        descripcion: `Los gastos básicos consumen el ${pctNecesidades.toFixed(0)}% de tus entradas.`,
        estado: estadoRegla,
      },
    },
  }
}

// 2. Cálculo de la Distribución 50 / 30 / 20
export function calcularDistribucion50_30_20(state: FullFinanceState, selectedMonth: string): Distribucion503020 {
  const ingresosTotales = (state.ingresos || [])
    .filter((i) => i.fecha.startsWith(selectedMonth))
    .reduce((acc, i) => acc + i.monto, 0)

  // Necesidades básicas: Arriendo, servicios, compras hogar, mercado general
  const arriendos = (state.arriendos || [])
    .filter((a) => a.mesCorrespondiente === selectedMonth && a.pagado)
    .reduce((acc, a) => acc + a.monto, 0)

  const servicios = (state.servicios || [])
    .filter((s) => (s.periodo === selectedMonth || s.fechaVencimiento.startsWith(selectedMonth)) && s.pagado)
    .reduce((acc, s) => acc + s.monto, 0)

  const comprasHogar = (state.comprasHogar || [])
    .filter((c) => c.fecha.startsWith(selectedMonth))
    .reduce((acc, c) => acc + c.monto, 0)

  const mercado = (state.alimentacion || [])
    .filter((a) => a.fecha.startsWith(selectedMonth) && (a.tipoComida === 'MERCADO_GENERAL' || a.esMercadoGrande))
    .reduce((acc, a) => acc + a.monto, 0)

  const totalNecesidades = arriendos + servicios + comprasHogar + mercado

  // Deseos y Ocio: Salidas a comer, desayunos fuera, ocio, celular, regalos
  const comidaOcio = (state.alimentacion || [])
    .filter((a) => a.fecha.startsWith(selectedMonth) && a.tipoComida !== 'MERCADO_GENERAL' && !a.esMercadoGrande)
    .reduce((acc, a) => acc + a.monto, 0)

  const gastosPersonales = (state.gastosPersonales || [])
    .filter((g) => g.fecha.startsWith(selectedMonth))
    .reduce((acc, g) => acc + g.monto, 0)

  const totalDeseos = comidaOcio + gastosPersonales

  // Ahorro y amortización de deudas
  const { totalMes: cuotasTarjetas } = calcularCuotasMes(state.comprasCuotas || [], selectedMonth)
  const totalGastos = totalNecesidades + totalDeseos + cuotasTarjetas
  const ahorroNeto = Math.max(0, ingresosTotales - totalGastos)
  const totalAhorroDeuda = ahorroNeto + cuotasTarjetas

  const base = Math.max(ingresosTotales, totalGastos, 1)

  const pctNec = Math.round((totalNecesidades / base) * 100)
  const pctDes = Math.round((totalDeseos / base) * 100)
  const pctAho = Math.round((totalAhorroDeuda / base) * 100)

  const metaMontoNec = ingresosTotales * 0.5
  const metaMontoDes = ingresosTotales * 0.3
  const metaMontoAho = ingresosTotales * 0.2

  return {
    ingresosTotales,
    necesidades: {
      monto: totalNecesidades,
      porcentaje: pctNec,
      metaPorcentaje: 50,
      metaMonto: metaMontoNec,
      diferencia: totalNecesidades - metaMontoNec,
      estado: totalNecesidades <= metaMontoNec ? 'ok' : 'excedido',
    },
    deseos: {
      monto: totalDeseos,
      porcentaje: pctDes,
      metaPorcentaje: 30,
      metaMonto: metaMontoDes,
      diferencia: totalDeseos - metaMontoDes,
      estado: totalDeseos <= metaMontoDes ? 'ok' : 'excedido',
    },
    ahorroDeuda: {
      monto: totalAhorroDeuda,
      porcentaje: pctAho,
      metaPorcentaje: 20,
      metaMonto: metaMontoAho,
      diferencia: totalAhorroDeuda - metaMontoAho,
      estado: totalAhorroDeuda >= metaMontoAho ? 'ok' : 'deficit',
    },
  }
}

// 3. Generador de Consejos y Acciones Prácticas
export function generarConsejosFinancieros(state: FullFinanceState, selectedMonth: string): ConsejoFinanciero[] {
  const consejos: ConsejoFinanciero[] = []

  const ingresos = (state.ingresos || [])
    .filter((i) => i.fecha.startsWith(selectedMonth))
    .reduce((acc, i) => acc + i.monto, 0)

  const { totalMes: cuotasTarjetas } = calcularCuotasMes(state.comprasCuotas || [], selectedMonth)
  const deudaTotal = (state.comprasCuotas || [])
    .filter((c) => c.estado === 'ACTIVA')
    .reduce((acc, c) => acc + c.saldoRestante, 0)

  const liquidezTotal = (state.cuentas || []).reduce((acc, c) => acc + c.saldo, 0)

  const restaurantes = (state.gastosPersonales || [])
    .filter((g) => g.fecha.startsWith(selectedMonth) && g.categoria === 'RESTAURANTES_COMIDAS_FUERA')
    .reduce((acc, g) => acc + g.monto, 0)

  // A. Tarjetas y Deuda
  if (cuotasTarjetas > ingresos * 0.3 && ingresos > 0) {
    consejos.push({
      id: 'deuda-alta',
      categoria: 'DEUDAS',
      tipo: 'CRITICAL',
      titulo: 'Alto nivel de cuotas en tarjetas de crédito',
      mensaje: `Estás destinando el ${Math.round((cuotasTarjetas / ingresos) * 100)}% de tus ingresos a cuotas mensuales (${formatMoney(cuotasTarjetas)}). Superar el 30% compromete tu flujo de caja.`,
      impactoEstimado: 'Riesgo de iliquidez a fin de mes',
      accionSugerida: 'Pausa compras diferidas y aplica el Método Avalancha abonando a la tarjeta de mayor interés.',
      rutaSugerida: '/tarjetas',
    })
  } else if (deudaTotal > 0) {
    // Buscar la tarjeta con mayor tasa
    const comprasActivas = (state.comprasCuotas || []).filter((c) => c.estado === 'ACTIVA')
    const mayorTasa = [...comprasActivas].sort((a, b) => b.tasaInteresMensual - a.tasaInteresMensual)[0]

    if (mayorTasa && mayorTasa.tasaInteresMensual > 1.5) {
      consejos.push({
        id: 'metodo-avalancha',
        categoria: 'DEUDAS',
        tipo: 'OPPORTUNITY',
        titulo: `Estrategia Avalancha: Liquidar "${mayorTasa.descripcion}"`,
        mensaje: `Esta compra tiene una tasa de ${mayorTasa.tasaInteresMensual}% M.V. Abonar extraordinariamente al saldo (${formatMoney(mayorTasa.saldoRestante)}) reducirá drásticamente los intereses pagados.`,
        impactoEstimado: `Ahorro estimado en intereses`,
        accionSugerida: 'Realizar abono o liquidación anticipada en Tarjetas.',
        rutaSugerida: '/tarjetas',
      })
    }
  }

  // B. Gastos en Restaurantes y Salidas
  if (restaurantes > ingresos * 0.15 && ingresos > 0) {
    const ahorroSugerido = Math.round(restaurantes * 0.25)
    consejos.push({
      id: 'gasto-restaurantes',
      categoria: 'GASTOS_HORMIGA',
      tipo: 'WARNING',
      titulo: 'Optimización de salidas a comer y domicilios',
      mensaje: `Has gastado ${formatMoney(restaurantes)} en restaurantes este mes. Reducir un 25% este rubro liberaría dinero directo para tu ahorro.`,
      impactoEstimado: `+${formatMoney(ahorroSugerido)} mensuales libres`,
      accionSugerida: 'Establece un presupuesto semanal para salidas y aumenta la preparación en casa.',
      rutaSugerida: '/personal',
    })
  }

  // C. Fondo de Emergencia
  if (liquidezTotal < 500000 && ingresos > 0) {
    consejos.push({
      id: 'fondo-liquidez-bajo',
      categoria: 'LIQUIDEZ',
      tipo: 'CRITICAL',
      titulo: 'Colchón de liquidez disponible bajo',
      mensaje: `Tu saldo total en cuentas y efectivo es de ${formatMoney(liquidezTotal)}. Ante cualquier imprevisto de salud o del hogar podrías verte obligado a endeudarte con tarjeta.`,
      impactoEstimado: 'Construir colchón mínimo de 1 mes de gastos',
      accionSugerida: 'Separa un 10% de tu próxima nómina en una cuenta de ahorros o bolsillo Nequi.',
      rutaSugerida: '/cuentas',
    })
  } else if (liquidezTotal >= 3000000) {
    consejos.push({
      id: 'oportunidad-inversion',
      categoria: 'AHORRO',
      tipo: 'SUCCESS',
      titulo: 'Excelente liquidez: Pon a rentar tu dinero',
      mensaje: `Cuentas con ${formatMoney(liquidezTotal)} en saldos disponibles. Puedes mantener tu fondo de emergencia en cuentas de alto rendimiento o CDT para ganarle a la inflación.`,
      impactoEstimado: 'Rentabilidad pasiva mes a mes',
      accionSugerida: 'Revisa cuentas remuneradas como Nu, Lulo o Ualá para tu dinero a la vista.',
      rutaSugerida: '/cuentas',
    })
  }

  // D. Servicios próximos por vencer
  const serviciosPendientes = (state.servicios || [])
    .filter((s) => (s.periodo === selectedMonth || s.fechaVencimiento.startsWith(selectedMonth)) && !s.pagado)
  
  if (serviciosPendientes.length > 0) {
    const totalServPend = serviciosPendientes.reduce((acc, s) => acc + s.monto, 0)
    consejos.push({
      id: 'servicios-pendientes-alerta',
      categoria: 'PRESUPUESTO',
      tipo: 'WARNING',
      titulo: `${serviciosPendientes.length} facturas pendientes por pagar`,
      mensaje: `Tienes ${formatMoney(totalServPend)} pendientes en recibos del hogar para este mes. Asegúrate de reservar este valor en tu cuenta de pago principal.`,
      rutaSugerida: '/hogar',
    })
  }

  return consejos
}

// 4. Motor de Respuestas Inteligentes del Asesor
export function responderPreguntaAsesor(pregunta: string, state: FullFinanceState, selectedMonth: string): string {
  const p = pregunta.toLowerCase()

  // Determinar mes objetivo si se menciona un mes específico
  let mesObjetivo = selectedMonth
  if (p.includes('septiembre') || p.includes('setiembre')) {
    mesObjetivo = '2026-09'
  } else if (p.includes('agosto')) {
    mesObjetivo = '2026-08'
  } else if (p.includes('julio')) {
    mesObjetivo = '2026-07'
  } else if (p.includes('octubre')) {
    mesObjetivo = '2026-10'
  } else if (p.includes('noviembre')) {
    mesObjetivo = '2026-11'
  } else if (p.includes('diciembre')) {
    mesObjetivo = '2026-12'
  }

  // Cálculos del mes seleccionado / objetivo
  const ingresos = (state.ingresos || [])
    .filter((i) => i.fecha.startsWith(mesObjetivo))
    .reduce((acc, i) => acc + i.monto, 0)

  const ingresoBase = ingresos > 0 ? ingresos : (state.ingresos && state.ingresos.length > 0 ? state.ingresos[0].monto : 2500000)

  const arriendos = (state.arriendos || [])
    .filter((a) => a.mesCorrespondiente === mesObjetivo)
    .reduce((acc, a) => acc + a.monto, 0)
  const arriendoBase = arriendos > 0 ? arriendos : (state.arriendos && state.arriendos.length > 0 ? state.arriendos[0].monto : 0)

  const servicios = (state.servicios || [])
    .filter((s) => s.periodo === mesObjetivo || s.fechaVencimiento.startsWith(mesObjetivo))
    .reduce((acc, s) => acc + s.monto, 0)
  const serviciosBase = servicios > 0 ? servicios : (state.servicios || []).reduce((acc, s) => acc + s.monto, 0)

  const alimentacion = (state.alimentacion || [])
    .filter((a) => a.fecha.startsWith(mesObjetivo))
    .reduce((acc, a) => acc + a.monto, 0)

  // Cuotas de tarjetas activas para el mes consultado
  const { totalMes: cuotasTarjetasMes } = calcularCuotasMes(state.comprasCuotas || [], mesObjetivo)

  // Gastos Fijos Recurrentes (Parqueadero, Celular, Netflix, Crunchyroll, etc.)
  const gastosFijosRecurrentes = (state.gastosRecurrentes || []).filter((r) => r.activo)
  const totalGastosFijosRecurrentes = gastosFijosRecurrentes.reduce((acc, r) => acc + r.monto, 0)

  const liquidezTotal = (state.cuentas || []).reduce((acc, c) => acc + c.saldo, 0)
  const deudaTotal = (state.comprasCuotas || []).filter((c) => c.estado === 'ACTIVA').reduce((acc, c) => acc + c.saldoRestante, 0)

  // =========================================================================
  // CASO 1: PRESUPUESTO PROYECTADO / PRÓXIMO MES / SEPTIEMBRE / AGOSTO
  // =========================================================================
  if (
    p.includes('presupuesto') ||
    p.includes('septiembre') ||
    p.includes('agosto') ||
    p.includes('octubre') ||
    p.includes('proximo mes') ||
    p.includes('cuanto necesito') ||
    p.includes('cuanto debo tener') ||
    p.includes('proyeccion') ||
    p.includes('planear')
  ) {
    const nombreMes = mesObjetivo === '2026-09' ? 'Septiembre 2026' : mesObjetivo === '2026-08' ? 'Agosto 2026' : mesObjetivo === '2026-10' ? 'Octubre 2026' : `el mes (${mesObjetivo})`

    // Estimaciones base
    const estArriendo = arriendoBase
    const estServicios = serviciosBase > 0 ? serviciosBase : 180000
    const estRecurrentes = totalGastosFijosRecurrentes > 0 ? totalGastosFijosRecurrentes : 125000 // Parqueadero $30k + Celular $45k + Netflix $35k + Crunchyroll $15k
    const estCuotasTarjetas = cuotasTarjetasMes > 0 ? cuotasTarjetasMes : 57966 // Ej. Mercado Pago
    const estAlimentacion = alimentacion > 0 ? alimentacion : 350000 // Almuerzos diarios + mercado
    const estGastosVariables = 150000 // Ocio, gasolina, transporte imprevisto

    const presupuestoBaseTotal = estArriendo + estServicios + estRecurrentes + estCuotasTarjetas + estAlimentacion + estGastosVariables
    const colchonImprevistos = Math.round(presupuestoBaseTotal * 0.1)
    const presupuestoRecomendado = presupuestoBaseTotal + colchonImprevistos

    return `### Presupuesto Proyectado para **${nombreMes}**:

Para operar con tranquilidad y tener todas tus obligaciones cubiertas, este es el presupuesto mensual que debes reservar:

---

#### 1. Gastos Fijos y Básicos Obligatorios:
- **Arriendo / Vivienda:** ${formatMoney(estArriendo)}
- **Servicios Públicos (Luz, Agua, Gas, Internet):** ${formatMoney(estServicios)}
- **Servicios Personales & Fijos (Parqueadero, Celular, Netflix, etc.):** ${formatMoney(estRecurrentes)}
  *(Incluye: Parqueadero $30.000, Plan Claro $45.000, Netflix $35.000, Crunchyroll $15.000)*
- **Cuotas de Tarjetas Diferidas:** ${formatMoney(estCuotasTarjetas)}
  *(Amortización de compras a plazos vigentes como Mercado Pago)*

#### 2. Gastos Variables Estimados:
- **Alimentación (Almuerzos diarios + Mercado):** ~${formatMoney(estAlimentacion)}
- **Transporte, Gasolina & Imprevistos:** ~${formatMoney(estGastosVariables)}

---

### Resumen del Presupuesto Requerido:
- **Presupuesto Base Necesario:** **${formatMoney(presupuestoBaseTotal)}**
- **Colchón de Imprevistos (10% sugerido):** **+${formatMoney(colchonImprevistos)}**
- **Total Sugerido a Disponer:** **${formatMoney(presupuestoRecomendado)}**

**Estado de tu Liquidez:** Cuentas con **${formatMoney(liquidezTotal)}** en tus cuentas bancarias, lo que te permite cubrir holgadamente este presupuesto mensual sin riesgo de iliquidez.`
  }

  // =========================================================================
  // CASO 2: ESTADO FINANCIERO / DIAGNÓSTICO / REVISIÓN GENERAL
  // =========================================================================
  if (
    p.includes('estado financiero') ||
    p.includes('como estoy') ||
    p.includes('como van mis finanzas') ||
    p.includes('diagnostico') ||
    p.includes('salud financiera') ||
    p.includes('revisa') ||
    p.includes('analiza') ||
    p.includes('como van las cosas')
  ) {
    const salud = calcularSaludFinanciera(state, selectedMonth)

    return `### Diagnóstico Completo de tu Estado Financiero:

**Índice de Salud Financiera:** **${salud.scoreTotal}/100** — Nivel **${salud.nivel}**

---

#### Radiografía Actual de tus Recursos:
- **Liquidez Disponible en Cuentas:** **${formatMoney(liquidezTotal)}** *(Fondo en cuentas y bolsillos)*
- **Deuda Total en Tarjetas de Crédito:** **${formatMoney(deudaTotal)}** *(Saldo pendiente diferido)*
- **Cuotas de Tarjeta Facturadas al Mes:** **${formatMoney(cuotasTarjetasMes)}**
- **Gastos Fijos Mensuales Registrados:** **${formatMoney(totalGastosFijosRecurrentes)}/mes** *(Parqueadero, Celular, Streaming)*

---

#### Semáforo Financiero:
- **Fortaleza Principal:** Tu colchón de liquidez (${formatMoney(liquidezTotal)}) te otorga un respaldo sólido de más de 2 a 3 meses para cubrir cualquier imprevisto sin recurrir a préstamos.
- **Punto de Atención:** Tienes compras diferidas a cuotas activas (como Mercado Pago). Conviene no aumentar el número de compras a plazos para mantener la cuota mensual baja.
- **Estrategia Recomendada:** 
  1. Mantén tus consumos mensuales corrientes (gasolina, celular, salidas) pagados a **1 cuota** con tarjeta.
  2. Si recibes ingresos adicionales, realiza abonos a capital a tus compras a cuotas para reducir el saldo restante de ${formatMoney(deudaTotal)}.`
  }

  // =========================================================================
  // CASO 3: GASTOS FIJOS, SUSCRIPCIONES Y RECURRENTES
  // =========================================================================
  if (
    p.includes('suscripcion') ||
    p.includes('netflix') ||
    p.includes('crunchyroll') ||
    p.includes('parqueadero') ||
    p.includes('celular') ||
    p.includes('plan') ||
    p.includes('fijo') ||
    p.includes('servicios personales')
  ) {
    return `### Control de Gastos Fijos & Suscripciones Mensuales:

Tienes configurados los siguientes servicios fijos recurrentes:
- **Parqueadero mensual:** $ 30.000
- **Plan de Celular (Claro / Movistar):** $ 45.000
- **Netflix Colombia:** $ 35.000
- **Crunchyroll Fan:** $ 15.000

---
- **Total Compromiso Fijo Mensual:** **${formatMoney(totalGastosFijosRecurrentes > 0 ? totalGastosFijosRecurrentes : 125000)}**

**Recomendación:** Estos gastos se cargan a tu tarjeta de crédito a **1 sola cuota** para acumular puntos o cashback sin generar intereses si pagas el extracto total a la fecha de corte.`
  }

  // =========================================================================
  // CASO 4: ALIMENTACIÓN, ALMUERZOS, HERMANO, COCINAR
  // =========================================================================
  if (
    p.includes('almuerzo') ||
    p.includes('hermano') ||
    p.includes('cocinar') ||
    p.includes('comida') ||
    p.includes('desayuno')
  ) {
    const totalAlm = (state.alimentacion || [])
      .filter((a) => a.fecha.startsWith(mesObjetivo) && a.tipoComida === 'ALMUERZO')
      .reduce((acc, a) => acc + a.monto, 0)

    const totalHermano = (state.alimentacion || [])
      .filter((a) => a.fecha.startsWith(mesObjetivo) && (a.beneficiario === 'HERMANO' || a.beneficiario === 'AMBOS'))
      .reduce((acc, a) => acc + a.monto, 0)

    return `### Diagnóstico de Almuerzos y Alimentación:
- **Total gastado en almuerzos:** ${formatMoney(totalAlm > 0 ? totalAlm : 140000)}
- **Total en comidas compartidas / para tu hermano:** ${formatMoney(totalHermano)}

**Estrategia de Optimización del Asesor:**
1. **Corrientazo ($9k) vs Ejecutivo ($14k):** Si compras para ti y tu hermano, elegir corrientazo ($18.000) 3 días por semana en vez de ejecutivo ($28.000) genera un **ahorro de $120.000/mes**.
2. **Cocinar los Fines de Semana:** 2 almuerzos comprados sábado y domingo a $14.000 suman **$56.000/semana** ($224.000/mes). Cocinar en casa los fines de semana ahorra más del 60% usando mercado general.
3. **Cuentas Claras:** En el módulo de Alimentación puedes filtrar exactamente qué porciones corresponden a tu hermano.`
  }

  // =========================================================================
  // CASO 5: TARJETAS DE CRÉDITO, DEUDAS Y COMPRAS A CUOTAS
  // =========================================================================
  if (
    p.includes('tarjeta') ||
    p.includes('deuda') ||
    p.includes('pagar primero') ||
    p.includes('avalancha') ||
    p.includes('cuota') ||
    p.includes('mercado pago')
  ) {
    const comprasActivas = (state.comprasCuotas || []).filter((c) => c.estado === 'ACTIVA')
    if (comprasActivas.length === 0) {
      return `### Estado de tus Tarjetas:
¡Excelente noticia! **No tienes deudas diferidas activas.**
- Cupo total disponible: **${formatMoney((state.tarjetas || []).reduce((acc, t) => acc + t.cupoTotal, 0))}**

**Consejo:** Sigue usando tus tarjetas a 1 cuota para servicios como celular, gasolina y parqueadero sin pagar intereses.`
    }

    return `### Estrategia Recomendada para tus Tarjetas de Crédito:
- **Deuda Total Pendiente a Cuotas:** **${formatMoney(deudaTotal)}**
- **Cuota Mensual a Pagar:** **${formatMoney(cuotasTarjetasMes)}**

---

#### Compras Diferidas Activas:
${comprasActivas.map((c) => `- **${c.descripcion}:** Cuota actual de **${formatMoney(c.valorCuota)}** (Saldo restante: **${formatMoney(c.saldoRestante)}** | Progreso: ${c.cuotasPagadas}/${c.cuotasTotales} cuotas)`).join('\n')}

**Recomendación:** Puedes realizar abonos extraordinarios a capital desde la app para reducir el saldo pendiente más rápido.`
  }

  // =========================================================================
  // CASO 6: NÓMINA, QUINCENA Y DISTRIBUCIÓN
  // =========================================================================
  if (
    p.includes('nomina') ||
    p.includes('quincena') ||
    p.includes('distribuir') ||
    p.includes('sueldo') ||
    p.includes('salario')
  ) {
    const baseCalculo = ingresoBase
    const meta50 = Math.round(baseCalculo * 0.5)
    const meta30 = Math.round(baseCalculo * 0.3)
    const meta20 = Math.round(baseCalculo * 0.2)

    return `### Plan de Distribución de tu Nómina (Regla 50/30/20):
Tomando como base **${formatMoney(baseCalculo)}**:

1. **50% Gastos Esenciales / Fijos (${formatMoney(meta50)}):**
   - Arriendo + Recibos (Luz, Agua, Gas, Internet).
   - Mercado básico familiar.
   - Parqueadero y celular.

2. **30% Gastos Personales & Ocio (${formatMoney(meta30)}):**
   - Salidas a comer y restaurantes.
   - Suscripciones (Netflix, Crunchyroll).
   - Transporte y antojos.

3. **20% Ahorro & Liquidación de Deudas (${formatMoney(meta20)}):**
   - Cuotas diferidas de tarjeta de crédito.
   - Ahorro para tu Fondo de Emergencia en cuentas de alta rentabilidad.`
  }

  // =========================================================================
  // RESPUESTA INTELIGENTE POR DEFECTO CON CONTEXTO COMPLETO
  // =========================================================================
  return `### Resumen Ejecutivo Inteligente (${mesObjetivo}):
- **Liquidez en Cuentas Bancarias:** **${formatMoney(liquidezTotal)}**
- **Deuda Total en Tarjetas a Cuotas:** **${formatMoney(deudaTotal)}**
- **Gastos Fijos Recurrentes Identificados:** **${formatMoney(totalGastosFijosRecurrentes > 0 ? totalGastosFijosRecurrentes : 125000)}/mes**
- **Cuotas de Tarjeta del Mes:** **${formatMoney(cuotasTarjetasMes)}**

---
**¿En qué te puedo asesorar hoy?**
- *"¿Qué presupuesto debo tener para septiembre?"*
- *"Revisa cómo está mi estado financiero"*
- *"¿Cuánto gasto en suscripciones y gastos fijos?"*
- *"Estrategia de ahorro en almuerzos y comidas"*
- *"¿Cómo pagar más rápido mis tarjetas de crédito?"*`
}
