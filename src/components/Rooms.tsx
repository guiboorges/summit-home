import { Bath, BedDouble, CookingPot, DoorOpen, Lock, Monitor, Moon, Plus, Power, Sofa, Sun, Users, Waves, type LucideIcon } from 'lucide-react'
import { useState } from 'react'
import { sceneActive, scenes } from '../sim/model'
import { AUTOMATIONS, roomHourly, roomSummaries, type RoomIcon } from '../sim/rooms'
import type { HomeApi } from '../sim/useHome'
import { DeviceRow } from './devices'
import { Button, CardHeader, ICON_STROKE, IconTile, Slider, Toggle } from './ui'

export const ROOM_ICONS: Record<RoomIcon, LucideIcon> = { sofa: Sofa, kitchen: CookingPot, office: Monitor, bed: BedDouble, bath: Bath, deck: Waves, entrance: Lock, room: DoorOpen }
const AUTO_ICONS = { sun: Sun, moon: Moon, lock: Lock, users: Users }

export function Rooms({ api, onAddRoom }: { api: HomeApi; onAddRoom: () => void }) {
  const { home, now } = api
  const rooms = roomSummaries(home, now)
  const [selected, setSelected] = useState(rooms[0]?.room ?? '')
  const room = rooms.find(r => r.room === selected) ?? rooms[0]
  const lights = room.devices.filter(d => d.kind === 'light' && d.online)
  const thermostat = home.devices.find(d => d.id === 'thermostat')
  const hourly = roomHourly(home, now, room.room)
  const hMax = Math.max(...hourly, 0.05)
  const evening = scenes.find(s => s.id === 'evening')!
  const eveningOn = sceneActive(evening, home.devices)

  return (
    <div className="grid">
      <div className="col-a">
        <div className="room-grid">
          {rooms.map(r => {
            const Icon = ROOM_ICONS[r.icon]
            return (
              <button key={r.room} type="button" className="room-card" aria-pressed={r.room === room.room} onClick={() => setSelected(r.room)}>
                <span className="room-top">
                  <IconTile icon={Icon} tone="orange" />
                  {r.temp !== undefined && <span className="t-label c-secondary tnum">{r.temp.toFixed(1)}°</span>}
                </span>
                <span className="room-names">
                  <span className="t-title">{r.room}</span>
                  <span className="t-caption c-secondary">{r.meta}</span>
                </span>
                <span className="room-energy"><span className="t-body-strong tnum">{r.kwh.toFixed(1)} kWh</span> <span className="t-caption c-tertiary">today</span></span>
              </button>
            )
          })}
          <button type="button" className="room-card room-add" onClick={onAddRoom}>
            <Plus size={24} strokeWidth={ICON_STROKE} aria-hidden="true" />
            <span className="t-label c-secondary">Add a room</span>
          </button>
        </div>

        <section className="card grow-card">
          <CardHeader title="Automations" subtitle="Run on their own, by time or sunset" />
          <div className="stack-8">
            {AUTOMATIONS.map(a => (
              <div key={a.id} className="device-row">
                <IconTile icon={AUTO_ICONS[a.icon]} tone="device" />
                <div className="device-text">
                  <span className="t-body-strong">{a.name}</span>
                  <span className="t-caption c-secondary">{a.description}</span>
                </div>
                <Toggle on={!!home.automations[a.id]} onChange={() => api.toggleAutomation(a.id)} label={`Automation ${a.name}`} />
              </div>
            ))}
          </div>
        </section>
      </div>

      <aside className="col-b">
        <section className="card room-detail" aria-label={`${room.room} details`}>
          <CardHeader title={room.room} subtitle={room.meta} />
          <div className="readouts">
            <div><span className="t-metric-m tnum">{room.temp !== undefined ? `${room.temp.toFixed(1)}°` : '—'}</span><span className="t-caption c-tertiary">Temperature</span></div>
            <div><span className="t-metric-m tnum">{room.temp !== undefined ? `${room.humidity}%` : '—'}</span><span className="t-caption c-tertiary">Humidity</span></div>
            <div><span className="t-metric-m tnum">{room.kwh.toFixed(1)} kWh</span><span className="t-caption c-tertiary">Today</span></div>
          </div>
          <hr />
          {(lights.length > 0 || room.temp !== undefined) && <h3 className="t-overline c-tertiary">Lighting and climate</h3>}
          {lights.map(l => (
            <Slider key={l.id} label={l.name} value={l.on ? l.level ?? 100 : 0} display={l.on ? `${l.level}%` : 'Off'} onChange={v => api.setLevel(l.id, v)} />
          ))}
          {room.temp !== undefined && thermostat && (
            <Slider label="Heating target (whole house)" tone="teal" min={16} max={26} step={0.5} value={thermostat.level ?? 22} display={`${thermostat.level}°`} onChange={v => api.setLevel('thermostat', v)} />
          )}
          <h3 className="t-overline c-tertiary">Devices</h3>
          <div className="stack-8">
            {room.devices.length ? room.devices.map(d => <DeviceRow key={d.id} device={d} onToggle={() => api.toggle(d.id)} />) : <p className="t-body c-secondary">No devices yet. Use “Add device” to put one here.</p>}
          </div>
          <h3 className="t-overline c-tertiary">Energy today · by hour</h3>
          <div className="hourly" role="img" aria-label={`${room.room} energy by hour today`}>
            {hourly.map((v, i) => <span key={i} data-future={i > now.getHours() || undefined} style={{ height: `${Math.max(6, (v / hMax) * 100)}%` }} />)}
          </div>
          <div className="chart-axis t-caption" aria-hidden="true"><span>00</span><span>06</span><span>12</span><span>18</span><span>24</span></div>
          <div className="spacer" />
          <div className="actions-2">
            <Button variant="ghost" icon={Power} onClick={() => api.roomOff(room.room)}>All off</Button>
            <Button variant="secondary" icon={Moon} onClick={() => api.setScene('evening', !eveningOn)}>{eveningOn ? 'End Evening' : 'Start Evening'}</Button>
          </div>
        </section>
      </aside>
    </div>
  )
}
