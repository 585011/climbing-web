/** Scales (width, height) down so the long edge is at most `maxDimension`; never upscales. */
export function fitWithin(width: number, height: number, maxDimension: number) {
  const scale = Math.min(1, maxDimension / Math.max(width, height))
  return { width: Math.round(width * scale), height: Math.round(height * scale) }
}

/**
 * Downscales an image so its long edge is at most `maxDimension` and re-encodes
 * it as JPEG at `quality` (0–1). Re-encoding also strips EXIF metadata such as
 * GPS location. Rejects when the browser can't decode the file (e.g. HEIC in
 * Chrome).
 */
export async function compressImage(file: File, maxDimension: number, quality: number): Promise<File> {
  const url = URL.createObjectURL(file)
  try {
    // Decode via <img>: browsers apply EXIF orientation to it (and to drawImage),
    // so portrait phone photos stay upright.
    const img = new Image()
    img.src = url
    await img.decode()

    const { width, height } = fitWithin(img.naturalWidth, img.naturalHeight, maxDimension)
    const canvas = document.createElement('canvas')
    canvas.width = width
    canvas.height = height
    const ctx = canvas.getContext('2d')
    if (!ctx) throw new Error('Canvas 2D context unavailable')
    ctx.drawImage(img, 0, 0, width, height)

    const blob = await new Promise<Blob | null>(resolve => canvas.toBlob(resolve, 'image/jpeg', quality))
    if (!blob) throw new Error('Could not encode image')
    const name = `${file.name.replace(/\.[^.]*$/, '') || 'photo'}.jpg`
    return new File([blob], name, { type: 'image/jpeg' })
  } finally {
    URL.revokeObjectURL(url)
  }
}
