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

export const initialCuentas: CuentaFinanciera[] = [
  {
    id: 'cuenta-bancolombia',
    nombre: 'Bancolombia Ahorros',
    tipo: 'BANCO',
    saldo: 0,
    numero: '4589',
    color: '#3b82f6',
    icono: 'landmark',
  },
  {
    id: 'cuenta-nequi',
    nombre: 'Nequi',
    tipo: 'BILLETERA_DIGITAL',
    saldo: 0,
    numero: '312 8841',
    color: '#8b5cf6',
    icono: 'smartphone',
  },
  {
    id: 'cuenta-hermano',
    nombre: 'Fondo Hermano (Almuerzos & Aportes)',
    tipo: 'BILLETERA_DIGITAL',
    saldo: 0,
    numero: 'Bolsillo Hermano',
    color: '#06b6d4',
    icono: 'wallet',
  },
  {
    id: 'cuenta-daviplata',
    nombre: 'Daviplata',
    tipo: 'BILLETERA_DIGITAL',
    saldo: 0,
    numero: '312 8841',
    color: '#ef4444',
    icono: 'smartphone',
  },
  {
    id: 'cuenta-efectivo',
    nombre: 'Efectivo en Mano',
    tipo: 'EFECTIVO',
    saldo: 0,
    color: '#10b981',
    icono: 'wallet',
  },
]

export const initialArriendos: ArriendoVivienda[] = []

export const initialServicios: ServicioPublico[] = []

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

export const initialPresupuestos: PresupuestoCategoria[] = []

export const initialGastosRecurrentes: GastoRecurrenteFijo[] = []
