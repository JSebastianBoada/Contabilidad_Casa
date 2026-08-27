import { useState, useMemo, type FormEvent } from 'react'
import { useFinance } from '../context/FinanceContext'
import { Modal } from '../components/Modal'
import { DonutChart } from '../components/Charts'
import { formatMoney, formatDate, formatMonthYear } from '../utils/formatters'
import type { TipoComida } from '../types/finance'

export function AlimentacionPage() {
  const {
    state,
    selectedMonth,
    totalAlimentacionMes,
    addAlimentacion,
    deleteAlimentacion,
  } = useFinance()

  const [filterTipo, setFilterTipo] = useState<string>('TODOS')
  const [modalOpen, setModalOpen] = useState(false)

  // Form State
  const [tipoComida, setTipoComida] = useState<TipoComida>('DESAYUNO')
  const [descripcion, setDescripcion] = useState('')
  const [lugar, setLugar] = useState('')
  const [monto, setMonto] = useState('')
  const [fecha, setFecha] = useState(new Date().toISOString().slice(0, 10))
  const [cuentaId, setCuentaId] = useState(state.cuentas[0]?.id || '')

  // Filtrado de alimentación del mes
  const alimentacionMes = useMemo(() => {
    return state.alimentacion.filter((a) => a.fecha.startsWith(selectedMonth))
  }, [state.alimentacion, selectedMonth])

  // Desglose por tipo
  const totalMercado = useMemo(() => {
    return alimentacionMes
      .filter((a) => a.tipoComida === 'MERCADO_GENERAL')
      .reduce((acc, a) => acc + a.monto, 0)
  }, [alimentacionMes])

  const totalDesayuno = useMemo(() => {
    return alimentacionMes
      .filter((a) => a.tipoComida === 'DESAYUNO')
      .reduce((acc, a) => acc + a.monto, 0)
  }, [alimentacionMes])

  const totalAlmuerzo = useMemo(() => {
    return alimentacionMes
      .filter((a) => a.tipoComida === 'ALMUERZO')
      .reduce((acc, a) => acc + a.monto, 0)
  }, [alimentacionMes])

  const totalCena = useMemo(() => {
    return alimentacionMes
      .filter((a) => a.tipoComida === 'COMIDA')
      .reduce((acc, a) => acc + a.monto, 0)
  }, [alimentacionMes])

  // Donut chart de comida
  const chartData = useMemo(() => {
    return [
      { label: 'Mercado Grande', value: totalMercado, color: '#3b82f6' },
      { label: 'Desayunos', value: totalDesayuno, color: '#f59e0b' },
      { label: 'Almuerzos', value: totalAlmuerzo, color: '#10b981' },
      { label: 'Cenas / Comida', value: totalCena, color: '#8b5cf6' },
    ]
  }, [totalMercado, totalDesayuno, totalAlmuerzo, totalCena])

  // Gastos filtrados para la tabla
  const itemsFiltrados = useMemo(() => {
    if (filterTipo === 'TODOS') return alimentacionMes
    return alimentacionMes.filter((a) => a.tipoComida === filterTipo)
  }, [alimentacionMes, filterTipo])

  // Promedio diario estimado
  const diasEnMes = 30
  const promedioDiario = Math.round(totalAlimentacionMes / diasEnMes)

  function handleSubmit(e: FormEvent) {
    e.preventDefault()
    if (!monto || Number(monto) <= 0) return

    addAlimentacion({
      fecha,
      tipoComida,
      descripcion: descripcion || `Gasto de ${tipoComida.toLowerCase()}`,
      lugarOProveedor: lugar || undefined,
      monto: Number(monto),
      cuentaId,
      esMercadoGrande: tipoComida === 'MERCADO_GENERAL',
    })

    setDescripcion('')
    setLugar('')
    setMonto('')
    setModalOpen(false)
  }

  return (
    <div className="page">
      {/* Header */}
      <div className="page-header">
        <div className="page-header-info">
          <h1>
            <svg viewBox="0 0 24 24" width="28" height="28" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M18 8h1a4 4 0 0 1 0 8h-1" />
              <path d="M2 8h16v9a4 4 0 0 1-4 4H6a4 4 0 0 1-4-4V8z" />
              <line x1="6" y1="1" x2="6" y2="4" />
              <line x1="10" y1="1" x2="10" y2="4" />
              <line x1="14" y1="1" x2="14" y2="4" />
            </svg>
            Alimentación, Mercado & Comidas
          </h1>
          <p>
            Control especializado de mercado familiar, desayunos diarios, almuerzos y cenas en casa para{' '}
            <strong>{formatMonthYear(selectedMonth)}</strong>.
          </p>
        </div>

        <div className="page-header-actions">
          <div className="badge income" style={{ fontSize: '0.85rem', padding: '0.4rem 0.8rem' }}>
            Total Comida Mes: <strong>{formatMoney(totalAlimentacionMes)}</strong>
          </div>
          <button type="button" className="btn primary" onClick={() => setModalOpen(true)}>
            + Registrar Comida / Mercado
          </button>
        </div>
      </div>

      {/* Tarjetas de Desglose por Tipo de Comida */}
      <div className="stat-grid">
        <article className="stat-card" style={{ borderLeft: '4px solid #3b82f6' }}>
          <div className="stat-card-top">
            <span className="stat-card-title">🛒 Mercado Grande</span>
            <span className="badge neutral">Supermercado</span>
          </div>
          <div className="stat-value">{formatMoney(totalMercado)}</div>
          <span className="stat-subtext">Quincenal / Canasta básica</span>
        </article>

        <article className="stat-card" style={{ borderLeft: '4px solid #f59e0b' }}>
          <div className="stat-card-top">
            <span className="stat-card-title">🍳 Desayunos</span>
            <span className="badge neutral">Panadería & Frutas</span>
          </div>
          <div className="stat-value">{formatMoney(totalDesayuno)}</div>
          <span className="stat-subtext">Compras de la mañana</span>
        </article>

        <article className="stat-card" style={{ borderLeft: '4px solid #10b981' }}>
          <div className="stat-card-top">
            <span className="stat-card-title">🥗 Almuerzos</span>
            <span className="badge neutral">Mediodía</span>
          </div>
          <div className="stat-value">{formatMoney(totalAlmuerzo)}</div>
          <span className="stat-subtext">Ingredientes frescos y carnes</span>
        </article>

        <article className="stat-card" style={{ borderLeft: '4px solid #8b5cf6' }}>
          <div className="stat-card-top">
            <span className="stat-card-title">🍲 Cenas / Comida</span>
            <span className="badge neutral">Noche</span>
          </div>
          <div className="stat-value">{formatMoney(totalCena)}</div>
          <span className="stat-subtext">Cenas en el hogar</span>
        </article>
      </div>

      {/* Sección Gráfica y Métricas */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '1.5rem' }}>
        <div className="panel">
          <div className="panel-header">
            <h2 className="panel-title">
              Distribución del Gasto en Comida
            </h2>
          </div>
          <DonutChart data={chartData} totalLabel="Total Comida" />
        </div>

        <div className="panel" style={{ justifyContent: 'center' }}>
          <div className="panel-header">
            <h2 className="panel-title">📊 Promedio de Consumo Diario</h2>
          </div>
          <div style={{ padding: '1rem 0', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            <div>
              <span style={{ fontSize: '0.85rem', color: 'var(--color-text-muted)' }}>Costo diario estimado en alimentación:</span>
              <div style={{ fontFamily: 'var(--font-display)', fontSize: '2rem', fontWeight: 700, color: 'var(--color-income-hover)' }}>
                {formatMoney(promedioDiario)} / día
              </div>
            </div>
            <p style={{ fontSize: '0.85rem', color: 'var(--color-text-muted)', lineHeight: 1.4 }}>
              💡 Mantener un control separado entre el <strong>Mercado Principal</strong> y las compras diarias de <strong>panadería o almuerzos</strong> te permite optimizar hasta un 20% de gastos hormiga en comida.
            </p>
          </div>
        </div>
      </div>

      {/* Tabla de Registros */}
      <div className="panel">
        <div className="panel-header">
          <h2 className="panel-title">Historial de Compras de Alimentación</h2>

          {/* Filtros */}
          <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap' }}>
            <button
              type="button"
              className={`btn sm ${filterTipo === 'TODOS' ? 'primary' : 'secondary'}`}
              onClick={() => setFilterTipo('TODOS')}
            >
              Todos ({alimentacionMes.length})
            </button>
            <button
              type="button"
              className={`btn sm ${filterTipo === 'MERCADO_GENERAL' ? 'primary' : 'secondary'}`}
              onClick={() => setFilterTipo('MERCADO_GENERAL')}
            >
              🛒 Mercado
            </button>
            <button
              type="button"
              className={`btn sm ${filterTipo === 'DESAYUNO' ? 'primary' : 'secondary'}`}
              onClick={() => setFilterTipo('DESAYUNO')}
            >
              🍳 Desayunos
            </button>
            <button
              type="button"
              className={`btn sm ${filterTipo === 'ALMUERZO' ? 'primary' : 'secondary'}`}
              onClick={() => setFilterTipo('ALMUERZO')}
            >
              🥗 Almuerzos
            </button>
            <button
              type="button"
              className={`btn sm ${filterTipo === 'COMIDA' ? 'primary' : 'secondary'}`}
              onClick={() => setFilterTipo('COMIDA')}
            >
              🍲 Cenas
            </button>
          </div>
        </div>

        <div className="table-container">
          <table>
            <thead>
              <tr>
                <th>Fecha</th>
                <th>Tipo</th>
                <th>Descripción</th>
                <th>Lugar / Proveedor</th>
                <th>Cuenta de Pago</th>
                <th style={{ textAlign: 'right' }}>Monto</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {itemsFiltrados.map((item) => {
                const cuenta = state.cuentas.find((c) => c.id === item.cuentaId)
                let badgeClass = 'neutral'
                if (item.tipoComida === 'MERCADO_GENERAL') badgeClass = 'primary'
                if (item.tipoComida === 'DESAYUNO') badgeClass = 'warning'
                if (item.tipoComida === 'ALMUERZO') badgeClass = 'income'
                if (item.tipoComida === 'COMIDA') badgeClass = 'credit'

                return (
                  <tr key={item.id}>
                    <td>{formatDate(item.fecha)}</td>
                    <td>
                      <span className={`badge ${badgeClass}`} style={{ fontSize: '0.725rem' }}>
                        {item.tipoComida === 'MERCADO_GENERAL' ? 'Mercado Grande' : item.tipoComida}
                      </span>
                    </td>
                    <td><strong>{item.descripcion}</strong></td>
                    <td style={{ color: 'var(--color-text-muted)' }}>{item.lugarOProveedor || '—'}</td>
                    <td>{cuenta?.nombre || 'Efectivo'}</td>
                    <td style={{ textAlign: 'right', fontWeight: 600, color: 'var(--color-expense)' }}>
                      {formatMoney(item.monto)}
                    </td>
                    <td style={{ textAlign: 'right' }}>
                      <button
                        type="button"
                        className="btn ghost sm"
                        onClick={() => deleteAlimentacion(item.id)}
                        title="Eliminar registro"
                      >
                        ✕
                      </button>
                    </td>
                  </tr>
                )
              })}
              {itemsFiltrados.length === 0 && (
                <tr>
                  <td colSpan={7} style={{ textAlign: 'center', padding: '2rem', color: 'var(--color-text-muted)' }}>
                    No hay gastos de alimentación registrados bajo este filtro.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* MODAL REGISTRAR ALIMENTACIÓN */}
      <Modal isOpen={modalOpen} onClose={() => setModalOpen(false)} title="🍲 Registrar Alimentación o Mercado">
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <div className="form-group">
            <label>Tipo de Comida *</label>
            <select
              className="form-select"
              value={tipoComida}
              onChange={(e) => setTipoComida(e.target.value as typeof tipoComida)}
            >
              <option value="DESAYUNO">🍳 Desayuno / Panadería / Huevos / Café</option>
              <option value="ALMUERZO">🥗 Almuerzo / Carnes / Verduras del mediodía</option>
              <option value="COMIDA">🍲 Comida / Cena en casa / Arepas / Quesos</option>
              <option value="MERCADO_GENERAL">🛒 Mercado Grande (Supermercado / Quincena)</option>
            </select>
          </div>

          <div className="form-group">
            <label>Descripción / Detalle *</label>
            <input
              type="text"
              className="form-input"
              placeholder="Ej: Mercado quincenal Éxito, Pan y leche para la semana"
              value={descripcion}
              onChange={(e) => setDescripcion(e.target.value)}
              required
            />
          </div>

          <div className="form-grid">
            <div className="form-group">
              <label>Monto ($ COP) *</label>
              <input
                type="number"
                className="form-input"
                placeholder="Ej: 65000"
                value={monto}
                onChange={(e) => setMonto(e.target.value)}
                required
              />
            </div>

            <div className="form-group">
              <label>Fecha *</label>
              <input type="date" className="form-input" value={fecha} onChange={(e) => setFecha(e.target.value)} required />
            </div>
          </div>

          <div className="form-grid">
            <div className="form-group">
              <label>Lugar / Supermercado</label>
              <input
                type="text"
                className="form-input"
                placeholder="Ej: Éxito, D1, Jumbo, Panadería local"
                value={lugar}
                onChange={(e) => setLugar(e.target.value)}
              />
            </div>

            <div className="form-group">
              <label>Cuenta de Pago</label>
              <select className="form-select" value={cuentaId} onChange={(e) => setCuentaId(e.target.value)}>
                {state.cuentas.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.nombre} (Saldo: {formatMoney(c.saldo)})
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '0.5rem' }}>
            <button type="button" className="btn secondary" onClick={() => setModalOpen(false)}>
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
