import { useState, useMemo, type FormEvent } from 'react'
import { Link } from 'react-router-dom'
import { useFinance } from '../context/FinanceContext'
import {
  calcularSaludFinanciera,
  calcularDistribucion50_30_20,
  generarConsejosFinancieros,
  responderPreguntaAsesor,
} from '../utils/financialAdvisor'
import { formatMoney, formatMonthYear } from '../utils/formatters'
import { calcularCuotaMensual } from '../utils/financialCalculations'

interface MensajeChat {
  id: string
  emisor: 'usuario' | 'asesor'
  texto: string
  fecha: string
}

export function AsesorPage() {
  const { state, selectedMonth } = useFinance()

  const [activeTab, setActiveTab] = useState<'DIAGNOSTICO' | 'CONSEJOS' | 'CHAT' | 'SIMULADOR'>('DIAGNOSTICO')

  // Chat State
  const [mensajes, setMensajes] = useState<MensajeChat[]>([
    {
      id: 'init-1',
      emisor: 'asesor',
      texto: `¡Hola! Soy tu **Asesor Financiero Personal**. He analizado tus números de **${formatMonthYear(selectedMonth)}**.\n\nPuedes preguntarme sobre tu presupuesto para el fin de semana, cómo distribuir tu nómina o qué tarjeta de crédito te conviene pagar primero para ahorrar intereses.`,
      fecha: new Date().toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' }),
    },
  ])
  const [inputChat, setInputChat] = useState('')

  // Simulador State
  const [simMontoCompra, setSimMontoCompra] = useState('1200000')
  const [simCuotas, setSimCuotas] = useState('6')
  const [simTasa, setSimTasa] = useState('2.1')

  const [simAbonoDeuda, setSimAbonoDeuda] = useState('300000')
  const [simAhorroGasto, setSimAhorroGasto] = useState('150000')

  // Cálculos reactivos
  const salud = useMemo(() => calcularSaludFinanciera(state, selectedMonth), [state, selectedMonth])
  const regla = useMemo(() => calcularDistribucion50_30_20(state, selectedMonth), [state, selectedMonth])
  const consejos = useMemo(() => generarConsejosFinancieros(state, selectedMonth), [state, selectedMonth])

  // Cálculo de simulación de compra
  const cuotaSimulada = useMemo(() => {
    const m = Number(simMontoCompra) || 0
    const c = Math.max(1, Number(simCuotas) || 1)
    const t = Number(simTasa) || 0
    return calcularCuotaMensual(m, c, t)
  }, [simMontoCompra, simCuotas, simTasa])

  function handleEnviarPregunta(textoPregunta?: string) {
    const query = (textoPregunta || inputChat).trim()
    if (!query) return

    const idUsuario = `msg-${Date.now()}`
    const idAsesor = `msg-resp-${Date.now()}`
    const horaActual = new Date().toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' })

    const respuestaTexto = responderPreguntaAsesor(query, state, selectedMonth)

    setMensajes((prev) => [
      ...prev,
      { id: idUsuario, emisor: 'usuario', texto: query, fecha: horaActual },
      { id: idAsesor, emisor: 'asesor', texto: respuestaTexto, fecha: horaActual },
    ])

    setInputChat('')
  }

  function handleFormChatSubmit(e: FormEvent) {
    e.preventDefault()
    handleEnviarPregunta()
  }

  return (
    <div className="page">
      {/* Header */}
      <div className="page-header">
        <div className="page-header-info">
          <h1>
            <svg viewBox="0 0 24 24" width="28" height="28" fill="none" stroke="currentColor" strokeWidth="2.2">
              <path d="M12 2a4 4 0 0 1 4 4v2a4 4 0 0 1-8 0V6a4 4 0 0 1 4-4z" />
              <rect x="3" y="10" width="18" height="12" rx="4" />
              <circle cx="9" cy="15" r="1.5" />
              <circle cx="15" cy="15" r="1.5" />
              <line x1="9" y1="19" x2="15" y2="19" />
            </svg>
            Asesor Financiero & Diagnóstico Inteligente
          </h1>
          <p>
            Análisis algorítmico de finanzas personales, regla 50/30/20, optimización de deudas y chat inteligente para{' '}
            <strong>{formatMonthYear(selectedMonth)}</strong>.
          </p>
        </div>
      </div>

      {/* Hero Card: Score de Salud Financiera */}
      <div
        className="panel"
        style={{
          background: `linear-gradient(135deg, var(--color-surface) 0%, var(--color-bg-alt) 100%)`,
          borderLeft: `6px solid ${salud.color}`,
          padding: '1.5rem',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1.25rem' }}>
          {/* Lado izquierdo: Score visual */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '1.25rem' }}>
            <div
              style={{
                width: '88px',
                height: '88px',
                borderRadius: '50%',
                background: `conic-gradient(${salud.color} ${salud.scoreTotal * 3.6}deg, var(--color-border) 0deg)`,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
                boxShadow: `0 0 20px ${salud.color}33`,
              }}
            >
              <div
                style={{
                  width: '72px',
                  height: '72px',
                  borderRadius: '50%',
                  backgroundColor: 'var(--color-surface)',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <span style={{ fontFamily: 'var(--font-display)', fontSize: '1.65rem', fontWeight: 800, color: salud.color, lineHeight: 1 }}>
                  {salud.scoreTotal}
                </span>
                <span style={{ fontSize: '0.65rem', color: 'var(--color-text-muted)', fontWeight: 600 }}>/ 100</span>
              </div>
            </div>

            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <span className="badge" style={{ backgroundColor: `${salud.color}22`, color: salud.color, border: `1px solid ${salud.color}44`, fontSize: '0.85rem' }}>
                  Nivel {salud.nivel}
                </span>
                <span style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)' }}>Índice de Salud Financiera</span>
              </div>
              <p style={{ marginTop: '0.35rem', fontSize: '0.925rem', color: 'var(--color-text-main)', maxWidth: '540px', lineHeight: 1.45 }}>
                {salud.resumen}
              </p>
            </div>
          </div>

          {/* Lado derecho: Acceso directo a chat */}
          <button
            type="button"
            className="btn primary"
            onClick={() => setActiveTab('CHAT')}
            style={{ padding: '0.65rem 1.2rem', gap: '0.5rem' }}
          >
            💬 Consultar al Asesor
          </button>
        </div>

        {/* 4 Pilares Desglosados */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '0.75rem', marginTop: '1.25rem', paddingTop: '1.25rem', borderTop: '1px solid var(--color-border)' }}>
          {Object.entries(salud.subscores).map(([key, sub]) => {
            let badgeColor = 'var(--color-income)'
            if (sub.estado === 'bueno') badgeColor = 'var(--color-primary-light)'
            if (sub.estado === 'alerta') badgeColor = 'var(--color-warning)'
            if (sub.estado === 'critico') badgeColor = 'var(--color-expense)'

            return (
              <div
                key={key}
                style={{
                  background: 'var(--color-surface)',
                  border: '1px solid var(--color-border)',
                  borderRadius: 'var(--radius-md)',
                  padding: '0.75rem 0.9rem',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '0.35rem',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <strong style={{ fontSize: '0.8rem', color: 'var(--color-text-main)' }}>{sub.titulo}</strong>
                  <span style={{ fontSize: '0.75rem', fontWeight: 700, color: badgeColor }}>
                    {sub.puntos}/{sub.maxPuntos} pts
                  </span>
                </div>
                <div style={{ width: '100%', height: '4px', backgroundColor: 'var(--color-bg-alt)', borderRadius: '999px', overflow: 'hidden' }}>
                  <div style={{ width: `${(sub.puntos / sub.maxPuntos) * 100}%`, height: '100%', backgroundColor: badgeColor }} />
                </div>
                <span style={{ fontSize: '0.725rem', color: 'var(--color-text-muted)', lineHeight: 1.3, marginTop: '2px' }}>
                  {sub.descripcion}
                </span>
              </div>
            )
          })}
        </div>
      </div>

      {/* Tabs */}
      <div className="tabs-nav">
        <button
          type="button"
          className={`tab-btn ${activeTab === 'DIAGNOSTICO' ? 'active' : ''}`}
          onClick={() => setActiveTab('DIAGNOSTICO')}
        >
          📊 Regla 50/30/20 & Diagnóstico
        </button>
        <button
          type="button"
          className={`tab-btn ${activeTab === 'CONSEJOS' ? 'active' : ''}`}
          onClick={() => setActiveTab('CONSEJOS')}
        >
          💡 Consejos & Estrategia ({consejos.length})
        </button>
        <button
          type="button"
          className={`tab-btn ${activeTab === 'CHAT' ? 'active' : ''}`}
          onClick={() => setActiveTab('CHAT')}
        >
          💬 Chat Asesor Inteligente
        </button>
        <button
          type="button"
          className={`tab-btn ${activeTab === 'SIMULADOR' ? 'active' : ''}`}
          onClick={() => setActiveTab('SIMULADOR')}
        >
          🎯 Simulador de Decisiones
        </button>
      </div>

      {/* TAB 1: REGLA 50/30/20 Y DIAGNÓSTICO */}
      {activeTab === 'DIAGNOSTICO' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          {/* Tarjetas 50/30/20 */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1.15rem' }}>
            {/* 50% Necesidades */}
            <article className="stat-card" style={{ borderLeft: `5px solid ${regla.necesidades.estado === 'ok' ? '#10b981' : '#f43f5e'}` }}>
              <div className="stat-card-top">
                <span className="stat-card-title">🏠 Necesidades Básicas (Meta 50%)</span>
                <span className={`badge ${regla.necesidades.estado === 'ok' ? 'income' : 'expense'}`}>
                  {regla.necesidades.porcentaje}% del ingreso
                </span>
              </div>
              <div className="stat-value">{formatMoney(regla.necesidades.monto)}</div>
              <div style={{ width: '100%', height: '6px', backgroundColor: 'var(--color-bg-alt)', borderRadius: '999px', overflow: 'hidden' }}>
                <div
                  style={{
                    width: `${Math.min(100, regla.necesidades.porcentaje)}%`,
                    height: '100%',
                    backgroundColor: regla.necesidades.porcentaje <= 50 ? '#10b981' : '#f43f5e',
                  }}
                />
              </div>
              <span className="stat-subtext">
                Límite ideal: <strong>{formatMoney(regla.necesidades.metaMonto)}</strong>. {regla.necesidades.diferencia <= 0 ? '✓ Estás dentro del rango ideal.' : `⚠️ Excedido por ${formatMoney(regla.necesidades.diferencia)}.`}
              </span>
              <span style={{ fontSize: '0.725rem', color: 'var(--color-text-muted)', marginTop: '2px' }}>
                Incluye: Arriendo, servicios públicos, compras de aseo y mercado general.
              </span>
            </article>

            {/* 30% Deseos y Ocio */}
            <article className="stat-card" style={{ borderLeft: `5px solid ${regla.deseos.estado === 'ok' ? '#3b82f6' : '#f59e0b'}` }}>
              <div className="stat-card-top">
                <span className="stat-card-title">🎉 Deseos, Salidas & Ocio (Meta 30%)</span>
                <span className={`badge ${regla.deseos.estado === 'ok' ? 'primary' : 'warning'}`}>
                  {regla.deseos.porcentaje}% del ingreso
                </span>
              </div>
              <div className="stat-value">{formatMoney(regla.deseos.monto)}</div>
              <div style={{ width: '100%', height: '6px', backgroundColor: 'var(--color-bg-alt)', borderRadius: '999px', overflow: 'hidden' }}>
                <div
                  style={{
                    width: `${Math.min(100, (regla.deseos.porcentaje / 30) * 100)}%`,
                    height: '100%',
                    backgroundColor: regla.deseos.porcentaje <= 30 ? '#3b82f6' : '#f59e0b',
                  }}
                />
              </div>
              <span className="stat-subtext">
                Límite ideal: <strong>{formatMoney(regla.deseos.metaMonto)}</strong>. {regla.deseos.diferencia <= 0 ? '✓ Nivel de disfrute controlado.' : `⚠️ Te pasaste por ${formatMoney(regla.deseos.diferencia)}.`}
              </span>
              <span style={{ fontSize: '0.725rem', color: 'var(--color-text-muted)', marginTop: '2px' }}>
                Incluye: Restaurantes, partidos, celular, regalos y suscripciones.
              </span>
            </article>

            {/* 20% Ahorro y Deudas */}
            <article className="stat-card" style={{ borderLeft: `5px solid ${regla.ahorroDeuda.estado === 'ok' ? '#10b981' : '#f43f5e'}` }}>
              <div className="stat-card-top">
                <span className="stat-card-title">💰 Ahorro & Deuda (Meta 20%)</span>
                <span className={`badge ${regla.ahorroDeuda.estado === 'ok' ? 'income' : 'expense'}`}>
                  {regla.ahorroDeuda.porcentaje}% del ingreso
                </span>
              </div>
              <div className="stat-value">{formatMoney(regla.ahorroDeuda.monto)}</div>
              <div style={{ width: '100%', height: '6px', backgroundColor: 'var(--color-bg-alt)', borderRadius: '999px', overflow: 'hidden' }}>
                <div
                  style={{
                    width: `${Math.min(100, (regla.ahorroDeuda.porcentaje / 20) * 100)}%`,
                    height: '100%',
                    backgroundColor: regla.ahorroDeuda.porcentaje >= 20 ? '#10b981' : '#f43f5e',
                  }}
                />
              </div>
              <span className="stat-subtext">
                Meta ideal: <strong>{formatMoney(regla.ahorroDeuda.metaMonto)}</strong>. {regla.ahorroDeuda.porcentaje >= 20 ? '✓ Excelente capacidad de capitalización.' : `⚠️ Faltan ${formatMoney(Math.abs(regla.ahorroDeuda.diferencia))} para la meta.`}
              </span>
              <span style={{ fontSize: '0.725rem', color: 'var(--color-text-muted)', marginTop: '2px' }}>
                Incluye: Saldo neto para ahorro/inversión y cuotas de tarjetas.
              </span>
            </article>
          </div>

          {/* Explicación de la Regla 50/30/20 */}
          <div className="panel">
            <div className="panel-header">
              <h2 className="panel-title">📚 ¿Por qué es importante la Regla 50/30/20?</h2>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '1rem', fontSize: '0.875rem', lineHeight: 1.5, color: 'var(--color-text-muted)' }}>
              <div>
                <strong style={{ color: 'var(--color-text-main)', display: 'block', marginBottom: '0.25rem' }}>
                  1. Protege tu tranquilidad básica (50%)
                </strong>
                Mantener los gastos fijos por debajo de la mitad de tus ingresos te asegura que, ante cualquier reducción salarial, no perderás tu vivienda ni servicios esenciales.
              </div>
              <div>
                <strong style={{ color: 'var(--color-text-main)', display: 'block', marginBottom: '0.25rem' }}>
                  2. Disfrutas sin culpa (30%)
                </strong>
                Tener un presupuesto específico para restaurantes y ocio evita la frustración de sentir que solo trabajas para pagar cuentas.
              </div>
              <div>
                <strong style={{ color: 'var(--color-text-main)', display: 'block', marginBottom: '0.25rem' }}>
                  3. Creas riqueza a futuro (20%)
                </strong>
                Destinar mínimo una quinta parte de tus ingresos a ahorro o pago acelerado de deudas te permite construir un fondo de emergencia sólido y patrimonio.
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: CONSEJOS Y PLAN DE ACCIÓN */}
      {activeTab === 'CONSEJOS' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {consejos.map((c) => {
            let borderColor = 'var(--color-primary-light)'
            let badgeVariant = 'primary'
            let iconEmoji = '💡'

            if (c.tipo === 'CRITICAL') {
              borderColor = 'var(--color-expense)'
              badgeVariant = 'expense'
              iconEmoji = '🚨'
            } else if (c.tipo === 'WARNING') {
              borderColor = 'var(--color-warning)'
              badgeVariant = 'warning'
              iconEmoji = '⚠️'
            } else if (c.tipo === 'SUCCESS') {
              borderColor = 'var(--color-income)'
              badgeVariant = 'income'
              iconEmoji = '🌟'
            }

            return (
              <div
                key={c.id}
                className="panel"
                style={{
                  borderLeft: `5px solid ${borderColor}`,
                  padding: '1.15rem 1.25rem',
                  gap: '0.65rem',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.5rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                    <span style={{ fontSize: '1.3rem' }}>{iconEmoji}</span>
                    <strong style={{ fontSize: '1rem', color: 'var(--color-text-main)' }}>{c.titulo}</strong>
                  </div>
                  <span className={`badge ${badgeVariant}`} style={{ fontSize: '0.725rem' }}>
                    {c.categoria}
                  </span>
                </div>

                <p style={{ fontSize: '0.875rem', color: 'var(--color-text-muted)', lineHeight: 1.5 }}>
                  {c.mensaje}
                </p>

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.75rem', marginTop: '0.35rem', paddingTop: '0.65rem', borderTop: '1px solid var(--color-border)' }}>
                  {c.impactoEstimado && (
                    <span style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--color-income-text)' }}>
                      🎯 Impacto: {c.impactoEstimado}
                    </span>
                  )}
                  {c.rutaSugerida && (
                    <Link to={c.rutaSugerida} className="btn sm secondary" style={{ marginLeft: 'auto' }}>
                      {c.accionSugerida || 'Ver sección →'}
                    </Link>
                  )}
                </div>
              </div>
            )
          })}

          {consejos.length === 0 && (
            <div className="panel" style={{ textAlign: 'center', padding: '3rem 1rem' }}>
              <span style={{ fontSize: '2rem' }}>🎉</span>
              <h3 style={{ marginTop: '0.5rem', fontSize: '1.1rem' }}>¡Sin alertas críticas!</h3>
              <p style={{ color: 'var(--color-text-muted)', marginTop: '0.25rem' }}>
                Tus finanzas se encuentran en excelente equilibrio este mes. Sigue registrando tus movimientos diarios.
              </p>
            </div>
          )}
        </div>
      )}

      {/* TAB 3: CHAT ASESOR INTELIGENTE */}
      {activeTab === 'CHAT' && (
        <div className="panel" style={{ padding: 0, overflow: 'hidden' }}>
          {/* Header del Chat */}
          <div style={{ padding: '1rem 1.25rem', borderBottom: '1px solid var(--color-border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', backgroundColor: 'var(--color-bg-alt)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              <div
                style={{
                  width: '36px',
                  height: '36px',
                  borderRadius: '50%',
                  background: 'linear-gradient(135deg, #2563eb 0%, #3b82f6 100%)',
                  color: '#ffffff',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '1.1rem',
                }}
              >
                🤖
              </div>
              <div>
                <strong style={{ fontSize: '0.95rem', display: 'block' }}>Asesor Financiero Virtual</strong>
                <span style={{ fontSize: '0.725rem', color: '#10b981', fontWeight: 600 }}>● Conectado a tus datos en vivo</span>
              </div>
            </div>
          </div>

          {/* Área de Mensajes */}
          <div
            style={{
              padding: '1.25rem',
              display: 'flex',
              flexDirection: 'column',
              gap: '1rem',
              maxHeight: '440px',
              minHeight: '280px',
              overflowY: 'auto',
            }}
          >
            {mensajes.map((m) => (
              <div
                key={m.id}
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: m.emisor === 'usuario' ? 'flex-end' : 'flex-start',
                  gap: '0.25rem',
                }}
              >
                <div
                  style={{
                    maxWidth: '85%',
                    padding: '0.85rem 1.1rem',
                    borderRadius: varBorderRadius(m.emisor),
                    backgroundColor: m.emisor === 'usuario' ? 'var(--color-primary-light)' : 'var(--color-bg-alt)',
                    color: m.emisor === 'usuario' ? '#ffffff' : 'var(--color-text-main)',
                    fontSize: '0.875rem',
                    lineHeight: 1.5,
                    border: m.emisor === 'usuario' ? 'none' : '1px solid var(--color-border)',
                    whiteSpace: 'pre-line',
                  }}
                >
                  {m.texto}
                </div>
                <span style={{ fontSize: '0.68rem', color: 'var(--color-text-muted)', padding: '0 0.4rem' }}>
                  {m.fecha}
                </span>
              </div>
            ))}
          </div>

          {/* Botones de Preguntas Rápidas */}
          <div
            style={{
              padding: '0.65rem 1.25rem',
              borderTop: '1px solid var(--color-border)',
              display: 'flex',
              gap: '0.45rem',
              overflowX: 'auto',
              backgroundColor: 'var(--color-surface)',
            }}
          >
            <button
              type="button"
              className="btn secondary sm"
              style={{ fontSize: '0.75rem', whiteSpace: 'nowrap' }}
              onClick={() => handleEnviarPregunta('¿Cómo van los gastos de almuerzos, comidas con mi hermano y fines de semana?')}
            >
              🥗 Almuerzos & Hermano
            </button>
            <button
              type="button"
              className="btn secondary sm"
              style={{ fontSize: '0.75rem', whiteSpace: 'nowrap' }}
              onClick={() => handleEnviarPregunta('¿Cuánto puedo gastar este fin de semana sin afectar mis recibos?')}
            >
              🍹 Fin de semana
            </button>
            <button
              type="button"
              className="btn secondary sm"
              style={{ fontSize: '0.75rem', whiteSpace: 'nowrap' }}
              onClick={() => handleEnviarPregunta('¿Cuál de mis tarjetas debo pagar primero para ahorrar intereses?')}
            >
              💳 Pagar tarjetas
            </button>
            <button
              type="button"
              className="btn secondary sm"
              style={{ fontSize: '0.75rem', whiteSpace: 'nowrap' }}
              onClick={() => handleEnviarPregunta('¿Cómo debo distribuir el sueldo de mi nómina según la regla 50/30/20?')}
            >
              💼 Distribuir nómina
            </button>
            <button
              type="button"
              className="btn secondary sm"
              style={{ fontSize: '0.75rem', whiteSpace: 'nowrap' }}
              onClick={() => handleEnviarPregunta('¿Cómo está mi fondo de emergencia y ahorro?')}
            >
              📈 Fondo de emergencia
            </button>
          </div>

          {/* Formulario de Input */}
          <form onSubmit={handleFormChatSubmit} style={{ padding: '0.85rem 1.25rem', borderTop: '1px solid var(--color-border)', display: 'flex', gap: '0.65rem' }}>
            <input
              type="text"
              className="form-input"
              placeholder="Haz una pregunta financiera (Ej: ¿Me alcanza para comprar a cuotas?)"
              value={inputChat}
              onChange={(e) => setInputChat(e.target.value)}
              style={{ flex: 1 }}
            />
            <button type="submit" className="btn primary" disabled={!inputChat.trim()}>
              Enviar
            </button>
          </form>
        </div>
      )}

      {/* TAB 4: SIMULADOR DE DECISIONES */}
      {activeTab === 'SIMULADOR' && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '1.25rem' }}>
          {/* Simulador 1: Compra a Cuotas */}
          <div className="panel">
            <div className="panel-header">
              <h2 className="panel-title">💳 Simulador de Nueva Compra a Cuotas</h2>
            </div>
            <p style={{ fontSize: '0.825rem', color: 'var(--color-text-muted)' }}>
              Calcula cómo afectará una nueva compra diferida a tu flujo de caja mensual.
            </p>

            <div className="form-group">
              <label>Monto de la Compra ($ COP)</label>
              <input
                type="number"
                className="form-input"
                value={simMontoCompra}
                onChange={(e) => setSimMontoCompra(e.target.value)}
              />
            </div>

            <div className="form-grid">
              <div className="form-group">
                <label>Número de Cuotas</label>
                <input
                  type="number"
                  min="1"
                  max="48"
                  className="form-input"
                  value={simCuotas}
                  onChange={(e) => setSimCuotas(e.target.value)}
                />
              </div>
              <div className="form-group">
                <label>Tasa Interés Mensual % (M.V.)</label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  className="form-input"
                  value={simTasa}
                  onChange={(e) => setSimTasa(e.target.value)}
                />
              </div>
            </div>

            <div className="stat-card" style={{ padding: '1rem', backgroundColor: 'var(--color-bg-alt)', marginTop: '0.5rem' }}>
              <span className="stat-card-title">Cuota mensual estimada a pagar:</span>
              <div className="stat-value" style={{ color: 'var(--color-credit)', fontSize: '1.5rem' }}>
                {formatMoney(cuotaSimulada)} / mes
              </div>
              <span style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>
                Total a pagar al final de las {simCuotas} cuotas: <strong>{formatMoney(cuotaSimulada * (Number(simCuotas) || 1))}</strong>
              </span>
            </div>
          </div>

          {/* Simulador 2: Recorte de Gastos Hormiga */}
          <div className="panel">
            <div className="panel-header">
              <h2 className="panel-title">✂️ Impacto de Ahorro en Gastos Hormiga</h2>
            </div>
            <p style={{ fontSize: '0.825rem', color: 'var(--color-text-muted)' }}>
              Proyecta cuánto dinero extra acumularías si reduces gastos hormiga o salidas a comer.
            </p>

            <div className="form-group">
              <label>Ahorro Mensual que estás dispuesto a recortar ($ COP)</label>
              <input
                type="number"
                className="form-input"
                value={simAhorroGasto}
                onChange={(e) => setSimAhorroGasto(e.target.value)}
              />
            </div>

            <div className="stat-card" style={{ padding: '1rem', backgroundColor: 'var(--color-bg-alt)', marginTop: '0.5rem' }}>
              <span className="stat-card-title">Ahorro proyectado a 1 año:</span>
              <div className="stat-value" style={{ color: 'var(--color-income)', fontSize: '1.5rem' }}>
                + {formatMoney((Number(simAhorroGasto) || 0) * 12)}
              </div>
              <span style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>
                En 3 años con rentabilidad compuesta (~10% E.A.): <strong>+ {formatMoney(Math.round((Number(simAhorroGasto) || 0) * 42.5))}</strong>
              </span>
            </div>
          </div>

          {/* Simulador 3: Abono Extraordinario a Deuda */}
          <div className="panel">
            <div className="panel-header">
              <h2 className="panel-title">⚡ Abono Extraordinario a Tarjeta</h2>
            </div>
            <p style={{ fontSize: '0.825rem', color: 'var(--color-text-muted)' }}>
              Simula cómo un abono a capital reduce tu deuda total en tarjetas.
            </p>

            <div className="form-group">
              <label>Monto de Abono Extraordinario ($ COP)</label>
              <input
                type="number"
                className="form-input"
                value={simAbonoDeuda}
                onChange={(e) => setSimAbonoDeuda(e.target.value)}
              />
            </div>

            <div className="stat-card" style={{ padding: '1rem', backgroundColor: 'var(--color-bg-alt)', marginTop: '0.5rem' }}>
              <span className="stat-card-title">Reducción inmediata de deuda:</span>
              <div className="stat-value" style={{ color: 'var(--color-income-hover)', fontSize: '1.5rem' }}>
                - {formatMoney(Number(simAbonoDeuda) || 0)}
              </div>
              <span style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>
                Libera cupo disponible en tus tarjetas de inmediato y reduce el cobro de intereses del siguiente extracto.
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function varBorderRadius(emisor: 'usuario' | 'asesor') {
  return emisor === 'usuario' ? '16px 16px 2px 16px' : '16px 16px 16px 2px'
}
