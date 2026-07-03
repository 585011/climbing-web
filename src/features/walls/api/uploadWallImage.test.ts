import { describe, it, expect, vi, beforeEach } from 'vitest'

const putMultipart = vi.fn()
vi.mock('../../../lib/api-client', () => ({
  apiClient: { putMultipart: (...args: unknown[]) => putMultipart(...args) },
}))

import { uploadWallImage } from './uploadWallImage'

const wallResponse = {
  id: 5,
  areaId: 2,
  name: 'Main Wall',
  description: null,
  latitude: null,
  longitude: null,
  approachInfo: null,
  createdAt: '2026-06-12T00:00:00Z',
  imageUrl: 'https://r2.example/img.jpg?sig=x',
}

describe('uploadWallImage', () => {
  beforeEach(() => putMultipart.mockReset())

  it('PUTs the file under the multipart part name "image"', async () => {
    putMultipart.mockResolvedValue(wallResponse)
    const file = new File(['x'], 'topo.jpg', { type: 'image/jpeg' })

    const wall = await uploadWallImage(5, file)

    const [path, form] = putMultipart.mock.calls[0] as [string, FormData]
    expect(path).toBe('/walls/5/image')
    expect(form).toBeInstanceOf(FormData)
    expect(form.get('image')).toBe(file)
    expect(wall.imageUrl).toBe('https://r2.example/img.jpg?sig=x')
  })
})
