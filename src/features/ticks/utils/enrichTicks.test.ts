import { describe, it, expect } from 'vitest'
import { enrichTicks } from './enrichTicks'
import type { ClimbingArea, ClimbingRoute, UserRouteTick, Wall } from '../../../types/api'

const tick = (id: number, routeId: number, tickedAt: string): UserRouteTick => ({
  id, userId: 7, routeId, tickedAt, style: 'redpoint', rating: 3, personalNote: '',
})
const route = (id: number, wallId: number, name: string): ClimbingRoute => ({
  id, wallId, name, grade: '6+', length: 20, style: 'sport', bolts: 8,
  ropeLengths: 1, firstAscendant: '', description: '', createdAt: '2026-01-01T00:00:00Z',
})
const wall = (id: number, areaId: number, name: string): Wall => ({
  id, areaId, name, description: '', latitude: null, longitude: null,
  approachInfo: '', imageUrl: null, createdAt: '2026-01-01T00:00:00Z',
})
const area = (id: number, name: string): ClimbingArea => ({
  id, name, description: '', latitude: 0, longitude: 0, region: 'Bergen',
  createdAt: '2026-01-01T00:00:00Z',
})

describe('enrichTicks', () => {
  it('joins tick -> route -> wall -> area by ids', () => {
    const result = enrichTicks(
      [tick(1, 10, '2026-05-12T10:00:00Z')],
      [route(10, 20, 'Nordavind')],
      [wall(20, 30, 'Hovedveggen')],
      [area(30, 'Tellevikhola')],
    )
    expect(result).toHaveLength(1)
    expect(result[0].route?.name).toBe('Nordavind')
    expect(result[0].wall?.name).toBe('Hovedveggen')
    expect(result[0].area?.name).toBe('Tellevikhola')
  })

  it('sorts newest first', () => {
    const result = enrichTicks(
      [tick(1, 10, '2026-04-01T00:00:00Z'), tick(2, 10, '2026-05-12T00:00:00Z')],
      [route(10, 20, 'Nordavind')], [wall(20, 30, 'W')], [area(30, 'A')],
    )
    expect(result.map(r => r.tick.id)).toEqual([2, 1])
  })

  it('keeps ticks whose route/wall/area is missing, with undefined joins', () => {
    const result = enrichTicks([tick(1, 999, '2026-05-12T00:00:00Z')], [], [], [])
    expect(result).toHaveLength(1)
    expect(result[0].route).toBeUndefined()
    expect(result[0].wall).toBeUndefined()
    expect(result[0].area).toBeUndefined()
  })
})
