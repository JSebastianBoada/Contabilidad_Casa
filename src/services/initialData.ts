import type {
  ArriendoVivienda,
  CompraCuota,
  CompraHogar,
  CuentaFinanciera,
  GastoAlimentacion,
  GastoPersonal,
  GastoRecurrenteFijo,
  IngresoPersonal,
  PresupuestoCategoria,
  ServicioPublico,
  TarjetaCredito,
} from '../types/finance'
const hoy = new Date()
const currentMonth = `${hoy.getFullYear()}-${String(hoy.getMonth() + 1).padStart(2, '0')}`

export const initialCuentas: CuentaFinanciera[] = [
  {
    id: 'cuenta-bancolombia',
    nombre: 'Bancolombia Ahorros',
    tipo: 'BANCO',
    saldo: 2850000,
    numero: '•••• 4589',
    color: '#3b82f6',
    icono: 'landmark',
  },
  {
    id: 'cuenta-nequi',
    nombre: 'Nequi',
    tipo: 'BILLETERA_DIGITAL',
    saldo: 640000,
    numero: '312 ••• 8841',
    color: '#8b5cf6',
    icono: 'smartphone',
  },
  {
    id: 'cuenta-hermano',
    nombre: 'Fondo Hermano (Almuerzos & Aportes)',
    tipo: 'BILLETERA_DIGITAL',
    saldo: 0,
    numero: 'Bolsillo / Hermano',
    color: '#06b6d4',
    icono: 'wallet',
  },
  {
    id: 'cuenta-daviplata',
    nombre: 'Daviplata',
    tipo: 'BILLETERA_DIGITAL',
    saldo: 230000,
    numero: '312 ••• 8841',
    color: '#ef4444',
    icono: 'smartphone',
  },
  {
    id: 'cuenta-efectivo',
    nombre: 'Efectivo en Mano / Billetera',
    tipo: 'EFECTIVO',
    saldo: 185000,
    color: '#10b981',
    icono: 'wallet',
  },
]

export const initialArriendos: ArriendoVivienda[] = [
  {
    id: 'arr-1',
    mesCorrespondiente: currentMonth,
    monto: 1350000,
    fechaLimite: `${currentMonth}-05`,
    pagado: true,
    fechaPago: `${currentMonth}-03`,
    cuentaId: 'cuenta-bancolombia',
    arrendador: 'Inmobiliaria El Hogar / Propietario',
    notas: 'Incluye pago de administración del edificio',
  },
]

export const initialServicios: ServicioPublico[] = [
  {
    id: 'serv-energia',
    tipo: 'ENERGIA',
    nombre: 'Energía / Luz (EPM / Enel)',
    monto: 142000,
    fechaVencimiento: `${currentMonth}-18`,
    pagado: false,
    periodo: currentMonth,
    cuentaId: 'cuenta-bancolombia',
    consumo: '165 kWh',
    notas: 'Factura mensual de electricidad',
  },
  {
    id: 'serv-agua',
    tipo: 'AGUA',
    nombre: 'Acueducto & Alcantarillado',
    monto: 86500,
    fechaVencimiento: `${currentMonth}-22`,
    pagado: false,
    periodo: currentMonth,
    cuentaId: 'cuenta-nequi',
    consumo: '14 m³',
    notas: 'Consumo normal del mes',
  },
  {
    id: 'serv-gas',
    tipo: 'GAS',
    nombre: 'Gas Natural Domiciliario',
    monto: 34200,
    fechaVencimiento: `${currentMonth}-25`,
    pagado: false,
    periodo: currentMonth,
    cuentaId: 'cuenta-nequi',
    consumo: '18 m³',
    notas: 'Cocina y calentador',
  },
  {
    id: 'serv-internet',
    tipo: 'INTERNET',
    nombre: 'Internet Fibra Óptica 300 Mbps',
    monto: 89900,
    fechaVencimiento: `${currentMonth}-12`,
    pagado: true,
    fechaPago: `${currentMonth}-10`,
    periodo: currentMonth,
    cuentaId: 'cuenta-bancolombia',
    consumo: 'Plan 300 Megas + TV',
    notas: 'Pago automático domiciliado',
  },
]

export const initialComprasHogar: CompraHogar[] = []

export const initialAlimentacion: GastoAlimentacion[] = []

export const initialIngresos: IngresoPersonal[] = []

export const initialGastosPersonales: GastoPersonal[] = []

export const initialTarjetas: TarjetaCredito[] = [
  {
    id: 'tc-nu',
    nombre: 'Nu Gold',
    banco: 'Nu Colombia',
    ultimos4Digitos: '7899',
    franquicia: 'MASTERCARD',
    cupoTotal: 2000000,
    diaCorte: 15,
    diaLimitePago: 4,
    tasaInteresMensual: 2.10,
    color: '#820ad1',
  },
  {
    id: 'tc-bancolombia',
    nombre: 'Bancolombia Clásica',
    banco: 'Bancolombia',
    ultimos4Digitos: '1234',
    franquicia: 'MASTERCARD',
    cupoTotal: 1200000,
    diaCorte: 17,
    diaLimitePago: 2,
    tasaInteresMensual: 2.10,
    color: '#f59e0b',
  },
]

export const initialComprasCuotas: CompraCuota[] = []

export const initialPresupuestos: PresupuestoCategoria[] = [
  {
    id: 'pres-hogar',
    mes: currentMonth,
    categoriaClave: 'HOGAR_TOTAL',
    nombre: 'Vivienda y Arriendo',
    grupo: 'HOGAR',
    limiteMonto: 1400000,
  },
  {
    id: 'pres-servicios',
    mes: currentMonth,
    categoriaClave: 'SERVICIOS_PUBLICOS',
    nombre: 'Servicios Públicos e Internet',
    grupo: 'SERVICIOS',
    limiteMonto: 380000,
  },
  {
    id: 'pres-alim',
    mes: currentMonth,
    categoriaClave: 'ALIMENTACION_TOTAL',
    nombre: 'Mercado y Alimentación del Hogar',
    grupo: 'ALIMENTACION',
    limiteMonto: 850000,
  },
  {
    id: 'pres-personal',
    mes: currentMonth,
    categoriaClave: 'PERSONAL_OCIO',
    nombre: 'Finanzas Personales, Salidas y Ocio',
    grupo: 'PERSONAL',
    limiteMonto: 450000,
  },
  {
    id: 'pres-tarjetas',
    mes: currentMonth,
    categoriaClave: 'CUOTAS_TARJETAS',
    nombre: 'Cuotas de Tarjetas de Crédito',
    grupo: 'TARJETAS',
    limiteMonto: 400000,
  },
]

export const initialGastosRecurrentes: GastoRecurrenteFijo[] = [
  {
    id: 'rec-parqueadero',
    nombre: '🅿️ Parqueadero mensual',
    categoria: 'PARQUEADERO',
    monto: 30000,
    diaCobro: 5,
    metodoPago: 'CUENTA_DEBITO',
    cuentaId: 'cuenta-bancolombia',
    activo: true,
    notas: 'Pago mensual del parqueadero',
  },
  {
    id: 'rec-celular',
    nombre: '📱 Plan Celular Móvil',
    categoria: 'CELULAR',
    monto: 45000,
    diaCobro: 10,
    metodoPago: 'TARJETA_CREDITO',
    tarjetaId: 'tc-nu',
    activo: true,
    notas: 'Plan pospago con tarjeta a 1 cuota',
  },
  {
    id: 'rec-netflix',
    nombre: '🎬 Netflix Plan Estándar',
    categoria: 'SUSCRIPCIONES',
    monto: 35000,
    diaCobro: 15,
    metodoPago: 'TARJETA_CREDITO',
    tarjetaId: 'tc-nu',
    activo: true,
    notas: 'Streaming con tarjeta a 1 cuota',
  },
  {
    id: 'rec-crunchyroll',
    nombre: '🍙 Crunchyroll Fan',
    categoria: 'SUSCRIPCIONES',
    monto: 15000,
    diaCobro: 20,
    metodoPago: 'TARJETA_CREDITO',
    tarjetaId: 'tc-nu',
    activo: true,
    notas: 'Anime streaming mensual',
  },
  {
    id: 'rec-spotify',
    nombre: '🎵 Spotify Premium',
    categoria: 'SUSCRIPCIONES',
    monto: 18000,
    diaCobro: 25,
    metodoPago: 'TARJETA_CREDITO',
    tarjetaId: 'tc-bancolombia',
    activo: true,
    notas: 'Música mensual',
  },
]

