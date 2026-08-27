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

// Configuración oficial del proyecto Firebase
const defaultFirebaseConfig: FirebaseConfigOptions = {
  apiKey: "AIzaSyDQi_VMfJ_C78lwORZLqThQckKrKT5JU8o",
  authDomain: "contabilidadcasa-6231f.firebaseapp.com",
  projectId: "contabilidadcasa-6231f",
  storageBucket: "contabilidadcasa-6231f.firebasestorage.app",
  messagingSenderId: "1044914739954",
  appId: "1:1044914739954:web:ab6930bcd0bbcd87068e6b",
}

function getStoredFirebaseConfig(): FirebaseConfigOptions {
  // 1. Si existen variables en .env, utilizarlas
  const metaEnv = (import.meta as unknown as { env?: Record<string, string> }).env || {}
  const envApiKey = (metaEnv.VITE_FIREBASE_API_KEY ?? '').trim()
  const envProjectId = (metaEnv.VITE_FIREBASE_PROJECT_ID ?? '').trim()

  if (envApiKey && envProjectId) {
    return {
      apiKey: envApiKey,
      authDomain: (metaEnv.VITE_FIREBASE_AUTH_DOMAIN ?? '').trim() || defaultFirebaseConfig.authDomain,
      projectId: envProjectId,
      storageBucket: (metaEnv.VITE_FIREBASE_STORAGE_BUCKET ?? '').trim() || defaultFirebaseConfig.storageBucket,
      messagingSenderId: (metaEnv.VITE_FIREBASE_MESSAGING_SENDER_ID ?? '').trim() || defaultFirebaseConfig.messagingSenderId,
      appId: (metaEnv.VITE_FIREBASE_APP_ID ?? '').trim() || defaultFirebaseConfig.appId,
    }
  }

  // 2. Usar la configuración integrada predeterminada
  return defaultFirebaseConfig
}

let app: FirebaseApp | null = null
let db: Firestore | null = null
let auth: Auth | null = null

export function isFirebaseConfigured(): boolean {
  return true
}

export function saveFirebaseConfig(config: FirebaseConfigOptions): void {
  localStorage.setItem('contabilidad_firebase_config', JSON.stringify(config))
  app = null
  db = null
  auth = null
}

export function getActiveFirebaseConfig(): FirebaseConfigOptions {
  return getStoredFirebaseConfig()
}

export function getFirebaseApp(): FirebaseApp {
  const config = getStoredFirebaseConfig()
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
