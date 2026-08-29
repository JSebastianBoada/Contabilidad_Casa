import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { AuthProvider, useAuth } from './auth/AuthContext'
import { ThemeProvider } from './context/ThemeContext'
import { FinanceProvider } from './context/FinanceContext'
import { Layout } from './components/Layout'
import { HomePage } from './pages/HomePage'
import { HogarPage } from './pages/HogarPage'
import { AlimentacionPage } from './pages/AlimentacionPage'
import { PersonalPage } from './pages/PersonalPage'
import { TarjetasPage } from './pages/TarjetasPage'
import { CuentasPage } from './pages/CuentasPage'
import { PresupuestosPage } from './pages/PresupuestosPage'
import { LoginPage } from './pages/LoginPage'
import './App.css'

function AppContent() {
  const { ready, user } = useAuth()

  if (!ready) {
    return (
      <div className="login-shell">
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.75rem', color: 'var(--color-text-muted)' }}>
          <div className="spinner" style={{ width: '32px', height: '32px' }} />
          <span style={{ fontSize: '0.9rem', fontWeight: 500 }}>Conectando con Firebase...</span>
        </div>
      </div>
    )
  }

  // La autenticación con Firebase es obligatoria para acceder al sistema
  if (!user) {
    return <LoginPage />
  }

  return (
    <FinanceProvider>
      <Routes>
        <Route element={<Layout />}>
          <Route index element={<HomePage />} />
          <Route path="hogar" element={<HogarPage />} />
          <Route path="alimentacion" element={<AlimentacionPage />} />
          <Route path="personal" element={<PersonalPage />} />
          <Route path="tarjetas" element={<TarjetasPage />} />
          <Route path="cuentas" element={<CuentasPage />} />
          <Route path="presupuestos" element={<PresupuestosPage />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Route>
      </Routes>
    </FinanceProvider>
  )
}

export default function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <BrowserRouter>
          <AppContent />
        </BrowserRouter>
      </AuthProvider>
    </ThemeProvider>
  )
}

