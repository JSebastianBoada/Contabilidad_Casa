import type { ReactNode } from 'react'

interface StatCardProps {
  title: string
  value: string
  subtext?: string
  iconType?: 'income' | 'expense' | 'primary' | 'warning' | 'credit'
  icon?: ReactNode
  badge?: {
    text: string
    variant?: 'income' | 'expense' | 'warning' | 'credit' | 'neutral'
  }
}

export function StatCard({
  title,
  value,
  subtext,
  iconType = 'primary',
  icon,
  badge,
}: StatCardProps) {
  return (
    <article className="stat-card">
      <div className="stat-card-top">
        <span className="stat-card-title">{title}</span>
        {icon && <div className={`stat-icon ${iconType}`}>{icon}</div>}
      </div>
      <div className="stat-value">{value}</div>
      <div className="stat-subtext">
        {badge && (
          <span className={`badge ${badge.variant || 'neutral'}`}>
            {badge.text}
          </span>
        )}
        {subtext && <span>{subtext}</span>}
      </div>
    </article>
  )
}
