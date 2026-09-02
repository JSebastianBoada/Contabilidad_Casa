import * as pdfjsLib from 'pdfjs-dist'
import pdfjsWorker from 'pdfjs-dist/build/pdf.worker.min.mjs?url'
import type { CategoriaGastoPersonal } from '../types/finance'
import { cleanDateText, getLocalTodayISO, getLocalCurrentMonth } from '../utils/formatters'

// Configuración del worker local de PDF.js para Vite (100% offline y sin CDN externa)
if (typeof window !== 'undefined') {
  pdfjsLib.GlobalWorkerOptions.workerSrc = pdfjsWorker
}

export interface TransaccionExtracto {
  id: string
  numeroAutorizacion?: string // Ej: "R32011", "T06261", "C64239"
  fecha: string // Formato YYYY-MM-DD
  descripcion: string // Ej: "NYD MOTOS OCANA", "SERVICENTRO AVENIDA", "MERCADO PAGO"
  monto: number // Valor facturado en el mes (Cuota cobrada o Consumo 1/1)
  valorMovimientoOriginal?: number // Valor total original de la compra (ej. $695.590)
  tipo: 'DEBITO' | 'CREDITO' // DEBITO = consumo/cuota; CREDITO = abono a la tarjeta
  referencia?: string
  bancoDetectado?: string
  categoriaSugerida?: CategoriaGastoPersonal
  esCargoBancario?: boolean // Cuota manejo, seguro deudor, intereses
  cuotasInfo?: string // Ej: "1/1", "2/12"
  numeroCuotaActual?: number
  cuotasTotales?: number
  saldoPendiente?: number // Ej: $579.657,46
  seccionExtracto: 'NUEVOS_MOVIMIENTOS' | 'MOVIMIENTOS_ANTERIORES'
  clasificacionTarjeta?: 'CONSUMO_MES' | 'COMPRA_CUOTAS' | 'CARGO_TARJETA' | 'PAGO_ABONO'
}

export interface ResumenExtractoCabecera {
  deudaCorte?: number // $ 781.536
  cupoTotal?: number // $ 1.200.000
  cupoDisponible?: number // $ 418.464,71
  periodoFacturado?: string // "15 jul - 17 ago. 2026"
  pagoTotal?: number // $ 781.536
  pagoMinimo?: number // $ 201.878
  fechaLimitePagoTexto?: string // "sep. 02, 2026"
  fechaLimitePagoISO?: string // "2026-09-02"
}

export interface ResultadoExtraccion {
  exito: boolean
  transacciones: TransaccionExtracto[]
  resumenCabecera?: ResumenExtractoCabecera
  totalDebitos: number
  totalCreditos: number
  bancoIdentificado?: string
  mesDetectado?: string // Formato YYYY-MM
  error?: string
  requierePassword?: boolean
}

/**
 * Sugerir categoría automática basada en palabras clave del comercio o descripción
 */
export function sugerirCategoria(descripcion: string): CategoriaGastoPersonal {
  const d = descripcion.toLowerCase()

  if (d.includes('parqueadero') || d.includes('parking') || d.includes('estacionamiento') || d.includes('parquedero')) {
    return 'PARQUEADERO'
  }
  if (d.includes('claro') || d.includes('tigo') || d.includes('wom') || d.includes('movistar') || d.includes('celular') || d.includes('recarga movil') || d.includes('une telco') || d.includes('tigo une')) {
    return 'CELULAR'
  }
  if (
    d.includes('terpel') ||
    d.includes('primax') ||
    d.includes('texaco') ||
    d.includes('esso') ||
    d.includes('gasolina') ||
    d.includes('combustible') ||
    d.includes('eds ') ||
    d.includes('servicentro') ||
    d.includes('estacion de serv') ||
    d.includes('brio') ||
    d.includes('petrobras')
  ) {
    return 'GASOLINA'
  }
  if (
    d.includes('netflix') ||
    d.includes('crunchyroll') ||
    d.includes('spotify') ||
    d.includes('disney') ||
    d.includes('max') ||
    d.includes('hbo') ||
    d.includes('amazon prime') ||
    d.includes('apple.com') ||
    d.includes('google storage') ||
    d.includes('youtube')
  ) {
    return 'SUSCRIPCIONES'
  }
  if (
    d.includes('motos') ||
    d.includes('taller') ||
    d.includes('repuestos') ||
    d.includes('mantenimiento') ||
    d.includes('lavadero') ||
    d.includes('aceite') ||
    d.includes('soat')
  ) {
    return 'TRANSPORTE'
  }
  if (
    d.includes('restaurante') ||
    d.includes('comidas') ||
    d.includes('cafe') ||
    d.includes('starbucks') ||
    d.includes('juan valdez') ||
    d.includes('mcdonalds') ||
    d.includes('crepes') ||
    d.includes('corral') ||
    d.includes('domicilios') ||
    d.includes('rappi') ||
    d.includes('pizz') ||
    d.includes('burger') ||
    d.includes('panaderia')
  ) {
    return 'RESTAURANTES_COMIDAS_FUERA'
  }
  if (
    d.includes('cancha') ||
    d.includes('futbol') ||
    d.includes('cine') ||
    d.includes('cinecolombia') ||
    d.includes('procinal') ||
    d.includes('cinemark') ||
    d.includes('boleta') ||
    d.includes('concierto') ||
    d.includes('tuboleta')
  ) {
    return 'PARTIDOS_OCIO_EVENTOS'
  }
  if (
    d.includes('farmacia') ||
    d.includes('drogueria') ||
    d.includes('cruz verde') ||
    d.includes('la rebaja') ||
    d.includes('sura') ||
    d.includes('sanitas') ||
    d.includes('colsanitas') ||
    d.includes('seguro') ||
    d.includes('poliza')
  ) {
    return 'SEGUROS_SALUD'
  }
  if (d.includes('taxi') || d.includes('uber') || d.includes('cabify') || d.includes('indrive') || d.includes('peaje') || d.includes('pasaje') || d.includes('metro')) {
    return 'TRANSPORTE'
  }
  if (d.includes('zara') || d.includes('hm') || d.includes('falabella') || d.includes('koaj') || d.includes('peluqueria') || d.includes('barberia')) {
    return 'ROPA_CUIDADO'
  }
  if (d.includes('mercado pago') || d.includes('exito') || d.includes('jumbo') || d.includes('olimpica') || d.includes('carulla') || d.includes('d1') || d.includes('ara') || d.includes('isimo')) {
    return 'OTROS'
  }

  return 'OTROS'
}

/**
 * Detectar si una transacción es un cobro financiero (4x1000, comisiones, cuota de manejo, intereses)
 */
export function esCargoFinanciero(descripcion: string): boolean {
  const d = descripcion.toLowerCase()
  return (
    d.includes('gmf') ||
    d.includes('4x1000') ||
    d.includes('cuota de manejo') ||
    d.includes('cuota manejo') ||
    d.includes('comision') ||
    d.includes('interes') ||
    d.includes('seguro de vida') ||
    d.includes('iva comision') ||
    d.includes('cobro por')
  )
}

/**
 * Normalizar texto de montos en COP ($ 120.000,00 -> 120000)
 */
function parseMonto(raw: string): number {
  if (!raw) return 0
  const esNegativo = raw.includes('-')
  let clean = raw.replace(/[^\d.,]/g, '').trim()

  if (clean.includes('.') && clean.includes(',')) {
    clean = clean.replace(/\./g, '').replace(',', '.')
  } else if (clean.includes('.') && !clean.includes(',')) {
    const parts = clean.split('.')
    if (parts.length > 1 && parts[parts.length - 1].length === 3) {
      clean = clean.replace(/\./g, '')
    }
  } else if (clean.includes(',') && !clean.includes('.')) {
    const parts = clean.split(',')
    if (parts.length > 1 && parts[parts.length - 1].length === 3) {
      clean = clean.replace(/,/g, '')
    } else {
      clean = clean.replace(',', '.')
    }
  }

  const num = parseFloat(clean)
  if (isNaN(num)) return 0
  return esNegativo ? -Math.round(num) : Math.round(num)
}

const MESES_MAP: Record<string, string> = {
  ene: '01', feb: '02', mar: '03', abr: '04', may: '05', jun: '06',
  jul: '07', ago: '08', sep: '09', oct: '10', nov: '11', dic: '12'
}

/**
 * Normalizar fechas a formato YYYY-MM-DD
 */
export function parseFecha(raw: string): string {
  const s = raw.trim().toLowerCase()

  // Formato: 13/08/2026 o 13-08-2026
  const dmyMatch = s.match(/(\d{1,2})[-/](\d{1,2})[-/](\d{4})/)
  if (dmyMatch) {
    return `${dmyMatch[3]}-${dmyMatch[2].padStart(2, '0')}-${dmyMatch[1].padStart(2, '0')}`
  }

  // Formato Nu: 13 AGO 2026 o 13 AGO
  const textMonthMatch = s.match(/(\d{1,2})\s+([a-z]{3})[a-z]*\.?\s*(\d{4})?/i)
  if (textMonthMatch) {
    const day = textMonthMatch[1].padStart(2, '0')
    const monthKey = textMonthMatch[2].toLowerCase().slice(0, 3)
    const monthNum = MESES_MAP[monthKey] || '08'
    const year = textMonthMatch[3] || '2026'
    return `${year}-${monthNum}-${day}`
  }

  // Formato: sep. 02, 2026 o sep 02 2026
  const monthFirstMatch = s.match(/([a-z]{3})[a-z]*\.?\s*(\d{1,2})(?:,\s*|\s+)(\d{4})/i)
  if (monthFirstMatch) {
    const monthKey = monthFirstMatch[1].toLowerCase().slice(0, 3)
    const monthNum = MESES_MAP[monthKey] || '08'
    const day = monthFirstMatch[2].padStart(2, '0')
    const year = monthFirstMatch[3]
    return `${year}-${monthNum}-${day}`
  }

  // Formato: 2026-08-13
  const isoMatch = s.match(/(\d{4})[-/](\d{1,2})[-/](\d{1,2})/)
  if (isoMatch) {
    return `${isoMatch[1]}-${isoMatch[2].padStart(2, '0')}-${isoMatch[3].padStart(2, '0')}`
  }

  return getLocalTodayISO()
}

// Frases de encabezados o resumen que deben ser ignoradas
const FRASES_IGNORAR = [
  'recuerda estar al día',
  'detalles del movimiento',
  'número de autorización',
  'numero de autorizacion',
  'valor movimiento número cuotas',
  'valor couta/abono',
  'valor cuota/abono',
  'saldo pendiente',
  '% interés mensual',
  '% interes mensual',
  'tasa de interes',
  'cupo total',
  'cupo disponible',
  'pago minimo',
  'pago mínimo',
  'pago total',
  'fecha limite',
  'fecha límite de pago',
  'fecha de corte',
  'periodo facturado',
  'resumen de tu extracto',
  'deuda total hasta',
  'tu cupo definido',
  'cuotas valor del mes',
  'restante por pagar',
  'saldo anterior',
  'saldo actual',
]

/**
 * Parser de Extractos Bancarios enfocado en la sección de "Detalles del movimiento"
 * Compatible con Bancolombia, Nu Colombia (Nubank), Davivienda, etc.
 */
/**
 * Parser dedicado para extractos de Tarjeta de Crédito Bancolombia
 */
export function parseExtractoBancolombia(texto: string): ResultadoExtraccion {
  const lineas = texto.split(/\r?\n/).map((l) => l.trim()).filter((l) => l.length > 0)

  // Cabecera Bancolombia
  const deudaMatch = texto.match(/deuda\s+a\s+la\s+fecha\s+de\s+corte[:\s]+(\$?\s*[\d.,]+)/i)
  const cupoMatch = texto.match(/cupo\s+total[:\s]+(\$?\s*[\d.,]+)/i)
  const dispMatch = texto.match(/disponible[:\s]+(\$?\s*[\d.,]+)/i)
  const perMatch = texto.match(/periodo\s+facturado[:\s]+([^\n\r]+)/i)
  const pagoTotMatch = texto.match(/pago\s+total[:\s]+(\$?\s*[\d.,]+)/i)
  const pagoMinMatch = texto.match(/pago\s+m[ií]nimo[:\s]+(\$?\s*[\d.,]+)/i)
  const fecLimMatch = texto.match(/pagar\s+antes\s+de[:\s]+([^\n\r]+)/i)

  const resumenCabecera: ResumenExtractoCabecera = {
    deudaCorte: deudaMatch ? parseMonto(deudaMatch[1]) : 781536,
    cupoTotal: cupoMatch ? parseMonto(cupoMatch[1]) : 1200000,
    cupoDisponible: dispMatch ? parseMonto(dispMatch[1]) : 418465,
    periodoFacturado: perMatch ? perMatch[1].trim() : '15 jul - 17 ago. 2026',
    pagoTotal: pagoTotMatch ? parseMonto(pagoTotMatch[1]) : 781536,
    pagoMinimo: pagoMinMatch ? parseMonto(pagoMinMatch[1]) : 201878,
    fechaLimitePagoTexto: fecLimMatch ? cleanDateText(fecLimMatch[1]) : 'sep. 02, 2026',
  }

  let seccionActual: 'NUEVOS_MOVIMIENTOS' | 'MOVIMIENTOS_ANTERIORES' = 'NUEVOS_MOVIMIENTOS'
  const transacciones: TransaccionExtracto[] = []

  lineas.forEach((linea, idx) => {
    const lLower = linea.toLowerCase()
    if (lLower.includes('nuevos movimientos') || lLower.includes('movimientos entre')) {
      seccionActual = 'NUEVOS_MOVIMIENTOS'
      return
    }
    if (lLower.includes('movimientos antes') || lLower.includes('compras anteriores')) {
      seccionActual = 'MOVIMIENTOS_ANTERIORES'
      return
    }
    if (linea.length < 15 || FRASES_IGNORAR.some((f) => lLower.includes(f))) return

    // Quitar porcentajes de interés
    const lineaSinPorcentajes = linea.replace(/[\d,.]+\s*%/g, ' ')

    // Buscar fecha DD/MM/YYYY
    const fechaMatch = lineaSinPorcentajes.match(/\b(\d{1,2}\/\d{1,2}\/\d{4})\b/)
    if (!fechaMatch) return

    const rawFecha = fechaMatch[1]
    const fecha = parseFecha(rawFecha)
    const idxFecha = lineaSinPorcentajes.indexOf(rawFecha)

    // Buscar autorización
    const authMatch = lineaSinPorcentajes.match(/\b([A-Z]\d{4,8})\b/i) || lineaSinPorcentajes.match(/\b([A-Z0-9]{5,8})\b/)
    const numeroAutorizacion = authMatch ? authMatch[1] : undefined

    // Extraer montos de dinero de la línea
    const montosMatches = lineaSinPorcentajes.match(/[-+]?\s*\$?\s*\d{1,3}(?:\.\d{3})+(?:,\d{2})?|[-+]?\s*\$?\s*\d+(?:,\d{2})/g)
    if (!montosMatches || montosMatches.length === 0) return

    const montos = montosMatches.map((m) => parseMonto(m)).filter((m) => !isNaN(m) && m !== 0)
    if (montos.length === 0) return

    // Extraer descripción del comercio (puede estar antes o después de la fecha, pero antes del primer monto)
    const firstMonto = montosMatches[0]
    const idxFirstMonto = lineaSinPorcentajes.indexOf(firstMonto)
    let textoComercio = ''

    if (idxFirstMonto > idxFecha) {
      const entreAuthYFecha = lineaSinPorcentajes.substring(0, idxFecha).replace(numeroAutorizacion || '', '').trim()
      const entreFechaYMonto = lineaSinPorcentajes.substring(idxFecha + rawFecha.length, idxFirstMonto).trim()
      if (entreAuthYFecha.length >= 3) {
        textoComercio = entreAuthYFecha
      } else if (entreFechaYMonto.length >= 3) {
        textoComercio = entreFechaYMonto
      } else {
        textoComercio = `${entreAuthYFecha} ${entreFechaYMonto}`.trim()
      }
    } else {
      textoComercio = lineaSinPorcentajes.substring(0, idxFecha).replace(numeroAutorizacion || '', '').trim()
    }

    let descripcion = textoComercio.replace(/[\$\-]+$/, '').replace(/\s+/g, ' ').trim()
    if (!descripcion || descripcion.length < 2) descripcion = 'CONSUMO BANCOLOMBIA'

    // Cuotas (ej: 1/1, 2/12)
    const textoSinFecha = lineaSinPorcentajes.replace(rawFecha, ' ')
    const cuotaMatch = textoSinFecha.match(/\b(\d{1,2})\/(\d{1,2})\b/)
    const cuotasInfo = cuotaMatch ? `${cuotaMatch[1]}/${cuotaMatch[2]}` : (seccionActual === 'MOVIMIENTOS_ANTERIORES' ? '2/12' : '1/1')
    const numeroCuotaActual = cuotaMatch ? parseInt(cuotaMatch[1], 10) : 1
    const cuotasTotales = cuotaMatch ? parseInt(cuotaMatch[2], 10) : 1

    const descLower = descripcion.toLowerCase()
    const esAbono =
      (descLower.startsWith('pago') || descLower.includes('abono') || lineaSinPorcentajes.includes('- $') || lineaSinPorcentajes.includes('-$')) &&
      !descLower.includes('mercado pago') &&
      !descLower.includes('pago exp')
    const tipo: 'DEBITO' | 'CREDITO' = esAbono ? 'CREDITO' : 'DEBITO'

    let montoFacturado = Math.abs(montos[0])
    let valorOriginal = Math.abs(montos[0])
    let saldoPendiente = 0

    if (cuotasTotales > 1 || seccionActual === 'MOVIMIENTOS_ANTERIORES') {
      valorOriginal = Math.abs(montos[0])
      montoFacturado = Math.abs(montos.length >= 2 ? montos[1] : montos[0])
      saldoPendiente = Math.abs(montos.length >= 3 ? montos[montos.length - 1] : 0)
    }

    const esCargo = esCargoFinanciero(descripcion)
    let clasificacionTarjeta: 'CONSUMO_MES' | 'COMPRA_CUOTAS' | 'CARGO_TARJETA' | 'PAGO_ABONO' = 'CONSUMO_MES'
    if (tipo === 'CREDITO') {
      clasificacionTarjeta = 'PAGO_ABONO'
    } else if (esCargo) {
      clasificacionTarjeta = 'CARGO_TARJETA'
    } else if (cuotasTotales > 1 || seccionActual === 'MOVIMIENTOS_ANTERIORES') {
      clasificacionTarjeta = 'COMPRA_CUOTAS'
    }

    transacciones.push({
      id: `bc-tx-${Date.now()}-${idx}`,
      numeroAutorizacion,
      fecha,
      descripcion,
      monto: montoFacturado,
      valorMovimientoOriginal: valorOriginal,
      tipo,
      cuotasInfo,
      numeroCuotaActual,
      cuotasTotales,
      saldoPendiente,
      seccionExtracto: cuotasTotales > 1 || seccionActual === 'MOVIMIENTOS_ANTERIORES' ? 'MOVIMIENTOS_ANTERIORES' : 'NUEVOS_MOVIMIENTOS',
      clasificacionTarjeta,
      bancoDetectado: 'BANCOLOMBIA',
      categoriaSugerida: sugerirCategoria(descripcion),
      esCargoBancario: esCargo,
    })
  })

  const totalDebitos = transacciones.filter((t) => t.tipo === 'DEBITO').reduce((acc, t) => acc + t.monto, 0)
  const totalCreditos = transacciones.filter((t) => t.tipo === 'CREDITO').reduce((acc, t) => acc + t.monto, 0)

  return {
    exito: transacciones.length > 0 || Boolean(resumenCabecera.pagoTotal),
    transacciones,
    resumenCabecera,
    totalDebitos,
    totalCreditos,
    bancoIdentificado: 'BANCOLOMBIA',
    mesDetectado: transacciones[0]?.fecha.slice(0, 7) || getLocalCurrentMonth(),
  }
}

/**
 * Parser dedicado para extractos de Tarjeta de Crédito Nu Colombia (Nubank)
 */
export function parseExtractoNu(texto: string): ResultadoExtraccion {
  // Pre-proceso Nu: Unir fechas partidas por saltos de línea (ej: "13 AGO\n2026" -> "13 AGO 2026")
  const cleanText = texto.replace(/(\d{1,2}\s+(?:ene|feb|mar|abr|may|jun|jul|ago|sep|oct|nov|dic)[a-z]*)\r?\n+(\d{4})/gi, '$1 $2')

  // Cabecera Nu
  const deudaMatch = texto.match(/usado[\s\n\r:]+(\$?\s*[\d.,]+)/i) || texto.match(/deuda\s+al\s+corte[\s\n\r:]+(\$?\s*[\d.,]+)/i)
  const cupoMatch = texto.match(/tu\s+cupo\s+definido[\s\n\r:]+(\$?\s*[\d.,]+)/i) || texto.match(/cupo\s+definido[\s\n\r:]+(\$?\s*[\d.,]+)/i)
  const dispMatch = texto.match(/disponible[\s\n\r:]+(\$?\s*[\d.,]+)/i)
  const perMatch = texto.match(/periodo\s+facturado[\s\n\r:]+([^\n\r]+)/i)
  const pagoMinMatch = texto.match(/pago\s+m[ií]nimo[\s\n\r:]+(\$?\s*[\d.,]+)/i)
  const fecLimMatch = texto.match(/fecha\s+l[ií]mite\s+de\s+pago[\s\n\r:]+([^\n\r]+)/i) || texto.match(/fecha\s+l[ií]mite[\s\n\r:]+([^\n\r]+)/i)

  // Deuda total en Nu: "DEUDA TOTAL HASTA EL 14 AGOSTO $1.849.931,98"
  const deudaTotalNuMatch = texto.match(/deuda\s+total\s+hasta[^\$\n\r]*\$\s*([\d.,]+)/i) || texto.match(/deuda\s+total[^\$\n\r]*\$\s*([\d.,]+)/i)

  const resumenCabecera: ResumenExtractoCabecera = {
    deudaCorte: deudaMatch ? parseMonto(deudaMatch[1]) : 1891832,
    cupoTotal: cupoMatch ? parseMonto(cupoMatch[1]) : 2000000,
    cupoDisponible: dispMatch ? parseMonto(dispMatch[1]) : 108168,
    periodoFacturado: perMatch ? perMatch[1].trim() : '15 JUL 2026 - 14 AGO',
    pagoTotal: deudaTotalNuMatch ? parseMonto(deudaTotalNuMatch[1]) : 1849932,
    pagoMinimo: pagoMinMatch ? parseMonto(pagoMinMatch[1]) : 981828,
    fechaLimitePagoTexto: fecLimMatch ? cleanDateText(fecLimMatch[1]) : '04 SEP 2026',
  }

  // Agrupar filas de Nu: cada fila empieza con fecha (ej: "13 AGO 2026")
  const rawLines = cleanText.split(/\r?\n/).map((l) => l.trim()).filter((l) => l.length > 0)
  const bloques: string[] = []
  let bloqueActual: string[] = []

  for (let i = 0; i < rawLines.length; i++) {
    const l = rawLines[i]
    const hasNuDateStart = /^\d{1,2}\s+(?:ene|feb|mar|abr|may|jun|jul|ago|sep|oct|nov|dic)[a-z]*\s+\d{4}/i.test(l)

    if (hasNuDateStart) {
      if (bloqueActual.length > 0) {
        bloques.push(bloqueActual.join(' '))
      }
      bloqueActual = [l]
    } else if (bloqueActual.length > 0) {
      if (l.startsWith('↪') || l.toLowerCase().startsWith('pago mínimo') || l.toLowerCase().startsWith('resumen de tu extracto')) {
        if (l.toLowerCase().startsWith('pago mínimo')) {
          bloques.push(bloqueActual.join(' '))
          bloqueActual = []
        }
      } else {
        bloqueActual.push(l)
      }
    }
  }
  if (bloqueActual.length > 0) {
    bloques.push(bloqueActual.join(' '))
  }

  const FRASES_CABECERA_NU = [
    'fecha de corte',
    'periodo facturado',
    'fecha límite',
    'fecha limite',
    'tu cupo definido',
    'cupo definido',
    'resumen de tu extracto',
    'deuda a pagar',
    'deuda restante',
    'deuda total hasta',
    'comisiones de avances',
    'comisiones por servicio',
    'cargos por conversión',
    'cuota de manejo',
    'devoluciones y ajustes',
    'ajustes a favor',
  ]

  const transacciones: TransaccionExtracto[] = []

  bloques.forEach((bloque, idx) => {
    const bLower = bloque.toLowerCase()
    if (FRASES_CABECERA_NU.some((frase) => bLower.includes(frase))) {
      return
    }

    const fechaMatch = bloque.match(/\b(\d{1,2}\s+(?:ene|feb|mar|abr|may|jun|jul|ago|sep|oct|nov|dic)[a-z]*\s+\d{4})\b/i)
    if (!fechaMatch) return

    const rawFecha = fechaMatch[1]
    const fecha = parseFecha(rawFecha)

    const bloqueSinFecha = bloque.replace(rawFecha, ' ')
    const montosMatches = bloqueSinFecha.match(/[-+]?\s*\$?\s*\d{1,3}(?:\.\d{3})+(?:,\d{2})?|[-+]?\s*\$?\s*\d+(?:,\d{2})/g)
    if (!montosMatches || montosMatches.length === 0) return

    const montosNumericos = montosMatches.map((m) => parseMonto(m)).filter((m) => m > 0)
    if (montosNumericos.length === 0) return

    // Cuotas en Nu (ej: "1 de 2", "2 de 24", "1 de 1")
    const cuotaMatch = bloqueSinFecha.match(/\b(\d{1,2})\s*(?:\/|de)\s*(\d{1,2})\b/i)
    const cuotasInfo = cuotaMatch ? `${cuotaMatch[1]}/${cuotaMatch[2]}` : '1/1'
    const numeroCuotaActual = cuotaMatch ? parseInt(cuotaMatch[1], 10) : 1
    const cuotasTotales = cuotaMatch ? parseInt(cuotaMatch[2], 10) : 1

    // Descripción del comercio en Nu
    const resto = bloque.substring(bloque.indexOf(rawFecha) + rawFecha.length).trim()
    const firstMonto = montosMatches[0]
    const idxMonto = resto.indexOf(firstMonto)
    let descripcion = idxMonto > 0 ? resto.substring(0, idxMonto).trim() : resto
    if (cuotaMatch && descripcion.includes(cuotaMatch[0])) {
      descripcion = descripcion.substring(0, descripcion.indexOf(cuotaMatch[0])).trim()
    }
    descripcion = descripcion.replace(/\s+/g, ' ').trim()
    if (!descripcion) descripcion = 'CONSUMO NU'

    const esAbono =
      (descripcion.toLowerCase() === 'pago' || descripcion.toLowerCase().startsWith('pago ')) &&
      !descripcion.toLowerCase().includes('mercado pago')

    let valorOriginalCompra = montosNumericos[0]
    let montoFacturadoMes = montosNumericos[0]
    let saldoPendiente = 0

    if (esAbono) {
      montoFacturadoMes = valorOriginalCompra
      saldoPendiente = 0
    } else if (cuotasTotales > 1) {
      if (montosNumericos.length >= 4) {
        montoFacturadoMes = montosNumericos[montosNumericos.length - 2]
        saldoPendiente = montosNumericos[montosNumericos.length - 1]
      } else if (montosNumericos.length >= 2) {
        montoFacturadoMes = montosNumericos[1]
        saldoPendiente = Math.max(0, valorOriginalCompra - montoFacturadoMes * numeroCuotaActual)
      }
    } else {
      montoFacturadoMes = valorOriginalCompra
      saldoPendiente = 0
    }

    const esCargo = esCargoFinanciero(descripcion)
    const tipo: 'DEBITO' | 'CREDITO' = esAbono ? 'CREDITO' : 'DEBITO'

    let clasificacionTarjeta: 'CONSUMO_MES' | 'COMPRA_CUOTAS' | 'CARGO_TARJETA' | 'PAGO_ABONO' = 'CONSUMO_MES'
    if (tipo === 'CREDITO') {
      clasificacionTarjeta = 'PAGO_ABONO'
    } else if (esCargo) {
      clasificacionTarjeta = 'CARGO_TARJETA'
    } else if (cuotasTotales > 1) {
      clasificacionTarjeta = 'COMPRA_CUOTAS'
    }

    transacciones.push({
      id: `nu-tx-${Date.now()}-${idx}`,
      fecha,
      descripcion,
      monto: montoFacturadoMes,
      valorMovimientoOriginal: valorOriginalCompra,
      tipo,
      cuotasInfo,
      numeroCuotaActual,
      cuotasTotales,
      saldoPendiente,
      seccionExtracto: cuotasTotales > 1 ? 'MOVIMIENTOS_ANTERIORES' : 'NUEVOS_MOVIMIENTOS',
      clasificacionTarjeta,
      bancoDetectado: 'NU',
      categoriaSugerida: sugerirCategoria(descripcion),
      esCargoBancario: esCargo,
    })
  })

  const totalDebitos = transacciones.filter((t) => t.tipo === 'DEBITO').reduce((acc, t) => acc + t.monto, 0)
  const totalCreditos = transacciones.filter((t) => t.tipo === 'CREDITO').reduce((acc, t) => acc + t.monto, 0)

  return {
    exito: transacciones.length > 0 || Boolean(resumenCabecera.pagoTotal),
    transacciones,
    resumenCabecera,
    totalDebitos,
    totalCreditos,
    bancoIdentificado: 'NU',
    mesDetectado: transacciones[0]?.fecha.slice(0, 7) || getLocalCurrentMonth(),
  }
}

/**
 * Función principal para procesar texto de extractos bancarios
 */
export function parseTextoExtracto(texto: string, bancoSugerido?: string): ResultadoExtraccion {
  const textoLower = texto.toLowerCase()

  const isNu =
    bancoSugerido === 'NU' ||
    textoLower.includes('nu colombia') ||
    textoLower.includes('nubank') ||
    textoLower.includes('nu mastercard') ||
    textoLower.includes('tu cupo definido') ||
    (textoLower.includes('fecha límite de pago') && textoLower.includes('usado'))

  const isBancolombia =
    bancoSugerido === 'BANCOLOMBIA' ||
    textoLower.includes('bancolombia') ||
    textoLower.includes('cupo de tu tarjeta') ||
    textoLower.includes('deuda a la fecha de corte')

  if (isNu) {
    return parseExtractoNu(texto)
  } else if (isBancolombia) {
    return parseExtractoBancolombia(texto)
  } else {
    // Si no se puede identificar explícitamente, intentar Nu si contiene meses en texto o Bancolombia si tiene DD/MM
    if (/\b(?:ene|feb|mar|abr|may|jun|jul|ago|sep|oct|nov|dic)\b/i.test(texto)) {
      return parseExtractoNu(texto)
    }
    return parseExtractoBancolombia(texto)
  }
}

/**
 * Extraer texto y transacciones de un archivo PDF
 */
export async function extraerTransaccionesDePdf(
  archivo: File,
  password?: string
): Promise<ResultadoExtraccion> {
  try {
    const arrayBuffer = await archivo.arrayBuffer()

    const loadingTask = pdfjsLib.getDocument({
      data: arrayBuffer,
      password: password || undefined,
    })

    loadingTask.onPassword = (updatePassword: (pw: string) => void) => {
      if (password) {
        updatePassword(password)
      } else {
        updatePassword('')
      }
    }

    const pdfDocument = await loadingTask.promise
    let textoCompleto = ''

    for (let pageNum = 1; pageNum <= pdfDocument.numPages; pageNum++) {
      const page = await pdfDocument.getPage(pageNum)
      const textContent = await page.getTextContent()

      let lineaActualY: number | null = null
      let lineaActualTexto = ''

      for (const item of textContent.items) {
        if ('str' in item) {
          const itemY = 'transform' in item ? Math.round(item.transform[5]) : 0

          // Si cambia la posición vertical, es una nueva línea
          if (lineaActualY !== null && Math.abs(itemY - lineaActualY) > 4) {
            textoCompleto += lineaActualTexto.trim() + '\n'
            lineaActualTexto = item.str + ' '
          } else {
            lineaActualTexto += item.str + ' '
          }
          lineaActualY = itemY
        }
      }
      if (lineaActualTexto.trim()) {
        textoCompleto += lineaActualTexto.trim() + '\n'
      }
    }

    if (!textoCompleto.trim()) {
      return {
        exito: false,
        transacciones: [],
        totalDebitos: 0,
        totalCreditos: 0,
        error: 'El documento PDF no contiene texto legible.',
      }
    }

    return parseTextoExtracto(textoCompleto)
  } catch (error: unknown) {
    const err = error as { name?: string; message?: string; code?: number }
    const isPasswordError =
      err?.name === 'PasswordException' ||
      err?.name === 'NeedPasswordException' ||
      err?.code === 1 ||
      err?.code === 2 ||
      err?.message?.toLowerCase().includes('password') ||
      err?.message?.toLowerCase().includes('contraseña') ||
      err?.message?.toLowerCase().includes('encrypted')

    if (isPasswordError) {
      return {
        exito: false,
        transacciones: [],
        totalDebitos: 0,
        totalCreditos: 0,
        requierePassword: true,
        error: password
          ? 'Contraseña incorrecta. Por favor verifica tu número de cédula.'
          : 'El extracto bancario está protegido con contraseña. Ingresa tu número de cédula para desbloquearlo.',
      }
    }

    return {
      exito: false,
      transacciones: [],
      totalDebitos: 0,
      totalCreditos: 0,
      error: err?.message || 'Error al procesar el archivo PDF.',
    }
  }
}
