import { useState, useMemo, type FormEvent } from 'react'
import { useFinance } from '../context/FinanceContext'
import { Modal } from '../components/Modal'
import { formatMoney, formatDate, formatMonthYear } from '../utils/formatters'
import type { CategoriaGastoPersonal, TipoIngreso } from '../types/finance'

export function PersonalPage() {
  const {
    state,
    selectedMonth,
    totalIngresosMes,
    totalGastosPersonalesMes,
    addIngreso,
    deleteIngreso,
    addGastoPersonal,
    deleteGastoPersonal,
  } = useFinance()

  const [activeTab, setActiveTab] = useState<'INGRESOS' | 'GASTOS_PERSONALES'>('INGRESOS')

  // Modales
  const [modalIngresoOpen, setModalIngresoOpen] = useState(false)
  const [modalGastoOpen, setModalGastoOpen] = useState(false)

  // Form State Ingreso
  const [tipoIngreso, setTipoIngreso] = useState<TipoIngreso>('NOMINA')
  const [descIngreso, setDescIngreso] = useState('')
  const [montoIngreso, setMontoIngreso] = useState('')
  const [periodoIngreso, setPeriodoIngreso] = useState<'QUINCENA_1' | 'QUINCENA_2' | 'MENSUAL' | 'PUNTUAL'>('QUINCENA_1')
  const [fechaIngreso, setFechaIngreso] = useState(new Date().toISOString().slice(0, 10))
  const [cuentaIngresoId, setCuentaIngresoId] = useState(state.cuentas[0]?.id || '')

  // Form State Gasto Personal
  const [catGasto, setCatGasto] = useState<CategoriaGastoPersonal>('CELULAR')
  const [descGasto, setDescGasto] = useState('')
  const [montoGasto, setMontoGasto] = useState('')
  const [lugarGasto, setLugarGasto] = useState('')
  const [fechaGasto, setFechaGasto] = useState(new Date().toISOString().slice(0, 10))
  const [medioPagoSeleccionado, setMedioPagoSeleccionado] = useState(
    state.tarjetas.length > 0 ? `tarjeta:${state.tarjetas[0].id}` : state.cuentas[0] ? `cuenta:${state.cuentas[0].id}` : ''
  )

  // Datos filtrados del mes
  const ingresosMes = useMemo(() => {
    return state.ingresos.filter((i) => i.fecha.startsWith(selectedMonth))
  }, [state.ingresos, selectedMonth])

  const gastosPersonalesMes = useMemo(() => {
    return state.gastosPersonales.filter((g) => g.fecha.startsWith(selectedMonth))
  }, [state.gastosPersonales, selectedMonth])

  // Desglose por categorías clave solicitadas por el usuario
  const totalCelular = useMemo(() => {
    return gastosPersonalesMes
      .filter((g) => g.categoria === 'CELULAR')
      .reduce((acc, g) => acc + g.monto, 0)
  }, [gastosPersonalesMes])

  const totalGasolina = useMemo(() => {
    return gastosPersonalesMes
      .filter((g) => g.categoria === 'GASOLINA')
      .reduce((acc, g) => acc + g.monto, 0)
  }, [gastosPersonalesMes])

  const totalRestaurantes = useMemo(() => {
    return gastosPersonalesMes
      .filter((g) => g.categoria === 'RESTAURANTES_COMIDAS_FUERA')
      .reduce((acc, g) => acc + g.monto, 0)
  }, [gastosPersonalesMes])

  const totalPartidosOcio = useMemo(() => {
    return gastosPersonalesMes
      .filter((g) => g.categoria === 'PARTIDOS_OCIO_EVENTOS')
      .reduce((acc, g) => acc + g.monto, 0)
  }, [gastosPersonalesMes])

  const totalTarjeta1CuotaPersonal = useMemo(() => {
    return gastosPersonalesMes
      .filter((g) => Boolean(g.tarjetaId))
      .reduce((acc, g) => acc + g.monto, 0)
  }, [gastosPersonalesMes])

  function handleAddIngreso(e: FormEvent) {
    e.preventDefault()
    if (!montoIngreso || Number(montoIngreso) <= 0) return

    addIngreso({
      fecha: fechaIngreso,
      tipo: tipoIngreso,
      descripcion: descIngreso || `Ingreso de ${tipoIngreso.toLowerCase()}`,
      monto: Number(montoIngreso),
      periodo: periodoIngreso,
      cuentaId: cuentaIngresoId,
    })

    setDescIngreso('')
    setMontoIngreso('')
    setModalIngresoOpen(false)
  }

  function handleAddGastoPersonal(e: FormEvent) {
    e.preventDefault()
    if (!montoGasto || Number(montoGasto) <= 0) return

    const isTarjeta = medioPagoSeleccionado.startsWith('tarjeta:')
    const tarjetaId = isTarjeta ? medioPagoSeleccionado.replace('tarjeta:', '') : undefined
    const cuentaId = !isTarjeta ? medioPagoSeleccionado.replace('cuenta:', '') : undefined

    addGastoPersonal({
      fecha: fechaGasto,
      categoria: catGasto,
      descripcion: descGasto || 'Gasto personal',
      monto: Number(montoGasto),
      lugar: lugarGasto || undefined,
      cuentaId,
      tarjetaId,
      metodoPago: isTarjeta ? 'TARJETA_CREDITO' : 'CUENTA_DEBITO',
      cuotas: isTarjeta ? 1 : undefined,
    })

    setDescGasto('')
    setMontoGasto('')
    setLugarGasto('')
    setModalGastoOpen(false)
  }

  function aplicarPresetGasto(cat: CategoriaGastoPersonal, desc: string, monto: number, defaultTarjeta = true) {
    setCatGasto(cat)
    setDescGasto(desc)
    setMontoGasto(String(monto))
    if (defaultTarjeta && state.tarjetas.length > 0) {
      setMedioPagoSeleccionado(`tarjeta:${state.tarjetas[0].id}`)
    }
    setModalGastoOpen(true)
  }

  return (
    <div className="page">
      {/* Header */}
      <div className="page-header">
        <div className="page-header-info">
          <h1>
            <svg viewBox="0 0 24 24" width="28" height="28" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="7" r="4" />
              <path d="M5.5 21v-2a6.5 6.5 0 0 1 13 0v2" />
            </svg>
            Finanzas Personales, Celular, Gasolina & Ocio
          </h1>
          <p>
            Control de nómina, gastos mensuales a 1 cuota con tarjeta de crédito (celular, gasolina, suscripciones) y ocio para{' '}
            <strong>{formatMonthYear(selectedMonth)}</strong>.
          </p>
        </div>

        <div className="page-header-actions">
          {activeTab === 'INGRESOS' ? (
            <button type="button" className="btn success" onClick={() => setModalIngresoOpen(true)}>
              + Registrar Ingreso / Nómina
            </button>
          ) : (
            <button type="button" className="btn primary" onClick={() => setModalGastoOpen(true)}>
              + Registrar Gasto Personal / Ocio
            </button>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="tabs-nav">
        <button
          type="button"
          className={`tab-btn ${activeTab === 'INGRESOS' ? 'active' : ''}`}
          onClick={() => setActiveTab('INGRESOS')}
        >
          💰 Ingresos & Nómina ({formatMoney(totalIngresosMes)})
        </button>
        <button
          type="button"
          className={`tab-btn ${activeTab === 'GASTOS_PERSONALES' ? 'active' : ''}`}
          onClick={() => setActiveTab('GASTOS_PERSONALES')}
        >
          🎉 Gastos Personales, Celular & Gasolina ({formatMoney(totalGastosPersonalesMes)})
        </button>
      </div>

      {/* BARRA DE BOTONES RÁPIDOS PARA SERVICIOS MENSUALES CON TARJETA */}
      {activeTab === 'GASTOS_PERSONALES' && (
        <div style={{ backgroundColor: 'var(--color-bg-alt)', padding: '0.85rem 1.25rem', borderRadius: 'var(--radius-lg)', border: '1px solid var(--color-border)', marginBottom: '1.25rem', display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
          <span style={{ fontSize: '0.825rem', fontWeight: 600, color: 'var(--color-text-muted)' }}>
            ⚡ Registro Rápido (1 Cuota con Tarjeta):
          </span>
          <button
            type="button"
            className="btn secondary sm"
            onClick={() => aplicarPresetGasto('CELULAR', 'Plan Celular Mensual (Claro/Tigo/WOM)', 45000)}
          >
            📱 Plan Celular ($45k)
          </button>
          <button
            type="button"
            className="btn secondary sm"
            onClick={() => aplicarPresetGasto('GASOLINA', 'Tanqueo de Gasolina / Combustible', 50000)}
          >
            ⛽ Gasolina ($50k)
          </button>
          <button
            type="button"
            className="btn secondary sm"
            onClick={() => aplicarPresetGasto('GASOLINA', 'Tanqueo de Gasolina / Combustible Lleno', 100000)}
          >
            ⛽ Gasolina ($100k)
          </button>
          <button
            type="button"
            className="btn secondary sm"
            onClick={() => aplicarPresetGasto('SUSCRIPCIONES', 'Suscripción Streaming (Netflix / Spotify)', 35000)}
          >
            📺 Netflix/Spotify ($35k)
          </button>
        </div>
      )}

      {/* SUB-KPIs para Gastos Personales */}
      {activeTab === 'GASTOS_PERSONALES' && (
        <div className="stat-grid">
          <article className="stat-card" style={{ borderLeft: '4px solid #3b82f6' }}>
            <div className="stat-card-top">
              <span className="stat-card-title">📱 Celular & Móvil</span>
              <span className="badge neutral">Servicio Mensual</span>
            </div>
            <div className="stat-value">{formatMoney(totalCelular)}</div>
            <span className="stat-subtext">Planes pospago y recargas</span>
          </article>

          <article className="stat-card" style={{ borderLeft: '4px solid #f97316' }}>
            <div className="stat-card-top">
              <span className="stat-card-title">⛽ Gasolina & Tanqueo</span>
              <span className="badge neutral">Combustible</span>
            </div>
            <div className="stat-value">{formatMoney(totalGasolina)}</div>
            <span className="stat-subtext">Tanqueadas de moto / carro</span>
          </article>

          <article className="stat-card" style={{ borderLeft: '4px solid #8b5cf6' }}>
            <div className="stat-card-top">
              <span className="stat-card-title">💳 Con Tarjeta (1 Cuota)</span>
              <span className="badge credit">Extracto Mes</span>
            </div>
            <div className="stat-value" style={{ color: 'var(--color-credit)' }}>{formatMoney(totalTarjeta1CuotaPersonal)}</div>
            <span className="stat-subtext">Pagado a 1 cuota corriente</span>
          </article>

          <article className="stat-card" style={{ borderLeft: '4px solid #10b981' }}>
            <div className="stat-card-top">
              <span className="stat-card-title">⚽ Ocio & Salidas</span>
              <span className="badge neutral">Entretenimiento</span>
            </div>
            <div className="stat-value">{formatMoney(totalRestaurantes + totalPartidosOcio)}</div>
            <span className="stat-subtext">Restaurantes, fútbol y cine</span>
          </article>
        </div>
      )}

      {/* TAB 1: INGRESOS Y NÓMINA */}
      {activeTab === 'INGRESOS' && (
        <div className="panel">
          <div className="panel-header">
            <h2 className="panel-title">Entradas de Dinero y Nómina ({formatMonthYear(selectedMonth)})</h2>
            <button type="button" className="btn success sm" onClick={() => setModalIngresoOpen(true)}>
              + Nuevo Ingreso
            </button>
          </div>

          <div className="table-container">
            <table>
              <thead>
                <tr>
                  <th>Fecha</th>
                  <th>Tipo</th>
                  <th>Descripción</th>
                  <th>Periodicidad</th>
                  <th>Cuenta Destino</th>
                  <th style={{ textAlign: 'right' }}>Monto</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {ingresosMes.map((ing) => {
                  const cuenta = state.cuentas.find((c) => c.id === ing.cuentaId)
                  return (
                    <tr key={ing.id}>
                      <td>{formatDate(ing.fecha)}</td>
                      <td>
                        <span className="badge income" style={{ fontSize: '0.75rem' }}>
                          {ing.tipo}
                        </span>
                      </td>
                      <td><strong>{ing.descripcion}</strong></td>
                      <td style={{ color: 'var(--color-text-muted)', fontSize: '0.8rem' }}>
                        {ing.periodo === 'QUINCENA_1'
                          ? '1ra Quincena'
                          : ing.periodo === 'QUINCENA_2'
                          ? '2da Quincena'
                          : ing.periodo === 'MENSUAL'
                          ? 'Mensual'
                          : 'Puntual / Extra'}
                      </td>
                      <td>{cuenta?.nombre || 'Bancos'}</td>
                      <td style={{ textAlign: 'right', fontWeight: 600, color: 'var(--color-income-hover)' }}>
                        + {formatMoney(ing.monto)}
                      </td>
                      <td style={{ textAlign: 'right' }}>
                        <button
                          type="button"
                          className="btn ghost sm"
                          onClick={() => deleteIngreso(ing.id)}
                          title="Eliminar ingreso"
                        >
                          ✕
                        </button>
                      </td>
                    </tr>
                  )
                })}
                {ingresosMes.length === 0 && (
                  <tr>
                    <td colSpan={7} style={{ textAlign: 'center', padding: '2.5rem', color: 'var(--color-text-muted)' }}>
                      No has registrado ingresos en {formatMonthYear(selectedMonth)}.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 2: GASTOS PERSONALES & OCIO */}
      {activeTab === 'GASTOS_PERSONALES' && (
        <div className="panel">
          <div className="panel-header">
            <h2 className="panel-title">Gastos Personales, Celular & Gasolina ({formatMonthYear(selectedMonth)})</h2>
            <button type="button" className="btn primary sm" onClick={() => setModalGastoOpen(true)}>
              + Registrar Gasto
            </button>
          </div>

          <div className="table-container">
            <table>
              <thead>
                <tr>
                  <th>Fecha</th>
                  <th>Categoría</th>
                  <th>Descripción</th>
                  <th>Lugar / Detalle</th>
                  <th>Medio de Pago</th>
                  <th style={{ textAlign: 'right' }}>Monto</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {gastosPersonalesMes.map((gp) => {
                  const cuenta = state.cuentas.find((c) => c.id === gp.cuentaId)
                  const tarjeta = state.tarjetas.find((t) => t.id === gp.tarjetaId)

                  let catBadge = 'neutral'
                  let catLabel = gp.categoria.replace(/_/g, ' ')
                  if (gp.categoria === 'CELULAR') { catBadge = 'primary'; catLabel = '📱 Celular'; }
                  if (gp.categoria === 'GASOLINA') { catBadge = 'warning'; catLabel = '⛽ Gasolina'; }
                  if (gp.categoria === 'SUSCRIPCIONES') { catBadge = 'credit'; catLabel = '📺 Suscripciones'; }
                  if (gp.categoria === 'RESTAURANTES_COMIDAS_FUERA') { catBadge = 'income'; catLabel = '🍔 Restaurantes'; }
                  if (gp.categoria === 'PARTIDOS_OCIO_EVENTOS') { catBadge = 'primary'; catLabel = '⚽ Partidos / Ocio'; }
                  if (gp.categoria === 'REGALOS') { catBadge = 'credit'; catLabel = '🎁 Regalos'; }
                  if (gp.categoria === 'SEGUROS_SALUD') { catBadge = 'warning'; catLabel = '🛡️ Salud / Seguro'; }

                  return (
                    <tr key={gp.id}>
                      <td>{formatDate(gp.fecha)}</td>
                      <td>
                        <span className={`badge ${catBadge}`} style={{ fontSize: '0.725rem' }}>
                          {catLabel}
                        </span>
                      </td>
                      <td><strong>{gp.descripcion}</strong></td>
                      <td style={{ color: 'var(--color-text-muted)' }}>{gp.lugar || '—'}</td>
                      <td>
                        {tarjeta ? (
                          <span className="badge credit" style={{ fontSize: '0.725rem' }}>
                            💳 {tarjeta.nombre} (1 cuota)
                          </span>
                        ) : (
                          <span className="badge neutral" style={{ fontSize: '0.725rem' }}>
                            🏦 {cuenta?.nombre || 'Efectivo / Cuenta'}
                          </span>
                        )}
                      </td>
                      <td style={{ textAlign: 'right', fontWeight: 600, color: 'var(--color-expense)' }}>
                        - {formatMoney(gp.monto)}
                      </td>
                      <td style={{ textAlign: 'right' }}>
                        <button
                          type="button"
                          className="btn ghost sm"
                          onClick={() => deleteGastoPersonal(gp.id)}
                          title="Eliminar gasto"
                        >
                          ✕
                        </button>
                      </td>
                    </tr>
                  )
                })}
                {gastosPersonalesMes.length === 0 && (
                  <tr>
                    <td colSpan={7} style={{ textAlign: 'center', padding: '2.5rem', color: 'var(--color-text-muted)' }}>
                      No hay gastos personales registrados este mes.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* MODAL REGISTRAR INGRESO */}
      <Modal isOpen={modalIngresoOpen} onClose={() => setModalIngresoOpen(false)} title="💰 Registrar Ingreso o Nómina">
        <form onSubmit={handleAddIngreso} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <div className="form-group">
            <label>Tipo de Entrada *</label>
            <select
              className="form-select"
              value={tipoIngreso}
              onChange={(e) => setTipoIngreso(e.target.value as typeof tipoIngreso)}
            >
              <option value="NOMINA">💼 Nómina / Sueldo Fijo</option>
              <option value="HORAS_EXTRAS">⏰ Horas Extras / Recargos</option>
              <option value="BONIFICACION">🌟 Bonificación</option>
              <option value="FREELANCE">💻 Trabajo Independiente / Freelance</option>
              <option value="RENDIMIENTOS">📈 Rendimientos Financieros</option>
              <option value="REGALO">🎁 Regalo de Dinero</option>
              <option value="OTRO">Otro Ingreso</option>
            </select>
          </div>

          <div className="form-group">
            <label>Descripción / Concepto *</label>
            <input
              type="text"
              className="form-input"
              placeholder="Ej: Pago Nómina 1ra Quincena, Proyecto diseño web"
              value={descIngreso}
              onChange={(e) => setDescIngreso(e.target.value)}
              required
            />
          </div>

          <div className="form-grid">
            <div className="form-group">
              <label>Monto Neto Recibido ($ COP) *</label>
              <input
                type="number"
                className="form-input"
                placeholder="Ej: 2100000"
                value={montoIngreso}
                onChange={(e) => setMontoIngreso(e.target.value)}
                required
              />
            </div>

            <div className="form-group">
              <label>Fecha de Recepción *</label>
              <input type="date" className="form-input" value={fechaIngreso} onChange={(e) => setFechaIngreso(e.target.value)} required />
            </div>
          </div>

          <div className="form-grid">
            <div className="form-group">
              <label>Periodo</label>
              <select
                className="form-select"
                value={periodoIngreso}
                onChange={(e) => setPeriodoIngreso(e.target.value as typeof periodoIngreso)}
              >
                <option value="QUINCENA_1">1ra Quincena</option>
                <option value="QUINCENA_2">2da Quincena</option>
                <option value="MENSUAL">Mensual</option>
                <option value="PUNTUAL">Puntual / Ocasional</option>
              </select>
            </div>

            <div className="form-group">
              <label>Cuenta Destino</label>
              <select className="form-select" value={cuentaIngresoId} onChange={(e) => setCuentaIngresoId(e.target.value)}>
                {state.cuentas.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.nombre}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '0.5rem' }}>
            <button type="button" className="btn secondary" onClick={() => setModalIngresoOpen(false)}>
              Cancelar
            </button>
            <button type="submit" className="btn success">
              Guardar Ingreso
            </button>
          </div>
        </form>
      </Modal>

      {/* MODAL REGISTRAR GASTO PERSONAL */}
      <Modal isOpen={modalGastoOpen} onClose={() => setModalGastoOpen(false)} title="🎉 Registrar Gasto Personal / Ocio">
        <form onSubmit={handleAddGastoPersonal} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <div className="form-group">
            <label>Categoría del Gasto *</label>
            <select
              className="form-select"
              value={catGasto}
              onChange={(e) => setCatGasto(e.target.value as typeof catGasto)}
            >
              <option value="CELULAR">📱 Servicio de Celular / Plan Móvil</option>
              <option value="GASOLINA">⛽ Gasolina / Combustible / Tanqueo</option>
              <option value="SUSCRIPCIONES">📺 Suscripciones (Netflix, Spotify, Gym, iCloud)</option>
              <option value="RESTAURANTES_COMIDAS_FUERA">🍔 Salidas a comer / Restaurantes / Domicilios</option>
              <option value="PARTIDOS_OCIO_EVENTOS">⚽ Partidos / Canchas sintéticas / Fútbol / Eventos / Cine</option>
              <option value="REGALOS">🎁 Regalos (Cumpleaños, aniversarios, detalles)</option>
              <option value="ROPA_CUIDADO">👕 Ropa, Peluquería & Cuidado Personal</option>
              <option value="TRANSPORTE">🚕 Taxi / Uber / Pasajes</option>
              <option value="SEGUROS_SALUD">🛡️ Seguro de Vida / Medicina Prepagada / Farmacia</option>
              <option value="OTROS">Otros Gastos Personales</option>
            </select>
          </div>

          <div className="form-group">
            <label>Descripción / Detalle *</label>
            <input
              type="text"
              className="form-input"
              placeholder="Ej: Plan Claro 50GB, Tanqueada de Gasolina, Salida El Corral"
              value={descGasto}
              onChange={(e) => setDescGasto(e.target.value)}
              required
            />
          </div>

          <div className="form-grid">
            <div className="form-group">
              <label>Monto ($ COP) *</label>
              <input
                type="number"
                className="form-input"
                placeholder="Ej: 45000"
                value={montoGasto}
                onChange={(e) => setMontoGasto(e.target.value)}
                required
              />
            </div>

            <div className="form-group">
              <label>Fecha *</label>
              <input type="date" className="form-input" value={fechaGasto} onChange={(e) => setFechaGasto(e.target.value)} required />
            </div>
          </div>

          <div className="form-grid">
            <div className="form-group">
              <label>Lugar / Establecimiento</label>
              <input
                type="text"
                className="form-input"
                placeholder="Ej: Estación Terpel, Claro, Netflix, Canchas La 10"
                value={lugarGasto}
                onChange={(e) => setLugarGasto(e.target.value)}
              />
            </div>

            <div className="form-group">
              <label>Medio de Pago *</label>
              <select
                className="form-select"
                value={medioPagoSeleccionado}
                onChange={(e) => setMedioPagoSeleccionado(e.target.value)}
              >
                {state.tarjetas.length > 0 && (
                  <optgroup label="💳 Tarjetas de Crédito (1 Cuota - Mes a Mes)">
                    {state.tarjetas.map((t) => (
                      <option key={t.id} value={`tarjeta:${t.id}`}>
                        💳 {t.nombre} (•••• {t.ultimos4Digitos}) - 1 Cuota
                      </option>
                    ))}
                  </optgroup>
                )}
                {state.cuentas.length > 0 && (
                  <optgroup label="🏦 Cuentas de Ahorros / Billeteras">
                    {state.cuentas.map((c) => (
                      <option key={c.id} value={`cuenta:${c.id}`}>
                        🏦 {c.nombre} (Saldo: {formatMoney(c.saldo)})
                      </option>
                    ))}
                  </optgroup>
                )}
              </select>
            </div>
          </div>

          {medioPagoSeleccionado.startsWith('tarjeta:') && (
            <div className="banner info" style={{ fontSize: '0.8rem', padding: '0.6rem 0.85rem' }}>
              ℹ️ Pagado con <strong>Tarjeta a 1 cuota</strong>: Se incluirá en tus gastos del mes y en el extracto de tu tarjeta sin restar saldo bancario de inmediato.
            </div>
          )}

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '0.5rem' }}>
            <button type="button" className="btn secondary" onClick={() => setModalGastoOpen(false)}>
              Cancelar
            </button>
            <button type="submit" className="btn success">
              Guardar Gasto
            </button>
          </div>
        </form>
      </Modal>
    </div>
  )
}
