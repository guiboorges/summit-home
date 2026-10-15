import { useCallback, useEffect, useReducer, useState } from 'react'
import { applyPatch, initialHome, scenes, step, type Device, type Home, type Kind, type Room, type SceneDef } from './model'
import { AUTOMATIONS, dueAutomations, roomOff, runAutomation } from './rooms'

export type EventKind = 'device' | 'scene' | 'automation' | 'security' | 'motion' | 'system'

export interface HomeEvent {
  id: number
  at: number
  text: string
  kind?: EventKind
  detail?: string
}

interface State {
  home: Home
  events: HomeEvent[]
  unread: number
  lastTick: number
}

type Action =
  | { type: 'toggle'; id: string }
  | { type: 'level'; id: string; level: number }
  | { type: 'scene'; id: SceneDef['id']; on: boolean }
  | { type: 'add'; name: string; room: Room; kind: Kind }
  | { type: 'addRoom'; name: string }
  | { type: 'roomOff'; room: Room }
  | { type: 'automation'; id: string }
  | { type: 'arm'; on: boolean }
  | { type: 'snapshot'; camera: string }
  | { type: 'tick'; now: Date; random: number }
  | { type: 'read' }
  | { type: 'reset' }

const KEY = 'summit-home:v2'
// Each tick advances the battery and the temperature by this many simulated minutes,
// so changes are visible in a demo. The clock and the charts use the real time.
export const TICK_MS = 3000
const SIM_MINUTES_PER_TICK = 1
// Chance per tick of motion on the deck camera (about once every 4 minutes).
const MOTION_CHANCE = 0.0125

const SECURITY_KINDS: Kind[] = ['lock', 'camera', 'siren']

const verb = (d: Device) =>
  d.kind === 'lock' ? (d.on ? 'locked' : 'unlocked') : d.kind === 'camera' ? (d.on ? 'armed' : 'disarmed') : d.on ? 'turned on' : 'turned off'

function log(state: State, text: string, kind: EventKind = 'device', detail?: string): State {
  const ev = { id: (state.events[0]?.id ?? 0) + 1, at: Date.now(), text, kind, detail }
  return { ...state, events: [ev, ...state.events].slice(0, 40), unread: state.unread + 1 }
}

const withDevices = (state: State, devices: Device[]): State => ({ ...state, home: { ...state.home, devices } })

function reducer(state: State, a: Action): State {
  switch (a.type) {
    case 'toggle': {
      const devices = state.home.devices.map(d => (d.id === a.id && d.online ? { ...d, on: !d.on } : d))
      const d = devices.find(x => x.id === a.id)
      if (!d || !d.online) return state
      return log(withDevices(state, devices), `${d.name} ${verb(d)}`, SECURITY_KINDS.includes(d.kind) ? 'security' : 'device', d.room)
    }
    case 'level':
      return withDevices(state, state.home.devices.map(d => (d.id === a.id ? { ...d, level: a.level, on: d.kind === 'light' ? a.level > 0 : d.on } : d)))
    case 'scene': {
      const s = scenes.find(x => x.id === a.id)!
      let next = withDevices(state, applyPatch(state.home.devices, a.on ? s.on : s.off))
      if (s.id === 'away' && a.on) next = { ...next, home: { ...next.home, armed: true } }
      return log(next, `Scene “${s.name}” ${a.on ? 'activated' : 'ended'}`, s.id === 'away' ? 'security' : 'scene')
    }
    case 'add': {
      const id = `${a.kind}-${Date.now()}`
      const watts = { light: 20, appliance: 150, computer: 120, speaker: 30, heater: 500, purifier: 35, camera: 8, lock: 0, sensor: 1, thermostat: 0, siren: 0 }[a.kind]
      const dev: Device = { id, name: a.name, room: a.room, kind: a.kind, on: true, watts, online: true, level: a.kind === 'light' ? 100 : undefined }
      return log(withDevices(state, [...state.home.devices, dev]), `${a.name} added to ${a.room}`)
    }
    case 'addRoom':
      if (state.home.rooms.includes(a.name)) return state
      return log({ ...state, home: { ...state.home, rooms: [...state.home.rooms, a.name] } }, `Room “${a.name}” added`, 'system')
    case 'roomOff':
      return log(withDevices(state, roomOff(state.home.devices, a.room)), `Everything off in ${a.room}`)
    case 'automation': {
      const automations = { ...state.home.automations, [a.id]: !state.home.automations[a.id] }
      const name = AUTOMATIONS.find(x => x.id === a.id)?.name ?? a.id
      return log({ ...state, home: { ...state.home, automations } }, `Automation “${name}” ${automations[a.id] ? 'on' : 'off'}`, 'automation')
    }
    case 'arm':
      return log({ ...state, home: { ...state.home, armed: a.on } }, a.on ? 'System armed' : 'System disarmed', 'security', 'by Guilherme')
    case 'snapshot':
      return log(state, `Snapshot saved`, 'security', a.camera)
    case 'tick': {
      const before = state.home.battery
      let next: State = { ...state, home: step(state.home, a.now, SIM_MINUTES_PER_TICK), lastTick: a.now.getTime() }
      for (const auto of dueAutomations(new Date(state.lastTick), a.now, state.home.automations)) {
        next = log(withDevices(next, runAutomation(next.home.devices, auto)), `Automation “${auto.name}” ran`, 'automation')
      }
      if (before < 100 && next.home.battery >= 100) next = log(next, 'Home battery is full', 'system')
      if (before > 20 && next.home.battery <= 20) next = log(next, 'Home battery below 20%', 'system')
      const deckCam = next.home.devices.find(d => d.id === 'camera')
      if (deckCam?.on && a.random < MOTION_CHANCE) next = log(next, 'Motion on the deck', 'motion', 'Deck camera · clip saved')
      return next
    }
    case 'read':
      return { ...state, unread: 0 }
    case 'reset':
      return fresh()
  }
}

function fresh(): State {
  const t = Date.now()
  return {
    home: initialHome(),
    events: [
      { id: 5, at: t - 4 * 60_000, text: 'Dishwasher started (eco program)', kind: 'device', detail: 'Kitchen' },
      { id: 4, at: t - 21 * 60_000, text: 'Motion on the deck', kind: 'motion', detail: 'Deck camera · clip saved' },
      { id: 3, at: t - 38 * 60_000, text: 'Garden sensor went offline', kind: 'system', detail: 'Deck' },
      { id: 2, at: t - 62 * 60_000, text: 'System armed', kind: 'security', detail: 'Night mode, by Guilherme' },
      { id: 1, at: t - 95 * 60_000, text: 'Front door locked', kind: 'security', detail: 'Auto-lock after 5 min' },
    ],
    unread: 2,
    lastTick: t,
  }
}

function load(): State {
  try {
    const raw = localStorage.getItem(KEY)
    if (raw) return { ...(JSON.parse(raw) as State), lastTick: Date.now() }
  } catch {
    // Private mode or blocked storage: start fresh.
  }
  return fresh()
}

export function useHome() {
  const [state, dispatch] = useReducer(reducer, undefined, load)
  const [now, setNow] = useState(() => new Date())

  useEffect(() => {
    const id = setInterval(() => {
      const t = new Date()
      setNow(t)
      dispatch({ type: 'tick', now: t, random: Math.random() })
    }, TICK_MS)
    return () => clearInterval(id)
  }, [])

  useEffect(() => {
    try {
      localStorage.setItem(KEY, JSON.stringify(state))
    } catch {
      // Storage full or blocked: the demo still works, it just won't remember.
    }
  }, [state])

  return {
    ...state,
    now,
    toggle: useCallback((id: string) => dispatch({ type: 'toggle', id }), []),
    setLevel: useCallback((id: string, level: number) => dispatch({ type: 'level', id, level }), []),
    setScene: useCallback((id: SceneDef['id'], on: boolean) => dispatch({ type: 'scene', id, on }), []),
    addDevice: useCallback((name: string, room: Room, kind: Kind) => dispatch({ type: 'add', name, room, kind }), []),
    addRoom: useCallback((name: string) => dispatch({ type: 'addRoom', name }), []),
    roomOff: useCallback((room: Room) => dispatch({ type: 'roomOff', room }), []),
    toggleAutomation: useCallback((id: string) => dispatch({ type: 'automation', id }), []),
    arm: useCallback((on: boolean) => dispatch({ type: 'arm', on }), []),
    snapshot: useCallback((camera: string) => dispatch({ type: 'snapshot', camera }), []),
    markRead: useCallback(() => dispatch({ type: 'read' }), []),
    reset: useCallback(() => dispatch({ type: 'reset' }), []),
  }
}

export type HomeApi = ReturnType<typeof useHome>
