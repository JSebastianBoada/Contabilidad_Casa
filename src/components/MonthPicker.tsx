import { useState, useRef, useEffect } from 'react'
import { formatMonthYear, getLocalCurrentMonth } from '../utils/formatters'

interface MonthPickerProps {
  value: string // 'YYYY-MM'
  onChange: (newMonth: string) => void
  label?: string
}

const MESES = [
  { num: '01', nombre: 'Enero', corto: 'Ene' },
  { num: '02', nombre: 'Febrero', corto: 'Feb' },
  { num: '03', nombre: 'Marzo', corto: 'Mar' },
  { num: '04', nombre: 'Abril', corto: 'Abr' },
  { num: '05', nombre: 'Mayo', corto: 'May' },
  { num: '06', nombre: 'Junio', corto: 'Jun' },
  { num: '07', nombre: 'Julio', corto: 'Jul' },
  { num: '08', nombre: 'Agosto', corto: 'Ago' },
  { num: '09', nombre: 'Septiembre', corto: 'Sep' },
  { num: '10', nombre: 'Octubre', corto: 'Oct' },
  { num: '11', nombre: 'Noviembre', corto: 'Nov' },
  { num: '12', nombre: 'Diciembre', corto: 'Dic' },
]

export function MonthPicker({ value, onChange, label }: MonthPickerProps) {
  const [isOpen, setIsOpen] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)

  const currentLocalMonth = getLocalCurrentMonth()
  // Extraer año y mes
  const [yearStr, monthStr] = (value || currentLocalMonth).split('-')
  const [pickerYear, setPickerYear] = useState<number>(Number(yearStr) || new Date().getFullYear())

  useEffect(() => {
    if (yearStr) {
      setPickerYear(Number(yearStr))
    }
  }, [yearStr])

  // Cerrar dropdown al hacer click fuera
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false)
      }
    }
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside)
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [isOpen])

  // Navegar al mes anterior
  function handlePrevMonth() {
    let y = Number(yearStr)
    let m = Number(monthStr) - 1
    if (m < 1) {
      m = 12
      y -= 1
    }
    const newMonth = `${y}-${String(m).padStart(2, '0')}`
    onChange(newMonth)
  }

  // Navegar al mes siguiente
  function handleNextMonth() {
    let y = Number(yearStr)
    let m = Number(monthStr) + 1
    if (m > 12) {
      m = 1
      y += 1
    }
    const newMonth = `${y}-${String(m).padStart(2, '0')}`
    onChange(newMonth)
  }

  // Seleccionar mes desde el popup
  function handleSelectMonth(numMes: string) {
    const newMonth = `${pickerYear}-${numMes}`
    onChange(newMonth)
    setIsOpen(false)
  }

  // Ir al mes actual del sistema
  function handleIrAMesActual() {
    onChange(currentLocalMonth)
    setIsOpen(false)
  }

  return (
    <div className="custom-month-picker-container" ref={containerRef} style={{ position: 'relative', display: 'inline-flex', alignItems: 'center' }}>
      {label && <span className="month-label" style={{ marginRight: '0.45rem', fontSize: '0.8rem', color: 'var(--color-text-muted)', fontWeight: 600 }}>{label}</span>}

      <div className="month-picker-controls" style={{ display: 'inline-flex', alignItems: 'center', backgroundColor: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-md)', padding: '2px', boxShadow: 'var(--shadow-xs)' }}>
        {/* Botón Mes Anterior */}
        <button
          type="button"
          onClick={handlePrevMonth}
          className="month-nav-arrow"
          title="Mes anterior"
          aria-label="Mes anterior"
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: '28px',
            height: '28px',
            borderRadius: 'var(--radius-sm)',
            color: 'var(--color-text-muted)',
            transition: 'all 0.15s ease',
          }}
        >
          <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2.5">
            <polyline points="15 18 9 12 15 6" />
          </svg>
        </button>

        {/* Botón Principal Desplegable con el Nombre del Mes */}
        <button
          type="button"
          onClick={() => setIsOpen(!isOpen)}
          className="month-display-btn"
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.4rem',
            padding: '0.3rem 0.65rem',
            borderRadius: 'var(--radius-sm)',
            fontSize: '0.825rem',
            fontWeight: 700,
            color: 'var(--color-text-main)',
            backgroundColor: isOpen ? 'var(--color-bg-alt)' : 'transparent',
            transition: 'all 0.15s ease',
          }}
        >
          <span>{formatMonthYear(value)}</span>
          <svg
            viewBox="0 0 24 24"
            width="14"
            height="14"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.2"
            style={{
              transform: isOpen ? 'rotate(180deg)' : 'rotate(0deg)',
              transition: 'transform 0.2s ease',
              color: 'var(--color-text-muted)',
            }}
          >
            <polyline points="6 9 12 15 18 9" />
          </svg>
        </button>

        {/* Botón Mes Siguiente */}
        <button
          type="button"
          onClick={handleNextMonth}
          className="month-nav-arrow"
          title="Mes siguiente"
          aria-label="Mes siguiente"
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: '28px',
            height: '28px',
            borderRadius: 'var(--radius-sm)',
            color: 'var(--color-text-muted)',
            transition: 'all 0.15s ease',
          }}
        >
          <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2.5">
            <polyline points="9 18 15 12 9 6" />
          </svg>
        </button>
      </div>

      {/* POPUP DROPDOWN DE SELECCIÓN DE MES Y AÑO */}
      {isOpen && (
        <div
          className="month-picker-dropdown"
          style={{
            position: 'absolute',
            top: 'calc(100% + 8px)',
            left: 0,
            zIndex: 9999,
            backgroundColor: 'var(--color-surface)',
            border: '1px solid var(--color-border-strong)',
            borderRadius: 'var(--radius-lg)',
            padding: '1rem',
            boxShadow: 'var(--shadow-xl)',
            width: '290px',
            maxWidth: 'calc(100vw - 2rem)',
            backdropFilter: 'blur(12px)',
            animation: 'fadeIn 0.15s ease-out',
          }}
        >
          {/* Header del Selector de Año */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              marginBottom: '0.85rem',
              paddingBottom: '0.65rem',
              borderBottom: '1px solid var(--color-border)',
            }}
          >
            <button
              type="button"
              className="btn ghost sm icon-only"
              onClick={() => setPickerYear((prev) => prev - 1)}
              title="Año anterior"
              aria-label="Año anterior"
            >
              <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2.4">
                <polyline points="15 18 9 12 15 6" />
              </svg>
            </button>
            <strong
              style={{
                fontFamily: 'var(--font-display)',
                fontSize: '1.05rem',
                fontWeight: 700,
                color: 'var(--color-text-main)',
                letterSpacing: '0.04em',
              }}
            >
              {pickerYear}
            </strong>
            <button
              type="button"
              className="btn ghost sm icon-only"
              onClick={() => setPickerYear((prev) => prev + 1)}
              title="Año siguiente"
              aria-label="Año siguiente"
            >
              <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2.4">
                <polyline points="9 18 15 12 9 6" />
              </svg>
            </button>
          </div>

          {/* Grid de 12 Meses */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(3, 1fr)',
              gap: '0.45rem',
              marginBottom: '0.85rem',
            }}
          >
            {MESES.map((m) => {
              const isSelected = `${pickerYear}-${m.num}` === value
              const isCurrentCalendarMonth = `${pickerYear}-${m.num}` === currentLocalMonth

              return (
                <button
                  key={m.num}
                  type="button"
                  onClick={() => handleSelectMonth(m.num)}
                  style={{
                    padding: '0.55rem 0.3rem',
                    borderRadius: 'var(--radius-md)',
                    fontSize: '0.825rem',
                    fontWeight: isSelected ? 700 : isCurrentCalendarMonth ? 600 : 500,
                    textAlign: 'center',
                    backgroundColor: isSelected
                      ? 'var(--color-primary-light)'
                      : isCurrentCalendarMonth
                      ? 'var(--color-bg-alt)'
                      : 'transparent',
                    color: isSelected
                      ? '#ffffff'
                      : isCurrentCalendarMonth
                      ? 'var(--color-primary-light)'
                      : 'var(--color-text-main)',
                    border: isSelected
                      ? '1px solid var(--color-primary-light)'
                      : isCurrentCalendarMonth
                      ? '1px solid var(--color-primary-border)'
                      : '1px solid transparent',
                    cursor: 'pointer',
                    transition: 'all 0.15s ease',
                  }}
                  onMouseEnter={(e) => {
                    if (!isSelected) {
                      e.currentTarget.style.backgroundColor = 'var(--color-bg-alt)'
                      e.currentTarget.style.borderColor = 'var(--color-border)'
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (!isSelected) {
                      e.currentTarget.style.backgroundColor = isCurrentCalendarMonth
                        ? 'var(--color-bg-alt)'
                        : 'transparent'
                      e.currentTarget.style.borderColor = isCurrentCalendarMonth
                        ? 'var(--color-primary-border)'
                        : 'transparent'
                    }
                  }}
                >
                  {m.nombre}
                </button>
              )
            })}
          </div>

          {/* Botón rápido "Mes Actual" */}
          <div
            style={{
              display: 'flex',
              justifyContent: 'center',
              borderTop: '1px solid var(--color-border)',
              paddingTop: '0.65rem',
            }}
          >
            <button
              type="button"
              onClick={handleIrAMesActual}
              className="btn secondary sm"
              style={{
                width: '100%',
                fontSize: '0.78rem',
                fontWeight: 600,
                padding: '0.45rem',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '0.4rem',
              }}
            >
              Ir al mes actual ({formatMonthYear(currentLocalMonth)})
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
