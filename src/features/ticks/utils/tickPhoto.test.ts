import { describe, it, expect } from 'vitest'
import { prepareTickPhoto, TICK_PHOTO_SIZE_ERROR, TICK_PHOTO_TYPE_ERROR, validateTickPhotoFile } from './tickPhoto'
import { TICK_PHOTO_MAX_BYTES } from '../../../types/api'

// jsdom can't decode or re-encode images, which exercises the fallback path.
const fileOfSize = (bytes: number, type = 'image/jpeg') =>
  new File([new Uint8Array(bytes)], 'photo', { type })

describe('validateTickPhotoFile', () => {
  it('accepts JPEG, PNG and WebP and rejects other types', () => {
    expect(validateTickPhotoFile(fileOfSize(1, 'image/png'))).toBeNull()
    expect(validateTickPhotoFile(fileOfSize(1, 'image/heic'))).toBe(TICK_PHOTO_TYPE_ERROR)
  })
})

describe('prepareTickPhoto', () => {
  it('falls back to the original when it cannot be re-encoded but is small enough', async () => {
    const small = fileOfSize(1024)
    await expect(prepareTickPhoto(small)).resolves.toBe(small)
  })

  it('rejects when it cannot be re-encoded and is over the size limit', async () => {
    await expect(prepareTickPhoto(fileOfSize(TICK_PHOTO_MAX_BYTES + 1))).rejects.toThrow(TICK_PHOTO_SIZE_ERROR)
  })
})
