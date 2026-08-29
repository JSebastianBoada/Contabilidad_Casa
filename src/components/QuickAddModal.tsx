import { useState, type FormEvent } from 'react'
import { Modal } from './Modal'
import { DatePickerInput } from './DatePickerInput'
import { useFinance } from '../context/FinanceContext'
import { formatMoney } from '../utils/formatters'
import { calcularCuotaMensual } from '../utils/financialCalculations'

interface QuickAddModalProps {
  isOpen: boolean
  onClose: () => void
}

type MainCategory = 'ALIMENTACION' | 'HOGAR' | 'PERSONAL_GASTO' | 'INGRESO' | 'TARJETA_CUOTA'

export function QuickAddModal({ isOpen, onClose }: QuickAddModalProps) {
  const {
    state,
    selectedMonth,
    addAlimentacion,
    addCompraHogar,
    addServicio,
    addIngreso,
    addGastoPersonal,
    addCompraCuota,
  } = useFinance()

  const [category, setCategory] = useState<MainCategory>('ALIMENTACION')
  const [fecha, setFecha] = useState(new Date().toISOString().slice(0, 10))
  const [monto, setMonto] = useState('')
  const [descripcion, setDescripcion] = useState('')
  const [medioPago, setMedioPago] = useState(
    state.cuentas[0] ? `cuenta:${state.cuentas[0].id}` : state.tarjetas[0] ? `tarjeta:${state.tarjetas[0].id}` : ''
  )

  // Specific subcategories
  const [tipoComida, setTipoComida] = useState<'DESAYUNO' | 'ALMUERZO' | 'COMIDA' | 'MERCADO_GENERAL'>('ALMUERZO')
  const [beneficiarioComida, setBeneficiarioComida] = useState<'YO' | 'HERMANO' | 'AMBOS' | 'FAMILIA'>('AMBOS')
  const [subHogar, setSubHogar] = useState<'COMPRA' | 'SERVICIO'>('COMPRA')
  const [categoriaHogar, setCategoriaHogar] = useState<'ASEO' | 'MANTENIMIENTO' | 'ELECTRODOMESTICOS' | 'MUEBLES' | 'OTRO'>('ASEO')
  const [tipoServicio, setTipoServicio] = useState<'ENERGIA' | 'GAS' | 'AGUA' | 'INTERNET' | 'OTRO'>('ENERGIA')
  const [catPersonal, setCatPersonal] = useState<'CELULAR' | 'GASOLINA' | 'RESTAURANTES_COMIDAS_FUERA' | 'PARTIDOS_OCIO_EVENTOS' | 'REGALOS' | 'SUSCRIPCIONES' | 'OTROS'>('CELULAR')
  const [tipoIngreso, setTipoIngreso] = useState<'NOMINA' | 'HORAS_EXTRAS' | 'BONIFICACION' | 'FREELANCE' | 'OTRO'>('NOMINA')

  // Tarjetas
  const [tarjetaId, setTarjetaId] = useState(state.tarjetas[0]?.id || '')
  const [cuotasTotales, setCuotasTotales] = useState('1')
  const [tasaInteres, setTasaInteres] = useState('0')

  function handleSubmit(e: FormEvent) {
    e.preventDefault()
    const numericMonto = Number(monto)
    if (!numericMonto || numericMonto <= 0) return

    const isTarjeta = medioPago.startsWith('tarjeta:')
    const selectedTarjetaId = isTarjeta ? medioPago.replace('tarjeta:', '') : undefined
    const selectedCuentaId = !isTarjeta ? medioPago.replace('cuenta:', '') : undefined

    if (category === 'ALIMENTACION') {
      addAlimentacion({
        fecha,
        tipoComida,
        descripcion: descripcion || `Gasto de ${tipoComida.toLowerCase()}`,
        monto: numericMonto,
        cuentaId: selectedCuentaId,
        tarjetaId: selectedTarjetaId,
        metodoPago: isTarjeta ? 'TARJETA_CREDITO' : 'CUENTA_DEBITO',
        esMercadoGrande: tipoComida === 'MERCADO_GENERAL',
        beneficiario: beneficiarioComida,
        numeroPorciones: beneficiarioComida === 'AMBOS' ? 2 : 1,
        precioUnitario: beneficiarioComida === 'AMBOS' ? Math.round(numericMonto / 2) : numericMonto,
      })
    } else if (category === 'HOGAR') {
      if (subHogar === 'COMPRA') {
        addCompraHogar({
          fecha,
          descripcion: descripcion || 'Compra de hogar',
          monto: numericMonto,
          categoria: categoriaHogar,
          cuentaId: selectedCuentaId,
          tarjetaId: selectedTarjetaId,
          metodoPago: isTarjeta ? 'TARJETA_CREDITO' : 'CUENTA_DEBITO',
        })
      } else {
        addServicio({
          tipo: tipoServicio,
          nombre: descripcion || `Servicio de ${tipoServicio}`,
          monto: numericMonto,
          fechaVencimiento: fecha,
          pagado: true,
          fechaPago: fecha,
          periodo: selectedMonth,
          cuentaId: selectedCuentaId,
          tarjetaId: selectedTarjetaId,
          metodoPago: isTarjeta ? 'TARJETA_CREDITO' : 'CUENTA_DEBITO',
        })
      }
    } else if (category === 'PERSONAL_GASTO') {
      addGastoPersonal({
        fecha,
        categoria: catPersonal,
        descripcion: descripcion || 'Gasto personal',
        monto: numericMonto,
        cuentaId: selectedCuentaId,
        tarjetaId: selectedTarjetaId,
        metodoPago: isTarjeta ? 'TARJETA_CREDITO' : 'CUENTA_DEBITO',
        cuotas: isTarjeta ? 1 : undefined,
      })
    } else if (category === 'INGRESO') {
      addIngreso({
        fecha,
        tipo: tipoIngreso,
        descripcion: descripcion || 'Ingreso personal',
        monto: numericMonto,
        periodo: 'PUNTUAL',
        cuentaId: selectedCuentaId || state.cuentas[0]?.id || '',
      })
    } else if (category === 'TARJETA_CUOTA') {
      const cuotas = Math.max(1, Number(cuotasTotales) || 1)
      const tasa = Number(tasaInteres) || 0
      addCompraCuota({
        tarjetaId,
        descripcion: descripcion || 'Compra con tarjeta de crédito',
        fechaCompra: fecha,
        montoTotal: numericMonto,
        cuotasTotales: cuotas,
        tasaInteresMensual: tasa,
        fechaInicioCobro: selectedMonth,
      })
    }

    // Reset fields
    setMonto('')
    setDescripcion('')
    onClose()
  }

  // Previsualización de cuota calculada si es tarjeta
  const cuotaProyectada =
    category === 'TARJETA_CUOTA' && Number(monto) > 0
      ? calcularCuotaMensual(Number(monto), Number(cuotasTotales) || 1, Number(tasaInteres) || 0)
      : 0

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="⚡ Registrar Movimiento Rápido" maxWidth="580px">
      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.2rem' }}>
        {/* Selector de Categoría Principal */}
        <div className="form-group">
          <label>Tipo de Operación</label>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(100px, 1fr))', gap: '0.4rem' }}>
            <button
              type="button"
              className={`btn sm ${category === 'ALIMENTACION' ? 'primary' : 'secondary'}`}
              onClick={() => setCategory('ALIMENTACION')}
            >
              🍲 Comida
            </button>
            <button
              type="button"
              className={`btn sm ${category === 'HOGAR' ? 'primary' : 'secondary'}`}
              onClick={() => setCategory('HOGAR')}
            >
              🏠 Hogar
            </button>
            <button
              type="button"
              className={`btn sm ${category === 'PERSONAL_GASTO' ? 'primary' : 'secondary'}`}
              onClick={() => setCategory('PERSONAL_GASTO')}
            >
              🎉 Personal
            </button>
            <button
              type="button"
              className={`btn sm ${category === 'INGRESO' ? 'primary' : 'secondary'}`}
              onClick={() => setCategory('INGRESO')}
            >
              💰 Ingreso
            </button>
            <button
              type="button"
              className={`btn sm ${category === 'TARJETA_CUOTA' ? 'primary' : 'secondary'}`}
              onClick={() => setCategory('TARJETA_CUOTA')}
            >
              💳 Tarjeta
            </button>
          </div>
        </div>

        {/* Campos Condicionales según Categoría */}
        {category === 'ALIMENTACION' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
            {/* Presets rápidos de 1 clic */}
            <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap' }}>
              <button
                type="button"
                className="btn secondary sm"
                style={{ fontSize: '0.725rem' }}
                onClick={() => {
                  setTipoComida('ALMUERZO')
                  setBeneficiarioComida('YO')
                  setMonto('9000')
                  setDescripcion('1 Almuerzo Corrientazo (Yo)')
                }}
              >
                👤 1 Corrientazo ($9k)
              </button>
              <button
                type="button"
                className="btn secondary sm"
                style={{ fontSize: '0.725rem' }}
                onClick={() => {
                  setTipoComida('ALMUERZO')
                  setBeneficiarioComida('YO')
                  setMonto('14000')
                  setDescripcion('1 Almuerzo Ejecutivo (Yo)')
                }}
              >
                👤 1 Ejecutivo ($14k)
              </button>
              <button
                type="button"
                className="btn primary sm"
                style={{ fontSize: '0.725rem' }}
                onClick={() => {
                  setTipoComida('ALMUERZO')
                  setBeneficiarioComida('AMBOS')
                  setMonto('18000')
                  setDescripcion('2 Almuerzos Corrientazos (Yo + Hermano)')
                }}
              >
                👥 2 Corrientazos ($18k)
              </button>
              <button
                type="button"
                className="btn primary sm"
                style={{ fontSize: '0.725rem' }}
                onClick={() => {
                  setTipoComida('ALMUERZO')
                  setBeneficiarioComida('AMBOS')
                  setMonto('28000')
                  setDescripcion('2 Almuerzos Ejecutivos (Yo + Hermano)')
                }}
              >
                👥 2 Ejecutivos ($28k)
              </button>
            </div>

            <div className="form-grid">
              <div className="form-group">
                <label>Tipo de Alimentación</label>
                <select
                  className="form-select"
                  value={tipoComida}
                  onChange={(e) => setTipoComida(e.target.value as typeof tipoComida)}
                >
                  <option value="ALMUERZO">🥗 Almuerzo / Menú del día</option>
                  <option value="DESAYUNO">🍳 Desayuno / Panadería / Cafés</option>
                  <option value="COMIDA">🍲 Comida / Cena en casa</option>
                  <option value="MERCADO_GENERAL">🛒 Mercado Grande (Supermercado)</option>
                </select>
              </div>

              <div className="form-group">
                <label>¿Para quién es?</label>
                <select
                  className="form-select"
                  value={beneficiarioComida}
                  onChange={(e) => setBeneficiarioComida(e.target.value as typeof beneficiarioComida)}
                >
                  <option value="AMBOS">👥 Ambos (Yo + Mi hermano)</option>
                  <option value="YO">👤 Solo para mí</option>
                  <option value="HERMANO">👦 Para mi hermano</option>
                  <option value="FAMILIA">👨‍👩‍👧 Familiar</option>
                </select>
              </div>
            </div>
          </div>
        )}

        {category === 'HOGAR' && (
          <div className="form-grid">
            <div className="form-group">
              <label>Subtipo Hogar</label>
              <select
                className="form-select"
                value={subHogar}
                onChange={(e) => setSubHogar(e.target.value as typeof subHogar)}
              >
                <option value="COMPRA">🛒 Compra de Hogar (Aseo, Muebles)</option>
                <option value="SERVICIO">💡 Pago de Servicio Público</option>
              </select>
            </div>
            {subHogar === 'COMPRA' ? (
              <div className="form-group">
                <label>Categoría</label>
                <select
                  className="form-select"
                  value={categoriaHogar}
                  onChange={(e) => setCategoriaHogar(e.target.value as typeof categoriaHogar)}
                >
                  <option value="ASEO">Aseo y Limpieza</option>
                  <option value="MANTENIMIENTO">Mantenimiento y Reparación</option>
                  <option value="ELECTRODOMESTICOS">Electrodomésticos</option>
                  <option value="MUEBLES">Muebles y Hogar</option>
                  <option value="OTRO">Otro</option>
                </select>
              </div>
            ) : (
              <div className="form-group">
                <label>Servicio</label>
                <select
                  className="form-select"
                  value={tipoServicio}
                  onChange={(e) => setTipoServicio(e.target.value as typeof tipoServicio)}
                >
                  <option value="ENERGIA">⚡ Energía / Luz</option>
                  <option value="GAS">🔥 Gas Natural</option>
                  <option value="AGUA">💧 Agua / Acueducto</option>
                  <option value="INTERNET">🌐 Internet / TV</option>
                  <option value="OTRO">Otro Servicio</option>
                </select>
              </div>
            )}
          </div>
        )}

        {category === 'PERSONAL_GASTO' && (
          <div className="form-group">
            <label>Tipo de Gasto Personal</label>
            <select
              className="form-select"
              value={catPersonal}
              onChange={(e) => setCatPersonal(e.target.value as typeof catPersonal)}
            >
              <option value="PARQUEADERO">🅿️ Parqueadero / Estacionamiento</option>
              <option value="CELULAR">📱 Servicio de Celular / Plan Móvil</option>
              <option value="GASOLINA">⛽ Gasolina / Combustible / Tanqueo</option>
              <option value="SUSCRIPCIONES">📺 Suscripciones (Netflix, Crunchyroll, Spotify, Gym)</option>
              <option value="RESTAURANTES_COMIDAS_FUERA">🍔 Salidas a comer / Restaurantes / Domicilios</option>
              <option value="PARTIDOS_OCIO_EVENTOS">⚽ Partidos / Canchas / Ocio / Eventos / Cine</option>
              <option value="REGALOS">🎁 Regalos y Cumpleaños</option>
              <option value="OTROS">Otros Gastos Personales</option>
            </select>
          </div>
        )}

        {category === 'INGRESO' && (
          <div className="form-group">
            <label>Tipo de Entrada</label>
            <select
              className="form-select"
              value={tipoIngreso}
              onChange={(e) => setTipoIngreso(e.target.value as typeof tipoIngreso)}
            >
              <option value="NOMINA">💼 Nómina / Salario Fijo</option>
              <option value="HORAS_EXTRAS">⏰ Horas Extras / Recargos</option>
              <option value="BONIFICACION">🌟 Bonificación</option>
              <option value="FREELANCE">💻 Trabajo Independiente / Freelance</option>
              <option value="OTRO">Otra Entrada</option>
            </select>
          </div>
        )}

        {category === 'TARJETA_CUOTA' && (
          <div className="form-grid">
            <div className="form-group">
              <label>Tarjeta de Crédito</label>
              <select
                className="form-select"
                value={tarjetaId}
                onChange={(e) => setTarjetaId(e.target.value)}
              >
                {state.tarjetas.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.nombre} (•••• {t.ultimos4Digitos})
                  </option>
                ))}
              </select>
            </div>
            <div className="form-group">
              <label>Número de Cuotas</label>
              <input
                type="number"
                min="1"
                max="48"
                className="form-input"
                value={cuotasTotales}
                onChange={(e) => setCuotasTotales(e.target.value)}
                required
              />
            </div>
            <div className="form-group">
              <label>Tasa Interés Mensual % (0 para promo)</label>
              <input
                type="number"
                step="0.01"
                min="0"
                className="form-input"
                value={tasaInteres}
                onChange={(e) => setTasaInteres(e.target.value)}
              />
            </div>
          </div>
        )}

        {/* Monto y Descripción */}
        <div className="form-grid">
          <div className="form-group">
            <label>Monto Total ($ COP) *</label>
            <input
              type="number"
              className="form-input"
              placeholder="Ej: 50000"
              value={monto}
              onChange={(e) => setMonto(e.target.value)}
              required
            />
          </div>

          <DatePickerInput
            label="Fecha del Movimiento"
            value={fecha}
            onChange={setFecha}
            selectedMonthContext={selectedMonth}
            required
          />
        </div>

        <div className="form-group">
          <label>Descripción / Detalle</label>
          <input
            type="text"
            className="form-input"
            placeholder="Ej: Almuerzo con compañeros, Pago recibo, Tanqueada, etc."
            value={descripcion}
            onChange={(e) => setDescripcion(e.target.value)}
          />
        </div>

        {category !== 'TARJETA_CUOTA' && (
          <div className="form-group">
            <label>Medio de Pago *</label>
            <select
              className="form-select"
              value={medioPago}
              onChange={(e) => setMedioPago(e.target.value)}
            >
              {category !== 'INGRESO' && state.tarjetas.length > 0 && (
                <optgroup label="💳 Tarjetas de Crédito (1 Cuota - Mes a Mes)">
                  {state.tarjetas.map((t) => (
                    <option key={t.id} value={`tarjeta:${t.id}`}>
                      💳 {t.nombre} (•••• {t.ultimos4Digitos}) - 1 Cuota
                    </option>
                  ))}
                </optgroup>
              )}
              {state.cuentas.length > 0 && (
                <optgroup label={category === 'INGRESO' ? '🏦 Cuenta de Depósito' : '🏦 Cuentas de Ahorros / Billeteras'}>
                  {state.cuentas.map((c) => (
                    <option key={c.id} value={`cuenta:${c.id}`}>
                      🏦 {c.nombre} (Saldo: {formatMoney(c.saldo)})
                    </option>
                  ))}
                </optgroup>
              )}
            </select>
          </div>
        )}

        {/* Resumen de Cuota Calculada */}
        {category === 'TARJETA_CUOTA' && cuotaProyectada > 0 && (
          <div className="banner info" style={{ fontSize: '0.85rem' }}>
            <span>
              💡 <strong>Cálculo Financiero:</strong> Pagarás <strong>{cuotasTotales} cuotas</strong> de aproximadamente{' '}
              <strong>{formatMoney(cuotaProyectada)}</strong> al mes.
            </span>
          </div>
        )}

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '0.5rem' }}>
          <button type="button" className="btn secondary" onClick={onClose}>
            Cancelar
          </button>
          <button type="submit" className="btn success">
            Guardar Registro
          </button>
        </div>
      </form>
    </Modal>
  )
}
