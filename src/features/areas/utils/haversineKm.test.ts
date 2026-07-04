import { describe, it, expect } from 'vitest'
import { haversineKm } from './haversineKm'

describe('haversineKm', () => {
  it('returns 0 for identical points', () => {
    const bergen = { latitude: 60.39, longitude: 5.32 }
    expect(haversineKm(bergen, bergen)).toBe(0)
  })

  it('computes the Bergen–Oslo distance to within a few km', () => {
    const bergen = { latitude: 60.39, longitude: 5.32 }
    const oslo = { latitude: 59.91, longitude: 10.75 }
    const km = haversineKm(bergen, oslo)
    expect(km).toBeGreaterThan(295)
    expect(km).toBeLessThan(315)
  })
})
