import { describe, it, expect, vi, beforeEach } from 'vitest'

const post = vi.fn()
vi.mock('../../../lib/api-client', () => ({
  apiClient: { post: (...args: unknown[]) => post(...args) },
}))

import { createGymTick } from './createGymTick'

describe('createGymTick', () => {
  beforeEach(() => post.mockReset())

  it('sends the new route and tick fields in one request', async () => {
    post.mockResolvedValue({
      id: 1, userId: 7, routeId: 99, tickedAt: '2026-09-22T00:00:00Z', style: 'flash', rating: null, personalNote: null,
    })
    const tick = await createGymTick(7, { wallId: 5, grade: ' 6B ', style: 'boulder', holdColor: 'yellow' }, { style: 'flash' })
    expect(post).toHaveBeenCalledWith('/users/7/ticks', {
      newRoute: { wallId: 5, grade: '6B', style: 'boulder', holdColor: 'yellow' },
      style: 'flash',
    })
    expect(tick.routeId).toBe(99)
  })

  it('rejects an invalid route before any network call', async () => {
    await expect(createGymTick(7, { wallId: 5, grade: '', style: 'boulder' })).rejects.toBeDefined()
    expect(post).not.toHaveBeenCalled()
  })
})
