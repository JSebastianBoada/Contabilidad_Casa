import { useState, useMemo, type FormEvent, useEffect } from 'react'
import { useFinance } from '../context/FinanceContext'
import { Modal } from '../components/Modal'
import { DatePickerInput } from '../components/DatePickerInput'
import { formatMoney, formatDate, formatMonthYear, getDaysRemaining } from '../utils/formatters'
import type { ArriendoVivienda, CategoriaCompraHogar, ServicioPublico, TipoServicioPublico, ResponsableGastoHogar } from '../types/finance'

export function HogarPage() {
  const {
    state,
    selectedMonth,
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
    showToast,
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
  const [responsableServ, setResponsableServ] = useState<ResponsableGastoHogar>('MAMA')
  const [esEstimadoServ, setEsEstimadoServ] = useState(false)

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

  // Plantilla de arriendo fijo de referencia
  const plantillaArriendo = useMemo(() => {
    if (state.arriendos && state.arriendos.length > 0) {
      const sorted = [...state.arriendos].sort((a, b) => b.mesCorrespondiente.localeCompare(a.mesCorrespondiente))
      return sorted[0]
    }
    return {
      id: 'arr-template',
      mesCorrespondiente: selectedMonth,
      monto: 1350000,
      fechaLimite: `${selectedMonth}-05`,
      pagado: false,
      cuentaId: state.cuentas[0]?.id || 'cuenta-bancolombia',
      arrendador: 'Inmobiliaria El Hogar / Propietario',
      notas: 'Gasto fijo mensual de vivienda',
    }
  }, [state.arriendos, selectedMonth, state.cuentas])

  const [cuentaPagoArriendoId, setCuentaPagoArriendoId] = useState('')

  useEffect(() => {
    if (arriendoMes?.cuentaId) {
      setCuentaPagoArriendoId(arriendoMes.cuentaId)
    } else if (plantillaArriendo?.cuentaId) {
      setCuentaPagoArriendoId(plantillaArriendo.cuentaId)
    } else if (state.cuentas[0]) {
      setCuentaPagoArriendoId(state.cuentas[0].id)
    }
  }, [arriendoMes, plantillaArriendo, state.cuentas])

  function handleEjecutarPagoArriendo() {
    const targetCuentaId = cuentaPagoArriendoId || state.cuentas[0]?.id
    if (!targetCuentaId) {
      showToast('Selecciona una cuenta', 'Elige la cuenta desde la que se pagará el arriendo', 'warning')
      return
    }

    const montoCanon = arriendoMes ? arriendoMes.monto : (plantillaArriendo?.monto || 1350000)
    const fechaLimiteCanon = arriendoMes ? arriendoMes.fechaLimite : `${selectedMonth}-${diaLimiteArr.padStart(2, '0')}`

    if (arriendoMes) {
      togglePagoArriendo(arriendoMes.id, targetCuentaId)
    } else {
      addArriendo({
        mesCorrespondiente: selectedMonth,
        monto: montoCanon,
        fechaLimite: fechaLimiteCanon,
        pagado: true,
        fechaPago: new Date().toISOString().slice(0, 10),
        cuentaId: targetCuentaId,
        arrendador: plantillaArriendo.arrendador || 'Inmobiliaria El Hogar / Propietario',
        notas: plantillaArriendo.notas || 'Gasto fijo mensual de vivienda',
      })
    }
  }

  function handleCambiarCuentaPagoDirecto(nuevaCuentaId: string) {
    setCuentaPagoArriendoId(nuevaCuentaId)
    if (arriendoMes) {
      updateArriendo(arriendoMes.id, { cuentaId: nuevaCuentaId })
    }
  }

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
    setResponsableServ('MAMA')
    setEsEstimadoServ(false)
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
    setResponsableServ(s.responsablePago || 'MAMA')
    setEsEstimadoServ(Boolean(s.esEstimado))
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
        responsablePago: responsableServ,
        esEstimado: esEstimadoServ,
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
        responsablePago: responsableServ,
        esEstimado: esEstimadoServ,
      })
    }

    setNombreServ('')
    setMontoServ('')
    setConsumoServ('')
    setEditingServicioId(null)
    setModalServicioOpen(false)
  }

  // Precargar los 4 servicios típicos para el mes con asignación a Mamá y valor estimado
  function handlePrecargarRecibosSeptiembre() {
    const tiposExistentes = (serviciosMes || []).map((s) => s.tipo)
    const serviciosSugeridos = [
      { tipo: 'ENERGIA' as const, nombre: 'Energía / Luz (EPM / CENS)', monto: 140000, dia: '18', consumo: '160 kWh' },
      { tipo: 'GAS' as const, nombre: 'Gas Natural Domiciliario', monto: 35000, dia: '25', consumo: '18 m³' },
      { tipo: 'AGUA' as const, nombre: 'Acueducto & Alcantarillado', monto: 85000, dia: '22', consumo: '15 m³' },
      { tipo: 'INTERNET' as const, nombre: 'Internet Fibra Óptica 300 Mbps', monto: 90000, dia: '12', consumo: '300 Mbps' },
    ]

    let agregados = 0
    serviciosSugeridos.forEach((sug) => {
      if (!tiposExistentes.includes(sug.tipo)) {
        addServicio({
          tipo: sug.tipo,
          nombre: sug.nombre,
          monto: sug.monto,
          fechaVencimiento: `${selectedMonth}-${sug.dia}`,
          pagado: false,
          periodo: selectedMonth,
          consumo: sug.consumo,
          responsablePago: 'MAMA',
          esEstimado: true,
          notas: 'Recibo mensual pagado por Mamá (Valor estimado)',
        })
        agregados++
      }
    })

    if (agregados > 0) {
      showToast('Recibos precargados', `Se agregaron ${agregados} recibos para ${formatMonthYear(selectedMonth)} con pago asignado a Mamá`)
    } else {
      showToast('Recibos ya existentes', 'Los 4 servicios ya están registrados en este mes', 'info')
    }
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

  // Totales desagregados por responsable del gasto
  const totalArriendoAsumidoYo = useMemo(() => {
    return arriendoMes ? arriendoMes.monto : 0
  }, [arriendoMes])

  const totalServiciosMama = useMemo(() => {
    return serviciosMes
      .filter((s) => (s.responsablePago || 'MAMA') === 'MAMA')
      .reduce((acc, s) => acc + s.monto, 0)
  }, [serviciosMes])

  const totalComprasHogar = useMemo(() => {
    return comprasHogarMes.reduce((acc, c) => acc + c.monto, 0)
  }, [comprasHogarMes])

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
          <p>Gestión del arriendo asumido por ti, servicios públicos asumidos por Mamá (Luz, Gas, Agua, Internet) y compras del hogar.</p>
        </div>

        <div className="page-header-actions">
          {activeTab === 'SERVICIOS' && (
            <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
              <button type="button" className="btn secondary sm" onClick={handlePrecargarRecibosSeptiembre}>
                ⚡ Precargar Recibos (Pago Mamá)
              </button>
              <button type="button" className="btn primary sm" onClick={openNewServicioModal}>
                + Agregar Recibo
              </button>
            </div>
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

      {/* Tarjetas de Distribución Familiar de Gastos del Hogar */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '1rem', marginBottom: '1.5rem' }}>
        {/* Card 1: Arriendo asumido por Ti */}
        <div className="panel" style={{ margin: 0, padding: '1rem 1.25rem', borderLeft: '4px solid var(--color-primary-light)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.35rem' }}>
            <span style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--color-text-muted)' }}>👤 Asumido por Ti (Arriendo)</span>
            <span className="badge primary" style={{ fontSize: '0.7rem' }}>Vivienda</span>
          </div>
          <strong style={{ fontSize: '1.4rem', color: 'var(--color-text-main)' }}>
            {formatMoney(totalArriendoAsumidoYo)}
          </strong>
          <span style={{ fontSize: '0.725rem', color: 'var(--color-text-muted)', display: 'block', marginTop: '2px' }}>
            {arriendoMes ? (arriendoMes.pagado ? '✓ Arriendo pagado este mes' : '⏳ Pendiente de pago') : 'Sin registrar este mes'}
          </span>
        </div>

        {/* Card 2: Servicios asumidos por Mamá */}
        <div className="panel" style={{ margin: 0, padding: '1rem 1.25rem', borderLeft: '4px solid #db2777' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.35rem' }}>
            <span style={{ fontSize: '0.8rem', fontWeight: 600, color: '#db2777' }}>👩‍👧 Asumido por Mamá (Servicios)</span>
            <span className="badge" style={{ backgroundColor: 'rgba(219, 39, 119, 0.12)', color: '#db2777', fontSize: '0.7rem' }}>
              4 Recibos
            </span>
          </div>
          <strong style={{ fontSize: '1.4rem', color: '#db2777' }}>
            {formatMoney(totalServiciosMama)}
          </strong>
          <span style={{ fontSize: '0.725rem', color: 'var(--color-text-muted)', display: 'block', marginTop: '2px' }}>
            Luz, Gas, Agua, Internet (No afecta tu liquidez)
          </span>
        </div>

        {/* Card 3: Compras & Total Hogar */}
        <div className="panel" style={{ margin: 0, padding: '1rem 1.25rem', borderLeft: '4px solid var(--color-income)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.35rem' }}>
            <span style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--color-text-muted)' }}>🛒 Compras + Total Hogar</span>
            <span className="badge income" style={{ fontSize: '0.7rem' }}>Total</span>
          </div>
          <strong style={{ fontSize: '1.4rem', color: 'var(--color-text-main)' }}>
            {formatMoney(totalArriendoAsumidoYo + totalServiciosMama + totalComprasHogar)}
          </strong>
          <span style={{ fontSize: '0.725rem', color: 'var(--color-text-muted)', display: 'block', marginTop: '2px' }}>
            Compras hogar: {formatMoney(totalComprasHogar)}
          </span>
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

              const esDeMama = (s.responsablePago || 'MAMA') === 'MAMA'

              return (
                <article
                  key={s.id}
                  className={`service-card ${s.pagado ? 'pagado' : 'pendiente'}`}
                >
                  <div className="service-card-header">
                    <div className="service-card-title-group">
                      <div className="service-icon-badge">{iconEmoji}</div>
                      <div>
                        <strong className="service-card-name">{s.nombre}</strong>
                        <div style={{ display: 'flex', gap: '0.35rem', marginTop: '2px' }}>
                          <span
                            className="badge"
                            style={{
                              fontSize: '0.675rem',
                              padding: '0.15rem 0.45rem',
                              backgroundColor: esDeMama ? 'rgba(219, 39, 119, 0.12)' : 'rgba(59, 130, 246, 0.12)',
                              color: esDeMama ? '#db2777' : '#2563eb',
                              fontWeight: 700,
                            }}
                          >
                            {esDeMama ? '👩‍👧 Paga Mamá' : s.responsablePago === 'COMPARTIDO' ? '🤝 Compartido' : '👤 Pagas Tú'}
                          </span>
                          {s.esEstimado && (
                            <span className="badge neutral" style={{ fontSize: '0.675rem', padding: '0.15rem 0.45rem' }}>
                              ⏳ Estimado
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    <span className={`badge ${s.pagado ? 'income' : 'warning'}`}>
                      {s.pagado ? (esDeMama ? '✓ Pagado por Mamá' : '✓ Pagado') : 'Pendiente'}
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
                      {s.pagado
                        ? 'Marcar como Pendiente'
                        : esDeMama
                        ? '✓ Marcar Pagado por Mamá'
                        : '✓ Registrar Pago'}
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
              <div style={{ display: 'flex', justifyContent: 'center', gap: '0.75rem', marginTop: '1rem', flexWrap: 'wrap' }}>
                <button
                  type="button"
                  className="btn primary sm"
                  onClick={handlePrecargarRecibosSeptiembre}
                >
                  ⚡ Precargar Recibos (Luz, Gas, Agua, Internet - Pago Mamá)
                </button>
                <button
                  type="button"
                  className="btn secondary sm"
                  onClick={openNewServicioModal}
                >
                  + Agregar Recibo Manual
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* TAB 2: ARRIENDO (GASTO FIJO PROGRAMADO) */}
      {activeTab === 'ARRIENDO' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          {/* Card Principal de Arriendo del Mes */}
          {(() => {
            const isPagado = Boolean(arriendoMes?.pagado)
            const montoCanon = arriendoMes ? arriendoMes.monto : (plantillaArriendo?.monto || 1350000)
            const fechaLimiteCanon = arriendoMes ? arriendoMes.fechaLimite : `${selectedMonth}-${diaLimiteArr.padStart(2, '0')}`
            const cuentaActiva = state.cuentas.find((c) => c.id === cuentaPagoArriendoId) || state.cuentas[0]
            const arrendadorContacto = arriendoMes?.arrendador || plantillaArriendo?.arrendador || 'Inmobiliaria El Hogar / Propietario'

            return (
              <div
                className="panel"
                style={{
                  borderLeft: `5px solid ${isPagado ? 'var(--color-income)' : 'var(--color-warning)'}`,
                  background: isPagado
                    ? 'radial-gradient(circle at top right, rgba(16, 185, 129, 0.08), transparent 70%), var(--color-surface)'
                    : 'radial-gradient(circle at top right, rgba(245, 158, 11, 0.08), transparent 70%), var(--color-surface)',
                }}
              >
                <div className="panel-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '0.75rem' }}>
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.25rem' }}>
                      <span style={{ fontSize: '1.3rem' }}>🏠</span>
                      <h2 className="panel-title" style={{ fontSize: '1.25rem' }}>
                        Arriendo de {formatMonthYear(selectedMonth)}
                      </h2>
                    </div>
                    <p style={{ fontSize: '0.85rem', color: 'var(--color-text-muted)' }}>
                      Gasto fijo programado • {arrendadorContacto}
                    </p>
                  </div>

                  <span
                    className={`badge ${isPagado ? 'income' : 'warning'}`}
                    style={{ fontSize: '0.85rem', padding: '0.35rem 0.75rem', fontWeight: 700 }}
                  >
                    {isPagado ? '✓ Arriendo Pagado' : '⏳ Pendiente de Pago'}
                  </span>
                </div>

                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
                    gap: '1.5rem',
                    padding: '1.25rem 0',
                    borderTop: '1px solid var(--color-border)',
                    borderBottom: '1px solid var(--color-border)',
                    margin: '1rem 0',
                  }}
                >
                  {/* Columna 1: Valor y Vencimiento */}
                  <div>
                    <span style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', textTransform: 'uppercase', fontWeight: 700, letterSpacing: '0.04em' }}>
                      Canon Mensual Fijo
                    </span>
                    <div
                      style={{
                        fontFamily: 'var(--font-mono)',
                        fontSize: '2rem',
                        fontWeight: 800,
                        color: 'var(--color-text-main)',
                        lineHeight: 1.1,
                        margin: '0.3rem 0',
                      }}
                    >
                      {formatMoney(montoCanon)}
                    </div>
                    <div style={{ fontSize: '0.85rem', color: 'var(--color-text-muted)' }}>
                      Vence el <strong>{formatDate(fechaLimiteCanon)}</strong>
                      {!isPagado && (
                        <span
                          style={{
                            display: 'block',
                            fontSize: '0.8rem',
                            color: getDaysRemaining(fechaLimiteCanon).isExpired ? 'var(--color-expense)' : 'var(--color-warning-text)',
                            fontWeight: 600,
                            marginTop: '2px',
                          }}
                        >
                          {getDaysRemaining(fechaLimiteCanon).label}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Columna 2: Selector de Cuenta de Pago */}
                  <div>
                    <label style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', textTransform: 'uppercase', fontWeight: 700, letterSpacing: '0.04em', display: 'block', marginBottom: '0.4rem' }}>
                      💳 ¿De dónde se paga el arriendo?
                    </label>
                    <select
                      className="form-select"
                      value={cuentaPagoArriendoId}
                      onChange={(e) => handleCambiarCuentaPagoDirecto(e.target.value)}
                      style={{
                        width: '100%',
                        fontSize: '0.9rem',
                        fontWeight: 600,
                        padding: '0.55rem 0.75rem',
                        borderRadius: 'var(--radius-md)',
                        borderColor: isPagado ? 'rgba(16, 185, 129, 0.4)' : 'var(--color-border-strong)',
                      }}
                    >
                      {state.cuentas.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.nombre} • Saldo: {formatMoney(c.saldo)}
                        </option>
                      ))}
                    </select>

                    {cuentaActiva && (
                      <span style={{ display: 'block', fontSize: '0.75rem', color: 'var(--color-text-muted)', marginTop: '0.4rem' }}>
                        {isPagado ? (
                          <span style={{ color: 'var(--color-income)' }}>
                            ✓ Descontado del saldo de {cuentaActiva.nombre}
                          </span>
                        ) : (
                          <span>
                            Saldo posterior al pago:{' '}
                            <strong style={{ color: cuentaActiva.saldo >= montoCanon ? 'var(--color-income)' : 'var(--color-expense)' }}>
                              {formatMoney(cuentaActiva.saldo - montoCanon)}
                            </strong>
                          </span>
                        )}
                      </span>
                    )}
                  </div>

                  {/* Columna 3: Acción de Pago Rápido */}
                  <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: '0.5rem' }}>
                    {isPagado ? (
                      <div
                        style={{
                          padding: '0.85rem',
                          backgroundColor: 'rgba(16, 185, 129, 0.1)',
                          border: '1px solid rgba(16, 185, 129, 0.3)',
                          borderRadius: 'var(--radius-md)',
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#059669', fontWeight: 700, fontSize: '0.9rem' }}>
                          <span>✓</span>
                          <span>Pagado el {formatDate(arriendoMes?.fechaPago || new Date().toISOString().slice(0, 10))}</span>
                        </div>
                        <span style={{ fontSize: '0.78rem', color: 'var(--color-text-muted)', display: 'block', marginTop: '2px' }}>
                          Medio de pago: <strong>{cuentaActiva?.nombre || 'Cuenta'}</strong>
                        </span>
                      </div>
                    ) : (
                      <button
                        type="button"
                        className="btn success"
                        onClick={handleEjecutarPagoArriendo}
                        style={{
                          fontSize: '0.95rem',
                          fontWeight: 700,
                          padding: '0.75rem 1.25rem',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          gap: '0.5rem',
                          boxShadow: '0 4px 12px rgba(16, 185, 129, 0.3)',
                        }}
                      >
                        <span>✓</span>
                        <span>Pagar {formatMoney(montoCanon)} con {cuentaActiva?.nombre || 'Cuenta'}</span>
                      </button>
                    )}

                    <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end', marginTop: '0.25rem' }}>
                      {isPagado && (
                        <button
                          type="button"
                          className="btn secondary sm"
                          onClick={() => {
                            if (arriendoMes) togglePagoArriendo(arriendoMes.id, cuentaPagoArriendoId)
                          }}
                          title="Devuelve el saldo a la cuenta y marca como pendiente"
                        >
                          Revertir Pago
                        </button>
                      )}
                      <button
                        type="button"
                        className="btn ghost sm"
                        onClick={() => {
                          if (arriendoMes) {
                            openEditArriendoModal(arriendoMes)
                          } else {
                            openNewArriendoModal()
                          }
                        }}
                      >
                        ⚙️ Ajustar Canon
                      </button>
                    </div>
                  </div>
                </div>

                {(arriendoMes?.notas || plantillaArriendo?.notas) && (
                  <div style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                    <span>📝</span>
                    <span>{arriendoMes?.notas || plantillaArriendo?.notas}</span>
                  </div>
                )}
              </div>
            )
          })()}

          {/* Histórico de Arriendos */}
          <div className="panel">
            <div className="panel-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.5rem' }}>
              <div>
                <h3 className="panel-title" style={{ fontSize: '1.05rem' }}>
                  Historial de Pagos de Arriendo
                </h3>
                <span style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)' }}>
                  Registro mensual de pagos de vivienda y cuentas utilizadas.
                </span>
              </div>
              <button type="button" className="btn secondary sm" onClick={openNewArriendoModal}>
                + Agregar / Registrar Otro Mes
              </button>
            </div>

            <div className="table-container">
              <table className="table-wide">
                <thead>
                  <tr>
                    <th>Mes</th>
                    <th>Canon</th>
                    <th>Fecha Límite</th>
                    <th>Cuenta de Pago</th>
                    <th>Estado</th>
                    <th>Fecha de Pago</th>
                    <th style={{ textAlign: 'right' }}>Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {(state.arriendos || []).map((a) => {
                    const cuentaUsada = state.cuentas.find((c) => c.id === a.cuentaId)

                    return (
                      <tr key={a.id}>
                        <td><strong>{formatMonthYear(a.mesCorrespondiente)}</strong></td>
                        <td style={{ fontFamily: 'var(--font-mono)', fontWeight: 700 }}>{formatMoney(a.monto)}</td>
                        <td style={{ fontSize: '0.825rem', color: 'var(--color-text-muted)' }}>{formatDate(a.fechaLimite)}</td>
                        <td>
                          {cuentaUsada ? (
                            <span className="badge neutral" style={{ fontSize: '0.75rem', fontWeight: 600 }}>
                              {cuentaUsada.nombre}
                            </span>
                          ) : (
                            <span style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>—</span>
                          )}
                        </td>
                        <td>
                          <span className={`badge ${a.pagado ? 'income' : 'expense'}`} style={{ fontSize: '0.75rem' }}>
                            {a.pagado ? '✓ Pagado' : '⏳ Pendiente'}
                          </span>
                        </td>
                        <td style={{ fontSize: '0.825rem', color: a.fechaPago ? 'var(--color-income)' : 'var(--color-text-muted)' }}>
                          {a.fechaPago ? formatDate(a.fechaPago) : '—'}
                        </td>
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
                            className="btn ghost sm icon-only"
                            style={{ color: 'var(--color-expense)' }}
                            onClick={() => {
                              if (confirm(`¿Eliminar arriendo de ${formatMonthYear(a.mesCorrespondiente)}?`)) {
                                deleteArriendo(a.id)
                              }
                            }}
                            title="Eliminar"
                            aria-label="Eliminar"
                          >
                            ✕
                          </button>
                        </td>
                      </tr>
                    )
                  })}
                  {(state.arriendos || []).length === 0 && (
                    <tr>
                      <td colSpan={7} style={{ textAlign: 'center', padding: '2.5rem', color: 'var(--color-text-muted)' }}>
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
                <label>Cuenta de Pago (Si pagas tú)</label>
                <select className="form-select" value={cuentaServId} onChange={(e) => setCuentaServId(e.target.value)} disabled={responsableServ === 'MAMA'}>
                  {(state.cuentas || []).map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.nombre}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* SECCIÓN DE RESPONSABILIDAD DEL PAGO (MAMÁ vs YO) */}
            <div className="form-group" style={{ backgroundColor: 'var(--color-bg-alt)', padding: '0.85rem 1rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--color-border)' }}>
              <label style={{ fontWeight: 700, marginBottom: '0.4rem', display: 'block' }}>
                ¿Quién asume y paga este recibo? *
              </label>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.65rem' }}>
                <button
                  type="button"
                  className={`btn sm ${responsableServ === 'MAMA' ? 'primary' : 'secondary'}`}
                  onClick={() => setResponsableServ('MAMA')}
                  style={{
                    justifyContent: 'center',
                    backgroundColor: responsableServ === 'MAMA' ? '#db2777' : undefined,
                    borderColor: responsableServ === 'MAMA' ? '#db2777' : undefined,
                    color: responsableServ === 'MAMA' ? '#ffffff' : undefined,
                  }}
                >
                  👩‍👧 Mamá (Madre)
                </button>
                <button
                  type="button"
                  className={`btn sm ${responsableServ === 'YO' ? 'primary' : 'secondary'}`}
                  onClick={() => setResponsableServ('YO')}
                  style={{ justifyContent: 'center' }}
                >
                  👤 Yo (Usuario)
                </button>
              </div>
              <span style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', display: 'block', marginTop: '0.45rem' }}>
                {responsableServ === 'MAMA'
                  ? '💡 Lo paga Mamá: Al marcarlo como pagado NO descontará dinero de tus cuentas bancarias.'
                  : '💳 Lo pagas tú: Al marcarlo como pagado se debitará de tu cuenta seleccionada.'}
              </span>
            </div>

            {/* CHECKBOX DE ESTIMADO SI NO HA LLEGADO LA FACTURA */}
            <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', padding: '0.25rem 0' }}>
              <input
                type="checkbox"
                checked={esEstimadoServ}
                onChange={(e) => setEsEstimadoServ(e.target.checked)}
              />
              <span style={{ fontSize: '0.85rem', color: 'var(--color-text-main)' }}>
                ⏳ Aún no ha llegado el recibo (Marcar como valor estimado pendiente)
              </span>
            </label>

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
