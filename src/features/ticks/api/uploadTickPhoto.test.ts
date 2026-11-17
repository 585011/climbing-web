import { describe, it, expect, vi, beforeEach } from 'vitest'

const putMultipart = vi.fn()
vi.mock('../../../lib/api-client', () => ({
  apiClient: { putMultipart: (...args: unknown[]) => putMultipart(...args) },
}))

import { uploadTickPhoto } from './uploadTickPhoto'

const tickResponse = {
  id: 9, userId: 7, routeId: 42, tickedAt: '2026-11-17T10:00:00Z',
  style: 'flash', rating: null, personalNote: null, photoUrl: 'https://r2.example/ticks/p.jpg?sig=x',
}

describe('uploadTickPhoto', () => {
  beforeEach(() => putMultipart.mockReset())

  it('PUTs the photo under the multipart part name "image" and parses the tick', async () => {
    putMultipart.mockResolvedValue(tickResponse)
    const photo = new File(['x'], 'tick-photo.jpg', { type: 'image/jpeg' })

    const tick = await uploadTickPhoto(7, 9, photo)

    const [path, form] = putMultipart.mock.calls[0]
    expect(path).toBe('/users/7/ticks/9/photo')
    expect((form as FormData).get('image')).toBe(photo)
    expect(tick.photoUrl).toBe(tickResponse.photoUrl)
  })

  it('treats a missing photoUrl (older API) as no photo', async () => {
    const { photoUrl: _omit, ...older } = tickResponse
    void _omit
    putMultipart.mockResolvedValue(older)
    const tick = await uploadTickPhoto(7, 9, new File(['x'], 'p.jpg', { type: 'image/jpeg' }))
    expect(tick.photoUrl).toBeNull()
  })
})
