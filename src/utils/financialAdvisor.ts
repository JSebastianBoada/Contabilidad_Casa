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
      impactoEstimado: 'Evita cortes y recargos por mora',
      accionSugerida: 'Revisar fechas de vencimiento en el módulo de Hogar.',
      rutaSugerida: '/hogar',
    })
  }

  return consejos
}

// 4. Motor de Respuestas Inteligentes del Asesor
export function responderPreguntaAsesor(pregunta: string, state: FullFinanceState, selectedMonth: string): string {
  const p = pregunta.toLowerCase()

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
  const deudaTotal = (state.comprasCuotas || []).filter((c) => c.estado === 'ACTIVA').reduce((acc, c) => acc + c.saldoRestante, 0)

  // Pregunta: Fin de semana / Ocio / Salir
  if (p.includes('fin de semana') || p.includes('puedo gastar') || p.includes('cuanto gastar') || p.includes('salir')) {
    const margenDisponible = Math.max(0, balanceNeto)
    const saldoOcioRecomendado = Math.round(margenDisponible / 4) // dividido en 4 semanas

    return `### 🍹 Presupuesto Recomendado para el Fin de Semana:
- **Balance neto libre del mes:** ${formatMoney(margenDisponible)}
- **Límite sugerido para este fin de semana:** **${formatMoney(saldoOcioRecomendado)}**
- **Liquidez total en cuentas:** ${formatMoney(liquidezTotal)}

💡 **Consejo del Asesor:** Si mantienes tus salidas en este rango (${formatMoney(saldoOcioRecomendado)}), no comprometerás el pago de tus recibos ni tus cuotas de tarjetas a final de mes.`
  }

  // Pregunta: Tarjetas / Deudas / Pagar primero
  if (p.includes('tarjeta') || p.includes('deuda') || p.includes('pagar primero') || p.includes('avalancha')) {
    const comprasActivas = (state.comprasCuotas || []).filter((c) => c.estado === 'ACTIVA')
    if (comprasActivas.length === 0) {
      return `### 💳 Estado de tus Tarjetas:
¡Excelente noticia! **No tienes deudas activas en tarjetas de crédito.**
- Cupo total disponible: **${formatMoney((state.tarjetas || []).reduce((acc, t) => acc + t.cupoTotal, 0))}**

💡 **Consejo:** Mantén tus compras a 1 cuota para no pagar intereses y acumular beneficios bancarios.`
    }

    const ordenadaPorTasa = [...comprasActivas].sort((a, b) => b.tasaInteresMensual - a.tasaInteresMensual)
    const masCostosa = ordenadaPorTasa[0]

    return `### 💳 Estrategia Recomendada para tus Tarjetas:
- **Deuda Total Pendiente:** ${formatMoney(deudaTotal)}
- **Cuotas a Pagar este Mes:** ${formatMoney(cuotasTarjetas)}

🎯 **Tarjeta / Compra prioritaria a liquidar (Método Avalancha):**
👉 **"${masCostosa.descripcion}"** (Tasa: **${masCostosa.tasaInteresMensual}% M.V.** | Saldo restante: **${formatMoney(masCostosa.saldoRestante)}**).

💡 **Razón:** Es la compra que más intereses te está cobrando mensualmente. Abonar cualquier ingreso extra a esta compra te ahorrará más dinero que pagar las de menor tasa.`
  }

  // Pregunta: Nómina / Quincena / Distribuir
  if (p.includes('nomina') || p.includes('quincena') || p.includes('distribuir') || p.includes('sueldo') || p.includes('salario')) {
    const meta50 = ingresos * 0.5
    const meta30 = ingresos * 0.3
    const meta20 = ingresos * 0.2

    return `### 💼 Plan de Distribución de tu Nómina (Regla 50/30/20):
Sobre tus ingresos registrados de **${formatMoney(ingresos)}**:

1. **🏠 50% Gastos Esenciales / Fijos (${formatMoney(meta50)}):**
   - Arriendo + Administración.
   - Recibos (Luz, Agua, Gas, Internet).
   - Mercado básico familiar.

2. **🎉 30% Gastos Personales & Ocio (${formatMoney(meta30)}):**
   - Salidas a comer, restaurantes y antojos.
   - Plan de celular y suscripciones.
   - Partidos, eventos y regalos.

3. **💰 20% Ahorro & Liquidación de Deudas (${formatMoney(meta20)}):**
   - Pago de cuotas de tarjetas de crédito.
   - Ahorro para tu Fondo de Emergencia.`
  }

  // Pregunta: Ahorro / Inversión
  if (p.includes('ahorrar') || p.includes('ahorro') || p.includes('invertir') || p.includes('fondo de emergencia')) {
    const meses = totalGastosMes > 0 ? (liquidezTotal / totalGastosMes).toFixed(1) : '3+'
    return `### 📈 Diagnóstico de Ahorro & Liquidez:
- **Liquidez total acumulada:** ${formatMoney(liquidezTotal)}
- **Tus gastos promedio mensuales:** ${formatMoney(totalGastosMes)}
- **Cobertura actual de Fondo de Emergencia:** **${meses} meses**

💡 **Recomendación:**
- Si tienes menos de 3 meses de gastos ahorrados, tu prioridad debe ser alcanzar mínimo **${formatMoney(totalGastosMes * 3)}** en una cuenta con alta rentabilidad a la vista (ej. bolsillos con tasa del 10%-12% E.A.).`
  }

  // Respuesta general con diagnóstico del mes
  return `### 📊 Resumen Ejecutivo de tus Finanzas (${selectedMonth}):
- **Ingresos Totales:** ${formatMoney(ingresos)}
- **Gastos Totales:** ${formatMoney(totalGastosMes)}
- **Balance Neto Disponible:** ${formatMoney(balanceNeto)} (Margen: ${ingresos > 0 ? Math.round((balanceNeto / ingresos) * 100) : 0}%)
- **Liquidez en Cuentas:** ${formatMoney(liquidezTotal)}
- **Deuda en Tarjetas:** ${formatMoney(deudaTotal)}

¿En qué tema específico te gustaría profundizar? Puedes preguntarme sobre tu **presupuesto de fin de semana**, **estrategia para pagar tarjetas**, o **distribución de tu próxima quincena**.`
}
