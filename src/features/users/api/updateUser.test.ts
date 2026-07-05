import { describe, it, expect, vi, beforeEach } from 'vitest'
import { DISPLAY_NAME_MAX } from '../../../types/api'

const put = vi.fn()
vi.mock('../../../lib/api-client', () => ({
  apiClient: { put: (...args: unknown[]) => put(...args) },
}))

import { updateUser } from './updateUser'

const validUserResponse = {
  id: 7,
  email: 'martin@example.com',
  displayName: 'Åse-Marie J.',
  createdAt: '2026-01-01T00:00:00Z',
  auth0Id: 'auth0|abc123',
}

describe('updateUser input guard', () => {
  beforeEach(() => put.mockReset())

  it('rejects a blank display name before any network call', async () => {
    await expect(
      updateUser(7, { email: 'martin@example.com', displayName: '   ' }),
    ).rejects.toBeDefined()
    expect(put).not.toHaveBeenCalled()
  })

  it('rejects an over-length display name before any network call', async () => {
    const name = 'a'.repeat(DISPLAY_NAME_MAX + 1)
    await expect(
      updateUser(7, { email: 'martin@example.com', displayName: name }),
    ).rejects.toBeDefined()
    expect(put).not.toHaveBeenCalled()
  })

  it('rejects disallowed characters before any network call', async () => {
    await expect(
      updateUser(7, { email: 'martin@example.com', displayName: '<script>' }),
    ).rejects.toBeDefined()
    expect(put).not.toHaveBeenCalled()
  })

  it('sends a trimmed payload and accepts international names', async () => {
    put.mockResolvedValue(validUserResponse)
    const result = await updateUser(7, {
      email: 'martin@example.com',
      displayName: '  Åse-Marie J.  ',
    })
    expect(put).toHaveBeenCalledWith('/users/7', {
      email: 'martin@example.com',
      displayName: 'Åse-Marie J.',
    })
    expect(result.displayName).toBe('Åse-Marie J.')
  })
})
