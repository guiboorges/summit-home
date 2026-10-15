import { useCallback, useEffect, useReducer, useState } from 'react'
import { applyPatch, initialHome, scenes, step, type Device, type Home, type Kind, type Room, type SceneDef } from './model'

export interface HomeEvent {
  id: number
  at: number
  text: string
}

interface State {
  home: Home
  events: HomeEvent[]
  unread: number
}

type Action =
  | { type: 'toggle'; id: string }
  | { type: 'scene'; id: SceneDef['id']; on: boolean }
  | { type: 'add'; name: string; room: Room; kind: Kind }
  | { type: 'tick'; now: Date }
  | { type: 'read' }
  | { type: 'reset' }

const KEY = 'summit-home:v1'
// Each tick advances the battery and the temperature by this many simulated minutes,
// so changes are visible in a demo. The clock and the charts use the real time.
export const TICK_MS = 3000
const SIM_MINUTES_PER_TICK = 1

const verb = (d: Device) =>
  d.kind === 'lock' ? (d.on ? 'locked' : 'unlocked') : d.kind === 'camera' ? (d.on ? 'armed' : 'disarmed') : d.on ? 'turned on' : 'turned off'

function log(state: State, text: string): State {
  const ev = { id: (state.events[0]?.id ?? 0) + 1, at: Date.now(), text }
  return { ...state, events: [ev, ...state.events].slice(0, 30), unread: state.unread + 1 }
}

function reducer(state: State, a: Action): State {
  switch (a.type) {
    case 'toggle': {
      const devices = state.home.devices.map(d => (d.id === a.id && d.online ? { ...d, on: !d.on } : d))
      const d = devices.find(x => x.id === a.id)
      if (!d || !d.online) return state
      return log({ ...state, home: { ...state.home, devices } }, `${d.name} ${verb(d)}`)
    }
    case 'scene': {
      const s = scenes.find(x => x.id === a.id)!
      const devices = applyPatch(state.home.devices, a.on ? s.on : s.off)
      return log({ ...state, home: { ...state.home, devices } }, `Scene “${s.name}” ${a.on ? 'activated' : 'ended'}`)
    }
    case 'add': {
      const id = `${a.kind}-${Date.now()}`
      const watts = { light: 20, appliance: 150, computer: 120, speaker: 30, heater: 500, purifier: 35, camera: 8, lock: 0, sensor: 1, thermostat: 0 }[a.kind]
      const dev: Device = { id, name: a.name, room: a.room, kind: a.kind, on: true, watts, online: true, level: a.kind === 'light' ? 100 : undefined }
      return log({ ...state, home: { ...state.home, devices: [...state.home.devices, dev] } }, `${a.name} added to ${a.room}`)
    }
    case 'tick': {
      const before = state.home.battery
      const home = step(state.home, a.now, SIM_MINUTES_PER_TICK)
      let next = { ...state, home }
      if (before < 100 && home.battery >= 100) next = log(next, 'Home battery is full')
      if (before > 20 && home.battery <= 20) next = log(next, 'Home battery below 20%')
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
      { id: 3, at: t - 4 * 60_000, text: 'Dishwasher started (eco program)' },
      { id: 2, at: t - 38 * 60_000, text: 'Garden sensor went offline' },
      { id: 1, at: t - 95 * 60_000, text: 'Front door locked' },
    ],
    unread: 2,
  }
}

function load(): State {
  try {
    const raw = localStorage.getItem(KEY)
    if (raw) return JSON.parse(raw) as State
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
      dispatch({ type: 'tick', now: t })
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
    setScene: useCallback((id: SceneDef['id'], on: boolean) => dispatch({ type: 'scene', id, on }), []),
    addDevice: useCallback((name: string, room: Room, kind: Kind) => dispatch({ type: 'add', name, room, kind }), []),
    markRead: useCallback(() => dispatch({ type: 'read' }), []),
    reset: useCallback(() => dispatch({ type: 'reset' }), []),
  }
}

export type HomeApi = ReturnType<typeof useHome>
