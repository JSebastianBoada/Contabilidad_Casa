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
  TransferenciaCuenta,
} from '../types/finance'
import {
  initialAlimentacion,
  initialArriendos,
  initialComprasCuotas,
  initialComprasHogar,
  initialCuentas,
  initialGastosPersonales,
  initialGastosRecurrentes,
  initialIngresos,
  initialPresupuestos,
  initialServicios,
  initialTarjetas,
} from './initialData'

export interface FullFinanceState {
  cuentas: CuentaFinanciera[]
  arriendos: ArriendoVivienda[]
  servicios: ServicioPublico[]
  comprasHogar: CompraHogar[]
  alimentacion: GastoAlimentacion[]
  ingresos: IngresoPersonal[]
  gastosPersonales: GastoPersonal[]
  gastosRecurrentes: GastoRecurrenteFijo[]
  tarjetas: TarjetaCredito[]
  comprasCuotas: CompraCuota[]
  presupuestos: PresupuestoCategoria[]
  transferencias: TransferenciaCuenta[]
  version: number
  lastUpdated: string
}

export const storageService = {
  createEmptyState(): FullFinanceState {
    return {
      cuentas: [
        {
          id: 'cuenta-efectivo-inicial',
          nombre: 'Efectivo',
          tipo: 'EFECTIVO',
          saldo: 0,
          color: '#10b981',
          icono: '💵',
        },
      ],
      arriendos: [],
      servicios: [],
      comprasHogar: [],
      alimentacion: [],
      ingresos: [],
      gastosPersonales: [],
      gastosRecurrentes: [],
      tarjetas: [],
      comprasCuotas: [],
      presupuestos: [],
      transferencias: [],
      version: 1,
      lastUpdated: new Date().toISOString(),
    }
  },

  createSampleState(): FullFinanceState {
    return {
      cuentas: initialCuentas,
      arriendos: initialArriendos,
      servicios: initialServicios,
      comprasHogar: initialComprasHogar,
      alimentacion: initialAlimentacion,
      ingresos: initialIngresos,
      gastosPersonales: initialGastosPersonales,
      gastosRecurrentes: initialGastosRecurrentes,
      tarjetas: initialTarjetas,
      comprasCuotas: initialComprasCuotas,
      presupuestos: initialPresupuestos,
      transferencias: [],
      version: 1,
      lastUpdated: new Date().toISOString(),
    }
  },

  getLocalStorageKey(userId?: string): string {
    return userId ? `contabilidad_state_${userId}` : 'contabilidad_state_global'
  },

  loadLocalState(userId?: string): FullFinanceState | null {
    try {
      const key = this.getLocalStorageKey(userId)
      const raw = localStorage.getItem(key)
      if (!raw) return null
      const parsed = JSON.parse(raw) as FullFinanceState
      if (parsed && Array.isArray(parsed.cuentas)) {
        return {
          ...this.createEmptyState(),
          ...parsed,
        }
      }
    } catch (e) {
      console.warn('Error cargando estado de localStorage:', e)
    }
    return null
  },

  saveLocalState(state: FullFinanceState, userId?: string): void {
    try {
      const key = this.getLocalStorageKey(userId)
      localStorage.setItem(key, JSON.stringify(state))
    } catch (e) {
      console.warn('Error guardando estado en localStorage:', e)
    }
  },

  exportBackupJson(state: FullFinanceState): string {
    return JSON.stringify(state, null, 2)
  },

  parseBackupJson(jsonString: string): FullFinanceState {
    const parsed = JSON.parse(jsonString) as FullFinanceState
    if (!parsed || !Array.isArray(parsed.cuentas)) {
      throw new Error('El archivo no tiene el formato válido de respaldo de finanzas.')
    }
    return {
      ...this.createEmptyState(),
      ...parsed,
      lastUpdated: new Date().toISOString(),
    }
  },
}

