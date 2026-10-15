import {
  Bath, Cctv, Fan, Lightbulb, Lock, Monitor, Power, Siren, Speaker, Thermometer, Wifi, type LucideIcon,
} from 'lucide-react'
import type { Device, Kind } from '../sim/model'
import { IconTile, Toggle } from './ui'

export const KIND_ICON: Record<Kind, LucideIcon> = {
  light: Lightbulb, thermostat: Thermometer, purifier: Fan, appliance: Power, computer: Monitor,
  speaker: Speaker, camera: Cctv, lock: Lock, heater: Bath, sensor: Wifi, siren: Siren,
}

export function deviceMeta(d: Device): string {
  if (!d.online) return `${d.room} · Offline`
  if (d.kind === 'lock') return `${d.room} · ${d.on ? 'Locked' : 'Unlocked'}`
  if (d.kind === 'camera') return `${d.room} · ${d.on ? 'Armed' : 'Off'}`
  if (d.kind === 'siren') return d.on ? 'Sounds on intrusion' : 'Silent'
  if (d.kind === 'thermostat') return `${d.room} · ${d.on ? `${d.level}°` : 'Off'}`
  if (!d.on) return `${d.room} · Off`
  if (d.kind === 'light') return `${d.room} · ${d.level}%`
  if (d.kind === 'purifier') return `${d.room} · Auto`
  return `${d.room} · ${d.watts >= 1000 ? `${(d.watts / 1000).toFixed(1)} kW` : `${d.watts} W`}`
}

export function DeviceRow({ device, onToggle, glass, icon }: { device: Device; onToggle: () => void; glass?: boolean; icon?: LucideIcon }) {
  return (
    <div className="device-row" data-glass={glass || undefined} data-offline={!device.online || undefined}>
      <IconTile icon={icon ?? KIND_ICON[device.kind]} tone="device" />
      <div className="device-text">
        <span className="t-body-strong">{device.name}</span>
        <span className="t-caption c-secondary">{deviceMeta(device)}</span>
      </div>
      <Toggle on={device.on && device.online} onChange={onToggle} label={device.name} disabled={!device.online} />
    </div>
  )
}
