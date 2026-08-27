import { useState, useMemo, type FormEvent } from 'react'
import { useFinance } from '../context/FinanceContext'
import { Modal } from '../components/Modal'
import {
  calcularCuotaMensual,
  generarTablaAmortizacion,
  type DetalleTablaAmortizacion,
} from '../utils/financialCalculations'
import { formatMoney, formatDate, formatMonthYear } from '../utils/formatters'
import type { FranquiciaTarjeta, CompraCuota } from '../types/finance'

export function TarjetasPage() {
  const {
    state,
    selectedMonth,
    deudaTotalTarjetas,
    cupoTotalTarjetas,
    cupoDisponibleTarjetas,
    totalCuotasTarjetasMes,
    addTarjeta,
    deleteTarjeta,
    addCompraCuota,
    pagarCuotaCompra,
    prepagarCompra,
    deleteCompraCuota,
  } = useFinance()

  const [modalTarjetaOpen, setModalTarjetaOpen] = useState(false)
  const [modalCompraOpen, setModalCompraOpen] = useState(false)
  const [modalAmortizacion, setModalAmortizacion] = useState<CompraCuota | null>(null)
  const [modalPagarCuota, setModalPagarCuota] = useState<CompraCuota | null>(null)
  const [cuentaPagoId, setCuentaPagoId] = useState(state.cuentas[0]?.id || '')

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
  const [fechaCompra, setFechaCompra] = useState(new Date().toISOString().slice(0, 10))
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
            Tarjetas de Crédito, Deudas & Compras a Cuotas
          </h1>
          <p>
            Control de cupos, compras diferidas con motor de amortización de cuotas y proyección de pagos mensuales.
          </p>
        </div>

        <div className="page-header-actions">
          <button type="button" className="btn secondary" onClick={() => setModalTarjetaOpen(true)}>
            + Agregar Tarjeta
          </button>
          <button type="button" className="btn primary" onClick={() => setModalCompraOpen(true)}>
            + Compra a Cuotas
          </button>
        </div>
      </div>

      {/* KPIs de Crédito */}
      <div className="stat-grid">
        <article className="stat-card">
          <div className="stat-card-top">
            <span className="stat-card-title">Cupo Total Otorgado</span>
            <span className="badge neutral">Límite Global</span>
          </div>
          <div className="stat-value">{formatMoney(cupoTotalTarjetas)}</div>
          <span className="stat-subtext">Sumatoria de todas tus tarjetas</span>
        </article>

        <article className="stat-card" style={{ borderLeft: '4px solid var(--color-expense)' }}>
          <div className="stat-card-top">
            <span className="stat-card-title">Deuda Total Pendiente</span>
            <span className="badge expense">Pasivo Actual</span>
          </div>
          <div className="stat-value" style={{ color: 'var(--color-expense)' }}>
            {formatMoney(deudaTotalTarjetas)}
          </div>
          <span className="stat-subtext">Saldo pendiente en compras diferidas</span>
        </article>

        <article className="stat-card" style={{ borderLeft: '4px solid var(--color-income)' }}>
          <div className="stat-card-top">
            <span className="stat-card-title">Cupo Disponible Total</span>
            <span className="badge income">Disponible</span>
          </div>
          <div className="stat-value" style={{ color: 'var(--color-income)' }}>
            {formatMoney(cupoDisponibleTarjetas)}
          </div>
          <span className="stat-subtext">Capacidad restante sin copar</span>
        </article>

        <article className="stat-card" style={{ borderLeft: '4px solid var(--color-credit)' }}>
          <div className="stat-card-top">
            <span className="stat-card-title">Cuotas a Pagar este Mes</span>
            <span className="badge credit">{formatMonthYear(selectedMonth)}</span>
          </div>
          <div className="stat-value" style={{ color: 'var(--color-credit)' }}>
            {formatMoney(totalCuotasTarjetasMes)}
          </div>
          <span className="stat-subtext">Facturación proyectada para este período</span>
        </article>
      </div>

      {/* Sección de Tarjetas Físicas Visuales */}
      <div className="panel">
        <div className="panel-header">
          <h2 className="panel-title">Tus Tarjetas de Crédito Registradas</h2>
          <button type="button" className="btn primary sm" onClick={() => setModalTarjetaOpen(true)}>
            + Nueva Tarjeta
          </button>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '1.5rem' }}>
          {state.tarjetas.map((t) => {
            const deudaTc = state.comprasCuotas
              .filter((c) => c.tarjetaId === t.id && c.estado === 'ACTIVA')
              .reduce((acc, c) => acc + c.saldoRestante, 0)
            const disponibleTc = Math.max(0, t.cupoTotal - deudaTc)
            const pctUso = t.cupoTotal > 0 ? Math.round((deudaTc / t.cupoTotal) * 100) : 0

            return (
              <div key={t.id} style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
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
                      <span>Deuda: <strong>{formatMoney(deudaTc)}</strong></span>
                      <span>Disponible: <strong>{formatMoney(disponibleTc)}</strong></span>
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

                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.7rem', marginTop: '0.4rem', opacity: 0.85 }}>
                      <span>Corte: Día {t.diaCorte} | Límite: Día {t.diaLimitePago}</span>
                      <span>Cupo: {formatMoney(t.cupoTotal)} ({pctUso}% usado)</span>
                    </div>
                  </div>
                </div>

                <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                  <button
                    type="button"
                    className="btn ghost sm"
                    style={{ fontSize: '0.75rem', color: 'var(--color-expense)' }}
                    onClick={() => {
                      if (confirm(`¿Eliminar la tarjeta ${t.nombre} y todas sus compras asociadas?`)) {
                        deleteTarjeta(t.id)
                      }
                    }}
                  >
                    Eliminar Tarjeta
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* Lista de Compras a Cuotas */}
      <div className="panel">
        <div className="panel-header">
          <h2 className="panel-title">
            Compras Diferidas a Cuotas (Amortización Activa)
          </h2>
          <button type="button" className="btn primary sm" onClick={() => setModalCompraOpen(true)}>
            + Registrar Compra a Cuotas
          </button>
        </div>

        <div className="table-container">
          <table>
            <thead>
              <tr>
                <th>Fecha</th>
                <th>Descripción / Comercio</th>
                <th>Tarjeta</th>
                <th>Progreso Cuotas</th>
                <th>Cuota Mensual</th>
                <th>Saldo Restante</th>
                <th>Estado</th>
                <th style={{ textAlign: 'right' }}>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {state.comprasCuotas.map((compra) => {
                const tarjeta = state.tarjetas.find((t) => t.id === compra.tarjetaId)
                const progresoPct = Math.round((compra.cuotasPagadas / compra.cuotasTotales) * 100)

                return (
                  <tr key={compra.id}>
                    <td style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)', whiteSpace: 'nowrap' }}>
                      {formatDate(compra.fechaCompra)}
                    </td>
                    <td>
                      <strong>{compra.descripcion}</strong>
                      {compra.comercio && (
                        <span style={{ display: 'block', fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>
                          {compra.comercio} • Monto inicial: {formatMoney(compra.montoTotal)}
                        </span>
                      )}
                    </td>
                    <td>
                      <span className="badge neutral" style={{ fontSize: '0.725rem' }}>
                        {tarjeta ? `${tarjeta.nombre} (•••• ${tarjeta.ultimos4Digitos})` : 'Tarjeta'}
                      </span>
                    </td>
                    <td style={{ minWidth: '130px' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', marginBottom: '3px' }}>
                        <span>Cuota {compra.cuotasPagadas} de {compra.cuotasTotales}</span>
                        <strong>{progresoPct}%</strong>
                      </div>
                      <div style={{ width: '100%', height: '6px', backgroundColor: 'var(--color-bg-alt)', borderRadius: '999px', overflow: 'hidden' }}>
                        <div
                          style={{
                            width: `${progresoPct}%`,
                            height: '100%',
                            backgroundColor: compra.estado === 'PAGADA' ? '#10b981' : '#8b5cf6',
                          }}
                        />
                      </div>
                    </td>
                    <td style={{ fontFamily: 'var(--font-mono)', fontWeight: 600, color: 'var(--color-credit)' }}>
                      {formatMoney(compra.valorCuota)}
                      {compra.tasaInteresMensual > 0 && (
                        <span style={{ display: 'block', fontSize: '0.7rem', color: 'var(--color-text-muted)' }}>
                          Tasa: {compra.tasaInteresMensual}% M.V.
                        </span>
                      )}
                    </td>
                    <td style={{ fontWeight: 600, color: compra.saldoRestante > 0 ? 'var(--color-expense)' : 'var(--color-income)' }}>
                      {formatMoney(compra.saldoRestante)}
                    </td>
                    <td>
                      <span
                        className={`badge ${
                          compra.estado === 'PAGADA' || compra.estado === 'PREPAGADA'
                            ? 'income'
                            : 'credit'
                        }`}
                        style={{ fontSize: '0.7rem' }}
                      >
                        {compra.estado}
                      </span>
                    </td>
                    <td style={{ textAlign: 'right', whiteSpace: 'nowrap' }}>
                      <div style={{ display: 'flex', gap: '0.35rem', justifyContent: 'flex-end' }}>
                        <button
                          type="button"
                          className="btn secondary sm"
                          onClick={() => setModalAmortizacion(compra)}
                          title="Ver tabla de amortización con intereses"
                        >
                          📊 Tabla
                        </button>
                        {compra.estado === 'ACTIVA' && (
                          <>
                            <button
                              type="button"
                              className="btn success sm"
                              onClick={() => {
                                setModalPagarCuota(compra)
                              }}
                              title="Pagar cuota mensual"
                            >
                              ✓ Pagar Cuota
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
                        <button
                          type="button"
                          className="btn ghost sm"
                          onClick={() => deleteCompraCuota(compra.id)}
                          title="Eliminar compra"
                        >
                          ✕
                        </button>
                      </div>
                    </td>
                  </tr>
                )
              })}
              {state.comprasCuotas.length === 0 && (
                <tr>
                  <td colSpan={8} style={{ textAlign: 'center', padding: '2.5rem', color: 'var(--color-text-muted)' }}>
                    No tienes compras a cuotas registradas.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* MODAL NUEVA TARJETA */}
      <Modal isOpen={modalTarjetaOpen} onClose={() => setModalTarjetaOpen(false)} title="💳 Agregar Tarjeta de Crédito">
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
      <Modal isOpen={modalCompraOpen} onClose={() => setModalCompraOpen(false)} title="🛍️ Registrar Compra a Cuotas">
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

            <div className="form-group">
              <label>Fecha de la Compra *</label>
              <input type="date" className="form-input" value={fechaCompra} onChange={(e) => setFechaCompra(e.target.value)} required />
            </div>
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
              <strong>💡 Proyección de la Cuota:</strong>
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

      {/* MODAL PAGAR CUOTA */}
      {modalPagarCuota && (
        <Modal isOpen={Boolean(modalPagarCuota)} onClose={() => setModalPagarCuota(null)} title="✓ Pagar Cuota de Tarjeta">
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

      {/* MODAL TABLA DE AMORTIZACIÓN */}
      {modalAmortizacion && (
        <Modal isOpen={Boolean(modalAmortizacion)} onClose={() => setModalAmortizacion(null)} title={`📊 Tabla de Amortización: ${modalAmortizacion.descripcion}`} maxWidth="680px">
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
    </div>
  )
}
