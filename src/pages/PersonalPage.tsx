import { useState, useMemo, type FormEvent } from 'react'
import { useFinance } from '../context/FinanceContext'
import { Modal } from '../components/Modal'
import { DatePickerInput } from '../components/DatePickerInput'
import { formatMoney, formatDate, formatMonthYear, getLocalTodayISO } from '../utils/formatters'
import type { CategoriaGastoPersonal, MetodoPago, TipoIngreso } from '../types/finance'

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
    addGastoRecurrente,
    deleteGastoRecurrente,
    toggleActivoGastoRecurrente,
    aplicarGastoRecurrenteAlMes,
    aplicarTodosRecurrentesPendientes,
  } = useFinance()

  const [activeTab, setActiveTab] = useState<'INGRESOS' | 'GASTOS_PERSONALES' | 'GASTOS_FIJOS'>('GASTOS_PERSONALES')

  // Modales
  const [modalIngresoOpen, setModalIngresoOpen] = useState(false)
  const [modalGastoOpen, setModalGastoOpen] = useState(false)
  const [modalRecurrenteOpen, setModalRecurrenteOpen] = useState(false)

  // Form State Ingreso
  const [tipoIngreso, setTipoIngreso] = useState<TipoIngreso>('NOMINA')
  const [descIngreso, setDescIngreso] = useState('')
  const [montoIngreso, setMontoIngreso] = useState('')
  const [periodoIngreso, setPeriodoIngreso] = useState<'QUINCENA_1' | 'QUINCENA_2' | 'MENSUAL' | 'PUNTUAL'>('QUINCENA_1')
  const [fechaIngreso, setFechaIngreso] = useState(getLocalTodayISO())
  const [cuentaIngresoId, setCuentaIngresoId] = useState(state.cuentas[0]?.id || '')

  // Form State Gasto Personal
  const [catGasto, setCatGasto] = useState<CategoriaGastoPersonal>('CELULAR')
  const [descGasto, setDescGasto] = useState('')
  const [montoGasto, setMontoGasto] = useState('')
  const [lugarGasto, setLugarGasto] = useState('')
  const [fechaGasto, setFechaGasto] = useState(getLocalTodayISO())
  const [medioPagoSeleccionado, setMedioPagoSeleccionado] = useState(
    state.tarjetas.length > 0 ? `tarjeta:${state.tarjetas[0].id}` : state.cuentas[0] ? `cuenta:${state.cuentas[0].id}` : ''
  )

  // Form State Gasto Recurrente / Fijo Mensual
  const [nombreRecurrente, setNombreRecurrente] = useState('')
  const [catRecurrente, setCatRecurrente] = useState<CategoriaGastoPersonal>('PARQUEADERO')
  const [montoRecurrente, setMontoRecurrente] = useState('')
  const [diaCobroRecurrente, setDiaCobroRecurrente] = useState('5')
  const [medioPagoRecurrente, setMedioPagoRecurrente] = useState(
    state.tarjetas.length > 0 ? `tarjeta:${state.tarjetas[0].id}` : state.cuentas[0] ? `cuenta:${state.cuentas[0].id}` : ''
  )
  const [notasRecurrente, setNotasRecurrente] = useState('')

  // Datos filtrados del mes
  const ingresosMes = useMemo(() => {
    return state.ingresos.filter((i) => i.fecha.startsWith(selectedMonth))
  }, [state.ingresos, selectedMonth])

  const gastosPersonalesMes = useMemo(() => {
    return state.gastosPersonales.filter((g) => g.fecha.startsWith(selectedMonth))
  }, [state.gastosPersonales, selectedMonth])

  // Desglose por categorías clave
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

  const totalParqueadero = useMemo(() => {
    return gastosPersonalesMes
      .filter((g) => g.categoria === 'PARQUEADERO')
      .reduce((acc, g) => acc + g.monto, 0)
  }, [gastosPersonalesMes])

  const totalRestaurantesYOcio = useMemo(() => {
    return gastosPersonalesMes
      .filter((g) => g.categoria === 'RESTAURANTES_COMIDAS_FUERA' || g.categoria === 'PARTIDOS_OCIO_EVENTOS')
      .reduce((acc, g) => acc + g.monto, 0)
  }, [gastosPersonalesMes])

  const totalTarjeta1CuotaPersonal = useMemo(() => {
    return gastosPersonalesMes
      .filter((g) => Boolean(g.tarjetaId))
      .reduce((acc, g) => acc + g.monto, 0)
  }, [gastosPersonalesMes])

  // Gastos Fijos Mensuales: métricas y estado en el mes corriente
  const gastosRecurrentesLista = useMemo(() => {
    return state.gastosRecurrentes || []
  }, [state.gastosRecurrentes])

  const totalGastosFijosPresupuestados = useMemo(() => {
    return gastosRecurrentesLista
      .filter((r) => r.activo)
      .reduce((acc, r) => acc + r.monto, 0)
  }, [gastosRecurrentesLista])

  const estadoRecurrentesEnMes = useMemo(() => {
    return gastosRecurrentesLista.map((r) => {
      const gastoExistente = gastosPersonalesMes.find(
        (g) => g.recurrenteId === r.id || (g.descripcion.toLowerCase() === r.nombre.toLowerCase() && g.monto === r.monto)
      )
      return {
        recurrente: r,
        aplicado: Boolean(gastoExistente),
        gastoId: gastoExistente?.id,
        fechaAplicado: gastoExistente?.fecha,
      }
    })
  }, [gastosRecurrentesLista, gastosPersonalesMes])

  const cantidadPendientesMes = useMemo(() => {
    return estadoRecurrentesEnMes.filter((item) => item.recurrente.activo && !item.aplicado).length
  }, [estadoRecurrentesEnMes])

  const totalPendienteMes = useMemo(() => {
    return estadoRecurrentesEnMes
      .filter((item) => item.recurrente.activo && !item.aplicado)
      .reduce((acc, item) => acc + item.recurrente.monto, 0)
  }, [estadoRecurrentesEnMes])

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

  function handleAddRecurrente(e: FormEvent) {
    e.preventDefault()
    if (!nombreRecurrente || !montoRecurrente || Number(montoRecurrente) <= 0) return

    const isTarjeta = medioPagoRecurrente.startsWith('tarjeta:')
    const tarjetaId = isTarjeta ? medioPagoRecurrente.replace('tarjeta:', '') : undefined
    const cuentaId = !isTarjeta ? medioPagoRecurrente.replace('cuenta:', '') : undefined
    const metodoPago: MetodoPago = isTarjeta ? 'TARJETA_CREDITO' : 'CUENTA_DEBITO'

    addGastoRecurrente({
      nombre: nombreRecurrente,
      categoria: catRecurrente,
      monto: Number(montoRecurrente),
      diaCobro: Math.min(31, Math.max(1, Number(diaCobroRecurrente) || 5)),
      metodoPago,
      cuentaId,
      tarjetaId,
      activo: true,
      notas: notasRecurrente || undefined,
    })

    setNombreRecurrente('')
    setMontoRecurrente('')
    setNotasRecurrente('')
    setModalRecurrenteOpen(false)
  }

  function aplicarPresetGasto(cat: CategoriaGastoPersonal, desc: string, monto: number, defaultTarjeta = true) {
    setCatGasto(cat)
    setDescGasto(desc)
    setMontoGasto(String(monto))
    if (defaultTarjeta && state.tarjetas.length > 0) {
      setMedioPagoSeleccionado(`tarjeta:${state.tarjetas[0].id}`)
    } else if (state.cuentas.length > 0) {
      setMedioPagoSeleccionado(`cuenta:${state.cuentas[0].id}`)
    }
    setModalGastoOpen(true)
  }

  function crearPlantillaRecurrenteRapida(nombre: string, cat: CategoriaGastoPersonal, monto: number, dia: number, useTarjeta = true) {
    setNombreRecurrente(nombre)
    setCatRecurrente(cat)
    setMontoRecurrente(String(monto))
    setDiaCobroRecurrente(String(dia))
    if (useTarjeta && state.tarjetas.length > 0) {
      setMedioPagoRecurrente(`tarjeta:${state.tarjetas[0].id}`)
    } else if (state.cuentas.length > 0) {
      setMedioPagoRecurrente(`cuenta:${state.cuentas[0].id}`)
    }
    setModalRecurrenteOpen(true)
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
            Finanzas Personales, Gastos Fijos & Ocio
          </h1>
          <p>
            Control de nómina, gastos obligatorios mensuales fijos (parqueadero, celular, suscripciones), pagos con tarjeta a 1 cuota y ocio para{' '}
            <strong>{formatMonthYear(selectedMonth)}</strong>.
          </p>
        </div>

        <div className="page-header-actions">
          {activeTab === 'INGRESOS' && (
            <button type="button" className="btn success" onClick={() => setModalIngresoOpen(true)}>
              + Registrar Ingreso / Nómina
            </button>
          )}
          {activeTab === 'GASTOS_PERSONALES' && (
            <button type="button" className="btn primary" onClick={() => setModalGastoOpen(true)}>
              + Registrar Gasto Personal
            </button>
          )}
          {activeTab === 'GASTOS_FIJOS' && (
            <button type="button" className="btn primary" onClick={() => setModalRecurrenteOpen(true)}>
              + Nuevo Gasto Fijo Mensual
            </button>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="tabs-nav">
        <button
          type="button"
          className={`tab-btn ${activeTab === 'GASTOS_PERSONALES' ? 'active' : ''}`}
          onClick={() => setActiveTab('GASTOS_PERSONALES')}
        >
          Gastos del Mes ({formatMoney(totalGastosPersonalesMes)})
        </button>
        <button
          type="button"
          className={`tab-btn ${activeTab === 'GASTOS_FIJOS' ? 'active' : ''}`}
          onClick={() => setActiveTab('GASTOS_FIJOS')}
        >
          Gastos Fijos & Suscripciones ({gastosRecurrentesLista.length})
          {cantidadPendientesMes > 0 && (
            <span className="badge warning" style={{ marginLeft: '6px', fontSize: '0.7rem' }}>
              {cantidadPendientesMes} pendientes
            </span>
          )}
        </button>
        <button
          type="button"
          className={`tab-btn ${activeTab === 'INGRESOS' ? 'active' : ''}`}
          onClick={() => setActiveTab('INGRESOS')}
        >
          Ingresos & Nómina ({formatMoney(totalIngresosMes)})
        </button>
      </div>

      {/* ========================================================================= */}
      {/* TAB 1: GASTOS PERSONALES & OCIO */}
      {/* ========================================================================= */}
      {activeTab === 'GASTOS_PERSONALES' && (
        <>
          {/* Banner de alerta si hay gastos fijos pendientes de registrar este mes */}
          {cantidadPendientesMes > 0 && (
            <div
              className="banner info"
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                marginBottom: '1.25rem',
                flexWrap: 'wrap',
                gap: '0.75rem',
              }}
            >
              <div>
                <strong>Tienes {cantidadPendientesMes} gastos fijos mensuales pendientes de aplicar este mes:</strong>
                <span style={{ display: 'block', fontSize: '0.8rem', opacity: 0.9 }}>
                  Parqueadero, Plan celular, Netflix, Crunchyroll, etc. (Total pendiente: {formatMoney(totalPendienteMes)})
                </span>
              </div>
              <button
                type="button"
                className="btn primary sm"
                onClick={() => aplicarTodosRecurrentesPendientes(selectedMonth)}
              >
                Aplicar todos a {formatMonthYear(selectedMonth)}
              </button>
            </div>
          )}

          {/* BARRA DE BOTONES RÁPIDOS PARA SERVICIOS MENSUALES */}
          <div
            style={{
              backgroundColor: 'var(--color-bg-alt)',
              padding: '0.85rem 1.25rem',
              borderRadius: 'var(--radius-lg)',
              border: '1px solid var(--color-border)',
              marginBottom: '1.25rem',
              display: 'flex',
              alignItems: 'center',
              gap: '0.75rem',
              flexWrap: 'wrap',
            }}
          >
            <span style={{ fontSize: '0.825rem', fontWeight: 600, color: 'var(--color-text-muted)' }}>
              Registro Rápido:
            </span>
            <button
              type="button"
              className="btn secondary sm"
              onClick={() => aplicarPresetGasto('PARQUEADERO', 'Pago mensual de Parqueadero', 30000, false)}
            >
              Parqueadero ($30k)
            </button>
            <button
              type="button"
              className="btn secondary sm"
              onClick={() => aplicarPresetGasto('CELULAR', 'Plan Celular Mensual (Claro/Tigo/WOM)', 45000, true)}
            >
              Plan Celular ($45k)
            </button>
            <button
              type="button"
              className="btn secondary sm"
              onClick={() => aplicarPresetGasto('GASOLINA', 'Tanqueo de Gasolina / Combustible', 50000, true)}
            >
              Gasolina ($50k)
            </button>
            <button
              type="button"
              className="btn secondary sm"
              onClick={() => aplicarPresetGasto('GASOLINA', 'Tanqueo de Gasolina / Combustible Lleno', 100000, true)}
            >
              Gasolina ($100k)
            </button>
            <button
              type="button"
              className="btn secondary sm"
              onClick={() => aplicarPresetGasto('SUSCRIPCIONES', 'Suscripción Streaming (Netflix / Spotify)', 35000, true)}
            >
              Netflix/Spotify ($35k)
            </button>
            <button
              type="button"
              className="btn secondary sm"
              onClick={() => aplicarPresetGasto('SUSCRIPCIONES', 'Suscripción Crunchyroll Anime', 15000, true)}
            >
              Crunchyroll ($15k)
            </button>
          </div>

          {/* SUB-KPIs para Gastos Personales */}
          <div className="stat-grid">
            <article className="stat-card" style={{ borderLeft: '4px solid #0284c7' }}>
              <div className="stat-card-top">
                <span className="stat-card-title">Parqueadero</span>
                <span className="badge neutral">Fijo Mensual</span>
              </div>
              <div className="stat-value">{formatMoney(totalParqueadero)}</div>
              <span className="stat-subtext">Estacionamiento mensual</span>
            </article>

            <article className="stat-card" style={{ borderLeft: '4px solid #3b82f6' }}>
              <div className="stat-card-top">
                <span className="stat-card-title">Celular & Móvil</span>
                <span className="badge neutral">Servicio Mensual</span>
              </div>
              <div className="stat-value">{formatMoney(totalCelular)}</div>
              <span className="stat-subtext">Planes pospago y recargas</span>
            </article>

            <article className="stat-card" style={{ borderLeft: '4px solid #f97316' }}>
              <div className="stat-card-top">
                <span className="stat-card-title">Gasolina & Tanqueo</span>
                <span className="badge neutral">Combustible</span>
              </div>
              <div className="stat-value">{formatMoney(totalGasolina)}</div>
              <span className="stat-subtext">Tanqueadas de moto / carro</span>
            </article>

            <article className="stat-card" style={{ borderLeft: '4px solid #8b5cf6' }}>
              <div className="stat-card-top">
                <span className="stat-card-title">Tarjeta (1 Cuota)</span>
                <span className="badge credit">Extracto Mes</span>
              </div>
              <div className="stat-value" style={{ color: 'var(--color-credit)' }}>
                {formatMoney(totalTarjeta1CuotaPersonal)}
              </div>
              <span className="stat-subtext">Pagado a 1 cuota corriente</span>
            </article>

            <article className="stat-card" style={{ borderLeft: '4px solid #10b981' }}>
              <div className="stat-card-top">
                <span className="stat-card-title">Ocio & Salidas</span>
                <span className="badge neutral">Entretenimiento</span>
              </div>
              <div className="stat-value">{formatMoney(totalRestaurantesYOcio)}</div>
              <span className="stat-subtext">Restaurantes, fútbol y cine</span>
            </article>
          </div>

          {/* Tabla de Gastos Personales del Mes */}
          <div className="panel">
            <div className="panel-header">
              <h2 className="panel-title">Gastos Personales Registrados ({formatMonthYear(selectedMonth)})</h2>
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
                    if (gp.categoria === 'PARQUEADERO') { catBadge = 'primary'; catLabel = 'Parqueadero'; }
                    if (gp.categoria === 'CELULAR') { catBadge = 'primary'; catLabel = 'Celular'; }
                    if (gp.categoria === 'GASOLINA') { catBadge = 'warning'; catLabel = 'Gasolina'; }
                    if (gp.categoria === 'SUSCRIPCIONES') { catBadge = 'credit'; catLabel = 'Suscripciones'; }
                    if (gp.categoria === 'RESTAURANTES_COMIDAS_FUERA') { catBadge = 'income'; catLabel = 'Restaurantes'; }
                    if (gp.categoria === 'PARTIDOS_OCIO_EVENTOS') { catBadge = 'primary'; catLabel = 'Partidos / Ocio'; }
                    if (gp.categoria === 'REGALOS') { catBadge = 'credit'; catLabel = 'Regalos'; }
                    if (gp.categoria === 'SEGUROS_SALUD') { catBadge = 'warning'; catLabel = 'Salud / Seguro'; }

                    return (
                      <tr key={gp.id}>
                        <td>{formatDate(gp.fecha)}</td>
                        <td>
                          <span className={`badge ${catBadge}`} style={{ fontSize: '0.725rem' }}>
                            {catLabel}
                          </span>
                        </td>
                        <td>
                          <strong>{gp.descripcion}</strong>
                          {gp.recurrenteId && (
                            <span className="badge neutral" style={{ fontSize: '0.65rem', marginLeft: '6px' }}>
                              Gasto Fijo
                            </span>
                          )}
                        </td>
                        <td style={{ color: 'var(--color-text-muted)' }}>{gp.lugar || '—'}</td>
                        <td>
                          {tarjeta ? (
                            <span className="badge credit" style={{ fontSize: '0.725rem' }}>
                              {tarjeta.nombre} (1 cuota)
                            </span>
                          ) : (
                            <span className="badge neutral" style={{ fontSize: '0.725rem' }}>
                              {cuenta?.nombre || 'Efectivo / Cuenta'}
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
                            Eliminar
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
        </>
      )}

      {/* ========================================================================= */}
      {/* TAB 2: GASTOS FIJOS Y RECURRENTES (Suscripciones, Parqueadero, Planes) */}
      {/* ========================================================================= */}
      {activeTab === 'GASTOS_FIJOS' && (
        <>
          <div className="stat-grid">
            <article className="stat-card" style={{ borderLeft: '4px solid #8b5cf6' }}>
              <div className="stat-card-top">
                <span className="stat-card-title">Compromisos Fijos Mensuales</span>
                <span className="badge credit">Total Plantilla</span>
              </div>
              <div className="stat-value">{formatMoney(totalGastosFijosPresupuestados)}</div>
              <span className="stat-subtext">Suma de todos tus gastos fijos activos</span>
            </article>

            <article className="stat-card" style={{ borderLeft: '4px solid #10b981' }}>
              <div className="stat-card-top">
                <span className="stat-card-title">Ya Aplicados en este Mes</span>
                <span className="badge income">{formatMonthYear(selectedMonth)}</span>
              </div>
              <div className="stat-value" style={{ color: 'var(--color-income)' }}>
                {formatMoney(totalGastosFijosPresupuestados - totalPendienteMes)}
              </div>
              <span className="stat-subtext">
                {gastosRecurrentesLista.length - cantidadPendientesMes} de {gastosRecurrentesLista.length} registrados
              </span>
            </article>

            <article className="stat-card" style={{ borderLeft: '4px solid #f59e0b' }}>
              <div className="stat-card-top">
                <span className="stat-card-title">Pendientes por Cargar</span>
                <span className="badge warning">Este Período</span>
              </div>
              <div className="stat-value" style={{ color: 'var(--color-warning-text)' }}>
                {formatMoney(totalPendienteMes)}
              </div>
              <span className="stat-subtext">{cantidadPendientesMes} servicios pendientes</span>
            </article>
          </div>

          {/* Plantillas rápidas para agregar en 1 clic */}
          <div
            style={{
              backgroundColor: 'var(--color-bg-alt)',
              padding: '0.85rem 1.25rem',
              borderRadius: 'var(--radius-lg)',
              border: '1px solid var(--color-border)',
              marginBottom: '1.25rem',
              display: 'flex',
              alignItems: 'center',
              gap: '0.6rem',
              flexWrap: 'wrap',
            }}
          >
            <span style={{ fontSize: '0.825rem', fontWeight: 600, color: 'var(--color-text-muted)' }}>
              Agregar Fijo Frecuente:
            </span>
            <button
              type="button"
              className="btn secondary sm"
              onClick={() => crearPlantillaRecurrenteRapida('Parqueadero mensual', 'PARQUEADERO', 30000, 5, false)}
            >
              + Parqueadero ($30k)
            </button>
            <button
              type="button"
              className="btn secondary sm"
              onClick={() => crearPlantillaRecurrenteRapida('Plan Celular Móvil', 'CELULAR', 45000, 10, true)}
            >
              + Plan Celular ($45k)
            </button>
            <button
              type="button"
              className="btn secondary sm"
              onClick={() => crearPlantillaRecurrenteRapida('Netflix Plan Estándar', 'SUSCRIPCIONES', 35000, 15, true)}
            >
              + Netflix ($35k)
            </button>
            <button
              type="button"
              className="btn secondary sm"
              onClick={() => crearPlantillaRecurrenteRapida('Crunchyroll Fan', 'SUSCRIPCIONES', 15000, 20, true)}
            >
              + Crunchyroll ($15k)
            </button>
            <button
              type="button"
              className="btn secondary sm"
              onClick={() => crearPlantillaRecurrenteRapida('Spotify Premium', 'SUSCRIPCIONES', 18000, 25, true)}
            >
              + Spotify ($18k)
            </button>
            <button
              type="button"
              className="btn secondary sm"
              onClick={() => crearPlantillaRecurrenteRapida('Gimnasio Mensual', 'SUSCRIPCIONES', 80000, 5, false)}
            >
              + Gimnasio ($80k)
            </button>
          </div>

          {/* Tabla de Gastos Recurrentes / Fijos */}
          <div className="panel">
            <div className="panel-header">
              <div>
                <h2 className="panel-title">Tus Gastos Fijos y Suscripciones Mensuales</h2>
                <span style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)' }}>
                  Configura tus compromisos obligatorios para cargarlos con 1 clic mes a mes.
                </span>
              </div>
              <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                {cantidadPendientesMes > 0 && (
                  <button
                    type="button"
                    className="btn primary sm"
                    onClick={() => aplicarTodosRecurrentesPendientes(selectedMonth)}
                  >
                    Cargar Pendientes a {formatMonthYear(selectedMonth)}
                  </button>
                )}
                <button type="button" className="btn success sm" onClick={() => setModalRecurrenteOpen(true)}>
                  + Crear Gasto Fijo
                </button>
              </div>
            </div>

            <div className="table-container">
              <table>
                <thead>
                  <tr>
                    <th>Gasto Fijo / Servicio</th>
                    <th>Categoría</th>
                    <th>Día de Cobro</th>
                    <th>Medio de Pago Habitual</th>
                    <th>Monto Fijo</th>
                    <th>Estado en {formatMonthYear(selectedMonth)}</th>
                    <th style={{ textAlign: 'right' }}>Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {estadoRecurrentesEnMes.map(({ recurrente: r, aplicado, fechaAplicado }) => {
                    const cuenta = state.cuentas.find((c) => c.id === r.cuentaId)
                    const tarjeta = state.tarjetas.find((t) => t.id === r.tarjetaId)

                    return (
                      <tr key={r.id} style={{ opacity: r.activo ? 1 : 0.6 }}>
                        <td>
                          <strong>{r.nombre}</strong>
                          {r.notas && (
                            <span style={{ display: 'block', fontSize: '0.725rem', color: 'var(--color-text-muted)' }}>
                              {r.notas}
                            </span>
                          )}
                        </td>
                        <td>
                          <span className="badge neutral" style={{ fontSize: '0.725rem' }}>
                            {r.categoria === 'PARQUEADERO'
                              ? 'Parqueadero'
                              : r.categoria === 'CELULAR'
                              ? 'Celular'
                              : r.categoria === 'SUSCRIPCIONES'
                              ? 'Suscripción'
                              : r.categoria}
                          </span>
                        </td>
                        <td style={{ fontSize: '0.825rem' }}>Día {r.diaCobro} de cada mes</td>
                        <td>
                          {r.metodoPago === 'TARJETA_CREDITO' ? (
                            <span className="badge credit" style={{ fontSize: '0.725rem' }}>
                              {tarjeta?.nombre || 'Tarjeta de Crédito'} (1 cuota)
                            </span>
                          ) : (
                            <span className="badge neutral" style={{ fontSize: '0.725rem' }}>
                              {cuenta?.nombre || 'Cuenta Bancaria'}
                            </span>
                          )}
                        </td>
                        <td style={{ fontWeight: 600, color: 'var(--color-text-main)' }}>
                          {formatMoney(r.monto)}
                        </td>
                        <td>
                          {aplicado ? (
                            <span className="badge income" style={{ fontSize: '0.725rem' }}>
                              Registrado ({formatDate(fechaAplicado || '')})
                            </span>
                          ) : (
                            <span className="badge warning" style={{ fontSize: '0.725rem' }}>
                              Pendiente este mes
                            </span>
                          )}
                        </td>
                        <td style={{ textAlign: 'right', whiteSpace: 'nowrap' }}>
                          <div style={{ display: 'flex', gap: '0.35rem', justifyContent: 'flex-end' }}>
                            {!aplicado && r.activo && (
                              <button
                                type="button"
                                className="btn success sm"
                                onClick={() => aplicarGastoRecurrenteAlMes(r.id, selectedMonth)}
                                title="Aplicar y registrar este gasto al mes seleccionado"
                              >
                                Aplicar a este mes
                              </button>
                            )}
                            <button
                              type="button"
                              className="btn secondary sm"
                              onClick={() => toggleActivoGastoRecurrente(r.id)}
                              title={r.activo ? 'Pausar gasto fijo' : 'Activar gasto fijo'}
                            >
                              {r.activo ? 'Pausar' : 'Activar'}
                            </button>
                            <button
                              type="button"
                              className="btn ghost sm"
                              onClick={() => {
                                if (confirm(`¿Eliminar la plantilla de gasto fijo "${r.nombre}"?`)) {
                                  deleteGastoRecurrente(r.id)
                                }
                              }}
                              title="Eliminar plantilla"
                            >
                              Eliminar
                            </button>
                          </div>
                        </td>
                      </tr>
                    )
                  })}
                  {gastosRecurrentesLista.length === 0 && (
                    <tr>
                      <td colSpan={7} style={{ textAlign: 'center', padding: '2.5rem', color: 'var(--color-text-muted)' }}>
                        No tienes gastos fijos mensuales configurados aún. ¡Crea el primero con los botones de arriba!
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
      {/* TAB 3: INGRESOS Y NÓMINA */}
      {/* ========================================================================= */}
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
                          Eliminar
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

      {/* ========================================================================= */}
      {/* MODAL REGISTRAR GASTO PERSONAL */}
      {/* ========================================================================= */}
      <Modal isOpen={modalGastoOpen} onClose={() => setModalGastoOpen(false)} title="Registrar Gasto Personal / Ocio">
        <form onSubmit={handleAddGastoPersonal} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <div className="form-group">
            <label>Categoría del Gasto *</label>
            <select
              className="form-select"
              value={catGasto}
              onChange={(e) => setCatGasto(e.target.value as typeof catGasto)}
            >
              <option value="PARQUEADERO">Parqueadero / Estacionamiento</option>
              <option value="CELULAR">Servicio de Celular / Plan Móvil</option>
              <option value="GASOLINA">Gasolina / Combustible / Tanqueo</option>
              <option value="SUSCRIPCIONES">Suscripciones (Netflix, Crunchyroll, Spotify, Gym, iCloud)</option>
              <option value="RESTAURANTES_COMIDAS_FUERA">Salidas a comer / Restaurantes / Domicilios</option>
              <option value="PARTIDOS_OCIO_EVENTOS">Partidos / Canchas sintéticas / Fútbol / Eventos / Cine</option>
              <option value="REGALOS">Regalos (Cumpleaños, aniversarios, detalles)</option>
              <option value="ROPA_CUIDADO">Ropa, Peluquería & Cuidado Personal</option>
              <option value="TRANSPORTE">Taxi / Uber / Pasajes</option>
              <option value="SEGUROS_SALUD">Seguro de Vida / Medicina Prepagada / Farmacia</option>
              <option value="OTROS">Otros Gastos Personales</option>
            </select>
          </div>

          <div className="form-group">
            <label>Descripción / Detalle *</label>
            <input
              type="text"
              className="form-input"
              placeholder="Ej: Parqueadero mensual, Plan Claro 50GB, Netflix 4K, Crunchyroll Fan"
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
                placeholder="Ej: 30000"
                value={montoGasto}
                onChange={(e) => setMontoGasto(e.target.value)}
                required
              />
            </div>

            <DatePickerInput
              label="Fecha del Gasto"
              value={fechaGasto}
              onChange={setFechaGasto}
              selectedMonthContext={selectedMonth}
              required
            />
          </div>

          <div className="form-grid">
            <div className="form-group">
              <label>Lugar / Establecimiento</label>
              <input
                type="text"
                className="form-input"
                placeholder="Ej: Parqueadero Central, Claro, Netflix, Crunchyroll"
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
                  <optgroup label="Tarjetas de Crédito (1 Cuota - Mes a Mes)">
                    {state.tarjetas.map((t) => (
                      <option key={t.id} value={`tarjeta:${t.id}`}>
                        {t.nombre} (•••• {t.ultimos4Digitos}) - 1 Cuota
                      </option>
                    ))}
                  </optgroup>
                )}
                {state.cuentas.length > 0 && (
                  <optgroup label="Cuentas de Ahorros / Billeteras">
                    {state.cuentas.map((c) => (
                      <option key={c.id} value={`cuenta:${c.id}`}>
                        {c.nombre} (Saldo: {formatMoney(c.saldo)})
                      </option>
                    ))}
                  </optgroup>
                )}
              </select>
            </div>
          </div>

          {medioPagoSeleccionado.startsWith('tarjeta:') && (
            <div className="banner info" style={{ fontSize: '0.8rem', padding: '0.6rem 0.85rem' }}>
              Pagado con <strong>Tarjeta a 1 cuota</strong>: Se incluirá en tus gastos del mes y en el extracto de tu tarjeta sin restar saldo bancario de inmediato.
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

      {/* ========================================================================= */}
      {/* MODAL CREAR GASTO FIJO RECURRENTE */}
      {/* ========================================================================= */}
      <Modal
        isOpen={modalRecurrenteOpen}
        onClose={() => setModalRecurrenteOpen(false)}
        title="Configurar Gasto Fijo / Suscripción Mensual"
      >
        <form onSubmit={handleAddRecurrente} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <div className="form-group">
            <label>Nombre del Gasto Fijo o Suscripción *</label>
            <input
              type="text"
              className="form-input"
              placeholder="Ej: Parqueadero mensual, Plan Celular Claro, Netflix 4K, Crunchyroll Fan"
              value={nombreRecurrente}
              onChange={(e) => setNombreRecurrente(e.target.value)}
              required
            />
          </div>

          <div className="form-grid">
            <div className="form-group">
              <label>Categoría *</label>
              <select
                className="form-select"
                value={catRecurrente}
                onChange={(e) => setCatRecurrente(e.target.value as typeof catRecurrente)}
              >
                <option value="PARQUEADERO">Parqueadero / Estacionamiento</option>
                <option value="CELULAR">Plan de Celular</option>
                <option value="SUSCRIPCIONES">Suscripción Streaming / Apps (Netflix, Crunchyroll, Spotify)</option>
                <option value="GASOLINA">Gasolina Fija</option>
                <option value="SEGUROS_SALUD">Seguro / Salud</option>
                <option value="OTROS">Otro Gasto Fijo</option>
              </select>
            </div>

            <div className="form-group">
              <label>Monto Mensual ($ COP) *</label>
              <input
                type="number"
                className="form-input"
                placeholder="Ej: 30000"
                value={montoRecurrente}
                onChange={(e) => setMontoRecurrente(e.target.value)}
                required
              />
            </div>
          </div>

          <div className="form-grid">
            <div className="form-group">
              <label>Día Habitual de Cobro (1 al 31) *</label>
              <input
                type="number"
                min="1"
                max="31"
                className="form-input"
                placeholder="Ej: 5"
                value={diaCobroRecurrente}
                onChange={(e) => setDiaCobroRecurrente(e.target.value)}
                required
              />
            </div>

            <div className="form-group">
              <label>Medio de Pago Habitual *</label>
              <select
                className="form-select"
                value={medioPagoRecurrente}
                onChange={(e) => setMedioPagoRecurrente(e.target.value)}
              >
                {state.tarjetas.length > 0 && (
                  <optgroup label="Tarjetas de Crédito (1 Cuota)">
                    {state.tarjetas.map((t) => (
                      <option key={t.id} value={`tarjeta:${t.id}`}>
                        {t.nombre} (•••• {t.ultimos4Digitos}) - 1 Cuota
                      </option>
                    ))}
                  </optgroup>
                )}
                {state.cuentas.length > 0 && (
                  <optgroup label="Cuentas Bancarias / Débito">
                    {state.cuentas.map((c) => (
                      <option key={c.id} value={`cuenta:${c.id}`}>
                        {c.nombre} (Saldo: {formatMoney(c.saldo)})
                      </option>
                    ))}
                  </optgroup>
                )}
              </select>
            </div>
          </div>

          <div className="form-group">
            <label>Notas / Detalles (Opcional)</label>
            <input
              type="text"
              className="form-input"
              placeholder="Ej: Se paga los días 5, puesto #12"
              value={notasRecurrente}
              onChange={(e) => setNotasRecurrente(e.target.value)}
            />
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '0.5rem' }}>
            <button type="button" className="btn secondary" onClick={() => setModalRecurrenteOpen(false)}>
              Cancelar
            </button>
            <button type="submit" className="btn success">
              Guardar Gasto Fijo
            </button>
          </div>
        </form>
      </Modal>

      {/* ========================================================================= */}
      {/* MODAL REGISTRAR INGRESO */}
      {/* ========================================================================= */}
      <Modal isOpen={modalIngresoOpen} onClose={() => setModalIngresoOpen(false)} title="Registrar Ingreso o Nómina">
        <form onSubmit={handleAddIngreso} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <div className="form-group">
            <label>Tipo de Entrada *</label>
            <select
              className="form-select"
              value={tipoIngreso}
              onChange={(e) => {
                const val = e.target.value as typeof tipoIngreso
                setTipoIngreso(val)
                if (val === 'APORTE_HERMANO' || val === 'ALMUERZOS_HERMANO') {
                  const hermanoAcc = state.cuentas.find((c) => c.id === 'cuenta-hermano' || c.nombre.toLowerCase().includes('hermano'))
                  if (hermanoAcc) setCuentaIngresoId(hermanoAcc.id)
                  if (!descIngreso) setDescIngreso('Plata almuerzos / aporte hermano')
                }
              }}
            >
              <option value="NOMINA">Nómina / Sueldo Fijo</option>
              <option value="APORTE_HERMANO">Aporte / Envío de Hermano (Almuerzos & Gastos)</option>
              <option value="APORTE_MAMA">Aporte / Apoyo de Mamá (Comida / Hogar)</option>
              <option value="HORAS_EXTRAS">Horas Extras / Recargos</option>
              <option value="BONIFICACION">Bonificación</option>
              <option value="FREELANCE">Trabajo Independiente / Freelance</option>
              <option value="RENDIMIENTOS">Rendimientos Financieros</option>
              <option value="REGALO">Regalo de Dinero</option>
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

            <DatePickerInput
              label="Fecha de Recepción"
              value={fechaIngreso}
              onChange={setFechaIngreso}
              selectedMonthContext={selectedMonth}
              required
            />
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
    </div>
  )
}
