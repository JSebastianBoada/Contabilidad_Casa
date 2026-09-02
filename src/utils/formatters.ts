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

/**
 * Obtener la fecha local actual del dispositivo en formato YYYY-MM-DD
 * (evita el desfase de zona horaria UTC que sumaba 1 día en Colombia a partir de las 7:00 PM)
 */
export function getLocalTodayISO(): string {
  const now = new Date()
  const year = now.getFullYear()
  const month = String(now.getMonth() + 1).padStart(2, '0')
  const day = String(now.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

/**
 * Obtener el mes local actual en formato YYYY-MM
 */
export function getLocalCurrentMonth(): string {
  const now = new Date()
  const year = now.getFullYear()
  const month = String(now.getMonth() + 1).padStart(2, '0')
  return `${year}-${month}`
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
    return { days: 0, isExpired: false, label: 'Vence hoy' }
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

/**
 * Limpiar y deduplicar textos de fecha provenientes de extractos (ej. "sep. 02, 2026 sep. 02, 2026" -> "sep. 02, 2026")
 */
export function cleanDateText(raw: string | undefined): string {
  if (!raw) return ''
  const s = raw.trim()

  // 1. Extraer formato de mes en texto: "sep. 02, 2026" o "septiembre 02, 2026"
  const m1 = s.match(/(?:ene|feb|mar|abr|may|jun|jul|ago|sep|oct|nov|dic)[a-z]*\.?\s*\d{1,2}(?:,\s*|\s+)\d{4}/i)
  if (m1) return m1[0].trim()

  // 2. Extraer formato de día primero: "02 de sep de 2026" o "02 sep 2026"
  const m2 = s.match(/\d{1,2}\s*(?:de\s+)?(?:ene|feb|mar|abr|may|jun|jul|ago|sep|oct|nov|dic)[a-z]*\.?\s*(?:de\s+)?\d{4}/i)
  if (m2) return m2[0].trim()

  // 3. Extraer formato numérico: "02/09/2026" o "2026-09-02"
  const m3 = s.match(/\d{1,2}[-/]\d{1,2}[-/]\d{4}/) || s.match(/\d{4}[-/]\d{1,2}[-/]\d{1,2}/)
  if (m3) return m3[0].trim()

  // 4. Deduplicar palabras consecutivas o frases repetidas
  const words = s.split(/\s+/)
  const uniqueWords: string[] = []
  for (const w of words) {
    if (uniqueWords.length === 0 || uniqueWords[uniqueWords.length - 1] !== w) {
      uniqueWords.push(w)
    }
  }
  return uniqueWords.join(' ')
}
