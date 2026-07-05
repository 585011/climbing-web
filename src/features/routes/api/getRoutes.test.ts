import { describe, it, expect, vi, beforeEach } from 'vitest'

const get = vi.fn()
vi.mock('../../../lib/api-client', () => ({
  apiClient: { get: (...args: unknown[]) => get(...args) },
}))

import { getRoutes } from './getRoutes'

describe('getRoutes', () => {
  beforeEach(() => get.mockReset())

  it('requests a large page so all routes load (backend defaults to size=20)', async () => {
    get.mockResolvedValue({ data: [] })
    await getRoutes()
    expect(get).toHaveBeenCalledWith('/routes?size=100')
  })
})
