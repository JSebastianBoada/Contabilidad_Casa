import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { useFinance } from '../context/FinanceContext'
import { StatCard } from '../components/StatCard'
import { DonutChart, BarChartCashflow } from '../components/Charts'
import { formatMoney, formatDate, formatMonthYear, getDaysRemaining } from '../utils/formatters'

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
  } = useFinance()

  const [searchTerm, setSearchTerm] = useState('')

  // Servicios y arriendos pendientes en el mes
  const pagosPendientes = useMemo(() => {
    const lista: {
      id: string
      tipo: 'SERVICIO' | 'ARRIENDO'
      nombre: string
      monto: number
      fechaLimite: string
      emoji: string
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
          emoji: '🏠',
          diasInfo: getDaysRemaining(a.fechaLimite),
        })
      })

    // Servicios
    state.servicios
      .filter((s) => (s.periodo === selectedMonth || s.fechaVencimiento.startsWith(selectedMonth)) && !s.pagado)
      .forEach((s) => {
        let emoji = '💡'
        if (s.tipo === 'ENERGIA') emoji = '⚡'
        if (s.tipo === 'GAS') emoji = '🔥'
        if (s.tipo === 'AGUA') emoji = '💧'
        if (s.tipo === 'INTERNET') emoji = '🌐'

        lista.push({
          id: s.id,
          tipo: 'SERVICIO',
          nombre: s.nombre,
          monto: s.monto,
          fechaLimite: s.fechaVencimiento,
          emoji,
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
      { label: 'Personal, Ocio y Nómina', value: totalGastosPersonalesMes, color: '#f59e0b' },
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

  // Todos los movimientos recientes consolidados
  const movimientosRecientes = useMemo(() => {
    const list: {
      id: string
      fecha: string
      modulo: string
      descripcion: string
      tipo: 'INGRESO' | 'GASTO'
      monto: number
      badge: string
    }[] = []

    state.ingresos.forEach((i) => {
      list.push({
        id: i.id,
        fecha: i.fecha,
        modulo: 'Ingresos',
        descripcion: i.descripcion,
        tipo: 'INGRESO',
        monto: i.monto,
        badge: i.tipo,
      })
    })

    state.alimentacion.forEach((a) => {
      list.push({
        id: a.id,
        fecha: a.fecha,
        modulo: 'Alimentación',
        descripcion: `${a.descripcion} (${a.tipoComida})`,
        tipo: 'GASTO',
        monto: a.monto,
        badge: a.tipoComida,
      })
    })

    state.comprasHogar.forEach((c) => {
      list.push({
        id: c.id,
        fecha: c.fecha,
        modulo: 'Hogar',
        descripcion: c.descripcion,
        tipo: 'GASTO',
        monto: c.monto,
        badge: c.categoria,
      })
    })

    state.gastosPersonales.forEach((g) => {
      list.push({
        id: g.id,
        fecha: g.fecha,
        modulo: 'Personal',
        descripcion: g.descripcion,
        tipo: 'GASTO',
        monto: g.monto,
        badge: g.categoria.replace(/_/g, ' '),
      })
    })

    return list
      .filter((m) =>
        searchTerm
          ? m.descripcion.toLowerCase().includes(searchTerm.toLowerCase()) ||
            m.modulo.toLowerCase().includes(searchTerm.toLowerCase())
          : true
      )
      .sort((a, b) => (a.fecha < b.fecha ? 1 : -1))
      .slice(0, 15)
  }, [state, searchTerm])

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
                  <div className="alert-bill-emoji">{p.emoji}</div>
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
                  ✓ Pagar
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
            <span className="stat-icon primary">🏠</span>
          </div>
          <div className="stat-value" style={{ fontSize: '1.25rem' }}>
            {formatMoney(totalGastosHogarMes)}
          </div>
          <span className="stat-subtext">Arriendo, luz, agua, gas e internet →</span>
        </Link>

        <Link to="/alimentacion" className="stat-card" style={{ cursor: 'pointer' }}>
          <div className="stat-card-top">
            <span className="stat-card-title">Alimentación</span>
            <span className="stat-icon income">🍲</span>
          </div>
          <div className="stat-value" style={{ fontSize: '1.25rem' }}>
            {formatMoney(totalAlimentacionMes)}
          </div>
          <span className="stat-subtext">Mercado, desayunos, almuerzos y cenas →</span>
        </Link>

        <Link to="/personal" className="stat-card" style={{ cursor: 'pointer' }}>
          <div className="stat-card-top">
            <span className="stat-card-title">Personal & Ocio</span>
            <span className="stat-icon warning">🎉</span>
          </div>
          <div className="stat-value" style={{ fontSize: '1.25rem' }}>
            {formatMoney(totalGastosPersonalesMes)}
          </div>
          <span className="stat-subtext">Celular, salidas, partidos y regalos →</span>
        </Link>

        <Link to="/tarjetas" className="stat-card" style={{ cursor: 'pointer' }}>
          <div className="stat-card-top">
            <span className="stat-card-title">Cuotas de Tarjetas</span>
            <span className="stat-icon credit">💳</span>
          </div>
          <div className="stat-value" style={{ fontSize: '1.25rem' }}>
            {formatMoney(totalCuotasTarjetasMes)}
          </div>
          <span className="stat-subtext">Proyección de pagos diferidos →</span>
        </Link>
      </div>

      {/* Tabla de Movimientos Recientes */}
      <div className="panel">
        <div className="panel-header">
          <h2 className="panel-title">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="8" y1="6" x2="21" y2="6" />
              <line x1="8" y1="12" x2="21" y2="12" />
              <line x1="8" y1="18" x2="21" y2="18" />
              <line x1="3" y1="6" x2="3.01" y2="6" />
              <line x1="3" y1="12" x2="3.01" y2="12" />
              <line x1="3" y1="18" x2="3.01" y2="18" />
            </svg>
            Últimos Movimientos Registrados
          </h2>

          <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
            <input
              type="text"
              className="form-input"
              placeholder="Buscar movimiento..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              style={{ maxWidth: '240px', padding: '0.35rem 0.65rem', fontSize: '0.8rem' }}
            />
          </div>
        </div>

        <div className="table-container">
          <table>
            <thead>
              <tr>
                <th>Fecha</th>
                <th>Módulo</th>
                <th>Descripción</th>
                <th>Categoría / Tipo</th>
                <th style={{ textAlign: 'right' }}>Monto</th>
              </tr>
            </thead>
            <tbody>
              {movimientosRecientes.map((m) => (
                <tr key={`${m.modulo}-${m.id}`}>
                  <td style={{ whiteSpace: 'nowrap', color: 'var(--color-text-muted)', fontSize: '0.775rem' }}>
                    {formatDate(m.fecha)}
                  </td>
                  <td>
                    <span className="badge neutral" style={{ fontSize: '0.7rem' }}>
                      {m.modulo}
                    </span>
                  </td>
                  <td>
                    <strong>{m.descripcion}</strong>
                  </td>
                  <td>
                    <span className="badge neutral" style={{ fontSize: '0.7rem' }}>
                      {m.badge}
                    </span>
                  </td>
                  <td
                    style={{
                      textAlign: 'right',
                      fontFamily: 'var(--font-mono)',
                      fontWeight: 600,
                      color: m.tipo === 'INGRESO' ? 'var(--color-income)' : 'var(--color-expense)',
                    }}
                  >
                    {m.tipo === 'INGRESO' ? '+' : '-'} {formatMoney(m.monto)}
                  </td>
                </tr>
              ))}
              {movimientosRecientes.length === 0 && (
                <tr>
                  <td colSpan={5} style={{ textAlign: 'center', padding: '2rem', color: 'var(--color-text-muted)' }}>
                    No se encontraron movimientos registrados.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
