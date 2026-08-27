import { useState, type FormEvent } from 'react'
import { useFinance } from '../context/FinanceContext'
import { Modal } from '../components/Modal'
import { formatMoney, formatDate } from '../utils/formatters'
import type { TipoCuenta } from '../types/finance'

export function CuentasPage() {
  const {
    state,
    saldoLiquidezTotal,
    addCuenta,
    updateCuenta,
    deleteCuenta,
    transferirEntreCuentas,
  } = useFinance()

  const [modalCuentaOpen, setModalCuentaOpen] = useState(false)
  const [modalTransferenciaOpen, setModalTransferenciaOpen] = useState(false)
  const [editingCuentaId, setEditingCuentaId] = useState<string | null>(null)

  // Form State Cuenta
  const [nombre, setNombre] = useState('')
  const [tipo, setTipo] = useState<TipoCuenta>('BANCO')
  const [saldo, setSaldo] = useState('')
  const [numero, setNumero] = useState('')
  const [color, setColor] = useState('#3b82f6')

  // Form State Transferencia
  const [origenId, setOrigenId] = useState(state.cuentas[0]?.id || '')
  const [destinoId, setDestinoId] = useState(state.cuentas[1]?.id || '')
  const [montoTransf, setMontoTransf] = useState('')
  const [descTransf, setDescTransf] = useState('')
  const [fechaTransf, setFechaTransf] = useState(new Date().toISOString().slice(0, 10))

  function handleSaveCuenta(e: FormEvent) {
    e.preventDefault()
    if (!nombre) return

    if (editingCuentaId) {
      updateCuenta(editingCuentaId, {
        nombre,
        tipo,
        saldo: Number(saldo) || 0,
        numero: numero || undefined,
        color,
      })
      setEditingCuentaId(null)
    } else {
      addCuenta({
        nombre,
        tipo,
        saldo: Number(saldo) || 0,
        numero: numero || undefined,
        color,
      })
    }

    setNombre('')
    setSaldo('')
    setNumero('')
    setModalCuentaOpen(false)
  }

  function handleTransferencia(e: FormEvent) {
    e.preventDefault()
    const monto = Number(montoTransf)
    if (!monto || monto <= 0 || origenId === destinoId) return

    transferirEntreCuentas({
      fecha: fechaTransf,
      cuentaOrigenId: origenId,
      cuentaDestinoId: destinoId,
      monto,
      descripcion: descTransf || 'Transferencia entre cuentas',
    })

    setMontoTransf('')
    setDescTransf('')
    setModalTransferenciaOpen(false)
  }

  return (
    <div className="page">
      {/* Header */}
      <div className="page-header">
        <div className="page-header-info">
          <h1>
            <svg viewBox="0 0 24 24" width="28" height="28" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M3 21h18" />
              <path d="M3 10h18" />
              <path d="M5 6l7-3 7 3" />
              <path d="M4 10v11" />
              <path d="M20 10v11" />
              <path d="M8 14v4" />
              <path d="M12 14v4" />
              <path d="M16 14v4" />
            </svg>
            Cuentas Bancarias, Billeteras & Efectivo
          </h1>
          <p>Control de disponibilidad y transferencias entre Bancolombia, Nequi, Daviplata y Efectivo.</p>
        </div>

        <div className="page-header-actions">
          <button type="button" className="btn secondary" onClick={() => setModalTransferenciaOpen(true)}>
            ⇄ Transferir Fondos
          </button>
          <button
            type="button"
            className="btn primary"
            onClick={() => {
              setEditingCuentaId(null)
              setNombre('')
              setSaldo('')
              setNumero('')
              setModalCuentaOpen(true)
            }}
          >
            + Nueva Cuenta
          </button>
        </div>
      </div>

      {/* KPI Principal */}
      <div className="stat-card" style={{ borderLeft: '5px solid var(--color-income)' }}>
        <div className="stat-card-top">
          <span className="stat-card-title">Liquidez Total Disponible</span>
          <span className="badge income">Activos Líquidos</span>
        </div>
        <div className="stat-value" style={{ color: 'var(--color-income)' }}>
          {formatMoney(saldoLiquidezTotal)}
        </div>
        <span className="stat-subtext">Suma de saldos en todas tus cuentas y efectivo en mano</span>
      </div>

      {/* Grid de Cuentas */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1.25rem' }}>
        {state.cuentas.map((c) => {
          let icono = '🏛️'
          if (c.tipo === 'BILLETERA_DIGITAL') icono = '📱'
          if (c.tipo === 'EFECTIVO') icono = '💵'

          return (
            <article
              key={c.id}
              className="stat-card"
              style={{
                borderTop: `4px solid ${c.color || '#3b82f6'}`,
              }}
            >
              <div className="stat-card-top">
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                  <span style={{ fontSize: '1.4rem' }}>{icono}</span>
                  <div>
                    <strong style={{ fontSize: '1rem', color: 'var(--color-text-main)', display: 'block' }}>
                      {c.nombre}
                    </strong>
                    {c.numero && (
                      <span style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>
                        {c.numero}
                      </span>
                    )}
                  </div>
                </div>
                <span className="badge neutral" style={{ fontSize: '0.7rem' }}>
                  {c.tipo}
                </span>
              </div>

              <div className="stat-value" style={{ fontSize: '1.6rem' }}>
                {formatMoney(c.saldo)}
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem', marginTop: '0.5rem', paddingTop: '0.5rem', borderTop: '1px solid var(--color-border)' }}>
                <button
                  type="button"
                  className="btn secondary sm"
                  onClick={() => {
                    setEditingCuentaId(c.id)
                    setNombre(c.nombre)
                    setTipo(c.tipo)
                    setSaldo(String(c.saldo))
                    setNumero(c.numero || '')
                    setColor(c.color || '#3b82f6')
                    setModalCuentaOpen(true)
                  }}
                >
                  Editar Saldo
                </button>
                <button
                  type="button"
                  className="btn ghost sm"
                  onClick={() => {
                    if (confirm(`¿Eliminar la cuenta ${c.nombre}?`)) {
                      deleteCuenta(c.id)
                    }
                  }}
                >
                  Eliminar
                </button>
              </div>
            </article>
          )
        })}
      </div>

      {/* Historial de Transferencias entre Cuentas */}
      <div className="panel">
        <div className="panel-header">
          <h2 className="panel-title">
            Historial de Transferencias entre Cuentas
          </h2>
          <button type="button" className="btn secondary sm" onClick={() => setModalTransferenciaOpen(true)}>
            + Nueva Transferencia
          </button>
        </div>

        <div className="table-container">
          <table>
            <thead>
              <tr>
                <th>Fecha</th>
                <th>Cuenta Origen</th>
                <th>Cuenta Destino</th>
                <th>Descripción</th>
                <th style={{ textAlign: 'right' }}>Monto</th>
              </tr>
            </thead>
            <tbody>
              {(state.transferencias || []).map((t) => {
                const origen = state.cuentas.find((c) => c.id === t.cuentaOrigenId)
                const destino = state.cuentas.find((c) => c.id === t.cuentaDestinoId)

                return (
                  <tr key={t.id}>
                    <td>{formatDate(t.fecha)}</td>
                    <td><strong>{origen?.nombre || 'Origen'}</strong></td>
                    <td><strong style={{ color: 'var(--color-income)' }}>{destino?.nombre || 'Destino'}</strong></td>
                    <td>{t.descripcion || 'Transferencia'}</td>
                    <td style={{ textAlign: 'right', fontWeight: 600 }}>{formatMoney(t.monto)}</td>
                  </tr>
                )
              })}
              {(!state.transferencias || state.transferencias.length === 0) && (
                <tr>
                  <td colSpan={5} style={{ textAlign: 'center', padding: '2rem', color: 'var(--color-text-muted)' }}>
                    No hay transferencias registradas entre cuentas.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* MODAL CREAR / EDITAR CUENTA */}
      <Modal
        isOpen={modalCuentaOpen}
        onClose={() => setModalCuentaOpen(false)}
        title={editingCuentaId ? '✏️ Editar Cuenta' : '🏛️ Agregar Cuenta Financiera'}
      >
        <form onSubmit={handleSaveCuenta} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <div className="form-group">
            <label>Nombre de la Cuenta *</label>
            <input
              type="text"
              className="form-input"
              placeholder="Ej: Bancolombia Ahorros, Nequi, Daviplata, Efectivo"
              value={nombre}
              onChange={(e) => setNombre(e.target.value)}
              required
            />
          </div>

          <div className="form-grid">
            <div className="form-group">
              <label>Tipo de Cuenta</label>
              <select className="form-select" value={tipo} onChange={(e) => setTipo(e.target.value as typeof tipo)}>
                <option value="BANCO">🏛️ Banco / Cuenta de Ahorros</option>
                <option value="BILLETERA_DIGITAL">📱 Billetera Digital (Nequi / Daviplata)</option>
                <option value="EFECTIVO">💵 Efectivo Físico</option>
              </select>
            </div>

            <div className="form-group">
              <label>Saldo Actual ($ COP) *</label>
              <input
                type="number"
                className="form-input"
                placeholder="Ej: 1500000"
                value={saldo}
                onChange={(e) => setSaldo(e.target.value)}
                required
              />
            </div>
          </div>

          <div className="form-grid">
            <div className="form-group">
              <label>Número / Identificador (Opcional)</label>
              <input
                type="text"
                className="form-input"
                placeholder="Ej: •••• 4589 o Teléfono"
                value={numero}
                onChange={(e) => setNumero(e.target.value)}
              />
            </div>

            <div className="form-group">
              <label>Color Identificador</label>
              <input type="color" className="form-input" style={{ height: '42px', padding: '2px' }} value={color} onChange={(e) => setColor(e.target.value)} />
            </div>
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '0.5rem' }}>
            <button type="button" className="btn secondary" onClick={() => setModalCuentaOpen(false)}>
              Cancelar
            </button>
            <button type="submit" className="btn success">
              Guardar Cuenta
            </button>
          </div>
        </form>
      </Modal>

      {/* MODAL TRANSFERENCIA */}
      <Modal
        isOpen={modalTransferenciaOpen}
        onClose={() => setModalTransferenciaOpen(false)}
        title="⇄ Transferir Dinero Entre Cuentas"
      >
        <form onSubmit={handleTransferencia} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <div className="form-grid">
            <div className="form-group">
              <label>Cuenta de Origen (Sale el dinero) *</label>
              <select className="form-select" value={origenId} onChange={(e) => setOrigenId(e.target.value)}>
                {state.cuentas.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.nombre} ({formatMoney(c.saldo)})
                  </option>
                ))}
              </select>
            </div>

            <div className="form-group">
              <label>Cuenta de Destino (Entra el dinero) *</label>
              <select className="form-select" value={destinoId} onChange={(e) => setDestinoId(e.target.value)}>
                {state.cuentas.map((c) => (
                  <option key={c.id} value={c.id} disabled={c.id === origenId}>
                    {c.nombre} ({formatMoney(c.saldo)})
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="form-grid">
            <div className="form-group">
              <label>Monto a Transferir ($ COP) *</label>
              <input
                type="number"
                className="form-input"
                placeholder="Ej: 200000"
                value={montoTransf}
                onChange={(e) => setMontoTransf(e.target.value)}
                required
              />
            </div>

            <div className="form-group">
              <label>Fecha *</label>
              <input type="date" className="form-input" value={fechaTransf} onChange={(e) => setFechaTransf(e.target.value)} required />
            </div>
          </div>

          <div className="form-group">
            <label>Descripción / Motivo</label>
            <input
              type="text"
              className="form-input"
              placeholder="Ej: Retiro a efectivo, Pasar a Nequi para comida"
              value={descTransf}
              onChange={(e) => setDescTransf(e.target.value)}
            />
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '0.5rem' }}>
            <button type="button" className="btn secondary" onClick={() => setModalTransferenciaOpen(false)}>
              Cancelar
            </button>
            <button type="submit" className="btn success">
              Ejecutar Transferencia
            </button>
          </div>
        </form>
      </Modal>
    </div>
  )
}
