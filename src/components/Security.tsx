import { Activity, Cctv, DoorClosed, Lock, LockOpen, ShieldAlert, ShieldCheck, Siren, Wifi, type LucideIcon } from 'lucide-react'
import { useEffect, useState } from 'react'
import lakeImg from '../assets/lake-house.jpg'
import forestImg from '../assets/pine-cabin.jpg'
import { sceneActive, scenes } from '../sim/model'
import { CAMERAS, needsAttention, sensors, type Camera } from '../sim/security'
import type { HomeApi } from '../sim/useHome'
import { DeviceRow } from './devices'
import { Button, CardHeader, ICON_STROKE, StatusRow } from './ui'

const IMG = { lake: lakeImg, forest: forestImg }
const SENSOR_ICON: Record<string, LucideIcon> = { door: DoorClosed, motion: Activity, smoke: Siren, wifi: Wifi }
const time = (ms: number) => new Date(ms).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })
const camStyle = (c: Camera) => ({ backgroundImage: `url(${IMG[c.image]})`, backgroundSize: c.size, backgroundPosition: c.position })

export function Security({ api }: { api: HomeApi }) {
  const { home, now, events } = api
  const [camId, setCamId] = useState('door')
  const [talking, setTalking] = useState(false)
  const [flash, setFlash] = useState(false)
  const cam = CAMERAS.find(c => c.id === camId)!
  const list = sensors(home, events, now)
  const attention = needsAttention(list)
  const away = scenes.find(s => s.id === 'away')!
  const awayOn = sceneActive(away, home.devices)
  const activity = events.filter(e => e.kind === 'security' || e.kind === 'motion').slice(0, 5)
  const lastMotion = events.find(e => e.kind === 'motion')
  const locksAndAlarms = ['front-door', 'deck-door', 'camera', 'siren'].map(id => home.devices.find(d => d.id === id)!).filter(Boolean)

  useEffect(() => {
    if (!flash) return
    const t = setTimeout(() => setFlash(false), 350)
    return () => clearTimeout(t)
  }, [flash])

  const motionText = (c: Camera) => {
    if (c.id === 'deck' && lastMotion) return `${c.place} · Motion ${time(lastMotion.at)}`
    return `${c.place} · Clear`
  }

  return (
    <div className="grid">
      <div className="col-a">
        <section className="feed summit-dark" style={camStyle(cam)} aria-label={`${cam.name}, live`}>
          <div className="feed-scrim" />
          <div className="feed-top">
            <span className="chip"><span className="chip-dot" aria-hidden="true" />LIVE</span>
            <span className="chip t-caption tnum">{now.toLocaleTimeString('en-GB')} · 1080p</span>
          </div>
          {flash && <div className="feed-flash" aria-hidden="true" />}
          <div className="feed-bottom">
            <div>
              <h2 className="t-h3">{cam.name}</h2>
              <p className="t-label c-secondary">{talking ? 'Talking… the speaker at the door is on' : cam.id === 'door' ? 'Entrance · No motion in the last 2 h' : motionText(cam)}</p>
            </div>
            <div className="feed-actions">
              <button type="button" className="chip chip-btn" aria-pressed={talking} onClick={() => setTalking(!talking)}>{talking ? 'End talk' : 'Talk'}</button>
              <button type="button" className="chip chip-btn" onClick={() => { setFlash(true); api.snapshot(cam.name) }}>Snapshot</button>
            </div>
          </div>
        </section>

        <div className="cams">
          {CAMERAS.filter(c => c.id !== camId).map(c => (
            <button key={c.id} type="button" className="cam summit-dark" style={camStyle(c)} onClick={() => { setCamId(c.id); setTalking(false) }} aria-label={`Show ${c.name}`}>
              <span className="feed-scrim" />
              <span className="chip"><span className="chip-dot" aria-hidden="true" />LIVE</span>
              <span className="cam-caption">
                <span className="t-body-strong">{c.name}</span>
                <span className="t-caption c-secondary">{motionText(c)}</span>
              </span>
            </button>
          ))}
        </div>

        <section className="card grow-card">
          <CardHeader title="Sensors" subtitle={`${list.length} sensors · ${attention ? `${attention} need${attention === 1 ? 's' : ''} attention` : 'all good'}`} />
          <div className="sensor-grid">
            {list.map(s => <StatusRow key={s.name} icon={SENSOR_ICON[s.icon]} name={s.name} meta={s.meta} tone={s.tone} status={s.status} />)}
          </div>
        </section>
      </div>

      <aside className="col-b">
        <section className="card">
          <div className="armed">
            <span className="armed-icon" data-armed={home.armed}>
              {home.armed ? <ShieldCheck size={26} strokeWidth={ICON_STROKE} aria-hidden="true" /> : <ShieldAlert size={26} strokeWidth={ICON_STROKE} aria-hidden="true" />}
            </span>
            <div>
              <h2 className="t-h2">{home.armed ? 'System armed' : 'System disarmed'}</h2>
              <p className="t-caption c-secondary">{home.armed ? (awayOn ? 'Away mode · everything locked' : 'Night mode · doors and camera watched') : 'Sensors still report, but no alarm will sound'}</p>
            </div>
          </div>
          <div className="actions-2">
            <Button variant="ghost" icon={home.armed ? LockOpen : ShieldCheck} onClick={() => api.arm(!home.armed)}>{home.armed ? 'Disarm' : 'Arm'}</Button>
            <Button variant="secondary" icon={Lock} onClick={() => api.setScene('away', !awayOn)}>{awayOn ? 'End Away' : 'Start Away'}</Button>
          </div>
        </section>

        <section className="card">
          <CardHeader title="Locks and alarms" subtitle="Tap to change" />
          <div className="stack-8">
            {locksAndAlarms.map(d => <DeviceRow key={d.id} device={d} onToggle={() => api.toggle(d.id)} icon={d.kind === 'lock' ? (d.on ? Lock : LockOpen) : d.kind === 'camera' ? Cctv : Siren} />)}
          </div>
        </section>

        <section className="card grow-card">
          <CardHeader title="Activity" subtitle="Today" />
          <ol className="timeline">
            {activity.map(e => (
              <li key={e.id}>
                <span className="t-caption c-tertiary tnum">{time(e.at)}</span>
                <span className="timeline-dot" data-kind={e.kind} aria-hidden="true" />
                <span className="timeline-text">
                  <span className="t-label">{e.text}</span>
                  {e.detail && <span className="t-caption c-secondary">{e.detail}</span>}
                </span>
              </li>
            ))}
          </ol>
        </section>
      </aside>
    </div>
  )
}
