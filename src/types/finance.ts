export type Dinero = number

export type TipoCuenta = 'BANCO' | 'BILLETERA_DIGITAL' | 'EFECTIVO'

export interface CuentaFinanciera {
  id: string
  nombre: string
  tipo: TipoCuenta
  saldo: Dinero
  numero?: string
  color?: string
  icono?: string
}

export type TipoServicioPublico = 'ENERGIA' | 'GAS' | 'AGUA' | 'INTERNET' | 'OTRO'

export type ResponsableGastoHogar = 'YO' | 'MAMA' | 'COMPARTIDO'

export interface ServicioPublico {
  id: string
  tipo: TipoServicioPublico
  nombre: string
  monto: Dinero
  fechaVencimiento: string
  fechaPago?: string
  pagado: boolean
  periodo: string // Ej: '2026-08'
  cuentaId?: string
  tarjetaId?: string
  metodoPago?: MetodoPago
  responsablePago?: ResponsableGastoHogar // 'MAMA' por defecto para servicios
  esEstimado?: boolean // Si aún no llega el recibo y es aproximado
  consumo?: string // Ej: '180 kWh', '25 m3', '300 Mbps'
  notas?: string
}

export interface ArriendoVivienda {
  id: string
  fechaLimite: string
  monto: Dinero
  mesCorrespondiente: string // '2026-08'
  pagado: boolean
  fechaPago?: string
  cuentaId?: string
  tarjetaId?: string
  metodoPago?: MetodoPago
  responsablePago?: ResponsableGastoHogar // 'YO' por defecto para arriendo
  arrendador?: string
  notas?: string
}

export type CategoriaCompraHogar =
  | 'ASEO'
  | 'MANTENIMIENTO'
  | 'ELECTRODOMESTICOS'
  | 'MUEBLES'
  | 'DECORACION'
  | 'HERRAMIENTAS'
  | 'FARMACIA_BOTIQUIN'
  | 'OTRO'

export interface CompraHogar {
  id: string
  fecha: string
  descripcion: string
  monto: Dinero
  categoria: CategoriaCompraHogar
  cuentaId?: string
  tarjetaId?: string
  metodoPago?: MetodoPago
  lugar?: string
  notas?: string
}

export type TipoComida = 'DESAYUNO' | 'ALMUERZO' | 'COMIDA' | 'MERCADO_GENERAL'

export type BeneficiarioComida = 'YO' | 'HERMANO' | 'AMBOS' | 'FAMILIA'

export type OrigenComida = 'RESTAURANTE_AFUERA' | 'COCINADO_EN_CASA'

export interface GastoAlimentacion {
  id: string
  fecha: string
  tipoComida: TipoComida
  descripcion: string
  lugarOProveedor?: string
  monto: Dinero
  cuentaId?: string
  tarjetaId?: string
  metodoPago?: MetodoPago
  esMercadoGrande?: boolean
  beneficiario?: BeneficiarioComida
  numeroPorciones?: number
  precioUnitario?: number
  origenComida?: OrigenComida
  esFinDeSemana?: boolean
  financiadoPor?: 'YO' | 'APORTE_MAMA' | 'COMPARTIDO'
  reembolsado?: boolean
  notas?: string
}

export type TipoIngreso =
  | 'NOMINA'
  | 'HORAS_EXTRAS'
  | 'BONIFICACION'
  | 'FREELANCE'
  | 'APORTE_MAMA'
  | 'APORTE_HERMANO'
  | 'ALMUERZOS_HERMANO'
  | 'RENDIMIENTOS'
  | 'REGALO'
  | 'OTRO'

export interface IngresoPersonal {
  id: string
  fecha: string
  tipo: TipoIngreso
  descripcion: string
  monto: Dinero
  periodo: 'QUINCENA_1' | 'QUINCENA_2' | 'MENSUAL' | 'PUNTUAL'
  cuentaId: string
  notas?: string
}

export type CategoriaGastoPersonal =
  | 'CELULAR'
  | 'GASOLINA'
  | 'PARQUEADERO'
  | 'SUSCRIPCIONES'
  | 'RESTAURANTES_COMIDAS_FUERA'
  | 'PARTIDOS_OCIO_EVENTOS'
  | 'REGALOS'
  | 'ROPA_CUIDADO'
  | 'TRANSPORTE'
  | 'SEGUROS_SALUD'
  | 'OTROS'

export type MetodoPago = 'CUENTA_DEBITO' | 'TARJETA_CREDITO'

export interface GastoPersonal {
  id: string
  fecha: string
  categoria: CategoriaGastoPersonal
  descripcion: string
  monto: Dinero
  cuentaId?: string
  tarjetaId?: string
  metodoPago?: MetodoPago
  cuotas?: number // 1 por defecto
  lugar?: string
  notas?: string
  recurrenteId?: string // Vinculación con gasto fijo/plantilla
}

export interface GastoRecurrenteFijo {
  id: string
  nombre: string // ej. 'Parqueadero mensual', 'Plan Celular', 'Netflix', 'Crunchyroll'
  categoria: CategoriaGastoPersonal
  monto: Dinero
  diaCobro: number // 1 al 31 (día habitual de cobro del mes)
  metodoPago: MetodoPago
  cuentaId?: string
  tarjetaId?: string
  activo: boolean
  notas?: string
}

export type FranquiciaTarjeta = 'VISA' | 'MASTERCARD' | 'AMEX' | 'OTRA'

export interface TarjetaCredito {
  id: string
  nombre: string
  banco: string
  ultimos4Digitos: string
  franquicia: FranquiciaTarjeta
  cupoTotal: Dinero
  diaCorte: number // 1 al 31
  diaLimitePago: number // 1 al 31
  tasaInteresMensual: number // % mensual (ej: 2.1% o 0)
  color: string
  ultimoExtracto?: {
    periodoFacturado?: string
    pagoTotal?: number
    pagoMinimo?: number
    pagarAntesDe?: string
    cupoDisponible?: number
    deudaCorte?: number
  }
}

export interface PagoCuotaDetalle {
  numeroCuota: number
  fechaPago: string
  montoPagado: Dinero
  abonoCapital: Dinero
  interes: Dinero
  cuentaId?: string
}

export interface CompraCuota {
  id: string
  tarjetaId: string
  descripcion: string
  comercio?: string
  fechaCompra: string
  montoTotal: Dinero
  cuotasTotales: number // ej. 1 a 36
  cuotasPagadas: number
  tasaInteresMensual: number // % mensual, ej. 2.1 o 0
  valorCuota: Dinero // Calculado por fórmula
  saldoRestante: Dinero
  fechaInicioCobro: string // '2026-09'
  estado: 'ACTIVA' | 'PAGADA' | 'PREPAGADA'
  historialPagos: PagoCuotaDetalle[]
  notas?: string
}

export interface TransferenciaCuenta {
  id: string
  fecha: string
  cuentaOrigenId: string
  cuentaDestinoId: string
  monto: Dinero
  descripcion?: string
}

export type GrupoPresupuesto = 'HOGAR' | 'ALIMENTACION' | 'PERSONAL' | 'TARJETAS' | 'SERVICIOS'

export interface PresupuestoCategoria {
  id: string
  mes: string // '2026-08'
  categoriaClave: string
  nombre: string
  grupo: GrupoPresupuesto
  limiteMonto: Dinero
}

export interface ResumenFinancieroMes {
  mes: string
  totalIngresos: Dinero
  totalGastosHogar: Dinero
  totalAlimentacion: Dinero
  totalGastosPersonales: Dinero
  totalCuotasTarjetasMes: Dinero
  totalGastosConsolidados: Dinero
  balanceNetoDisponible: Dinero
  deudaTotalTarjetas: Dinero
  saldoLiquidezTotal: Dinero
}
