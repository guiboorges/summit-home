import { describe, expect, it } from 'vitest'
import { applyPatch, initialHome, powerKw, sceneActive, scenes, solarKw, step, today, BATTERY_KWH } from './model'

const at = (h: number, m = 0) => new Date(2026, 9, 15, h, m)

describe('simulated lake house', () => {
  it('produces no solar at night and peaks around midday', () => {
    expect(solarKw(3)).toBe(0)
    expect(solarKw(22)).toBe(0)
    expect(solarKw(13.2)).toBeGreaterThan(3)
  })

  it('turning a device off lowers the power reading by its wattage', () => {
    const home = { ...initialHome(), jitter: 0 }
    const off = { ...home, devices: home.devices.map(d => (d.id === 'dishwasher' ? { ...d, on: false } : d)) }
    expect(powerKw(home) - powerKw(off)).toBeCloseTo(1.1, 5)
  })

  it('ignores offline devices', () => {
    const home = initialHome()
    const patched = applyPatch(home.devices, { 'garden-sensor': { on: false } })
    expect(patched.find(d => d.id === 'garden-sensor')!.on).toBe(true)
  })

  it('a scene is active after it runs and inactive after it ends', () => {
    const lake = scenes.find(s => s.id === 'lake')!
    const on = applyPatch(initialHome().devices, lake.on)
    expect(sceneActive(lake, on)).toBe(true)
    expect(sceneActive(lake, applyPatch(on, lake.off))).toBe(false)
  })

  it('charges the battery with surplus sun and drains it at night', () => {
    const away = applyPatch(initialHome().devices, scenes.find(s => s.id === 'away')!.on)
    const sunny = step({ ...initialHome(), devices: away, jitter: 0 }, at(13), 60, () => 0.5)
    expect(sunny.battery).toBeGreaterThan(78)
    const night = step({ ...initialHome(), jitter: 0 }, at(23), 60, () => 0.5)
    expect(night.battery).toBeLessThan(78)
    expect(78 - night.battery).toBeCloseTo((powerKw({ ...initialHome(), jitter: 0 }) / BATTERY_KWH) * 100, 1)
  })

  it('today ends with the live reading and solar share stays within 0–1', () => {
    const home = { ...initialHome(), jitter: 0 }
    const day = today(home, at(18, 42))
    expect(day.use.at(-1)).toBeCloseTo(powerKw(home), 5)
    expect(day.hours.at(-1)).toBeCloseTo(18.7, 5)
    expect(day.solarShare).toBeGreaterThan(0)
    expect(day.solarShare).toBeLessThanOrEqual(1)
  })
})
