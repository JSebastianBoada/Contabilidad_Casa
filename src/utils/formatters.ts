export function formatMoney(value: number): string {
  const safe = Number.isFinite(value) ? Math.round(value) : 0
  return new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency: 'COP',
    maximumFractionDigits: 0,
  }).format(safe)
}

export function formatCompactMoney(value: number): string {
  const safe = Number.isFinite(value) ? Math.round(value) : 0
  if (Math.abs(safe) >= 1_000_000) {
    return `$${(safe / 1_000_000).toFixed(1)}M`
  }
  if (Math.abs(safe) >= 1_000) {
    return `$${(safe / 1_000).toFixed(0)}k`
  }
  return formatMoney(safe)
}

export function formatDate(dateString: string): string {
  if (!dateString) return ''
  try {
    const [year, month, day] = dateString.split('-').map(Number)
    if (!year || !month || !day) return dateString
    const date = new Date(year, month - 1, day)
    return new Intl.DateTimeFormat('es-CO', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    }).format(date)
  } catch {
    return dateString
  }
}

export function formatMonthYear(monthString: string): string {
  if (!monthString) return ''
  try {
    const [year, month] = monthString.split('-').map(Number)
    if (!year || !month) return monthString
    const date = new Date(year, month - 1, 1)
    const formatted = new Intl.DateTimeFormat('es-CO', {
      month: 'long',
      year: 'numeric',
    }).format(date)
    return formatted.charAt(0).toUpperCase() + formatted.slice(1)
  } catch {
    return monthString
  }
}

export function getDaysRemaining(targetDateStr: string): {
  days: number
  isExpired: boolean
  label: string
} {
  if (!targetDateStr) {
    return { days: 0, isExpired: false, label: 'Sin fecha' }
  }
  const today = new Date()
  today.setHours(0, 0, 0, 0)

  const [y, m, d] = targetDateStr.split('-').map(Number)
  const target = new Date(y, m - 1, d)
  target.setHours(0, 0, 0, 0)

  const diffTime = target.getTime() - today.getTime()
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))

  if (diffDays < 0) {
    return {
      days: Math.abs(diffDays),
      isExpired: true,
      label: `Venció hace ${Math.abs(diffDays)} ${Math.abs(diffDays) === 1 ? 'día' : 'días'}`,
    }
  }
  if (diffDays === 0) {
    return { days: 0, isExpired: false, label: '¡Vence hoy!' }
  }
  if (diffDays === 1) {
    return { days: 1, isExpired: false, label: 'Vence mañana' }
  }
  return {
    days: diffDays,
    isExpired: false,
    label: `Vence en ${diffDays} días`,
  }
}
