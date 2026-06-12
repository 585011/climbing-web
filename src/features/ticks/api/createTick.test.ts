import { describe, it, expect, vi, beforeEach } from 'vitest'
import { PERSONAL_NOTE_MAX } from '../../../types/api'

const post = vi.fn()
vi.mock('../../../lib/api-client', () => ({
  apiClient: { post: (...args: unknown[]) => post(...args) },
}))

import { createTick } from './createTick'

const validTickResponse = {
  id: 1,
  userId: 7,
  routeId: 42,
  tickedAt: '2026-06-12T00:00:00Z',
  style: 'redpoint',
  rating: 5,
  personalNote: 'nice',
}

describe('createTick input guard', () => {
  beforeEach(() => post.mockReset())

  it('rejects an over-length note before any network call', async () => {
    const note = 'a'.repeat(PERSONAL_NOTE_MAX + 1)
    await expect(createTick(7, 42, { personalNote: note })).rejects.toBeDefined()
    expect(post).not.toHaveBeenCalled()
  })

  it('sends a trimmed, valid payload', async () => {
    post.mockResolvedValue(validTickResponse)
    await createTick(7, 42, { style: '  redpoint  ', rating: 5, personalNote: '  nice  ' })
    expect(post).toHaveBeenCalledWith('/users/7/ticks', {
      routeId: 42,
      style: 'redpoint',
      rating: 5,
      personalNote: 'nice',
    })
  })
})
