import { useState, useMemo, type FormEvent } from 'react'
import { useFinance } from '../context/FinanceContext'
import { Modal } from '../components/Modal'
import { DatePickerInput } from '../components/DatePickerInput'
import {
  calcularCuotaMensual,
  generarTablaAmortizacion,
  type DetalleTablaAmortizacion,
} from '../utils/financialCalculations'
import { formatMoney, formatDate, formatMonthYear, cleanDateText, getLocalTodayISO } from '../utils/formatters'
import type { FranquiciaTarjeta, CompraCuota, TarjetaCredito } from '../types/finance'

export function getCardBrandInfo(tarjeta?: TarjetaCredito) {
  const nombre = tarjeta?.nombre?.toLowerCase() || ''
  const banco = tarjeta?.banco?.toLowerCase() || ''
  const isNu = nombre.includes('nu') || banco.includes('nu') || tarjeta?.color === '#820ad1'
  const isBancolombia =
    nombre.includes('bancolombia') || banco.includes('bancolombia') || tarjeta?.color === '#f59e0b'

  if (isNu) {
    return {
      icon: '',
      name: tarjeta?.nombre || 'Nu Gold',
      color: '#9333ea',
      bgColor: 'rgba(147, 51, 234, 0.14)',
      borderColor: 'rgba(147, 51, 234, 0.45)',
      textColor: '#c084fc',
      progressBar: 'linear-gradient(90deg, #9333ea, #a855f7)',
    }
  }

  if (isBancolombia) {
    return {
      icon: '',
      name: tarjeta?.nombre || 'Bancolombia',
      color: '#f59e0b',
      bgColor: 'rgba(245, 158, 11, 0.14)',
      borderColor: 'rgba(245, 158, 11, 0.45)',
      textColor: '#fbbf24',
      progressBar: 'linear-gradient(90deg, #f59e0b, #fbbf24)',
    }
  }

  const customColor = tarjeta?.color || '#3b82f6'
  return {
    icon: '',
    name: tarjeta?.nombre || 'Tarjeta',
    color: customColor,
    bgColor: `${customColor}20`,
    borderColor: `${customColor}50`,
    textColor: customColor,
    progressBar: customColor,
  }
}

export function TarjetasPage() {
  const {
    state,
    selectedMonth,
    deudaTotalTarjetas,
    cupoTotalTarjetas,
    cupoDisponibleTarjetas,
    totalCuotasTarjetasMes,
    totalGastos1CuotaTarjetasMes,
    totalExtractoTarjetasMes,
    addTarjeta,
    deleteTarjeta,
    addCompraCuota,
    updateCompraCuota,
    pagarCuotaCompra,
    revertirPagoCuotaCompra,
    pagarTarjeta,
    prepagarCompra,
    deleteCompraCuota,
    limpiarDatosTarjetas,
    showToast,
  } = useFinance()

  const [modalTarjetaOpen, setModalTarjetaOpen] = useState(false)
  const [modalCompraOpen, setModalCompraOpen] = useState(false)
  const [modalAmortizacion, setModalAmortizacion] = useState<CompraCuota | null>(null)
  const [modalPagarCuota, setModalPagarCuota] = useState<CompraCuota | null>(null)
  const [modalRevertirCuota, setModalRevertirCuota] = useState<CompraCuota | null>(null)
  const [cuentaReembolsoId, setCuentaReembolsoId] = useState(state.cuentas[0]?.id || '')
  const [modalPagarTarjeta, setModalPagarTarjeta] = useState<{
    tarjeta: TarjetaCredito
    pagoMinimo: number
    pagoTotal: number
    consumos1Cuota: number
  } | null>(null)
  const [tipoPagoSeleccionado, setTipoPagoSeleccionado] = useState<'TOTAL' | 'MINIMO' | 'PERSONALIZADO'>('TOTAL')
  const [montoPersonalizado, setMontoPersonalizado] = useState('')
  const [cuentaPagoId, setCuentaPagoId] = useState(state.cuentas[0]?.id || '')
  const [filtroPeriodo1Cuota, setFiltroPeriodo1Cuota] = useState<'MES_ACTUAL' | 'TODOS'>('MES_ACTUAL')
  const [tarjetaSeleccionadaTab, setTarjetaSeleccionadaTab] = useState<string>('TODAS')

  // Estado para la edición de nombres y detalles de compras diferidas
  const [compraAEditar, setCompraAEditar] = useState<CompraCuota | null>(null)
  const [editDescripcion, setEditDescripcion] = useState('')
  const [editComercio, setEditComercio] = useState('')
  const [editNotas, setEditNotas] = useState('')
  const [editValorCuota, setEditValorCuota] = useState('')
  const [editCuotasPagadas, setEditCuotasPagadas] = useState('0')
  const [editSaldoRestante, setEditSaldoRestante] = useState('0')

  const handleOpenEditCompra = (compra: CompraCuota) => {
    setCompraAEditar(compra)
    setEditDescripcion(compra.descripcion)
    setEditComercio(compra.comercio || '')
    setEditNotas(compra.notas || '')
    setEditValorCuota(String(compra.valorCuota))
    setEditCuotasPagadas(String(compra.cuotasPagadas ?? 0))
    setEditSaldoRestante(String(compra.saldoRestante ?? 0))
  }

  const handleGuardarEdicionCompra = (e: FormEvent) => {
    e.preventDefault()
    if (!compraAEditar || !editDescripcion.trim()) return

    const updates: Partial<CompraCuota> = {
      descripcion: editDescripcion.trim(),
      comercio: editComercio.trim() || undefined,
      notas: editNotas.trim() || undefined,
    }

    if (editValorCuota && !isNaN(Number(editValorCuota)) && Number(editValorCuota) > 0) {
      updates.valorCuota = Number(editValorCuota)
    }

    if (editCuotasPagadas !== '' && !isNaN(Number(editCuotasPagadas))) {
      const cp = Math.max(0, Math.min(compraAEditar.cuotasTotales, Number(editCuotasPagadas)))
      updates.cuotasPagadas = cp
      if (cp >= compraAEditar.cuotasTotales) {
        updates.estado = 'PAGADA'
      } else if (compraAEditar.estado === 'PAGADA') {
        updates.estado = 'ACTIVA'
      }
    }

    if (editSaldoRestante !== '' && !isNaN(Number(editSaldoRestante))) {
      const sr = Math.max(0, Number(editSaldoRestante))
      updates.saldoRestante = sr
      if (sr === 0 && (updates.cuotasPagadas ?? compraAEditar.cuotasPagadas) > 0) {
        updates.estado = 'PAGADA'
      }
    }

    updateCompraCuota(compraAEditar.id, updates)
    showToast('Compra actualizada', `Se guardaron los ajustes de "${editDescripcion.trim()}"`)
    setCompraAEditar(null)
  }

  // Consumos a 1 cuota registrados con tarjeta de crédito
  const consumos1CuotaMes = useMemo(() => {
    const items: Array<{
      id: string
      fecha: string
      categoria: string
      descripcion: string
      monto: number
      tarjetaId: string
      tipoOrigen: 'PERSONAL' | 'ALIMENTACION' | 'HOGAR' | 'SERVICIO'
    }> = []

    const defaultTarjetaId = state.tarjetas[0]?.id || 'tc-1'

    state.gastosPersonales
      .filter((g) => {
        const matchFecha = filtroPeriodo1Cuota === 'TODOS' || g.fecha.startsWith(selectedMonth)
        const matchTarjeta = Boolean(g.tarjetaId) || g.metodoPago === 'TARJETA_CREDITO'
        return matchFecha && matchTarjeta
      })
      .forEach((g) => {
        items.push({
          id: g.id,
          fecha: g.fecha,
          categoria:
            g.categoria === 'CELULAR'
              ? 'Celular'
              : g.categoria === 'GASOLINA'
              ? 'Gasolina'
              : g.categoria === 'SUSCRIPCIONES'
              ? 'Suscripción'
              : g.categoria === 'PARQUEADERO'
              ? 'Parqueadero'
              : g.categoria === 'RESTAURANTES_COMIDAS_FUERA'
              ? 'Restaurante'
              : g.categoria === 'TRANSPORTE'
              ? 'Transporte'
              : 'Personal',
          descripcion: g.descripcion,
          monto: g.monto,
          tarjetaId: g.tarjetaId || defaultTarjetaId,
          tipoOrigen: 'PERSONAL',
        })
      })

    state.alimentacion
      .filter((a) => {
        const matchFecha = filtroPeriodo1Cuota === 'TODOS' || a.fecha.startsWith(selectedMonth)
        const matchTarjeta = Boolean(a.tarjetaId) || a.metodoPago === 'TARJETA_CREDITO'
        return matchFecha && matchTarjeta
      })
      .forEach((a) => {
        items.push({
          id: a.id,
          fecha: a.fecha,
          categoria: 'Comida',
          descripcion: a.descripcion,
          monto: a.monto,
          tarjetaId: a.tarjetaId || defaultTarjetaId,
          tipoOrigen: 'ALIMENTACION',
        })
      })

    state.comprasHogar
      .filter((c) => {
        const matchFecha = filtroPeriodo1Cuota === 'TODOS' || c.fecha.startsWith(selectedMonth)
        const matchTarjeta = Boolean(c.tarjetaId) || c.metodoPago === 'TARJETA_CREDITO'
        return matchFecha && matchTarjeta
      })
      .forEach((c) => {
        items.push({
          id: c.id,
          fecha: c.fecha,
          categoria: 'Hogar',
          descripcion: c.descripcion,
          monto: c.monto,
          tarjetaId: c.tarjetaId || defaultTarjetaId,
          tipoOrigen: 'HOGAR',
        })
      })

    ;(state.servicios || [])
      .filter((s) => {
        const matchFecha =
          filtroPeriodo1Cuota === 'TODOS' ||
          s.periodo === selectedMonth ||
          s.fechaVencimiento.startsWith(selectedMonth)
        const matchTarjeta = Boolean(s.tarjetaId) || s.metodoPago === 'TARJETA_CREDITO'
        return matchFecha && matchTarjeta
      })
      .forEach((s) => {
        items.push({
          id: s.id,
          fecha: s.fechaPago || s.fechaVencimiento,
          categoria: `Servicio: ${s.tipo}`,
          descripcion: s.nombre,
          monto: s.monto,
          tarjetaId: s.tarjetaId || defaultTarjetaId,
          tipoOrigen: 'SERVICIO',
        })
      })

    return items.sort((a, b) => b.fecha.localeCompare(a.fecha))
  }, [state.gastosPersonales, state.alimentacion, state.comprasHogar, state.servicios, state.tarjetas, selectedMonth, filtroPeriodo1Cuota])

  // Form State Tarjeta
  const [nombreTc, setNombreTc] = useState('')
  const [bancoTc, setBancoTc] = useState('')
  const [digitosTc, setDigitosTc] = useState('')
  const [franquiciaTc, setFranquiciaTc] = useState<FranquiciaTarjeta>('MASTERCARD')
  const [cupoTotalTc, setCupoTotalTc] = useState('')
  const [diaCorteTc, setDiaCorteTc] = useState('15')
  const [diaLimiteTc, setDiaLimiteTc] = useState('25')
  const [tasaTc, setTasaTc] = useState('2.1')
  const [colorTc, setColorTc] = useState('#8b5cf6')

  // Form State Compra Cuotas
  const [tarjetaIdCompra, setTarjetaIdCompra] = useState(state.tarjetas[0]?.id || '')
  const [descCompra, setDescCompra] = useState('')
  const [comercioCompra, setComercioCompra] = useState('')
  const [montoCompra, setMontoCompra] = useState('')
  const [fechaCompra, setFechaCompra] = useState(getLocalTodayISO())
  const [cuotasCompra, setCuotasCompra] = useState('12')
  const [tasaCompra, setTasaCompra] = useState('2.1')
  const [mesInicioCobro, setMesInicioCobro] = useState(selectedMonth)
  const [notasCompra, setNotasCompra] = useState('')

  // Cuota calculada en tiempo real
  const cuotaSimulada = useMemo(() => {
    const m = Number(montoCompra) || 0
    const c = Math.max(1, Number(cuotasCompra) || 1)
    const t = Number(tasaCompra) || 0
    return calcularCuotaMensual(m, c, t)
  }, [montoCompra, cuotasCompra, tasaCompra])

  // Tabla de amortización generada dinámicamente para el modal de vista
  const tablaAmortizacionModal = useMemo((): DetalleTablaAmortizacion[] => {
    if (!modalAmortizacion) return []
    return generarTablaAmortizacion(
      modalAmortizacion.montoTotal,
      modalAmortizacion.cuotasTotales,
      modalAmortizacion.tasaInteresMensual
    )
  }, [modalAmortizacion])

  function handleAddTarjeta(e: FormEvent) {
    e.preventDefault()
    if (!nombreTc || !cupoTotalTc) return

    addTarjeta({
      nombre: nombreTc,
      banco: bancoTc || 'Banco',
      ultimos4Digitos: digitosTc || '0000',
      franquicia: franquiciaTc,
      cupoTotal: Number(cupoTotalTc),
      diaCorte: Number(diaCorteTc) || 15,
      diaLimitePago: Number(diaLimiteTc) || 25,
      tasaInteresMensual: Number(tasaTc) || 0,
      color: colorTc,
    })

    setNombreTc('')
    setBancoTc('')
    setDigitosTc('')
    setCupoTotalTc('')
    setModalTarjetaOpen(false)
  }

  function handleAddCompraCuota(e: FormEvent) {
    e.preventDefault()
    if (!montoCompra || Number(montoCompra) <= 0) return

    addCompraCuota({
      tarjetaId: tarjetaIdCompra,
      descripcion: descCompra || 'Compra diferida',
      comercio: comercioCompra || undefined,
      fechaCompra,
      montoTotal: Number(montoCompra),
      cuotasTotales: Math.max(1, Number(cuotasCompra) || 1),
      tasaInteresMensual: Number(tasaCompra) || 0,
      fechaInicioCobro: mesInicioCobro,
      notas: notasCompra || undefined,
    })

    setDescCompra('')
    setComercioCompra('')
    setMontoCompra('')
    setNotasCompra('')
    setModalCompraOpen(false)
  }

  function confirmarPagoCuota(e: FormEvent) {
    e.preventDefault()
    if (!modalPagarCuota) return
    pagarCuotaCompra(modalPagarCuota.id, cuentaPagoId)
    setModalPagarCuota(null)
  }

  // Acción: Confirmar Pago de Tarjeta (Total, Mínimo o Personalizado)
  function handleConfirmarPagoTarjeta(e: FormEvent) {
    e.preventDefault()
    if (!modalPagarTarjeta) return

    const tarjeta = modalPagarTarjeta.tarjeta
    const valorPagado =
      tipoPagoSeleccionado === 'TOTAL'
        ? modalPagarTarjeta.pagoTotal
        : tipoPagoSeleccionado === 'MINIMO'
        ? modalPagarTarjeta.pagoMinimo
        : Number(montoPersonalizado) || modalPagarTarjeta.pagoMinimo

    pagarTarjeta({
      tarjetaId: tarjeta.id,
      cuentaId: cuentaPagoId,
      tipoPago: tipoPagoSeleccionado,
      montoAPagar: valorPagado,
      mes: selectedMonth,
    })

    setModalPagarTarjeta(null)
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
            Tarjetas de Crédito & Pagos del Mes
          </h1>
          <p>
            Control de cupos, pagos mínimos obligatorios, pago total sin intereses y compras diferidas para{' '}
            <strong>{formatMonthYear(selectedMonth)}</strong>.
          </p>
        </div>

        <div className="page-header-actions" style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
          <button
            type="button"
            className="btn ghost"
            style={{ color: 'var(--color-expense)', borderColor: 'var(--color-border)' }}
            onClick={() => {
              if (confirm('¿Limpiar los extractos y compras a cuotas para cargarlos desde cero con tus archivos?')) {
                limpiarDatosTarjetas()
              }
            }}
            title="Restablece los extractos y compras para realizar tu prueba"
          >
            Limpiar Tarjetas
          </button>
          <button type="button" className="btn secondary" onClick={() => setModalTarjetaOpen(true)}>
            + Agregar Tarjeta
          </button>
          <button type="button" className="btn primary" onClick={() => setModalCompraOpen(true)}>
            + Compra a Cuotas
          </button>
        </div>
      </div>

      {/* PESTAÑAS PRINCIPALES: VISTA GENERAL vs CADA TARJETA INDIVIDUAL */}
      <div className="tabs-nav" style={{ marginBottom: '1.5rem', flexWrap: 'wrap', gap: '0.5rem' }}>
        <button
          type="button"
          className={`tab-btn ${tarjetaSeleccionadaTab === 'TODAS' ? 'active' : ''}`}
          onClick={() => setTarjetaSeleccionadaTab('TODAS')}
          style={{ fontWeight: 700 }}
        >
          Vista General ({state.tarjetas.length} Tarjetas)
        </button>
        {state.tarjetas.map((t) => {
          const isNu = t.banco.toLowerCase().includes('nu') || t.nombre.toLowerCase().includes('nu')
          return (
            <button
              key={t.id}
              type="button"
              className={`tab-btn ${tarjetaSeleccionadaTab === t.id ? 'active' : ''}`}
              onClick={() => setTarjetaSeleccionadaTab(t.id)}
              style={{
                fontWeight: 700,
                color: tarjetaSeleccionadaTab === t.id ? (isNu ? '#a855f7' : '#eab308') : undefined,
              }}
            >
              {t.nombre} (•••• {t.ultimos4Digitos})
            </button>
          )
        })}
      </div>

      {/* ========================================================================= */}
      {/* VISTA 1: RESUMEN GENERAL (TODAS LAS TARJETAS) */}
      {/* ========================================================================= */}
      {tarjetaSeleccionadaTab === 'TODAS' && (
        <>
          {/* KPIs de Crédito y Extracto */}
          <div className="stat-grid">
            <article className="stat-card">
              <div className="stat-card-top">
                <span className="stat-card-title">Cupo Disponible Total</span>
                <span className="badge income">Disponible</span>
              </div>
              <div className="stat-value" style={{ color: 'var(--color-income)' }}>
                {formatMoney(cupoDisponibleTarjetas)}
              </div>
              <span className="stat-subtext">
                Deuda total: {formatMoney(deudaTotalTarjetas)} / Cupo: {formatMoney(cupoTotalTarjetas)}
              </span>
            </article>

            <article className="stat-card" style={{ borderLeft: '4px solid #8b5cf6' }}>
              <div className="stat-card-top">
                <span className="stat-card-title">Consumos 1 Cuota este Mes</span>
                <span className="badge credit">Mes Corriente</span>
              </div>
              <div className="stat-value" style={{ color: 'var(--color-credit)' }}>
                {formatMoney(totalGastos1CuotaTarjetasMes)}
              </div>
              <span className="stat-subtext">Celular, gasolina, compras del extracto a 1 cuota</span>
            </article>

            <article className="stat-card" style={{ borderLeft: '4px solid #f59e0b' }}>
              <div className="stat-card-top">
                <span className="stat-card-title">Cuotas Diferidas este Mes</span>
                <span className="badge warning">Compras a Plazos</span>
              </div>
              <div className="stat-value" style={{ color: 'var(--color-warning-text)' }}>
                {formatMoney(totalCuotasTarjetasMes)}
              </div>
              <span className="stat-subtext">Cuotas de compras activas facturadas este mes</span>
            </article>

            <article className="stat-card" style={{ borderLeft: '4px solid var(--color-expense)' }}>
              <div className="stat-card-top">
                <span className="stat-card-title">Total Facturado / Extractos</span>
                <span className="badge expense">Total a Pagar</span>
              </div>
              <div className="stat-value" style={{ color: 'var(--color-expense)', fontSize: '1.65rem' }}>
                {formatMoney(totalExtractoTarjetasMes)}
              </div>
              <span className="stat-subtext">
                Suma total para no generar intereses en ninguna tarjeta
              </span>
            </article>
          </div>

          {/* Sección de Tarjetas Físicas Visuales */}
          <div className="panel">
            <div className="panel-header">
              <div>
                <h2 className="panel-title">Tus Tarjetas de Crédito Registradas</h2>
                <span style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)' }}>
                  Haz clic en cualquier tarjeta para ver su extracto oficial, diferidos y consumos independientes.
                </span>
              </div>
              <button type="button" className="btn primary sm" onClick={() => setModalTarjetaOpen(true)}>
                + Nueva Tarjeta
              </button>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '1.5rem' }}>
              {state.tarjetas.map((t) => {
                const deudaTc = state.comprasCuotas
                  .filter((c) => c.tarjetaId === t.id && c.estado === 'ACTIVA')
                  .reduce((acc, c) => acc + c.saldoRestante, 0)
                const consumos1CuotaTc = consumos1CuotaMes
                  .filter((c) => c.tarjetaId === t.id)
                  .reduce((acc, c) => acc + c.monto, 0)
                const disponibleTc = t.ultimoExtracto?.cupoDisponible !== undefined
                  ? t.ultimoExtracto.cupoDisponible
                  : Math.max(0, t.cupoTotal - deudaTc - consumos1CuotaTc)
                const deudaReal = t.ultimoExtracto?.deudaCorte || (deudaTc + consumos1CuotaTc)
                const pctUso = t.cupoTotal > 0 ? Math.round((deudaReal / t.cupoTotal) * 100) : 0

                return (
                  <div
                    key={t.id}
                    style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', cursor: 'pointer' }}
                    onClick={() => setTarjetaSeleccionadaTab(t.id)}
                  >
                    <div
                      className="credit-card-visual"
                      style={{
                        background: `linear-gradient(135deg, ${t.color || '#1e3a8a'} 0%, #0f172a 100%)`,
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                        <div>
                          <strong style={{ fontSize: '1.1rem', letterSpacing: '0.02em', display: 'block' }}>
                            {t.nombre}
                          </strong>
                          <span style={{ fontSize: '0.8rem', opacity: 0.85 }}>{t.banco}</span>
                        </div>
                        <span style={{ fontWeight: 800, fontSize: '0.9rem', letterSpacing: '0.05em' }}>
                          {t.franquicia}
                        </span>
                      </div>

                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <div className="card-chip" />
                        <div className="card-number">•••• •••• •••• {t.ultimos4Digitos}</div>
                      </div>

                      <div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', marginBottom: '0.35rem' }}>
                          <span>Deuda al Corte: <strong>{formatMoney(deudaReal)}</strong></span>
                          <span>Uso: <strong>{pctUso}%</strong></span>
                        </div>

                        <div style={{ width: '100%', height: '6px', backgroundColor: 'rgba(255,255,255,0.25)', borderRadius: '999px', overflow: 'hidden' }}>
                          <div
                            style={{
                              width: `${Math.min(100, pctUso)}%`,
                              height: '100%',
                              backgroundColor: pctUso > 80 ? '#f43f5e' : '#10b981',
                              borderRadius: '999px',
                            }}
                          />
                        </div>

                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.7rem', marginTop: '0.4rem', opacity: 0.9 }}>
                          <span>Límite: {t.ultimoExtracto?.pagarAntesDe ? cleanDateText(t.ultimoExtracto.pagarAntesDe) : `Día ${t.diaLimitePago}`}</span>
                          <span>Cupo Libre: <strong>{formatMoney(disponibleTc)}</strong></span>
                        </div>
                      </div>
                    </div>

                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0 0.25rem' }}>
                      <span style={{ fontSize: '0.75rem', color: 'var(--color-primary)' }}>
                        Clic para ver extracto y diferidos
                      </span>
                      <button
                        type="button"
                        className="btn ghost sm"
                        style={{ fontSize: '0.75rem', color: 'var(--color-expense)' }}
                        onClick={(e) => {
                          e.stopPropagation()
                          if (confirm(`¿Eliminar la tarjeta ${t.nombre} y todas sus compras asociadas?`)) {
                            deleteTarjeta(t.id)
                          }
                        }}
                      >
                        Eliminar
                      </button>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>

          {/* TABLA: ESTADO DE FACTURACIÓN Y EXTRACTO DEL MES POR TARJETA */}
          <div className="panel" style={{ borderLeft: '4px solid var(--color-primary-light)' }}>
            <div className="panel-header">
              <div>
                <h2 className="panel-title">
                  Estado de Facturación y Extractos del Mes ({formatMonthYear(selectedMonth)})
                </h2>
                <span style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)' }}>
                  Comparativo exacto de cupo, pago mínimo obligatorio, pago total (0 intereses) y fecha límite.
                </span>
              </div>
            </div>

            <div className="table-container">
              <table>
                <thead>
                  <tr>
                    <th>Tarjeta</th>
                    <th>Cupo Total / Libre</th>
                    <th>Consumos 1 Cuota</th>
                    <th>Cuotas Diferidas</th>
                    <th>Pago Mínimo</th>
                    <th>Pago Total (0 Intereses)</th>
                    <th>Pagar Antes De</th>
                    <th style={{ textAlign: 'right' }}>Acción</th>
                  </tr>
                </thead>
                <tbody>
                  {state.tarjetas.map((t) => {
                    const deudaDiferidaTc = state.comprasCuotas
                      .filter((c) => c.tarjetaId === t.id && c.estado === 'ACTIVA')
                      .reduce((acc, c) => acc + c.saldoRestante, 0)
                    const consumos1CuotaTc = consumos1CuotaMes
                      .filter((c) => c.tarjetaId === t.id)
                      .reduce((acc, c) => acc + c.monto, 0)
                    const cuotasMesTc = state.comprasCuotas
                      .filter((c) => c.tarjetaId === t.id && c.estado === 'ACTIVA' && c.cuotasPagadas < c.cuotasTotales)
                      .reduce((acc, c) => acc + c.valorCuota, 0)

                    const pagoMinimoReal =
                      t.ultimoExtracto?.pagoMinimo && t.ultimoExtracto.pagoMinimo > 0
                        ? t.ultimoExtracto.pagoMinimo
                        : cuotasMesTc > 0
                        ? cuotasMesTc
                        : consumos1CuotaTc
                    const pagoTotalReal =
                      t.ultimoExtracto?.pagoTotal && t.ultimoExtracto.pagoTotal > 0
                        ? t.ultimoExtracto.pagoTotal
                        : cuotasMesTc + consumos1CuotaTc
                    const cupoLibreReal =
                      t.ultimoExtracto?.cupoDisponible !== undefined
                        ? t.ultimoExtracto.cupoDisponible
                        : Math.max(0, t.cupoTotal - deudaDiferidaTc - consumos1CuotaTc)

                    return (
                      <tr key={t.id}>
                        <td>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                            <div>
                              <strong>{t.nombre}</strong>
                              <span style={{ display: 'block', fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>
                                {t.banco} •••• {t.ultimos4Digitos}
                              </span>
                            </div>
                          </div>
                        </td>
                        <td>
                          <div style={{ fontSize: '0.8rem' }}>
                            <span>Cupo: <strong>{formatMoney(t.cupoTotal)}</strong></span>
                            <span style={{ display: 'block', color: 'var(--color-income)' }}>
                              Libre: {formatMoney(cupoLibreReal)}
                            </span>
                          </div>
                        </td>
                        <td>
                          <span style={{ fontWeight: 600, color: consumos1CuotaTc > 0 ? 'var(--color-credit)' : 'var(--color-text-muted)' }}>
                            {formatMoney(consumos1CuotaTc)}
                          </span>
                        </td>
                        <td>
                          <span style={{ fontWeight: 600, color: cuotasMesTc > 0 ? 'var(--color-warning-text)' : 'var(--color-text-muted)' }}>
                            {formatMoney(cuotasMesTc)}
                          </span>
                        </td>
                        <td>
                          <div style={{ display: 'flex', flexDirection: 'column' }}>
                            <strong style={{ fontSize: '0.95rem', color: 'var(--color-warning-text)' }}>
                              {formatMoney(pagoMinimoReal)}
                            </strong>
                            <span style={{ fontSize: '0.675rem', color: 'var(--color-text-muted)' }}>
                              Obligatorio sin mora
                            </span>
                          </div>
                        </td>
                        <td>
                          <div style={{ display: 'flex', flexDirection: 'column' }}>
                            <strong style={{ fontSize: '1rem', color: pagoTotalReal > 0 ? 'var(--color-expense)' : 'var(--color-income)' }}>
                              {formatMoney(pagoTotalReal)}
                            </strong>
                            <span style={{ fontSize: '0.675rem', color: 'var(--color-income)' }}>
                              {pagoTotalReal > 0 ? '0 intereses' : 'Al día'}
                            </span>
                          </div>
                        </td>
                        <td>
                          <span className="badge warning" style={{ fontSize: '0.725rem' }}>
                            {t.ultimoExtracto?.pagarAntesDe ? cleanDateText(t.ultimoExtracto.pagarAntesDe) : `Día ${t.diaLimitePago} del mes`}
                          </span>
                        </td>
                        <td style={{ textAlign: 'right' }}>
                          <button
                            type="button"
                            className="btn primary sm"
                            disabled={pagoTotalReal <= 0}
                            onClick={() => {
                              setModalPagarTarjeta({
                                tarjeta: t,
                                pagoMinimo: pagoMinimoReal,
                                pagoTotal: pagoTotalReal,
                                consumos1Cuota: consumos1CuotaTc,
                              })
                              setTipoPagoSeleccionado('TOTAL')
                            }}
                          >
                            Pagar Factura
                          </button>
                        </td>
                      </tr>
                    )
                  })}
                  {state.tarjetas.length === 0 && (
                    <tr>
                      <td colSpan={8} style={{ textAlign: 'center', padding: '2rem', color: 'var(--color-text-muted)' }}>
                        No tienes tarjetas de crédito registradas. Haz clic en <strong>+ Nueva Tarjeta</strong>.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}

      {/* ========================================================================= */}
      {/* VISTA 2: DETALLE INDIVIDUAL DE LA TARJETA SELECCIONADA */}
      {/* ========================================================================= */}
      {tarjetaSeleccionadaTab !== 'TODAS' && (() => {
        const tarjeta = state.tarjetas.find((t) => t.id === tarjetaSeleccionadaTab)
        if (!tarjeta) return null

        const isNu = tarjeta.banco.toLowerCase().includes('nu') || tarjeta.nombre.toLowerCase().includes('nu')
        const ext = tarjeta.ultimoExtracto

        const comprasCuotasTarjeta = state.comprasCuotas.filter((c) => c.tarjetaId === tarjeta.id)
        
        // Obtener todos los consumos a 1 cuota asociados a esta tarjeta
        const defaultTcId = state.tarjetas[0]?.id
        const isFirstCard = tarjeta.id === defaultTcId

        const consumos1CuotaTarjeta = [
          ...(state.gastosPersonales || [])
            .filter((g) => g.tarjetaId === tarjeta.id || (!g.tarjetaId && g.metodoPago === 'TARJETA_CREDITO' && isFirstCard))
            .map((g) => ({
              id: g.id,
              fecha: g.fecha,
              categoria: g.categoria,
              descripcion: g.descripcion,
              monto: g.monto,
              tarjetaId: tarjeta.id,
            })),
          ...(state.alimentacion || [])
            .filter((a) => a.tarjetaId === tarjeta.id || (!a.tarjetaId && a.metodoPago === 'TARJETA_CREDITO' && isFirstCard))
            .map((a) => ({
              id: a.id,
              fecha: a.fecha,
              categoria: a.tipoComida,
              descripcion: a.descripcion,
              monto: a.monto,
              tarjetaId: tarjeta.id,
            })),
          ...(state.comprasHogar || [])
            .filter((c) => c.tarjetaId === tarjeta.id || (!c.tarjetaId && c.metodoPago === 'TARJETA_CREDITO' && isFirstCard))
            .map((c) => ({
              id: c.id,
              fecha: c.fecha,
              categoria: c.categoria,
              descripcion: c.descripcion,
              monto: c.monto,
              tarjetaId: tarjeta.id,
            })),
          ...(state.servicios || [])
            .filter((s) => s.tarjetaId === tarjeta.id || (!s.tarjetaId && s.metodoPago === 'TARJETA_CREDITO' && isFirstCard))
            .map((s) => ({
              id: s.id,
              fecha: s.fechaPago || s.fechaVencimiento,
              categoria: s.tipo,
              descripcion: s.nombre,
              monto: s.monto,
              tarjetaId: tarjeta.id,
            })),
        ]

        const totalCuotasMesTc = comprasCuotasTarjeta
          .filter((c) => c.estado === 'ACTIVA' && c.cuotasPagadas < c.cuotasTotales)
          .reduce((acc, c) => acc + c.valorCuota, 0)
        const totalConsumos1CuotaTc = consumos1CuotaTarjeta.reduce((acc, c) => acc + c.monto, 0)
        const deudaDiferidaTotal = comprasCuotasTarjeta
          .filter((c) => c.estado === 'ACTIVA')
          .reduce((acc, c) => acc + c.saldoRestante, 0)

        const pagoMinimoReal =
          ext?.pagoMinimo && ext.pagoMinimo > 0
            ? ext.pagoMinimo
            : totalCuotasMesTc > 0
            ? totalCuotasMesTc
            : totalConsumos1CuotaTc
        const pagoTotalReal =
          ext?.pagoTotal && ext.pagoTotal > 0
            ? ext.pagoTotal
            : totalCuotasMesTc + totalConsumos1CuotaTc
        const cupoLibreReal = ext?.cupoDisponible !== undefined ? ext.cupoDisponible : Math.max(0, tarjeta.cupoTotal - deudaDiferidaTotal - totalConsumos1CuotaTc)
        const deudaCorteReal = ext?.deudaCorte !== undefined ? ext.deudaCorte : (deudaDiferidaTotal + totalConsumos1CuotaTc)

        return (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
            {/* CABECERA VISUAL: PLÁSTICO + EXTRACTO OFICIAL */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '1.25rem' }}>
              {/* Plástico de la tarjeta */}
              <div
                className="credit-card-visual"
                style={{
                  background: `linear-gradient(135deg, ${tarjeta.color || (isNu ? '#820ad1' : '#1e3a8a')} 0%, #0f172a 100%)`,
                  minHeight: '200px',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <div>
                    <strong style={{ fontSize: '1.2rem', letterSpacing: '0.02em', display: 'block' }}>
                      {tarjeta.nombre}
                    </strong>
                    <span style={{ fontSize: '0.85rem', opacity: 0.85 }}>{tarjeta.banco}</span>
                  </div>
                  <span style={{ fontWeight: 800, fontSize: '0.95rem', letterSpacing: '0.05em' }}>
                    {tarjeta.franquicia}
                  </span>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div className="card-chip" />
                  <div className="card-number">•••• •••• •••• {tarjeta.ultimos4Digitos}</div>
                </div>

                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', marginBottom: '0.35rem' }}>
                    <span>Cupo Total: <strong>{formatMoney(tarjeta.cupoTotal)}</strong></span>
                    <span>Libre: <strong style={{ color: '#34d399' }}>{formatMoney(cupoLibreReal)}</strong></span>
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', opacity: 0.9 }}>
                    <span>Corte: Día {tarjeta.diaCorte}</span>
                    <span>Límite: {ext?.pagarAntesDe ? cleanDateText(ext.pagarAntesDe) : `Día ${tarjeta.diaLimitePago}`}</span>
                  </div>
                </div>
              </div>

              {/* Recuadro Oficial de Extracto 1:1 con el banco */}
              <div style={{ borderRadius: 'var(--radius-lg)', overflow: 'hidden', border: '1px solid var(--color-border)', backgroundColor: 'var(--color-surface)', boxShadow: 'var(--shadow-sm)' }}>
                <div
                  style={{
                    backgroundColor: isNu ? '#820ad1' : '#facc15',
                    color: isNu ? '#ffffff' : '#713f12',
                    fontWeight: 800,
                    padding: '0.65rem 1rem',
                    fontSize: '0.95rem',
                    letterSpacing: '0.02em',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                  }}
                >
                  <span>{isNu ? 'Tarjeta Nu Colombia' : 'Tarjeta Bancolombia'}</span>
                  <span style={{ fontSize: '0.8rem', opacity: 0.9 }}>
                    Periodo: {ext?.periodoFacturado || 'Sin extracto cargado'}
                  </span>
                </div>

                <div style={{ padding: '1rem 1.25rem', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.85rem' }}>
                  <div>
                    <span style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', display: 'block' }}>
                      {isNu ? 'Tu cupo definido:' : 'Cupo total:'}
                    </span>
                    <strong style={{ fontSize: '1.05rem', color: 'var(--color-text-main)' }}>
                      {formatMoney(tarjeta.cupoTotal)}
                    </strong>
                  </div>

                  <div style={{ textAlign: 'right' }}>
                    <span style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', display: 'block' }}>
                      {isNu ? 'Usado (Deuda al corte):' : 'Deuda a corte:'}
                    </span>
                    <strong style={{ fontSize: '1.05rem', color: 'var(--color-text-main)' }}>
                      {formatMoney(deudaCorteReal)}
                    </strong>
                  </div>

                  <div style={{ paddingTop: '0.5rem', borderTop: '1px solid var(--color-border)' }}>
                    <span style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', display: 'block' }}>
                      PAGO MÍNIMO (Sin mora):
                    </span>
                    <strong style={{ fontSize: '1.25rem', color: 'var(--color-warning-text)' }}>
                      {formatMoney(pagoMinimoReal)}
                    </strong>
                  </div>

                  <div style={{ paddingTop: '0.5rem', borderTop: '1px solid var(--color-border)', textAlign: 'right' }}>
                    <span style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', display: 'block' }}>
                      PAGO TOTAL (0 Intereses):
                    </span>
                    <strong style={{ fontSize: '1.25rem', color: 'var(--color-expense)' }}>
                      {formatMoney(pagoTotalReal)}
                    </strong>
                  </div>

                  <div style={{ gridColumn: '1 / -1', paddingTop: '0.65rem', borderTop: '1px solid var(--color-border)', display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.78rem', color: 'var(--color-text-muted)', flexWrap: 'wrap', gap: '0.5rem' }}>
                      <span>Consumos 1 Cuota: <strong style={{ color: 'var(--color-text-main)' }}>{formatMoney(totalConsumos1CuotaTc)}</strong></span>
                      <span>Cuotas Diferidas: <strong style={{ color: 'var(--color-text-main)' }}>{formatMoney(totalCuotasMesTc)}</strong></span>
                      <span>Límite: <strong style={{ color: 'var(--color-expense)' }}>{ext?.pagarAntesDe ? cleanDateText(ext.pagarAntesDe) : (isNu ? '04 SEP 2026' : 'sep. 02, 2026')}</strong></span>
                    </div>
                  </div>

                  <div style={{ gridColumn: '1 / -1', paddingTop: '0.5rem', borderTop: '1px solid var(--color-border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>
                      Compras realizadas antes del corte ({tarjeta.diaCorte}) se pagan en esta fecha límite.
                    </span>
                    <button
                      type="button"
                      className="btn primary sm"
                      onClick={() => {
                        setModalPagarTarjeta({
                          tarjeta,
                          pagoMinimo: pagoMinimoReal,
                          pagoTotal: pagoTotalReal,
                          consumos1Cuota: totalConsumos1CuotaTc,
                        })
                        setTipoPagoSeleccionado('TOTAL')
                      }}
                    >
                      Pagar Factura
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* TABLA DE COMPRAS A CUOTAS DIFERIDAS DE ESTA TARJETA */}
            <div className="panel">
              <div className="panel-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.75rem' }}>
                <div>
                  <h3 className="panel-title" style={{ fontSize: '1.1rem' }}>
                    Compras Diferidas a Cuotas ({comprasCuotasTarjeta.length} registradas)
                  </h3>
                  <span style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)' }}>
                    Compras financiadas a plazos facturadas a {tarjeta.nombre}.
                  </span>
                </div>
                <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                  <button
                    type="button"
                    className="btn primary sm"
                    onClick={() => {
                      setTarjetaIdCompra(tarjeta.id)
                      setModalCompraOpen(true)
                    }}
                  >
                    + Compra a Cuotas
                  </button>
                </div>
              </div>

              <div className="table-container">
                <table className="table-wide">
                  <thead>
                    <tr>
                      <th>Fecha</th>
                      <th>Comercio / Descripción</th>
                      <th>Cuota Actual</th>
                      <th>Cuota Mes</th>
                      <th>Saldo Pendiente</th>
                      <th>Estado</th>
                      <th className="table-actions-cell">Acciones</th>
                    </tr>
                  </thead>
                  <tbody>
                    {comprasCuotasTarjeta.map((compra) => {
                      const cuotasPagadasCalc = compra.cuotasPagadas ?? 0
                      const esPagada =
                        compra.estado === 'PAGADA' ||
                        (compra.saldoRestante === 0 && cuotasPagadasCalc >= compra.cuotasTotales)
                      const cuotaMostrada = esPagada
                        ? compra.cuotasTotales
                        : Math.min(compra.cuotasTotales, cuotasPagadasCalc + 1)
                      const progresoPct = Math.min(
                        100,
                        Math.round((esPagada ? compra.cuotasTotales : cuotaMostrada) / compra.cuotasTotales * 100)
                      )

                      return (
                        <tr key={compra.id}>
                          <td style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)', whiteSpace: 'nowrap' }}>
                            {formatDate(compra.fechaCompra)}
                          </td>
                          <td>
                            <strong>{compra.descripcion}</strong>
                            <span style={{ display: 'block', fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>
                              Total compra: {formatMoney(compra.montoTotal)}
                            </span>
                          </td>
                          <td style={{ minWidth: '120px' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', marginBottom: '2px' }}>
                              <span>
                                {esPagada
                                  ? `Cuota ${compra.cuotasTotales} de ${compra.cuotasTotales}`
                                  : `${cuotaMostrada} de ${compra.cuotasTotales}`}
                              </span>
                              <strong>{progresoPct}%</strong>
                            </div>
                            <div style={{ width: '100%', height: '5px', backgroundColor: 'var(--color-bg-alt)', borderRadius: '999px', overflow: 'hidden' }}>
                              <div
                                style={{
                                  width: `${progresoPct}%`,
                                  height: '100%',
                                  backgroundColor: esPagada ? '#10b981' : (isNu ? '#820ad1' : '#f59e0b'),
                                }}
                              />
                            </div>
                          </td>
                          <td style={{ fontWeight: 600, color: 'var(--color-credit)' }}>
                            {formatMoney(compra.valorCuota)}
                          </td>
                          <td style={{ fontWeight: 600, color: compra.saldoRestante > 0 ? 'var(--color-expense)' : 'var(--color-income)' }}>
                            {formatMoney(compra.saldoRestante)}
                          </td>
                          <td>
                            <span className={`badge ${esPagada ? 'income' : 'credit'}`} style={{ fontSize: '0.7rem' }}>
                              {esPagada ? 'PAGADA' : compra.estado}
                            </span>
                          </td>
                          <td className="table-actions-cell">
                            <div className="table-actions-group">
                              <button
                                type="button"
                                className="btn secondary sm"
                                onClick={() => handleOpenEditCompra(compra)}
                                title="Editar nombre, cuotas pagadas y detalles de esta compra"
                              >
                                Editar
                              </button>
                              <button
                                type="button"
                                className="btn secondary sm"
                                onClick={() => setModalAmortizacion(compra)}
                                title="Ver tabla de amortización"
                              >
                                Tabla
                              </button>
                              {compra.estado === 'ACTIVA' && (
                                <>
                                  <button
                                    type="button"
                                    className="btn success sm"
                                    onClick={() => setModalPagarCuota(compra)}
                                    title="Pagar cuota mensual individual"
                                  >
                                    Pagar Cuota
                                  </button>
                                  <button
                                    type="button"
                                    className="btn secondary sm"
                                    onClick={() => {
                                      if (confirm(`¿Prepagar y liquidar todo el saldo restante (${formatMoney(compra.saldoRestante)})?`)) {
                                        prepagarCompra(compra.id, state.cuentas[0]?.id)
                                      }
                                    }}
                                    title="Prepagar deuda completa"
                                  >
                                    Liquidar
                                  </button>
                                </>
                              )}
                              {(compra.cuotasPagadas > 0 || (compra.historialPagos && compra.historialPagos.length > 0)) && (
                                <button
                                  type="button"
                                  className="btn warning sm"
                                  onClick={() => {
                                    setModalRevertirCuota(compra)
                                    const lastAccount = compra.historialPagos?.[compra.historialPagos.length - 1]?.cuentaId
                                    setCuentaReembolsoId(lastAccount || state.cuentas[0]?.id || '')
                                  }}
                                  title="Revertir el último pago de cuota y reembolsar a la cuenta de ahorros"
                                  style={{ color: 'var(--color-warning-text)' }}
                                >
                                  Revertir
                                </button>
                              )}
                              <button
                                type="button"
                                className="btn ghost sm"
                                onClick={() => deleteCompraCuota(compra.id)}
                                title="Eliminar compra"
                                aria-label="Eliminar"
                              >
                                Eliminar
                              </button>
                            </div>
                          </td>
                        </tr>
                      )
                    })}
                    {comprasCuotasTarjeta.length === 0 && (
                      <tr>
                        <td colSpan={7} style={{ textAlign: 'center', padding: '2.5rem 1rem', color: 'var(--color-text-muted)' }}>
                          <p style={{ fontWeight: 600, marginBottom: '0.25rem' }}>
                            Aún no hay compras a cuotas registradas en esta tarjeta.
                          </p>
                          <span style={{ fontSize: '0.85rem' }}>
                            Sube el extracto PDF o texto en <strong>Auditoría & Conciliación</strong> para sincronizarlas automáticamente.
                          </span>
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* TABLA DE CONSUMOS A 1 CUOTA DE ESTA TARJETA */}
            <div className="panel">
              <div className="panel-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.75rem' }}>
                <div>
                  <h3 className="panel-title" style={{ fontSize: '1.1rem' }}>
                    Consumos a 1 Cuota ({consumos1CuotaTarjeta.length} movimientos)
                  </h3>
                  <span style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)' }}>
                    Gastos mensuales y compras corrientes facturadas a 1 sola cuota.
                  </span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                  <span className="badge credit" style={{ fontSize: '0.85rem' }}>
                    Total: {formatMoney(totalConsumos1CuotaTc)}
                  </span>
                </div>
              </div>

              <div className="table-container">
                <table>
                  <thead>
                    <tr>
                      <th>Fecha</th>
                      <th>Categoría</th>
                      <th>Descripción / Comercio</th>
                      <th style={{ textAlign: 'right' }}>Monto</th>
                    </tr>
                  </thead>
                  <tbody>
                    {consumos1CuotaTarjeta.map((item) => (
                      <tr key={item.id}>
                        <td style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)' }}>
                          {formatDate(item.fecha)}
                        </td>
                        <td>
                          <span className="badge neutral" style={{ fontSize: '0.725rem' }}>
                            {item.categoria}
                          </span>
                        </td>
                        <td>
                          <strong>{item.descripcion}</strong>
                        </td>
                        <td style={{ textAlign: 'right', fontWeight: 600, color: 'var(--color-credit)' }}>
                          {formatMoney(item.monto)}
                        </td>
                      </tr>
                    ))}
                    {consumos1CuotaTarjeta.length === 0 && (
                      <tr>
                        <td colSpan={4} style={{ textAlign: 'center', padding: '2.5rem 1rem', color: 'var(--color-text-muted)' }}>
                          <p style={{ fontWeight: 600, marginBottom: '0.25rem' }}>
                            No hay consumos a 1 cuota registrados para esta tarjeta.
                          </p>
                          <span style={{ fontSize: '0.85rem' }}>
                            Se sincronizarán automáticamente al subir tu extracto en <strong>Auditoría & Conciliación</strong>.
                          </span>
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )
      })()}

      {/* ========================================================================= */}
      {/* SECCIÓN GLOBAL DE MOVIMIENTOS A 1 CUOTA Y COMPRAS CUOTAS (SOLO EN TODAS) */}
      {/* ========================================================================= */}
      {tarjetaSeleccionadaTab === 'TODAS' && (
        <>
          {/* Panel de Consumos a 1 Cuota del Mes */}
          <div className="panel">
            <div className="panel-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.75rem' }}>
              <div>
                <h2 className="panel-title">
                  Todos los Consumos a 1 Cuota con Tarjetas de Crédito
                </h2>
                <span style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)' }}>
                  Servicios mensuales, suscripciones y compras a 1 cuota de todas las tarjetas.
                </span>
              </div>
              <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', flexWrap: 'wrap' }}>
                <div className="tabs-nav" style={{ margin: 0 }}>
                  <button
                    type="button"
                    className={`tab-btn ${filtroPeriodo1Cuota === 'MES_ACTUAL' ? 'active' : ''}`}
                    onClick={() => setFiltroPeriodo1Cuota('MES_ACTUAL')}
                    style={{ fontSize: '0.775rem', padding: '0.35rem 0.75rem' }}
                  >
                    {formatMonthYear(selectedMonth)}
                  </button>
                  <button
                    type="button"
                    className={`tab-btn ${filtroPeriodo1Cuota === 'TODOS' ? 'active' : ''}`}
                    onClick={() => setFiltroPeriodo1Cuota('TODOS')}
                    style={{ fontSize: '0.775rem', padding: '0.35rem 0.75rem' }}
                  >
                    Todos
                  </button>
                </div>
                <span className="badge credit" style={{ fontSize: '0.85rem' }}>
                  Total: {formatMoney(consumos1CuotaMes.reduce((acc, c) => acc + c.monto, 0))}
                </span>
              </div>
            </div>

            <div className="table-container">
              <table>
                <thead>
                  <tr>
                    <th>Fecha</th>
                    <th>Concepto / Categoría</th>
                    <th>Descripción</th>
                    <th>Tarjeta Utilizada</th>
                    <th style={{ textAlign: 'right' }}>Monto en Extracto</th>
                  </tr>
                </thead>
                <tbody>
                  {consumos1CuotaMes.map((item) => {
                    const tarjeta = state.tarjetas.find((t) => t.id === item.tarjetaId)
                    return (
                      <tr key={item.id}>
                        <td style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)' }}>
                          {formatDate(item.fecha)}
                        </td>
                        <td>
                          <span className="badge neutral" style={{ fontSize: '0.725rem' }}>
                            {item.categoria}
                          </span>
                        </td>
                        <td>
                          <strong>{item.descripcion}</strong>
                        </td>
                        <td>
                          <span className="badge credit" style={{ fontSize: '0.725rem' }}>
                            {tarjeta?.nombre || 'Tarjeta de Crédito'}
                          </span>
                        </td>
                        <td style={{ textAlign: 'right', fontWeight: 600, color: 'var(--color-credit)' }}>
                          {formatMoney(item.monto)}
                        </td>
                      </tr>
                    )
                  })}
                  {consumos1CuotaMes.length === 0 && (
                    <tr>
                      <td colSpan={5} style={{ textAlign: 'center', padding: '2rem', color: 'var(--color-text-muted)' }}>
                        No tienes gastos a 1 cuota registrados con tarjeta este mes.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Lista Global de Compras a Cuotas */}
          <div className="panel">
            <div className="panel-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.75rem' }}>
              <div>
                <h2 className="panel-title">
                  Compras Diferidas a Cuotas (Amortización Activa Global)
                </h2>
                <span style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)' }}>
                  Control de todas las compras diferidas, cuotas pagadas y saldos pendientes en todas tus tarjetas.
                </span>
              </div>
              <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                <button type="button" className="btn primary sm" onClick={() => setModalCompraOpen(true)}>
                  + Registrar Compra a Cuotas
                </button>
              </div>
            </div>

            <div className="table-container">
              <table className="table-wide">
                <thead>
                  <tr>
                    <th>Fecha</th>
                    <th>Descripción / Comercio</th>
                    <th>Tarjeta</th>
                    <th>Progreso Cuotas</th>
                    <th>Cuota Mensual</th>
                    <th>Saldo Restante</th>
                    <th>Estado</th>
                    <th className="table-actions-cell">Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {state.comprasCuotas.map((compra) => {
                    const tarjeta = state.tarjetas.find((t) => t.id === compra.tarjetaId)
                    const brand = getCardBrandInfo(tarjeta)
                    const cuotasPagadasCalc = compra.cuotasPagadas ?? 0
                    const esPagada =
                      compra.estado === 'PAGADA' ||
                      (compra.saldoRestante === 0 && cuotasPagadasCalc >= compra.cuotasTotales)
                    const cuotaMostrada = esPagada
                      ? compra.cuotasTotales
                      : Math.min(compra.cuotasTotales, cuotasPagadasCalc + 1)
                    const progresoPct = Math.min(
                      100,
                      Math.round((esPagada ? compra.cuotasTotales : cuotaMostrada) / compra.cuotasTotales * 100)
                    )

                    return (
                      <tr
                        key={compra.id}
                        style={{
                          borderLeft: `4px solid ${brand.color}`,
                        }}
                      >
                        <td style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)', whiteSpace: 'nowrap' }}>
                          {formatDate(compra.fechaCompra)}
                        </td>
                        <td>
                          <strong style={{ color: 'var(--color-text-main)' }}>{compra.descripcion}</strong>
                          {compra.comercio && (
                            <span style={{ display: 'block', fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>
                              {compra.comercio} • Monto inicial: {formatMoney(compra.montoTotal)}
                            </span>
                          )}
                        </td>
                        <td>
                          <span
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '0.35rem',
                              padding: '0.3rem 0.65rem',
                              borderRadius: 'var(--radius-pill)',
                              fontSize: '0.75rem',
                              fontWeight: 700,
                              backgroundColor: brand.bgColor,
                              border: `1px solid ${brand.borderColor}`,
                              color: brand.textColor,
                              whiteSpace: 'nowrap',
                            }}
                          >
                            <span>{brand.icon}</span>
                            <span>{tarjeta ? tarjeta.nombre : 'Tarjeta'}</span>
                            <span style={{ opacity: 0.8, fontSize: '0.7rem' }}>
                              •••• {tarjeta ? tarjeta.ultimos4Digitos : '••••'}
                            </span>
                          </span>
                        </td>
                        <td style={{ minWidth: '135px' }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', marginBottom: '3px' }}>
                            <span style={{ fontWeight: 600, color: esPagada ? '#10b981' : brand.textColor }}>
                              {esPagada
                                ? `Cuota ${compra.cuotasTotales} de ${compra.cuotasTotales}`
                                : `Cuota ${cuotaMostrada} de ${compra.cuotasTotales}`}
                            </span>
                            <strong style={{ color: esPagada ? '#10b981' : brand.textColor }}>{progresoPct}%</strong>
                          </div>
                          <div style={{ width: '100%', height: '6px', backgroundColor: 'var(--color-bg-alt)', borderRadius: '999px', overflow: 'hidden' }}>
                            <div
                              style={{
                                width: `${progresoPct}%`,
                                height: '100%',
                                background: esPagada ? '#10b981' : brand.progressBar,
                                borderRadius: '999px',
                              }}
                            />
                          </div>
                        </td>
                        <td style={{ fontFamily: 'var(--font-mono)', fontWeight: 700, color: brand.textColor }}>
                          {formatMoney(compra.valorCuota)}
                          {compra.tasaInteresMensual > 0 && (
                            <span style={{ display: 'block', fontSize: '0.7rem', color: 'var(--color-text-muted)', fontWeight: 400 }}>
                              Tasa: {compra.tasaInteresMensual}% M.V.
                            </span>
                          )}
                        </td>
                        <td style={{ fontFamily: 'var(--font-mono)', fontWeight: 700, color: compra.saldoRestante > 0 ? 'var(--color-expense)' : 'var(--color-income)' }}>
                          {formatMoney(compra.saldoRestante)}
                        </td>
                        <td>
                          <span
                            className={`badge ${
                              esPagada || compra.estado === 'PREPAGADA'
                                ? 'income'
                                : 'credit'
                            }`}
                            style={{
                              fontSize: '0.7rem',
                              backgroundColor: esPagada ? undefined : brand.bgColor,
                              borderColor: esPagada ? undefined : brand.borderColor,
                              color: esPagada ? undefined : brand.textColor,
                            }}
                          >
                            {esPagada ? 'PAGADA' : compra.estado}
                          </span>
                        </td>
                        <td className="table-actions-cell">
                          <div className="table-actions-group">
                            <button
                              type="button"
                              className="btn secondary sm"
                              onClick={() => handleOpenEditCompra(compra)}
                              title="Editar nombre y detalles de esta compra diferida"
                            >
                              Editar
                            </button>
                            <button
                              type="button"
                              className="btn secondary sm"
                              onClick={() => setModalAmortizacion(compra)}
                              title="Ver tabla de amortización con intereses"
                            >
                              Tabla
                            </button>
                            {compra.estado === 'ACTIVA' && (
                              <button
                                type="button"
                                className="btn success sm"
                                onClick={() => setModalPagarCuota(compra)}
                                title="Pagar cuota mensual"
                              >
                                Pagar
                              </button>
                            )}
                            <button
                              type="button"
                              className="btn ghost sm"
                              onClick={() => deleteCompraCuota(compra.id)}
                              title="Eliminar compra"
                              aria-label="Eliminar"
                            >
                              Eliminar
                            </button>
                          </div>
                        </td>
                      </tr>
                    )
                  })}
                  {state.comprasCuotas.length === 0 && (
                    <tr>
                      <td colSpan={8} style={{ textAlign: 'center', padding: '3rem 1.5rem', color: 'var(--color-text-muted)' }}>
                        <p style={{ fontSize: '1rem', fontWeight: 600, color: 'var(--color-text-main)', marginBottom: '0.5rem' }}>
                          No hay compras diferidas activas.
                        </p>
                        <p style={{ fontSize: '0.85rem' }}>
                          Ve a <strong>Auditoría & Conciliación</strong> para subir tu extracto bancario en PDF o texto y poblar todas las compras automáticamente.
                        </p>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}

      {/* MODAL NUEVA TARJETA */}
      <Modal isOpen={modalTarjetaOpen} onClose={() => setModalTarjetaOpen(false)} title="Agregar Tarjeta de Crédito">
        <form onSubmit={handleAddTarjeta} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <div className="form-grid">
            <div className="form-group">
              <label>Nombre de la Tarjeta *</label>
              <input
                type="text"
                className="form-input"
                placeholder="Ej: Nu Gold, Bancolombia Visa"
                value={nombreTc}
                onChange={(e) => setNombreTc(e.target.value)}
                required
              />
            </div>

            <div className="form-group">
              <label>Banco Emisor</label>
              <input
                type="text"
                className="form-input"
                placeholder="Ej: Bancolombia, Nu, Davivienda"
                value={bancoTc}
                onChange={(e) => setBancoTc(e.target.value)}
              />
            </div>
          </div>

          <div className="form-grid">
            <div className="form-group">
              <label>Últimos 4 Dígitos</label>
              <input
                type="text"
                maxLength={4}
                className="form-input"
                placeholder="Ej: 4589"
                value={digitosTc}
                onChange={(e) => setDigitosTc(e.target.value)}
              />
            </div>

            <div className="form-group">
              <label>Franquicia</label>
              <select className="form-select" value={franquiciaTc} onChange={(e) => setFranquiciaTc(e.target.value as typeof franquiciaTc)}>
                <option value="MASTERCARD">Mastercard</option>
                <option value="VISA">Visa</option>
                <option value="AMEX">American Express</option>
                <option value="OTRA">Otra</option>
              </select>
            </div>
          </div>

          <div className="form-grid">
            <div className="form-group">
              <label>Cupo Total Aprobado ($ COP) *</label>
              <input
                type="number"
                className="form-input"
                placeholder="Ej: 5000000"
                value={cupoTotalTc}
                onChange={(e) => setCupoTotalTc(e.target.value)}
                required
              />
            </div>

            <div className="form-group">
              <label>Tasa Interés Mensual % (M.V.)</label>
              <input
                type="number"
                step="0.01"
                className="form-input"
                placeholder="Ej: 2.15"
                value={tasaTc}
                onChange={(e) => setTasaTc(e.target.value)}
              />
            </div>
          </div>

          <div className="form-grid">
            <div className="form-group">
              <label>Día de Corte Mensual (1 - 31)</label>
              <input type="number" min="1" max="31" className="form-input" value={diaCorteTc} onChange={(e) => setDiaCorteTc(e.target.value)} />
            </div>

            <div className="form-group">
              <label>Día Límite de Pago (1 - 31)</label>
              <input type="number" min="1" max="31" className="form-input" value={diaLimiteTc} onChange={(e) => setDiaLimiteTc(e.target.value)} />
            </div>

            <div className="form-group">
              <label>Color de la Tarjeta</label>
              <input type="color" className="form-input" style={{ height: '42px', padding: '2px' }} value={colorTc} onChange={(e) => setColorTc(e.target.value)} />
            </div>
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '0.5rem' }}>
            <button type="button" className="btn secondary" onClick={() => setModalTarjetaOpen(false)}>
              Cancelar
            </button>
            <button type="submit" className="btn success">
              Guardar Tarjeta
            </button>
          </div>
        </form>
      </Modal>

      {/* MODAL REGISTRAR COMPRA A CUOTAS */}
      <Modal isOpen={modalCompraOpen} onClose={() => setModalCompraOpen(false)} title="Registrar Compra a Cuotas">
        <form onSubmit={handleAddCompraCuota} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <div className="form-grid">
            <div className="form-group">
              <label>Tarjeta de Crédito *</label>
              <select className="form-select" value={tarjetaIdCompra} onChange={(e) => setTarjetaIdCompra(e.target.value)}>
                {state.tarjetas.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.nombre} (•••• {t.ultimos4Digitos})
                  </option>
                ))}
              </select>
            </div>

            <div className="form-group">
              <label>Comercio / Tienda</label>
              <input
                type="text"
                className="form-input"
                placeholder="Ej: Alkosto, Éxito, Nike, Amazon"
                value={comercioCompra}
                onChange={(e) => setComercioCompra(e.target.value)}
              />
            </div>
          </div>

          <div className="form-group">
            <label>Descripción del Producto / Compra *</label>
            <input
              type="text"
              className="form-input"
              placeholder="Ej: Televisor Samsung 55', Nevera, Ropa deportiva"
              value={descCompra}
              onChange={(e) => setDescCompra(e.target.value)}
              required
            />
          </div>

          <div className="form-grid">
            <div className="form-group">
              <label>Monto Total de la Compra ($ COP) *</label>
              <input
                type="number"
                className="form-input"
                placeholder="Ej: 1200000"
                value={montoCompra}
                onChange={(e) => setMontoCompra(e.target.value)}
                required
              />
            </div>

            <DatePickerInput
              label="Fecha de la Compra"
              value={fechaCompra}
              onChange={setFechaCompra}
              selectedMonthContext={selectedMonth}
              required
            />
          </div>

          <div className="form-grid">
            <div className="form-group">
              <label>Número de Cuotas ($N$) *</label>
              <input
                type="number"
                min="1"
                max="48"
                className="form-input"
                value={cuotasCompra}
                onChange={(e) => setCuotasCompra(e.target.value)}
                required
              />
            </div>

            <div className="form-group">
              <label>Tasa Interés Mensual % (0 para cuotas sin interés)</label>
              <input
                type="number"
                step="0.01"
                min="0"
                className="form-input"
                value={tasaCompra}
                onChange={(e) => setTasaCompra(e.target.value)}
              />
            </div>

            <div className="form-group">
              <label>Mes de Inicio de Cobro</label>
              <input type="month" className="form-input" value={mesInicioCobro} onChange={(e) => setMesInicioCobro(e.target.value)} />
            </div>
          </div>

          {cuotaSimulada > 0 && (
            <div className="banner info" style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem' }}>
              <strong>Proyección de la Cuota:</strong>
              <span>
                Pagarás <strong>{cuotasCompra} cuotas mensuales</strong> de aproximadamente{' '}
                <strong style={{ fontSize: '1.05rem', color: 'var(--color-primary-light)' }}>
                  {formatMoney(cuotaSimulada)}
                </strong>
                .
              </span>
            </div>
          )}

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '0.5rem' }}>
            <button type="button" className="btn secondary" onClick={() => setModalCompraOpen(false)}>
              Cancelar
            </button>
            <button type="submit" className="btn success">
              Registrar Compra
            </button>
          </div>
        </form>
      </Modal>

      {/* MODAL PAGAR EXTRACTO / PAGO MÍNIMO DE LA TARJETA */}
      {modalPagarTarjeta && (
        <Modal
          isOpen={Boolean(modalPagarTarjeta)}
          onClose={() => setModalPagarTarjeta(null)}
          title={`Pagar Extracto: ${modalPagarTarjeta.tarjeta.nombre}`}
          maxWidth="560px"
        >
          <form onSubmit={handleConfirmarPagoTarjeta} style={{ display: 'flex', flexDirection: 'column', gap: '1.15rem' }}>
            <p style={{ fontSize: '0.85rem', color: 'var(--color-text-muted)', margin: 0 }}>
              Elige cómo deseas liquidar la facturación de tu tarjeta para el período <strong>{formatMonthYear(selectedMonth)}</strong>:
            </p>

            {/* Opciones de Pago */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '0.65rem' }}>
              {/* Opción 1: Pago Total */}
              <label
                style={{
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: '0.75rem',
                  padding: '0.85rem',
                  borderRadius: 'var(--radius-md)',
                  border: `2px solid ${tipoPagoSeleccionado === 'TOTAL' ? 'var(--color-income)' : 'var(--color-border)'}`,
                  backgroundColor: tipoPagoSeleccionado === 'TOTAL' ? 'var(--color-income-subtle)' : 'var(--color-surface)',
                  cursor: 'pointer',
                }}
              >
                <input
                  type="radio"
                  name="tipoPago"
                  checked={tipoPagoSeleccionado === 'TOTAL'}
                  onChange={() => setTipoPagoSeleccionado('TOTAL')}
                  style={{ marginTop: '0.25rem' }}
                />
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <strong style={{ color: 'var(--color-income-text)', fontSize: '0.925rem' }}>
                      Pago Total del Mes (0 Intereses)
                    </strong>
                    <span style={{ fontWeight: 800, fontSize: '1.1rem', color: 'var(--color-income-text)' }}>
                      {formatMoney(modalPagarTarjeta.pagoTotal)}
                    </span>
                  </div>
                  <span style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', display: 'block', marginTop: '2px' }}>
                    Liquida cuotas diferidas ({formatMoney(modalPagarTarjeta.pagoMinimo)}) + consumos a 1 cuota ({formatMoney(modalPagarTarjeta.consumos1Cuota)}).
                  </span>
                </div>
              </label>

              {/* Opción 2: Pago Mínimo */}
              <label
                style={{
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: '0.75rem',
                  padding: '0.85rem',
                  borderRadius: 'var(--radius-md)',
                  border: `2px solid ${tipoPagoSeleccionado === 'MINIMO' ? 'var(--color-warning)' : 'var(--color-border)'}`,
                  backgroundColor: tipoPagoSeleccionado === 'MINIMO' ? 'var(--color-warning-subtle)' : 'var(--color-surface)',
                  cursor: 'pointer',
                }}
              >
                <input
                  type="radio"
                  name="tipoPago"
                  checked={tipoPagoSeleccionado === 'MINIMO'}
                  onChange={() => setTipoPagoSeleccionado('MINIMO')}
                  style={{ marginTop: '0.25rem' }}
                />
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <strong style={{ color: 'var(--color-warning-text)', fontSize: '0.925rem' }}>
                      Pago Mínimo Obligatorio
                    </strong>
                    <span style={{ fontWeight: 800, fontSize: '1.1rem', color: 'var(--color-warning-text)' }}>
                      {formatMoney(modalPagarTarjeta.pagoMinimo)}
                    </span>
                  </div>
                  <span style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', display: 'block', marginTop: '2px' }}>
                    Cubre las cuotas pactadas de compras a plazos para evitar reporte en mora.
                  </span>
                </div>
              </label>

              {/* Opción 3: Abono Libre */}
              <label
                style={{
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: '0.75rem',
                  padding: '0.85rem',
                  borderRadius: 'var(--radius-md)',
                  border: `2px solid ${tipoPagoSeleccionado === 'PERSONALIZADO' ? 'var(--color-primary-light)' : 'var(--color-border)'}`,
                  backgroundColor: tipoPagoSeleccionado === 'PERSONALIZADO' ? 'var(--color-primary-subtle)' : 'var(--color-surface)',
                  cursor: 'pointer',
                }}
              >
                <input
                  type="radio"
                  name="tipoPago"
                  checked={tipoPagoSeleccionado === 'PERSONALIZADO'}
                  onChange={() => setTipoPagoSeleccionado('PERSONALIZADO')}
                  style={{ marginTop: '0.25rem' }}
                />
                <div style={{ flex: 1 }}>
                  <strong style={{ color: 'var(--color-primary-light)', fontSize: '0.925rem' }}>
                    Abono Libre / Otro Valor
                  </strong>
                  {tipoPagoSeleccionado === 'PERSONALIZADO' && (
                    <div style={{ marginTop: '0.5rem' }}>
                      <input
                        type="number"
                        className="form-input"
                        placeholder="Ingresa el valor a pagar ($ COP)"
                        value={montoPersonalizado}
                        onChange={(e) => setMontoPersonalizado(e.target.value)}
                        required
                        autoFocus
                      />
                    </div>
                  )}
                </div>
              </label>
            </div>

            <div className="form-group">
              <label>Cuenta Bancaria de Débito (De donde sale el dinero):</label>
              <select className="form-select" value={cuentaPagoId} onChange={(e) => setCuentaPagoId(e.target.value)}>
                {state.cuentas.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.nombre} (Saldo disponible: {formatMoney(c.saldo)})
                  </option>
                ))}
              </select>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '0.5rem' }}>
              <button type="button" className="btn secondary" onClick={() => setModalPagarTarjeta(null)}>
                Cancelar
              </button>
              <button type="submit" className="btn success">
                Confirmar Pago y Descontar
              </button>
            </div>
          </form>
        </Modal>
      )}

      {/* MODAL PAGAR CUOTA INDIVIDUAL */}
      {modalPagarCuota && (
        <Modal isOpen={Boolean(modalPagarCuota)} onClose={() => setModalPagarCuota(null)} title="Pagar Cuota de Compra Individual">
          <form onSubmit={confirmarPagoCuota} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <div>
              <strong style={{ fontSize: '1.05rem' }}>{modalPagarCuota.descripcion}</strong>
              <p style={{ fontSize: '0.85rem', color: 'var(--color-text-muted)' }}>
                Se registrará el pago de la <strong>cuota {modalPagarCuota.cuotasPagadas + 1} de {modalPagarCuota.cuotasTotales}</strong>.
              </p>
            </div>

            <div className="stat-card" style={{ padding: '0.85rem' }}>
              <span className="stat-card-title">Valor de la Cuota a Debitar:</span>
              <div className="stat-value" style={{ fontSize: '1.4rem', color: 'var(--color-income-hover)' }}>
                {formatMoney(modalPagarCuota.valorCuota)}
              </div>
            </div>

            <div className="form-group">
              <label>Cuenta de donde sale el dinero:</label>
              <select className="form-select" value={cuentaPagoId} onChange={(e) => setCuentaPagoId(e.target.value)}>
                {state.cuentas.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.nombre} (Saldo: {formatMoney(c.saldo)})
                  </option>
                ))}
              </select>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '0.5rem' }}>
              <button type="button" className="btn secondary" onClick={() => setModalPagarCuota(null)}>
                Cancelar
              </button>
              <button type="submit" className="btn success">
                Confirmar y Descontar
              </button>
            </div>
          </form>
        </Modal>
      )}

      {/* MODAL REVERTIR PAGO DE CUOTA */}
      {modalRevertirCuota && (
        <Modal
          isOpen={Boolean(modalRevertirCuota)}
          onClose={() => setModalRevertirCuota(null)}
          title="Revertir Pago de Cuota de Compra"
          maxWidth="500px"
        >
          <form
            onSubmit={(e) => {
              e.preventDefault()
              revertirPagoCuotaCompra(modalRevertirCuota.id, cuentaReembolsoId)
              setModalRevertirCuota(null)
            }}
            style={{ display: 'flex', flexDirection: 'column', gap: '1.15rem' }}
          >
            <div>
              <strong style={{ fontSize: '1.05rem', color: 'var(--color-warning-text)' }}>
                {modalRevertirCuota.descripcion}
              </strong>
              <p style={{ fontSize: '0.85rem', color: 'var(--color-text-muted)', marginTop: '0.35rem', lineHeight: '1.4' }}>
                Se revertirá el último pago de cuota (cuota actual: <strong>{modalRevertirCuota.cuotasPagadas} de {modalRevertirCuota.cuotasTotales}</strong>).
                El monto correspondiente (<strong>{formatMoney(modalRevertirCuota.valorCuota)}</strong>) será devuelto a tu cuenta de ahorros seleccionada.
              </p>
            </div>

            <div className="form-group">
              <label>Cuenta donde se devolverá el dinero reembolsado:</label>
              <select
                className="form-select"
                value={cuentaReembolsoId}
                onChange={(e) => setCuentaReembolsoId(e.target.value)}
              >
                {state.cuentas.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.nombre} (Saldo actual: {formatMoney(c.saldo)})
                  </option>
                ))}
              </select>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '0.5rem' }}>
              <button type="button" className="btn secondary" onClick={() => setModalRevertirCuota(null)}>
                Cancelar
              </button>
              <button type="submit" className="btn warning">
                Confirmar Reversión y Reembolso
              </button>
            </div>
          </form>
        </Modal>
      )}

      {/* MODAL TABLA DE AMORTIZACIÓN */}
      {modalAmortizacion && (
        <Modal isOpen={Boolean(modalAmortizacion)} onClose={() => setModalAmortizacion(null)} title={`Tabla de Amortización: ${modalAmortizacion.descripcion}`} maxWidth="680px">
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', flexWrap: 'wrap', gap: '0.5rem' }}>
              <span>Monto Total: <strong>{formatMoney(modalAmortizacion.montoTotal)}</strong></span>
              <span>Cuotas: <strong>{modalAmortizacion.cuotasTotales}</strong></span>
              <span>Tasa Mensual: <strong>{modalAmortizacion.tasaInteresMensual}%</strong></span>
              <span>Cuota Fija: <strong>{formatMoney(modalAmortizacion.valorCuota)}</strong></span>
            </div>

            <div className="table-container" style={{ maxHeight: '350px' }}>
              <table>
                <thead>
                  <tr>
                    <th># Cuota</th>
                    <th>Saldo Inicial</th>
                    <th>Cuota Total</th>
                    <th>Abono Capital</th>
                    <th>Intereses</th>
                    <th>Saldo Final</th>
                  </tr>
                </thead>
                <tbody>
                  {tablaAmortizacionModal.map((row) => (
                    <tr
                      key={row.numeroCuota}
                      style={{
                        backgroundColor: row.numeroCuota <= modalAmortizacion.cuotasPagadas ? '#f0fdf4' : undefined,
                      }}
                    >
                      <td>
                        <strong>Cuota {row.numeroCuota}</strong>
                        {row.numeroCuota <= modalAmortizacion.cuotasPagadas && (
                          <span className="badge income" style={{ fontSize: '0.65rem', marginLeft: '4px' }}>Pagada</span>
                        )}
                      </td>
                      <td>{formatMoney(row.saldoInicial)}</td>
                      <td style={{ fontWeight: 600 }}>{formatMoney(row.cuotaTotal)}</td>
                      <td style={{ color: 'var(--color-income)' }}>{formatMoney(row.abonoCapital)}</td>
                      <td style={{ color: 'var(--color-warning-text)' }}>{formatMoney(row.intereses)}</td>
                      <td>{formatMoney(row.saldoFinal)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
              <button type="button" className="btn secondary" onClick={() => setModalAmortizacion(null)}>
                Cerrar
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* MODAL EDITAR NOMBRE Y DETALLES DE COMPRA A CUOTAS */}
      {compraAEditar && (
        <Modal
          isOpen={Boolean(compraAEditar)}
          onClose={() => setCompraAEditar(null)}
          title="Editar Nombre y Detalles de la Compra a Cuotas"
        >
          <form onSubmit={handleGuardarEdicionCompra} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <div className="form-group">
              <label>Nombre / Concepto de lo que estás pagando *</label>
              <input
                type="text"
                className="form-input"
                placeholder="Ej: Celular Mercado Libre, Nevera Éxito, Suscripción TV..."
                value={editDescripcion}
                onChange={(e) => setEditDescripcion(e.target.value)}
                required
                autoFocus
              />
              <span style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', marginTop: '0.25rem' }}>
                Cambia el nombre técnico del banco por algo claro y fácil de identificar para ti.
              </span>
            </div>

            <div className="form-group">
              <label>Comercio / Establecimiento</label>
              <input
                type="text"
                className="form-input"
                placeholder="Ej: Mercado Libre, Directv, Éxito..."
                value={editComercio}
                onChange={(e) => setEditComercio(e.target.value)}
              />
            </div>

            <div className="form-grid">
              <div className="form-group">
                <label>Valor de la Cuota Mensual ($)</label>
                <input
                  type="number"
                  className="form-input"
                  value={editValorCuota}
                  onChange={(e) => setEditValorCuota(e.target.value)}
                  min="0"
                  step="any"
                />
              </div>
              <div className="form-group">
                <label>Total Compra Original</label>
                <input
                  type="text"
                  className="form-input"
                  value={formatMoney(compraAEditar.montoTotal)}
                  disabled
                  style={{ opacity: 0.7 }}
                />
              </div>
            </div>

            <div className="form-grid">
              <div className="form-group">
                <label>Cuotas Pagadas a la Fecha (0 a {compraAEditar.cuotasTotales})</label>
                <input
                  type="number"
                  className="form-input"
                  value={editCuotasPagadas}
                  onChange={(e) => setEditCuotasPagadas(e.target.value)}
                  min="0"
                  max={compraAEditar.cuotasTotales}
                  required
                />
                <span style={{ fontSize: '0.7rem', color: 'var(--color-text-muted)' }}>
                  Puedes ajustar manualmente si pagaste cuotas de más o de menos.
                </span>
              </div>
              <div className="form-group">
                <label>Saldo Pendiente Restante ($ COP)</label>
                <input
                  type="number"
                  className="form-input"
                  value={editSaldoRestante}
                  onChange={(e) => setEditSaldoRestante(e.target.value)}
                  min="0"
                  step="any"
                  required
                />
                <span style={{ fontSize: '0.7rem', color: 'var(--color-text-muted)' }}>
                  Saldo de capital que aún debes de esta compra.
                </span>
              </div>
            </div>

            <div className="form-group">
              <label>Notas o Descripción Adicional</label>
              <textarea
                className="form-input"
                rows={2}
                placeholder="Ej: Comprado para mamá, 0% interés, etc."
                value={editNotas}
                onChange={(e) => setEditNotas(e.target.value)}
              />
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '0.5rem' }}>
              <button type="button" className="btn secondary" onClick={() => setCompraAEditar(null)}>
                Cancelar
              </button>
              <button type="submit" className="btn primary">
                Guardar Cambios
              </button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  )
}
