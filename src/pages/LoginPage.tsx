import { useState, type FormEvent } from 'react'
import { useAuth } from '../auth/AuthContext'
import { useTheme } from '../context/ThemeContext'
import {
  getActiveFirebaseConfig,
  saveFirebaseConfig,
  type FirebaseConfigOptions,
} from '../firebase/config'

export function LoginPage() {
  const { login, configured } = useAuth()
  const { isDark, toggleTheme } = useTheme()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [showHelp, setShowHelp] = useState(false)
  const [showConfig, setShowConfig] = useState(!configured)

  // Config state
  const activeConfig = getActiveFirebaseConfig()
  const [apiKey, setApiKey] = useState(activeConfig?.apiKey || '')
  const [projectId, setProjectId] = useState(activeConfig?.projectId || '')
  const [authDomain, setAuthDomain] = useState(activeConfig?.authDomain || '')
  const [configSuccess, setConfigSuccess] = useState(false)

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      await login(email, password)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al iniciar sesión')
    } finally {
      setLoading(false)
    }
  }

  function handleSaveFirebaseConfig(e: FormEvent) {
    e.preventDefault()
    if (!apiKey.trim() || !projectId.trim()) {
      setError('API Key y Project ID son requeridos para conectar con Firebase.')
      return
    }

    const newConfig: FirebaseConfigOptions = {
      apiKey: apiKey.trim(),
      projectId: projectId.trim(),
      authDomain: authDomain.trim() || `${projectId.trim()}.firebaseapp.com`,
      storageBucket: `${projectId.trim()}.appspot.com`,
    }

    saveFirebaseConfig(newConfig)
    setConfigSuccess(true)
    setTimeout(() => {
      window.location.reload()
    }, 600)
  }

  return (
    <div className="login-shell">
      <div className="login-card" style={{ position: 'relative' }}>
        {/* Botón Flotante de Modo Oscuro */}
        <div style={{ position: 'absolute', top: '1.25rem', right: '1.25rem' }}>
          <button
            type="button"
            className="theme-toggle-btn"
            onClick={toggleTheme}
            title={isDark ? 'Cambiar a Modo Claro' : 'Cambiar a Modo Oscuro'}
            aria-label={isDark ? 'Cambiar a Modo Claro' : 'Cambiar a Modo Oscuro'}
          >
            {isDark ? (
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="5" />
                <line x1="12" y1="1" x2="12" y2="3" />
                <line x1="12" y1="21" x2="12" y2="23" />
                <line x1="4.22" y1="4.22" x2="5.64" y2="5.64" />
                <line x1="18.36" y1="18.36" x2="19.78" y2="19.78" />
                <line x1="1" y1="12" x2="3" y2="12" />
                <line x1="21" y1="12" x2="23" y2="12" />
                <line x1="4.22" y1="19.78" x2="5.64" y2="18.36" />
                <line x1="18.36" y1="5.64" x2="19.78" y2="4.22" />
              </svg>
            ) : (
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
              </svg>
            )}
          </button>
        </div>

        {/* Brand Logo */}
        <div className="login-brand-header">
          <div className="login-brand-logo">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
              <polyline points="9 22 9 12 15 12 15 22" />
            </svg>
          </div>
          <span className="login-kicker">Finanzas del Hogar & Personales</span>
          <h1 className="login-title">Iniciar Sesión</h1>
          <p className="login-subtitle">
            Acceso exclusivo y seguro sincronizado con Cloud Firestore y Firebase Auth.
          </p>
        </div>

        {!configured && (
          <div className="banner warning" style={{ marginBottom: '1rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <strong>Firebase no detectado</strong>
              <p style={{ fontSize: '0.8rem', marginTop: '0.2rem' }}>
                Ingresa las credenciales de tu proyecto Firebase para conectar.
              </p>
            </div>
            <button
              type="button"
              className="btn secondary sm"
              onClick={() => setShowConfig(!showConfig)}
            >
              {showConfig ? 'Cerrar' : 'Configurar'}
            </button>
          </div>
        )}

        {showConfig && (
          <form
            onSubmit={handleSaveFirebaseConfig}
            style={{
              marginBottom: '1.25rem',
              padding: '0.85rem',
              backgroundColor: 'var(--color-bg-alt)',
              borderRadius: 'var(--radius-md)',
              border: '1px solid var(--color-border)',
              display: 'flex',
              flexDirection: 'column',
              gap: '0.65rem',
            }}
          >
            <strong style={{ fontSize: '0.85rem' }}>Configurar Conexión Firebase</strong>
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label style={{ fontSize: '0.75rem' }}>API Key *</label>
              <input
                type="text"
                className="form-input sm"
                placeholder="AIzaSy..."
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                required
              />
            </div>
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label style={{ fontSize: '0.75rem' }}>Project ID *</label>
              <input
                type="text"
                className="form-input sm"
                placeholder="contabilidad-casa-123"
                value={projectId}
                onChange={(e) => setProjectId(e.target.value)}
                required
              />
            </div>
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label style={{ fontSize: '0.75rem' }}>Auth Domain (Opcional)</label>
              <input
                type="text"
                className="form-input sm"
                placeholder="proyecto.firebaseapp.com"
                value={authDomain}
                onChange={(e) => setAuthDomain(e.target.value)}
              />
            </div>

            {configSuccess && (
              <span style={{ fontSize: '0.75rem', color: 'var(--color-success-light)' }}>
                Guardado. Recargando conexión...
              </span>
            )}

            <button type="submit" className="btn success sm" style={{ width: '100%', marginTop: '0.25rem' }}>
              Guardar y Conectar Firebase
            </button>
          </form>
        )}

        <form onSubmit={handleSubmit} className="login-form">
          <div className="form-group">
            <label>Correo Electrónico</label>
            <div className="input-with-icon">
              <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
                <polyline points="22,6 12,13 2,6" />
              </svg>
              <input
                type="email"
                className="form-input"
                placeholder="tu-correo@ejemplo.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                autoComplete="email"
                required
              />
            </div>
          </div>

          <div className="form-group">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <label>Contraseña</label>
              <button
                type="button"
                className="btn ghost sm"
                style={{ padding: '0 0.25rem', fontSize: '0.75rem' }}
                onClick={() => setShowPassword(!showPassword)}
              >
                {showPassword ? 'Ocultar' : 'Mostrar'}
              </button>
            </div>
            <div className="input-with-icon">
              <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2">
                <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                <path d="M7 11V7a5 5 0 0 1 10 0v4" />
              </svg>
              <input
                type={showPassword ? 'text' : 'password'}
                className="form-input"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="current-password"
                required
              />
            </div>
          </div>

          {error && (
            <div className="banner" style={{ backgroundColor: '#fef2f2', border: '1px solid #fecaca', color: '#b91c1c' }}>
              <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="12" r="10" />
                <line x1="12" y1="8" x2="12" y2="12" />
                <line x1="12" y1="16" x2="12.01" y2="16" />
              </svg>
              <span>{error}</span>
            </div>
          )}

          <button
            type="submit"
            className="btn primary"
            style={{ width: '100%', padding: '0.75rem', fontSize: '0.95rem', marginTop: '0.5rem' }}
            disabled={loading}
          >
            {loading ? (
              <span style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <span className="spinner" style={{ width: '16px', height: '16px' }} />
                Verificando...
              </span>
            ) : (
              'Ingresar al Sistema'
            )}
          </button>
        </form>

        {/* Guía para el Administrador */}
        <div style={{ borderTop: '1px solid var(--color-border)', paddingTop: '0.85rem', marginTop: '0.5rem' }}>
          <button
            type="button"
            className="btn ghost sm"
            style={{ width: '100%', justifyContent: 'center', fontSize: '0.775rem' }}
            onClick={() => setShowHelp(!showHelp)}
          >
            {showHelp ? 'Ocultar ayuda de acceso' : '¿Aún no has creado tu usuario en Firebase?'}
          </button>

          {showHelp && (
            <div
              style={{
                marginTop: '0.65rem',
                padding: '0.75rem',
                backgroundColor: 'var(--color-bg-alt)',
                borderRadius: 'var(--radius-md)',
                fontSize: '0.775rem',
                color: 'var(--color-text-muted)',
                lineHeight: 1.45,
              }}
            >
              <strong>Pasos para crear tu cuenta en Firebase Console:</strong>
              <ol style={{ paddingLeft: '1.1rem', marginTop: '0.35rem' }}>
                <li>Ve a <a href="https://console.firebase.google.com/" target="_blank" rel="noreferrer" style={{ color: 'var(--color-primary-light)', textDecoration: 'underline' }}>Firebase Console</a> → Tu proyecto.</li>
                <li>Menú lateral → <strong>Compilación</strong> → <strong>Authentication</strong>.</li>
                <li>En la pestaña <em>Sign-in method</em>, asegúrate de tener habilitado <strong>Correo electrónico/contraseña</strong>.</li>
                <li>En la pestaña <em>Users</em>, haz clic en <strong>Agregar usuario</strong> y coloca tu correo y contraseña.</li>
              </ol>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
