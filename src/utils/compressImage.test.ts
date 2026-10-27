import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { compressImage, fitWithin } from './compressImage'

describe('fitWithin', () => {
  it('scales the long edge down to the max, keeping the aspect ratio', () => {
    expect(fitWithin(4000, 3000, 1600)).toEqual({ width: 1600, height: 1200 })
    expect(fitWithin(3000, 4000, 1600)).toEqual({ width: 1200, height: 1600 })
  })

  it('never upscales a small image', () => {
    expect(fitWithin(800, 600, 1600)).toEqual({ width: 800, height: 600 })
  })
})

// jsdom can't decode images or draw on canvas, so stub the browser pieces.
describe('compressImage', () => {
  const decode = vi.fn()
  const drawImage = vi.fn()

  beforeEach(() => {
    URL.createObjectURL = vi.fn(() => 'blob:source')
    URL.revokeObjectURL = vi.fn()
    decode.mockReset().mockResolvedValue(undefined)
    Object.defineProperty(HTMLImageElement.prototype, 'decode', { configurable: true, value: decode })
    vi.spyOn(HTMLImageElement.prototype, 'naturalWidth', 'get').mockReturnValue(4000)
    vi.spyOn(HTMLImageElement.prototype, 'naturalHeight', 'get').mockReturnValue(3000)
    vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(
      { drawImage } as unknown as CanvasRenderingContext2D,
    )
    vi.spyOn(HTMLCanvasElement.prototype, 'toBlob').mockImplementation((cb, type) =>
      cb(new Blob(['jpeg-bytes'], { type })),
    )
  })

  afterEach(() => {
    vi.restoreAllMocks()
    drawImage.mockReset()
  })

  it('downscales to the max dimension and re-encodes as JPEG', async () => {
    const file = new File(['raw'], 'IMG_0042.png', { type: 'image/png' })

    const out = await compressImage(file, 1600, 0.8)

    expect(drawImage).toHaveBeenCalledWith(expect.any(HTMLImageElement), 0, 0, 1600, 1200)
    expect(HTMLCanvasElement.prototype.toBlob).toHaveBeenCalledWith(expect.any(Function), 'image/jpeg', 0.8)
    expect(out.type).toBe('image/jpeg')
    expect(out.name).toBe('IMG_0042.jpg')
    expect(URL.revokeObjectURL).toHaveBeenCalledWith('blob:source')
  })

  it('rejects, and still frees the object URL, when the image cannot be decoded', async () => {
    decode.mockRejectedValue(new Error('EncodingError'))
    const file = new File(['raw'], 'IMG_0042.heic', { type: 'image/heic' })

    await expect(compressImage(file, 1600, 0.8)).rejects.toThrow()
    expect(drawImage).not.toHaveBeenCalled()
    expect(URL.revokeObjectURL).toHaveBeenCalledWith('blob:source')
  })
})
