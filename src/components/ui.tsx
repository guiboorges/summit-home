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

export function Slider({ label, value, display, min = 0, max = 100, step = 1, tone = 'orange', onChange }: {
  label: string
  value: number
  display: string
  min?: number
  max?: number
  step?: number
  tone?: 'orange' | 'teal'
  onChange: (v: number) => void
}) {
  const pct = ((value - min) / (max - min)) * 100
  return (
    <label className="slider" data-tone={tone}>
      <span className="slider-top">
        <span className="t-label">{label}</span>
        <span className="t-label c-secondary tnum">{display}</span>
      </span>
      <input type="range" min={min} max={max} step={step} value={value} onChange={e => onChange(Number(e.target.value))} style={{ '--pct': `${pct}%` } as React.CSSProperties} />
    </label>
  )
}

export function Segmented<T extends string>({ options, value, onChange, label }: { options: { id: T; label: string }[]; value: T; onChange: (v: T) => void; label: string }) {
  return (
    <div className="tabs" role="radiogroup" aria-label={label}>
      {options.map(o => (
        <button key={o.id} type="button" role="radio" aria-checked={value === o.id} className="tab" aria-current={value === o.id ? 'true' : undefined} onClick={() => onChange(o.id)}>{o.label}</button>
      ))}
    </div>
  )
}

export function StatusRow({ icon, name, meta, tone, status }: { icon: LucideIcon; name: string; meta: string; tone: Tone; status: string }) {
  return (
    <div className="device-row">
      <IconTile icon={icon} tone="device" />
      <div className="device-text">
        <span className="t-body-strong">{name}</span>
        <span className="t-caption c-secondary">{meta}</span>
      </div>
      <Badge tone={tone}>{status}</Badge>
    </div>
  )
}

export function BarChart({ bars, height = 200, max, label, unit }: {
  bars: { label: string; used: number; solar: number; current?: boolean; future?: boolean; showLabel?: boolean }[]
  height?: number
  max?: number
  label: string
  unit: string
}) {
  const top = max ?? niceMax(Math.max(...bars.map(b => Math.max(b.used, b.solar)), 1))
  const ticks = [0, 0.25, 0.5, 0.75, 1].map(f => +(top * f).toFixed(top < 4 ? 1 : 0))
  const dense = bars.length > 12
  return (
    <figure className="bars" role="img" aria-label={label}>
      <div className="bars-plot" style={{ height }}>
        <div className="bars-grid" aria-hidden="true">
          {ticks.slice().reverse().map(t => <span key={t} className="t-caption"><i>{t}</i></span>)}
        </div>
        <div className="bars-groups" data-dense={dense || undefined}>
          {bars.map((b, i) => (
            <div key={i} className="bars-group" data-current={b.current || undefined} data-future={b.future || undefined} title={`${b.label}: ${b.used.toFixed(1)} ${unit} used, ${b.solar.toFixed(1)} ${unit} solar`}>
              <span className="bar" data-tone="orange" style={{ height: `${(b.used / top) * 100}%` }} />
              <span className="bar" data-tone="teal" style={{ height: `${(b.solar / top) * 100}%` }} />
            </div>
          ))}
        </div>
      </div>
      <div className="bars-labels t-caption" aria-hidden="true">
        {bars.map((b, i) => <span key={i} data-current={b.current || undefined}>{b.showLabel !== false ? b.label : ''}</span>)}
      </div>
    </figure>
  )
}

function niceMax(v: number) {
  const step = v <= 4 ? 1 : v <= 20 ? 5 : v <= 100 ? 25 : v <= 400 ? 100 : 250
  return Math.ceil(v / step) * step
}
