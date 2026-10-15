import { Bell, House, LayoutGrid, Moon, Plus, RotateCcw, Search, Sun } from 'lucide-react'
import { useEffect, useMemo, useRef, useState } from 'react'
import { AddDeviceDialog, DevicesDialog } from './components/dialogs'
import { DeviceRow } from './components/devices'
import { Overview } from './components/Overview'
import { Badge, Button, Gauge, ICON_STROKE, IconButton, SidebarStat } from './components/ui'
import { hourOf, sceneActive, scenes, today, usualWaterLitres, waterLitres } from './sim/model'
import { useHome } from './sim/useHome'

const TABS = ['Overview', 'Rooms', 'Energy', 'Security']

function greeting(h: number) {
  if (h < 5) return 'Good night'
  if (h < 12) return 'Good morning'
  if (h < 18) return 'Good afternoon'
  return 'Good evening'
}

function ago(ms: number) {
  const m = Math.round(ms / 60_000)
  if (m < 1) return 'just now'
  if (m < 60) return `${m} min ago`
  return `${Math.round(m / 60)} h ago`
}

type Theme = 'dark' | 'light'
function initialTheme(): Theme {
  const param = new URLSearchParams(location.search).get('theme')
  if (param === 'dark' || param === 'light') return param
  try {
    const saved = localStorage.getItem('summit-home:theme')
    if (saved === 'dark' || saved === 'light') return saved
  } catch { /* storage blocked */ }
  return window.matchMedia?.('(prefers-color-scheme: light)').matches ? 'light' : 'dark'
}

export default function App() {
  const api = useHome()
  const { home, now } = api
  const [tab, setTab] = useState('Overview')
  const [theme, setTheme] = useState<Theme>(initialTheme)
  const [query, setQuery] = useState('')
  const [searchOpen, setSearchOpen] = useState(false)
  const [bellOpen, setBellOpen] = useState(false)
  const [scenesOpen, setScenesOpen] = useState(false)
  const [addOpen, setAddOpen] = useState(false)
  const [allOpen, setAllOpen] = useState(false)
  const searchRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    document.documentElement.dataset.theme = theme
    try { localStorage.setItem('summit-home:theme', theme) } catch { /* storage blocked */ }
  }, [theme])

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault()
        searchRef.current?.focus()
        setSearchOpen(true)
      }
      if (e.key === 'Escape') { setSearchOpen(false); setBellOpen(false); setScenesOpen(false) }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  const results = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return []
    return home.devices.filter(d => `${d.name} ${d.room} ${d.kind}`.toLowerCase().includes(q)).slice(0, 6)
  }, [query, home.devices])

  const h = hourOf(now)
  const day = today(home, now)
  const thermostat = home.devices.find(d => d.id === 'thermostat')
  const online = home.devices.filter(d => d.online).length
  const lock = home.devices.find(d => d.id === 'front-door')
  const camera = home.devices.find(d => d.id === 'camera')
  const armed = !!lock?.on && !!camera?.on
  const dateLine = now.toLocaleDateString('en-GB', { weekday: 'long' }) + ', ' + now.toLocaleDateString('en-GB', { day: 'numeric', month: 'long' }) + ' · ' + now.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })

  return (
    <div className="app">
      <aside className="sidebar summit-light" aria-label="Home summary">
        <div className="logo">
          <span className="logo-mark" aria-hidden="true"><House size={20} strokeWidth={ICON_STROKE} /></span>
          <span className="t-h3">Summit</span>
        </div>
        <div className="home-block">
          <div className="home-row">
            <span className="t-title">Lake House</span>
            <Badge tone="success">Online</Badge>
          </div>
          <span className="t-caption c-secondary">Lakeside Rd 12 · {home.devices.length} devices</span>
        </div>
        <hr />
        <SidebarStat label="Indoor" value={`${home.indoor.toFixed(1)}°`} meta={thermostat?.on ? `Target ${thermostat.level}°` : 'Heating off'} />
        <SidebarStat label="Outdoor" value="9°" meta="Cloudy, light wind" />
        <hr />
        <div className="solar-share">
          <Gauge value={day.solarShare * 100} label="Solar share" />
          <span className="t-caption c-secondary">Of today’s energy came from your roof</span>
        </div>
        <hr />
        <SidebarStat label="Devices" value={String(online)} meta={`of ${home.devices.length} online`} />
        <SidebarStat label="Water today" value={`${waterLitres(now)} L`} meta={`Usual by now: ${usualWaterLitres(now)} L`} />
        <SidebarStat label="Security" value={armed ? 'Armed' : 'Disarmed'} meta={armed ? 'Door locked · camera on' : `${lock?.on ? 'Door locked' : 'Door unlocked'} · camera ${camera?.on ? 'on' : 'off'}`} metaTone={armed ? undefined : 'warning'} />
        <div className="grow" />
        <div className="user">
          <span className="avatar" aria-hidden="true">GB</span>
          <div className="user-text">
            <span className="t-body-strong">Guilherme</span>
            <span className="t-caption c-secondary">Owner</span>
          </div>
          <IconButton icon={theme === 'dark' ? Sun : Moon} label={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'} variant="ghost" onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')} />
          <IconButton icon={RotateCcw} label="Reset the demo house" variant="ghost" onClick={api.reset} />
        </div>
      </aside>

      <main className="main">
        <header className="topbar">
          <div className="title">
            <h1 className="t-h2">{greeting(h)}</h1>
            <p className="t-label c-secondary">{dateLine}</p>
          </div>
          <nav className="tabs" aria-label="Sections">
            {TABS.map(t => (
              <button key={t} type="button" className="tab" aria-current={tab === t ? 'page' : undefined} onClick={() => setTab(t)}>{t}</button>
            ))}
          </nav>
          <div className="search" role="search">
            <Search size={18} strokeWidth={ICON_STROKE} aria-hidden="true" />
            <input
              ref={searchRef} value={query} placeholder="Search devices" aria-label="Search devices"
              onChange={e => { setQuery(e.target.value); setSearchOpen(true) }}
              onFocus={() => setSearchOpen(true)} onBlur={() => setTimeout(() => setSearchOpen(false), 150)}
            />
            <kbd className="t-caption">⌘K</kbd>
            {searchOpen && query && (
              <div className="popover search-results" onMouseDown={e => e.preventDefault()}>
                {results.length ? results.map(d => <DeviceRow key={d.id} device={d} onToggle={() => api.toggle(d.id)} />) : <p className="t-body c-secondary empty">No device matches “{query}”.</p>}
              </div>
            )}
          </div>
          <div className="topbar-actions">
            <div className="anchor">
              <IconButton icon={Bell} label="Notifications" dot={api.unread > 0} aria-expanded={bellOpen} onClick={() => { setBellOpen(!bellOpen); api.markRead() }} />
              {bellOpen && (
                <div className="popover notifications" role="dialog" aria-label="Notifications">
                  <p className="t-title">Activity</p>
                  <ul>
                    {api.events.slice(0, 8).map(e => (
                      <li key={e.id}><span className="t-label">{e.text}</span><span className="t-caption c-tertiary">{ago(now.getTime() - e.at)}</span></li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
            <div className="anchor">
              <Button variant="secondary" icon={LayoutGrid} aria-expanded={scenesOpen} onClick={() => setScenesOpen(!scenesOpen)}>Scenes</Button>
              {scenesOpen && (
                <div className="popover scenes-menu" role="dialog" aria-label="Scenes">
                  {scenes.map(s => {
                    const on = sceneActive(s, home.devices)
                    return (
                      <button key={s.id} type="button" className="menu-item" onClick={() => { api.setScene(s.id, !on); setScenesOpen(false) }}>
                        <span className="t-body-strong">{on ? `End ${s.name}` : `Start ${s.name}`}</span>
                        <span className="t-caption c-secondary">{s.description}</span>
                      </button>
                    )
                  })}
                </div>
              )}
            </div>
            <Button icon={Plus} onClick={() => setAddOpen(true)}>Add device</Button>
          </div>
        </header>

        {tab === 'Overview' ? (
          <Overview api={api} onOpenDevices={() => setAllOpen(true)} onOpenTab={setTab} />
        ) : (
          <section className="card placeholder">
            <h2 className="t-h3">{tab}</h2>
            <p className="t-body c-secondary">This view is being designed in Figma first. The Overview is live.</p>
            <Button variant="ghost" onClick={() => setTab('Overview')}>Back to Overview</Button>
          </section>
        )}
      </main>

      <AddDeviceDialog open={addOpen} onClose={() => setAddOpen(false)} onAdd={api.addDevice} />
      <DevicesDialog open={allOpen} onClose={() => setAllOpen(false)} devices={home.devices} onToggle={api.toggle} />
    </div>
  )
}
