import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import {
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signOut,
  type User,
} from 'firebase/auth'
import { getFirebaseAuth, isFirebaseConfigured } from '../firebase/config'

type AuthContextValue = {
  user: User | null
  ready: boolean
  configured: boolean
  login: (email: string, password: string) => Promise<void>
  logout: () => Promise<void>
}

const AuthContext = createContext<AuthContextValue | null>(null)

function mapAuthError(err: unknown): Error {
  const code = (err as { code?: string }).code ?? ''
  if (
    code === 'auth/invalid-credential' ||
    code === 'auth/wrong-password' ||
    code === 'auth/user-not-found'
  ) {
    return new Error('Correo o contraseña incorrectos. Verifica tus credenciales.')
  }
  if (code === 'auth/invalid-email') {
    return new Error('El formato del correo no es válido.')
  }
  if (code === 'auth/too-many-requests') {
    return new Error('Demasiados intentos fallidos. Intenta de nuevo más tarde o restablece tu contraseña.')
  }
  if (code === 'auth/network-request-failed') {
    return new Error('Error de conexión a internet o con los servidores de Firebase.')
  }
  if (code === 'auth/operation-not-allowed') {
    return new Error('La autenticación por correo/contraseña no está habilitada en tu Firebase Console (Authentication → Sign-in method).')
  }
  return err instanceof Error ? err : new Error('Error al iniciar sesión.')
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const configured = isFirebaseConfigured()
  const [user, setUser] = useState<User | null>(null)
  const [ready, setReady] = useState(!configured)

  useEffect(() => {
    if (!configured) {
      setReady(true)
      return
    }
    try {
      const auth = getFirebaseAuth()
      const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
        setUser(currentUser)
        setReady(true)
      })
      return () => unsubscribe()
    } catch (e) {
      console.warn('Error inicializando auth listener:', e)
      setReady(true)
    }
  }, [configured])

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      ready,
      configured,
      async login(email, password) {
        try {
          const auth = getFirebaseAuth()
          const cred = await signInWithEmailAndPassword(
            auth,
            email.trim(),
            password
          )
          await cred.user.getIdToken()
        } catch (err) {
          throw mapAuthError(err)
        }
      },
      async logout() {
        if (isFirebaseConfigured()) {
          try {
            await signOut(getFirebaseAuth())
          } catch (e) {
            console.error('Error cerrando sesión:', e)
          }
        }
        setUser(null)
      },
    }),
    [user, ready, configured]
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext)
  if (!ctx) {
    throw new Error('useAuth debe usarse dentro de AuthProvider')
  }
  return ctx
}
