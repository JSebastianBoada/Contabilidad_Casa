import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { useFinance } from '../context/FinanceContext'
import { StatCard } from '../components/StatCard'
import { DonutChart, BarChartCashflow } from '../components/Charts'
import { Modal } from '../components/Modal'
import { formatMoney, formatDate, formatMonthYear, getDaysRemaining } from '../utils/formatters'
import {
  consolidarMovimientos,
  type ModuloMovimiento,
  type TipoMovimiento,
} from '../utils/movimientosHelper'
import { Home, Utensils, Smartphone, CreditCard, CategoryIcon } from '../components/Icons'

export function HomePage() {
  const {
    state,
    selectedMonth,
    totalIngresosMes,
    totalGastosHogarMes,
    totalAlimentacionMes,
    totalGastosPersonalesMes,
    totalCuotasTarjetasMes,
    totalGastosMes,
    balanceNetoMes,
    deudaTotalTarjetas,
    togglePagoServicio,
    togglePagoArriendo,
    clearAllData,
  } = useFinance()

  const [searchTerm, setSearchTerm] = useState('')
  const [filtroPeriodoMovs, setFiltroPeriodoMovs] = useState<'MES_ACTUAL' | 'TODOS'>('MES_ACTUAL')
  const [filtroModulo, setFiltroModulo] = useState<ModuloMovimiento | 'TODOS'>('TODOS')
  const [filtroTipo, setFiltroTipo] = useState<TipoMovimiento | 'TODOS'>('TODOS')
  const [filtroCuenta, setFiltroCuenta] = useState<string>('TODAS')
  const [mostrarTodosMovs, setMostrarTodosMovs] = useState(false)
  const [modalResetOpen, setModalResetOpen] = useState(false)

  // Servicios y arriendos pendientes en el mes
  const pagosPendientes = useMemo(() => {
    const lista: {
      id: string
      tipo: 'SERVICIO' | 'ARRIENDO'
      nombre: string
      monto: number
      fechaLimite: string
      categoriaKey: string
      diasInfo: ReturnType<typeof getDaysRemaining>
    }[] = []

    // Arriendo
    state.arriendos
      .filter((a) => a.mesCorrespondiente === selectedMonth && !a.pagado)
      .forEach((a) => {
        lista.push({
          id: a.id,
          tipo: 'ARRIENDO',
          nombre: `Arriendo Vivienda (${formatMonthYear(a.mesCorrespondiente)})`,
          monto: a.monto,
          fechaLimite: a.fechaLimite,
          categoriaKey: 'ARRIENDO',
          diasInfo: getDaysRemaining(a.fechaLimite),
        })
      })

    // Servicios
    state.servicios
      .filter((s) => (s.periodo === selectedMonth || s.fechaVencimiento.startsWith(selectedMonth)) && !s.pagado)
      .forEach((s) => {
        lista.push({
          id: s.id,
          tipo: 'SERVICIO',
          nombre: s.nombre,
          monto: s.monto,
          fechaLimite: s.fechaVencimiento,
          categoriaKey: s.tipo,
          diasInfo: getDaysRemaining(s.fechaVencimiento),
        })
      })

    return lista.sort((a, b) => (a.fechaLimite > b.fechaLimite ? 1 : -1))
  }, [state.arriendos, state.servicios, selectedMonth])

  // Total pendiente por pagar
  const totalPendientePagar = useMemo(() => {
    return pagosPendientes.reduce((acc, p) => acc + p.monto, 0)
  }, [pagosPendientes])

  // Datos para gráfico Donut
  const donutData = useMemo(() => {
    return [
      { label: 'Hogar y Servicios', value: totalGastosHogarMes, color: '#3b82f6' },
      { label: 'Alimentación y Mercado', value: totalAlimentacionMes, color: '#10b981' },
      { label: 'Personal, Ocio y Fijos', value: totalGastosPersonalesMes, color: '#f59e0b' },
      { label: 'Cuotas de Tarjetas', value: totalCuotasTarjetasMes, color: '#8b5cf6' },
    ]
  }, [
    totalGastosHogarMes,
    totalAlimentacionMes,
    totalGastosPersonalesMes,
    totalCuotasTarjetasMes,
  ])

  // Datos para gráfico de barras histórico/comparativo
  const cashflowBarData = useMemo(() => {
    const hoy = new Date()
    const months = []
    for (let i = 3; i >= 0; i--) {
      const d = new Date(hoy.getFullYear(), hoy.getMonth() - i, 1)
      const mStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
      const mLabel = d.toLocaleString('es-CO', { month: 'short' })

      const ing = state.ingresos
        .filter((x) => x.fecha.startsWith(mStr))
        .reduce((acc, x) => acc + x.monto, 0)

      const gh = state.arriendos
        .filter((x) => x.mesCorrespondiente === mStr && x.pagado)
        .reduce((acc, x) => acc + x.monto, 0) +
        state.servicios
          .filter((x) => (x.periodo === mStr || x.fechaVencimiento.startsWith(mStr)) && x.pagado)
          .reduce((acc, x) => acc + x.monto, 0) +
        state.comprasHogar
          .filter((x) => x.fecha.startsWith(mStr))
          .reduce((acc, x) => acc + x.monto, 0)

      const alim = state.alimentacion
        .filter((x) => x.fecha.startsWith(mStr))
        .reduce((acc, x) => acc + x.monto, 0)

      const gp = state.gastosPersonales
        .filter((x) => x.fecha.startsWith(mStr))
        .reduce((acc, x) => acc + x.monto, 0)

      months.push({
        month: mLabel.charAt(0).toUpperCase() + mLabel.slice(1),
        ingresos: ing,
        gastos: gh + alim + gp,
      })
    }
    return months
  }, [state])

  // Todos los movimientos consolidados del sistema
  const todosLosMovimientos = useMemo(() => {
    return consolidarMovimientos(state, {
      mes: filtroPeriodoMovs === 'MES_ACTUAL' ? selectedMonth : undefined,
      modulo: filtroModulo !== 'TODOS' ? filtroModulo : undefined,
      tipo: filtroTipo !== 'TODOS' ? filtroTipo : undefined,
      cuentaId: filtroCuenta !== 'TODAS' ? filtroCuenta : undefined,
      busqueda: searchTerm,
    })
  }, [state, filtroPeriodoMovs, selectedMonth, filtroModulo, filtroTipo, filtroCuenta, searchTerm])

  const movimientosVisibles = useMemo(() => {
    if (mostrarTodosMovs) return todosLosMovimientos
    return todosLosMovimientos.slice(0, 25)
  }, [todosLosMovimientos, mostrarTodosMovs])

  // Métricas agregadas de los movimientos mostrados
  const resumenMovimientos = useMemo(() => {
    let ing = 0
    let gas = 0
    let transf = 0

    todosLosMovimientos.forEach((m) => {
      if (m.tipo === 'INGRESO') ing += m.monto
      else if (m.tipo === 'TRANSFERENCIA') transf += m.monto
      else gas += m.monto
    })

    return {
      totalIngresos: ing,
      totalGastos: gas,
      totalTransferencias: transf,
      balance: ing - gas,
      conteo: todosLosMovimientos.length,
    }
  }, [todosLosMovimientos])

  return (
    <div className="page">
      {/* Page Header */}
      <div className="page-header">
        <div className="page-header-info">
          <h1>
            <svg viewBox="0 0 24 24" width="28" height="28" fill="none" stroke="currentColor" strokeWidth="2.2">
              <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
              <polyline points="9 22 9 12 15 12 15 22" />
            </svg>
            Dashboard Financiero 360°
          </h1>
          <p>
            Monitoreo en tiempo real de finanzas domésticas, alimentación, nómina y cuotas para{' '}
            <strong>{formatMonthYear(selectedMonth)}</strong>.
          </p>
        </div>

        <div className="page-header-actions">
          <button
            type="button"
            className="btn ghost sm"
            onClick={() => setModalResetOpen(true)}
            style={{ color: '#ef4444', borderColor: 'rgba(239, 68, 68, 0.3)' }}
          >
            Reiniciar datos a $0
          </button>
        </div>
      </div>

      {/* Alertas de Pagos Próximos a Vencer Rediseñadas */}
      {pagosPendientes.length > 0 && (
        <section className="alert-bills-card">
          <div className="alert-bills-header">
            <div className="alert-bills-title">
              <div className="alert-bills-icon">
                <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <circle cx="12" cy="12" r="10" />
                  <line x1="12" y1="8" x2="12" y2="12" />
                  <line x1="12" y1="16" x2="12.01" y2="16" />
                </svg>
              </div>
              <div>
                <span>{pagosPendientes.length} cuentas por pagar este mes</span>
                <span className="badge warning" style={{ marginLeft: '0.45rem', fontSize: '0.725rem' }}>
                  Pendiente: {formatMoney(totalPendientePagar)}
                </span>
              </div>
            </div>

            <Link to="/hogar" className="btn sm secondary" style={{ fontSize: '0.75rem' }}>
              Ver Servicios →
            </Link>
          </div>

          <div className="alert-bills-grid">
            {pagosPendientes.map((p) => (
              <div key={p.id} className="alert-bill-item">
                <div className="alert-bill-left">
                  <div className="alert-bill-icon-badge" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: '36px', height: '36px', borderRadius: 'var(--radius-md)', backgroundColor: 'var(--color-bg-alt)', color: 'var(--color-primary-light)' }}>
                    <CategoryIcon category={p.categoriaKey} size={18} />
                  </div>
                  <div className="alert-bill-info">
                    <strong className="alert-bill-name">{p.nombre}</strong>
                    <div className="alert-bill-meta">
                      <span className="alert-bill-amount">{formatMoney(p.monto)}</span>
                      <span>•</span>
                      <span
                        style={{
                          fontWeight: 600,
                          color: p.diasInfo.isExpired ? 'var(--color-expense)' : 'var(--color-warning-text)',
                        }}
                      >
                        {p.diasInfo.label}
                      </span>
                    </div>
                  </div>
                </div>

                <button
                  type="button"
                  className="btn success sm"
                  style={{ padding: '0.35rem 0.75rem', fontSize: '0.775rem' }}
                  onClick={() => {
                    if (p.tipo === 'ARRIENDO') togglePagoArriendo(p.id)
                    else togglePagoServicio(p.id)
                  }}
                >
                  Pagar
                </button>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Tarjetas Principales de KPIs */}
      <div className="stat-grid">
        <StatCard
          title="Ingresos del Mes"
          value={formatMoney(totalIngresosMes)}
          subtext="Nómina + Extras + Entradas"
          iconType="income"
          badge={{ text: 'Entradas', variant: 'income' }}
          icon={
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="12" y1="19" x2="12" y2="5" />
              <polyline points="5 12 12 5 19 12" />
            </svg>
          }
        />

        <StatCard
          title="Gastos Totales Mes"
          value={formatMoney(totalGastosMes)}
          subtext="Hogar + Comida + Personal + Cuotas"
          iconType="expense"
          badge={{ text: 'Salidas', variant: 'expense' }}
          icon={
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="12" y1="5" x2="12" y2="19" />
              <polyline points="19 12 12 19 5 12" />
            </svg>
          }
        />

        <StatCard
          title="Balance Neto Disponible"
          value={formatMoney(balanceNetoMes)}
          subtext={balanceNetoMes >= 0 ? 'Superávit / Capacidad de Ahorro' : 'Déficit en el período'}
          iconType={balanceNetoMes >= 0 ? 'income' : 'expense'}
          badge={{
            text: balanceNetoMes >= 0 ? 'Positivo' : 'Alerta',
            variant: balanceNetoMes >= 0 ? 'income' : 'expense',
          }}
          icon={
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <polyline points="22 7 13.5 15.5 8.5 10.5 2 17" />
              <polyline points="16 7 22 7 22 13" />
            </svg>
          }
        />

        <StatCard
          title="Deuda Tarjetas de Crédito"
          value={formatMoney(deudaTotalTarjetas)}
          subtext={`Cuotas a pagar este mes: ${formatMoney(totalCuotasTarjetasMes)}`}
          iconType="credit"
          badge={{ text: 'Crédito', variant: 'credit' }}
          icon={
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <rect x="2" y="5" width="20" height="14" rx="2" />
              <line x1="2" y1="10" x2="22" y2="10" />
            </svg>
          }
        />
      </div>

      {/* Gráficos de Distribución y Flujo */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '1.25rem' }}>
        <div className="panel">
          <div className="panel-header">
            <h2 className="panel-title">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="12" r="10" />
                <path d="M12 2a10 10 0 0 1 10 10" />
              </svg>
              Distribución de Gastos del Mes
            </h2>
            <span className="badge neutral">{formatMonthYear(selectedMonth)}</span>
          </div>
          <DonutChart data={donutData} totalLabel="Gastos Mes" />
        </div>

        <div className="panel">
          <div className="panel-header">
            <h2 className="panel-title">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <line x1="18" y1="20" x2="18" y2="10" />
                <line x1="12" y1="20" x2="12" y2="4" />
                <line x1="6" y1="20" x2="6" y2="14" />
              </svg>
              Flujo de Caja Últimos Meses
            </h2>
            <span className="badge income">Ingresos vs Gastos</span>
          </div>
          <BarChartCashflow data={cashflowBarData} />
        </div>
      </div>

      {/* Resumen por Módulos / Accesos Rápidos */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '0.85rem' }}>
        <Link to="/hogar" className="stat-card" style={{ cursor: 'pointer' }}>
          <div className="stat-card-top">
            <span className="stat-card-title">Hogar & Vivienda</span>
            <span className="stat-icon primary">
              <Home size={18} />
            </span>
          </div>
          <div className="stat-value" style={{ fontSize: '1.25rem' }}>
            {formatMoney(totalGastosHogarMes)}
          </div>
          <span className="stat-subtext">Arriendo, luz, agua, gas e internet →</span>
        </Link>

        <Link to="/alimentacion" className="stat-card" style={{ cursor: 'pointer' }}>
          <div className="stat-card-top">
            <span className="stat-card-title">Alimentación</span>
            <span className="stat-icon income">
              <Utensils size={18} />
            </span>
          </div>
          <div className="stat-value" style={{ fontSize: '1.25rem' }}>
            {formatMoney(totalAlimentacionMes)}
          </div>
          <span className="stat-subtext">Mercado, desayunos, almuerzos y cenas →</span>
        </Link>

        <Link to="/personal" className="stat-card" style={{ cursor: 'pointer' }}>
          <div className="stat-card-top">
            <span className="stat-card-title">Personal & Ocio</span>
            <span className="stat-icon warning">
              <Smartphone size={18} />
            </span>
          </div>
          <div className="stat-value" style={{ fontSize: '1.25rem' }}>
            {formatMoney(totalGastosPersonalesMes)}
          </div>
          <span className="stat-subtext">Celular, salidas, partidos y regalos →</span>
        </Link>

        <Link to="/tarjetas" className="stat-card" style={{ cursor: 'pointer' }}>
          <div className="stat-card-top">
            <span className="stat-card-title">Cuotas de Tarjetas</span>
            <span className="stat-icon credit">
              <CreditCard size={18} />
            </span>
          </div>
          <div className="stat-value" style={{ fontSize: '1.25rem' }}>
            {formatMoney(totalCuotasTarjetasMes)}
          </div>
          <span className="stat-subtext">Proyección de pagos diferidos →</span>
        </Link>
      </div>

      {/* ========================================================================= */}
      {/* TABLA DE MOVIMIENTOS CONSOLIDADOS & LIBRO DIARIO DEL MES */}
      {/* ========================================================================= */}
      <div className="panel" style={{ marginTop: '2rem' }}>
        <div className="panel-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.75rem' }}>
          <div>
            <h2 className="panel-title" style={{ fontSize: '1.2rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              Movimientos Generales & Libro Diario
            </h2>
            <span style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)' }}>
              Registro unificado de todos los ingresos, compras, servicios, arriendos, tarjetas y transferencias.
            </span>
          </div>

          <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', flexWrap: 'wrap' }}>
            {/* Filtro Período */}
            <div className="tabs-nav" style={{ margin: 0 }}>
              <button
                type="button"
                className={`tab-btn ${filtroPeriodoMovs === 'MES_ACTUAL' ? 'active' : ''}`}
                onClick={() => setFiltroPeriodoMovs('MES_ACTUAL')}
                style={{ fontSize: '0.75rem', padding: '0.35rem 0.65rem' }}
              >
                Mes Actual ({formatMonthYear(selectedMonth)})
              </button>
              <button
                type="button"
                className={`tab-btn ${filtroPeriodoMovs === 'TODOS' ? 'active' : ''}`}
                onClick={() => setFiltroPeriodoMovs('TODOS')}
                style={{ fontSize: '0.75rem', padding: '0.35rem 0.65rem' }}
              >
                Todos
              </button>
            </div>

            {/* Selector de Cuenta */}
            <select
              className="form-select"
              value={filtroCuenta}
              onChange={(e) => setFiltroCuenta(e.target.value)}
              style={{ padding: '0.35rem 0.6rem', fontSize: '0.8rem', width: 'auto', minWidth: '150px' }}
            >
              <option value="TODAS">Todas las cuentas / tarjetas</option>
              <optgroup label="Cuentas y Efectivo">
                {state.cuentas.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.nombre}
                  </option>
                ))}
              </optgroup>
              <optgroup label="Tarjetas de Crédito">
                {state.tarjetas.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.nombre}
                  </option>
                ))}
              </optgroup>
            </select>

            {/* Buscador */}
            <input
              type="text"
              className="form-input"
              placeholder="Buscar concepto, comercio, nota..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              style={{ maxWidth: '210px', padding: '0.35rem 0.65rem', fontSize: '0.8rem' }}
            />
          </div>
        </div>

        {/* Filtros rápidos por Módulo */}
        <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap', padding: '0.75rem 1rem', backgroundColor: 'var(--color-bg-alt)', borderBottom: '1px solid var(--color-border)' }}>
          <button
            type="button"
            className={`btn sm ${filtroModulo === 'TODOS' ? 'primary' : 'ghost'}`}
            onClick={() => setFiltroModulo('TODOS')}
            style={{ fontSize: '0.75rem', padding: '0.25rem 0.6rem' }}
          >
            Todos ({todosLosMovimientos.length})
          </button>
          <button
            type="button"
            className={`btn sm ${filtroModulo === 'INGRESOS' ? 'success' : 'ghost'}`}
            onClick={() => setFiltroModulo('INGRESOS')}
            style={{ fontSize: '0.75rem', padding: '0.25rem 0.6rem' }}
          >
            Ingresos
          </button>
          <button
            type="button"
            className={`btn sm ${filtroModulo === 'ALIMENTACION' ? 'primary' : 'ghost'}`}
            onClick={() => setFiltroModulo('ALIMENTACION')}
            style={{ fontSize: '0.75rem', padding: '0.25rem 0.6rem' }}
          >
            Alimentación
          </button>
          <button
            type="button"
            className={`btn sm ${filtroModulo === 'HOGAR' ? 'primary' : 'ghost'}`}
            onClick={() => setFiltroModulo('HOGAR')}
            style={{ fontSize: '0.75rem', padding: '0.25rem 0.6rem' }}
          >
            Hogar
          </button>
          <button
            type="button"
            className={`btn sm ${filtroModulo === 'SERVICIOS' ? 'primary' : 'ghost'}`}
            onClick={() => setFiltroModulo('SERVICIOS')}
            style={{ fontSize: '0.75rem', padding: '0.25rem 0.6rem' }}
          >
            Servicios
          </button>
          <button
            type="button"
            className={`btn sm ${filtroModulo === 'ARRIENDO' ? 'primary' : 'ghost'}`}
            onClick={() => setFiltroModulo('ARRIENDO')}
            style={{ fontSize: '0.75rem', padding: '0.25rem 0.6rem' }}
          >
            Arriendo
          </button>
          <button
            type="button"
            className={`btn sm ${filtroModulo === 'PERSONAL' ? 'primary' : 'ghost'}`}
            onClick={() => setFiltroModulo('PERSONAL')}
            style={{ fontSize: '0.75rem', padding: '0.25rem 0.6rem' }}
          >
            Personal & Ocio
          </button>
          <button
            type="button"
            className={`btn sm ${filtroModulo === 'TARJETAS' ? 'primary' : 'ghost'}`}
            onClick={() => setFiltroModulo('TARJETAS')}
            style={{ fontSize: '0.75rem', padding: '0.25rem 0.6rem' }}
          >
            Cuotas Tarjetas
          </button>
          <button
            type="button"
            className={`btn sm ${filtroModulo === 'TRANSFERENCIAS' ? 'primary' : 'ghost'}`}
            onClick={() => setFiltroModulo('TRANSFERENCIAS')}
            style={{ fontSize: '0.75rem', padding: '0.25rem 0.6rem' }}
          >
            Transferencias
          </button>
        </div>

        {/* Filtros rápidos por Tipo */}
        <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap', padding: '0.45rem 1rem', backgroundColor: 'var(--color-bg)', borderBottom: '1px solid var(--color-border)', alignItems: 'center' }}>
          <span style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--color-text-muted)', marginRight: '0.25rem' }}>Tipo:</span>
          <button
            type="button"
            className={`btn sm ${filtroTipo === 'TODOS' ? 'primary' : 'ghost'}`}
            onClick={() => setFiltroTipo('TODOS')}
            style={{ fontSize: '0.725rem', padding: '0.2rem 0.5rem' }}
          >
            Todos
          </button>
          <button
            type="button"
            className={`btn sm ${filtroTipo === 'INGRESO' ? 'success' : 'ghost'}`}
            onClick={() => setFiltroTipo('INGRESO')}
            style={{ fontSize: '0.725rem', padding: '0.2rem 0.5rem' }}
          >
            Ingresos
          </button>
          <button
            type="button"
            className={`btn sm ${filtroTipo === 'GASTO' ? 'primary' : 'ghost'}`}
            onClick={() => setFiltroTipo('GASTO')}
            style={{ fontSize: '0.725rem', padding: '0.2rem 0.5rem' }}
          >
            Gastos
          </button>
          <button
            type="button"
            className={`btn sm ${filtroTipo === 'CUOTA_TARJETA' ? 'primary' : 'ghost'}`}
            onClick={() => setFiltroTipo('CUOTA_TARJETA')}
            style={{ fontSize: '0.725rem', padding: '0.2rem 0.5rem' }}
          >
            Cuotas TC
          </button>
          <button
            type="button"
            className={`btn sm ${filtroTipo === 'TRANSFERENCIA' ? 'primary' : 'ghost'}`}
            onClick={() => setFiltroTipo('TRANSFERENCIA')}
            style={{ fontSize: '0.725rem', padding: '0.2rem 0.5rem' }}
          >
            Transferencias
          </button>
        </div>

        {/* Barra de Resumen y Balance de la vista filtrada */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem', padding: '0.65rem 1rem', fontSize: '0.8rem', backgroundColor: 'var(--color-surface)', borderBottom: '1px solid var(--color-border)' }}>
          <div style={{ display: 'flex', gap: '1.25rem', flexWrap: 'wrap' }}>
            <span>
              Ingresos: <strong style={{ color: 'var(--color-income)' }}>+{formatMoney(resumenMovimientos.totalIngresos)}</strong>
            </span>
            <span>
              Gastos & Cuotas: <strong style={{ color: 'var(--color-expense)' }}>-{formatMoney(resumenMovimientos.totalGastos)}</strong>
            </span>
            {resumenMovimientos.totalTransferencias > 0 && (
              <span>
                Transferencias: <strong style={{ color: '#06b6d4' }}>{formatMoney(resumenMovimientos.totalTransferencias)}</strong>
              </span>
            )}
            <span>
              Balance en vista: <strong style={{ color: resumenMovimientos.balance >= 0 ? 'var(--color-income)' : 'var(--color-expense)' }}>
                {resumenMovimientos.balance >= 0 ? '+' : ''}{formatMoney(resumenMovimientos.balance)}
              </strong>
            </span>
          </div>
          <span style={{ color: 'var(--color-text-muted)' }}>
            Mostrando <strong>{movimientosVisibles.length}</strong> de <strong>{todosLosMovimientos.length}</strong> movimientos
          </span>
        </div>

        {/* Tabla Detallada */}
        <div className="table-container">
          <table className="table-wide">
            <thead>
              <tr>
                <th>Fecha</th>
                <th>Módulo / Categoría</th>
                <th>Descripción & Concepto</th>
                <th>Cuenta / Medio de Pago</th>
                <th>Responsable</th>
                <th style={{ textAlign: 'right' }}>Monto</th>
              </tr>
            </thead>
            <tbody>
              {movimientosVisibles.map((m) => {
                const isIngreso = m.tipo === 'INGRESO'
                const isTransf = m.tipo === 'TRANSFERENCIA'
                const isCuota = m.tipo === 'CUOTA_TARJETA'

                return (
                  <tr key={`${m.modulo}-${m.id}`}>
                    {/* Fecha */}
                    <td style={{ whiteSpace: 'nowrap', color: 'var(--color-text-muted)', fontSize: '0.8rem' }}>
                      {formatDate(m.fecha)}
                    </td>

                    {/* Módulo / Categoría */}
                    <td>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                        <span
                          className={`badge ${isIngreso ? 'income' : isTransf ? 'info' : isCuota ? 'credit' : 'neutral'}`}
                          style={{ fontSize: '0.7rem', width: 'fit-content' }}
                        >
                          {m.moduloLabel}
                        </span>
                        <span style={{ fontSize: '0.72rem', color: 'var(--color-text-muted)' }}>
                          {m.categoria}
                        </span>
                      </div>
                    </td>

                    {/* Descripción & Detalles */}
                    <td>
                      <div>
                        <strong>{m.descripcion}</strong>
                        {m.notas && (
                          <span style={{ display: 'block', fontSize: '0.72rem', color: 'var(--color-text-muted)', marginTop: '2px' }}>
                            {m.notas}
                          </span>
                        )}
                        {m.pagado === false && (
                          <span className="badge warning" style={{ fontSize: '0.65rem', marginTop: '2px' }}>
                            Pendiente de Pago
                          </span>
                        )}
                      </div>
                    </td>

                    {/* Cuenta o Tarjeta */}
                    <td>
                      <span
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '0.35rem',
                          padding: '0.2rem 0.55rem',
                          borderRadius: 'var(--radius-pill)',
                          fontSize: '0.75rem',
                          fontWeight: 600,
                          backgroundColor: `${m.medioPagoColor || '#3b82f6'}18`,
                          border: `1px solid ${m.medioPagoColor || '#3b82f6'}40`,
                          color: m.medioPagoColor || 'var(--color-text-main)',
                        }}
                      >
                        <span>{m.medioPagoLabel}</span>
                      </span>
                    </td>

                    {/* Responsable */}
                    <td>
                      {m.responsable ? (
                        <span className="badge neutral" style={{ fontSize: '0.7rem' }}>
                          {m.responsable}
                        </span>
                      ) : (
                        <span style={{ color: 'var(--color-text-muted)', fontSize: '0.75rem' }}>-</span>
                      )}
                    </td>

                    {/* Monto */}
                    <td
                      style={{
                        textAlign: 'right',
                        fontFamily: 'var(--font-mono)',
                        fontWeight: 700,
                        fontSize: '0.925rem',
                        color: isIngreso
                          ? 'var(--color-income)'
                          : isTransf
                          ? '#06b6d4'
                          : isCuota
                          ? 'var(--color-credit)'
                          : 'var(--color-expense)',
                      }}
                    >
                      {isIngreso ? '+' : isTransf ? '' : '-'} {formatMoney(m.monto)}
                    </td>
                  </tr>
                )
              })}

              {movimientosVisibles.length === 0 && (
                <tr>
                  <td colSpan={6} style={{ textAlign: 'center', padding: '3rem 1rem', color: 'var(--color-text-muted)' }}>
                    <p style={{ fontWeight: 600, marginBottom: '0.25rem' }}>
                      No se encontraron movimientos con los filtros seleccionados.
                    </p>
                    <span style={{ fontSize: '0.85rem' }}>
                      Prueba seleccionando <strong>Todos</strong> en período o borrando el término de búsqueda.
                    </span>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Botón Ver Más */}
        {todosLosMovimientos.length > 25 && (
          <div style={{ display: 'flex', justifyContent: 'center', padding: '1rem', borderTop: '1px solid var(--color-border)' }}>
            <button
              type="button"
              className="btn secondary"
              onClick={() => setMostrarTodosMovs(!mostrarTodosMovs)}
            >
              {mostrarTodosMovs
                ? 'Mostrar menos (primeros 25)'
                : `Ver todos los ${todosLosMovimientos.length} movimientos`}
            </button>
          </div>
        )}
      </div>

      {/* Modal Confirmación Reinicio */}
      <Modal
        isOpen={modalResetOpen}
        onClose={() => setModalResetOpen(false)}
        title="Confirmar reinicio total a 0"
        maxWidth="500px"
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', padding: '0.5rem 0' }}>
          <p style={{ margin: 0, fontSize: '0.95rem', lineHeight: 1.5 }}>
            ¿Estás seguro de que deseas reiniciar todos los datos a $0?
          </p>
          <div style={{ backgroundColor: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.3)', borderRadius: 'var(--radius-md)', padding: '0.75rem 1rem', fontSize: '0.85rem', color: '#f87171', lineHeight: 1.4 }}>
            Esta acción eliminará todos los registros históricos (ingresos, gastos, arriendos, servicios, compras del hogar, alimentación, ocio, cuotas de tarjetas y transferencias) y restablecerá los saldos de tus cuentas a $0.
          </div>
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '0.5rem' }}>
            <button type="button" className="btn secondary" onClick={() => setModalResetOpen(false)}>
              Cancelar
            </button>
            <button
              type="button"
              className="btn danger"
              onClick={() => {
                clearAllData()
                setModalResetOpen(false)
              }}
            >
              Sí, reiniciar todo a $0
            </button>
          </div>
        </div>
      </Modal>
    </div>
  )
}

