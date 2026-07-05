import { describe, it, expect, vi, beforeEach } from 'vitest'

const get = vi.fn()
vi.mock('../../../lib/api-client', () => ({
  apiClient: { get: (...args: unknown[]) => get(...args) },
}))

import { getAreas } from './getAreas'

describe('getAreas', () => {
  beforeEach(() => get.mockReset())

  it('requests a large page so all areas load (backend defaults to size=20)', async () => {
    get.mockResolvedValue({ data: [] })
    await getAreas()
    expect(get).toHaveBeenCalledWith('/climbing-areas?size=100')
  })
})
