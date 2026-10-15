import { X } from 'lucide-react'
import { useEffect, useRef, useState, type ReactNode } from 'react'
import { ROOMS, type Device, type Kind, type Room } from '../sim/model'
import { DeviceRow } from './devices'
import { Button, IconButton } from './ui'

function Dialog({ open, onClose, title, children }: { open: boolean; onClose: () => void; title: string; children: ReactNode }) {
  const ref = useRef<HTMLDialogElement>(null)
  useEffect(() => {
    const d = ref.current
    if (!d) return
    if (open && !d.open) d.showModal()
    if (!open && d.open) d.close()
  }, [open])
  return (
    <dialog ref={ref} className="dialog" onClose={onClose} onClick={e => { if (e.target === ref.current) onClose() }} aria-labelledby={`dlg-${title}`}>
      <div className="dialog-head">
        <h2 id={`dlg-${title}`} className="t-h3">{title}</h2>
        <IconButton icon={X} label="Close" variant="ghost" onClick={onClose} />
      </div>
      {children}
    </dialog>
  )
}

const KINDS: { kind: Kind; label: string }[] = [
  { kind: 'light', label: 'Light' }, { kind: 'appliance', label: 'Appliance' }, { kind: 'speaker', label: 'Speaker' },
  { kind: 'heater', label: 'Heater' }, { kind: 'purifier', label: 'Air purifier' }, { kind: 'camera', label: 'Camera' },
]

export function AddDeviceDialog({ open, onClose, onAdd }: { open: boolean; onClose: () => void; onAdd: (name: string, room: Room, kind: Kind) => void }) {
  const [name, setName] = useState('')
  const [room, setRoom] = useState<Room>('Living room')
  const [kind, setKind] = useState<Kind>('light')
  return (
    <Dialog open={open} onClose={onClose} title="Add a device">
      <form
        className="form"
        onSubmit={e => {
          e.preventDefault()
          if (!name.trim()) return
          onAdd(name.trim(), room, kind)
          setName('')
          onClose()
        }}
      >
        <label className="field">
          <span className="t-label">Name</span>
          <input required value={name} onChange={e => setName(e.target.value)} placeholder="e.g. Reading lamp" />
        </label>
        <label className="field">
          <span className="t-label">Room</span>
          <select value={room} onChange={e => setRoom(e.target.value as Room)}>
            {ROOMS.map(r => <option key={r}>{r}</option>)}
          </select>
        </label>
        <label className="field">
          <span className="t-label">Type</span>
          <select value={kind} onChange={e => setKind(e.target.value as Kind)}>
            {KINDS.map(k => <option key={k.kind} value={k.kind}>{k.label}</option>)}
          </select>
        </label>
        <p className="t-caption c-tertiary">This is a demo house: the device is simulated and starts switched on.</p>
        <div className="form-actions">
          <Button variant="ghost" onClick={onClose}>Cancel</Button>
          <Button type="submit">Add device</Button>
        </div>
      </form>
    </Dialog>
  )
}

export function DevicesDialog({ open, onClose, devices, onToggle }: { open: boolean; onClose: () => void; devices: Device[]; onToggle: (id: string) => void }) {
  const byRoom = [...new Set(devices.map(d => d.room))]
  return (
    <Dialog open={open} onClose={onClose} title="All devices">
      <div className="all-devices">
        {byRoom.map(room => (
          <section key={room}>
            <h3 className="t-overline c-tertiary">{room}</h3>
            <div className="stack-8">
              {devices.filter(d => d.room === room).map(d => <DeviceRow key={d.id} device={d} onToggle={() => onToggle(d.id)} />)}
            </div>
          </section>
        ))}
      </div>
    </Dialog>
  )
}
