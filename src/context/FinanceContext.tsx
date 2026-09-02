import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import type {
  ArriendoVivienda,
  CompraCuota,
  CompraHogar,
  CuentaFinanciera,
  GastoAlimentacion,
  GastoPersonal,
  GastoRecurrenteFijo,
  IngresoPersonal,
  PagoCuotaDetalle,
  PagoTarjetaGeneral,
  PresupuestoCategoria,
  ServicioPublico,
  TarjetaCredito,
  TransferenciaCuenta,
} from '../types/finance'
import { storageService, type FullFinanceState } from '../services/storageService'
import { firebaseFinanceService } from '../firebase/financeFirebase'
import { isFirebaseConfigured } from '../firebase/config'
import { useAuth } from '../auth/AuthContext'
import {
  initialCuentas,
  initialTarjetas,
} from '../services/initialData'
import {
  calcularCuotaMensual,
  calcularCuotasMes,
} from '../utils/financialCalculations'
import {
  getLocalCurrentMonth,
  getLocalTodayISO,
} from '../utils/formatters'

export interface ToastInfo {
  id: string
  title: string
  message?: string
  type: 'success' | 'info' | 'warning' | 'error'
}

export interface FinanceContextType {
  state: FullFinanceState
  selectedMonth: string
  setSelectedMonth: (month: string) => void
  isFirebaseActive: boolean
  toasts: ToastInfo[]
  showToast: (title: string, message?: string, type?: 'success' | 'info' | 'warning' | 'error') => void
  removeToast: (id: string) => void

  // Métricas calculadas
  totalIngresosMes: number
  totalGastosHogarMes: number
  totalAlimentacionMes: number
  totalGastosPersonalesMes: number
  totalCuotasTarjetasMes: number
  totalGastos1CuotaTarjetasMes: number
  totalExtractoTarjetasMes: number
  totalGastosMes: number
  balanceNetoMes: number
  saldoLiquidezTotal: number
  deudaTotalTarjetas: number
  cupoTotalTarjetas: number
  cupoDisponibleTarjetas: number

  // Operaciones
  addCuenta: (cuenta: Omit<CuentaFinanciera, 'id'>) => void
  updateCuenta: (id: string, updates: Partial<CuentaFinanciera>) => void
  deleteCuenta: (id: string) => void
  transferirEntreCuentas: (transferencia: Omit<TransferenciaCuenta, 'id'>) => void

  addArriendo: (arriendo: Omit<ArriendoVivienda, 'id'>) => void
  updateArriendo: (id: string, updates: Partial<ArriendoVivienda>) => void
  togglePagoArriendo: (id: string, cuentaId?: string) => void
  deleteArriendo: (id: string) => void

  addServicio: (servicio: Omit<ServicioPublico, 'id'>) => void
  updateServicio: (id: string, updates: Partial<ServicioPublico>) => void
  togglePagoServicio: (id: string) => void
  deleteServicio: (id: string) => void

  addCompraHogar: (compra: Omit<CompraHogar, 'id'>) => void
  deleteCompraHogar: (id: string) => void

  addAlimentacion: (gasto: Omit<GastoAlimentacion, 'id'>) => void
  deleteAlimentacion: (id: string) => void

  addIngreso: (ingreso: Omit<IngresoPersonal, 'id'>) => void
  deleteIngreso: (id: string) => void

  addGastoPersonal: (gasto: Omit<GastoPersonal, 'id'>) => void
  deleteGastoPersonal: (id: string) => void

  addGastoRecurrente: (gasto: Omit<GastoRecurrenteFijo, 'id'>) => void
  updateGastoRecurrente: (id: string, updates: Partial<GastoRecurrenteFijo>) => void
  deleteGastoRecurrente: (id: string) => void
  toggleActivoGastoRecurrente: (id: string) => void
  aplicarGastoRecurrenteAlMes: (gastoId: string, mes?: string) => void
  aplicarTodosRecurrentesPendientes: (mes?: string) => void

  addTarjeta: (tarjeta: Omit<TarjetaCredito, 'id'>) => void
  updateTarjeta: (id: string, updates: Partial<TarjetaCredito>) => void
  deleteTarjeta: (id: string) => void

  addCompraCuota: (compra: {
    tarjetaId: string
    descripcion: string
    comercio?: string
    fechaCompra: string
    montoTotal: number
    cuotasTotales: number
    cuotasPagadas?: number
    valorCuota?: number
    saldoRestante?: number
    tasaInteresMensual: number
    fechaInicioCobro?: string
    estado?: 'ACTIVA' | 'PAGADA' | 'PREPAGADA'
    notas?: string
  }) => void
  updateCompraCuota: (id: string, updates: Partial<CompraCuota>) => void
  pagarCuotaCompra: (compraId: string, cuentaId?: string) => void
  revertirPagoCuotaCompra: (compraId: string, cuentaId?: string) => void
  pagarTarjeta: (params: {
    tarjetaId: string
    cuentaId: string
    tipoPago: 'TOTAL' | 'MINIMO' | 'PERSONALIZADO'
    montoAPagar: number
    mes?: string
  }) => void
  prepagarCompra: (compraId: string, cuentaId?: string) => void
  deleteCompraCuota: (id: string) => void

  setPresupuesto: (presupuesto: Omit<PresupuestoCategoria, 'id'>) => void
  deletePresupuesto: (id: string) => void

  resetData: () => void
  clearAllData: () => void
  limpiarDatosTarjetas: () => void
  loadSampleData: () => void
  exportBackup: () => void
  importBackup: (jsonStr: string) => void
  syncFirebase: () => Promise<void>
}

const FinanceContext = createContext<FinanceContextType | undefined>(undefined)

function generateUniqueId(prefix: string): string {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`
}

function sanitizeAndDeduplicateState(stateObj: FullFinanceState): FullFinanceState {
  const fixUniqueIds = <T extends { id: string }>(items: T[] | undefined, prefix: string): T[] => {
    if (!items || !Array.isArray(items)) return []
    const seen = new Set<string>()
    return items.map((item, idx) => {
      if (!item.id || seen.has(item.id)) {
        const newId = `${prefix}-${Date.now()}-${idx}-${Math.random().toString(36).substring(2, 7)}`
        seen.add(newId)
        return { ...item, id: newId }
      }
      seen.add(item.id)
      return item
    })
  }

  const ensureDefaultCuentas = (cuentas: CuentaFinanciera[] | undefined): CuentaFinanciera[] => {
    const list = cuentas && Array.isArray(cuentas) ? [...cuentas] : []
    const hasHermano = list.some(
      (c) => c.id === 'cuenta-hermano' || c.nombre.toLowerCase().includes('hermano')
    )
    if (!hasHermano) {
      list.push({
        id: 'cuenta-hermano',
        nombre: 'Fondo Hermano (Almuerzos & Aportes)',
        tipo: 'BILLETERA_DIGITAL',
        saldo: 0,
        numero: 'Bolsillo / Hermano',
        color: '#06b6d4',
        icono: 'wallet',
      })
    }
    return list
  }

  // Reversión única automática de los 2 pagos accidentales de cuotas del reloj
  const sanitizeRelojFix = (state: FullFinanceState): FullFinanceState => {
    const rawAny = state as unknown as Record<string, unknown>
    if (rawAny._relojPaymentsRevertedV1) {
      return state
    }

    const compras = state.comprasCuotas || []
    const relojIndex = compras.findIndex((c) =>
      c.descripcion.toLowerCase().includes('reloj') &&
      (c.cuotasPagadas > 0 || (c.historialPagos && c.historialPagos.length > 0))
    )

    if (relojIndex === -1) {
      return {
        ...state,
        _relojPaymentsRevertedV1: true,
      } as FullFinanceState
    }

    const reloj = compras[relojIndex]
    const cuotasARevertir = Math.min(2, reloj.cuotasPagadas > 0 ? reloj.cuotasPagadas : 2)
    if (cuotasARevertir <= 0) {
      return { ...state, _relojPaymentsRevertedV1: true } as FullFinanceState
    }

    let totalReembolso = 0
    let totalAbonoCapital = 0
    let targetCuentaId = 'cuenta-bancolombia'
    const newHistorial = [...(reloj.historialPagos || [])]

    for (let k = 0; k < cuotasARevertir; k++) {
      if (newHistorial.length > 0) {
        const lastPago = newHistorial.pop()!
        totalReembolso += lastPago.montoPagado || reloj.valorCuota
        totalAbonoCapital += lastPago.abonoCapital || reloj.valorCuota
        if (lastPago.cuentaId) targetCuentaId = lastPago.cuentaId
      } else {
        totalReembolso += reloj.valorCuota
        totalAbonoCapital += reloj.valorCuota
      }
    }

    const targetCuenta =
      (state.cuentas || []).find((c) => c.id === targetCuentaId) || (state.cuentas || [])[0]
    const nextCuentas = (state.cuentas || []).map((c) =>
      c.id === (targetCuenta?.id || targetCuentaId) ? { ...c, saldo: c.saldo + totalReembolso } : c
    )

    const nuevaCuotasPagadas = Math.max(0, reloj.cuotasPagadas - cuotasARevertir)
    const nuevoSaldo = Math.min(reloj.montoTotal, reloj.saldoRestante + totalAbonoCapital)

    const nextCompras = [...compras]
    nextCompras[relojIndex] = {
      ...reloj,
      cuotasPagadas: nuevaCuotasPagadas,
      saldoRestante: nuevoSaldo,
      estado: 'ACTIVA',
      historialPagos: newHistorial,
    }

    return {
      ...state,
      cuentas: nextCuentas,
      comprasCuotas: nextCompras,
      _relojPaymentsRevertedV1: true,
    } as FullFinanceState
  }

  // Reseteo limpio a 0 solicitado por el usuario para empezar de cero sin datos
  const sanitizeZeroReset = (st: FullFinanceState): FullFinanceState => {
    const rawAny = st as unknown as Record<string, unknown>
    if (rawAny._cleanStateReset2026V2) {
      return st
    }

    const cleanCuentas = (st.cuentas && st.cuentas.length > 0 ? st.cuentas : initialCuentas).map((c) => ({
      ...c,
      saldo: 0,
    }))

    const cleanTarjetas = (st.tarjetas && st.tarjetas.length > 0 ? st.tarjetas : initialTarjetas).map((t) => ({
      ...t,
      ultimoExtracto: undefined,
    }))

    return {
      cuentas: cleanCuentas,
      tarjetas: cleanTarjetas,
      arriendos: [],
      servicios: [],
      comprasHogar: [],
      alimentacion: [],
      ingresos: [],
      gastosPersonales: [],
      gastosRecurrentes: [],
      comprasCuotas: [],
      pagosTarjetas: [],
      presupuestos: [],
      transferencias: [],
      version: 2,
      lastUpdated: new Date().toISOString(),
      _cleanStateReset2026V2: true,
      _relojPaymentsRevertedV1: true,
    } as unknown as FullFinanceState
  }

  const sanitizeIngresos = (ingresos: IngresoPersonal[] | undefined): IngresoPersonal[] => {
    if (!ingresos || !Array.isArray(ingresos)) return []
    return ingresos
      .filter((ing) => {
        const desc = (ing.descripcion || '').toLowerCase()
        if (desc.includes('abono sucursal') || desc.includes('abono a su tarjeta') || ing.monto < 0) {
          return false
        }
        return true
      })
      .map((ing) => ({
        ...ing,
        monto: Math.abs(ing.monto),
      }))
  }

  const baseSanitized: FullFinanceState = {
    ...stateObj,
    cuentas: fixUniqueIds(ensureDefaultCuentas(stateObj.cuentas), 'cuenta'),
    tarjetas: fixUniqueIds(stateObj.tarjetas, 'tc'),
    comprasCuotas: fixUniqueIds(stateObj.comprasCuotas, 'cc'),
    pagosTarjetas: fixUniqueIds(stateObj.pagosTarjetas || [], 'pago-tc'),
    gastosPersonales: fixUniqueIds(stateObj.gastosPersonales, 'gp'),
    alimentacion: fixUniqueIds(stateObj.alimentacion, 'alim'),
    comprasHogar: fixUniqueIds(stateObj.comprasHogar, 'comp-hogar'),
    ingresos: fixUniqueIds(sanitizeIngresos(stateObj.ingresos), 'ing'),
    servicios: fixUniqueIds(stateObj.servicios, 'serv'),
    arriendos: fixUniqueIds(stateObj.arriendos, 'arr'),
    gastosRecurrentes: fixUniqueIds(stateObj.gastosRecurrentes, 'rec'),
    transferencias: fixUniqueIds(stateObj.transferencias, 'transf'),
  }

  const zeroChecked = sanitizeZeroReset(baseSanitized)
  return sanitizeRelojFix(zeroChecked)
}

export function FinanceProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth()
  const userId = user?.uid

  const [state, setState] = useState<FullFinanceState>(() => {
    const local = storageService.loadLocalState(userId)
    if (local && Array.isArray(local.cuentas) && local.cuentas.length > 0) {
      const sanitized = sanitizeAndDeduplicateState({
        ...storageService.createEmptyState(),
        ...local,
      })
      storageService.saveLocalState(sanitized, userId)
      return sanitized
    }
    return storageService.createEmptyState()
  })
  const defaultMonth = getLocalCurrentMonth()
  const [selectedMonth, setSelectedMonthState] = useState<string>(() => {
    return localStorage.getItem('contabilidad_selected_month') || defaultMonth
  })

  const setSelectedMonth = useCallback((month: string) => {
    setSelectedMonthState(month)
    try {
      localStorage.setItem('contabilidad_selected_month', month)
    } catch {
      // ignore
    }
  }, [])

  const [toasts, setToasts] = useState<ToastInfo[]>([])
  const [isFirebaseActive, setIsFirebaseActive] = useState(isFirebaseConfigured())

  // Cargar datos locales inmediatamente cuando el usuario esté disponible
  useEffect(() => {
    if (userId) {
      const local = storageService.loadLocalState(userId)
      if (local && Array.isArray(local.cuentas) && local.cuentas.length > 0) {
        const sanitized = sanitizeAndDeduplicateState({
          ...storageService.createEmptyState(),
          ...local,
        })
        setState(sanitized)
        storageService.saveLocalState(sanitized, userId)
      }
    }
  }, [userId])

  const showToast = useCallback(
    (title: string, message?: string, type: 'success' | 'info' | 'warning' | 'error' = 'success') => {
      const id = generateUniqueId('toast')
      setToasts((prev) => [...prev, { id, title, message, type }])
      setTimeout(() => {
        setToasts((prev) => prev.filter((t) => t.id !== id))
      }, 4000)
    },
    []
  )

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id))
  }, [])

  // Guardar inmediatamente en almacenamiento local y sincronizar en Cloud Firestore
  const updateAndSaveState = useCallback(
    (updater: (prevState: FullFinanceState) => FullFinanceState) => {
      setState((prev) => {
        const rawNext = updater(prev)
        const next = sanitizeAndDeduplicateState(rawNext)
        
        // 1. Guardar de forma síncrona e inmediata en LocalStorage
        storageService.saveLocalState(next, userId)

        // 2. Sincronizar en la nube si Firebase está configurado
        if (userId && isFirebaseConfigured()) {
          firebaseFinanceService.saveToFirestore(next, userId).catch((err) => {
            console.error('Error guardando en Firestore:', err)
          })
        }
        return next
      })
    },
    [userId]
  )

  // Suscripción en tiempo real a Cloud Firestore
  useEffect(() => {
    if (!userId || !isFirebaseConfigured()) {
      setIsFirebaseActive(false)
      return
    }

    setIsFirebaseActive(true)
    const unsubscribe = firebaseFinanceService.subscribeToFinanceState(
      userId,
      (remoteState) => {
        if (remoteState && typeof remoteState === 'object') {
          const sanitized = sanitizeAndDeduplicateState({
            ...storageService.createEmptyState(),
            ...remoteState,
          })
          setState(sanitized)
          storageService.saveLocalState(sanitized, userId)

          // Si el estado remoto no tenía la marca de reseteo a 0, actualizarlo en Firestore
          const rawRemote = remoteState as unknown as Record<string, unknown>
          if (!rawRemote._cleanStateReset2026V2) {
            firebaseFinanceService.saveToFirestore(sanitized, userId).catch((err) => {
              console.error('Error actualizando estado en Firestore:', err)
            })
          }
          setIsFirebaseActive(true)
        } else if (remoteState === null) {
          // Documento inicial nuevo en Firestore para este usuario
          const local = storageService.loadLocalState(userId)
          const initial = local ? sanitizeAndDeduplicateState(local) : storageService.createEmptyState()
          setState(initial)
          storageService.saveLocalState(initial, userId)
          firebaseFinanceService.saveToFirestore(initial, userId).catch((err) => {
            console.error('Error inicializando usuario en Firestore:', err)
          })
          setIsFirebaseActive(true)
        }
      },
      (error) => {
        console.warn('Listener de Firestore en modo offline/fallback local:', error)
        setIsFirebaseActive(false)
      }
    )

    return () => {
      if (unsubscribe) unsubscribe()
    }
  }, [userId])


  // ==========================================
  // CÁLCULOS AGREGADOS DEL MES SELECCIONADO
  // ==========================================

  // Total ingresos del mes
  const totalIngresosMes = useMemo(() => {
    return (state.ingresos || [])
      .filter((ing) => ing.fecha.startsWith(selectedMonth))
      .reduce((acc, ing) => acc + ing.monto, 0)
  }, [state.ingresos, selectedMonth])

  // Total gastos de hogar del mes (Arriendos pagados + Servicios pagados + Compras hogar)
  const totalGastosHogarMes = useMemo(() => {
    const arriendosMonto = (state.arriendos || [])
      .filter((a) => a.mesCorrespondiente === selectedMonth && a.pagado)
      .reduce((acc, a) => acc + a.monto, 0)

    const serviciosMonto = (state.servicios || [])
      .filter((s) => (s.periodo === selectedMonth || s.fechaVencimiento.startsWith(selectedMonth)) && s.pagado)
      .reduce((acc, s) => acc + s.monto, 0)

    const comprasHogarMonto = (state.comprasHogar || [])
      .filter((c) => c.fecha.startsWith(selectedMonth))
      .reduce((acc, c) => acc + c.monto, 0)

    return arriendosMonto + serviciosMonto + comprasHogarMonto
  }, [state.arriendos, state.servicios, state.comprasHogar, selectedMonth])

  // Total alimentación del mes
  const totalAlimentacionMes = useMemo(() => {
    return (state.alimentacion || [])
      .filter((a) => a.fecha.startsWith(selectedMonth))
      .reduce((acc, a) => acc + a.monto, 0)
  }, [state.alimentacion, selectedMonth])

  // Total gastos personales del mes
  const totalGastosPersonalesMes = useMemo(() => {
    return (state.gastosPersonales || [])
      .filter((g) => g.fecha.startsWith(selectedMonth))
      .reduce((acc, g) => acc + g.monto, 0)
  }, [state.gastosPersonales, selectedMonth])

  // Total cuotas de tarjetas del mes (diferidas)
  const totalCuotasTarjetasMes = useMemo(() => {
    const { totalMes } = calcularCuotasMes(state.comprasCuotas || [], selectedMonth)
    return totalMes
  }, [state.comprasCuotas, selectedMonth])

  // Total gastos a 1 cuota pagados con tarjeta de crédito en el mes (Celular, Gasolina, Suscripciones, etc.)
  const totalGastos1CuotaTarjetasMes = useMemo(() => {
    const gp1Cuota = (state.gastosPersonales || [])
      .filter((g) => g.fecha.startsWith(selectedMonth) && Boolean(g.tarjetaId))
      .reduce((acc, g) => acc + g.monto, 0)

    const alim1Cuota = (state.alimentacion || [])
      .filter((a) => a.fecha.startsWith(selectedMonth) && Boolean(a.tarjetaId))
      .reduce((acc, a) => acc + a.monto, 0)

    const hogar1Cuota = (state.comprasHogar || [])
      .filter((c) => c.fecha.startsWith(selectedMonth) && Boolean(c.tarjetaId))
      .reduce((acc, c) => acc + c.monto, 0)

    const serv1Cuota = (state.servicios || [])
      .filter((s) => (s.periodo === selectedMonth || s.fechaVencimiento.startsWith(selectedMonth)) && s.pagado && Boolean(s.tarjetaId))
      .reduce((acc, s) => acc + s.monto, 0)

    return gp1Cuota + alim1Cuota + hogar1Cuota + serv1Cuota
  }, [state.gastosPersonales, state.alimentacion, state.comprasHogar, state.servicios, selectedMonth])

  // Total a pagar en el extracto de tarjetas del mes = cuotas diferidas + consumos a 1 cuota
  const totalExtractoTarjetasMes = useMemo(() => {
    return totalCuotasTarjetasMes + totalGastos1CuotaTarjetasMes
  }, [totalCuotasTarjetasMes, totalGastos1CuotaTarjetasMes])

  // Total gastos consolidados
  const totalGastosMes = useMemo(() => {
    return (
      totalGastosHogarMes +
      totalAlimentacionMes +
      totalGastosPersonalesMes +
      totalCuotasTarjetasMes
    )
  }, [
    totalGastosHogarMes,
    totalAlimentacionMes,
    totalGastosPersonalesMes,
    totalCuotasTarjetasMes,
  ])

  // Balance neto del mes
  const balanceNetoMes = useMemo(() => {
    return totalIngresosMes - totalGastosMes
  }, [totalIngresosMes, totalGastosMes])

  // Saldo liquidez total (en cuentas y efectivo)
  const saldoLiquidezTotal = useMemo(() => {
    return (state.cuentas || []).reduce((acc, c) => acc + c.saldo, 0)
  }, [state.cuentas])

  // Deuda total en tarjetas de crédito
  const deudaTotalTarjetas = useMemo(() => {
    return (state.comprasCuotas || [])
      .filter((c) => c.estado === 'ACTIVA')
      .reduce((acc, c) => acc + c.saldoRestante, 0)
  }, [state.comprasCuotas])

  // Cupo total y disponible en tarjetas
  const cupoTotalTarjetas = useMemo(() => {
    return (state.tarjetas || []).reduce((acc, t) => acc + t.cupoTotal, 0)
  }, [state.tarjetas])

  const cupoDisponibleTarjetas = useMemo(() => {
    return Math.max(0, cupoTotalTarjetas - deudaTotalTarjetas)
  }, [cupoTotalTarjetas, deudaTotalTarjetas])

  // ==========================================
  // DISPATCHERS / ACCIONES
  // ==========================================

  const addCuenta = useCallback(
    (cuenta: Omit<CuentaFinanciera, 'id'>) => {
      const id = generateUniqueId('cuenta')
      updateAndSaveState((prev) => ({
        ...prev,
        cuentas: [...(prev.cuentas || []), { ...cuenta, id }],
      }))
      showToast('Cuenta creada', `Se ha agregado ${cuenta.nombre}`)
    },
    [updateAndSaveState, showToast]
  )

  const updateCuenta = useCallback(
    (id: string, data: Partial<CuentaFinanciera>) => {
      updateAndSaveState((prev) => ({
        ...prev,
        cuentas: (prev.cuentas || []).map((c) => (c.id === id ? { ...c, ...data } : c)),
      }))
      showToast('Cuenta actualizada', 'Los cambios se guardaron correctamente')
    },
    [updateAndSaveState, showToast]
  )

  const deleteCuenta = useCallback(
    (id: string) => {
      updateAndSaveState((prev) => ({
        ...prev,
        cuentas: (prev.cuentas || []).filter((c) => c.id !== id),
      }))
      showToast('Cuenta eliminada', '', 'warning')
    },
    [updateAndSaveState, showToast]
  )

  const transferirEntreCuentas = useCallback(
    (transferencia: Omit<TransferenciaCuenta, 'id'>) => {
      const id = generateUniqueId('transf')
      updateAndSaveState((prev) => {
        const cuentasActualizadas = (prev.cuentas || []).map((c) => {
          if (c.id === transferencia.cuentaOrigenId) {
            return { ...c, saldo: c.saldo - transferencia.monto }
          }
          if (c.id === transferencia.cuentaDestinoId) {
            return { ...c, saldo: c.saldo + transferencia.monto }
          }
          return c
        })
        return {
          ...prev,
          cuentas: cuentasActualizadas,
          transferencias: [{ ...transferencia, id }, ...(prev.transferencias || [])],
        }
      })
      showToast('Transferencia realizada', 'Saldos actualizados correctamente')
    },
    [updateAndSaveState, showToast]
  )

  // Arriendos
  const addArriendo = useCallback(
    (arriendo: Omit<ArriendoVivienda, 'id'>) => {
      const id = generateUniqueId('arr')
      updateAndSaveState((prev) => {
        let nextCuentas = prev.cuentas || []
        if (arriendo.pagado && arriendo.cuentaId) {
          nextCuentas = nextCuentas.map((c) =>
            c.id === arriendo.cuentaId ? { ...c, saldo: c.saldo - arriendo.monto } : c
          )
        }
        return {
          ...prev,
          cuentas: nextCuentas,
          arriendos: [{ ...arriendo, id }, ...(prev.arriendos || [])],
        }
      })
      showToast('Arriendo registrado', `Período: ${arriendo.mesCorrespondiente}`)
    },
    [updateAndSaveState, showToast]
  )

  const updateArriendo = useCallback(
    (id: string, data: Partial<ArriendoVivienda>) => {
      updateAndSaveState((prev) => {
        const existing = (prev.arriendos || []).find((a) => a.id === id)
        let nextCuentas = prev.cuentas || []

        if (existing && existing.pagado && data.cuentaId && data.cuentaId !== existing.cuentaId) {
          nextCuentas = nextCuentas.map((c) => {
            if (c.id === existing.cuentaId) return { ...c, saldo: c.saldo + existing.monto }
            if (c.id === data.cuentaId) return { ...c, saldo: c.saldo - (data.monto ?? existing.monto) }
            return c
          })
        }

        return {
          ...prev,
          cuentas: nextCuentas,
          arriendos: (prev.arriendos || []).map((a) => (a.id === id ? { ...a, ...data } : a)),
        }
      })
      showToast('Arriendo actualizado', 'Los cambios se guardaron correctamente')
    },
    [updateAndSaveState, showToast]
  )

  const togglePagoArriendo = useCallback(
    (id: string, cuentaId?: string) => {
      updateAndSaveState((prev) => {
        const item = (prev.arriendos || []).find((a) => a.id === id)
        if (!item) return prev

        const nuevoPagado = !item.pagado
        const targetCuentaId = cuentaId || item.cuentaId || prev.cuentas[0]?.id
        const fechaPago = nuevoPagado ? getLocalTodayISO() : undefined

        const nextCuentas = (prev.cuentas || []).map((c) => {
          if (c.id === targetCuentaId) {
            return {
              ...c,
              saldo: nuevoPagado ? c.saldo - item.monto : c.saldo + item.monto,
            }
          }
          return c
        })

        return {
          ...prev,
          cuentas: nextCuentas,
          arriendos: (prev.arriendos || []).map((a) =>
            a.id === id
              ? {
                  ...a,
                  pagado: nuevoPagado,
                  fechaPago,
                  cuentaId: nuevoPagado ? targetCuentaId : undefined,
                }
              : a
          ),
        }
      })
      showToast('Estado de arriendo actualizado', 'Se ajustó el saldo de la cuenta')
    },
    [updateAndSaveState, showToast]
  )

  const deleteArriendo = useCallback(
    (id: string) => {
      updateAndSaveState((prev) => ({
        ...prev,
        arriendos: (prev.arriendos || []).filter((a) => a.id !== id),
      }))
      showToast('Arriendo eliminado', '', 'warning')
    },
    [updateAndSaveState, showToast]
  )

  // Servicios Públicos
  const addServicio = useCallback(
    (servicio: Omit<ServicioPublico, 'id'>) => {
      const id = generateUniqueId('serv')
      const esPagadoPorMama = (servicio.responsablePago || 'MAMA') === 'MAMA'

      updateAndSaveState((prev) => {
        let nextCuentas = prev.cuentas || []
        // Solo descontar de cuentas del usuario si NO lo paga mamá
        if (servicio.pagado && servicio.cuentaId && !servicio.tarjetaId && !esPagadoPorMama) {
          nextCuentas = nextCuentas.map((c) =>
            c.id === servicio.cuentaId ? { ...c, saldo: c.saldo - servicio.monto } : c
          )
        }
        return {
          ...prev,
          cuentas: nextCuentas,
          servicios: [{ ...servicio, id }, ...(prev.servicios || [])],
        }
      })
      showToast('Servicio público registrado', servicio.nombre)
    },
    [updateAndSaveState, showToast]
  )

  const updateServicio = useCallback(
    (id: string, data: Partial<ServicioPublico>) => {
      updateAndSaveState((prev) => ({
        ...prev,
        servicios: (prev.servicios || []).map((s) => (s.id === id ? { ...s, ...data } : s)),
      }))
      showToast('Servicio actualizado', 'Los cambios se guardaron correctamente')
    },
    [updateAndSaveState, showToast]
  )

  const togglePagoServicio = useCallback(
    (id: string, cuentaId?: string) => {
      updateAndSaveState((prev) => {
        const item = (prev.servicios || []).find((s) => s.id === id)
        if (!item) return prev

        const nuevoPagado = !item.pagado
        const targetCuentaId = cuentaId || item.cuentaId || prev.cuentas[0]?.id
        const fechaPago = nuevoPagado ? getLocalTodayISO() : undefined
        const esPagadoPorMama = (item.responsablePago || 'MAMA') === 'MAMA'

        let nextCuentas = prev.cuentas || []
        // Si lo paga mamá, no altera el saldo bancario del usuario
        if (!item.tarjetaId && !esPagadoPorMama) {
          nextCuentas = nextCuentas.map((c) => {
            if (c.id === targetCuentaId) {
              return {
                ...c,
                saldo: nuevoPagado ? c.saldo - item.monto : c.saldo + item.monto,
              }
            }
            return c
          })
        }

        return {
          ...prev,
          cuentas: nextCuentas,
          servicios: (prev.servicios || []).map((s) =>
            s.id === id
              ? {
                  ...s,
                  pagado: nuevoPagado,
                  fechaPago,
                  cuentaId: nuevoPagado && !esPagadoPorMama ? targetCuentaId : undefined,
                }
              : s
          ),
        }
      })
      showToast('Servicio actualizado', 'Se actualizó el estado de pago del servicio')
    },
    [updateAndSaveState, showToast]
  )

  const deleteServicio = useCallback(
    (id: string) => {
      updateAndSaveState((prev) => ({
        ...prev,
        servicios: (prev.servicios || []).filter((s) => s.id !== id),
      }))
      showToast('Servicio eliminado', '', 'warning')
    },
    [updateAndSaveState, showToast]
  )

  // Compras de Hogar
  const addCompraHogar = useCallback(
    (compra: Omit<CompraHogar, 'id'>) => {
      const id = generateUniqueId('comp-hogar')
      updateAndSaveState((prev) => {
        let nextCuentas = prev.cuentas || []
        if (compra.cuentaId && !compra.tarjetaId) {
          nextCuentas = nextCuentas.map((c) =>
            c.id === compra.cuentaId ? { ...c, saldo: c.saldo - compra.monto } : c
          )
        }
        return {
          ...prev,
          cuentas: nextCuentas,
          comprasHogar: [{ ...compra, id }, ...(prev.comprasHogar || [])],
        }
      })
      showToast('Compra de hogar registrada', compra.descripcion)
    },
    [updateAndSaveState, showToast]
  )

  const deleteCompraHogar = useCallback(
    (id: string) => {
      updateAndSaveState((prev) => ({
        ...prev,
        comprasHogar: (prev.comprasHogar || []).filter((c) => c.id !== id),
      }))
      showToast('Compra de hogar eliminada', '', 'warning')
    },
    [updateAndSaveState, showToast]
  )

  // Alimentación
  const addAlimentacion = useCallback(
    (gasto: Omit<GastoAlimentacion, 'id'>) => {
      const id = generateUniqueId('alim')
      updateAndSaveState((prev) => {
        let nextCuentas = prev.cuentas || []
        if (gasto.cuentaId && !gasto.tarjetaId) {
          nextCuentas = nextCuentas.map((c) =>
            c.id === gasto.cuentaId ? { ...c, saldo: c.saldo - gasto.monto } : c
          )
        }
        return {
          ...prev,
          cuentas: nextCuentas,
          alimentacion: [{ ...gasto, id }, ...(prev.alimentacion || [])],
        }
      })
      showToast('Gasto de comida registrado', gasto.descripcion)
    },
    [updateAndSaveState, showToast]
  )

  const deleteAlimentacion = useCallback(
    (id: string) => {
      updateAndSaveState((prev) => ({
        ...prev,
        alimentacion: (prev.alimentacion || []).filter((a) => a.id !== id),
      }))
      showToast('Registro de alimentación eliminado', '', 'warning')
    },
    [updateAndSaveState, showToast]
  )

  // Ingresos Personales
  const addIngreso = useCallback(
    (ingreso: Omit<IngresoPersonal, 'id'>) => {
      const id = generateUniqueId('ing')
      updateAndSaveState((prev) => {
        const nextCuentas = (prev.cuentas || []).map((c) =>
          c.id === ingreso.cuentaId ? { ...c, saldo: c.saldo + ingreso.monto } : c
        )
        return {
          ...prev,
          cuentas: nextCuentas,
          ingresos: [{ ...ingreso, id }, ...(prev.ingresos || [])],
        }
      })
      showToast('Ingreso registrado', ingreso.descripcion)
    },
    [updateAndSaveState, showToast]
  )

  const deleteIngreso = useCallback(
    (id: string) => {
      updateAndSaveState((prev) => ({
        ...prev,
        ingresos: (prev.ingresos || []).filter((i) => i.id !== id),
      }))
      showToast('Ingreso eliminado', '', 'warning')
    },
    [updateAndSaveState, showToast]
  )

  // Gastos Personales
  const addGastoPersonal = useCallback(
    (gasto: Omit<GastoPersonal, 'id'>) => {
      const id = generateUniqueId('gp')
      updateAndSaveState((prev) => {
        let nextCuentas = prev.cuentas || []
        if (gasto.cuentaId && !gasto.tarjetaId) {
          nextCuentas = nextCuentas.map((c) =>
            c.id === gasto.cuentaId ? { ...c, saldo: c.saldo - gasto.monto } : c
          )
        }
        return {
          ...prev,
          cuentas: nextCuentas,
          gastosPersonales: [{ ...gasto, id }, ...(prev.gastosPersonales || [])],
        }
      })
      showToast('Gasto personal registrado', gasto.descripcion)
    },
    [updateAndSaveState, showToast]
  )

  const deleteGastoPersonal = useCallback(
    (id: string) => {
      updateAndSaveState((prev) => ({
        ...prev,
        gastosPersonales: (prev.gastosPersonales || []).filter((g) => g.id !== id),
      }))
      showToast('Gasto personal eliminado', '', 'warning')
    },
    [updateAndSaveState, showToast]
  )

  // ==========================================
  // GASTOS FIJOS Y RECURRENTES (Suscripciones, Parqueadero, Planes)
  // ==========================================
  const addGastoRecurrente = useCallback(
    (gasto: Omit<GastoRecurrenteFijo, 'id'>) => {
      const id = generateUniqueId('rec')
      updateAndSaveState((prev) => ({
        ...prev,
        gastosRecurrentes: [...(prev.gastosRecurrentes || []), { ...gasto, id }],
      }))
      showToast('Gasto fijo creado', gasto.nombre)
    },
    [updateAndSaveState, showToast]
  )

  const updateGastoRecurrente = useCallback(
    (id: string, data: Partial<GastoRecurrenteFijo>) => {
      updateAndSaveState((prev) => ({
        ...prev,
        gastosRecurrentes: (prev.gastosRecurrentes || []).map((r) =>
          r.id === id ? { ...r, ...data } : r
        ),
      }))
      showToast('Gasto fijo actualizado', 'Datos actualizados correctamente')
    },
    [updateAndSaveState, showToast]
  )

  const deleteGastoRecurrente = useCallback(
    (id: string) => {
      updateAndSaveState((prev) => ({
        ...prev,
        gastosRecurrentes: (prev.gastosRecurrentes || []).filter((r) => r.id !== id),
      }))
      showToast('Gasto fijo eliminado', '', 'warning')
    },
    [updateAndSaveState, showToast]
  )

  const toggleActivoGastoRecurrente = useCallback(
    (id: string) => {
      updateAndSaveState((prev) => ({
        ...prev,
        gastosRecurrentes: (prev.gastosRecurrentes || []).map((r) =>
          r.id === id ? { ...r, activo: !r.activo } : r
        ),
      }))
    },
    [updateAndSaveState]
  )

  const aplicarGastoRecurrenteAlMes = useCallback(
    (recurrenteId: string, mes?: string) => {
      const targetMonth = mes || selectedMonth
      updateAndSaveState((prev) => {
        const item = (prev.gastosRecurrentes || []).find((r) => r.id === recurrenteId)
        if (!item) return prev

        // Verificar si ya fue aplicado en este mes
        const yaExiste = (prev.gastosPersonales || []).some(
          (g) => g.fecha.startsWith(targetMonth) && g.recurrenteId === item.id
        )
        if (yaExiste) {
          showToast('Ya registrado', `${item.nombre} ya fue aplicado en ${targetMonth}`, 'info')
          return prev
        }

        const dia = String(Math.min(28, Math.max(1, item.diaCobro))).padStart(2, '0')
        const fecha = `${targetMonth}-${dia}`
        const isTarjeta = item.metodoPago === 'TARJETA_CREDITO'
        const id = generateUniqueId('gp-rec')

        let nextCuentas = prev.cuentas || []
        if (!isTarjeta && item.cuentaId) {
          nextCuentas = nextCuentas.map((c) =>
            c.id === item.cuentaId ? { ...c, saldo: c.saldo - item.monto } : c
          )
        }

        const nuevoGasto: GastoPersonal = {
          id,
          fecha,
          categoria: item.categoria,
          descripcion: item.nombre,
          monto: item.monto,
          cuentaId: !isTarjeta ? item.cuentaId : undefined,
          tarjetaId: isTarjeta ? item.tarjetaId : undefined,
          metodoPago: item.metodoPago,
          cuotas: isTarjeta ? 1 : undefined,
          recurrenteId: item.id,
          notas: item.notas,
        }

        showToast('Gasto mensual aplicado', `${item.nombre} registrado para ${targetMonth}`)

        return {
          ...prev,
          cuentas: nextCuentas,
          gastosPersonales: [nuevoGasto, ...(prev.gastosPersonales || [])],
        }
      })
    },
    [selectedMonth, updateAndSaveState, showToast]
  )

  const aplicarTodosRecurrentesPendientes = useCallback(
    (mes?: string) => {
      const targetMonth = mes || selectedMonth
      updateAndSaveState((prev) => {
        const activos = (prev.gastosRecurrentes || []).filter((r) => r.activo)
        if (activos.length === 0) {
          showToast('Sin gastos fijos', 'No tienes gastos fijos activos configurados', 'info')
          return prev
        }

        const pendientes = activos.filter((r) => {
          return !(prev.gastosPersonales || []).some(
            (g) => g.fecha.startsWith(targetMonth) && g.recurrenteId === r.id
          )
        })

        if (pendientes.length === 0) {
          showToast('Al día', `Todos los gastos fijos ya están registrados en ${targetMonth}`, 'info')
          return prev
        }

        let nextCuentas = [...(prev.cuentas || [])]
        const nuevosGastos: GastoPersonal[] = []

        pendientes.forEach((item) => {
          const dia = String(Math.min(28, Math.max(1, item.diaCobro))).padStart(2, '0')
          const fecha = `${targetMonth}-${dia}`
          const isTarjeta = item.metodoPago === 'TARJETA_CREDITO'
          const id = generateUniqueId('gp-rec')

          if (!isTarjeta && item.cuentaId) {
            nextCuentas = nextCuentas.map((c) =>
              c.id === item.cuentaId ? { ...c, saldo: c.saldo - item.monto } : c
            )
          }

          nuevosGastos.push({
            id,
            fecha,
            categoria: item.categoria,
            descripcion: item.nombre,
            monto: item.monto,
            cuentaId: !isTarjeta ? item.cuentaId : undefined,
            tarjetaId: isTarjeta ? item.tarjetaId : undefined,
            metodoPago: item.metodoPago,
            cuotas: isTarjeta ? 1 : undefined,
            recurrenteId: item.id,
            notas: item.notas,
          })
        })

        showToast(
          'Gastos fijos aplicados',
          `Se cargaron ${nuevosGastos.length} gastos automáticos para ${targetMonth}`
        )

        return {
          ...prev,
          cuentas: nextCuentas,
          gastosPersonales: [...nuevosGastos, ...(prev.gastosPersonales || [])],
        }
      })
    },
    [selectedMonth, updateAndSaveState, showToast]
  )

  // Tarjetas de Crédito
  const addTarjeta = useCallback(
    (tarjeta: Omit<TarjetaCredito, 'id'>) => {
      const id = generateUniqueId('tc')
      updateAndSaveState((prev) => ({
        ...prev,
        tarjetas: [...(prev.tarjetas || []), { ...tarjeta, id }],
      }))
      showToast('Tarjeta de crédito agregada', tarjeta.nombre)
    },
    [updateAndSaveState, showToast]
  )

  const updateTarjeta = useCallback(
    (id: string, data: Partial<TarjetaCredito>) => {
      updateAndSaveState((prev) => ({
        ...prev,
        tarjetas: (prev.tarjetas || []).map((t) => (t.id === id ? { ...t, ...data } : t)),
      }))
      showToast('Tarjeta actualizada', 'Datos guardados correctamente')
    },
    [updateAndSaveState, showToast]
  )

  const deleteTarjeta = useCallback(
    (id: string) => {
      updateAndSaveState((prev) => ({
        ...prev,
        tarjetas: (prev.tarjetas || []).filter((t) => t.id !== id),
        comprasCuotas: (prev.comprasCuotas || []).filter((c) => c.tarjetaId !== id),
      }))
      showToast('Tarjeta eliminada', 'Se eliminaron las compras asociadas', 'warning')
    },
    [updateAndSaveState, showToast]
  )

  // Compras a Cuotas
  const addCompraCuota = useCallback(
    (compraInput: {
      tarjetaId: string
      descripcion: string
      comercio?: string
      fechaCompra: string
      montoTotal: number
      cuotasTotales: number
      cuotasPagadas?: number
      valorCuota?: number
      saldoRestante?: number
      tasaInteresMensual: number
      fechaInicioCobro?: string
      estado?: 'ACTIVA' | 'PAGADA' | 'PREPAGADA'
      notas?: string
    }) => {
      const id = generateUniqueId('cc')
      const cuotasTotales = Math.max(1, compraInput.cuotasTotales)
      const cuotasPagadas = Math.min(
        cuotasTotales,
        Math.max(0, compraInput.cuotasPagadas ?? 0)
      )

      const valorCuota =
        compraInput.valorCuota !== undefined && compraInput.valorCuota > 0
          ? compraInput.valorCuota
          : calcularCuotaMensual(
              compraInput.montoTotal,
              cuotasTotales,
              compraInput.tasaInteresMensual
            )

      const saldoRestante =
        compraInput.saldoRestante !== undefined
          ? Math.max(0, compraInput.saldoRestante)
          : Math.max(
              0,
              Math.round(compraInput.montoTotal - valorCuota * cuotasPagadas)
            )

      const estado =
        compraInput.estado ||
        (cuotasPagadas >= cuotasTotales || (saldoRestante === 0 && cuotasPagadas > 0)
          ? 'PAGADA'
          : 'ACTIVA')

      const nuevaCompra: CompraCuota = {
        id,
        tarjetaId: compraInput.tarjetaId,
        descripcion: compraInput.descripcion,
        comercio: compraInput.comercio,
        fechaCompra: compraInput.fechaCompra,
        montoTotal: compraInput.montoTotal,
        cuotasTotales,
        cuotasPagadas,
        tasaInteresMensual: compraInput.tasaInteresMensual,
        valorCuota,
        saldoRestante,
        fechaInicioCobro:
          compraInput.fechaInicioCobro || compraInput.fechaCompra.slice(0, 7),
        estado,
        historialPagos: [],
        notas: compraInput.notas,
      }

      updateAndSaveState((prev) => ({
        ...prev,
        comprasCuotas: [nuevaCompra, ...(prev.comprasCuotas || [])],
      }))

      showToast(
        'Compra a cuotas registrada',
        `${nuevaCompra.cuotasTotales} cuotas de aprox. $${valorCuota.toLocaleString('es-CO')}`
      )
    },
    [updateAndSaveState, showToast]
  )

  const updateCompraCuota = useCallback(
    (id: string, data: Partial<CompraCuota>) => {
      updateAndSaveState((prev) => ({
        ...prev,
        comprasCuotas: (prev.comprasCuotas || []).map((c) =>
          c.id === id ? { ...c, ...data } : c
        ),
      }))
      showToast('Compra a cuotas actualizada', 'Datos sincronizados con el extracto')
    },
    [updateAndSaveState, showToast]
  )

  const pagarCuotaCompra = useCallback(
    (compraId: string, cuentaId?: string) => {
      updateAndSaveState((prev) => {
        const compra = (prev.comprasCuotas || []).find((c) => c.id === compraId)
        if (!compra || compra.estado !== 'ACTIVA') return prev

        const proximaCuota = compra.cuotasPagadas + 1
        const i = compra.tasaInteresMensual > 0 ? compra.tasaInteresMensual / 100 : 0
        const interes = Math.round(compra.saldoRestante * i)
        let abonoCapital = compra.valorCuota - interes

        if (abonoCapital > compra.saldoRestante || proximaCuota === compra.cuotasTotales) {
          abonoCapital = compra.saldoRestante
        }

        const nuevoSaldo = Math.max(0, compra.saldoRestante - abonoCapital)
        const nuevoEstado = nuevoSaldo === 0 || proximaCuota >= compra.cuotasTotales ? 'PAGADA' : 'ACTIVA'

        const pagoDetalle = {
          numeroCuota: proximaCuota,
          fechaPago: getLocalTodayISO(),
          montoPagado: compra.valorCuota,
          abonoCapital,
          interes,
          cuentaId,
        }

        let nextCuentas = prev.cuentas || []
        if (cuentaId) {
          nextCuentas = nextCuentas.map((c) =>
            c.id === cuentaId ? { ...c, saldo: c.saldo - compra.valorCuota } : c
          )
        }

        return {
          ...prev,
          cuentas: nextCuentas,
          comprasCuotas: (prev.comprasCuotas || []).map((c) =>
            c.id === compraId
              ? {
                  ...c,
                  cuotasPagadas: proximaCuota,
                  saldoRestante: nuevoSaldo,
                  estado: nuevoEstado,
                  historialPagos: [...c.historialPagos, pagoDetalle],
                }
              : c
          ),
        }
      })

      showToast('Cuota pagada con éxito', 'Saldo de tarjeta y cuenta actualizados')
    },
    [updateAndSaveState, showToast]
  )

  const revertirPagoCuotaCompra = useCallback(
    (compraId: string, cuentaId?: string) => {
      let refundMonto = 0
      let cuotaRestablecida = 0

      updateAndSaveState((prev) => {
        const compra = (prev.comprasCuotas || []).find((c) => c.id === compraId)
        if (
          !compra ||
          (compra.cuotasPagadas <= 0 && (!compra.historialPagos || compra.historialPagos.length === 0))
        ) {
          return prev
        }

        let montoReembolso = compra.valorCuota
        let abonoCapital = compra.valorCuota
        let targetCuentaId = cuentaId
        const nextHistorial = [...(compra.historialPagos || [])]

        if (nextHistorial.length > 0) {
          const ultimoPago = nextHistorial.pop()!
          montoReembolso = ultimoPago.montoPagado || compra.valorCuota
          abonoCapital = ultimoPago.abonoCapital || compra.valorCuota
          targetCuentaId = cuentaId || ultimoPago.cuentaId || prev.cuentas[0]?.id
        } else {
          targetCuentaId = cuentaId || prev.cuentas[0]?.id
        }

        refundMonto = montoReembolso
        const nuevaCuotasPagadas = Math.max(0, compra.cuotasPagadas - 1)
        cuotaRestablecida = nuevaCuotasPagadas + 1
        const nuevoSaldo = Math.min(compra.montoTotal, compra.saldoRestante + abonoCapital)

        const nextCuentas = (prev.cuentas || []).map((c) =>
          c.id === targetCuentaId ? { ...c, saldo: c.saldo + montoReembolso } : c
        )

        const nextCompras = (prev.comprasCuotas || []).map((c) =>
          c.id === compraId
            ? {
                ...c,
                cuotasPagadas: nuevaCuotasPagadas,
                saldoRestante: nuevoSaldo,
                estado: 'ACTIVA' as const,
                historialPagos: nextHistorial,
              }
            : c
        )

        return {
          ...prev,
          cuentas: nextCuentas,
          comprasCuotas: nextCompras,
        }
      })

      if (refundMonto > 0) {
        showToast(
          'Pago de cuota revertido',
          `Se reembolsaron $${refundMonto.toLocaleString('es-CO')} a tu cuenta y se restableció la cuota ${cuotaRestablecida}`,
          'success'
        )
      } else {
        showToast('Sin pagos que revertir', 'Esta compra no tiene cuotas pagadas registradas', 'warning')
      }
    },
    [updateAndSaveState, showToast]
  )

  const pagarTarjeta = useCallback(
    (params: {
      tarjetaId: string
      cuentaId: string
      tipoPago: 'TOTAL' | 'MINIMO' | 'PERSONALIZADO'
      montoAPagar: number
      mes?: string
    }) => {
      const { tarjetaId, cuentaId, tipoPago, montoAPagar, mes } = params

      if (!tarjetaId || !cuentaId || montoAPagar <= 0) {
        showToast('Error en el pago', 'Monto o cuenta de débito no válidos', 'error')
        return
      }

      updateAndSaveState((prev) => {
        const tarjeta = (prev.tarjetas || []).find((t) => t.id === tarjetaId)
        if (!tarjeta) return prev

        // 1. Descontar el valor total exacto de la cuenta de débito / ahorros
        const nextCuentas = (prev.cuentas || []).map((c) =>
          c.id === cuentaId ? { ...c, saldo: c.saldo - montoAPagar } : c
        )

        // 2. Avanzar 1 cuota en cada una de las compras diferidas activas de esta tarjeta
        const todayStr = getLocalTodayISO()
        const nextComprasCuotas = (prev.comprasCuotas || []).map((compra) => {
          if (
            compra.tarjetaId !== tarjetaId ||
            compra.estado !== 'ACTIVA' ||
            compra.cuotasPagadas >= compra.cuotasTotales
          ) {
            return compra
          }

          const proximaCuota = compra.cuotasPagadas + 1
          const i = compra.tasaInteresMensual > 0 ? compra.tasaInteresMensual / 100 : 0
          const interes = Math.round(compra.saldoRestante * i)
          let abonoCapital = Math.max(0, compra.valorCuota - interes)

          if (abonoCapital > compra.saldoRestante || proximaCuota >= compra.cuotasTotales) {
            abonoCapital = compra.saldoRestante
          }

          const nuevoSaldo = Math.max(0, compra.saldoRestante - abonoCapital)
          const nuevoEstado: 'ACTIVA' | 'PAGADA' =
            nuevoSaldo === 0 || proximaCuota >= compra.cuotasTotales ? 'PAGADA' : 'ACTIVA'

          const pagoDetalle: PagoCuotaDetalle = {
            numeroCuota: proximaCuota,
            fechaPago: todayStr,
            montoPagado: compra.valorCuota,
            abonoCapital,
            interes,
            cuentaId,
          }

          return {
            ...compra,
            cuotasPagadas: proximaCuota,
            saldoRestante: nuevoSaldo,
            estado: nuevoEstado,
            historialPagos: [...(compra.historialPagos || []), pagoDetalle],
          }
        })

        // 3. Actualizar el estado del extracto de la tarjeta para reflejar el pago
        const nextTarjetas = (prev.tarjetas || []).map((t) => {
          if (t.id !== tarjetaId) return t

          const ext = t.ultimoExtracto
          if (!ext) return t

          if (tipoPago === 'TOTAL') {
            return {
              ...t,
              ultimoExtracto: {
                ...ext,
                pagoTotal: 0,
                pagoMinimo: 0,
                deudaCorte: 0,
                cupoDisponible: t.cupoTotal,
              },
            }
          }

          if (tipoPago === 'MINIMO') {
            const nuevoPagoTotal = Math.max(0, (ext.pagoTotal ?? 0) - montoAPagar)
            const nuevoDisponible = Math.min(t.cupoTotal, (ext.cupoDisponible ?? 0) + montoAPagar)
            return {
              ...t,
              ultimoExtracto: {
                ...ext,
                pagoMinimo: 0,
                pagoTotal: nuevoPagoTotal,
                cupoDisponible: nuevoDisponible,
              },
            }
          }

          // PERSONALIZADO
          const nuevoPagoTotal = Math.max(0, (ext.pagoTotal ?? 0) - montoAPagar)
          const nuevoPagoMinimo = Math.max(0, (ext.pagoMinimo ?? 0) - montoAPagar)
          const nuevoDisponible = Math.min(t.cupoTotal, (ext.cupoDisponible ?? 0) + montoAPagar)
          return {
            ...t,
            ultimoExtracto: {
              ...ext,
              pagoTotal: nuevoPagoTotal,
              pagoMinimo: nuevoPagoMinimo,
              cupoDisponible: nuevoDisponible,
            },
          }
        })

        // 4. Registrar la transacción bancaria del pago de la tarjeta
        const mesPago = mes || selectedMonth || getLocalCurrentMonth()
        const nuevoPagoTarjeta: PagoTarjetaGeneral = {
          id: `pago-tc-${Date.now()}`,
          fecha: todayStr,
          tarjetaId,
          cuentaId,
          monto: montoAPagar,
          tipoPago,
          mes: mesPago,
          descripcion: `Pago ${tipoPago === 'MINIMO' ? 'Mínimo' : tipoPago === 'TOTAL' ? 'Total' : 'Parcial'} Tarjeta ${tarjeta.nombre}`,
        }

        return {
          ...prev,
          cuentas: nextCuentas,
          tarjetas: nextTarjetas,
          comprasCuotas: nextComprasCuotas,
          pagosTarjetas: [...(prev.pagosTarjetas || []), nuevoPagoTarjeta],
        }
      })

      showToast(
        'Pago de Tarjeta Registrado',
        `Se debitaron $${montoAPagar.toLocaleString('es-CO')} de tu cuenta para liquidar la facturación de la tarjeta`,
        'success'
      )
    },
    [updateAndSaveState, showToast]
  )

  const prepagarCompra = useCallback(
    (compraId: string, cuentaId?: string) => {
      updateAndSaveState((prev) => {
        const compra = (prev.comprasCuotas || []).find((c) => c.id === compraId)
        if (!compra || compra.estado !== 'ACTIVA') return prev

        const montoPrepagar = compra.saldoRestante
        let nextCuentas = prev.cuentas || []
        if (cuentaId) {
          nextCuentas = nextCuentas.map((c) =>
            c.id === cuentaId ? { ...c, saldo: c.saldo - montoPrepagar } : c
          )
        }

        return {
          ...prev,
          cuentas: nextCuentas,
          comprasCuotas: (prev.comprasCuotas || []).map((c) =>
            c.id === compraId
              ? {
                  ...c,
                  saldoRestante: 0,
                  estado: 'PREPAGADA',
                  cuotasPagadas: c.cuotasTotales,
                }
              : c
          ),
        }
      })
      showToast('Compra prepagada totalmente', 'Deuda liquidada al 100%')
    },
    [updateAndSaveState, showToast]
  )

  const deleteCompraCuota = useCallback(
    (id: string) => {
      updateAndSaveState((prev) => ({
        ...prev,
        comprasCuotas: (prev.comprasCuotas || []).filter((c) => c.id !== id),
      }))
      showToast('Compra a cuotas eliminada', '', 'warning')
    },
    [updateAndSaveState, showToast]
  )

  // Presupuestos
  const setPresupuesto = useCallback(
    (presupuesto: Omit<PresupuestoCategoria, 'id'>) => {
      const id = `pres-${presupuesto.categoriaClave}-${presupuesto.mes}`
      updateAndSaveState((prev) => {
        const filtered = (prev.presupuestos || []).filter(
          (p) => !(p.categoriaClave === presupuesto.categoriaClave && p.mes === presupuesto.mes)
        )
        return {
          ...prev,
          presupuestos: [...filtered, { ...presupuesto, id }],
        }
      })
      showToast('Presupuesto actualizado', presupuesto.nombre)
    },
    [updateAndSaveState, showToast]
  )

  const deletePresupuesto = useCallback(
    (id: string) => {
      updateAndSaveState((prev) => ({
        ...prev,
        presupuestos: (prev.presupuestos || []).filter((p) => p.id !== id),
      }))
      showToast('Presupuesto eliminado', '', 'warning')
    },
    [updateAndSaveState, showToast]
  )

  // Limpiar toda la base de datos y reiniciar en blanco
  const clearAllData = useCallback(() => {
    const clean: FullFinanceState = {
      ...storageService.createEmptyState(),
      _cleanStateReset2026V2: true,
      _relojPaymentsRevertedV1: true,
    } as unknown as FullFinanceState
    setState(clean)
    storageService.saveLocalState(clean, userId)
    storageService.saveLocalState(clean, undefined)
    if (userId && isFirebaseConfigured()) {
      firebaseFinanceService.saveToFirestore(clean, userId).catch((err) => {
        console.error('Error al limpiar Firestore:', err)
      })
    }
    showToast('Datos reiniciados', 'Todas las cuentas y módulos han quedado en 0', 'info')
  }, [userId, showToast])

  // Cargar plantilla de datos de prueba
  const loadSampleData = useCallback(() => {
    const sample = storageService.createSampleState()
    setState(sample)
    storageService.saveLocalState(sample, userId)
    if (userId && isFirebaseConfigured()) {
      firebaseFinanceService.saveToFirestore(sample, userId).catch((err) => {
        console.error('Error al cargar datos de muestra en Firestore:', err)
      })
    }
    showToast('Datos de prueba cargados', 'Se cargaron los ejemplos de finanzas', 'info')
  }, [userId, showToast])

  // Limpiar y resetear exclusivamente las tarjetas y compras a cuotas para pruebas de extractos
  const limpiarDatosTarjetas = useCallback(() => {
    updateAndSaveState((prev) => {
      const tarjetasLimpias = (prev.tarjetas && prev.tarjetas.length > 0 ? prev.tarjetas : initialTarjetas).map((t) => ({
        ...t,
        ultimoExtracto: undefined,
      }))

      const gastosSinTarjetas = (prev.gastosPersonales || []).filter(
        (g) => !g.tarjetaId && g.metodoPago !== 'TARJETA_CREDITO' && !g.id.includes('nu') && !g.id.includes('bc')
      )

      return {
        ...prev,
        tarjetas: tarjetasLimpias,
        comprasCuotas: [],
        gastosPersonales: gastosSinTarjetas,
      }
    })
    showToast('Tarjetas listas y en blanco', 'Extractos y movimientos restablecidos para tu prueba')
  }, [updateAndSaveState, showToast])

  const resetData = useCallback(() => {
    clearAllData()
  }, [clearAllData])

  const exportBackup = useCallback(() => {
    const json = storageService.exportBackupJson(state)
    const blob = new Blob([json], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `contabilidad_casa_${user?.email?.split('@')[0] || 'backup'}_${new Date().toISOString().slice(0, 10)}.json`
    a.click()
    URL.revokeObjectURL(url)
    showToast('Copia de seguridad descargada', 'Archivo JSON generado exitosamente')
  }, [state, user, showToast])

  const importBackup = useCallback(
    (jsonStr: string) => {
      try {
        const imported = storageService.parseBackupJson(jsonStr)
        setState(imported)
        storageService.saveLocalState(imported, userId)
        if (userId && isFirebaseConfigured()) {
          firebaseFinanceService.saveToFirestore(imported, userId).catch((err) => {
            console.error('Error guardando backup en Firestore:', err)
          })
        }
        showToast('Copia restaurada', 'Datos importados y guardados correctamente')
      } catch (err) {
        showToast(
          'Error al importar',
          err instanceof Error ? err.message : 'Archivo no válido',
          'error'
        )
      }
    },
    [userId, showToast]
  )

  const syncFirebase = useCallback(async () => {
    if (!isFirebaseConfigured() || !userId) {
      showToast(
        'Firebase no configurado',
        'Verifica tu conexión y sesión en Firebase',
        'warning'
      )
      return
    }
    try {
      await firebaseFinanceService.saveToFirestore(state, userId)
      setIsFirebaseActive(true)
      showToast('Sincronizado', 'Tus finanzas están guardadas en Cloud Firestore', 'success')
    } catch (e) {
      showToast(
        'Error de sincronización',
        e instanceof Error ? e.message : 'Error al conectar con Firestore',
        'error'
      )
    }
  }, [state, userId, showToast])

  return (
    <FinanceContext.Provider
      value={{
        state,
        selectedMonth,
        setSelectedMonth,
        isFirebaseActive,
        toasts,
        showToast,
        removeToast,
        totalIngresosMes,
        totalGastosHogarMes,
        totalAlimentacionMes,
        totalGastosPersonalesMes,
        totalCuotasTarjetasMes,
        totalGastos1CuotaTarjetasMes,
        totalExtractoTarjetasMes,
        totalGastosMes,
        balanceNetoMes,
        saldoLiquidezTotal,
        deudaTotalTarjetas,
        cupoTotalTarjetas,
        cupoDisponibleTarjetas,
        addCuenta,
        updateCuenta,
        deleteCuenta,
        transferirEntreCuentas,
        addArriendo,
        updateArriendo,
        togglePagoArriendo,
        deleteArriendo,
        addServicio,
        updateServicio,
        togglePagoServicio,
        deleteServicio,
        addCompraHogar,
        deleteCompraHogar,
        addAlimentacion,
        deleteAlimentacion,
        addIngreso,
        deleteIngreso,
        addGastoPersonal,
        deleteGastoPersonal,
        addGastoRecurrente,
        updateGastoRecurrente,
        deleteGastoRecurrente,
        toggleActivoGastoRecurrente,
        aplicarGastoRecurrenteAlMes,
        aplicarTodosRecurrentesPendientes,
        addTarjeta,
        updateTarjeta,
        deleteTarjeta,
        addCompraCuota,
        updateCompraCuota,
        pagarCuotaCompra,
        revertirPagoCuotaCompra,
        pagarTarjeta,
        prepagarCompra,
        deleteCompraCuota,
        setPresupuesto,
        deletePresupuesto,
        resetData,
        clearAllData,
        limpiarDatosTarjetas,
        loadSampleData,
        exportBackup,
        importBackup,
        syncFirebase,
      }}
    >
      {children}
    </FinanceContext.Provider>
  )
}

export function useFinance() {
  const context = useContext(FinanceContext)
  if (!context) {
    throw new Error('useFinance debe ser utilizado dentro de un FinanceProvider')
  }
  return context
}
