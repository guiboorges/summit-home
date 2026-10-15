import { Droplets, Moon, Lock, Sun, Thermometer, Waves, Zap } from 'lucide-react'
import heroImg from '../assets/lake-house.jpg'
import forestImg from '../assets/pine-cabin.jpg'
import {
  batteryStatus, heating, hourOf, powerKw, roomsToday, sceneActive, scenes, solarKw, today, USE_PROFILE, usualWaterLitres, waterLitres, SUNRISE, SUNSET,
} from '../sim/model'
import type { HomeApi } from '../sim/useHome'
import { AreaChart } from './AreaChart'
import { DeviceRow } from './devices'
import { CardHeader, Gauge, IconTile, Legend, ProgressRow, StatCard, Toggle } from './ui'

const AXIS = ['00:00', '06:00', '12:00', '18:00', '24:00']
const clock = (h: number) => `${String(Math.floor(h)).padStart(2, '0')}:${String(Math.round((h % 1) * 60)).padStart(2, '0')}`
const SCENE_ICON = { evening: Moon, lake: Waves, away: Lock }

export function Overview({ api, onOpenDevices, onOpenTab }: { api: HomeApi; onOpenDevices: () => void; onOpenTab: (t: string) => void }) {
  const { home, now } = api
  const h = hourOf(now)
  const day = today(home, now)
  const power = powerKw(home)
  const solar = solarKw(h)
  const usual = USE_PROFILE[Math.floor(h)]
  const rooms = roomsToday(home, now).slice(0, 4)
  const maxRoom = Math.max(...rooms.map(r => r.kwh), 0.1)
  const active = home.devices.filter(d => d.on && d.online && d.kind !== 'lock' && d.kind !== 'sensor' && d.kind !== 'camera' && d.kind !== 'siren').sort((a, b) => b.watts - a.watts)
  const water = waterLitres(now)
  const usualWater = Math.max(1, usualWaterLitres(now))
  const heatKwh = 0.11 * h + (heating(home) ? 0.2 : 0)
  const temps = day.temp
  const tMin = Math.min(...temps) - 0.4
  const tMax = Math.max(...temps) + 0.4
  const thermostat = home.devices.find(d => d.id === 'thermostat')
  const yMax = Math.max(3.6, ...day.use, ...day.solar) * 1.05

  return (
    <div className="grid">
      <div className="col-a">
        <section className="hero summit-dark" style={{ backgroundImage: `url(${heroImg})` }} aria-labelledby="hero-title">
          <div className="hero-scrim" />
          <div className="hero-top">
            <div>
              <h2 id="hero-title" className="t-overline c-secondary">Energy today</h2>
              <p className="hero-value">
                <span className="t-metric-xl tnum">{day.usedKwh.toFixed(1)}</span> <span className="t-title c-secondary">kWh used</span>
              </p>
              <p className="t-label c-secondary">{day.solarKwh.toFixed(1)} kWh from solar · {Math.round(day.solarShare * 100)}% of your use</p>
            </div>
            <Legend items={[{ label: 'Consumption', tone: 'orange' }, { label: 'Solar', tone: 'teal' }]} />
          </div>
          <AreaChart
            label={`Consumption and solar today. Now ${power.toFixed(1)} kW used, ${solar.toFixed(1)} kW solar.`}
            height={110} xMax={24} yMax={yMax} grid axis={AXIS}
            series={[
              { name: 'solar', tone: 'teal', xs: day.hours, ys: day.solar },
              { name: 'use', tone: 'orange', xs: day.hours, ys: day.use, dot: true },
            ]}
          />
        </section>

        <div className="row">
          <section className="card">
            <CardHeader title="Indoor climate" subtitle={`Whole house, last ${Math.max(1, Math.round(h))} h`} action="Rooms" onAction={() => onOpenTab('Rooms')} />
            <p className="card-values">
              <span className="t-metric-l tnum">{home.indoor.toFixed(1)}°</span>
              <span className="t-label c-secondary">{heating(home) ? `Heating to ${thermostat?.level}°` : 'Humidity 46%'}</span>
            </p>
            <div className="spacer" />
            <AreaChart
              label={`Indoor temperature today, now ${home.indoor.toFixed(1)} degrees`}
              height={80} xMax={24} yMin={tMin} yMax={tMax} axis={AXIS}
              series={[{ name: 'temp', tone: 'orange', xs: day.hours, ys: temps, dot: true }]}
            />
          </section>
          <section className="card">
            <CardHeader title="Energy by room" subtitle="Today" action="All rooms" onAction={() => onOpenTab('Rooms')} />
            <div className="stack-14">
              {rooms.map(r => <ProgressRow key={r.room} label={r.room} value={`${r.kwh.toFixed(1)} kWh`} pct={r.kwh / (maxRoom / 0.7)} />)}
            </div>
          </section>
        </div>

        <div className="row">
          <section className="card">
            <CardHeader title="Home battery" subtitle={solar > power ? 'Charging from solar' : 'Supplying the house'} />
            <div className="battery-body">
              <Gauge value={home.battery} label="Charged" tone="teal" size={128} />
              <dl className="battery-list">
                {batteryStatus(home, now).map(s => (
                  <div key={s.label}>
                    <dt className="t-caption c-tertiary">{s.label}</dt>
                    <dd className="t-body-strong">{s.value}</dd>
                  </div>
                ))}
              </dl>
            </div>
          </section>
          <section className="card">
            <CardHeader title="Active devices" subtitle={`${active.length} on right now`} action="All" onAction={onOpenDevices} />
            <div className="stack-8">
              {active.slice(0, 3).map(d => <DeviceRow key={d.id} device={d} onToggle={() => api.toggle(d.id)} />)}
              {active.length === 0 && <p className="t-body c-secondary empty">Everything is off.</p>}
            </div>
          </section>
        </div>
      </div>

      <div className="col-b">
        <div className="stats">
          <StatCard icon={Zap} tone="orange" label="Power now" value={power.toFixed(1)} unit="kW"
            delta={`${power >= usual ? '▲' : '▼'} ${Math.abs(power - usual).toFixed(1)} vs usual`} deltaTone={power > usual ? 'bad' : 'good'} />
          <StatCard icon={Sun} tone="teal" label="Solar now" value={solar.toFixed(1)} unit="kW"
            delta={h < SUNRISE ? `Sunrise ${clock(SUNRISE)}` : h < SUNSET ? `Sunset ${clock(SUNSET)}` : `Sunrise ${clock(SUNRISE)}`} deltaTone="neutral" />
          <StatCard icon={Droplets} tone="teal" label="Water" value={String(water)} unit="L"
            delta={`${water <= usualWater ? '▼' : '▲'} ${Math.abs(Math.round((water / usualWater - 1) * 100))}% vs usual`} deltaTone={water <= usualWater ? 'good' : 'bad'} />
          <StatCard icon={Thermometer} tone="orange" label="Heating" value={heatKwh.toFixed(1)} unit="kWh"
            delta={heating(home) ? `▲ On, to ${thermostat?.level}°` : 'Idle'} deltaTone={heating(home) ? 'bad' : 'neutral'} />
        </div>

        <section className="scenes summit-dark" style={{ backgroundImage: `url(${forestImg})` }} aria-labelledby="scenes-title">
          <div className="scenes-scrim" />
          <div className="scenes-title">
            <h2 id="scenes-title" className="t-h3">Scenes</h2>
            <p className="t-caption c-secondary">One tap for the whole house</p>
          </div>
          {scenes.map(s => {
            const on = sceneActive(s, home.devices)
            const Icon = SCENE_ICON[s.id]
            return (
              <div key={s.id} className="device-row" data-glass>
                <IconTile icon={Icon} tone="device" />
                <div className="device-text">
                  <span className="t-body-strong">{s.name}</span>
                  <span className="t-caption c-secondary">{s.description}</span>
                </div>
                <Toggle on={on} onChange={() => api.setScene(s.id, !on)} label={`Scene ${s.name}`} />
              </div>
            )
          })}
        </section>
      </div>
    </div>
  )
}
