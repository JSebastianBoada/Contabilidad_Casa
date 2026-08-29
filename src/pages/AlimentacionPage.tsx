import { useState, useMemo, type FormEvent } from 'react'
import { useFinance } from '../context/FinanceContext'
import { Modal } from '../components/Modal'
import { DonutChart } from '../components/Charts'
import { formatMoney, formatDate, formatMonthYear } from '../utils/formatters'
import type { TipoComida, BeneficiarioComida, OrigenComida } from '../types/finance'

export function AlimentacionPage() {
  const {
    state,
    selectedMonth,
    totalAlimentacionMes,
    addAlimentacion,
    deleteAlimentacion,
  } = useFinance()

  const [filterTipo, setFilterTipo] = useState<string>('TODOS')
  const [filterBeneficiario, setFilterBeneficiario] = useState<string>('TODOS')
  const [filterOrigen, setFilterOrigen] = useState<string>('TODOS')
  const [modalOpen, setModalOpen] = useState(false)

  // Form State
  const [tipoComida, setTipoComida] = useState<TipoComida>('ALMUERZO')
  const [beneficiario, setBeneficiario] = useState<BeneficiarioComida>('AMBOS')
  const [origenComida, setOrigenComida] = useState<OrigenComida>('RESTAURANTE_AFUERA')
  const [numeroPorciones, setNumeroPorciones] = useState(2)
  const [precioUnitario, setPrecioUnitario] = useState('9000')
  const [descripcion, setDescripcion] = useState('Almuerzo menú del día (Yo + Hermano)')
  const [lugar, setLugar] = useState('')
  const [monto, setMonto] = useState('18000')
  const [fecha, setFecha] = useState(new Date().toISOString().slice(0, 10))
  const [cuentaId, setCuentaId] = useState(state.cuentas[0]?.id || '')
  const [esFinDeSemana, setEsFinDeSemana] = useState(false)
  const [reembolsado, setReembolsado] = useState(false)

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

  // Desglose por Beneficiario (Yo vs Hermano vs Ambos)
  const totalSoloYo = useMemo(() => {
    return alimentacionMes
      .filter((a) => a.beneficiario === 'YO')
      .reduce((acc, a) => acc + a.monto, 0)
  }, [alimentacionMes])

  const totalSoloHermano = useMemo(() => {
    return alimentacionMes
      .filter((a) => a.beneficiario === 'HERMANO')
      .reduce((acc, a) => acc + a.monto, 0)
  }, [alimentacionMes])

  const totalAmbosCompartido = useMemo(() => {
    return alimentacionMes
      .filter((a) => a.beneficiario === 'AMBOS' || a.beneficiario === 'FAMILIA' || !a.beneficiario)
      .reduce((acc, a) => acc + a.monto, 0)
  }, [alimentacionMes])

  // Desglose Comprado Afuera vs Cocinado en Casa
  const totalCompradoAfuera = useMemo(() => {
    return alimentacionMes
      .filter((a) => a.origenComida === 'RESTAURANTE_AFUERA' || (!a.origenComida && a.tipoComida !== 'MERCADO_GENERAL'))
      .reduce((acc, a) => acc + a.monto, 0)
  }, [alimentacionMes])

  const totalCocinadoCasa = useMemo(() => {
    return alimentacionMes
      .filter((a) => a.origenComida === 'COCINADO_EN_CASA' || a.tipoComida === 'MERCADO_GENERAL')
      .reduce((acc, a) => acc + a.monto, 0)
  }, [alimentacionMes])

  // Donut chart
  const chartData = useMemo(() => {
    return [
      { label: 'Mercado General', value: totalMercado, color: '#3b82f6' },
      { label: 'Almuerzos', value: totalAlmuerzo, color: '#10b981' },
      { label: 'Desayunos', value: totalDesayuno, color: '#f59e0b' },
      { label: 'Cenas / Comida', value: totalCena, color: '#8b5cf6' },
    ]
  }, [totalMercado, totalAlmuerzo, totalDesayuno, totalCena])

  // Gastos filtrados para la tabla
  const itemsFiltrados = useMemo(() => {
    return alimentacionMes.filter((a) => {
      const matchTipo = filterTipo === 'TODOS' || a.tipoComida === filterTipo
      const matchBeneficiario =
        filterBeneficiario === 'TODOS' ||
        (filterBeneficiario === 'AMBOS' && (a.beneficiario === 'AMBOS' || !a.beneficiario)) ||
        a.beneficiario === filterBeneficiario
      const matchOrigen =
        filterOrigen === 'TODOS' ||
        (filterOrigen === 'RESTAURANTE_AFUERA' && (a.origenComida === 'RESTAURANTE_AFUERA' || (!a.origenComida && a.tipoComida !== 'MERCADO_GENERAL'))) ||
        (filterOrigen === 'COCINADO_EN_CASA' && (a.origenComida === 'COCINADO_EN_CASA' || a.tipoComida === 'MERCADO_GENERAL'))
      return matchTipo && matchBeneficiario && matchOrigen
    })
  }, [alimentacionMes, filterTipo, filterBeneficiario, filterOrigen])

  // Función para aplicar preset rápido en el formulario
  function aplicarPreset(tipo: TipoComida, ben: BeneficiarioComida, porciones: number, precioUnit: number, desc: string, origen: OrigenComida = 'RESTAURANTE_AFUERA') {
    setTipoComida(tipo)
    setBeneficiario(ben)
    setNumeroPorciones(porciones)
    setPrecioUnitario(String(precioUnit))
    setMonto(String(porciones * precioUnit))
    setDescripcion(desc)
    setOrigenComida(origen)
  }

  // Recalcular monto cuando cambia precio unitario o porciones
  function handlePrecioUnitarioChange(nuevoPrecio: string, nuevasPorciones: number = numeroPorciones) {
    setPrecioUnitario(nuevoPrecio)
    const p = Number(nuevoPrecio) || 0
    setMonto(String(p * nuevasPorciones))
  }

  function handlePorcionesChange(nuevasPorciones: number) {
    setNumeroPorciones(nuevasPorciones)
    const p = Number(precioUnitario) || 0
    setMonto(String(p * nuevasPorciones))
    if (nuevasPorciones === 1) {
      if (beneficiario === 'AMBOS') setBeneficiario('YO')
    } else if (nuevasPorciones >= 2) {
      setBeneficiario('AMBOS')
    }
  }

  // Registro rápido con 1 solo clic desde la cabecera
  function registroRapido(desc: string, tipo: TipoComida, ben: BeneficiarioComida, porciones: number, unit: number, origen: OrigenComida = 'RESTAURANTE_AFUERA') {
    addAlimentacion({
      fecha: new Date().toISOString().slice(0, 10),
      tipoComida: tipo,
      descripcion: desc,
      monto: porciones * unit,
      cuentaId: state.cuentas[0]?.id || '',
      beneficiario: ben,
      numeroPorciones: porciones,
      precioUnitario: unit,
      origenComida: origen,
      esFinDeSemana: false,
    })
  }

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
      beneficiario,
      numeroPorciones,
      precioUnitario: Number(precioUnitario) || undefined,
      origenComida,
      esFinDeSemana,
      reembolsado,
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
            Alimentación, Almuerzos & Comidas
          </h1>
          <p>
            Control de almuerzos diarios ($9.000 corrientazo / $14.000 ejecutivo), cuentas con tu hermano, mercado y cocina en fines de semana para{' '}
            <strong>{formatMonthYear(selectedMonth)}</strong>.
          </p>
        </div>

        <div className="page-header-actions">
          <div className="badge income" style={{ fontSize: '0.85rem', padding: '0.4rem 0.8rem' }}>
            Total Comida Mes: <strong>{formatMoney(totalAlimentacionMes)}</strong>
          </div>
          <button type="button" className="btn primary" onClick={() => setModalOpen(true)}>
            + Registrar Comida
          </button>
        </div>
      </div>

      {/* Botones de Registro Rápido en 1 Clic */}
      <div
        className="panel"
        style={{
          padding: '0.85rem 1.15rem',
          backgroundColor: 'var(--color-bg-alt)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '0.65rem',
        }}
      >
        <span style={{ fontSize: '0.825rem', fontWeight: 600, color: 'var(--color-text-main)' }}>
          ⚡ Registro Rápido de Almuerzos Hoy:
        </span>
        <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
          <button
            type="button"
            className="btn secondary sm"
            onClick={() => registroRapido('Almuerzo Corrientazo (Yo)', 'ALMUERZO', 'YO', 1, 9000)}
            title="Registrar 1 almuerzo de $9.000 para mí"
          >
            👤 1 Corrientazo ($9.000)
          </button>
          <button
            type="button"
            className="btn secondary sm"
            onClick={() => registroRapido('Almuerzo Ejecutivo (Yo)', 'ALMUERZO', 'YO', 1, 14000)}
            title="Registrar 1 almuerzo de $14.000 para mí"
          >
            👤 1 Ejecutivo ($14.000)
          </button>
          <button
            type="button"
            className="btn primary sm"
            onClick={() => registroRapido('2 Almuerzos Corrientazos (Yo + Hermano)', 'ALMUERZO', 'AMBOS', 2, 9000)}
            title="Registrar 2 almuerzos de $9.000 para mí y mi hermano"
          >
            👥 2 Corrientazos ($18.000)
          </button>
          <button
            type="button"
            className="btn primary sm"
            onClick={() => registroRapido('2 Almuerzos Ejecutivos (Yo + Hermano)', 'ALMUERZO', 'AMBOS', 2, 14000)}
            title="Registrar 2 almuerzos de $14.000 para mí y mi hermano"
          >
            👥 2 Ejecutivos ($28.000)
          </button>
        </div>
      </div>

      {/* Tarjetas de Desglose Especializado */}
      <div className="stat-grid">
        {/* Almuerzos */}
        <article className="stat-card" style={{ borderLeft: '4px solid #10b981' }}>
          <div className="stat-card-top">
            <span className="stat-card-title">🥗 Almuerzos del Mes</span>
            <span className="badge income">Diario</span>
          </div>
          <div className="stat-value">{formatMoney(totalAlmuerzo)}</div>
          <span className="stat-subtext">Menús del día ($9.000 / $14.000)</span>
        </article>

        {/* Cuentas con Hermano */}
        <article className="stat-card" style={{ borderLeft: '4px solid #8b5cf6' }}>
          <div className="stat-card-top">
            <span className="stat-card-title">👥 Para Ambos (Yo + Hermano)</span>
            <span className="badge credit">Compartido</span>
          </div>
          <div className="stat-value">{formatMoney(totalAmbosCompartido)}</div>
          <span className="stat-subtext">
            Solo Yo: <strong>{formatMoney(totalSoloYo)}</strong> | Hermano: <strong>{formatMoney(totalSoloHermano)}</strong>
          </span>
        </article>

        {/* Comprado afuera vs Cocinado en casa */}
        <article className="stat-card" style={{ borderLeft: '4px solid #f59e0b' }}>
          <div className="stat-card-top">
            <span className="stat-card-title">🍽️ Comprado Afuera</span>
            <span className="badge warning">Restaurantes / Menús</span>
          </div>
          <div className="stat-value">{formatMoney(totalCompradoAfuera)}</div>
          <span className="stat-subtext">
            Cocinado en casa / Mercado: <strong>{formatMoney(totalCocinadoCasa)}</strong>
          </span>
        </article>

        {/* Mercado y Desayunos */}
        <article className="stat-card" style={{ borderLeft: '4px solid #3b82f6' }}>
          <div className="stat-card-top">
            <span className="stat-card-title">🛒 Mercado & Desayunos</span>
            <span className="badge primary">Hogar</span>
          </div>
          <div className="stat-value">{formatMoney(totalMercado + totalDesayuno)}</div>
          <span className="stat-subtext">
            Mercado: {formatMoney(totalMercado)} | Desayunos: {formatMoney(totalDesayuno)}
          </span>
        </article>
      </div>

      {/* Gráfica y Consejo de Ahorro */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '1.5rem' }}>
        <div className="panel">
          <div className="panel-header">
            <h2 className="panel-title">Distribución del Gasto en Alimentación</h2>
          </div>
          <DonutChart data={chartData} totalLabel="Total Comida" />
        </div>

        <div className="panel" style={{ justifyContent: 'center' }}>
          <div className="panel-header">
            <h2 className="panel-title">💡 Diagnóstico de Ahorro: Semana vs Fin de Semana</h2>
          </div>
          <div style={{ padding: '0.5rem 0', display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
            <div style={{ padding: '0.85rem', backgroundColor: 'var(--color-bg-alt)', borderRadius: 'var(--radius-md)', border: '1px solid var(--color-border)' }}>
              <strong style={{ fontSize: '0.85rem', color: 'var(--color-text-main)', display: 'block', marginBottom: '0.25rem' }}>
                🍳 Cocinar los Fines de Semana:
              </strong>
              <span style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)', lineHeight: 1.45 }}>
                Comprar 2 almuerzos de $14.000 un sábado y domingo = <strong>$56.000</strong> el fin de semana ($224.000/mes). Cocinar en casa con ingredientes del mercado reduce ese costo a menos de la mitad.
              </span>
            </div>

            <div style={{ padding: '0.85rem', backgroundColor: 'var(--color-bg-alt)', borderRadius: 'var(--radius-md)', border: '1px solid var(--color-border)' }}>
              <strong style={{ fontSize: '0.85rem', color: 'var(--color-text-main)', display: 'block', marginBottom: '0.25rem' }}>
                🥗 Alternar Corrientazo ($9k) y Ejecutivo ($14k):
              </strong>
              <span style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)', lineHeight: 1.45 }}>
                Para 2 personas, elegir corrientazo ($18.000) 3 días a la semana en vez de ejecutivo ($28.000) te ahorra <strong>$120.000 libres al mes</strong>.
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Tabla de Registros */}
      <div className="panel">
        <div className="panel-header" style={{ flexWrap: 'wrap', gap: '0.75rem' }}>
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
              className={`btn sm ${filterTipo === 'ALMUERZO' ? 'primary' : 'secondary'}`}
              onClick={() => setFilterTipo('ALMUERZO')}
            >
              🥗 Almuerzos
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
              className={`btn sm ${filterTipo === 'COMIDA' ? 'primary' : 'secondary'}`}
              onClick={() => setFilterTipo('COMIDA')}
            >
              🍲 Cenas
            </button>
            <button
              type="button"
              className={`btn sm ${filterTipo === 'MERCADO_GENERAL' ? 'primary' : 'secondary'}`}
              onClick={() => setFilterTipo('MERCADO_GENERAL')}
            >
              🛒 Mercado
            </button>
          </div>
        </div>

        {/* Subfiltros por Beneficiario y Origen */}
        <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', marginBottom: '1rem', padding: '0.5rem 0', borderBottom: '1px solid var(--color-border)' }}>
          <div style={{ display: 'flex', gap: '0.35rem', flexWrap: 'wrap', alignItems: 'center' }}>
            <span style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--color-text-muted)' }}>
              Comensal:
            </span>
            <button
              type="button"
              className={`btn ghost sm ${filterBeneficiario === 'TODOS' ? 'active' : ''}`}
              onClick={() => setFilterBeneficiario('TODOS')}
            >
              Todos
            </button>
            <button
              type="button"
              className={`btn ghost sm ${filterBeneficiario === 'AMBOS' ? 'active' : ''}`}
              onClick={() => setFilterBeneficiario('AMBOS')}
            >
              👥 Ambos
            </button>
            <button
              type="button"
              className={`btn ghost sm ${filterBeneficiario === 'YO' ? 'active' : ''}`}
              onClick={() => setFilterBeneficiario('YO')}
            >
              👤 Solo Yo
            </button>
            <button
              type="button"
              className={`btn ghost sm ${filterBeneficiario === 'HERMANO' ? 'active' : ''}`}
              onClick={() => setFilterBeneficiario('HERMANO')}
            >
              👦 Hermano
            </button>
          </div>

          <div style={{ display: 'flex', gap: '0.35rem', flexWrap: 'wrap', alignItems: 'center', marginLeft: 'auto' }}>
            <span style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--color-text-muted)' }}>
              Origen:
            </span>
            <button
              type="button"
              className={`btn ghost sm ${filterOrigen === 'TODOS' ? 'active' : ''}`}
              onClick={() => setFilterOrigen('TODOS')}
            >
              Todos
            </button>
            <button
              type="button"
              className={`btn ghost sm ${filterOrigen === 'RESTAURANTE_AFUERA' ? 'active' : ''}`}
              onClick={() => setFilterOrigen('RESTAURANTE_AFUERA')}
            >
              🍽️ Comprado Afuera
            </button>
            <button
              type="button"
              className={`btn ghost sm ${filterOrigen === 'COCINADO_EN_CASA' ? 'active' : ''}`}
              onClick={() => setFilterOrigen('COCINADO_EN_CASA')}
            >
              🍳 En Casa / Finde
            </button>
          </div>
        </div>

        <div className="table-container">
          <table>
            <thead>
              <tr>
                <th>Fecha</th>
                <th>Tipo</th>
                <th>Comensal / Porciones</th>
                <th>Descripción</th>
                <th>Origen</th>
                <th>Cuenta</th>
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

                let benText = '👥 Ambos'
                if (item.beneficiario === 'YO') benText = '👤 Solo Yo'
                if (item.beneficiario === 'HERMANO') benText = '👦 Mi Hermano'
                if (item.beneficiario === 'FAMILIA') benText = '👨‍👩‍👧 Familia'

                return (
                  <tr key={item.id}>
                    <td>{formatDate(item.fecha)}</td>
                    <td>
                      <span className={`badge ${badgeClass}`} style={{ fontSize: '0.725rem' }}>
                        {item.tipoComida === 'MERCADO_GENERAL' ? 'Mercado' : item.tipoComida}
                      </span>
                    </td>
                    <td>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                        <span style={{ fontSize: '0.775rem', fontWeight: 600, color: 'var(--color-text-main)' }}>
                          {benText}
                        </span>
                        {item.numeroPorciones && item.numeroPorciones > 1 && (
                          <span style={{ fontSize: '0.68rem', color: 'var(--color-text-muted)' }}>
                            {item.numeroPorciones} platos {item.precioUnitario ? `(@${formatMoney(item.precioUnitario)})` : ''}
                          </span>
                        )}
                      </div>
                    </td>
                    <td>
                      <strong>{item.descripcion}</strong>
                      {item.lugarOProveedor && (
                        <span style={{ display: 'block', fontSize: '0.725rem', color: 'var(--color-text-muted)' }}>
                          📍 {item.lugarOProveedor}
                        </span>
                      )}
                    </td>
                    <td>
                      <span style={{ fontSize: '0.75rem', color: item.origenComida === 'COCINADO_EN_CASA' ? '#10b981' : 'var(--color-text-muted)' }}>
                        {item.origenComida === 'COCINADO_EN_CASA' ? '🍳 En casa' : '🍽️ Comprado'}
                        {item.esFinDeSemana ? ' (Finde)' : ''}
                      </span>
                    </td>
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
                  <td colSpan={8} style={{ textAlign: 'center', padding: '2rem', color: 'var(--color-text-muted)' }}>
                    No hay gastos de alimentación registrados bajo estos filtros.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* MODAL REGISTRAR ALIMENTACIÓN AVANZADO */}
      <Modal isOpen={modalOpen} onClose={() => setModalOpen(false)} title="🍲 Registrar Alimentación / Almuerzo">
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {/* Presets rápidos dentro del modal */}
          <div style={{ backgroundColor: 'var(--color-bg-alt)', padding: '0.75rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--color-border)' }}>
            <span style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--color-text-muted)', display: 'block', marginBottom: '0.4rem' }}>
              ⚡ Cargar opción común:
            </span>
            <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap' }}>
              <button
                type="button"
                className="btn secondary sm"
                style={{ fontSize: '0.75rem' }}
                onClick={() => aplicarPreset('ALMUERZO', 'YO', 1, 9000, 'Almuerzo Corrientazo (Yo)')}
              >
                1 Corrientazo ($9k)
              </button>
              <button
                type="button"
                className="btn secondary sm"
                style={{ fontSize: '0.75rem' }}
                onClick={() => aplicarPreset('ALMUERZO', 'YO', 1, 14000, 'Almuerzo Ejecutivo (Yo)')}
              >
                1 Ejecutivo ($14k)
              </button>
              <button
                type="button"
                className="btn secondary sm"
                style={{ fontSize: '0.75rem' }}
                onClick={() => aplicarPreset('ALMUERZO', 'AMBOS', 2, 9000, '2 Almuerzos Corrientazos (Yo + Hermano)')}
              >
                2 Corrientazos ($18k)
              </button>
              <button
                type="button"
                className="btn secondary sm"
                style={{ fontSize: '0.75rem' }}
                onClick={() => aplicarPreset('ALMUERZO', 'AMBOS', 2, 14000, '2 Almuerzos Ejecutivos (Yo + Hermano)')}
              >
                2 Ejecutivos ($28k)
              </button>
              <button
                type="button"
                className="btn secondary sm"
                style={{ fontSize: '0.75rem' }}
                onClick={() => aplicarPreset('DESAYUNO', 'AMBOS', 2, 6000, 'Desayunos panadería / huevos')}
              >
                2 Desayunos ($12k)
              </button>
            </div>
          </div>

          <div className="form-grid">
            <div className="form-group">
              <label>Tipo de Comida *</label>
              <select
                className="form-select"
                value={tipoComida}
                onChange={(e) => setTipoComida(e.target.value as typeof tipoComida)}
              >
                <option value="ALMUERZO">🥗 Almuerzo (Mediodía / Menú)</option>
                <option value="DESAYUNO">🍳 Desayuno (Panadería / Café / Huevos)</option>
                <option value="COMIDA">🍲 Comida / Cena</option>
                <option value="MERCADO_GENERAL">🛒 Mercado Grande (Supermercado)</option>
              </select>
            </div>

            <div className="form-group">
              <label>¿Para quién es? (Comensales) *</label>
              <select
                className="form-select"
                value={beneficiario}
                onChange={(e) => {
                  const b = e.target.value as BeneficiarioComida
                  setBeneficiario(b)
                  if (b === 'YO' || b === 'HERMANO') handlePorcionesChange(1)
                  if (b === 'AMBOS') handlePorcionesChange(2)
                }}
              >
                <option value="AMBOS">👥 Ambos (Yo + Mi hermano)</option>
                <option value="YO">👤 Solo para mí</option>
                <option value="HERMANO">👦 Para mi hermano</option>
                <option value="FAMILIA">👨‍👩‍👧 Familiar</option>
              </select>
            </div>
          </div>

          <div className="form-grid">
            <div className="form-group">
              <label>N° de Porciones / Platos</label>
              <input
                type="number"
                min="1"
                max="10"
                className="form-input"
                value={numeroPorciones}
                onChange={(e) => handlePorcionesChange(Number(e.target.value) || 1)}
              />
            </div>

            <div className="form-group">
              <label>Precio Unitario por Plato ($ COP)</label>
              <input
                type="number"
                step="500"
                className="form-input"
                placeholder="Ej: 9000 o 14000"
                value={precioUnitario}
                onChange={(e) => handlePrecioUnitarioChange(e.target.value)}
              />
            </div>
          </div>

          <div className="form-grid">
            <div className="form-group">
              <label>Monto Total ($ COP) *</label>
              <input
                type="number"
                className="form-input"
                placeholder="Ej: 18000 o 28000"
                value={monto}
                onChange={(e) => setMonto(e.target.value)}
                required
              />
            </div>

            <div className="form-group">
              <label>Fecha *</label>
              <input
                type="date"
                className="form-input"
                value={fecha}
                onChange={(e) => {
                  const f = e.target.value
                  setFecha(f)
                  const day = new Date(f + 'T00:00:00').getDay()
                  setEsFinDeSemana(day === 0 || day === 6) // Domingo o Sábado
                }}
                required
              />
            </div>
          </div>

          <div className="form-group">
            <label>Descripción / Detalle *</label>
            <input
              type="text"
              className="form-input"
              placeholder="Ej: 2 Almuerzos ejecutivos con sopa y seco"
              value={descripcion}
              onChange={(e) => setDescripcion(e.target.value)}
              required
            />
          </div>

          <div className="form-grid">
            <div className="form-group">
              <label>Origen de la Comida</label>
              <select
                className="form-select"
                value={origenComida}
                onChange={(e) => setOrigenComida(e.target.value as OrigenComida)}
              >
                <option value="RESTAURANTE_AFUERA">🍽️ Comprado afuera (Restaurante / Domicilio)</option>
                <option value="COCINADO_EN_CASA">🍳 Cocinado en casa (Mercado / Fin de semana)</option>
              </select>
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

          <div className="form-grid">
            <div className="form-group">
              <label>Lugar / Restaurante (Opcional)</label>
              <input
                type="text"
                className="form-input"
                placeholder="Ej: Restaurante Doña Rosa, D1, Éxito"
                value={lugar}
                onChange={(e) => setLugar(e.target.value)}
              />
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem', paddingTop: '1.25rem' }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', cursor: 'pointer', fontSize: '0.85rem' }}>
                <input
                  type="checkbox"
                  checked={esFinDeSemana}
                  onChange={(e) => setEsFinDeSemana(e.target.checked)}
                />
                📅 Es fin de semana
              </label>
              <label style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', cursor: 'pointer', fontSize: '0.85rem' }}>
                <input
                  type="checkbox"
                  checked={reembolsado}
                  onChange={(e) => setReembolsado(e.target.checked)}
                />
                💵 Mi hermano ya reembolsó su parte
              </label>
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
