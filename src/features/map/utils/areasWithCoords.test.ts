import { describe, it, expect } from 'vitest'
import { areasWithCoords } from './areasWithCoords'
import type { ClimbingArea } from '../../../types/api'

const area = (id: number, latitude: number, longitude: number): ClimbingArea => ({
  id,
  name: `Area ${id}`,
  description: '',
  latitude,
  longitude,
  region: 'Bergen',
  createdAt: '2026-01-01T00:00:00Z',
})

describe('areasWithCoords', () => {
  it('keeps areas with real coordinates', () => {
    const areas = [area(1, 60.39, 5.32), area(2, 59.91, 10.75)]
    expect(areasWithCoords(areas).map(a => a.id)).toEqual([1, 2])
  })

  it('drops exact 0,0 (null island — unset coordinates)', () => {
    const areas = [area(1, 60.39, 5.32), area(2, 0, 0)]
    expect(areasWithCoords(areas).map(a => a.id)).toEqual([1])
  })

  it('drops non-finite coordinates', () => {
    const areas = [area(1, 60.39, 5.32), area(2, NaN, 5), area(3, 60, Infinity)]
    expect(areasWithCoords(areas).map(a => a.id)).toEqual([1])
  })
})
