import { BatteryCharging, Euro, House, Lightbulb, PlugZap, Sun, Zap } from 'lucide-react'
import { batterySummary, bars, flow, kpis, PERIODS, priceAt, topConsumers, type Period } from '../sim/energy'
import { hourOf } from '../sim/model'
import type { HomeApi } from '../sim/useHome'
import { BarChart, CardHeader, Gauge, ICON_STROKE, Legend, ProgressRow, Segmented, StatCard } from './ui'

const PERIOD_TITLE: Record<Period, string> = { today: 'Today', '7d': 'Last 7 days', '30d': 'Last 30 days', year: 'This year' }
const VS: Record<Period, string> = { today: 'vs yesterday by now', '7d': 'vs previous 7 days', '30d': 'vs previous 30 days', year: 'vs last year' }
const kw = (v: number) => `${Math.abs(v).toFixed(1)} kW`
const pct = (v: number) => (Math.abs(v) < 0.005 ? '= Same' : `${v >= 0 ? '▲' : '▼'} ${Math.abs(Math.round(v * 100))}%`)

export function Energy({ api, period, setPeriod }: { api: HomeApi; period: Period; setPeriod: (p: Period) => void }) {
  const { home, now } = api
  const k = kpis(home, now, period)
  const list = bars(home, now, period)
  const f = flow(home, now)
  const top = topConsumers(home, now, period)
  const bat = batterySummary(home, now, period)
  const h = hourOf(now)
  const price = priceAt(h)
  const peak = price === 0.27
  const dishwasher = home.devices.find(d => d.id === 'dishwasher')

  return (
    <div className="energy">
      <div className="period-row">
        <h2 className="t-h3">{PERIOD_TITLE[period]}</h2>
        <Segmented label="Period" options={PERIODS} value={period} onChange={setPeriod} />
      </div>

      <div className="kpis">
        <StatCard icon={Zap} tone="orange" label="Used" value={k.used.toFixed(period === 'year' ? 0 : 1)} unit="kWh" delta={`${pct(k.usedDelta)} ${VS[period]}`} deltaTone={Math.abs(k.usedDelta) < 0.005 ? 'neutral' : k.usedDelta < 0 ? 'good' : 'bad'} />
        <StatCard icon={Sun} tone="teal" label="Solar produced" value={k.solar.toFixed(period === 'year' ? 0 : 1)} unit="kWh" delta={`${pct(k.solarDelta)} ${VS[period]}`} deltaTone={k.solarDelta >= 0 ? 'good' : 'neutral'} />
        <StatCard icon={BatteryCharging} tone="teal" label="Self-sufficiency" value={String(Math.round(k.selfSufficiency * 100))} unit="%" delta="Solar and battery" deltaTone="neutral" />
        <StatCard icon={Euro} tone="orange" label="Grid cost" value={`€${k.cost.toFixed(2)}`} unit="" delta={`${k.costDelta <= 0 ? '▼' : '▲'} €${Math.abs(k.costDelta).toFixed(2)} ${VS[period]}`} deltaTone={k.costDelta <= 0 ? 'good' : 'bad'} />
      </div>

      <div className="energy-row">
        <section className="card">
          <div className="card-header">
            <div>
              <h2 className="t-title">Consumption and solar</h2>
              <p className="t-caption c-tertiary">{period === 'today' ? 'kWh per hour' : period === 'year' ? 'kWh per month' : 'kWh per day'}</p>
            </div>
            <Legend items={[{ label: 'Consumption', tone: 'orange' }, { label: 'Solar', tone: 'teal' }]} />
          </div>
          <BarChart bars={list} unit="kWh" label={`Consumption and solar, ${PERIOD_TITLE[period].toLowerCase()}`} height={210} />
        </section>

        <section className="card flow-card">
          <CardHeader title="Live energy flow" subtitle="Right now" />
          <div className="flow" role="img" aria-label={`Solar ${kw(f.solar)}, home ${kw(f.home)}, battery ${f.battery >= 0 ? 'charging' : 'discharging'} ${kw(f.battery)}, grid ${f.grid === 0 ? 'idle' : f.grid > 0 ? `importing ${kw(f.grid)}` : `exporting ${kw(f.grid)}`}`}>
            <svg viewBox="0 0 320 240" preserveAspectRatio="none" aria-hidden="true">
              <line x1="160" y1="28" x2="160" y2="116" data-active={f.solar > 0.05 || undefined} />
              <line x1="160" y1="116" x2="56" y2="170" data-active={Math.abs(f.battery) > 0.05 || undefined} />
              <line x1="160" y1="116" x2="264" y2="170" data-active={Math.abs(f.grid) > 0.05 || undefined} data-tone="orange" />
            </svg>
            <FlowNode x={50} y={11.7} icon={Sun} tone="teal" label="Solar" value={f.solar > 0.05 ? kw(f.solar) : 'Night'} side="right" />
            <FlowNode x={50} y={48.3} icon={House} tone="orange" label="Home" value={kw(f.home)} side="left" />
            <FlowNode x={17.5} y={70.8} icon={BatteryCharging} tone="teal" label={`Battery ${Math.round(home.battery)}%`} value={Math.abs(f.battery) < 0.05 ? 'Idle' : `${f.battery > 0 ? '+' : '−'}${kw(f.battery)}`} side="below" />
            <FlowNode x={82.5} y={70.8} icon={PlugZap} tone="device" label="Grid" value={Math.abs(f.grid) < 0.05 ? 'Idle' : `${f.grid > 0 ? 'In' : 'Out'} ${kw(f.grid)}`} side="below" />
          </div>
        </section>
      </div>

      <div className="energy-row energy-row-3">
        <section className="card">
          <CardHeader title="Top consumers" subtitle={PERIOD_TITLE[period]} />
          <div className="stack-14">
            {top.map(t => <ProgressRow key={t.name} label={t.name} value={`${t.kwh.toFixed(t.kwh < 10 ? 1 : 0)} kWh`} pct={(t.kwh / top[0].kwh) * 0.95} />)}
          </div>
        </section>
        <section className="card">
          <CardHeader title="Electricity price" subtitle="Time-of-use tariff" />
          <p className="card-values">
            <span className="t-metric-l tnum">€{price.toFixed(2)}</span>
            <span className="t-label c-secondary">/kWh · {peak ? 'peak until 21:00' : price === 0.12 ? 'cheap until 07:00' : h < 17 ? 'peak from 17:00' : 'cheap from 23:00'}</span>
          </p>
          <div className="price-bars" role="img" aria-label="Price by hour: €0.12 from 23:00 to 07:00, €0.27 from 17:00 to 21:00, €0.19 otherwise">
            {Array.from({ length: 24 }, (_, i) => {
              const p = priceAt(i)
              return <span key={i} data-band={p === 0.12 ? 'cheap' : p === 0.27 ? 'peak' : 'normal'} data-now={i === Math.floor(h) || undefined} style={{ height: `${(p / 0.27) * 100}%` }} />
            })}
          </div>
          <div className="chart-axis t-caption" aria-hidden="true"><span>00</span><span>06</span><span>12</span><span>18</span><span>24</span></div>
          <p className="tip t-caption c-secondary">
            <Lightbulb size={18} strokeWidth={ICON_STROKE} aria-hidden="true" />
            {dishwasher?.on && price > 0.12
              ? `The dishwasher is running at €${price.toFixed(2)}/kWh. After 23:00 it would cost about €${(1.1 * (price - 0.12)).toFixed(2)} less.`
              : 'Heavy appliances are cheapest between 23:00 and 07:00 (€0.12/kWh).'}
          </p>
        </section>
        <section className="card battery-card">
          <CardHeader title="Home battery" subtitle={PERIOD_TITLE[period]} />
          <div className="battery-body">
            <Gauge value={home.battery} label="Charged" tone="teal" size={112} />
            <dl className="battery-list">
              <div><dt className="t-caption c-tertiary">Stored from solar</dt><dd className="t-body-strong tnum">{bat.stored.toFixed(1)} kWh</dd></div>
              <div><dt className="t-caption c-tertiary">Used at night</dt><dd className="t-body-strong tnum">{bat.night.toFixed(1)} kWh</dd></div>
              <div><dt className="t-caption c-tertiary">Grid avoided</dt><dd className="t-body-strong tnum">€{bat.avoided.toFixed(2)}</dd></div>
            </dl>
          </div>
        </section>
      </div>
    </div>
  )
}

function FlowNode({ x, y, icon: Icon, tone, label, value, side }: { x: number; y: number; icon: typeof Sun; tone: 'orange' | 'teal' | 'device'; label: string; value: string; side: 'left' | 'right' | 'below' }) {
  return (
    <div className="flow-node" data-side={side} style={{ left: `${x}%`, top: `${y}%` }}>
      <span className="flow-dot" data-tone={tone}><Icon size={22} strokeWidth={ICON_STROKE} aria-hidden="true" /></span>
      <span className="flow-label">
        <span className="t-caption c-tertiary">{label}</span>
        <span className="t-body-strong tnum">{value}</span>
      </span>
    </div>
  )
}
