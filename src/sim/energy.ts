import { hourOf, powerKw, solarKw, today, USE_PROFILE, type Home } from './model'

export type Period = 'today' | '7d' | '30d' | 'year'
export const PERIODS: { id: Period; label: string }[] = [
  { id: 'today', label: 'Today' }, { id: '7d', label: '7 days' }, { id: '30d', label: '30 days' }, { id: 'year', label: 'Year' },
]

export interface Bar {
  label: string
  used: number
  solar: number
  current?: boolean
  future?: boolean
  showLabel?: boolean
}

/** Grid price in €/kWh: cheap at night, peak in the early evening. */
export const priceAt = (h: number) => (h < 7 || h >= 23 ? 0.12 : h >= 17 && h < 21 ? 0.27 : 0.19)

// Deterministic pseudo-random number in [0, 1) for a given day, so history is stable across reloads.
function rand(seed: number) {
  const x = Math.sin(seed * 12.9898) * 43758.5453
  return x - Math.floor(x)
}
const dayKey = (d: Date) => d.getFullYear() * 1000 + Math.floor((d.getTime() - new Date(d.getFullYear(), 0, 0).getTime()) / 86_400_000)

/** A past day: heating pushes winter use up; solar follows the season and the weather. */
export function pastDay(d: Date): { used: number; solar: number } {
  const m = d.getMonth()
  const winter = (Math.cos(((m + 0.5) / 12) * 2 * Math.PI) + 1) / 2 // 1 in January, 0 in July
  const sunny = 1 - winter
  const k = dayKey(d)
  const used = 11.5 + 6 * winter + 3 * rand(k)
  const solar = (3 + 15 * sunny) * (0.45 + 0.55 * rand(k + 0.5))
  return { used: +used.toFixed(1), solar: +solar.toFixed(1) }
}

const WEEKDAY = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
const MONTH = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

export function bars(home: Home, now: Date, period: Period): Bar[] {
  const t = today(home, now)
  if (period === 'today') {
    const h = Math.floor(hourOf(now))
    return USE_PROFILE.map((u, i) => ({
      label: String(i).padStart(2, '0'),
      used: i < h ? u : i === h ? powerKw(home) : 0,
      solar: i < h ? solarKw(i + 0.5) : i === h ? solarKw(hourOf(now)) : 0,
      current: i === h,
      future: i > h,
      showLabel: i % 6 === 0,
    }))
  }
  if (period === 'year') {
    const out: Bar[] = []
    for (let m = 0; m < 12; m++) {
      const days = new Date(now.getFullYear(), m + 1, 0).getDate()
      const sample = pastDay(new Date(now.getFullYear(), m, 15))
      const n = m < now.getMonth() ? days : m === now.getMonth() ? now.getDate() : 0
      out.push({ label: MONTH[m], used: +(sample.used * n).toFixed(0), solar: +(sample.solar * n).toFixed(0), current: m === now.getMonth(), future: m > now.getMonth(), showLabel: true })
    }
    return out
  }
  const n = period === '7d' ? 7 : 30
  const out: Bar[] = []
  for (let i = n - 1; i > 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth(), now.getDate() - i)
    out.push({ ...pastDay(d), label: period === '7d' ? WEEKDAY[d.getDay()] : String(d.getDate()), showLabel: period === '7d' || i % 5 === 0 })
  }
  out.push({ label: 'Today', used: +t.usedKwh.toFixed(1), solar: +t.solarKwh.toFixed(1), current: true, showLabel: true })
  return out
}

export interface Kpis {
  used: number
  solar: number
  selfSufficiency: number
  cost: number
  usedDelta: number // vs the previous period, as a fraction
  solarDelta: number
  costDelta: number // €
}

function summarize(list: { used: number; solar: number }[]) {
  const used = list.reduce((s, b) => s + b.used, 0)
  const solar = list.reduce((s, b) => s + b.solar, 0)
  // About 90% of solar reaches the house, directly or through the battery.
  const covered = Math.min(used * 0.95, solar * 0.9)
  return { used, solar, self: used ? covered / used : 0, cost: (used - covered) * 0.19 }
}

export function kpis(home: Home, now: Date, period: Period): Kpis {
  const cur = summarize(bars(home, now, period).filter(b => !b.future))
  let prev
  if (period === 'year') prev = { ...cur, used: cur.used * 1.06, solar: cur.solar * 0.93, cost: cur.cost * 1.12 }
  else {
    const n = period === 'today' ? 1 : period === '7d' ? 7 : 30
    const frac = period === 'today' ? hourOf(now) / 24 : 1
    const list = []
    for (let i = n; i < 2 * n; i++) {
      const p = pastDay(new Date(now.getFullYear(), now.getMonth(), now.getDate() - i))
      list.push({ used: p.used * frac, solar: p.solar * frac })
    }
    prev = summarize(list)
  }
  return {
    used: cur.used, solar: cur.solar, selfSufficiency: cur.self, cost: cur.cost,
    usedDelta: prev.used ? cur.used / prev.used - 1 : 0,
    solarDelta: prev.solar ? cur.solar / prev.solar - 1 : 0,
    costDelta: cur.cost - prev.cost,
  }
}

export interface Flow {
  solar: number
  home: number
  battery: number // + charging, − discharging
  grid: number // + importing, − exporting
}

/** Where the power goes right now. Surplus sun fills the battery first, then goes to the grid. */
export function flow(home: Home, now: Date): Flow {
  const solar = solarKw(hourOf(now))
  const use = powerKw(home)
  const net = solar - use
  if (net >= 0) return home.battery < 100 ? { solar, home: use, battery: net, grid: 0 } : { solar, home: use, battery: 0, grid: -net }
  return home.battery > 5 ? { solar, home: use, battery: net, grid: 0 } : { solar, home: use, battery: 0, grid: -net }
}

// Typical kWh per day for each consumer, used to rank them over a period.
const DAILY: Record<string, number> = { heating: 4.5, dishwasher: 1.4, oven: 1.0, 'office-desk': 0.9, 'living-tv': 0.6, lights: 0.6, purifier: 0.8, 'towel-warmer': 0.5 }
const NAMES: Record<string, string> = { heating: 'Heating', lights: 'Lights' }

export function topConsumers(home: Home, now: Date, period: Period): { name: string; kwh: number }[] {
  const days = period === 'today' ? hourOf(now) / 24 : period === '7d' ? 7 : period === '30d' ? 30 : now.getMonth() * 30.4 + now.getDate()
  return Object.entries(DAILY)
    .map(([id, perDay]) => ({ name: NAMES[id] ?? home.devices.find(d => d.id === id)?.name ?? id, kwh: perDay * days * (period === 'year' ? 1.15 : 1) }))
    .sort((a, b) => b.kwh - a.kwh)
    .slice(0, 4)
}

export function batterySummary(home: Home, now: Date, period: Period) {
  const solar = bars(home, now, period).filter(b => !b.future).reduce((s, b) => s + b.solar, 0)
  const stored = solar * 0.25
  const night = stored * 0.87
  return { stored, night, avoided: night * 0.19 }
}
