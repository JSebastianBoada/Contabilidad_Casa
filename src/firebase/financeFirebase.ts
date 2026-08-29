import {
  doc,
  getDoc,
  setDoc,
  onSnapshot,
  serverTimestamp,
  type Unsubscribe,
} from 'firebase/firestore'
import { getDb, isFirebaseConfigured } from './config'
import type { FullFinanceState } from '../services/storageService'

// Helper to recursively strip undefined properties so Firestore never throws 'Unsupported field value: undefined'
function sanitizeForFirestore<T>(data: T): T {
  return JSON.parse(JSON.stringify(data))
}

export const firebaseFinanceService = {
  async saveToFirestore(state: FullFinanceState, userId?: string): Promise<void> {
    if (!isFirebaseConfigured() || !userId) return
    try {
      const db = getDb()
      const docPath = `usuarios/${userId}`
      const docRef = doc(db, docPath)
      const sanitized = sanitizeForFirestore(state)
      await setDoc(docRef, {
        ...sanitized,
        serverTime: serverTimestamp(),
      })
    } catch (err) {
      console.error('Error guardando en Firestore:', err)
      throw err
    }
  },

  async loadFromFirestore(userId?: string): Promise<FullFinanceState | null> {
    if (!isFirebaseConfigured() || !userId) return null
    try {
      const db = getDb()
      const docPath = `usuarios/${userId}`
      const docRef = doc(db, docPath)
      const snap = await getDoc(docRef)
      if (snap.exists()) {
        return snap.data() as FullFinanceState
      }
      return null
    } catch (err) {
      console.error('Error leyendo de Firestore:', err)
      throw err
    }
  },

  subscribeToFinanceState(
    userId: string,
    onData: (state: FullFinanceState | null) => void,
    onError?: (err: Error) => void
  ): Unsubscribe | null {
    if (!isFirebaseConfigured() || !userId) return null
    try {
      const db = getDb()
      const docPath = `usuarios/${userId}`
      const docRef = doc(db, docPath)

      return onSnapshot(
        docRef,
        (snap) => {
          if (snap.exists()) {
            onData(snap.data() as FullFinanceState)
          } else {
            onData(null)
          }
        },
        (error) => {
          console.error('Error en suscripción en tiempo real de Firestore:', error)
          if (onError) onError(error)
        }
      )
    } catch (err) {
      console.error('Error al inicializar suscripción Firestore:', err)
      if (onError && err instanceof Error) onError(err)
      return null
    }
  },
}
