import { describe, it, expect } from 'vitest'
import { areaImageMap } from './areaImageMap'
import type { Wall } from '../../../types/api'

const wall = (over: Partial<Wall>): Wall => ({
  id: 1,
  areaId: 1,
  name: 'W',
  description: '',
  latitude: null,
  longitude: null,
  approachInfo: '',
  imageUrl: null,
  thumbnailUrl: null,
  createdAt: '2026-01-01T00:00:00Z',
  ...over,
})

describe('areaImageMap', () => {
  it('prefers thumbnailUrl over imageUrl', () => {
    const map = areaImageMap([wall({ areaId: 5, imageUrl: 'full', thumbnailUrl: 'thumb' })])
    expect(map.get(5)).toBe('thumb')
  })

  it('falls back to imageUrl when thumbnailUrl is absent', () => {
    const map = areaImageMap([wall({ areaId: 5, imageUrl: 'full', thumbnailUrl: null })])
    expect(map.get(5)).toBe('full')
  })

  it('keeps the first wall with an image per area', () => {
    const map = areaImageMap([
      wall({ id: 1, areaId: 5, imageUrl: null, thumbnailUrl: null }),
      wall({ id: 2, areaId: 5, thumbnailUrl: 'thumb2' }),
      wall({ id: 3, areaId: 5, thumbnailUrl: 'thumb3' }),
    ])
    expect(map.get(5)).toBe('thumb2')
  })

  it('skips walls with no image at all', () => {
    const map = areaImageMap([wall({ areaId: 5, imageUrl: null, thumbnailUrl: null })])
    expect(map.has(5)).toBe(false)
  })
})
