import { describe, it, expect, vi, beforeEach } from 'vitest'

const putMultipart = vi.fn()
vi.mock('../../../lib/api-client', () => ({
  apiClient: { putMultipart: (...args: unknown[]) => putMultipart(...args) },
}))

import { uploadTickPhoto } from './uploadTickPhoto'

describe('uploadTickPhoto', () => {
  beforeEach(() => putMultipart.mockReset())

  it('PUTs the photo under the multipart part name "image"', async () => {
    putMultipart.mockResolvedValue({
      id: 9, userId: 7, routeId: 42, tickedAt: '2026-10-01T00:00:00Z', style: 'flash', rating: null, personalNote: null,
      photoUrl: 'https://r2.example/tick.jpg?sig=x',
    })
    const photo = new File(['x'], 'route.jpg', { type: 'image/jpeg' })

    const tick = await uploadTickPhoto(7, 9, photo)

    const [path, form] = putMultipart.mock.calls[0] as [string, FormData]
    expect(path).toBe('/users/7/ticks/9/photo')
    expect(form.get('image')).toBe(photo)
    expect(tick.photoUrl).toBe('https://r2.example/tick.jpg?sig=x')
  })
})
