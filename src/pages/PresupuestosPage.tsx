import { useState, useMemo, type FormEvent } from 'react'
import { useFinance } from '../context/FinanceContext'
import { Modal } from '../components/Modal'
import { calcularEstadoPresupuesto } from '../utils/financialCalculations'
import { formatMoney, formatMonthYear } from '../utils/formatters'
import type { GrupoPresupuesto } from '../types/finance'

export function PresupuestosPage() {
  const {
    state,
    selectedMonth,
    totalGastosHogarMes,
    totalAlimentacionMes,
    totalGastosPersonalesMes,
    totalCuotasTarjetasMes,
    setPresupuesto,
    deletePresupuesto,
  } = useFinance()

  const [modalOpen, setModalOpen] = useState(false)
  const [grupo, setGrupo] = useState<GrupoPresupuesto>('HOGAR')
  const [nombre, setNombre] = useState('')
  const [limiteMonto, setLimiteMonto] = useState('')

  // Presupuestos del mes
  const presupuestosMes = useMemo(() => {
    return state.presupuestos.filter((p) => p.mes === selectedMonth)
  }, [state.presupuestos, selectedMonth])

  // Obtener gasto real según la clave o grupo del presupuesto
  function getGastoReal(grupoP: GrupoPresupuesto, clave: string): number {
    if (clave === 'SERVICIOS_PUBLICOS') {
      return state.servicios
        .filter((s) => (s.periodo === selectedMonth || s.fechaVencimiento.startsWith(selectedMonth)) && s.pagado)
        .reduce((acc, s) => acc + s.monto, 0)
    }
    if (grupoP === 'HOGAR') return totalGastosHogarMes
    if (grupoP === 'ALIMENTACION') return totalAlimentacionMes
    if (grupoP === 'PERSONAL') return totalGastosPersonalesMes
    if (grupoP === 'TARJETAS') return totalCuotasTarjetasMes
    if (grupoP === 'SERVICIOS') {
      return state.servicios
        .filter((s) => (s.periodo === selectedMonth || s.fechaVencimiento.startsWith(selectedMonth)) && s.pagado)
        .reduce((acc, s) => acc + s.monto, 0)
    }
    return 0
  }

  // Totales consolidados de presupuestos
  const totalPresupuestado = useMemo(() => {
    return presupuestosMes.reduce((acc, p) => acc + p.limiteMonto, 0)
  }, [presupuestosMes])

  const totalGastadoGlobal = useMemo(() => {
    return (
      totalGastosHogarMes +
      totalAlimentacionMes +
      totalGastosPersonalesMes +
      totalCuotasTarjetasMes
    )
  }, [
    totalGastosHogarMes,
    totalAlimentacionMes,
    totalGastosPersonalesMes,
    totalCuotasTarjetasMes,
  ])

  function handleSave(e: FormEvent) {
    e.preventDefault()
    if (!limiteMonto || Number(limiteMonto) <= 0) return

    let clave = `${grupo}_GENERAL`
    let nombreFinal = nombre
    if (!nombreFinal) {
      if (grupo === 'HOGAR') nombreFinal = 'Hogar y Vivienda'
      if (grupo === 'ALIMENTACION') nombreFinal = 'Alimentación y Mercado'
      if (grupo === 'PERSONAL') nombreFinal = 'Personal y Ocio'
      if (grupo === 'TARJETAS') nombreFinal = 'Tarjetas de Crédito'
      if (grupo === 'SERVICIOS') {
        nombreFinal = 'Servicios Públicos'
        clave = 'SERVICIOS_PUBLICOS'
      }
    }

    setPresupuesto({
      mes: selectedMonth,
      categoriaClave: clave,
      nombre: nombreFinal,
      grupo,
      limiteMonto: Number(limiteMonto),
    })

    setNombre('')
    setLimiteMonto('')
    setModalOpen(false)
  }

  return (
    <div className="page">
      {/* Header */}
      <div className="page-header">
        <div className="page-header-info">
          <h1>
            <svg viewBox="0 0 24 24" width="28" height="28" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M12 2v20" />
              <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
            </svg>
            Presupuestos Mensuales & Metas
          </h1>
          <p>
            Límites de gasto por categorías y control de desbordes para{' '}
            <strong>{formatMonthYear(selectedMonth)}</strong>.
          </p>
        </div>

        <div className="page-header-actions">
          <button type="button" className="btn primary" onClick={() => setModalOpen(true)}>
            + Asignar Presupuesto
          </button>
        </div>
      </div>

      {/* KPI Consolidado */}
      <div className="stat-grid">
        <article className="stat-card">
          <div className="stat-card-top">
            <span className="stat-card-title">Total Presupuestado</span>
            <span className="badge neutral">Techo Límite</span>
          </div>
          <div className="stat-value">{formatMoney(totalPresupuestado)}</div>
          <span className="stat-subtext">Límite mensual establecido</span>
        </article>

        <article className="stat-card" style={{ borderLeft: '4px solid var(--color-expense)' }}>
          <div className="stat-card-top">
            <span className="stat-card-title">Total Gastado a la Fecha</span>
            <span className="badge expense">Ejecutado</span>
          </div>
          <div className="stat-value" style={{ color: 'var(--color-expense)' }}>
            {formatMoney(totalGastadoGlobal)}
          </div>
          <span className="stat-subtext">
            {totalPresupuestado > 0
              ? `${Math.round((totalGastadoGlobal / totalPresupuestado) * 100)}% del límite global`
              : 'Sin límite establecido'}
          </span>
        </article>

        <article
          className="stat-card"
          style={{
            borderLeft: `4px solid ${
              totalPresupuestado - totalGastadoGlobal >= 0 ? 'var(--color-income)' : 'var(--color-expense)'
            }`,
          }}
        >
          <div className="stat-card-top">
            <span className="stat-card-title">Margen Restante</span>
            <span className={`badge ${totalPresupuestado - totalGastadoGlobal >= 0 ? 'income' : 'expense'}`}>
              {totalPresupuestado - totalGastadoGlobal >= 0 ? 'Dentro de meta' : 'Excedido'}
            </span>
          </div>
          <div
            className="stat-value"
            style={{
              color: totalPresupuestado - totalGastadoGlobal >= 0 ? 'var(--color-income)' : 'var(--color-expense)',
            }}
          >
            {formatMoney(totalPresupuestado - totalGastadoGlobal)}
          </div>
          <span className="stat-subtext">
            {totalPresupuestado - totalGastadoGlobal >= 0 ? 'Disponible antes de sobrecosto' : 'Exceso sobre presupuesto'}
          </span>
        </article>
      </div>

      {/* Lista de Presupuestos por Categoría */}
      <div className="panel">
        <div className="panel-header">
          <h2 className="panel-title">Ejecución Presupuestal por Categoría</h2>
          <button type="button" className="btn primary sm" onClick={() => setModalOpen(true)}>
            + Agregar Categoría
          </button>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          {presupuestosMes.map((p) => {
            const gastoActual = getGastoReal(p.grupo, p.categoriaClave)
            const estado = calcularEstadoPresupuesto(gastoActual, p.limiteMonto)

            return (
              <div
                key={p.id}
                style={{
                  background: 'var(--color-surface)',
                  border: '1px solid var(--color-border)',
                  borderRadius: 'var(--radius-lg)',
                  padding: '1.25rem',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '0.75rem',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.5rem' }}>
                  <div>
                    <strong style={{ fontSize: '1.05rem', color: 'var(--color-text-main)' }}>
                      {p.nombre}
                    </strong>
                    <span className="badge neutral" style={{ marginLeft: '0.5rem', fontSize: '0.7rem' }}>
                      {p.grupo}
                    </span>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                    <span
                      className={`badge ${
                        estado.estado === 'normal'
                          ? 'income'
                          : estado.estado === 'alerta'
                          ? 'warning'
                          : 'expense'
                      }`}
                    >
                      {estado.estado === 'normal' && 'En Rango'}
                      {estado.estado === 'alerta' && 'Cerca del Límite'}
                      {estado.estado === 'excedido' && 'Sobrepasado'}
                    </span>
                    <button
                      type="button"
                      className="btn ghost sm"
                      onClick={() => deletePresupuesto(p.id)}
                      title="Eliminar presupuesto"
                    >
                      Eliminar
                    </button>
                  </div>
                </div>

                {/* Montos y Porcentaje */}
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.9rem' }}>
                  <span>
                    Gastado: <strong>{formatMoney(gastoActual)}</strong> de {formatMoney(p.limiteMonto)}
                  </span>
                  <strong
                    style={{
                      color:
                        estado.estado === 'normal'
                          ? 'var(--color-income)'
                          : estado.estado === 'alerta'
                          ? 'var(--color-warning-text)'
                          : 'var(--color-expense)',
                    }}
                  >
                    {estado.porcentaje}%
                  </strong>
                </div>

                {/* Barra de Progreso */}
                <div className="progress-bar-bg">
                  <div
                    className={`progress-bar-fill ${estado.estado}`}
                    style={{ width: `${Math.min(100, estado.porcentaje)}%` }}
                  />
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', color: 'var(--color-text-muted)' }}>
                  <span>
                    {estado.diferencia >= 0
                      ? `Restante disponible: ${formatMoney(estado.diferencia)}`
                      : `Exceso: ${formatMoney(Math.abs(estado.diferencia))}`}
                  </span>
                </div>
              </div>
            )
          })}

          {presupuestosMes.length === 0 && (
            <div style={{ textAlign: 'center', padding: '2.5rem', color: 'var(--color-text-muted)' }}>
              No has configurado presupuestos para este mes.
            </div>
          )}
        </div>
      </div>

      {/* MODAL CONFIGURAR PRESUPUESTO */}
      <Modal isOpen={modalOpen} onClose={() => setModalOpen(false)} title="Asignar Presupuesto Mensual">
        <form onSubmit={handleSave} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <div className="form-group">
            <label>Grupo / Categoría *</label>
            <select className="form-select" value={grupo} onChange={(e) => setGrupo(e.target.value as typeof grupo)}>
              <option value="HOGAR">Hogar, Vivienda & Arriendo</option>
              <option value="SERVICIOS">Servicios Públicos e Internet</option>
              <option value="ALIMENTACION">Alimentación & Mercado</option>
              <option value="PERSONAL">Finanzas Personales, Celular & Ocio</option>
              <option value="TARJETAS">Cuotas de Tarjetas de Crédito</option>
            </select>
          </div>

          <div className="form-group">
            <label>Nombre Personalizado (Opcional)</label>
            <input
              type="text"
              className="form-input"
              placeholder="Ej: Mercado y Supermercado, Salidas a Comer"
              value={nombre}
              onChange={(e) => setNombre(e.target.value)}
            />
          </div>

          <div className="form-group">
            <label>Límite Mensual ($ COP) *</label>
            <input
              type="number"
              className="form-input"
              placeholder="Ej: 800000"
              value={limiteMonto}
              onChange={(e) => setLimiteMonto(e.target.value)}
              required
            />
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '0.5rem' }}>
            <button type="button" className="btn secondary" onClick={() => setModalOpen(false)}>
              Cancelar
            </button>
            <button type="submit" className="btn success">
              Guardar Presupuesto
            </button>
          </div>
        </form>
      </Modal>
    </div>
  )
}
