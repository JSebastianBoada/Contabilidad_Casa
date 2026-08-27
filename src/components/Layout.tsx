import { useState } from 'react'
import { NavLink, Outlet } from 'react-router-dom'
import { useFinance } from '../context/FinanceContext'
import { useAuth } from '../auth/AuthContext'
import { QuickAddModal } from './QuickAddModal'
import { ToastContainer } from './Toast'
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

  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [quickAddOpen, setQuickAddOpen] = useState(false)

  return (
    <div className="app-shell">
      {/* Mobile Backdrop */}
      {sidebarOpen && (
        <div className="sidebar-backdrop" onClick={() => setSidebarOpen(false)} />
      )}

      {/* Sidebar */}
      <aside className={`app-sidebar ${sidebarOpen ? 'open' : ''}`}>
        {/* Brand Header */}
        <div className="brand">
          <div className="brand-row">
            <div className="brand-logo">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
                <polyline points="9 22 9 12 15 12 15 22" />
              </svg>
            </div>
            <div className="brand-titles">
              <strong>Contabilidad Casa</strong>
              <span>& Finanzas Personales</span>
            </div>
            {/* Close Button on Mobile */}
            <button
              type="button"
              className="sidebar-close-btn btn ghost sm"
              onClick={() => setSidebarOpen(false)}
              aria-label="Cerrar menú"
            >
              <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2">
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
            onClick={() => setSidebarOpen(false)}
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="3" width="7" height="9" rx="1" />
              <rect x="14" y="3" width="7" height="5" rx="1" />
              <rect x="14" y="12" width="7" height="9" rx="1" />
              <rect x="3" y="16" width="7" height="5" rx="1" />
            </svg>
            <span>Dashboard 360°</span>
          </NavLink>

          <span className="nav-section-label">Hogar y Familia</span>
          <NavLink
            to="/hogar"
            className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}
            onClick={() => setSidebarOpen(false)}
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
            onClick={() => setSidebarOpen(false)}
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
            onClick={() => setSidebarOpen(false)}
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
            onClick={() => setSidebarOpen(false)}
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
            onClick={() => setSidebarOpen(false)}
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
            onClick={() => setSidebarOpen(false)}
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
            <span>{isFirebaseActive ? 'Firebase Conectado' : 'Conectando Nube...'}</span>
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
              onClick={() => setSidebarOpen(!sidebarOpen)}
              aria-label="Abrir menú"
            >
              <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2">
                <line x1="3" y1="12" x2="21" y2="12" />
                <line x1="3" y1="6" x2="21" y2="6" />
                <line x1="3" y1="18" x2="21" y2="18" />
              </svg>
            </button>

            <div className="month-selector">
              <span className="month-label" style={{ color: 'var(--color-text-muted)' }}>Mes:</span>
              <input
                type="month"
                value={selectedMonth}
                onChange={(e) => setSelectedMonth(e.target.value)}
                aria-label="Seleccionar mes"
              />
            </div>
          </div>

          <div className="topbar-right">
            <div
              className="badge income liquidity-badge"
              title={`Total disponible en cuentas: ${formatMoney(saldoLiquidezTotal)}`}
            >
              <span className="liquidity-full-text">Liquidez: <strong>{formatMoney(saldoLiquidezTotal)}</strong></span>
              <span className="liquidity-mobile-text"><strong>{formatCompactMoney(saldoLiquidezTotal)}</strong></span>
            </div>

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
