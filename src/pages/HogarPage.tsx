import { useState, useMemo, type FormEvent, useEffect } from 'react'
import { useFinance } from '../context/FinanceContext'
import { Modal } from '../components/Modal'
import { DatePickerInput } from '../components/DatePickerInput'
import { formatMoney, formatDate, formatMonthYear, getDaysRemaining } from '../utils/formatters'
import type { ArriendoVivienda, CategoriaCompraHogar, ServicioPublico, TipoServicioPublico } from '../types/finance'

export function HogarPage() {
  const {
    state,
    selectedMonth,
    totalGastosHogarMes,
    addServicio,
    updateServicio,
    togglePagoServicio,
    deleteServicio,
    addArriendo,
    updateArriendo,
    togglePagoArriendo,
    deleteArriendo,
    addCompraHogar,
    deleteCompraHogar,
  } = useFinance()

  const [activeTab, setActiveTab] = useState<'SERVICIOS' | 'ARRIENDO' | 'COMPRAS'>('SERVICIOS')

  // Modales
  const [modalServicioOpen, setModalServicioOpen] = useState(false)
  const [editingServicioId, setEditingServicioId] = useState<string | null>(null)

  const [modalArriendoOpen, setModalArriendoOpen] = useState(false)
  const [editingArriendoId, setEditingArriendoId] = useState<string | null>(null)

  const [modalCompraOpen, setModalCompraOpen] = useState(false)

  // Form State Servicio
  const [tipoServ, setTipoServ] = useState<TipoServicioPublico>('ENERGIA')
  const [nombreServ, setNombreServ] = useState('')
  const [montoServ, setMontoServ] = useState('')
  const [fechaVencServ, setFechaVencServ] = useState(`${selectedMonth}-15`)
  const [consumoServ, setConsumoServ] = useState('')
  const [cuentaServId, setCuentaServId] = useState(state.cuentas[0]?.id || '')

  // Form State Arriendo
  const [montoArr, setMontoArr] = useState('')
  const [mesArr, setMesArr] = useState(selectedMonth)
  const [diaLimiteArr, setDiaLimiteArr] = useState('05')
  const [fechaLimArr, setFechaLimArr] = useState(`${selectedMonth}-05`)
  const [arrendador, setArrendador] = useState('')
  const [notasArr, setNotasArr] = useState('')

  // Form State Compras Hogar
  const [descCompra, setDescCompra] = useState('')
  const [montoCompra, setMontoCompra] = useState('')
  const [fechaCompra, setFechaCompra] = useState(new Date().toISOString().slice(0, 10))
  const [catCompra, setCatCompra] = useState<CategoriaCompraHogar>('ASEO')
  const [cuentaCompraId, setCuentaCompraId] = useState(state.cuentas[0]?.id || '')

  // Sincronizar mes por defecto cuando cambia el mes global
  useEffect(() => {
    if (!editingArriendoId) {
      setMesArr(selectedMonth)
      setFechaLimArr(`${selectedMonth}-${diaLimiteArr.padStart(2, '0')}`)
    }
  }, [selectedMonth, diaLimiteArr, editingArriendoId])

  // Filtrado de servicios del mes
  const serviciosMes = useMemo(() => {
    return (state.servicios || []).filter(
      (s) => s.periodo === selectedMonth || s.fechaVencimiento.startsWith(selectedMonth)
    )
  }, [state.servicios, selectedMonth])

  // Filtrado de compras del mes
  const comprasHogarMes = useMemo(() => {
    return (state.comprasHogar || []).filter((c) => c.fecha.startsWith(selectedMonth))
  }, [state.comprasHogar, selectedMonth])

  // Arriendo del mes seleccionado
  const arriendoMes = useMemo(() => {
    return (state.arriendos || []).find((a) => a.mesCorrespondiente === selectedMonth)
  }, [state.arriendos, selectedMonth])

  // Cambio dinámico de mes en el formulario de arriendo para sincronizar la fecha límite
  function handleMesArrChange(newMonth: string) {
    setMesArr(newMonth)
    const day = diaLimiteArr.padStart(2, '0')
    setFechaLimArr(`${newMonth}-${day}`)
  }

  function handleDiaLimiteChange(newDay: string) {
    const cleanDay = Math.min(31, Math.max(1, Number(newDay) || 5))
    const formatted = String(cleanDay).padStart(2, '0')
    setDiaLimiteArr(formatted)
    if (mesArr) {
      setFechaLimArr(`${mesArr}-${formatted}`)
    }
  }

  function handleFechaLimArrChange(fullDate: string) {
    setFechaLimArr(fullDate)
    if (fullDate.length >= 10) {
      const parts = fullDate.split('-')
      if (parts.length === 3) {
        setMesArr(`${parts[0]}-${parts[1]}`)
        setDiaLimiteArr(parts[2])
      }
    }
  }

  // Abrir modal de Arriendo para crear nuevo
  function openNewArriendoModal() {
    setEditingArriendoId(null)
    setMontoArr('')
    setMesArr(selectedMonth)
    setDiaLimiteArr('05')
    setFechaLimArr(`${selectedMonth}-05`)
    setArrendador('')
    setNotasArr('')
    setModalArriendoOpen(true)
  }

  // Abrir modal de Arriendo para editar existente
  function openEditArriendoModal(a: ArriendoVivienda) {
    setEditingArriendoId(a.id)
    setMontoArr(String(a.monto))
    setMesArr(a.mesCorrespondiente)
    const day = a.fechaLimite ? a.fechaLimite.slice(8, 10) : '05'
    setDiaLimiteArr(day)
    setFechaLimArr(a.fechaLimite)
    setArrendador(a.arrendador || '')
    setNotasArr(a.notas || '')
    setModalArriendoOpen(true)
  }

  // Abrir modal de Servicio para crear nuevo
  function openNewServicioModal() {
    setEditingServicioId(null)
    setTipoServ('ENERGIA')
    setNombreServ('')
    setMontoServ('')
    setFechaVencServ(`${selectedMonth}-15`)
    setConsumoServ('')
    setModalServicioOpen(true)
  }

  // Abrir modal de Servicio para editar existente
  function openEditServicioModal(s: ServicioPublico) {
    setEditingServicioId(s.id)
    setTipoServ(s.tipo)
    setNombreServ(s.nombre)
    setMontoServ(String(s.monto))
    setFechaVencServ(s.fechaVencimiento)
    setConsumoServ(s.consumo || '')
    setCuentaServId(s.cuentaId || state.cuentas[0]?.id || '')
    setModalServicioOpen(true)
  }

  function handleAddOrUpdateServicio(e: FormEvent) {
    e.preventDefault()
    if (!montoServ || Number(montoServ) <= 0) return

    let defaultNombre = ''
    if (tipoServ === 'ENERGIA') defaultNombre = 'Energía / Luz'
    else if (tipoServ === 'GAS') defaultNombre = 'Gas Natural'
    else if (tipoServ === 'AGUA') defaultNombre = 'Acueducto & Agua'
    else if (tipoServ === 'INTERNET') defaultNombre = 'Internet & Telefonía'
    else defaultNombre = 'Servicio del Hogar'

    if (editingServicioId) {
      updateServicio(editingServicioId, {
        tipo: tipoServ,
        nombre: nombreServ || defaultNombre,
        monto: Number(montoServ),
        fechaVencimiento: fechaVencServ,
        consumo: consumoServ || undefined,
        cuentaId: cuentaServId || undefined,
      })
    } else {
      addServicio({
        tipo: tipoServ,
        nombre: nombreServ || defaultNombre,
        monto: Number(montoServ),
        fechaVencimiento: fechaVencServ,
        pagado: false,
        periodo: selectedMonth,
        consumo: consumoServ || undefined,
        cuentaId: cuentaServId || undefined,
      })
    }

    setNombreServ('')
    setMontoServ('')
    setConsumoServ('')
    setEditingServicioId(null)
    setModalServicioOpen(false)
  }

  function handleAddOrUpdateArriendo(e: FormEvent) {
    e.preventDefault()
    if (!montoArr || Number(montoArr) <= 0) return

    // Asegurar que la fecha límite use el mes seleccionado
    const calculatedFechaLimite = fechaLimArr.startsWith(mesArr)
      ? fechaLimArr
      : `${mesArr}-${diaLimiteArr.padStart(2, '0')}`

    if (editingArriendoId) {
      updateArriendo(editingArriendoId, {
        mesCorrespondiente: mesArr,
        monto: Number(montoArr),
        fechaLimite: calculatedFechaLimite,
        arrendador: arrendador || undefined,
        notas: notasArr || undefined,
      })
    } else {
      addArriendo({
        mesCorrespondiente: mesArr,
        monto: Number(montoArr),
        fechaLimite: calculatedFechaLimite,
        pagado: false,
        arrendador: arrendador || undefined,
        notas: notasArr || undefined,
        cuentaId: state.cuentas[0]?.id,
      })
    }

    setMontoArr('')
    setArrendador('')
    setNotasArr('')
    setEditingArriendoId(null)
    setModalArriendoOpen(false)
  }

  function handleAddCompraHogar(e: FormEvent) {
    e.preventDefault()
    if (!montoCompra || Number(montoCompra) <= 0) return

    addCompraHogar({
      fecha: fechaCompra,
      descripcion: descCompra,
      monto: Number(montoCompra),
      categoria: catCompra,
      cuentaId: cuentaCompraId,
    })

    setDescCompra('')
    setMontoCompra('')
    setModalCompraOpen(false)
  }

  return (
    <div className="page">
      {/* Header */}
      <div className="page-header">
        <div className="page-header-info">
          <h1>
            <svg viewBox="0 0 24 24" width="28" height="28" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
              <path d="M9 22V12h6v10" />
            </svg>
            Hogar, Arriendo & Servicios Públicos
          </h1>
          <p>Control de recibos (Energía, Gas, Agua, Internet), arriendo mensual y compras del hogar.</p>
        </div>

        <div className="page-header-actions">
          <div className="badge primary" style={{ fontSize: '0.85rem', padding: '0.4rem 0.8rem' }}>
            Total Hogar Mes: <strong>{formatMoney(totalGastosHogarMes)}</strong>
          </div>
          {activeTab === 'SERVICIOS' && (
            <button type="button" className="btn primary" onClick={openNewServicioModal}>
              + Agregar Recibo
            </button>
          )}
          {activeTab === 'ARRIENDO' && (
            <button type="button" className="btn primary" onClick={openNewArriendoModal}>
              + Registrar Arriendo
            </button>
          )}
          {activeTab === 'COMPRAS' && (
            <button type="button" className="btn primary" onClick={() => setModalCompraOpen(true)}>
              + Compra de Hogar
            </button>
          )}
        </div>
      </div>

      {/* Tabs con scroll táctil fluido */}
      <div className="tabs-nav">
        <button
          type="button"
          className={`tab-btn ${activeTab === 'SERVICIOS' ? 'active' : ''}`}
          onClick={() => setActiveTab('SERVICIOS')}
        >
          💡 Servicios Públicos ({serviciosMes.length})
        </button>
        <button
          type="button"
          className={`tab-btn ${activeTab === 'ARRIENDO' ? 'active' : ''}`}
          onClick={() => setActiveTab('ARRIENDO')}
        >
          🏠 Arriendo / Vivienda {arriendoMes ? (arriendoMes.pagado ? '✓' : '⏳') : ''}
        </button>
        <button
          type="button"
          className={`tab-btn ${activeTab === 'COMPRAS' ? 'active' : ''}`}
          onClick={() => setActiveTab('COMPRAS')}
        >
          🛒 Compras de Hogar ({comprasHogarMes.length})
        </button>
      </div>

      {/* TAB 1: SERVICIOS PÚBLICOS */}
      {activeTab === 'SERVICIOS' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          <div className="service-cards-grid">
            {serviciosMes.map((s) => {
              const dias = getDaysRemaining(s.fechaVencimiento)
              let iconEmoji = '⚡'
              if (s.tipo === 'GAS') iconEmoji = '🔥'
              if (s.tipo === 'AGUA') iconEmoji = '💧'
              if (s.tipo === 'INTERNET') iconEmoji = '🌐'

              return (
                <article
                  key={s.id}
                  className={`service-card ${s.pagado ? 'pagado' : 'pendiente'}`}
                >
                  <div className="service-card-header">
                    <div className="service-card-title-group">
                      <div className="service-icon-badge">{iconEmoji}</div>
                      <strong className="service-card-name">{s.nombre}</strong>
                    </div>

                    <span className={`badge ${s.pagado ? 'income' : 'warning'}`}>
                      {s.pagado ? '✓ Pagado' : 'Pendiente'}
                    </span>
                  </div>

                  <div className="service-card-body">
                    <div>
                      <div className="service-amount">{formatMoney(s.monto)}</div>
                      {s.consumo && (
                        <span style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', display: 'block', marginTop: '2px' }}>
                          Consumo: <strong>{s.consumo}</strong>
                        </span>
                      )}
                    </div>

                    <div style={{ textAlign: 'right', display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '3px' }}>
                      <span style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>
                        Vence: {formatDate(s.fechaVencimiento)}
                      </span>
                      {!s.pagado && (
                        <span
                          className={`service-due-tag ${dias.isExpired ? 'expired' : dias.days <= 3 ? 'soon' : 'ok'}`}
                        >
                          {dias.label}
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="service-card-footer">
                    <button
                      type="button"
                      className={`btn sm ${s.pagado ? 'secondary' : 'success'}`}
                      style={{ flex: 1 }}
                      onClick={() => togglePagoServicio(s.id)}
                    >
                      {s.pagado ? 'Marcar como Pendiente' : '✓ Registrar Pago'}
                    </button>

                    <button
                      type="button"
                      className="btn secondary sm icon-only"
                      onClick={() => openEditServicioModal(s)}
                      title="Editar recibo"
                      aria-label="Editar"
                    >
                      <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                        <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                      </svg>
                    </button>

                    <button
                      type="button"
                      className="btn danger sm icon-only"
                      onClick={() => deleteServicio(s.id)}
                      title="Eliminar recibo"
                      aria-label="Eliminar"
                    >
                      <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" strokeWidth="2">
                        <polyline points="3 6 5 6 21 6" />
                        <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                      </svg>
                    </button>
                  </div>
                </article>
              )
            })}
          </div>

          {serviciosMes.length === 0 && (
            <div className="panel" style={{ textAlign: 'center', padding: '3rem 1rem' }}>
              <p style={{ color: 'var(--color-text-muted)' }}>
                No hay recibos de servicios públicos registrados para {formatMonthYear(selectedMonth)}.
              </p>
              <button
                type="button"
                className="btn primary sm"
                style={{ marginTop: '1rem' }}
                onClick={openNewServicioModal}
              >
                + Agregar Recibo (Luz, Gas, Agua, Internet)
              </button>
            </div>
          )}
        </div>
      )}

      {/* TAB 2: ARRIENDO */}
      {activeTab === 'ARRIENDO' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          {arriendoMes ? (
            <div className="panel" style={{ borderLeft: `5px solid ${arriendoMes.pagado ? 'var(--color-income)' : 'var(--color-expense)'}` }}>
              <div className="panel-header">
                <div>
                  <h2 className="panel-title">
                    🏠 Arriendo de {formatMonthYear(arriendoMes.mesCorrespondiente)}
                  </h2>
                  <p style={{ fontSize: '0.85rem', color: 'var(--color-text-muted)' }}>
                    {arriendoMes.arrendador ? `Arrendador / Contacto: ${arriendoMes.arrendador}` : 'Vivienda Principal'}
                  </p>
                </div>
                <span className={`badge ${arriendoMes.pagado ? 'income' : 'expense'}`} style={{ fontSize: '0.9rem', padding: '0.4rem 0.8rem' }}>
                  {arriendoMes.pagado ? '✓ Arriendo Pagado' : '⏳ Pendiente de Pago'}
                </span>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem', padding: '0.75rem 0' }}>
                <div>
                  <span style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', textTransform: 'uppercase', fontWeight: 600 }}>Valor Mensual</span>
                  <div style={{ fontFamily: 'var(--font-display)', fontSize: '1.8rem', fontWeight: 700, color: 'var(--color-text-main)' }}>
                    {formatMoney(arriendoMes.monto)}
                  </div>
                </div>
                <div>
                  <span style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', textTransform: 'uppercase', fontWeight: 600 }}>Fecha Límite de Pago</span>
                  <div style={{ fontSize: '1.1rem', fontWeight: 600, color: 'var(--color-text-main)', marginTop: '0.3rem' }}>
                    {formatDate(arriendoMes.fechaLimite)}
                  </div>
                  {!arriendoMes.pagado && (
                    <span style={{ fontSize: '0.8rem', color: getDaysRemaining(arriendoMes.fechaLimite).isExpired ? 'var(--color-expense)' : 'var(--color-warning-text)', fontWeight: 600 }}>
                      {getDaysRemaining(arriendoMes.fechaLimite).label}
                    </span>
                  )}
                </div>
                {arriendoMes.fechaPago && (
                  <div>
                    <span style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', textTransform: 'uppercase', fontWeight: 600 }}>Fecha Efectiva de Pago</span>
                    <div style={{ fontSize: '1.1rem', fontWeight: 600, color: 'var(--color-income-text)', marginTop: '0.3rem' }}>
                      {formatDate(arriendoMes.fechaPago)}
                    </div>
                  </div>
                )}
              </div>

              {arriendoMes.notas && (
                <div className="banner info">
                  <span>📝 <strong>Notas:</strong> {arriendoMes.notas}</span>
                </div>
              )}

              <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end', borderTop: '1px solid var(--color-border)', paddingTop: '1rem', flexWrap: 'wrap' }}>
                <button
                  type="button"
                  className={`btn ${arriendoMes.pagado ? 'secondary' : 'success'}`}
                  onClick={() => togglePagoArriendo(arriendoMes.id)}
                >
                  {arriendoMes.pagado ? 'Desmarcar Pago' : '✓ Marcar como Pagado Ahora'}
                </button>

                <button
                  type="button"
                  className="btn secondary"
                  onClick={() => openEditArriendoModal(arriendoMes)}
                >
                  ✏️ Editar Arriendo
                </button>

                <button
                  type="button"
                  className="btn danger sm"
                  onClick={() => {
                    if (confirm('¿Deseas eliminar el registro de arriendo de este mes?')) {
                      deleteArriendo(arriendoMes.id)
                    }
                  }}
                >
                  Eliminar
                </button>
              </div>
            </div>
          ) : (
            <div className="panel" style={{ textAlign: 'center', padding: '3rem 1rem' }}>
              <p style={{ color: 'var(--color-text-muted)' }}>
                No has registrado el valor del arriendo para {formatMonthYear(selectedMonth)}.
              </p>
              <button
                type="button"
                className="btn primary sm"
                style={{ marginTop: '1rem' }}
                onClick={openNewArriendoModal}
              >
                + Registrar Arriendo de {formatMonthYear(selectedMonth)}
              </button>
            </div>
          )}

          {/* Histórico de Arriendos con botón para editar cualquier mes */}
          <div className="panel">
            <div className="panel-header">
              <h3 className="panel-title" style={{ fontSize: '1rem' }}>
                Historial de Pagos de Arriendo
              </h3>
              <button type="button" className="btn secondary sm" onClick={openNewArriendoModal}>
                + Agregar Otro Mes
              </button>
            </div>

            <div className="table-container">
              <table>
                <thead>
                  <tr>
                    <th>Mes</th>
                    <th>Valor</th>
                    <th>Fecha Límite</th>
                    <th>Estado</th>
                    <th>Fecha de Pago</th>
                    <th style={{ textAlign: 'right' }}>Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {(state.arriendos || []).map((a) => (
                    <tr key={a.id}>
                      <td><strong>{formatMonthYear(a.mesCorrespondiente)}</strong></td>
                      <td>{formatMoney(a.monto)}</td>
                      <td>{formatDate(a.fechaLimite)}</td>
                      <td>
                        <span className={`badge ${a.pagado ? 'income' : 'expense'}`}>
                          {a.pagado ? 'Pagado' : 'Pendiente'}
                        </span>
                      </td>
                      <td>{a.fechaPago ? formatDate(a.fechaPago) : '—'}</td>
                      <td style={{ textAlign: 'right', whiteSpace: 'nowrap' }}>
                        <button
                          type="button"
                          className="btn secondary sm"
                          style={{ marginRight: '0.4rem', padding: '0.25rem 0.5rem', fontSize: '0.75rem' }}
                          onClick={() => openEditArriendoModal(a)}
                          title="Editar este arriendo"
                        >
                          ✏️ Editar
                        </button>
                        <button
                          type="button"
                          className="btn ghost sm"
                          style={{ color: '#e11d48', padding: '0.25rem 0.45rem' }}
                          onClick={() => {
                            if (confirm(`¿Eliminar arriendo de ${formatMonthYear(a.mesCorrespondiente)}?`)) {
                              deleteArriendo(a.id)
                            }
                          }}
                          title="Eliminar"
                        >
                          ✕
                        </button>
                      </td>
                    </tr>
                  ))}
                  {(state.arriendos || []).length === 0 && (
                    <tr>
                      <td colSpan={6} style={{ textAlign: 'center', padding: '2rem', color: 'var(--color-text-muted)' }}>
                        No hay registros de arriendo guardados.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: COMPRAS DEL HOGAR */}
      {activeTab === 'COMPRAS' && (
        <div className="panel">
          <div className="panel-header">
            <h2 className="panel-title">
              Artículos, Aseo y Mantenimiento del Hogar ({formatMonthYear(selectedMonth)})
            </h2>
            <button type="button" className="btn primary sm" onClick={() => setModalCompraOpen(true)}>
              + Nueva Compra
            </button>
          </div>

          <div className="table-container">
            <table>
              <thead>
                <tr>
                  <th>Fecha</th>
                  <th>Descripción</th>
                  <th>Categoría</th>
                  <th>Cuenta Pagada</th>
                  <th style={{ textAlign: 'right' }}>Monto</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {comprasHogarMes.map((c) => {
                  const cuenta = state.cuentas.find((acc) => acc.id === c.cuentaId)
                  return (
                    <tr key={c.id}>
                      <td>{formatDate(c.fecha)}</td>
                      <td>
                        <strong>{c.descripcion}</strong>
                        {c.lugar && <span style={{ display: 'block', fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>{c.lugar}</span>}
                      </td>
                      <td>
                        <span className="badge neutral" style={{ fontSize: '0.75rem' }}>
                          {c.categoria}
                        </span>
                      </td>
                      <td>{cuenta?.nombre || 'Efectivo'}</td>
                      <td style={{ textAlign: 'right', fontWeight: 600, color: 'var(--color-expense)' }}>
                        {formatMoney(c.monto)}
                      </td>
                      <td style={{ textAlign: 'right' }}>
                        <button
                          type="button"
                          className="btn ghost sm"
                          onClick={() => deleteCompraHogar(c.id)}
                          title="Eliminar"
                        >
                          ✕
                        </button>
                      </td>
                    </tr>
                  )
                })}
                {comprasHogarMes.length === 0 && (
                  <tr>
                    <td colSpan={6} style={{ textAlign: 'center', padding: '2rem', color: 'var(--color-text-muted)' }}>
                      No hay compras de hogar registradas este mes.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* MODAL AGREGAR / EDITAR SERVICIO */}
      <Modal
        isOpen={modalServicioOpen}
        onClose={() => {
          setModalServicioOpen(false)
          setEditingServicioId(null)
        }}
        title={editingServicioId ? '✏️ Editar Recibo de Servicio' : '💡 Registrar Recibo de Servicio'}
      >
        <form onSubmit={handleAddOrUpdateServicio} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <div className="form-group">
            <label>Tipo de Servicio *</label>
            <select className="form-select" value={tipoServ} onChange={(e) => setTipoServ(e.target.value as typeof tipoServ)}>
              <option value="ENERGIA">⚡ Energía / Luz (EPM / Enel / etc.)</option>
              <option value="GAS">🔥 Gas Natural</option>
              <option value="AGUA">💧 Agua / Acueducto & Alcantarillado</option>
              <option value="INTERNET">🌐 Internet Fibra / TV / Telefonía</option>
              <option value="OTRO">Otro Servicio</option>
            </select>
          </div>

          <div className="form-group">
            <label>Nombre / Proveedor</label>
            <input
              type="text"
              className="form-input"
              placeholder="Ej: Factura Luz EPM, Plan Claro Fibra"
              value={nombreServ}
              onChange={(e) => setNombreServ(e.target.value)}
            />
          </div>

          <div className="form-grid">
            <div className="form-group">
              <label>Monto de la Factura ($ COP) *</label>
              <input
                type="number"
                className="form-input"
                placeholder="Ej: 135000"
                value={montoServ}
                onChange={(e) => setMontoServ(e.target.value)}
                required
              />
            </div>

            <DatePickerInput
              label="Fecha de Vencimiento"
              value={fechaVencServ}
              onChange={setFechaVencServ}
              selectedMonthContext={selectedMonth}
              required
            />
          </div>

          <div className="form-grid">
            <div className="form-group">
              <label>Consumo (Opcional)</label>
              <input
                type="text"
                className="form-input"
                placeholder="Ej: 160 kWh, 15 m³, 300 Mbps"
                value={consumoServ}
                onChange={(e) => setConsumoServ(e.target.value)}
              />
            </div>

            <div className="form-group">
              <label>Cuenta de Pago Sugerida</label>
              <select className="form-select" value={cuentaServId} onChange={(e) => setCuentaServId(e.target.value)}>
                {(state.cuentas || []).map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.nombre}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '0.5rem' }}>
            <button
              type="button"
              className="btn secondary"
              onClick={() => {
                setModalServicioOpen(false)
                setEditingServicioId(null)
              }}
            >
              Cancelar
            </button>
            <button type="submit" className="btn success">
              {editingServicioId ? 'Guardar Cambios' : 'Guardar Recibo'}
            </button>
          </div>
        </form>
      </Modal>

      {/* MODAL AGREGAR / EDITAR ARRIENDO */}
      <Modal
        isOpen={modalArriendoOpen}
        onClose={() => {
          setModalArriendoOpen(false)
          setEditingArriendoId(null)
        }}
        title={editingArriendoId ? '✏️ Editar Arriendo de Vivienda' : '🏠 Registrar Arriendo del Mes'}
      >
        <form onSubmit={handleAddOrUpdateArriendo} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <div className="form-grid">
            <div className="form-group">
              <label>Mes Correspondiente *</label>
              <input
                type="month"
                className="form-input"
                value={mesArr}
                onChange={(e) => handleMesArrChange(e.target.value)}
                required
              />
            </div>

            <div className="form-group">
              <label>Valor Arriendo + Admin ($ COP) *</label>
              <input
                type="number"
                className="form-input"
                placeholder="Ej: 1400000"
                value={montoArr}
                onChange={(e) => setMontoArr(e.target.value)}
                required
              />
            </div>
          </div>

          <div className="form-grid">
            <div className="form-group">
              <label>Día Límite de Pago mensual *</label>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <input
                  type="number"
                  min="1"
                  max="31"
                  className="form-input"
                  placeholder="5"
                  value={diaLimiteArr}
                  onChange={(e) => handleDiaLimiteChange(e.target.value)}
                  style={{ maxWidth: '90px' }}
                  required
                />
                <span style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)' }}>de cada mes</span>
              </div>
            </div>

            <DatePickerInput
              label="Fecha Límite Completa"
              value={fechaLimArr}
              onChange={handleFechaLimArrChange}
              selectedMonthContext={mesArr}
              required
            />
          </div>

          <div className="form-group">
            <label>Arrendador / Inmobiliaria (Opcional)</label>
            <input
              type="text"
              className="form-input"
              placeholder="Nombre del propietario o inmobiliaria"
              value={arrendador}
              onChange={(e) => setArrendador(e.target.value)}
            />
          </div>

          <div className="form-group">
            <label>Notas / Comentarios</label>
            <textarea
              className="form-textarea"
              placeholder="Detalles sobre administración, parqueadero, número de cuenta del propietario, etc."
              value={notasArr}
              onChange={(e) => setNotasArr(e.target.value)}
            />
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '0.5rem' }}>
            <button
              type="button"
              className="btn secondary"
              onClick={() => {
                setModalArriendoOpen(false)
                setEditingArriendoId(null)
              }}
            >
              Cancelar
            </button>
            <button type="submit" className="btn success">
              {editingArriendoId ? 'Guardar Cambios' : 'Guardar Arriendo'}
            </button>
          </div>
        </form>
      </Modal>

      {/* MODAL COMPRA HOGAR */}
      <Modal isOpen={modalCompraOpen} onClose={() => setModalCompraOpen(false)} title="🛒 Registrar Compra de Hogar">
        <form onSubmit={handleAddCompraHogar} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <div className="form-group">
            <label>Descripción del Artículo o Servicio *</label>
            <input
              type="text"
              className="form-input"
              placeholder="Ej: Detergentes y jabones, Juego de sábanas, Reparación grifería"
              value={descCompra}
              onChange={(e) => setDescCompra(e.target.value)}
              required
            />
          </div>

          <div className="form-grid">
            <div className="form-group">
              <label>Monto ($ COP) *</label>
              <input
                type="number"
                className="form-input"
                placeholder="Ej: 85000"
                value={montoCompra}
                onChange={(e) => setMontoCompra(e.target.value)}
                required
              />
            </div>

            <DatePickerInput
              label="Fecha de Compra"
              value={fechaCompra}
              onChange={setFechaCompra}
              selectedMonthContext={selectedMonth}
              required
            />
          </div>

          <div className="form-grid">
            <div className="form-group">
              <label>Categoría</label>
              <select className="form-select" value={catCompra} onChange={(e) => setCatCompra(e.target.value as typeof catCompra)}>
                <option value="ASEO">Aseo y Limpieza</option>
                <option value="MANTENIMIENTO">Mantenimiento y Reparación</option>
                <option value="ELECTRODOMESTICOS">Electrodomésticos</option>
                <option value="MUEBLES">Muebles y Decoración</option>
                <option value="HERRAMIENTAS">Herramientas</option>
                <option value="FARMACIA_BOTIQUIN">Farmacia y Botiquín</option>
                <option value="OTRO">Otro</option>
              </select>
            </div>

            <div className="form-group">
              <label>Cuenta de Pago</label>
              <select className="form-select" value={cuentaCompraId} onChange={(e) => setCuentaCompraId(e.target.value)}>
                {(state.cuentas || []).map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.nombre} (Saldo: {formatMoney(c.saldo)})
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '0.5rem' }}>
            <button type="button" className="btn secondary" onClick={() => setModalCompraOpen(false)}>
              Cancelar
            </button>
            <button type="submit" className="btn success">
              Guardar Compra
            </button>
          </div>
        </form>
      </Modal>
    </div>
  )
}
