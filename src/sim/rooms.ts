import { applyPatch, hourOf, roomsToday, SUNSET, USE_PROFILE, type Device, type Home, type Room, type SceneDef } from './model'

export type RoomIcon = 'sofa' | 'kitchen' | 'office' | 'bed' | 'bath' | 'deck' | 'entrance' | 'room'

// Indoor rooms read the house temperature plus a small offset; Deck and Entrance have no sensor.
const INFO: Record<string, { icon: RoomIcon; offset?: number; humidity?: number; share: number }> = {
  'Living room': { icon: 'sofa', offset: 0, humidity: 46, share: 0.3 },
  Kitchen: { icon: 'kitchen', offset: -0.3, humidity: 52, share: 0.24 },
  Office: { icon: 'office', offset: -0.7, humidity: 44, share: 0.17 },
  Bedroom: { icon: 'bed', offset: -1.1, humidity: 48, share: 0.12 },
  Bathroom: { icon: 'bath', offset: 0.5, humidity: 61, share: 0.08 },
  Deck: { icon: 'deck', share: 0.05 },
  Entrance: { icon: 'entrance', share: 0.04 },
}

export const roomIcon = (room: Room): RoomIcon => INFO[room]?.icon ?? 'room'

export interface RoomSummary {
  room: Room
  icon: RoomIcon
  devices: Device[]
  on: number
  offline: number
  temp?: number
  humidity?: number
  kwh: number
  meta: string
}

export function roomSummaries(home: Home, now: Date): RoomSummary[] {
  const energy = Object.fromEntries(roomsToday(home, now).map(r => [r.room, r.kwh]))
  return home.rooms.map(room => {
    const devices = home.devices.filter(d => d.room === room)
    const on = devices.filter(d => d.online && d.on && d.kind !== 'lock' && d.kind !== 'sensor' && d.kind !== 'camera').length
    const offline = devices.filter(d => !d.online).length
    const info = INFO[room]
    const temp = info ? (info.offset === undefined ? undefined : home.indoor + info.offset) : home.indoor
    const count = `${devices.length} ${devices.length === 1 ? 'device' : 'devices'}`
    const locks = devices.filter(d => d.kind === 'lock')
    let meta = `${count} · ${on ? `${on} on` : 'all off'}`
    if (offline) meta = `${count} · ${offline} offline`
    else if (room === 'Entrance') meta = `${count} · ${home.armed ? 'armed' : 'disarmed'}`
    else if (!devices.length) meta = 'No devices yet'
    else if (locks.length && !on) meta = `${count} · ${locks.every(l => l.on) ? 'locked' : 'unlocked'}`
    return { room, icon: roomIcon(room), devices, on, offline, temp, humidity: info?.humidity ?? 47, kwh: energy[room] ?? 0, meta }
  })
}

/** kWh per hour today for one room; future hours are 0. */
export function roomHourly(home: Home, now: Date, room: Room): number[] {
  const h = Math.floor(hourOf(now))
  const share = INFO[room]?.share ?? 0.03
  const live = home.devices.filter(d => d.room === room && d.on && d.online).reduce((s, d) => s + d.watts, 0) / 1000
  return USE_PROFILE.map((v, i) => (i < h ? v * 0.7 * share : i === h ? Math.max(live, v * 0.7 * share) : 0))
}

/** Switch off everything in a room that uses power (locks, cameras, and sensors stay as they are). */
export function roomOff(devices: Device[], room: Room): Device[] {
  return devices.map(d => (d.room === room && d.online && !['lock', 'camera', 'sensor', 'siren'].includes(d.kind) ? { ...d, on: false } : d))
}

export interface Automation {
  id: string
  name: string
  description: string
  icon: 'sun' | 'moon' | 'lock' | 'users'
  /** Hour of the day it runs; null = triggered by presence, which the demo can't detect. */
  at: number | null
  patch: SceneDef['on']
}

export const AUTOMATIONS: Automation[] = [
  { id: 'wake', name: 'Wake up', description: '07:00 · Bedroom lights 40%, heating to 21°', icon: 'sun', at: 7, patch: { 'bedroom-lights': { on: true, level: 40 }, thermostat: { on: true, level: 21 } } },
  { id: 'sunset', name: 'Sunset', description: '18:51 · Deck lights on', icon: 'moon', at: SUNSET, patch: { 'deck-lights': { on: true } } },
  {
    id: 'night', name: 'Good night', description: '23:30 · All lights off, doors lock', icon: 'lock', at: 23.5,
    patch: { 'living-ceiling': { on: false }, 'living-lamp': { on: false }, 'kitchen-pendants': { on: false }, 'office-lights': { on: false }, 'bedroom-lights': { on: false }, 'deck-lights': { on: false }, 'front-door': { on: true }, 'deck-door': { on: true } },
  },
  { id: 'left', name: 'Everyone left', description: 'When both phones leave · start Away', icon: 'users', at: null, patch: {} },
]

/** Automations whose time falls in (prev, now], on the same day. */
export function dueAutomations(prev: Date, now: Date, enabled: Record<string, boolean>): Automation[] {
  if (prev.toDateString() !== now.toDateString()) return []
  const a = hourOf(prev), b = hourOf(now)
  return AUTOMATIONS.filter(x => enabled[x.id] && x.at !== null && x.at > a && x.at <= b)
}

export const runAutomation = (devices: Device[], a: Automation) => applyPatch(devices, a.patch)
