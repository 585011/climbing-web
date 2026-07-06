import { describe, it, expect, vi, beforeEach } from 'vitest'

const get = vi.fn()
vi.mock('../../../lib/api-client', () => ({
  apiClient: { get: (...args: unknown[]) => get(...args) },
}))

import { getWalls } from './getWalls'

describe('getWalls', () => {
  beforeEach(() => get.mockReset())

  it('requests a large page so all walls load (backend defaults to size=20)', async () => {
    get.mockResolvedValue({ data: [] })
    await getWalls()
    expect(get).toHaveBeenCalledWith('/walls?size=100')
  })

  it('parses thumbnailUrl through the wall schema', async () => {
    get.mockResolvedValue({
      data: [
        {
          id: 1,
          areaId: 2,
          name: 'Main Wall',
          description: null,
          latitude: null,
          longitude: null,
          approachInfo: null,
          imageUrl: 'http://img/full.jpg',
          thumbnailUrl: 'http://img/thumb.jpg',
          createdAt: '2026-01-01T00:00:00Z',
        },
      ],
    })
    const walls = await getWalls()
    expect(walls[0].thumbnailUrl).toBe('http://img/thumb.jpg')
  })

  it('accepts a wall with no thumbnailUrl field (pre-backfill record)', async () => {
    get.mockResolvedValue({
      data: [
        {
          id: 1,
          areaId: 2,
          name: 'Old Wall',
          description: null,
          latitude: null,
          longitude: null,
          approachInfo: null,
          imageUrl: 'http://img/full.jpg',
          createdAt: '2026-01-01T00:00:00Z',
        },
      ],
    })
    const walls = await getWalls()
    expect(walls[0].thumbnailUrl ?? null).toBeNull()
  })
})
