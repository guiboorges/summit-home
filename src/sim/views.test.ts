import { describe, expect, it } from 'vitest'
import { bars, flow, kpis } from './energy'
import { applyPatch, initialHome, powerKw, scenes, solarKw } from './model'
import { dueAutomations, roomOff, roomSummaries } from './rooms'

const at = (h: number, m = 0) => new Date(2026, 9, 15, h, m)

describe('energy views', () => {
  it('surplus sun charges the battery; at night the battery covers the house', () => {
    const home = { ...initialHome(), jitter: 0 }
    const noon = flow(home, at(13))
    expect(noon.battery).toBeCloseTo(solarKw(13) - powerKw(home), 5)
    expect(noon.grid).toBe(0)
    const night = flow(home, at(23))
    expect(night.battery).toBeLessThan(0)
    expect(night.grid).toBe(0)
  })

  it('a full battery exports the surplus, an empty one imports', () => {
    const home = { ...initialHome(), jitter: 0 }
    expect(flow({ ...home, battery: 100 }, at(13)).grid).toBeLessThan(0)
    expect(flow({ ...home, battery: 5 }, at(23)).grid).toBeGreaterThan(0)
  })

  it('periods have the right number of bars and today ends the 7-day view', () => {
    const home = initialHome()
    expect(bars(home, at(18), 'today')).toHaveLength(24)
    const week = bars(home, at(18), '7d')
    expect(week).toHaveLength(7)
    expect(week.at(-1)!.label).toBe('Today')
    expect(bars(home, at(18), 'year').filter(b => b.future)).toHaveLength(2) // November, December
  })

  it('history is stable across calls and self-sufficiency stays within 0–1', () => {
    const home = initialHome()
    expect(bars(home, at(18), '30d').slice(0, -1)).toEqual(bars(home, at(18), '30d').slice(0, -1))
    const k = kpis(home, at(18), '30d')
    expect(k.selfSufficiency).toBeGreaterThan(0)
    expect(k.selfSufficiency).toBeLessThanOrEqual(1)
  })
})

describe('rooms', () => {
  it('all off leaves locks and cameras alone', () => {
    const devices = roomOff(initialHome().devices, 'Entrance')
    expect(devices.find(d => d.id === 'front-door')!.on).toBe(true)
    expect(devices.find(d => d.id === 'camera')!.on).toBe(true)
    const kitchen = roomOff(initialHome().devices, 'Kitchen').filter(d => d.room === 'Kitchen')
    expect(kitchen.every(d => !d.on)).toBe(true)
  })

  it('summaries count devices that are on, and the away scene arms nothing by itself', () => {
    const home = initialHome()
    const kitchen = roomSummaries(home, at(18)).find(r => r.room === 'Kitchen')!
    expect(kitchen.on).toBe(2)
    const away = applyPatch(home.devices, scenes.find(s => s.id === 'away')!.on)
    expect(roomSummaries({ ...home, devices: away }, at(18)).find(r => r.room === 'Kitchen')!.on).toBe(1) // dishwasher keeps running
  })

  it('automations run once when their time passes', () => {
    const on = { wake: true, sunset: true, night: true, left: true }
    expect(dueAutomations(at(18, 50), at(18, 52), on).map(a => a.id)).toEqual(['sunset'])
    expect(dueAutomations(at(18, 52), at(18, 55), on)).toEqual([])
    expect(dueAutomations(at(18, 50), at(18, 52), { ...on, sunset: false })).toEqual([])
  })
})
