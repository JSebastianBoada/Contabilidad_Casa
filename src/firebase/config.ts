import { initializeApp, type FirebaseApp } from 'firebase/app'
import { getAuth, type Auth } from 'firebase/auth'
import { getFirestore, type Firestore } from 'firebase/firestore'

export interface FirebaseConfigOptions {
  apiKey: string
  authDomain: string
  projectId: string
  storageBucket?: string
  messagingSenderId?: string
  appId?: string
}

function getStoredFirebaseConfig(): FirebaseConfigOptions | null {
  // 1. Prioridad: Variables de entorno desde el archivo .env
  const metaEnv = (import.meta as unknown as { env?: Record<string, string> }).env || {}
  const envConfig: FirebaseConfigOptions = {
    apiKey: (metaEnv.VITE_FIREBASE_API_KEY ?? '').trim(),
    authDomain: (metaEnv.VITE_FIREBASE_AUTH_DOMAIN ?? '').trim(),
    projectId: (metaEnv.VITE_FIREBASE_PROJECT_ID ?? '').trim(),
    storageBucket: (metaEnv.VITE_FIREBASE_STORAGE_BUCKET ?? '').trim(),
    messagingSenderId: (metaEnv.VITE_FIREBASE_MESSAGING_SENDER_ID ?? '').trim(),
    appId: (metaEnv.VITE_FIREBASE_APP_ID ?? '').trim(),
  }

  if (envConfig.apiKey && envConfig.projectId) {
    return envConfig
  }

  // 2. Fallback a configuración guardada localmente
  try {
    const saved = localStorage.getItem('contabilidad_firebase_config')
    if (saved) {
      const parsed = JSON.parse(saved)
      if (parsed.apiKey && parsed.projectId) return parsed
    }
  } catch {
    // Ignore error
  }

  return null
}

let app: FirebaseApp | null = null
let db: Firestore | null = null
let auth: Auth | null = null

export function isFirebaseConfigured(): boolean {
  return getStoredFirebaseConfig() !== null
}

export function saveFirebaseConfig(config: FirebaseConfigOptions): void {
  localStorage.setItem('contabilidad_firebase_config', JSON.stringify(config))
  app = null
  db = null
  auth = null
}

export function getActiveFirebaseConfig(): FirebaseConfigOptions | null {
  return getStoredFirebaseConfig()
}

export function getFirebaseApp(): FirebaseApp {
  const config = getStoredFirebaseConfig()
  if (!config) {
    throw new Error('Firebase no está configurado todavía.')
  }
  if (!app) {
    app = initializeApp(config)
  }
  return app
}

export function getDb(): Firestore {
  if (db) return db
  db = getFirestore(getFirebaseApp())
  return db
}

export function getFirebaseAuth(): Auth {
  if (auth) return auth
  auth = getAuth(getFirebaseApp())
  return auth
}
