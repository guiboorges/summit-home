// The simulated lake house. Everything here is pure: given the device list and the clock,
// it returns what the dashboard shows. The React hook in useHome.ts owns the state and the tick.

/** A room name. The seven below come with the house; people can add more. */
export type Room = string
export type Kind = 'light' | 'thermostat' | 'purifier' | 'appliance' | 'computer' | 'speaker' | 'camera' | 'lock' | 'heater' | 'sensor' | 'siren'

export interface Device {
  id: string
  name: string
  room: Room
  kind: Kind
  on: boolean
  watts: number
  online: boolean
  /** Light brightness or thermostat target, shown in the meta line. */
  level?: number
}

export interface SceneDef {
  id: 'evening' | 'lake' | 'away'
  name: string
  description: string
  on: Partial<Record<string, Partial<Device>>>
  off: Partial<Record<string, Partial<Device>>>
}

export interface Home {
  devices: Device[]
  indoor: number
  battery: number // state of charge, 0–100
  jitter: number // small live wobble on the power reading, kW
  armed: boolean // alarm system
  automations: Record<string, boolean>
  rooms: Room[]
}

export const BATTERY_KWH = 13.5
export const BASE_LOAD_KW = 0.25 // fridge, router, standby
export const HEATING_KW = 1.6
export const SUNRISE = 7.5
export const SUNSET = 18.85
export const SOLAR_PEAK_KW = 3.4
export const OUTDOOR = 9

export const ROOMS: Room[] = ['Living room', 'Kitchen', 'Office', 'Bedroom', 'Bathroom', 'Deck', 'Entrance']

export const initialDevices: Device[] = [
  { id: 'living-ceiling', name: 'Ceiling lights', room: 'Living room', kind: 'light', on: true, watts: 60, online: true, level: 80 },
  { id: 'living-lamp', name: 'Floor lamp', room: 'Living room', kind: 'light', on: false, watts: 20, online: true, level: 60 },
  { id: 'living-tv', name: 'TV and soundbar', room: 'Living room', kind: 'appliance', on: false, watts: 140, online: true },
  { id: 'thermostat', name: 'Thermostat', room: 'Whole house', kind: 'thermostat', on: true, watts: 0, online: true, level: 22 },
  { id: 'kitchen-pendants', name: 'Kitchen pendants', room: 'Kitchen', kind: 'light', on: true, watts: 40, online: true, level: 100 },
  { id: 'dishwasher', name: 'Dishwasher', room: 'Kitchen', kind: 'appliance', on: true, watts: 1100, online: true },
  { id: 'oven', name: 'Oven', room: 'Kitchen', kind: 'appliance', on: false, watts: 2000, online: true },
  { id: 'office-desk', name: 'Desk setup', room: 'Office', kind: 'computer', on: true, watts: 180, online: true },
  { id: 'office-lights', name: 'Office lights', room: 'Office', kind: 'light', on: false, watts: 30, online: true, level: 100 },
  { id: 'bedroom-lights', name: 'Bedroom lights', room: 'Bedroom', kind: 'light', on: false, watts: 25, online: true, level: 40 },
  { id: 'purifier', name: 'Air purifier', room: 'Bedroom', kind: 'purifier', on: true, watts: 35, online: true },
  { id: 'towel-warmer', name: 'Towel warmer', room: 'Bathroom', kind: 'heater', on: false, watts: 300, online: true },
  { id: 'deck-lights', name: 'Deck lights', room: 'Deck', kind: 'light', on: false, watts: 50, online: true, level: 100 },
  { id: 'deck-speaker', name: 'Deck speaker', room: 'Deck', kind: 'speaker', on: false, watts: 30, online: true },
  { id: 'front-door', name: 'Front door', room: 'Entrance', kind: 'lock', on: true, watts: 0, online: true },
  { id: 'camera', name: 'Door camera', room: 'Entrance', kind: 'camera', on: true, watts: 8, online: true },
  { id: 'deck-door', name: 'Deck door', room: 'Deck', kind: 'lock', on: true, watts: 0, online: true },
  { id: 'siren', name: 'Siren', room: 'Entrance', kind: 'siren', on: false, watts: 0, online: true },
  { id: 'garden-sensor', name: 'Garden sensor', room: 'Deck', kind: 'sensor', on: true, watts: 1, online: false },
  { id: 'boathouse-plug', name: 'Boathouse plug', room: 'Deck', kind: 'appliance', on: false, watts: 0, online: false },
]

export const scenes: SceneDef[] = [
  {
    id: 'evening', name: 'Evening', description: 'Warm lights, heating to 22°',
    on: { 'living-ceiling': { on: true, level: 60 }, 'living-lamp': { on: true }, 'office-lights': { on: false }, thermostat: { on: true, level: 22 } },
    off: { 'living-lamp': { on: false }, 'living-ceiling': { level: 80 } },
  },
  {
    id: 'lake', name: 'Lake mode', description: 'Deck lights, music on',
    on: { 'deck-lights': { on: true }, 'deck-speaker': { on: true } },
    off: { 'deck-lights': { on: false }, 'deck-speaker': { on: false } },
  },
  {
    id: 'away', name: 'Away', description: 'Lock, cameras armed, lights off',
    on: {
      'living-ceiling': { on: false }, 'living-lamp': { on: false }, 'living-tv': { on: false }, 'kitchen-pendants': { on: false },
      'office-lights': { on: false }, 'office-desk': { on: false }, 'bedroom-lights': { on: false }, 'deck-lights': { on: false },
      'deck-speaker': { on: false }, 'front-door': { on: true }, camera: { on: true }, thermostat: { level: 18 },
    },
    off: { 'living-ceiling': { on: true }, thermostat: { level: 22 } },
  },
]

export function applyPatch(devices: Device[], patch: SceneDef['on']): Device[] {
  return devices.map(d => (patch[d.id] && d.online ? { ...d, ...patch[d.id] } : d))
}

export function sceneActive(scene: SceneDef, devices: Device[]): boolean {
  return Object.entries(scene.on).every(([id, want]) => {
    const d = devices.find(x => x.id === id)
    if (!d || !d.online) return true
    return Object.entries(want ?? {}).every(([k, v]) => d[k as keyof Device] === v)
  })
}

/** Hours since midnight, with minutes as a fraction. */
export const hourOf = (t: Date) => t.getHours() + t.getMinutes() / 60 + t.getSeconds() / 3600

export function solarKw(hour: number): number {
  if (hour <= SUNRISE || hour >= SUNSET) return 0
  const x = (hour - SUNRISE) / (SUNSET - SUNRISE)
  return +(SOLAR_PEAK_KW * Math.pow(Math.sin(Math.PI * x), 1.6)).toFixed(3)
}

export function heating(home: Home): boolean {
  const t = home.devices.find(d => d.id === 'thermostat')
  return !!t && t.on && home.indoor < (t.level ?? 22) - 0.1
}

export function powerKw(home: Home): number {
  const devices = home.devices.filter(d => d.on && d.online).reduce((s, d) => s + d.watts * (d.kind === 'light' ? (d.level ?? 100) / 100 : 1), 0) / 1000
  return Math.max(0, BASE_LOAD_KW + devices + (heating(home) ? HEATING_KW : 0) + home.jitter)
}

// A typical autumn weekday, kWh per hour (also the kW average for that hour).
export const USE_PROFILE = [0.6, 0.5, 0.5, 0.4, 0.4, 0.6, 1.4, 2.2, 1.8, 1.2, 1.0, 0.9, 1.1, 1.0, 0.9, 1.2, 1.8, 2.6, 3.0, 2.8, 2.4, 1.8, 1.2, 0.8]
export const TEMP_PROFILE = [19.8, 19.5, 19.3, 19.2, 19.1, 19.4, 20.2, 21.0, 21.4, 21.2, 21.0, 20.9, 21.1, 21.3, 21.6, 21.8, 21.7, 21.5, 21.5, 21.6, 21.7, 21.5, 21.0, 20.4]

export interface Day {
  hours: number[] // x positions 0..now
  use: number[]
  solar: number[]
  temp: number[]
  usedKwh: number
  solarKwh: number
  solarShare: number
}

/** Today's hourly series up to now. The last point is the live reading. */
export function today(home: Home, now: Date): Day {
  const h = hourOf(now)
  const full = Math.floor(h)
  const hours: number[] = []
  const use: number[] = []
  const solar: number[] = []
  const temp: number[] = []
  for (let i = 0; i <= full; i++) {
    hours.push(i)
    use.push(USE_PROFILE[i])
    solar.push(solarKw(i))
    temp.push(TEMP_PROFILE[i])
  }
  hours.push(h)
  use.push(powerKw(home))
  solar.push(solarKw(h))
  temp.push(home.indoor)
  const frac = h - full
  const usedKwh = USE_PROFILE.slice(0, full).reduce((a, b) => a + b, 0) + frac * powerKw(home)
  let solarKwh = 0
  for (let x = 0; x < h; x += 0.25) solarKwh += solarKw(x) * 0.25
  // Solar used at home can't exceed what the home used in the same hour.
  let selfUsed = 0
  for (let i = 0; i < full; i++) selfUsed += Math.min(USE_PROFILE[i], solarKw(i + 0.5))
  selfUsed += frac * Math.min(powerKw(home), solarKw(h))
  return { hours, use, solar, temp, usedKwh, solarKwh, solarShare: usedKwh > 0 ? Math.min(1, selfUsed / usedKwh) : 0 }
}

/** Energy per room today: history split by each room's share, plus what is on right now. */
export function roomsToday(home: Home, now: Date): { room: Room; kwh: number }[] {
  const share: Record<Room, number> = { 'Living room': 0.3, Kitchen: 0.24, Office: 0.17, Bedroom: 0.12, Bathroom: 0.08, Deck: 0.05, Entrance: 0.04 }
  const day = today(home, now)
  const liveFrac = hourOf(now) - Math.floor(hourOf(now))
  return home.rooms.map(room => {
    const live = home.devices.filter(d => d.room === room && d.on && d.online).reduce((s, d) => s + d.watts, 0) / 1000
    return { room, kwh: +(day.usedKwh * 0.7 * (share[room] ?? 0) + live * liveFrac).toFixed(1) }
  }).sort((a, b) => b.kwh - a.kwh)
}

/** What the house usually uses by this time of day. */
export function usualWaterLitres(now: Date): number {
  const h = hourOf(now)
  // Showers in the morning, dishes and cooking in the evening.
  const curve = (x: number) => 40 / (1 + Math.exp(-(x - 7.5) * 3)) + 30 / (1 + Math.exp(-(x - 13) * 2)) + 70 / (1 + Math.exp(-(x - 19) * 2.5))
  return Math.round(curve(h) - curve(0))
}

/** Today's use: the usual curve times a factor that changes from day to day (0.85–1.09). */
export function waterLitres(now: Date): number {
  const dayOfYear = Math.floor((now.getTime() - new Date(now.getFullYear(), 0, 0).getTime()) / 86_400_000)
  return Math.round(usualWaterLitres(now) * (0.85 + (dayOfYear % 7) * 0.04))
}

/** One simulation step of `minutes` length: battery and indoor temperature move. */
export function step(home: Home, now: Date, minutes: number, random = Math.random): Home {
  const h = hourOf(now)
  const net = solarKw(h) - powerKw(home) // positive = surplus charges the battery
  const battery = Math.min(100, Math.max(5, home.battery + (net * (minutes / 60) / BATTERY_KWH) * 100))
  const t = home.devices.find(d => d.id === 'thermostat')
  const target = t && t.on ? (t.level ?? 22) : OUTDOOR + 8
  const rate = heating(home) ? 0.04 : 0.01
  const indoor = home.indoor + Math.sign(target - home.indoor) * Math.min(Math.abs(target - home.indoor), rate * minutes)
  const jitter = +((random() - 0.5) * 0.12).toFixed(3)
  return { ...home, battery, indoor: +indoor.toFixed(2), jitter }
}

export function batteryStatus(home: Home, now: Date): { label: string; value: string }[] {
  const net = solarKw(hourOf(now)) - powerKw(home)
  const stored = (home.battery / 100) * BATTERY_KWH
  if (home.battery >= 99.5) return [{ label: 'Status', value: 'Full' }, { label: 'Backup', value: `~ ${Math.round(stored / Math.max(powerKw(home), 0.1))} h at current use` }, { label: 'Capacity', value: `${BATTERY_KWH} kWh` }]
  if (Math.abs(net) < 0.3) return [{ label: 'Status', value: 'Balanced: solar covers the house' }, { label: 'Backup', value: `~ ${Math.round(stored / Math.max(powerKw(home), 0.1))} h at current use` }, { label: 'Capacity', value: `${BATTERY_KWH} kWh` }]
  if (net > 0) {
    const hrs = (BATTERY_KWH - stored) / net
    return [{ label: 'Full in', value: fmtDuration(hrs) }, { label: 'Backup', value: `~ ${Math.round(stored / Math.max(powerKw(home), 0.1))} h at current use` }, { label: 'Capacity', value: `${BATTERY_KWH} kWh` }]
  }
  return [{ label: 'Powering the house', value: `${(-net).toFixed(1)} kW` }, { label: 'Lasts', value: `~ ${fmtDuration(stored / Math.max(-net, 0.1))}` }, { label: 'Capacity', value: `${BATTERY_KWH} kWh` }]
}

export function fmtDuration(hours: number): string {
  if (!isFinite(hours) || hours > 48) return 'over 2 days'
  const h = Math.floor(hours)
  const m = Math.round((hours - h) * 60)
  return h ? `${h} h ${m} min` : `${m} min`
}

export const initialHome = (): Home => ({
  devices: initialDevices, indoor: 21.9, battery: 78, jitter: 0, armed: true,
  automations: { wake: true, sunset: true, night: false, left: true }, rooms: [...ROOMS],
})
