// Summit components, one-to-one with the Figma library (page "Components").
import { ChevronRight, type LucideIcon } from 'lucide-react'
import type { ReactNode } from 'react'

export const ICON_STROKE = 1.75

export function Toggle({ on, onChange, label, disabled }: { on: boolean; onChange: () => void; label: string; disabled?: boolean }) {
  return (
    <button type="button" role="switch" aria-checked={on} aria-label={label} className="toggle" data-on={on} disabled={disabled} onClick={onChange}>
      <span className="toggle-knob" />
    </button>
  )
}

export type Tone = 'success' | 'warning' | 'danger' | 'neutral'
export function Badge({ tone, children }: { tone: Tone; children: ReactNode }) {
  return (
    <span className="badge">
      <span className="badge-dot" data-tone={tone} aria-hidden="true" />
      {children}
    </span>
  )
}

type ButtonVariant = 'primary' | 'secondary' | 'ghost'
export function Button({ variant = 'primary', size = 'm', icon: Icon, children, ...rest }: {
  variant?: ButtonVariant
  size?: 'm' | 's'
  icon?: LucideIcon
  children: ReactNode
} & React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button type="button" className="btn" data-variant={variant} data-size={size} {...rest}>
      {Icon && <Icon size={size === 'm' ? 18 : 16} strokeWidth={ICON_STROKE} aria-hidden="true" />}
      {children}
    </button>
  )
}

export function IconButton({ icon: Icon, label, variant = 'raised', dot, ...rest }: {
  icon: LucideIcon
  label: string
  variant?: 'raised' | 'ghost'
  dot?: boolean
} & React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button type="button" className="icon-btn" data-variant={variant} aria-label={label} title={label} {...rest}>
      <Icon size={20} strokeWidth={ICON_STROKE} aria-hidden="true" />
      {dot && <span className="icon-btn-dot" aria-hidden="true" />}
    </button>
  )
}

export function CardHeader({ title, subtitle, action, onAction }: { title: string; subtitle?: string; action?: string; onAction?: () => void }) {
  return (
    <div className="card-header">
      <div>
        <h2 className="t-title">{title}</h2>
        {subtitle && <p className="t-caption c-tertiary">{subtitle}</p>}
      </div>
      {action && (
        <button type="button" className="card-action" onClick={onAction}>
          {action}
          <ChevronRight size={16} strokeWidth={ICON_STROKE} aria-hidden="true" />
        </button>
      )}
    </div>
  )
}

export function IconTile({ icon: Icon, tone = 'orange' }: { icon: LucideIcon; tone?: 'orange' | 'teal' | 'device' }) {
  return (
    <span className="icon-tile" data-tone={tone} aria-hidden="true">
      <Icon size={18} strokeWidth={ICON_STROKE} />
    </span>
  )
}

export function StatCard({ icon, tone, label, value, unit, delta, deltaTone }: {
  icon: LucideIcon
  tone: 'orange' | 'teal'
  label: string
  value: string
  unit: string
  delta: string
  deltaTone: 'good' | 'bad' | 'neutral'
}) {
  return (
    <section className="card stat-card" aria-label={label}>
      <div className="stat-head">
        <IconTile icon={icon} tone={tone} />
        <span className="t-label c-secondary">{label}</span>
      </div>
      <p className="stat-value">
        <span className="t-metric-l tnum">{value}</span> <span className="t-title c-secondary">{unit}</span>
      </p>
      <p className="t-caption" data-delta={deltaTone}>{delta}</p>
    </section>
  )
}

export function ProgressRow({ label, value, pct, tone = 'orange' }: { label: string; value: string; pct: number; tone?: 'orange' | 'teal' }) {
  return (
    <div className="progress-row">
      <div className="progress-top">
        <span className="t-label">{label}</span>
        <span className="t-label c-secondary tnum">{value}</span>
      </div>
      <div className="progress-track" role="meter" aria-label={label} aria-valuenow={Math.round(pct * 100)} aria-valuemin={0} aria-valuemax={100}>
        <span className="progress-fill" data-tone={tone} style={{ width: `${Math.max(2, pct * 100)}%` }} />
      </div>
    </div>
  )
}

export function Gauge({ value, label, tone = 'orange', size = 160 }: { value: number; label: string; tone?: 'orange' | 'teal'; size?: number }) {
  const pct = Math.round(Math.min(100, Math.max(0, value)))
  return (
    <div className="gauge" style={{ width: size, height: size }} role="img" aria-label={`${label}: ${pct}%`}>
      {/* Figma ring: outer radius 80, inner radius 0.86 → 11.2 px stroke centered at r = 74.4 */}
      <svg viewBox="0 0 160 160" width={size} height={size} aria-hidden="true">
        <circle cx="80" cy="80" r="74.4" className="gauge-track" />
        <circle cx="80" cy="80" r="74.4" className="gauge-value" data-tone={tone} pathLength={100} strokeDasharray={`${pct} 100`} transform="rotate(-90 80 80)" />
      </svg>
      <div className="gauge-readout">
        <span className="t-metric-l tnum">{pct}%</span>
        <span className="t-caption c-secondary">{label}</span>
      </div>
    </div>
  )
}

export function Legend({ items }: { items: { label: string; tone: 'orange' | 'teal' }[] }) {
  return (
    <ul className="legend">
      {items.map(i => (
        <li key={i.label} className="t-caption c-secondary">
          <span className="legend-swatch" data-tone={i.tone} aria-hidden="true" />
          {i.label}
        </li>
      ))}
    </ul>
  )
}

export function SidebarStat({ label, value, meta, metaTone }: { label: string; value: string; meta: string; metaTone?: 'warning' }) {
  return (
    <div className="sidebar-stat">
      <span className="t-overline c-tertiary">{label}</span>
      <p>
        <span className="t-metric-l tnum">{value}</span> <span className="t-caption c-secondary" data-tone={metaTone}>{meta}</span>
      </p>
    </div>
  )
}
