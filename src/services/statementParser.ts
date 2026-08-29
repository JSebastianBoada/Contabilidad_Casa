import * as pdfjsLib from 'pdfjs-dist'
import pdfjsWorker from 'pdfjs-dist/build/pdf.worker.min.mjs?url'
import type { CategoriaGastoPersonal } from '../types/finance'

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

export interface ResultadoExtraccion {
  exito: boolean
  transacciones: TransaccionExtracto[]
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

/**
 * Normalizar fechas a formato YYYY-MM-DD
 */
function parseFecha(raw: string): string {
  const s = raw.trim().toLowerCase()

  // Formato: 13/08/2026 o 13-08-2026
  const dmyMatch = s.match(/(\d{1,2})[-/](\d{1,2})[-/](\d{4})/)
  if (dmyMatch) {
    return `${dmyMatch[3]}-${dmyMatch[2].padStart(2, '0')}-${dmyMatch[1].padStart(2, '0')}`
  }

  // Formato: 2026-08-13
  const isoMatch = s.match(/(\d{4})[-/](\d{1,2})[-/](\d{1,2})/)
  if (isoMatch) {
    return `${isoMatch[1]}-${isoMatch[2].padStart(2, '0')}-${isoMatch[3].padStart(2, '0')}`
  }

  return new Date().toISOString().slice(0, 10)
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
  'pago total',
  'fecha limite',
  'saldo anterior',
  'saldo actual',
]

/**
 * Parser de Extractos Bancarios enfocado en la sección de "Detalles del movimiento"
 * Captura:
 * 1. "Nuevos movimientos entre [fecha] hasta [fecha]" (1/1 y Abonos)
 * 2. "Movimientos antes de [fecha]" (Compras diferidas a cuotas como 2/12)
 */
export function parseTextoExtracto(texto: string, bancoSugerido?: string): ResultadoExtraccion {
  const lineas = texto.split(/\r?\n/).map((l) => l.trim()).filter((l) => l.length > 0)
  const transacciones: TransaccionExtracto[] = []

  let bancoIdentificado = bancoSugerido || 'BANCOLOMBIA'
  const textoLower = texto.toLowerCase()

  if (textoLower.includes('bancolombia')) {
    bancoIdentificado = 'BANCOLOMBIA'
  } else if (textoLower.includes('nu colombia') || textoLower.includes('nubank') || textoLower.includes('nu mastercard')) {
    bancoIdentificado = 'NU'
  } else if (textoLower.includes('davivienda') || textoLower.includes('daviplata')) {
    bancoIdentificado = 'DAVIVIENDA'
  }

  let seccionActual: 'NUEVOS_MOVIMIENTOS' | 'MOVIMIENTOS_ANTERIORES' = 'NUEVOS_MOVIMIENTOS'

  lineas.forEach((linea, index) => {
    const lLower = linea.toLowerCase()

    // Detección de cambio de sección
    if (lLower.includes('nuevos movimientos entre') || lLower.includes('movimientos del mes') || lLower.includes('consumos del período')) {
      seccionActual = 'NUEVOS_MOVIMIENTOS'
      return
    }
    if (lLower.includes('movimientos antes de') || lLower.includes('compras anteriores') || lLower.includes('financiaciones vigentes') || lLower.includes('compras a cuotas')) {
      seccionActual = 'MOVIMIENTOS_ANTERIORES'
      return
    }

    // Ignorar encabezados de tabla y textos de advertencia
    if (FRASES_IGNORAR.some((frase) => lLower.includes(frase))) {
      return
    }
    if (linea.length < 8) return

    // 1. Quitar porcentajes de interés (ej: 0,0000 % o 00,0000 %)
    const lineaSinPorcentajes = linea.replace(/[\d,.]+\s*%/g, ' ')

    // 2. Extraer Fecha (DD/MM/YYYY o DD-MM-YYYY)
    const fechaMatch = lineaSinPorcentajes.match(/\b(\d{1,2}[-/]\d{1,2}[-/]\d{4})\b/)
    if (!fechaMatch) return

    const rawFecha = fechaMatch[1]
    const fecha = parseFecha(rawFecha)
    const idxFecha = lineaSinPorcentajes.indexOf(rawFecha)

    // 3. ANTES de la fecha está el Comercio y el Código de Autorización
    const textoPrevioFecha = lineaSinPorcentajes.substring(0, idxFecha).trim()

    // Extraer el código de autorización (ej: R32011, T06261, C64239)
    const authMatch = textoPrevioFecha.match(/\b([A-Z]\d{4,8})\b/i) || textoPrevioFecha.match(/\b([A-Z0-9]{5,8})\b/)
    const numeroAutorizacion = authMatch ? authMatch[1] : undefined

    let descripcionComercio = textoPrevioFecha
    if (numeroAutorizacion) {
      descripcionComercio = descripcionComercio.replace(numeroAutorizacion, '').trim()
    }
    descripcionComercio = descripcionComercio.replace(/\s+/g, ' ').trim()

    // 4. DESPUÉS de la fecha están los Montos, Cuotas y Saldos
    const textoDespuesFecha = lineaSinPorcentajes.substring(idxFecha + rawFecha.length).trim()

    // 5. Extraer Cuotas (ej: 2/12, 1/1)
    const cuotaMatch = textoDespuesFecha.match(/\b(\d{1,2})\s*\/\s*(\d{1,2})\b/)
    let cuotasInfo: string | undefined
    let numeroCuotaActual: number | undefined
    let cuotasTotales: number | undefined

    if (cuotaMatch) {
      numeroCuotaActual = parseInt(cuotaMatch[1], 10)
      cuotasTotales = parseInt(cuotaMatch[2], 10)
      cuotasInfo = `${numeroCuotaActual}/${cuotasTotales}`
    } else if (!descripcionComercio.toLowerCase().includes('abono') && !textoDespuesFecha.toLowerCase().includes('abono')) {
      cuotasInfo = '1/1'
      numeroCuotaActual = 1
      cuotasTotales = 1
    }

    // Quitar el token de cuota
    const textoSinCuotas = cuotaMatch ? textoDespuesFecha.replace(cuotaMatch[0], ' ') : textoDespuesFecha

    // 6. Extraer todos los valores de dinero reales
    const montosMatches = textoSinCuotas.match(/[-+]?\s*\$?\s*\d{1,3}(?:\.\d{3})+(?:,\d{2})?|[-+]?\s*\$?\s*\d+(?:,\d{2})/g)
    if (!montosMatches || montosMatches.length === 0) return

    const montosNumericos = montosMatches
      .map((m) => parseMonto(m))
      .filter((m) => !isNaN(m) && m !== 0)

    // Fallback si la descripción vino después de la fecha
    if (!descripcionComercio || descripcionComercio.length < 2) {
      const primerMontoMatch = montosMatches[0]
      const idxPrimerMonto = textoDespuesFecha.indexOf(primerMontoMatch)
      if (idxPrimerMonto > 0) {
        descripcionComercio = textoDespuesFecha.substring(0, idxPrimerMonto).trim()
      }
    }
    if (!descripcionComercio || descripcionComercio.length < 2) {
      descripcionComercio = 'CONSUMO TARJETA'
    }

    let montoFacturadoMes = 0
    let valorOriginalCompra = 0
    let saldoPendiente = 0
    let esAbono = false

    if (seccionActual === 'MOVIMIENTOS_ANTERIORES' || (cuotasTotales && cuotasTotales > 1)) {
      valorOriginalCompra = Math.abs(montosNumericos[0] || 0)
      montoFacturadoMes = Math.abs(montosNumericos.length >= 2 ? montosNumericos[1] : montosNumericos[0])
      saldoPendiente = Math.abs(montosNumericos[montosNumericos.length - 1] || 0)
    } else {
      const primerVal = montosNumericos[0] || 0
      if (primerVal < 0 || descripcionComercio.toLowerCase().includes('abono')) {
        esAbono = true
        valorOriginalCompra = Math.abs(primerVal)
        montoFacturadoMes = Math.abs(primerVal)
      } else {
        valorOriginalCompra = Math.abs(primerVal)
        montoFacturadoMes = Math.abs(primerVal)
      }
      saldoPendiente = 0
    }

    if (montoFacturadoMes === 0 && valorOriginalCompra === 0) return

    const esCargo = esCargoFinanciero(descripcionComercio)
    const tipo: 'DEBITO' | 'CREDITO' = esAbono ? 'CREDITO' : 'DEBITO'

    // Clasificación de tarjeta
    let clasificacionTarjeta: 'CONSUMO_MES' | 'COMPRA_CUOTAS' | 'CARGO_TARJETA' | 'PAGO_ABONO' = 'CONSUMO_MES'
    if (tipo === 'CREDITO') {
      clasificacionTarjeta = 'PAGO_ABONO'
    } else if (esCargo) {
      clasificacionTarjeta = 'CARGO_TARJETA'
    } else if (seccionActual === 'MOVIMIENTOS_ANTERIORES' || (cuotasTotales && cuotasTotales > 1)) {
      clasificacionTarjeta = 'COMPRA_CUOTAS'
    } else {
      clasificacionTarjeta = 'CONSUMO_MES'
    }

    transacciones.push({
      id: `tx-ext-${Date.now()}-${index}`,
      numeroAutorizacion,
      fecha,
      descripcion: descripcionComercio,
      monto: montoFacturadoMes,
      valorMovimientoOriginal: valorOriginalCompra,
      tipo,
      cuotasInfo: cuotasInfo || (clasificacionTarjeta === 'CONSUMO_MES' ? '1/1' : undefined),
      numeroCuotaActual,
      cuotasTotales,
      saldoPendiente,
      seccionExtracto: seccionActual,
      bancoDetectado: bancoIdentificado,
      categoriaSugerida: sugerirCategoria(descripcionComercio),
      esCargoBancario: esCargo,
      clasificacionTarjeta,
    })
  })

  // Calcular totales
  const totalDebitos = transacciones
    .filter((t) => t.tipo === 'DEBITO')
    .reduce((acc, t) => acc + t.monto, 0)

  const totalCreditos = transacciones
    .filter((t) => t.tipo === 'CREDITO')
    .reduce((acc, t) => acc + t.monto, 0)

  // Mes detectado
  let mesDetectado: string | undefined
  if (transacciones.length > 0) {
    const mesesConteo: Record<string, number> = {}
    transacciones.forEach((t) => {
      const m = t.fecha.slice(0, 7)
      mesesConteo[m] = (mesesConteo[m] || 0) + 1
    })
    mesDetectado = Object.keys(mesesConteo).reduce((a, b) =>
      mesesConteo[a] > mesesConteo[b] ? a : b
    )
  }

  return {
    exito: transacciones.length > 0,
    transacciones,
    totalDebitos,
    totalCreditos,
    bancoIdentificado,
    mesDetectado,
    error: transacciones.length === 0 ? 'No se encontraron movimientos en la sección "Detalles del movimiento".' : undefined,
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
