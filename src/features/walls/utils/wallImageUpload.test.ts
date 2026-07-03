import { describe, it, expect } from 'vitest'
import { ApiError } from '../../../lib/api-client'
import { WALL_IMAGE_MAX_BYTES } from '../../../types/api'
import { validateWallImageFile, uploadErrorMessage } from './wallImageUpload'

describe('validateWallImageFile', () => {
  it('accepts a small jpeg', () => {
    const file = new File(['x'], 'a.jpg', { type: 'image/jpeg' })
    expect(validateWallImageFile(file)).toBeNull()
  })

  it('rejects a disallowed type', () => {
    const file = new File(['x'], 'a.gif', { type: 'image/gif' })
    expect(validateWallImageFile(file)).toBe('Image must be JPEG, PNG or WebP')
  })

  it('rejects an oversized file', () => {
    const file = new File([new ArrayBuffer(WALL_IMAGE_MAX_BYTES + 1)], 'a.png', {
      type: 'image/png',
    })
    expect(validateWallImageFile(file)).toBe('Image is larger than 20 MB')
  })
})

describe('uploadErrorMessage', () => {
  it('maps 400 to the type message', () => {
    expect(uploadErrorMessage(new ApiError(400, 'Bad Request', 'VALIDATION_ERROR')))
      .toBe('Image must be JPEG, PNG or WebP')
  })

  it('maps 413 to the size message', () => {
    expect(uploadErrorMessage(new ApiError(413, 'Payload Too Large')))
      .toBe('Image is larger than 20 MB')
  })

  it('maps 403 to the admin message', () => {
    expect(uploadErrorMessage(new ApiError(403, 'Forbidden')))
      .toBe('Only admins can upload images')
  })

  it('falls back to a generic message', () => {
    expect(uploadErrorMessage(new ApiError(500, 'Internal Server Error')))
      .toBe('Upload failed — please try again')
    expect(uploadErrorMessage(new Error('boom')))
      .toBe('Upload failed — please try again')
  })
})
