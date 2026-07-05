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
})
