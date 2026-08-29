import { type ChangeEvent } from 'react'
import { formatDate } from '../utils/formatters'

interface DatePickerInputProps {
  value: string // 'YYYY-MM-DD'
  onChange: (newDate: string) => void
  label?: string
  required?: boolean
  id?: string
  name?: string
  showQuickChips?: boolean
  selectedMonthContext?: string // 'YYYY-MM'
}

export function DatePickerInput({
  value,
  onChange,
  label = 'Fecha',
  required = true,
  id,
  name,
  showQuickChips = true,
  selectedMonthContext,
}: DatePickerInputProps) {
  const hoyISO = new Date().toISOString().slice(0, 10)

  // Acciones rápidas de fecha
  function setHoy() {
    onChange(hoyISO)
  }

  function setAyer() {
    const d = new Date()
    d.setDate(d.getDate() - 1)
    onChange(d.toISOString().slice(0, 10))
  }

  function setDia1() {
    const baseMonth = selectedMonthContext || (value ? value.slice(0, 7) : hoyISO.slice(0, 7))
    onChange(`${baseMonth}-01`)
  }

  function setDia15() {
    const baseMonth = selectedMonthContext || (value ? value.slice(0, 7) : hoyISO.slice(0, 7))
    onChange(`${baseMonth}-15`)
  }

  function setFinDeMes() {
    const baseMonth = selectedMonthContext || (value ? value.slice(0, 7) : hoyISO.slice(0, 7))
    const [y, m] = baseMonth.split('-').map(Number)
    const ultimoDia = new Date(y, m, 0).getDate()
    onChange(`${baseMonth}-${String(ultimoDia).padStart(2, '0')}`)
  }

  return (
    <div className="form-group datepicker-custom-group" style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <label htmlFor={id} style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--color-text-muted)', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
          <span>📅</span>
          <span>{label}</span>
          {required && <span style={{ color: 'var(--color-expense)' }}>*</span>}
        </label>
        {value && (
          <span style={{ fontSize: '0.725rem', fontWeight: 600, color: 'var(--color-primary-light)' }}>
            {formatDate(value)}
          </span>
        )}
      </div>

      <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
        <input
          id={id}
          name={name}
          type="date"
          required={required}
          value={value}
          onChange={(e: ChangeEvent<HTMLInputElement>) => onChange(e.target.value)}
          className="form-input datepicker-native-input"
          style={{
            width: '100%',
            padding: '0.6rem 0.75rem',
            borderRadius: 'var(--radius-md)',
            border: '1px solid var(--color-border)',
            backgroundColor: 'var(--color-surface)',
            color: 'var(--color-text-main)',
            fontSize: '0.875rem',
            fontFamily: 'inherit',
            fontWeight: 500,
            outline: 'none',
          }}
        />
      </div>

      {showQuickChips && (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.35rem', marginTop: '0.15rem' }}>
          <button
            type="button"
            onClick={setHoy}
            className="chip-quick-date"
            style={{
              fontSize: '0.7rem',
              padding: '0.15rem 0.45rem',
              borderRadius: 'var(--radius-sm)',
              border: '1px solid var(--color-border)',
              backgroundColor: value === hoyISO ? 'var(--color-primary-subtle)' : 'var(--color-bg-alt)',
              color: value === hoyISO ? 'var(--color-primary-light)' : 'var(--color-text-muted)',
              fontWeight: value === hoyISO ? 700 : 500,
              cursor: 'pointer',
            }}
          >
            ⚡ Hoy
          </button>
          <button
            type="button"
            onClick={setAyer}
            className="chip-quick-date"
            style={{
              fontSize: '0.7rem',
              padding: '0.15rem 0.45rem',
              borderRadius: 'var(--radius-sm)',
              border: '1px solid var(--color-border)',
              backgroundColor: 'var(--color-bg-alt)',
              color: 'var(--color-text-muted)',
              cursor: 'pointer',
            }}
          >
            📅 Ayer
          </button>
          <button
            type="button"
            onClick={setDia1}
            className="chip-quick-date"
            style={{
              fontSize: '0.7rem',
              padding: '0.15rem 0.45rem',
              borderRadius: 'var(--radius-sm)',
              border: '1px solid var(--color-border)',
              backgroundColor: 'var(--color-bg-alt)',
              color: 'var(--color-text-muted)',
              cursor: 'pointer',
            }}
          >
            1️⃣ Día 1
          </button>
          <button
            type="button"
            onClick={setDia15}
            className="chip-quick-date"
            style={{
              fontSize: '0.7rem',
              padding: '0.15rem 0.45rem',
              borderRadius: 'var(--radius-sm)',
              border: '1px solid var(--color-border)',
              backgroundColor: 'var(--color-bg-alt)',
              color: 'var(--color-text-muted)',
              cursor: 'pointer',
            }}
          >
            1️⃣5️⃣ Día 15
          </button>
          <button
            type="button"
            onClick={setFinDeMes}
            className="chip-quick-date"
            style={{
              fontSize: '0.7rem',
              padding: '0.15rem 0.45rem',
              borderRadius: 'var(--radius-sm)',
              border: '1px solid var(--color-border)',
              backgroundColor: 'var(--color-bg-alt)',
              color: 'var(--color-text-muted)',
              cursor: 'pointer',
            }}
          >
            🏁 Fin de mes
          </button>
        </div>
      )}
    </div>
  )
}
