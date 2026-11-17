import { TICK_PHOTO_MAX_BYTES, TICK_PHOTO_TYPES } from '../../../types/api'

export const TICK_PHOTO_TYPE_ERROR = 'Photo must be JPEG, PNG or WebP'
export const TICK_PHOTO_SIZE_ERROR = 'Photo is larger than 5 MB'

// The backend stores photos at most 1080px wide; 2048px on the long edge keeps
// enough detail for that while shrinking a typical 12 MP phone photo to well under 1 MB.
const MAX_EDGE_PX = 2048
const JPEG_QUALITY = 0.85

/** Pre-upload UX check of the picked file's type. null = valid. */
export function validateTickPhotoFile(file: File): string | null {
  return TICK_PHOTO_TYPES.includes(file.type) ? null : TICK_PHOTO_TYPE_ERROR
}

/**
 * Downscales a picked photo to a JPEG before upload, so phone camera photos
 * stay under the 5 MB limit and upload quickly over gym wifi. Drawing an
 * <img> onto the canvas applies the photo's EXIF orientation. If the browser
 * can't re-encode it, the original is used when it is small enough.
 * Rejects with TICK_PHOTO_SIZE_ERROR otherwise.
 */
export async function prepareTickPhoto(file: File): Promise<File> {
  try {
    return await downscaleToJpeg(file)
  } catch {
    if (file.size <= TICK_PHOTO_MAX_BYTES) return file
    throw new Error(TICK_PHOTO_SIZE_ERROR)
  }
}

async function downscaleToJpeg(file: File): Promise<File> {
  const url = URL.createObjectURL(file)
  try {
    const img = new Image()
    img.src = url
    await img.decode()
    const scale = Math.min(1, MAX_EDGE_PX / Math.max(img.naturalWidth, img.naturalHeight))
    const canvas = document.createElement('canvas')
    canvas.width = Math.round(img.naturalWidth * scale)
    canvas.height = Math.round(img.naturalHeight * scale)
    const ctx = canvas.getContext('2d')
    if (!ctx) throw new Error('No 2D canvas context')
    ctx.fillStyle = '#fff' // JPEG has no alpha — flatten transparent PNGs onto white, not black
    ctx.fillRect(0, 0, canvas.width, canvas.height)
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height)
    const blob = await new Promise<Blob | null>(resolve => canvas.toBlob(resolve, 'image/jpeg', JPEG_QUALITY))
    if (!blob || blob.size > TICK_PHOTO_MAX_BYTES) throw new Error('Could not encode photo')
    return new File([blob], 'tick-photo.jpg', { type: 'image/jpeg' })
  } finally {
    URL.revokeObjectURL(url)
  }
}
