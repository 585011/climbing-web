import { ApiError } from '../../../lib/api-client'
import { WALL_IMAGE_MAX_BYTES, WALL_IMAGE_TYPES } from '../../../types/api'

const TYPE_ERROR = 'Image must be JPEG, PNG or WebP'
const SIZE_ERROR = 'Image is larger than 20 MB'

/** Pre-upload UX check mirroring the backend limits. null = valid. */
export function validateWallImageFile(file: File): string | null {
  if (!WALL_IMAGE_TYPES.includes(file.type)) return TYPE_ERROR
  if (file.size > WALL_IMAGE_MAX_BYTES) return SIZE_ERROR
  return null
}

/** Maps upload failures to user-facing copy. */
export function uploadErrorMessage(err: unknown): string {
  if (err instanceof ApiError) {
    if (err.status === 400) return TYPE_ERROR
    if (err.status === 413) return SIZE_ERROR
    if (err.status === 403) return 'Only admins can upload images'
  }
  return 'Upload failed — please try again'
}
