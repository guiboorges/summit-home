import type { Home } from './model'
import type { HomeEvent } from './useHome'

export interface Camera {
  id: string
  name: string
  place: string
  image: 'lake' | 'forest'
  /** CSS background-size / background-position: the demo crops the two photos into four views. */
  size: string
  position: string
}

export const CAMERAS: Camera[] = [
  { id: 'door', name: 'Door camera', place: 'Entrance', image: 'lake', size: '165%', position: '72% 30%' },
  { id: 'deck', name: 'Deck camera', place: 'Deck', image: 'lake', size: '200%', position: '50% 95%' },
  { id: 'garden', name: 'Garden camera', place: 'Lakeside', image: 'forest', size: 'cover', position: '50% 60%' },
  { id: 'boathouse', name: 'Boathouse', place: 'Shore', image: 'lake', size: '220%', position: '8% 45%' },
]

export type Tone = 'success' | 'warning' | 'danger' | 'neutral'
export interface Sensor {
  name: string
  meta: string
  icon: 'door' | 'motion' | 'smoke' | 'wifi'
  tone: Tone
  status: string
}

const MOTION_WINDOW_MS = 5 * 60_000

/** Sensor states. Motion and the garden sensor come from the simulation; the rest are fixed in the demo. */
export function sensors(home: Home, events: HomeEvent[], now: Date): Sensor[] {
  const garden = home.devices.find(d => d.id === 'garden-sensor')
  const deckDoor = home.devices.find(d => d.id === 'deck-door')
  const motion = events.find(e => e.kind === 'motion' && now.getTime() - e.at < MOTION_WINDOW_MS)
  return [
    { name: 'Front door', meta: 'Entrance · contact', icon: 'door', tone: 'success', status: 'Closed' },
    { name: 'Deck door', meta: `Deck · ${deckDoor?.on ? 'locked' : 'unlocked'}`, icon: 'door', tone: 'success', status: 'Closed' },
    { name: 'Bedroom window', meta: 'Bedroom · contact', icon: 'door', tone: 'warning', status: 'Open' },
    { name: 'Deck motion', meta: 'Motion sensor', icon: 'motion', tone: motion ? 'warning' : 'neutral', status: motion ? 'Motion' : 'Clear' },
    { name: 'Smoke detector', meta: 'Kitchen', icon: 'smoke', tone: 'success', status: 'OK' },
    { name: 'Garden sensor', meta: garden?.online ? 'Deck' : 'Deck · offline since 18:04', icon: 'wifi', tone: garden?.online ? 'success' : 'danger', status: garden?.online ? 'OK' : 'Offline' },
  ]
}

export const needsAttention = (list: Sensor[]) => list.filter(s => s.tone === 'warning' || s.tone === 'danger').length
