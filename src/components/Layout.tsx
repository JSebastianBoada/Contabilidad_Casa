import { useState } from 'react'
import { NavLink, Outlet } from 'react-router-dom'
import { useFinance } from '../context/FinanceContext'
import { useAuth } from '../auth/AuthContext'
import { useTheme } from '../context/ThemeContext'
import { QuickAddModal } from './QuickAddModal'
import { ToastContainer } from './Toast'
import { MonthPicker } from './MonthPicker'
import { formatMoney, formatCompactMoney } from '../utils/formatters'
import './Layout.css'

export function Layout() {
  const {
    selectedMonth,
    setSelectedMonth,
    isFirebaseActive,
    saldoLiquidezTotal,
  } = useFinance()

  const { user, logout } = useAuth()
  const { isDark, toggleTheme } = useTheme()

  const [sidebarCollapsed, setSidebarCollapsed] = useState(() => {
    return localStorage.getItem('sidebar_collapsed') === 'true'
  })
  const [sidebarMobileOpen, setSidebarMobileOpen] = useState(false)
  const [quickAddOpen, setQuickAddOpen] = useState(false)

  const handleToggleSidebar = () => {
    if (window.innerWidth <= 992) {
      setSidebarMobileOpen((prev) => !prev)
    } else {
      setSidebarCollapsed((prev) => {
        const next = !prev
        localStorage.setItem('sidebar_collapsed', String(next))
        return next
      })
    }
  }

  const handleCloseOrCollapseSidebar = () => {
    if (window.innerWidth <= 992) {
      setSidebarMobileOpen(false)
    } else {
      setSidebarCollapsed(true)
      localStorage.setItem('sidebar_collapsed', 'true')
    }
  }

  return (
    <div className="app-shell">
      {/* Mobile Backdrop */}
      {sidebarMobileOpen && (
        <div className="sidebar-backdrop" onClick={() => setSidebarMobileOpen(false)} />
      )}

      {/* Sidebar */}
      <aside className={`app-sidebar ${sidebarMobileOpen ? 'open' : ''} ${sidebarCollapsed ? 'collapsed' : ''}`}>
        {/* Brand Header */}
        <div className="brand">
          <div className="brand-row">
            <div
              className="brand-logo"
              onClick={() => {
                if (sidebarCollapsed) {
                  setSidebarCollapsed(false)
                  localStorage.setItem('sidebar_collapsed', 'false')
                }
              }}
              style={{ cursor: sidebarCollapsed ? 'pointer' : 'default' }}
              title={sidebarCollapsed ? 'Expandir menú' : 'Contabilidad Casa'}
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
                <polyline points="9 22 9 12 15 12 15 22" />
              </svg>
            </div>
            <div className="brand-titles">
              <strong>Contabilidad Casa</strong>
              <span>& Finanzas Personales</span>
            </div>
            {/* Close / Collapse Button */}
            <button
              type="button"
              className="sidebar-close-btn btn ghost sm icon-only"
              onClick={handleCloseOrCollapseSidebar}
              title="Minimizar menú"
              aria-label="Minimizar menú"
            >
              <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2.2">
                <line x1="18" y1="6" x2="6" y2="18" />
                <line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </button>
          </div>
        </div>

        {/* User Info Pill */}
        {user && (
          <div className="user-profile-card">
            <div className="user-avatar">
              {user.email ? user.email.charAt(0).toUpperCase() : 'U'}
            </div>
            <div className="user-info-text">
              <strong className="user-name">{user.email?.split('@')[0]}</strong>
              <span className="user-email">{user.email}</span>
            </div>
            <button
              type="button"
              className="btn ghost sm icon-only logout-btn"
              onClick={() => logout()}
              title="Cerrar Sesión"
              aria-label="Cerrar Sesión"
            >
              <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
                <polyline points="16 17 21 12 16 7" />
                <line x1="21" y1="12" x2="9" y2="12" />
              </svg>
            </button>
          </div>
        )}

        {/* Navigation Menu */}
        <nav className="sidebar-nav">
          <span className="nav-section-label">General</span>
          <NavLink
            to="/"
            end
            className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}
            onClick={() => setSidebarMobileOpen(false)}
            title="Dashboard 360°"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="3" width="7" height="9" rx="1" />
              <rect x="14" y="3" width="7" height="5" rx="1" />
              <rect x="14" y="12" width="7" height="9" rx="1" />
              <rect x="3" y="16" width="7" height="5" rx="1" />
            </svg>
            <span>Dashboard 360°</span>
          </NavLink>

          <NavLink
            to="/asesor"
            className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}
            onClick={() => setSidebarMobileOpen(false)}
            title="Asesor Financiero IA"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 2a4 4 0 0 1 4 4v2a4 4 0 0 1-8 0V6a4 4 0 0 1 4-4z" />
              <rect x="3" y="10" width="18" height="12" rx="4" />
              <circle cx="9" cy="15" r="1.5" />
              <circle cx="15" cy="15" r="1.5" />
              <line x1="9" y1="19" x2="15" y2="19" />
            </svg>
            <span>🤖 Asesor Financiero</span>
          </NavLink>

          <NavLink
            to="/conciliacion"
            className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}
            onClick={() => setSidebarMobileOpen(false)}
            title="Auditor & Extractos PDF"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
              <polyline points="14 2 14 8 20 8" />
              <line x1="16" y1="13" x2="8" y2="13" />
              <line x1="16" y1="17" x2="8" y2="17" />
              <polyline points="10 9 9 9 8 9" />
            </svg>
            <span>🔍 Auditor & Extractos</span>
          </NavLink>

          <span className="nav-section-label">Hogar y Familia</span>
          <NavLink
            to="/hogar"
            className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}
            onClick={() => setSidebarMobileOpen(false)}
            title="Hogar & Servicios Públicos"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
              <path d="M9 22V12h6v10" />
            </svg>
            <span>Hogar & Servicios</span>
          </NavLink>

          <NavLink
            to="/alimentacion"
            className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}
            onClick={() => setSidebarMobileOpen(false)}
            title="Alimentación & Mercado"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M18 8h1a4 4 0 0 1 0 8h-1" />
              <path d="M2 8h16v9a4 4 0 0 1-4 4H6a4 4 0 0 1-4-4V8z" />
              <line x1="6" y1="1" x2="6" y2="4" />
              <line x1="10" y1="1" x2="10" y2="4" />
              <line x1="14" y1="1" x2="14" y2="4" />
            </svg>
            <span>Alimentación & Mercado</span>
          </NavLink>

          <span className="nav-section-label">Finanzas & Crédito</span>
          <NavLink
            to="/personal"
            className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}
            onClick={() => setSidebarMobileOpen(false)}
            title="Personal, Nómina & Ocio"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="7" r="4" />
              <path d="M5.5 21v-2a6.5 6.5 0 0 1 13 0v2" />
            </svg>
            <span>Personal, Nómina & Ocio</span>
          </NavLink>

          <NavLink
            to="/tarjetas"
            className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}
            onClick={() => setSidebarMobileOpen(false)}
            title="Tarjetas de Crédito & Cuotas"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="2" y="5" width="20" height="14" rx="2" />
              <line x1="2" y1="10" x2="22" y2="10" />
            </svg>
            <span>Tarjetas & Cuotas</span>
          </NavLink>

          <NavLink
            to="/cuentas"
            className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}
            onClick={() => setSidebarMobileOpen(false)}
            title="Cuentas & Liquidez"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M3 21h18" />
              <path d="M3 10h18" />
              <path d="M5 6l7-3 7 3" />
              <path d="M4 10v11" />
              <path d="M20 10v11" />
              <path d="M8 14v4" />
              <path d="M12 14v4" />
              <path d="M16 14v4" />
            </svg>
            <span>Cuentas & Liquidez</span>
          </NavLink>

          <NavLink
            to="/presupuestos"
            className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}
            onClick={() => setSidebarMobileOpen(false)}
            title="Presupuestos & Metas"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 2v20" />
              <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
            </svg>
            <span>Presupuestos & Metas</span>
          </NavLink>
        </nav>

        {/* Sidebar Footer - Indicador de Estado de Conexión */}
        <div className="sidebar-footer">
          <div
            className="firebase-status-pill"
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '0.5rem',
              padding: '0.6rem 0.75rem',
              backgroundColor: isFirebaseActive ? 'rgba(16, 185, 129, 0.08)' : 'rgba(245, 158, 11, 0.08)',
              border: `1px solid ${isFirebaseActive ? 'rgba(16, 185, 129, 0.25)' : 'rgba(245, 158, 11, 0.25)'}`,
              borderRadius: 'var(--radius-md)',
              fontSize: '0.78rem',
              fontWeight: 600,
              color: isFirebaseActive ? '#059669' : '#d97706',
            }}
            title={isFirebaseActive ? 'Sincronizado con Firebase' : 'Conectando con la nube...'}
          >
            <span
              className="bullet"
              style={{
                width: '8px',
                height: '8px',
                borderRadius: '50%',
                backgroundColor: isFirebaseActive ? '#10b981' : '#f59e0b',
                boxShadow: isFirebaseActive ? '0 0 8px #10b981' : 'none',
              }}
            />
            <span>{isFirebaseActive ? 'Firebase Conectado' : 'Conectando...'}</span>
          </div>
        </div>
      </aside>

      {/* Main Container */}
      <div className="app-main">
        {/* Topbar */}
        <header className="app-topbar">
          <div className="topbar-left">
            <button
              type="button"
              className="menu-toggle-btn btn secondary sm"
              onClick={handleToggleSidebar}
              title={sidebarCollapsed ? 'Expandir menú lateral' : 'Minimizar menú lateral'}
              aria-label={sidebarCollapsed ? 'Expandir menú lateral' : 'Minimizar menú lateral'}
            >
              <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2.2">
                <line x1="3" y1="12" x2="21" y2="12" />
                <line x1="3" y1="6" x2="21" y2="6" />
                <line x1="3" y1="18" x2="21" y2="18" />
              </svg>
            </button>

            <MonthPicker
              value={selectedMonth}
              onChange={setSelectedMonth}
            />
          </div>

          <div className="topbar-right">
            <div
              className="badge income liquidity-badge"
              title={`Total disponible en cuentas: ${formatMoney(saldoLiquidezTotal)}`}
            >
              <span className="liquidity-full-text">Liquidez: <strong>{formatMoney(saldoLiquidezTotal)}</strong></span>
              <span className="liquidity-mobile-text"><strong>{formatCompactMoney(saldoLiquidezTotal)}</strong></span>
            </div>

            {/* Botón de Modo Oscuro / Modo Claro */}
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

            <button
              type="button"
              className="btn primary sm quick-add-btn"
              onClick={() => setQuickAddOpen(true)}
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <line x1="12" y1="5" x2="12" y2="19" />
                <line x1="5" y1="12" x2="19" y2="12" />
              </svg>
              <span className="quick-add-text">+ Registrar</span>
            </button>
          </div>
        </header>

        {/* Page Content */}
        <main style={{ minHeight: 'calc(100vh - var(--topbar-height))', width: '100%' }}>
          <Outlet />
        </main>
      </div>

      {/* Modales Globales */}
      <QuickAddModal isOpen={quickAddOpen} onClose={() => setQuickAddOpen(false)} />
      <ToastContainer />
    </div>
  )
}
