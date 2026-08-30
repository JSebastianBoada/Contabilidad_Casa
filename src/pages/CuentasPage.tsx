import { useState, useMemo, type FormEvent } from 'react'
import { useFinance } from '../context/FinanceContext'
import { Modal } from '../components/Modal'
import { formatMoney, formatDate } from '../utils/formatters'
import type { TipoCuenta, CuentaFinanciera } from '../types/finance'

function getAccountVisualInfo(c: CuentaFinanciera) {
  const nombre = (c.nombre || '').toLowerCase()
  const isHermano = c.id === 'cuenta-hermano' || nombre.includes('hermano')
  const isBancolombia = nombre.includes('bancolombia')
  const isNequi = nombre.includes('nequi')
  const isDaviplata = nombre.includes('daviplata')
  const isNu = nombre.includes('nu')
  const isEfectivo = c.tipo === 'EFECTIVO' || nombre.includes('efectivo')

  if (isHermano) {
    return {
      icon: '👦',
      color: '#06b6d4',
      bgGlow: 'rgba(6, 182, 212, 0.12)',
      borderColor: 'rgba(6, 182, 212, 0.4)',
      textColor: '#22d3ee',
      tipoLabel: 'Fondo Hermano',
    }
  }

  if (isBancolombia) {
    return {
      icon: '🏦',
      color: '#f59e0b',
      bgGlow: 'rgba(245, 158, 11, 0.12)',
      borderColor: 'rgba(245, 158, 11, 0.4)',
      textColor: '#fbbf24',
      tipoLabel: 'Cuenta Bancaria',
    }
  }

  if (isNu) {
    return {
      icon: '🟣',
      color: '#9333ea',
      bgGlow: 'rgba(147, 51, 234, 0.12)',
      borderColor: 'rgba(147, 51, 234, 0.4)',
      textColor: '#c084fc',
      tipoLabel: 'Cuenta Nu',
    }
  }

  if (isNequi) {
    return {
      icon: '📱',
      color: '#8b5cf6',
      bgGlow: 'rgba(139, 92, 246, 0.12)',
      borderColor: 'rgba(139, 92, 246, 0.4)',
      textColor: '#a78bfa',
      tipoLabel: 'Nequi',
    }
  }

  if (isDaviplata) {
    return {
      icon: '📱',
      color: '#ef4444',
      bgGlow: 'rgba(239, 68, 68, 0.12)',
      borderColor: 'rgba(239, 68, 68, 0.4)',
      textColor: '#f87171',
      tipoLabel: 'Daviplata',
    }
  }

  if (isEfectivo) {
    return {
      icon: '💵',
      color: '#10b981',
      bgGlow: 'rgba(16, 185, 129, 0.12)',
      borderColor: 'rgba(16, 185, 129, 0.4)',
      textColor: '#34d399',
      tipoLabel: 'Efectivo',
    }
  }

  const customColor = c.color || '#3b82f6'
  return {
    icon: c.tipo === 'BANCO' ? '🏛️' : c.tipo === 'EFECTIVO' ? '💵' : '📱',
    color: customColor,
    bgGlow: `${customColor}18`,
    borderColor: `${customColor}45`,
    textColor: customColor,
    tipoLabel: c.tipo === 'BANCO' ? 'Cuenta Bancaria' : c.tipo === 'EFECTIVO' ? 'Efectivo' : 'Billetera Digital',
  }
}

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

  // Totales por categoría
  const statsCuentas = useMemo(() => {
    let enBancos = 0
    let enBilleteras = 0
    let enEfectivo = 0
    let enFondoHermano = 0

    state.cuentas.forEach((c) => {
      const nombreL = (c.nombre || '').toLowerCase()
      if (c.id === 'cuenta-hermano' || nombreL.includes('hermano')) {
        enFondoHermano += c.saldo
      } else if (c.tipo === 'BANCO') {
        enBancos += c.saldo
      } else if (c.tipo === 'EFECTIVO' || nombreL.includes('efectivo')) {
        enEfectivo += c.saldo
      } else {
        enBilleteras += c.saldo
      }
    })

    return { enBancos, enBilleteras, enEfectivo, enFondoHermano }
  }, [state.cuentas])

  function handleOpenNuevaCuenta() {
    setEditingCuentaId(null)
    setNombre('')
    setTipo('BANCO')
    setSaldo('')
    setNumero('')
    setColor('#3b82f6')
    setModalCuentaOpen(true)
  }

  function handleOpenEditarCuenta(c: CuentaFinanciera) {
    setEditingCuentaId(c.id)
    setNombre(c.nombre)
    setTipo(c.tipo)
    setSaldo(String(c.saldo))
    setNumero(c.numero || '')
    setColor(c.color || '#3b82f6')
    setModalCuentaOpen(true)
  }

  function handleOpenTransferenciaConOrigen(origenCuentaId: string) {
    setOrigenId(origenCuentaId)
    const otro = state.cuentas.find((c) => c.id !== origenCuentaId)
    if (otro) setDestinoId(otro.id)
    setMontoTransf('')
    setDescTransf('')
    setFechaTransf(new Date().toISOString().slice(0, 10))
    setModalTransferenciaOpen(true)
  }

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
          <p>Control centralizado de fondos, saldos disponibles y transferencias entre cuentas y bolsillos.</p>
        </div>

        <div className="page-header-actions" style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
          <button
            type="button"
            className="btn secondary"
            onClick={() => {
              if (state.cuentas.length >= 2) {
                setOrigenId(state.cuentas[0].id)
                setDestinoId(state.cuentas[1].id)
              }
              setModalTransferenciaOpen(true)
            }}
          >
            ⇄ Transferir Fondos
          </button>
          <button
            type="button"
            className="btn primary"
            onClick={handleOpenNuevaCuenta}
          >
            + Nueva Cuenta
          </button>
        </div>
      </div>

      {/* KPI Principal con Desglose Simétrico */}
      <div
        className="panel"
        style={{
          background: 'linear-gradient(135deg, var(--color-surface) 0%, var(--color-bg-alt) 100%)',
          border: '1px solid var(--color-border)',
          borderRadius: 'var(--radius-lg)',
          padding: '1.5rem',
          marginBottom: '1.5rem',
          boxShadow: 'var(--shadow-sm)',
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1.25rem' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.35rem' }}>
              <span style={{ fontSize: '0.8rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--color-text-muted)' }}>
                Liquidez Total Disponible
              </span>
              <span className="badge income" style={{ fontSize: '0.7rem' }}>
                Activos Líquidos
              </span>
            </div>
            <div
              style={{
                fontSize: '2.2rem',
                fontWeight: 800,
                fontFamily: 'var(--font-mono)',
                color: 'var(--color-income)',
                lineHeight: 1.1,
              }}
            >
              {formatMoney(saldoLiquidezTotal)}
            </div>
            <span style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)', display: 'block', marginTop: '0.25rem' }}>
              Suma de saldos en tus {state.cuentas.length} cuentas y bolsillos
            </span>
          </div>

          {/* Mini Pills de Resumen */}
          <div style={{ display: 'flex', gap: '0.6rem', flexWrap: 'wrap' }}>
            <div
              style={{
                padding: '0.6rem 0.95rem',
                backgroundColor: 'rgba(245, 158, 11, 0.1)',
                border: '1px solid rgba(245, 158, 11, 0.25)',
                borderRadius: 'var(--radius-md)',
                minWidth: '125px',
              }}
            >
              <span style={{ display: 'block', fontSize: '0.7rem', color: 'var(--color-text-muted)', fontWeight: 600 }}>
                🏦 En Bancos
              </span>
              <strong style={{ fontSize: '1rem', fontFamily: 'var(--font-mono)', color: '#fbbf24' }}>
                {formatMoney(statsCuentas.enBancos)}
              </strong>
            </div>

            <div
              style={{
                padding: '0.6rem 0.95rem',
                backgroundColor: 'rgba(147, 51, 234, 0.1)',
                border: '1px solid rgba(147, 51, 234, 0.25)',
                borderRadius: 'var(--radius-md)',
                minWidth: '125px',
              }}
            >
              <span style={{ display: 'block', fontSize: '0.7rem', color: 'var(--color-text-muted)', fontWeight: 600 }}>
                📱 En Billeteras / Nu
              </span>
              <strong style={{ fontSize: '1rem', fontFamily: 'var(--font-mono)', color: '#c084fc' }}>
                {formatMoney(statsCuentas.enBilleteras)}
              </strong>
            </div>

            <div
              style={{
                padding: '0.6rem 0.95rem',
                backgroundColor: 'rgba(16, 185, 129, 0.1)',
                border: '1px solid rgba(16, 185, 129, 0.25)',
                borderRadius: 'var(--radius-md)',
                minWidth: '125px',
              }}
            >
              <span style={{ display: 'block', fontSize: '0.7rem', color: 'var(--color-text-muted)', fontWeight: 600 }}>
                💵 En Efectivo
              </span>
              <strong style={{ fontSize: '1rem', fontFamily: 'var(--font-mono)', color: '#34d399' }}>
                {formatMoney(statsCuentas.enEfectivo)}
              </strong>
            </div>

            <div
              style={{
                padding: '0.6rem 0.95rem',
                backgroundColor: 'rgba(6, 182, 212, 0.1)',
                border: '1px solid rgba(6, 182, 212, 0.25)',
                borderRadius: 'var(--radius-md)',
                minWidth: '125px',
              }}
            >
              <span style={{ display: 'block', fontSize: '0.7rem', color: 'var(--color-text-muted)', fontWeight: 600 }}>
                👦 Fondo Hermano
              </span>
              <strong style={{ fontSize: '1rem', fontFamily: 'var(--font-mono)', color: '#22d3ee' }}>
                {formatMoney(statsCuentas.enFondoHermano)}
              </strong>
            </div>
          </div>
        </div>
      </div>

      {/* Grid de Cuentas Financieras con Simetría Perfecta */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
          gap: '1.25rem',
          marginBottom: '2rem',
          alignItems: 'stretch',
        }}
      >
        {state.cuentas.map((c) => {
          const visual = getAccountVisualInfo(c)
          const pctTotal = saldoLiquidezTotal > 0 ? Math.round((Math.max(0, c.saldo) / saldoLiquidezTotal) * 100) : 0
          const subtitulo = c.numero || (c.tipo === 'EFECTIVO' ? 'Efectivo en mano' : c.id === 'cuenta-hermano' ? 'Bolsillo almuerzos' : 'Cuenta activa')

          return (
            <article
              key={c.id}
              className="panel"
              style={{
                background: `radial-gradient(circle at top left, ${visual.bgGlow}, transparent 70%), var(--color-surface)`,
                border: `1.5px solid ${visual.borderColor}`,
                borderRadius: 'var(--radius-lg)',
                padding: '1.35rem 1.25rem 1.15rem',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
                boxShadow: 'var(--shadow-sm)',
                transition: 'transform var(--transition-fast), box-shadow var(--transition-fast)',
                position: 'relative',
                overflow: 'hidden',
                minHeight: '275px',
              }}
            >
              {/* Barra superior de acento */}
              <div
                style={{
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  right: 0,
                  height: '4px',
                  backgroundColor: visual.color,
                }}
              />

              {/* Contenedor Superior (Fila 1: Icono + Badge / Fila 2: Título y Subtítulo) */}
              <div>
                {/* Fila 1: Icono Avatar a la izquierda + Badge a la derecha */}
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    marginBottom: '0.85rem',
                  }}
                >
                  <div
                    style={{
                      width: '44px',
                      height: '44px',
                      borderRadius: '12px',
                      backgroundColor: visual.bgGlow,
                      border: `1px solid ${visual.borderColor}`,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: '1.45rem',
                      boxShadow: `0 0 12px ${visual.bgGlow}`,
                    }}
                  >
                    {visual.icon}
                  </div>

                  <span
                    style={{
                      fontSize: '0.725rem',
                      fontWeight: 700,
                      padding: '0.25rem 0.65rem',
                      borderRadius: 'var(--radius-pill)',
                      backgroundColor: visual.bgGlow,
                      border: `1px solid ${visual.borderColor}`,
                      color: visual.textColor,
                      whiteSpace: 'nowrap',
                      letterSpacing: '0.02em',
                    }}
                  >
                    {visual.tipoLabel}
                  </span>
                </div>

                {/* Fila 2: Nombre de la Cuenta (Ancho completo, nunca cortado) + Subtítulo con altura uniforme */}
                <div style={{ marginBottom: '1rem' }}>
                  <strong
                    style={{
                      fontSize: '1.15rem',
                      color: 'var(--color-text-main)',
                      display: 'block',
                      lineHeight: 1.25,
                      fontWeight: 700,
                      whiteSpace: 'nowrap',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                    }}
                    title={c.nombre}
                  >
                    {c.nombre}
                  </strong>
                  <span
                    style={{
                      fontSize: '0.78rem',
                      color: 'var(--color-text-muted)',
                      display: 'block',
                      marginTop: '2px',
                      whiteSpace: 'nowrap',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                    }}
                  >
                    {subtitulo}
                  </span>
                </div>

                {/* Fila 3: Saldo Central Disponible */}
                <div>
                  <span style={{ fontSize: '0.72rem', color: 'var(--color-text-muted)', display: 'block', textTransform: 'uppercase', letterSpacing: '0.04em', fontWeight: 600 }}>
                    Saldo Disponible
                  </span>
                  <div
                    style={{
                      fontSize: '1.9rem',
                      fontWeight: 800,
                      fontFamily: 'var(--font-mono)',
                      color: c.saldo > 0 ? 'var(--color-text-main)' : 'var(--color-text-muted)',
                      letterSpacing: '-0.02em',
                      lineHeight: 1.15,
                      marginTop: '2px',
                    }}
                  >
                    {formatMoney(c.saldo)}
                  </div>
                </div>

                {/* Fila 4: Barra de Participación en Liquidez */}
                <div style={{ marginTop: '0.85rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.725rem', color: 'var(--color-text-muted)', marginBottom: '4px' }}>
                    <span>Participación en liquidez</span>
                    <strong style={{ color: visual.textColor }}>{pctTotal}%</strong>
                  </div>
                  <div style={{ width: '100%', height: '6px', backgroundColor: 'var(--color-bg-alt)', borderRadius: '999px', overflow: 'hidden' }}>
                    <div
                      style={{
                        width: `${pctTotal}%`,
                        height: '100%',
                        backgroundColor: visual.color,
                        borderRadius: '999px',
                      }}
                    />
                  </div>
                </div>
              </div>

              {/* Botones de Acción (Alineados perfectamente al pie) */}
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: '0.5rem',
                  marginTop: '1.25rem',
                  paddingTop: '0.85rem',
                  borderTop: '1px solid var(--color-border)',
                }}
              >
                <div style={{ display: 'flex', gap: '0.45rem', alignItems: 'center' }}>
                  <button
                    type="button"
                    className="btn secondary sm"
                    onClick={() => handleOpenEditarCuenta(c)}
                    title="Modificar saldo o nombre de esta cuenta"
                    style={{ fontSize: '0.78rem', padding: '0.35rem 0.65rem' }}
                  >
                    ✏️ Editar Saldo
                  </button>
                  <button
                    type="button"
                    className="btn ghost sm"
                    onClick={() => handleOpenTransferenciaConOrigen(c.id)}
                    title="Mover dinero desde esta cuenta hacia otra"
                    style={{ fontSize: '0.78rem', padding: '0.35rem 0.65rem' }}
                  >
                    ⇄ Transferir
                  </button>
                </div>

                <button
                  type="button"
                  className="btn ghost sm icon-only"
                  style={{ color: 'var(--color-expense)' }}
                  onClick={() => {
                    if (confirm(`¿Eliminar la cuenta "${c.nombre}"?`)) {
                      deleteCuenta(c.id)
                    }
                  }}
                  title="Eliminar cuenta"
                  aria-label="Eliminar cuenta"
                >
                  ✕
                </button>
              </div>
            </article>
          )
        })}
      </div>

      {/* Historial de Transferencias entre Cuentas */}
      <div className="panel">
        <div className="panel-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.75rem' }}>
          <div>
            <h2 className="panel-title">
              Historial de Transferencias entre Cuentas
            </h2>
            <span style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)' }}>
              Registro de movimientos de dinero entre tus bancos, billeteras y efectivo.
            </span>
          </div>
          <button type="button" className="btn secondary sm" onClick={() => setModalTransferenciaOpen(true)}>
            + Nueva Transferencia
          </button>
        </div>

        <div className="table-container">
          <table className="table-wide">
            <thead>
              <tr>
                <th>Fecha</th>
                <th>Cuenta Origen</th>
                <th style={{ textAlign: 'center', width: '40px' }}></th>
                <th>Cuenta Destino</th>
                <th>Concepto / Motivo</th>
                <th style={{ textAlign: 'right' }}>Monto Transferido</th>
              </tr>
            </thead>
            <tbody>
              {(state.transferencias || []).map((t) => {
                const origen = state.cuentas.find((c) => c.id === t.cuentaOrigenId)
                const destino = state.cuentas.find((c) => c.id === t.cuentaDestinoId)
                const visualOrigen = origen ? getAccountVisualInfo(origen) : null
                const visualDestino = destino ? getAccountVisualInfo(destino) : null

                return (
                  <tr key={t.id}>
                    <td style={{ fontSize: '0.825rem', color: 'var(--color-text-muted)', whiteSpace: 'nowrap' }}>
                      {formatDate(t.fecha)}
                    </td>
                    <td>
                      <span
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '0.35rem',
                          padding: '0.25rem 0.6rem',
                          borderRadius: 'var(--radius-pill)',
                          fontSize: '0.78rem',
                          fontWeight: 600,
                          backgroundColor: visualOrigen?.bgGlow || 'var(--color-bg-alt)',
                          border: `1px solid ${visualOrigen?.borderColor || 'var(--color-border)'}`,
                          color: visualOrigen?.textColor || 'var(--color-text-main)',
                        }}
                      >
                        <span>{visualOrigen?.icon || '🏛️'}</span>
                        <span>{origen?.nombre || 'Cuenta Origen'}</span>
                      </span>
                    </td>
                    <td style={{ textAlign: 'center', color: 'var(--color-text-muted)', fontWeight: 700 }}>
                      ➔
                    </td>
                    <td>
                      <span
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '0.35rem',
                          padding: '0.25rem 0.6rem',
                          borderRadius: 'var(--radius-pill)',
                          fontSize: '0.78rem',
                          fontWeight: 600,
                          backgroundColor: visualDestino?.bgGlow || 'var(--color-bg-alt)',
                          border: `1px solid ${visualDestino?.borderColor || 'var(--color-border)'}`,
                          color: visualDestino?.textColor || 'var(--color-text-main)',
                        }}
                      >
                        <span>{visualDestino?.icon || '🏛️'}</span>
                        <span>{destino?.nombre || 'Cuenta Destino'}</span>
                      </span>
                    </td>
                    <td style={{ color: 'var(--color-text-main)' }}>
                      {t.descripcion || 'Transferencia entre cuentas'}
                    </td>
                    <td style={{ textAlign: 'right', fontFamily: 'var(--font-mono)', fontWeight: 700, color: 'var(--color-income)' }}>
                      {formatMoney(t.monto)}
                    </td>
                  </tr>
                )
              })}
              {(!state.transferencias || state.transferencias.length === 0) && (
                <tr>
                  <td colSpan={6} style={{ textAlign: 'center', padding: '3rem 1.5rem', color: 'var(--color-text-muted)' }}>
                    <div style={{ fontSize: '2.5rem', marginBottom: '0.5rem' }}>⇄</div>
                    <p style={{ fontSize: '1rem', fontWeight: 600, color: 'var(--color-text-main)', marginBottom: '0.25rem' }}>
                      No hay transferencias registradas entre cuentas.
                    </p>
                    <span style={{ fontSize: '0.8rem' }}>
                      Usa el botón "+ Nueva Transferencia" para mover fondos de Bancolombia a Nequi, Daviplata o Efectivo.
                    </span>
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
        title={editingCuentaId ? '✏️ Editar Cuenta Financiera' : '🏛️ Agregar Cuenta Financiera'}
      >
        <form onSubmit={handleSaveCuenta} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <div className="form-group">
            <label>Nombre de la Cuenta *</label>
            <input
              type="text"
              className="form-input"
              placeholder="Ej: Bancolombia Ahorros, Nequi, Daviplata, Fondo Hermano"
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
                <option value="BILLETERA_DIGITAL">📱 Billetera Digital (Nequi / Daviplata / Nu)</option>
                <option value="EFECTIVO">💵 Efectivo Físico / Billetera</option>
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
                placeholder="Ej: •••• 4589 o Bolsillo para Almuerzos"
                value={numero}
                onChange={(e) => setNumero(e.target.value)}
              />
            </div>

            <div className="form-group">
              <label>Color Identificador</label>
              <input
                type="color"
                className="form-input"
                style={{ height: '42px', padding: '2px', cursor: 'pointer' }}
                value={color}
                onChange={(e) => setColor(e.target.value)}
              />
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
              placeholder="Ej: Retiro a efectivo, Pasar a Nequi para comida, Recargar Fondo Hermano"
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
