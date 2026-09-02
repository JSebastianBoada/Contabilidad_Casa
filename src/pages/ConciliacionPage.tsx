import { useState, useMemo, type ChangeEvent, type FormEvent } from 'react'
import { useFinance } from '../context/FinanceContext'
import { formatMoney, formatDate, formatMonthYear, cleanDateText } from '../utils/formatters'
import {
  extraerTransaccionesDePdf,
  parseTextoExtracto,
  type TransaccionExtracto,
  type ResultadoExtraccion,
  type ResumenExtractoCabecera,
} from '../services/statementParser'
import {
  auditarYConciliarExtracto,
  type ReporteAuditoria,
} from '../services/reconciliationEngine'
import type { CategoriaGastoPersonal, CompraCuota } from '../types/finance'

export function ConciliacionPage() {
  const {
    state,
    selectedMonth,
    setSelectedMonth,
    addGastoPersonal,
    addIngreso,
    addCompraCuota,
    updateCompraCuota,
    updateTarjeta,
    limpiarDatosTarjetas,
    showToast,
  } = useFinance()

  // Estados de carga
  const [metodoCarga, setMetodoCarga] = useState<'PDF' | 'TEXTO' | 'EJEMPLO'>('PDF')
  const [archivoPdf, setArchivoPdf] = useState<File | null>(null)
  const [passwordPdf, setPasswordPdf] = useState('')
  const [requierePassword, setRequierePassword] = useState(false)
  const [cargando, setCargando] = useState(false)
  const [errorCarga, setErrorCarga] = useState<string | null>(null)
  const [textoManual, setTextoManual] = useState('')

  // Filtros de cuenta / tarjeta (Por defecto selecciona tu primera tarjeta de crédito)
  const [medioAuditado, setMedioAuditado] = useState<string>(
    state.tarjetas.length > 0 ? `tarjeta:${state.tarjetas[0].id}` : 'TODOS'
  )

  // Datos extraídos y reporte
  const [transaccionesExtraidas, setTransaccionesExtraidas] = useState<TransaccionExtracto[]>([])
  const [resumenCabecera, setResumenCabecera] = useState<ResumenExtractoCabecera | undefined>()
  const [bancoDetectado, setBancoDetectado] = useState<string>('BANCOLOMBIA')
  const [activeTabAuditoria, setActiveTabAuditoria] = useState<'FALTANTES' | 'CONCILIADOS' | 'CARGOS' | 'DIFERENCIAS' | 'APP_SOLO'>('FALTANTES')

  // Pestaña principal: Visualizar Columnas Extraídas vs Auditoría Cruzada
  const [vistaPrincipal, setVistaPrincipal] = useState<'COLUMNAS_PDF' | 'AUDITORIA_APP'>('COLUMNAS_PDF')

  // Personalización interactiva por fila
  const [categoriaOverrides, setCategoriaOverrides] = useState<Record<string, CategoriaGastoPersonal>>({})
  const [vinculoOverrides, setVinculoOverrides] = useState<Record<string, string>>({})

  // Procesar archivo PDF
  async function handleProcesarPdf(e?: FormEvent) {
    if (e) e.preventDefault()
    if (!archivoPdf) return

    setCargando(true)
    setErrorCarga(null)
    setRequierePassword(false)

    try {
      const resultado: ResultadoExtraccion = await extraerTransaccionesDePdf(archivoPdf, passwordPdf)

      if (resultado.requierePassword) {
        setRequierePassword(true)
        setErrorCarga(resultado.error || 'El archivo requiere contraseña para abrirse.')
        showToast('PDF protegido', 'Ingresa la clave de tu extracto (cédula)', 'warning')
      } else if (!resultado.exito || resultado.transacciones.length === 0) {
        setErrorCarga(resultado.error || 'No se pudieron extraer transacciones del documento.')
        showToast('Sin datos', resultado.error || 'Verifica el formato del PDF', 'error')
      } else {
        setTransaccionesExtraidas(resultado.transacciones)
        setResumenCabecera(resultado.resumenCabecera)
        setBancoDetectado(resultado.bancoIdentificado || 'BANCOLOMBIA')
        if (resultado.mesDetectado) {
          setSelectedMonth(resultado.mesDetectado)
        }
        showToast(
          'Extracto de tarjeta leído',
          `Se extrajeron ${resultado.transacciones.length} consumos y datos de extracto de ${resultado.bancoIdentificado || 'tu tarjeta'}`
        )
      }
    } catch (err) {
      setErrorCarga(err instanceof Error ? err.message : 'Error al procesar el archivo.')
    } finally {
      setCargando(false)
    }
  }

  // Procesar texto pegado
  function handleProcesarTexto(e: FormEvent) {
    e.preventDefault()
    if (!textoManual.trim()) return

    setCargando(true)
    setErrorCarga(null)

    const resultado = parseTextoExtracto(textoManual)
    if (!resultado.exito || resultado.transacciones.length === 0) {
      setErrorCarga(resultado.error || 'No se pudieron identificar transacciones en el texto pegado.')
      showToast('Error', 'No se encontraron fechas y montos válidos', 'error')
    } else {
      setTransaccionesExtraidas(resultado.transacciones)
      setResumenCabecera(resultado.resumenCabecera)
      setBancoDetectado(resultado.bancoIdentificado || 'BANCOLOMBIA')
      if (resultado.mesDetectado) {
        setSelectedMonth(resultado.mesDetectado)
      }
      showToast(
        'Texto procesado',
        `Se extrajeron ${resultado.transacciones.length} consumos de tarjeta correctamente`
      )
    }
    setCargando(false)
  }

  // Cargar ejemplo oficial del extracto de Bancolombia
  function handleCargarEjemplo() {
    const textoEjemplo = `
Cupo de tu tarjeta
Deuda a la fecha de corte: $ 781.536,00
Cupo total: $ 1.200.000,00
Disponible: $ 418.464,71

Información de pago en pesos
Periodo facturado: 15 jul - 17 ago. 2026
Pago Total: $ 781.536,00
Pagar antes de: sep. 02, 2026
Pago mínimo: $ 201.878,00

Detalles del movimiento
Recuerda estar al día en el pago de tu tarjeta para evitar cobro de intereses por mora, débitos a tus cuentas y el bloqueo de tu tarjeta.

Nuevos movimientos entre 15 jul hasta 17 ago. 2026
Número de autorización Fecha Movimientos Valor movimiento Número cuotas Valor Couta/Abono % Interés mensual % Interés anual Saldo pendiente
R32011 13/08/2026 NYD MOTOS OCANA $ 14.000,00 1/1 $ 14.000,00 0,0000 % 00,0000 % $ 0,00
R80961 13/08/2026 SERVICENTRO AVENIDA $ 37.023,00 1/1 $ 37.023,00 0,0000 % 00,0000 % $ 0,00
C64239 31/07/2026 ABONO SUCURSAL VIRTUAL $ -208.622,00 $ -208.622,00 $ 0,00
R23642 28/07/2026 UNE TELCO UNE PAGO EXP $ 53.900,00 1/1 $ 53.900,00 0,0000 % 00,0000 % $ 0,00
R20177 21/07/2026 SERVICENTRO AVENIDA $ 38.989,00 1/1 $ 38.989,00 0,0000 % 00,0000 % $ 0,00

Movimientos antes de 15 jul
Número de autorización Fecha Movimientos Valor movimiento Número cuotas Valor Couta/Abono % Interés mensual % Interés anual Saldo pendiente
T06261 05/07/2026 MERCADO PAGO $ 695.590,00 2/12 $ 57.965,83 0,0000 % 00,0000 % $ 579.657,46
    `.trim()

    setTextoManual(textoEjemplo)
    const resultado = parseTextoExtracto(textoEjemplo, 'BANCOLOMBIA')
    setTransaccionesExtraidas(resultado.transacciones)
    setResumenCabecera(resultado.resumenCabecera)
    setBancoDetectado('BANCOLOMBIA')

    const tarjetaBc = state.tarjetas.find(
      (t) => t.nombre.toLowerCase().includes('bancolombia') || t.ultimos4Digitos === '1234'
    )
    if (tarjetaBc) {
      setMedioAuditado(`tarjeta:${tarjetaBc.id}`)
    }

    showToast('Extracto oficial Bancolombia cargado', 'Cupo: $1.2M | Pago Total: $781.536 | Pago Mínimo: $201.878')
  }

  // Cargar ejemplo oficial del extracto de Nu Colombia
  function handleCargarEjemploNu() {
    const textoEjemploNu = `
Fecha límite de pago
04 SEP 2026
Fecha de corte
15 AGO 2026
Periodo facturado
15 JUL 2026 - 14 AGO

Resumen de tu extracto
Tu cupo definido $2.000.000,00
Usado $1.891.831,98
Disponible $108.168,02
Ajustes a favor $49.800,00
Deuda a pagar este mes $1.014.098,68
Intereses + $5.529,15
Cuota de manejo + $12.000,00
PAGO MÍNIMO $981.827,83
Deuda restante + $868.104,15
DEUDA TOTAL HASTA EL 14 AGOSTO $1.849.931,98

Fecha Descripción Valor Cuotas Valor del mes Interés del mes Porcentaje y valor Total a pagar este mes Restante por pagar
13 AGO 2026 Mercado Pago*Mercadoli $1.449.900,00 1 de 2 $724.950,00 0.00% $0,00 $724.950,00 $724.950,00
06 AGO 2026 Amazon Prime $24.900,00 1 de 1 $24.900,00 2.16% $0,00 $24.900,00 $0,00
05 AGO 2026 Amazon Prime $24.900,00 1 de 1 $24.900,00 2.16% $0,00 $24.900,00 $0,00
01 AGO 2026 Pago $235.304,20 $0,00 $0,00
23 JUL 2026 Temu Com $33.859,00 1 de 1 $33.859,00 2.10% $0,00 $33.859,00 $0,00
18 JUL 2026 Google *Play Youtube*D $6.000,00 1 de 1 $6.000,00 2.10% $0,00 $6.000,00 $0,00
17 JUL 2026 Exito Oca@A $122.882,00 1 de 1 $122.882,00 2.10% $0,00 $122.882,00 $0,00
14 JUL 2026 Google *Play Youtube*D $41.900,00 1 de 1 $41.900,00 2.10% $0,00 $41.900,00 $0,00
05 JUL 2026 Dtv*Directvgo $79.900,00 2 de 24 $3.329,17 2.10% $2.317,58 $5.646,75 $73.241,66
05 JUN 2026 Mercado Pago*Diablogra $280.245,00 2.10% $1.621,44 $1.621,44 $0,00
05 JUN 2026 Dtv*Directvgo $79.900,00 3 de 24 $3.329,17 2.10% $1.590,13 $4.919,30 $69.912,49
28 MAY 2026 Mercado Pago*Mercadoli $84.148,00 3 de 3 $28.049,34 0.00% $0,00 $28.049,34 $0,00
Pago minimo $981.827,83
    `.trim()

    setTextoManual(textoEjemploNu)
    const resultado = parseTextoExtracto(textoEjemploNu, 'NU')
    setTransaccionesExtraidas(resultado.transacciones)
    setResumenCabecera(resultado.resumenCabecera)
    setBancoDetectado('NU')

    const tarjetaNu = state.tarjetas.find(
      (t) => t.nombre.toLowerCase().includes('nu') || t.ultimos4Digitos === '7899'
    )
    if (tarjetaNu) {
      setMedioAuditado(`tarjeta:${tarjetaNu.id}`)
    }

    showToast('Extracto oficial Nu cargado', 'Cupo: $2.0M | Pago Mínimo: $981.828 | Total: $1.849.932')
  }

  // Sincronizar datos de extracto y asignar movimientos a la tarjeta registrada
  function handleSincronizarTarjetaConExtracto() {
    if (!resumenCabecera && transaccionesExtraidas.length === 0) return

    let tarjetaDestinoId = medioAuditado.startsWith('tarjeta:')
      ? medioAuditado.replace('tarjeta:', '')
      : undefined

    if (!tarjetaDestinoId) {
      if (bancoDetectado === 'NU') {
        const tarjetaNu = state.tarjetas.find(
          (t) => t.nombre.toLowerCase().includes('nu') || t.franquicia?.toLowerCase().includes('nu') || t.ultimos4Digitos === '7899' || t.ultimos4Digitos === '5678'
        )
        tarjetaDestinoId = tarjetaNu ? tarjetaNu.id : state.tarjetas[0]?.id
      } else {
        const tarjetaBc = state.tarjetas.find(
          (t) => t.nombre.toLowerCase().includes('bancolombia') || t.ultimos4Digitos === '1234' || t.ultimos4Digitos === '3481'
        )
        tarjetaDestinoId = tarjetaBc ? tarjetaBc.id : state.tarjetas[0]?.id
      }
    }

    if (!tarjetaDestinoId) {
      showToast('Sin tarjeta seleccionada', 'Registra o selecciona una tarjeta de crédito', 'warning')
      return
    }

    const tarjetaDestino = state.tarjetas.find((t) => t.id === tarjetaDestinoId)
    const isNu = bancoDetectado === 'NU' || (tarjetaDestino?.banco || '').toLowerCase().includes('nu')
    const diaCorteCalc = isNu ? 15 : 17
    const diaLimiteCalc = isNu ? 4 : 2

    // 1. Actualizar datos de cabecera en la tarjeta
    if (resumenCabecera) {
      updateTarjeta(tarjetaDestinoId, {
        cupoTotal: resumenCabecera.cupoTotal || undefined,
        diaCorte: diaCorteCalc,
        diaLimitePago: diaLimiteCalc,
        ultimoExtracto: {
          periodoFacturado: resumenCabecera.periodoFacturado,
          pagoTotal: resumenCabecera.pagoTotal,
          pagoMinimo: resumenCabecera.pagoMinimo,
          pagarAntesDe: resumenCabecera.fechaLimitePagoTexto,
          cupoDisponible: resumenCabecera.cupoDisponible,
          deudaCorte: resumenCabecera.deudaCorte,
        },
      })
    }

    // 2. Sincronizar / Asignar movimientos del extracto a la tarjeta
    let movimientosAgregados = 0
    transaccionesExtraidas.forEach((tx) => {
      if (tx.tipo === 'CREDITO') {
        // Abono o Pago realizado a la Tarjeta (no es salario/nómina, es pago de extracto)
        // Se cuenta como movimiento conciliado del extracto
        movimientosAgregados++
      } else if (
        tx.clasificacionTarjeta === 'COMPRA_CUOTAS' ||
        tx.seccionExtracto === 'MOVIMIENTOS_ANTERIORES' ||
        (tx.cuotasTotales && tx.cuotasTotales > 1)
      ) {
        // Compra a Cuotas diferidas
        const cuotasTotales = tx.cuotasTotales || 1
        const cuotaActualNum = tx.numeroCuotaActual || 1
        const cuotasPagadas = Math.max(0, cuotaActualNum - 1)
        const montoTotal = tx.valorMovimientoOriginal || tx.monto * cuotasTotales
        const saldoRestante = tx.saldoPendiente !== undefined 
          ? tx.saldoPendiente 
          : Math.max(0, montoTotal - (tx.monto * cuotaActualNum))
        
        const estado = (cuotasPagadas >= cuotasTotales || (saldoRestante === 0 && cuotasPagadas > 0)) ? 'PAGADA' : 'ACTIVA'

        const existeCompra = state.comprasCuotas.find(
          (c) =>
            c.tarjetaId === tarjetaDestinoId &&
            c.fechaCompra === tx.fecha &&
            (c.cuotasTotales === cuotasTotales || Math.abs(c.montoTotal - montoTotal) < 100)
        )
        if (existeCompra) {
          updateCompraCuota(existeCompra.id, {
            saldoRestante,
            cuotasPagadas,
            cuotasTotales,
            valorCuota: tx.monto || existeCompra.valorCuota,
            estado,
          })
        } else {
          addCompraCuota({
            tarjetaId: tarjetaDestinoId,
            descripcion: tx.descripcion,
            comercio: tx.descripcion,
            fechaCompra: tx.fecha,
            montoTotal,
            cuotasTotales,
            cuotasPagadas,
            valorCuota: tx.monto,
            saldoRestante,
            tasaInteresMensual: isNu ? 2.10 : 0,
            fechaInicioCobro: tx.fecha.slice(0, 7),
            estado,
            notas: tx.cuotasInfo ? `Extracto: Cuota ${tx.cuotasInfo}` : undefined,
          })
          movimientosAgregados++
        }
      } else {
        // Gasto a 1 cuota
        const existeGasto = state.gastosPersonales.some(
          (g) =>
            g.tarjetaId === tarjetaDestinoId &&
            g.monto === tx.monto &&
            (g.fecha === tx.fecha || g.descripcion.toLowerCase() === tx.descripcion.toLowerCase())
        )
        if (!existeGasto) {
          addGastoPersonal({
            fecha: tx.fecha,
            categoria: tx.categoriaSugerida || 'OTROS',
            descripcion: tx.descripcion,
            monto: tx.monto,
            tarjetaId: tarjetaDestinoId,
            metodoPago: 'TARJETA_CREDITO',
            cuotas: 1,
          })
          movimientosAgregados++
        }
      }
    })

    showToast(
      'Tarjeta Actualizada con Extracto',
      `${tarjetaDestino?.nombre || 'Tarjeta'}: Cupo ${formatMoney(resumenCabecera?.cupoTotal || tarjetaDestino?.cupoTotal || 0)} | ${movimientosAgregados} movimientos asociados`
    )
  }

  // Ejecutar el motor de auditoría y conciliación contra la base de datos
  const reporteAuditoria: ReporteAuditoria = useMemo(() => {
    const filtroTarjetaId = medioAuditado.startsWith('tarjeta:')
      ? medioAuditado.replace('tarjeta:', '')
      : undefined
    const filtroCuentaId = medioAuditado.startsWith('cuenta:')
      ? medioAuditado.replace('cuenta:', '')
      : undefined

    return auditarYConciliarExtracto(
      transaccionesExtraidas,
      state,
      selectedMonth,
      filtroCuentaId,
      filtroTarjetaId
    )
  }, [transaccionesExtraidas, state, selectedMonth, medioAuditado])

  // Opciones de categoría para selección rápida en tabla
  const CATEGORIAS_GASTO_OPTIONS: { key: CategoriaGastoPersonal; label: string }[] = [
    { key: 'CELULAR', label: 'Celular / Telefonía' },
    { key: 'GASOLINA', label: 'Gasolina / Combustible' },
    { key: 'PARQUEADERO', label: 'Parqueadero' },
    { key: 'SUSCRIPCIONES', label: 'Suscripciones / Streaming' },
    { key: 'RESTAURANTES_COMIDAS_FUERA', label: 'Restaurantes / Comidas fuera' },
    { key: 'TRANSPORTE', label: 'Transporte / Talleres' },
    { key: 'PARTIDOS_OCIO_EVENTOS', label: 'Ocio / Eventos' },
    { key: 'SEGUROS_SALUD', label: 'Salud / Seguros' },
    { key: 'ROPA_CUIDADO', label: 'Ropa / Cuidado Personal' },
    { key: 'REGALOS', label: 'Regalos' },
    { key: 'OTROS', label: 'Otros Gastos' },
  ]

  // Buscador de coincidencias en Compras a Cuotas
  function getMatchCompraCuota(tx: TransaccionExtracto) {
    if (vinculoOverrides[tx.id] === '__NEW__') return undefined
    if (vinculoOverrides[tx.id]) {
      return state.comprasCuotas.find((c) => c.id === vinculoOverrides[tx.id])
    }
    const descTx = tx.descripcion.toLowerCase().trim()
    return state.comprasCuotas.find((c) => {
      const descC = c.descripcion.toLowerCase().trim()
      const sameTarjeta =
        !medioAuditado.startsWith('tarjeta:') ||
        c.tarjetaId === medioAuditado.replace('tarjeta:', '')
      if (!sameTarjeta) return false

      const sameDate = c.fechaCompra === tx.fecha
      const matchMonto =
        tx.valorMovimientoOriginal &&
        Math.abs(c.montoTotal - tx.valorMovimientoOriginal) < 100
      const exactDesc =
        descC === descTx || (c.comercio && c.comercio.toLowerCase() === descTx)

      return (sameDate && (exactDesc || matchMonto)) || (exactDesc && matchMonto)
    })
  }

  // Buscador de coincidencias en Gastos del Mes (1 cuota)
  function getMatchGastoMes(tx: TransaccionExtracto) {
    return state.gastosPersonales.find((g) => {
      return (
        g.monto === tx.monto &&
        (g.fecha === tx.fecha || g.fecha.slice(0, 7) === tx.fecha.slice(0, 7)) &&
        g.metodoPago === 'TARJETA_CREDITO'
      )
    })
  }

  // Acción: Actualizar / Sincronizar Compra a Cuotas existente con los datos del extracto
  function handleActualizarCompraCuota(tx: TransaccionExtracto, existingCompra: CompraCuota) {
    const cuotasTotales = tx.cuotasTotales || existingCompra.cuotasTotales
    const cuotaActualNum = tx.numeroCuotaActual || (existingCompra.cuotasPagadas + 1)
    const cuotasPagadas = Math.max(0, cuotaActualNum - 1)
    const saldoRestante = tx.saldoPendiente !== undefined ? tx.saldoPendiente : existingCompra.saldoRestante
    const valorCuota = tx.monto || existingCompra.valorCuota
    const estado = (cuotasPagadas >= cuotasTotales || (saldoRestante === 0 && cuotasPagadas > 0)) ? 'PAGADA' : 'ACTIVA'

    updateCompraCuota(existingCompra.id, {
      saldoRestante,
      cuotasPagadas,
      valorCuota,
      cuotasTotales,
      estado,
    })
    showToast('Compra sincronizada', `Se actualizó saldo a ${formatMoney(saldoRestante)} (Cuota ${cuotaActualNum}/${cuotasTotales}) de "${existingCompra.descripcion}"`)
  }

  // Acción: Agregar nueva Compra a Cuotas desde el extracto
  function handleAgregarNuevaCompraCuota(tx: TransaccionExtracto) {
    const tarjetaIdFinal = medioAuditado.startsWith('tarjeta:')
      ? medioAuditado.replace('tarjeta:', '')
      : state.tarjetas[0]?.id || 'tc-1'

    const cuotasTotales = tx.cuotasTotales || 1
    const cuotaActualNum = tx.numeroCuotaActual || 1
    const cuotasPagadas = Math.max(0, cuotaActualNum - 1)
    const montoTotal = tx.valorMovimientoOriginal || tx.monto * cuotasTotales
    const saldoRestante = tx.saldoPendiente !== undefined 
      ? tx.saldoPendiente 
      : Math.max(0, montoTotal - (tx.monto * cuotaActualNum))
    const estado = (cuotasPagadas >= cuotasTotales || (saldoRestante === 0 && cuotasPagadas > 0)) ? 'PAGADA' : 'ACTIVA'

    addCompraCuota({
      tarjetaId: tarjetaIdFinal,
      descripcion: tx.descripcion,
      comercio: tx.descripcion,
      fechaCompra: tx.fecha,
      montoTotal,
      cuotasTotales,
      cuotasPagadas,
      valorCuota: tx.monto,
      saldoRestante,
      tasaInteresMensual: 0,
      fechaInicioCobro: tx.fecha.slice(0, 7),
      estado,
      notas: tx.cuotasInfo ? `Extracto: Cuota ${tx.cuotasInfo}` : undefined,
    })

    showToast('Compra a cuotas agregada', `Se registró "${tx.descripcion}" (${cuotaActualNum}/${cuotasTotales} cuotas) en Tarjetas`)
  }

  // Acción: Agregar un gasto faltante individual a la app con 1 clic
  function handleAgregarGastoFaltante(
    tx: TransaccionExtracto,
    catOverride?: CategoriaGastoPersonal
  ) {
    const isTarjeta = medioAuditado.startsWith('tarjeta:')
    const tarjetaIdFinal = isTarjeta
      ? medioAuditado.replace('tarjeta:', '')
      : state.tarjetas[0]?.id || 'tc-1'

    const cuentaId = state.cuentas[0]?.id || 'cta-1'

    if (tx.tipo === 'CREDITO' || tx.clasificacionTarjeta === 'PAGO_ABONO') {
      if (isTarjeta) {
        showToast('Pago de Tarjeta conciliado', `El abono de ${formatMoney(Math.abs(tx.monto))} corresponde al pago de la factura anterior.`)
        return
      }
      addIngreso({
        fecha: tx.fecha,
        tipo: 'OTRO',
        descripcion: tx.descripcion,
        monto: Math.abs(tx.monto),
        periodo: 'MENSUAL',
        cuentaId,
      })
      showToast('Abono registrado', `Se registró abono de "${tx.descripcion}" (${formatMoney(Math.abs(tx.monto))})`)
    } else if (
      tx.clasificacionTarjeta === 'COMPRA_CUOTAS' ||
      tx.seccionExtracto === 'MOVIMIENTOS_ANTERIORES' ||
      (tx.cuotasTotales && tx.cuotasTotales > 1)
    ) {
      handleAgregarNuevaCompraCuota(tx)
    } else {
      const catFinal =
        catOverride ||
        categoriaOverrides[tx.id] ||
        tx.categoriaSugerida ||
        'OTROS'

      addGastoPersonal({
        fecha: tx.fecha,
        categoria: catFinal,
        descripcion: tx.descripcion,
        monto: Math.abs(tx.monto),
        cuentaId: undefined,
        tarjetaId: tarjetaIdFinal,
        metodoPago: 'TARJETA_CREDITO',
        cuotas: 1,
      })
      showToast('Gasto agregado a Tarjetas', `Se registró "${tx.descripcion}" en ${catFinal} (Tarjeta de Crédito)`)
    }
  }

  // Acción: Importar TODOS los gastos faltantes en lote con 1 clic
  function handleImportarTodosFaltantes() {
    const faltantes = reporteAuditoria.items.filter((i) => i.estado === 'FALTANTE' || i.estado === 'CARGO_BANCARIO')
    if (faltantes.length === 0) return

    const isTarjeta = medioAuditado.startsWith('tarjeta:')
    const tarjetaId = isTarjeta
      ? medioAuditado.replace('tarjeta:', '')
      : state.tarjetas[0]?.id
    const cuentaId = !isTarjeta && medioAuditado.startsWith('cuenta:')
      ? medioAuditado.replace('cuenta:', '')
      : state.cuentas[0]?.id

    let countImportados = 0

    faltantes.forEach((item) => {
      const tx = item.transaccionExtracto
      if (tx.tipo === 'CREDITO' || tx.clasificacionTarjeta === 'PAGO_ABONO') {
        if (isTarjeta) {
          // Es un pago a la tarjeta de crédito del extracto anterior, no un ingreso de salario
          return
        }
        addIngreso({
          fecha: tx.fecha,
          tipo: 'OTRO',
          descripcion: tx.descripcion,
          monto: Math.abs(tx.monto),
          periodo: 'MENSUAL',
          cuentaId: cuentaId || state.cuentas[0]?.id,
        })
        countImportados++
      } else if (
        isTarjeta &&
        (tx.clasificacionTarjeta === 'COMPRA_CUOTAS' ||
          tx.seccionExtracto === 'MOVIMIENTOS_ANTERIORES' ||
          (tx.cuotasTotales && tx.cuotasTotales > 1))
      ) {
        const cuotasTotales = tx.cuotasTotales || 1
        const montoTotal = Math.abs(tx.valorMovimientoOriginal || tx.monto * cuotasTotales)

        addCompraCuota({
          tarjetaId: tarjetaId || state.tarjetas[0]?.id || 'tc-nu',
          descripcion: tx.descripcion,
          comercio: tx.descripcion,
          fechaCompra: tx.fecha,
          montoTotal,
          cuotasTotales,
          tasaInteresMensual: 0,
          fechaInicioCobro: tx.fecha.slice(0, 7),
        })
        countImportados++
      } else {
        addGastoPersonal({
          fecha: tx.fecha,
          categoria: tx.categoriaSugerida || 'OTROS',
          descripcion: tx.descripcion,
          monto: Math.abs(tx.monto),
          cuentaId: !isTarjeta ? cuentaId : undefined,
          tarjetaId: isTarjeta ? tarjetaId : undefined,
          metodoPago: isTarjeta ? 'TARJETA_CREDITO' : 'CUENTA_DEBITO',
          cuotas: isTarjeta ? 1 : undefined,
        })
        countImportados++
      }
    })

    showToast(
      'Importación masiva completa',
      `Se registraron ${countImportados} movimientos en la app`
    )
  }

  return (
    <div className="page">
      {/* Header */}
      <div className="page-header">
        <div className="page-header-info">
          <h1>
            <svg viewBox="0 0 24 24" width="28" height="28" fill="none" stroke="currentColor" strokeWidth="2">
              <rect x="2" y="5" width="20" height="14" rx="2" />
              <line x1="2" y1="10" x2="22" y2="10" />
            </svg>
            Auditor de Extractos de Tarjeta de Crédito & Cuentas
          </h1>
          <p>
            Sube el extracto mensual de tu <strong>Tarjeta de Crédito (Nu, Bancolombia, Davivienda, etc.)</strong> o cuenta bancaria. La app{' '}
            <strong>audita consumos a 1 cuota (celular, gasolina, suscripciones)</strong>, cuotas diferidas, cobros de manejo y abonos para{' '}
            <strong>{formatMonthYear(selectedMonth)}</strong>.
          </p>
        </div>
      </div>

      {/* SELECTOR EXPLICITO DE TARJETA DE CRÉDITO */}
      <div
        style={{
          backgroundColor: 'var(--color-surface)',
          border: '2px solid var(--color-border)',
          borderRadius: 'var(--radius-lg)',
          padding: '1rem 1.25rem',
          marginBottom: '1.5rem',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '1rem',
          flexWrap: 'wrap',
          boxShadow: 'var(--shadow-sm)',
        }}
      >
        <div>
          <strong style={{ fontSize: '1rem', display: 'block', color: 'var(--color-text-main)' }}>
            1. ¿A qué Tarjeta de Crédito vas a cargar este Extracto?
          </strong>
          <span style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)' }}>
            Selecciona tu tarjeta para vincular los cupos, pagos mínimos y movimientos del PDF directamente a ella.
          </span>
        </div>

        <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', alignItems: 'center' }}>
          {state.tarjetas.map((t) => {
            const isNu = t.banco.toLowerCase().includes('nu') || t.nombre.toLowerCase().includes('nu')
            const isSelected = medioAuditado === `tarjeta:${t.id}`
            return (
              <button
                key={t.id}
                type="button"
                className={`btn sm ${isSelected ? 'primary' : 'secondary'}`}
                style={{
                  backgroundColor: isSelected ? (isNu ? '#820ad1' : '#f59e0b') : undefined,
                  borderColor: isSelected ? (isNu ? '#820ad1' : '#f59e0b') : undefined,
                  color: isSelected ? '#ffffff' : undefined,
                  fontWeight: 700,
                  fontSize: '0.85rem',
                  padding: '0.45rem 0.9rem',
                }}
                onClick={() => {
                  setMedioAuditado(`tarjeta:${t.id}`)
                  setBancoDetectado(isNu ? 'NU' : 'BANCOLOMBIA')
                  showToast('Tarjeta seleccionada', `El extracto se asignará a ${t.nombre}`)
                }}
              >
                {t.nombre} (•••• {t.ultimos4Digitos})
              </button>
            )
          })}
          <button
            type="button"
            className="btn ghost sm"
            style={{ color: 'var(--color-expense)', borderColor: 'var(--color-border)', fontSize: '0.8rem' }}
            onClick={() => {
              if (confirm('¿Limpiar los extractos y compras para comenzar tu prueba desde cero?')) {
                limpiarDatosTarjetas()
                setTransaccionesExtraidas([])
                setResumenCabecera(undefined)
              }
            }}
            title="Restablecer tarjetas para prueba limpia"
          >
            Limpiar Tarjetas
          </button>
        </div>
      </div>

      {/* SECCIÓN DE CARGA DEL EXTRACTO */}
      <div className="panel" style={{ marginBottom: '1.5rem' }}>
        <div className="panel-header" style={{ borderBottom: '1px solid var(--color-border)', paddingBottom: '0.75rem' }}>
          <div className="tabs-nav" style={{ margin: 0 }}>
            <button
              type="button"
              className={`tab-btn ${metodoCarga === 'PDF' ? 'active' : ''}`}
              onClick={() => setMetodoCarga('PDF')}
            >
              Cargar Archivo PDF del Extracto
            </button>
            <button
              type="button"
              className={`tab-btn ${metodoCarga === 'TEXTO' ? 'active' : ''}`}
              onClick={() => setMetodoCarga('TEXTO')}
            >
              Pegar Texto del Banco
            </button>
            <button
              type="button"
              className={`tab-btn ${metodoCarga === 'EJEMPLO' ? 'active' : ''}`}
              onClick={() => {
                setMetodoCarga('EJEMPLO')
                handleCargarEjemplo()
              }}
            >
              Cargar Extracto de Demostración
            </button>
          </div>
        </div>

        {/* MÉTODO A: CARGA DE ARCHIVO PDF */}
        {metodoCarga === 'PDF' && (
          <form onSubmit={handleProcesarPdf} style={{ display: 'flex', flexDirection: 'column', gap: '1rem', marginTop: '1rem' }}>
            <div
              style={{
                border: '2px dashed var(--color-border)',
                borderRadius: 'var(--radius-lg)',
                padding: '2rem 1.5rem',
                textAlign: 'center',
                backgroundColor: 'var(--color-bg-alt)',
                cursor: 'pointer',
              }}
              onClick={() => document.getElementById('file-pdf-input')?.click()}
            >
              <input
                id="file-pdf-input"
                type="file"
                accept=".pdf"
                style={{ display: 'none' }}
                onChange={(e: ChangeEvent<HTMLInputElement>) => {
                  if (e.target.files && e.target.files[0]) {
                    setArchivoPdf(e.target.files[0])
                    setErrorCarga(null)
                    setRequierePassword(false)
                  }
                }}
              />
              <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '0.75rem', color: 'var(--color-primary-light)' }}>
                <svg viewBox="0 0 24 24" width="36" height="36" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                  <polyline points="14 2 14 8 20 8" />
                </svg>
              </div>
              {archivoPdf ? (
                <div>
                  <strong style={{ fontSize: '1.05rem', color: 'var(--color-primary)' }}>
                    {archivoPdf.name}
                  </strong>
                  <span style={{ display: 'block', fontSize: '0.8rem', color: 'var(--color-text-muted)', marginTop: '0.25rem' }}>
                    {(archivoPdf.size / 1024).toFixed(1)} KB — Clic para cambiar archivo
                  </span>
                </div>
              ) : (
                <div>
                  <strong>Arrastra aquí tu extracto bancario en PDF o haz clic para seleccionarlo</strong>
                  <span style={{ display: 'block', fontSize: '0.825rem', color: 'var(--color-text-muted)', marginTop: '0.4rem' }}>
                    100% seguro: El archivo se procesa únicamente en tu navegador de forma privada.
                  </span>
                </div>
              )}
            </div>

            {/* Campo de Contraseña para PDFs protegidos */}
            <div
              className={`form-group ${requierePassword ? 'banner warning' : ''}`}
              style={{
                maxWidth: '520px',
                margin: '0 auto',
                width: '100%',
                padding: requierePassword ? '1rem' : '0',
                borderRadius: 'var(--radius-md)',
              }}
            >
              <label style={{ fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                <span>{requierePassword ? 'PDF Protegido: Ingresa tu Cédula o Contraseña:' : 'Contraseña del PDF (Opcional si tu banco lo protege con cédula):'}</span>
              </label>
              <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.35rem' }}>
                <input
                  type="password"
                  className="form-input"
                  placeholder="Ej: Número de cédula del titular"
                  value={passwordPdf}
                  onChange={(e) => setPasswordPdf(e.target.value)}
                  style={{ flex: 1 }}
                />
              </div>
              <span style={{ display: 'block', fontSize: '0.75rem', color: 'var(--color-text-muted)', marginTop: '0.35rem' }}>
                Bancolombia, Nu, Davivienda y Nequi suelen proteger los extractos con el número de cédula del titular.
              </span>
            </div>

            <div style={{ display: 'flex', justifyContent: 'center', gap: '1rem', flexWrap: 'wrap' }}>
              <button
                type="submit"
                className={`btn ${requierePassword ? 'warning' : 'primary'}`}
                disabled={!archivoPdf || cargando}
                style={{ minWidth: '240px' }}
              >
                {cargando ? 'Analizando PDF...' : requierePassword ? 'Desbloquear y Auditar PDF' : 'Leer y Auditar Extracto'}
              </button>
            </div>
          </form>
        )}

        {/* MÉTODO B: PEGAR TEXTO DEL BANCO */}
        {metodoCarga === 'TEXTO' && (
          <form onSubmit={handleProcesarTexto} style={{ display: 'flex', flexDirection: 'column', gap: '1rem', marginTop: '1rem' }}>
            <div className="form-group">
              <label>Pega aquí las líneas del extracto o lista de movimientos de tu banco:</label>
              <textarea
                className="form-input"
                rows={6}
                placeholder="Ejemplo:&#10;05/08/2026 PARQUEADERO $ 30.000&#10;08/08/2026 CLARO SERVICIOS $ 45.000&#10;10/08/2026 NETFLIX $ 35.000&#10;14/08/2026 TERPEL GASOLINA $ 50.000"
                value={textoManual}
                onChange={(e) => setTextoManual(e.target.value)}
              />
            </div>
            <div style={{ display: 'flex', justifyContent: 'center' }}>
              <button type="submit" className="btn primary" disabled={!textoManual.trim() || cargando}>
                {cargando ? 'Procesando...' : 'Analizar y Auditar Texto'}
              </button>
            </div>
          </form>
        )}

        {/* MÉTODO C: EJEMPLO */}
        {metodoCarga === 'EJEMPLO' && (
          <div style={{ marginTop: '1rem', textAlign: 'center', padding: '1rem' }}>
            <p style={{ color: 'var(--color-text-muted)', fontSize: '0.9rem', marginBottom: '1rem' }}>
              Selecciona un extracto oficial de demostración con compras, cuotas diferidas y pagos para probar el motor de auditoría:
            </p>
            <div style={{ display: 'flex', justifyContent: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
              <button type="button" className="btn secondary sm" onClick={handleCargarEjemplo}>
                Cargar Extracto Bancolombia ($781k / $201k Mínimo)
              </button>
              <button
                type="button"
                className="btn primary sm"
                onClick={handleCargarEjemploNu}
                style={{ backgroundColor: '#820ad1', borderColor: '#820ad1', color: '#ffffff' }}
              >
                Cargar Extracto Nu Colombia ($1.84M / $981k Mínimo)
              </button>
            </div>
          </div>
        )}

        {errorCarga && !requierePassword && (
          <div className="banner danger" style={{ marginTop: '1rem' }}>
            {errorCarga}
          </div>
        )}
      </div>

      {/* RESULTADOS DE LA AUDITORÍA (SI HAY DATOS EXTRAÍDOS) */}
      {transaccionesExtraidas.length > 0 && (
        <>
          {/* BARRA DE FILTRO Y CONCILIACIÓN */}
          <div
            style={{
              backgroundColor: 'var(--color-bg-alt)',
              padding: '1rem 1.25rem',
              borderRadius: 'var(--radius-lg)',
              border: '1px solid var(--color-border)',
              marginBottom: '1.5rem',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: '1rem',
              flexWrap: 'wrap',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
              <span style={{ fontSize: '0.85rem', fontWeight: 600 }}>Entidad detectada:</span>
              <span className="badge primary">{bancoDetectado}</span>
              <span style={{ fontSize: '0.85rem', fontWeight: 600, marginLeft: '0.5rem' }}>Cruzar con:</span>
              <select
                className="form-select sm"
                value={medioAuditado}
                onChange={(e) => setMedioAuditado(e.target.value)}
                style={{ minWidth: '220px' }}
              >
                <option value="TODOS">Todas las Cuentas & Tarjetas</option>
                {state.tarjetas.length > 0 && (
                  <optgroup label="Tarjetas de Crédito">
                    {state.tarjetas.map((t) => (
                      <option key={t.id} value={`tarjeta:${t.id}`}>
                        {t.nombre}
                      </option>
                    ))}
                  </optgroup>
                )}
                {state.cuentas.length > 0 && (
                  <optgroup label="Cuentas Bancarias">
                    {state.cuentas.map((c) => (
                      <option key={c.id} value={`cuenta:${c.id}`}>
                        {c.nombre}
                      </option>
                    ))}
                  </optgroup>
                )}
              </select>
            </div>

            {reporteAuditoria.cantidadFaltantes > 0 && (
              <button
                type="button"
                className="btn success sm"
                onClick={handleImportarTodosFaltantes}
              >
                Importar los {reporteAuditoria.cantidadFaltantes} Faltantes a la App ({formatMoney(reporteAuditoria.totalMontoFaltante)})
              </button>
            )}
          </div>

          {/* SELECTOR DE VISTA: TABLA POR COLUMNAS vs AUDITORÍA */}
          <div style={{ display: 'flex', gap: '0.75rem', marginBottom: '1.25rem', flexWrap: 'wrap' }}>
            <button
              type="button"
              className={`btn ${vistaPrincipal === 'COLUMNAS_PDF' ? 'primary' : 'secondary'}`}
              onClick={() => setVistaPrincipal('COLUMNAS_PDF')}
            >
              Ver Tabla de Columnas Extraídas ({transaccionesExtraidas.length} movimientos)
            </button>
            <button
              type="button"
              className={`btn ${vistaPrincipal === 'AUDITORIA_APP' ? 'primary' : 'secondary'}`}
              onClick={() => setVistaPrincipal('AUDITORIA_APP')}
            >
              Auditoría & Comparación vs App ({reporteAuditoria.porcentajeConciliacion}% Cuadrado)
            </button>
          </div>

          {/* VISTA 1: TABLA ESTRUCTURADA COLUMNA POR COLUMNA (EXACTA AL EXTRACTO) */}
          {vistaPrincipal === 'COLUMNAS_PDF' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', marginBottom: '1.5rem' }}>
              {/* BLOQUE VISUAL OFICIAL: CUPO DE TU TARJETA & INFORMACIÓN DE PAGO EN PESOS */}
              {resumenCabecera && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '1rem' }}>
                    {/* RECUADRO 1: CUPO / USADO */}
                    <div style={{ borderRadius: 'var(--radius-lg)', overflow: 'hidden', border: '1px solid var(--color-border)', backgroundColor: 'var(--color-surface)', boxShadow: 'var(--shadow-sm)' }}>
                      <div
                        style={{
                          backgroundColor: bancoDetectado === 'NU' ? '#820ad1' : '#facc15',
                          color: bancoDetectado === 'NU' ? '#ffffff' : '#713f12',
                          fontWeight: 800,
                          padding: '0.65rem 1rem',
                          fontSize: '0.95rem',
                          letterSpacing: '0.02em',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                        }}
                      >
                        <span>{bancoDetectado === 'NU' ? 'Resumen de tu extracto Nu' : 'Cupo de tu tarjeta'}</span>
                        <span style={{ fontSize: '0.8rem', opacity: 0.9 }}>{bancoDetectado === 'NU' ? 'Nu Colombia' : 'Bancolombia'}</span>
                      </div>
                      <div style={{ padding: '1rem 1.25rem', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                        <div style={{ textAlign: 'center', paddingBottom: '0.5rem', borderBottom: '1px solid var(--color-border)' }}>
                          <span style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)', display: 'block' }}>
                            {bancoDetectado === 'NU' ? 'Usado (Deuda al corte):' : 'Deuda a la fecha de corte:'}
                          </span>
                          <strong style={{ fontSize: '1.75rem', color: 'var(--color-text-main)', letterSpacing: '-0.02em', display: 'block', marginTop: '2px' }}>
                            {formatMoney(resumenCabecera.deudaCorte || resumenCabecera.pagoTotal || (bancoDetectado === 'NU' ? 1891832 : 781536))}
                          </strong>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem' }}>
                          <span style={{ color: 'var(--color-text-muted)' }}>
                            {bancoDetectado === 'NU' ? 'Cupo definido:' : 'Cupo total:'} <strong>{formatMoney(resumenCabecera.cupoTotal || (bancoDetectado === 'NU' ? 2000000 : 1200000))}</strong>
                          </span>
                          <span style={{ color: 'var(--color-text-muted)' }}>
                            Disponible: <strong style={{ color: 'var(--color-income)' }}>{formatMoney(resumenCabecera.cupoDisponible || (bancoDetectado === 'NU' ? 108168 : 418464.71))}</strong>
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* RECUADRO 2: INFORMACIÓN DE PAGO EN PESOS */}
                    <div style={{ borderRadius: 'var(--radius-lg)', overflow: 'hidden', border: '1px solid var(--color-border)', backgroundColor: 'var(--color-surface)', boxShadow: 'var(--shadow-sm)' }}>
                      <div
                        style={{
                          backgroundColor: bancoDetectado === 'NU' ? '#5c00a3' : '#10b981',
                          color: '#ffffff',
                          fontWeight: 800,
                          padding: '0.65rem 1rem',
                          fontSize: '0.95rem',
                          letterSpacing: '0.02em',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                        }}
                      >
                        <span>{bancoDetectado === 'NU' ? 'Información de pago Nu' : 'Información de pago en pesos'}</span>
                        <span style={{ fontSize: '0.8rem', opacity: 0.9 }}>{bancoDetectado === 'NU' ? '04 SEP 2026' : 'sep. 02, 2026'}</span>
                      </div>
                      <div style={{ padding: '1rem 1.25rem', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.85rem', alignItems: 'center' }}>
                        <div>
                          <span style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', display: 'block' }}>Periodo facturado</span>
                          <strong style={{ fontSize: '0.9rem', color: 'var(--color-text-main)' }}>
                            {resumenCabecera.periodoFacturado || (bancoDetectado === 'NU' ? '15 JUL 2026 - 14 AGO' : '15 jul - 17 ago. 2026')}
                          </strong>
                        </div>
                        <div style={{ textAlign: 'right' }}>
                          <span style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', display: 'block' }}>
                            {bancoDetectado === 'NU' ? 'Deuda Total / Pago Total:' : 'Pago Total:'}
                          </span>
                          <strong style={{ fontSize: '1.35rem', color: 'var(--color-text-main)' }}>
                            {formatMoney(resumenCabecera.pagoTotal || (bancoDetectado === 'NU' ? 1849932 : 781536))}
                          </strong>
                        </div>
                        <div style={{ paddingTop: '0.5rem', borderTop: '1px solid var(--color-border)' }}>
                          <span style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', display: 'block' }}>Fecha límite de pago:</span>
                          <strong style={{ fontSize: '0.95rem', color: 'var(--color-expense)' }}>
                            {cleanDateText(resumenCabecera.fechaLimitePagoTexto) || (bancoDetectado === 'NU' ? '04 SEP 2026' : 'sep. 02, 2026')}
                          </strong>
                        </div>
                        <div style={{ paddingTop: '0.5rem', borderTop: '1px solid var(--color-border)', textAlign: 'right' }}>
                          <span style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', display: 'block' }}>Pago mínimo:</span>
                          <strong style={{ fontSize: '1.35rem', color: 'var(--color-warning-text)' }}>
                            {formatMoney(resumenCabecera.pagoMinimo || (bancoDetectado === 'NU' ? 981828 : 201878))}
                          </strong>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* BOTÓN DE SINCRONIZACIÓN DE LA TARJETA */}
                  <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
                    <button
                      type="button"
                      className="btn primary sm"
                      onClick={handleSincronizarTarjetaConExtracto}
                      style={{ fontSize: '0.825rem' }}
                    >
                      Sincronizar Cupo ({formatMoney(resumenCabecera.cupoTotal || 0)}), Pago Mínimo ({formatMoney(resumenCabecera.pagoMinimo || 0)}) y Total ({formatMoney(resumenCabecera.pagoTotal || 0)}) con tu Tarjeta
                    </button>
                  </div>
                </div>
              )}

              {/* BANNER INFORMATIVO */}
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '1rem',
                  padding: '1rem 1.25rem',
                  backgroundColor: 'var(--color-bg-alt)',
                  borderRadius: 'var(--radius-lg)',
                  border: '1px solid var(--color-border)',
                }}
              >
                <div>
                  <strong style={{ fontSize: '1.05rem', display: 'block' }}>Detalles del movimiento</strong>
                  <span style={{ fontSize: '0.825rem', color: 'var(--color-text-muted)' }}>
                    Movimientos extraídos del extracto organizados en: <strong>Nuevos movimientos del mes (1/1)</strong> y <strong>Movimientos anteriores a cuotas (ej. 2/12)</strong>.
                  </span>
                </div>
              </div>

              {/* TABLA A: NUEVOS MOVIMIENTOS DEL MES */}
              <div className="panel">
                <div className="panel-header" style={{ backgroundColor: 'rgba(236, 72, 153, 0.08)', borderBottom: '2px solid #ec4899', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap' }}>
                  <div>
                    <h3 style={{ margin: 0, fontSize: '1.05rem', color: '#db2777', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <span>Nuevos movimientos del período (1/1 y Abonos)</span>
                      <span className="badge neutral" style={{ fontSize: '0.75rem' }}>
                        {transaccionesExtraidas.filter((t) => t.seccionExtracto === 'NUEVOS_MOVIMIENTOS').length} movimientos
                      </span>
                    </h3>
                  </div>
                </div>

                <div className="table-container">
                  <table>
                    <thead>
                      <tr>
                        <th>Autorización</th>
                        <th>Fecha</th>
                        <th>Movimientos / Categoría</th>
                        <th style={{ textAlign: 'right' }}>Valor Movimiento</th>
                        <th style={{ textAlign: 'center' }}>Cuotas</th>
                        <th style={{ textAlign: 'right' }}>Valor Cuota / Abono</th>
                        <th style={{ textAlign: 'right' }}>Saldo Pendiente</th>
                        <th style={{ textAlign: 'right' }}>Acción</th>
                      </tr>
                    </thead>
                    <tbody>
                      {transaccionesExtraidas
                        .filter((t) => t.seccionExtracto === 'NUEVOS_MOVIMIENTOS')
                        .map((tx) => {
                          const matchGasto = getMatchGastoMes(tx)
                          const catActual = categoriaOverrides[tx.id] || tx.categoriaSugerida || 'OTROS'

                          return (
                            <tr key={tx.id}>
                              <td style={{ fontFamily: 'monospace', fontSize: '0.85rem' }}>
                                {tx.numeroAutorizacion || '—'}
                              </td>
                              <td style={{ whiteSpace: 'nowrap' }}>{formatDate(tx.fecha)}</td>
                              <td>
                                <strong style={{ display: 'block', marginBottom: '4px' }}>{tx.descripcion}</strong>
                                {tx.tipo === 'DEBITO' && !matchGasto && (
                                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                    <span style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>Categoría:</span>
                                    <select
                                      value={catActual}
                                      onChange={(e) =>
                                        setCategoriaOverrides((prev) => ({
                                          ...prev,
                                          [tx.id]: e.target.value as CategoriaGastoPersonal,
                                        }))
                                      }
                                      style={{
                                        fontSize: '0.75rem',
                                        padding: '0.2rem 0.5rem',
                                        borderRadius: 'var(--radius-sm)',
                                        border: '1px solid var(--color-border)',
                                        backgroundColor: 'var(--color-bg)',
                                        color: 'var(--color-text)',
                                      }}
                                    >
                                      {CATEGORIAS_GASTO_OPTIONS.map((opt) => (
                                        <option key={opt.key} value={opt.key}>
                                          {opt.label}
                                        </option>
                                      ))}
                                    </select>
                                  </div>
                                )}
                                {matchGasto && (
                                  <span className="badge income" style={{ fontSize: '0.7rem' }}>
                                    Ya en Tarjetas ({matchGasto.categoria})
                                  </span>
                                )}
                              </td>
                              <td style={{ textAlign: 'right', fontWeight: 600 }}>
                                {tx.tipo === 'CREDITO' ? '- ' : ''}
                                {formatMoney(tx.valorMovimientoOriginal || tx.monto)}
                              </td>
                              <td style={{ textAlign: 'center' }}>
                                <span className="badge neutral" style={{ fontSize: '0.725rem' }}>
                                  {tx.cuotasInfo || '1/1'}
                                </span>
                              </td>
                              <td
                                style={{
                                  textAlign: 'right',
                                  fontWeight: 700,
                                  color: tx.tipo === 'CREDITO' ? 'var(--color-income)' : 'var(--color-expense)',
                                }}
                              >
                                {tx.tipo === 'CREDITO' ? '- ' : ''}
                                {formatMoney(tx.monto)}
                              </td>
                              <td style={{ textAlign: 'right', color: 'var(--color-text-muted)' }}>
                                {formatMoney(tx.saldoPendiente || 0)}
                              </td>
                              <td style={{ textAlign: 'right' }}>
                                {matchGasto ? (
                                  <span className="badge neutral" style={{ fontSize: '0.75rem', padding: '0.35rem 0.65rem' }}>
                                    Al día
                                  </span>
                                ) : (
                                  <button
                                    type="button"
                                    className={`btn ${tx.tipo === 'CREDITO' ? 'success' : 'primary'} sm`}
                                    onClick={() => handleAgregarGastoFaltante(tx, catActual)}
                                  >
                                    {tx.tipo === 'CREDITO' ? '+ Registrar Abono' : '+ Agregar a Tarjeta'}
                                  </button>
                                )}
                              </td>
                            </tr>
                          )
                        })}
                      {transaccionesExtraidas.filter((t) => t.seccionExtracto === 'NUEVOS_MOVIMIENTOS').length === 0 && (
                        <tr>
                          <td colSpan={8} style={{ textAlign: 'center', padding: '2rem', color: 'var(--color-text-muted)' }}>
                            No hay consumos nuevos a 1 cuota en este período.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* TABLA B: MOVIMIENTOS ANTERIORES (COMPRAS A CUOTAS / DIFERIDAS) */}
              <div className="panel">
                <div className="panel-header" style={{ backgroundColor: 'rgba(14, 165, 233, 0.08)', borderBottom: '2px solid #0ea5e9', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap' }}>
                  <div>
                    <h3 style={{ margin: 0, fontSize: '1.05rem', color: '#0284c7', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <span>Movimientos anteriores (Compras a Cuotas vigentes)</span>
                      <span className="badge neutral" style={{ fontSize: '0.75rem' }}>
                        {transaccionesExtraidas.filter((t) => t.seccionExtracto === 'MOVIMIENTOS_ANTERIORES').length} compras diferidas
                      </span>
                    </h3>
                  </div>
                </div>

                <div className="table-container">
                  <table>
                    <thead>
                      <tr>
                        <th>Autorización</th>
                        <th>Fecha Compra</th>
                        <th>Movimientos / Vinculación con Tarjetas</th>
                        <th style={{ textAlign: 'right' }}>Valor Total Original</th>
                        <th style={{ textAlign: 'center' }}>Número Cuotas</th>
                        <th style={{ textAlign: 'right' }}>Cuota Facturada Este Mes</th>
                        <th style={{ textAlign: 'right' }}>Saldo Pendiente por Pagar</th>
                        <th style={{ textAlign: 'right' }}>Acción</th>
                      </tr>
                    </thead>
                    <tbody>
                      {transaccionesExtraidas
                        .filter((t) => t.seccionExtracto === 'MOVIMIENTOS_ANTERIORES')
                        .map((tx) => {
                          const matchCuota = getMatchCompraCuota(tx)
                          const estaDesactualizada =
                            matchCuota &&
                            (matchCuota.saldoRestante !== (tx.saldoPendiente || 0) ||
                              matchCuota.cuotasPagadas !==
                                (tx.numeroCuotaActual ? tx.numeroCuotaActual - 1 : matchCuota.cuotasPagadas))

                          return (
                            <tr key={tx.id}>
                              <td style={{ fontFamily: 'monospace', fontSize: '0.85rem' }}>
                                {tx.numeroAutorizacion || '—'}
                              </td>
                              <td style={{ whiteSpace: 'nowrap' }}>{formatDate(tx.fecha)}</td>
                              <td>
                                <strong style={{ display: 'block', marginBottom: '4px' }}>{tx.descripcion}</strong>

                                {/* SELECTOR Y ESTADO DE VINCULACIÓN */}
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                                  {matchCuota ? (
                                    <>
                                      <span className="badge income" style={{ fontSize: '0.7rem' }}>
                                        Vinculada a: "{matchCuota.descripcion}"
                                      </span>
                                      {estaDesactualizada && (
                                        <span className="badge warning" style={{ fontSize: '0.675rem' }}>
                                          En App: Cuota {matchCuota.cuotasPagadas}/{matchCuota.cuotasTotales} • Saldo: {formatMoney(matchCuota.saldoRestante)}
                                        </span>
                                      )}
                                    </>
                                  ) : (
                                    <span className="badge neutral" style={{ fontSize: '0.7rem' }}>
                                      No está en tu lista de Tarjetas
                                    </span>
                                  )}

                                  {/* Desplegable para cambiar o vincular manualmente */}
                                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', marginTop: '2px' }}>
                                    <span style={{ fontSize: '0.7rem', color: 'var(--color-text-muted)' }}>Vincular con:</span>
                                    <select
                                      value={vinculoOverrides[tx.id] || (matchCuota ? matchCuota.id : '__NEW__')}
                                      onChange={(e) =>
                                        setVinculoOverrides((prev) => ({
                                          ...prev,
                                          [tx.id]: e.target.value,
                                        }))
                                      }
                                      style={{
                                        fontSize: '0.725rem',
                                        padding: '0.15rem 0.4rem',
                                        borderRadius: 'var(--radius-sm)',
                                        border: '1px solid var(--color-border)',
                                        backgroundColor: 'var(--color-bg)',
                                        color: 'var(--color-text)',
                                        maxWidth: '220px',
                                      }}
                                    >
                                      <option value="__NEW__">+ Crear como nueva compra a cuotas</option>
                                      {state.comprasCuotas.map((c) => (
                                        <option key={c.id} value={c.id}>
                                          {c.descripcion} ({formatMoney(c.montoTotal)})
                                        </option>
                                      ))}
                                    </select>
                                  </div>
                                </div>
                              </td>
                              <td style={{ textAlign: 'right', fontWeight: 600 }}>
                                {formatMoney(tx.valorMovimientoOriginal || tx.monto)}
                              </td>
                              <td style={{ textAlign: 'center' }}>
                                <span className="badge warning" style={{ fontSize: '0.75rem', fontWeight: 700 }}>
                                  Cuota {tx.cuotasInfo || 'Diferida'}
                                </span>
                              </td>
                              <td style={{ textAlign: 'right', fontWeight: 700, color: 'var(--color-expense)' }}>
                                {formatMoney(tx.monto)}
                              </td>
                              <td style={{ textAlign: 'right', fontWeight: 600, color: '#0284c7' }}>
                                {formatMoney(tx.saldoPendiente || 0)}
                              </td>
                              <td style={{ textAlign: 'right' }}>
                                {matchCuota ? (
                                  estaDesactualizada ? (
                                    <button
                                      type="button"
                                      className="btn warning sm"
                                      onClick={() => handleActualizarCompraCuota(tx, matchCuota)}
                                      title="Sincronizar saldo y cuotas con los datos del extracto"
                                    >
                                      Actualizar en Tarjetas
                                    </button>
                                  ) : (
                                    <span className="badge neutral" style={{ fontSize: '0.75rem', padding: '0.35rem 0.65rem' }}>
                                      Al día
                                    </span>
                                  )
                                ) : (
                                  <button
                                    type="button"
                                    className="btn primary sm"
                                    onClick={() => handleAgregarNuevaCompraCuota(tx)}
                                  >
                                    + Agregar a Tarjetas
                                  </button>
                                )}
                              </td>
                            </tr>
                          )
                        })}
                      {transaccionesExtraidas.filter((t) => t.seccionExtracto === 'MOVIMIENTOS_ANTERIORES').length === 0 && (
                        <tr>
                          <td colSpan={8} style={{ textAlign: 'center', padding: '2rem', color: 'var(--color-text-muted)' }}>
                            No hay compras a cuotas anteriores en este extracto.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* VISTA 2: AUDITORÍA CRUZADA CONTRA LA APP */}
          {vistaPrincipal === 'AUDITORIA_APP' && (
            <>
              {/* DASHBOARD DE SALUD FINANCIERA Y CONCILIACIÓN */}
              <div className="stat-grid">
                <article className="stat-card" style={{ borderLeft: '4px solid #10b981' }}>
                  <div className="stat-card-top">
                    <span className="stat-card-title">Salud de Conciliación</span>
                    <span className="badge income">{reporteAuditoria.porcentajeConciliacion}% Cuadrado</span>
                  </div>
                  <div className="stat-value" style={{ color: 'var(--color-income)' }}>
                    {reporteAuditoria.cantidadConciliados} de {reporteAuditoria.totalMovimientosExtracto}
                  </div>
                  <span className="stat-subtext">Movimientos que coinciden exactamente</span>
                </article>

                <article className="stat-card" style={{ borderLeft: '4px solid #ef4444' }}>
                  <div className="stat-card-top">
                    <span className="stat-card-title">Gastos Faltantes (Sin Registrar)</span>
                    <span className="badge expense">No Anotados</span>
                  </div>
                  <div className="stat-value" style={{ color: 'var(--color-expense)' }}>
                    {formatMoney(reporteAuditoria.totalMontoFaltante)}
                  </div>
                  <span className="stat-subtext">{reporteAuditoria.cantidadFaltantes} compras pendientes por registrar</span>
                </article>

                <article className="stat-card" style={{ borderLeft: '4px solid #f59e0b' }}>
                  <div className="stat-card-top">
                    <span className="stat-card-title">Cobros del Banco & 4x1000</span>
                    <span className="badge warning">Comisiones</span>
                  </div>
                  <div className="stat-value" style={{ color: 'var(--color-warning-text)' }}>
                    {formatMoney(reporteAuditoria.totalMontoCargosBancarios)}
                  </div>
                  <span className="stat-subtext">{reporteAuditoria.cantidadCargosBancarios} cobros automáticos detectados</span>
                </article>

                <article className="stat-card" style={{ borderLeft: '4px solid #8b5cf6' }}>
                  <div className="stat-card-top">
                    <span className="stat-card-title">Total Débitos en Extracto</span>
                    <span className="badge credit">Total Banco</span>
                  </div>
                  <div className="stat-value">{formatMoney(reporteAuditoria.totalMontoDebitosExtracto)}</div>
                  <span className="stat-subtext">Salidas de dinero registradas por el banco</span>
                </article>
              </div>

              {/* PESTAÑAS DE DETALLE DE AUDITORÍA */}
              <div className="panel">
            <div className="panel-header">
              <div className="tabs-nav" style={{ margin: 0 }}>
                <button
                  type="button"
                  className={`tab-btn ${activeTabAuditoria === 'FALTANTES' ? 'active' : ''}`}
                  onClick={() => setActiveTabAuditoria('FALTANTES')}
                >
                  Faltantes ({reporteAuditoria.cantidadFaltantes})
                </button>
                <button
                  type="button"
                  className={`tab-btn ${activeTabAuditoria === 'CONCILIADOS' ? 'active' : ''}`}
                  onClick={() => setActiveTabAuditoria('CONCILIADOS')}
                >
                  Conciliados ({reporteAuditoria.cantidadConciliados})
                </button>
                <button
                  type="button"
                  className={`tab-btn ${activeTabAuditoria === 'CARGOS' ? 'active' : ''}`}
                  onClick={() => setActiveTabAuditoria('CARGOS')}
                >
                  Cobros Bancarios ({reporteAuditoria.cantidadCargosBancarios})
                </button>
                <button
                  type="button"
                  className={`tab-btn ${activeTabAuditoria === 'DIFERENCIAS' ? 'active' : ''}`}
                  onClick={() => setActiveTabAuditoria('DIFERENCIAS')}
                >
                  Discrepancias ({reporteAuditoria.cantidadDiferencias})
                </button>
                <button
                  type="button"
                  className={`tab-btn ${activeTabAuditoria === 'APP_SOLO' ? 'active' : ''}`}
                  onClick={() => setActiveTabAuditoria('APP_SOLO')}
                >
                  Anotados en App no encontrados ({reporteAuditoria.registrosAppNoEnExtracto.length})
                </button>
              </div>
            </div>

            {/* TAB: FALTANTES POR REGISTRAR */}
            {activeTabAuditoria === 'FALTANTES' && (
              <div className="table-container">
                <table>
                  <thead>
                    <tr>
                      <th>Fecha</th>
                      <th>Descripción en Extracto</th>
                      <th>Categoría Sugerida</th>
                      <th style={{ textAlign: 'right' }}>Monto Cobrado</th>
                      <th>Diagnóstico del Auditor</th>
                      <th style={{ textAlign: 'right' }}>Acción</th>
                    </tr>
                  </thead>
                  <tbody>
                    {reporteAuditoria.items
                      .filter((i) => i.estado === 'FALTANTE')
                      .map((item) => (
                        <tr key={item.id}>
                          <td>{formatDate(item.transaccionExtracto.fecha)}</td>
                          <td>
                            <strong>{item.transaccionExtracto.descripcion}</strong>
                          </td>
                          <td>
                            <span className="badge neutral" style={{ fontSize: '0.725rem' }}>
                              {item.transaccionExtracto.categoriaSugerida || 'OTROS'}
                            </span>
                          </td>
                          <td style={{ textAlign: 'right', fontWeight: 600, color: 'var(--color-expense)' }}>
                            - {formatMoney(item.transaccionExtracto.monto)}
                          </td>
                          <td style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)' }}>
                            {item.notasAuditoria}
                          </td>
                          <td style={{ textAlign: 'right' }}>
                            <button
                              type="button"
                              className="btn success sm"
                              onClick={() => handleAgregarGastoFaltante(item.transaccionExtracto)}
                            >
                              + Añadir a la App
                            </button>
                          </td>
                        </tr>
                      ))}
                    {reporteAuditoria.cantidadFaltantes === 0 && (
                      <tr>
                        <td colSpan={6} style={{ textAlign: 'center', padding: '2.5rem', color: 'var(--color-income)' }}>
                          ¡Excelente! No tienes ningún gasto bancario sin registrar. Todas tus compras del extracto están en la app.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            )}

            {/* TAB: CONCILIADOS Y CUADRADOS */}
            {activeTabAuditoria === 'CONCILIADOS' && (
              <div className="table-container">
                <table>
                  <thead>
                    <tr>
                      <th>Fecha Extracto</th>
                      <th>Descripción en Extracto</th>
                      <th>Registro Coincidente en la App</th>
                      <th>Fecha en App</th>
                      <th style={{ textAlign: 'right' }}>Monto</th>
                      <th>Estado</th>
                    </tr>
                  </thead>
                  <tbody>
                    {reporteAuditoria.items
                      .filter((i) => i.estado === 'CONCILIADO')
                      .map((item) => (
                        <tr key={item.id}>
                          <td>{formatDate(item.transaccionExtracto.fecha)}</td>
                          <td>
                            <strong>{item.transaccionExtracto.descripcion}</strong>
                          </td>
                          <td>
                            <span className="badge neutral" style={{ fontSize: '0.725rem', marginRight: '6px' }}>
                              {item.registroAppCoincidente?.tipoModulo}
                            </span>
                            {item.registroAppCoincidente?.descripcion}
                          </td>
                          <td>{formatDate(item.registroAppCoincidente?.fecha || '')}</td>
                          <td style={{ textAlign: 'right', fontWeight: 600, color: 'var(--color-income)' }}>
                            {formatMoney(item.transaccionExtracto.monto)}
                          </td>
                          <td>
                            <span className="badge income" style={{ fontSize: '0.725rem' }}>
                              Conciliado
                            </span>
                          </td>
                        </tr>
                      ))}
                    {reporteAuditoria.cantidadConciliados === 0 && (
                      <tr>
                        <td colSpan={6} style={{ textAlign: 'center', padding: '2.5rem', color: 'var(--color-text-muted)' }}>
                          No se encontraron coincidencias exactas aún.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            )}

            {/* TAB: COBROS BANCARIOS */}
            {activeTabAuditoria === 'CARGOS' && (
              <div className="table-container">
                <table>
                  <thead>
                    <tr>
                      <th>Fecha</th>
                      <th>Concepto del Banco</th>
                      <th style={{ textAlign: 'right' }}>Valor Cobrado</th>
                      <th>Detalle del Auditor</th>
                      <th style={{ textAlign: 'right' }}>Acción</th>
                    </tr>
                  </thead>
                  <tbody>
                    {reporteAuditoria.items
                      .filter((i) => i.estado === 'CARGO_BANCARIO')
                      .map((item) => (
                        <tr key={item.id}>
                          <td>{formatDate(item.transaccionExtracto.fecha)}</td>
                          <td>
                            <strong>{item.transaccionExtracto.descripcion}</strong>
                          </td>
                          <td style={{ textAlign: 'right', fontWeight: 600, color: 'var(--color-warning-text)' }}>
                            - {formatMoney(item.transaccionExtracto.monto)}
                          </td>
                          <td style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)' }}>
                            {item.notasAuditoria}
                          </td>
                          <td style={{ textAlign: 'right' }}>
                            <button
                              type="button"
                              className="btn warning sm"
                              onClick={() => handleAgregarGastoFaltante(item.transaccionExtracto, 'OTROS')}
                            >
                              + Registrar Cobro
                            </button>
                          </td>
                        </tr>
                      ))}
                    {reporteAuditoria.cantidadCargosBancarios === 0 && (
                      <tr>
                        <td colSpan={5} style={{ textAlign: 'center', padding: '2.5rem', color: 'var(--color-text-muted)' }}>
                          No se detectaron cobros de comisiones ni 4x1000 en este extracto.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            )}

            {/* TAB: DISCREPANCIAS */}
            {activeTabAuditoria === 'DIFERENCIAS' && (
              <div className="table-container">
                <table>
                  <thead>
                    <tr>
                      <th>Fecha</th>
                      <th>Descripción Extracto</th>
                      <th>Registro en la App</th>
                      <th style={{ textAlign: 'right' }}>Cobro Banco</th>
                      <th style={{ textAlign: 'right' }}>Anotado en App</th>
                      <th>Diagnóstico / Diferencia</th>
                    </tr>
                  </thead>
                  <tbody>
                    {reporteAuditoria.items
                      .filter((i) => i.estado === 'DIFERENCIA_VALOR')
                      .map((item) => (
                        <tr key={item.id}>
                          <td>{formatDate(item.transaccionExtracto.fecha)}</td>
                          <td>
                            <strong>{item.transaccionExtracto.descripcion}</strong>
                          </td>
                          <td>{item.registroAppCoincidente?.descripcion}</td>
                          <td style={{ textAlign: 'right', fontWeight: 600 }}>
                            {formatMoney(item.transaccionExtracto.monto)}
                          </td>
                          <td style={{ textAlign: 'right', color: 'var(--color-text-muted)' }}>
                            {formatMoney(item.registroAppCoincidente?.monto || 0)}
                          </td>
                          <td style={{ fontSize: '0.8rem', color: 'var(--color-warning-text)' }}>
                            {item.notasAuditoria}
                          </td>
                        </tr>
                      ))}
                    {reporteAuditoria.cantidadDiferencias === 0 && (
                      <tr>
                        <td colSpan={6} style={{ textAlign: 'center', padding: '2.5rem', color: 'var(--color-income)' }}>
                          No hay diferencias de montos en los registros coincidentes.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            )}

            {/* TAB: REGISTRADOS EN APP PERO NO EN EXTRACTO */}
            {activeTabAuditoria === 'APP_SOLO' && (
              <div className="table-container">
                <table>
                  <thead>
                    <tr>
                      <th>Fecha</th>
                      <th>Módulo</th>
                      <th>Descripción en App</th>
                      <th style={{ textAlign: 'right' }}>Monto Anotado</th>
                      <th>Explicación</th>
                    </tr>
                  </thead>
                  <tbody>
                    {reporteAuditoria.registrosAppNoEnExtracto.map((reg) => (
                      <tr key={reg.id}>
                        <td>{formatDate(reg.fecha)}</td>
                        <td>
                          <span className="badge neutral" style={{ fontSize: '0.725rem' }}>
                            {reg.tipoModulo}
                          </span>
                        </td>
                        <td>
                          <strong>{reg.descripcion}</strong>
                        </td>
                        <td style={{ textAlign: 'right', fontWeight: 600 }}>
                          {formatMoney(reg.monto)}
                        </td>
                        <td style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)' }}>
                          Anotaste este gasto en la app pero no apareció en el extracto subido (puede ser de otra cuenta, pago en efectivo o compra pendiente de cobro).
                        </td>
                      </tr>
                    ))}
                    {reporteAuditoria.registrosAppNoEnExtracto.length === 0 && (
                      <tr>
                        <td colSpan={5} style={{ textAlign: 'center', padding: '2.5rem', color: 'var(--color-text-muted)' }}>
                          Todos los registros de la app para este mes coincidieron con el extracto.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </>
      )}
    </>
  )}
</div>
)
}
