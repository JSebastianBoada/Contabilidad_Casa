import { formatCompactMoney, formatMoney } from '../utils/formatters'

interface DonutSlice {
  label: string
  value: number
  color: string
}

interface DonutChartProps {
  data: DonutSlice[]
  totalLabel?: string
}

export function DonutChart({ data, totalLabel = 'Total Gastos' }: DonutChartProps) {
  const total = data.reduce((acc, item) => acc + item.value, 0)

  if (total === 0) {
    return (
      <div style={{ textAlign: 'center', padding: '2rem 1rem', color: 'var(--color-text-muted)' }}>
        No hay gastos registrados en este período.
      </div>
    )
  }

  let cumulativeAngle = 0
  const radius = 70
  const strokeWidth = 24
  const circumference = 2 * Math.PI * radius

  const slices = data
    .filter((d) => d.value > 0)
    .map((d) => {
      const percentage = d.value / total
      const strokeDasharray = `${percentage * circumference} ${circumference}`
      const strokeDashoffset = -cumulativeAngle * circumference
      cumulativeAngle += percentage

      return {
        ...d,
        percentage: Math.round(percentage * 100),
        strokeDasharray,
        strokeDashoffset,
      }
    })

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 'clamp(1rem, 2vw, 1.5rem)',
        flexWrap: 'wrap',
        width: '100%',
      }}
    >
      <div style={{ position: 'relative', width: '170px', height: '170px', flexShrink: 0 }}>
        <svg viewBox="0 0 200 200" width="100%" height="100%">
          <circle
            cx="100"
            cy="100"
            r={radius}
            fill="transparent"
            stroke="var(--color-bg-alt)"
            strokeWidth={strokeWidth}
          />
          {slices.map((slice, i) => (
            <circle
              key={i}
              cx="100"
              cy="100"
              r={radius}
              fill="transparent"
              stroke={slice.color}
              strokeWidth={strokeWidth}
              strokeDasharray={slice.strokeDasharray}
              strokeDashoffset={slice.strokeDashoffset}
              transform="rotate(-90 100 100)"
              style={{ transition: 'stroke-dasharray 0.4s ease, stroke-dashoffset 0.4s ease' }}
            />
          ))}
        </svg>
        <div
          style={{
            position: 'absolute',
            inset: 0,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            pointerEvents: 'none',
            textAlign: 'center',
          }}
        >
          <span style={{ fontSize: '0.7rem', color: 'var(--color-text-muted)', fontWeight: 600 }}>
            {totalLabel}
          </span>
          <strong style={{ fontFamily: 'var(--font-display)', fontSize: '0.95rem', color: 'var(--color-text-main)' }}>
            {formatCompactMoney(total)}
          </strong>
        </div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.45rem', flex: 1, minWidth: '200px' }}>
        {slices.map((slice, i) => (
          <div
            key={i}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              fontSize: '0.825rem',
              gap: '0.5rem',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem', minWidth: 0 }}>
              <span
                style={{
                  width: '9px',
                  height: '9px',
                  borderRadius: '2.5px',
                  backgroundColor: slice.color,
                  flexShrink: 0,
                }}
              />
              <span style={{ color: 'var(--color-text-main)', fontWeight: 500, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                {slice.label}
              </span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', flexShrink: 0 }}>
              <strong style={{ color: 'var(--color-text-main)' }}>{formatMoney(slice.value)}</strong>
              <span style={{ color: 'var(--color-text-muted)', fontSize: '0.75rem', width: '28px', textAlign: 'right' }}>
                {slice.percentage}%
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

interface MonthlyBarData {
  month: string
  ingresos: number
  gastos: number
}

interface BarChartCashflowProps {
  data: MonthlyBarData[]
}

export function BarChartCashflow({ data }: BarChartCashflowProps) {
  const maxVal = Math.max(
    ...data.flatMap((d) => [d.ingresos, d.gastos]),
    100000
  )

  return (
    <div style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '0.85rem', fontSize: '0.75rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
          <span style={{ width: '9px', height: '9px', borderRadius: '2px', backgroundColor: '#059669' }} />
          <span>Ingresos</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
          <span style={{ width: '9px', height: '9px', borderRadius: '2px', backgroundColor: '#e11d48' }} />
          <span>Gastos</span>
        </div>
      </div>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: `repeat(${data.length}, 1fr)`,
          gap: 'clamp(0.5rem, 1.5vw, 1.25rem)',
          height: '160px',
          alignItems: 'flex-end',
          borderBottom: '1px solid var(--color-border)',
          paddingBottom: '0.5rem',
          width: '100%',
        }}
      >
        {data.map((item, idx) => {
          const hIngreso = Math.round((item.ingresos / maxVal) * 100)
          const hGasto = Math.round((item.gastos / maxVal) * 100)

          return (
            <div
              key={idx}
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                height: '100%',
                justifyContent: 'flex-end',
                gap: '0.35rem',
                minWidth: 0,
              }}
            >
              <div style={{ display: 'flex', alignItems: 'flex-end', gap: '4px', height: '100%', width: '100%', justifyContent: 'center' }}>
                <div
                  title={`Ingresos: ${formatMoney(item.ingresos)}`}
                  style={{
                    width: 'clamp(10px, 2vw, 16px)',
                    height: `${Math.max(4, hIngreso)}%`,
                    backgroundColor: '#059669',
                    borderRadius: '3px 3px 0 0',
                    transition: 'height 0.4s ease',
                  }}
                />
                <div
                  title={`Gastos: ${formatMoney(item.gastos)}`}
                  style={{
                    width: 'clamp(10px, 2vw, 16px)',
                    height: `${Math.max(4, hGasto)}%`,
                    backgroundColor: '#e11d48',
                    borderRadius: '3px 3px 0 0',
                    transition: 'height 0.4s ease',
                  }}
                />
              </div>
              <span style={{ fontSize: '0.725rem', color: 'var(--color-text-muted)', fontWeight: 600 }}>
                {item.month}
              </span>
            </div>
          )
        })}
      </div>
    </div>
  )
}
