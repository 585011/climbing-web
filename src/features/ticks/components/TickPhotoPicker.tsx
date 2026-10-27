import { useEffect, useRef, useState } from 'react'
import { compressImage } from '../../../utils/compressImage'

/** A compressed photo picked for upload, plus an object URL for its preview. */
export interface TickPhoto {
  file: File
  previewUrl: string
}

// A 1600 px long edge at JPEG quality 0.8 turns a 3–10 MB phone photo into a few
// hundred KB while keeping hold colours and the line readable.
const MAX_DIMENSION = 1600
const JPEG_QUALITY = 0.8

const overlayButton =
  'bg-paper/80 backdrop-blur-sm rounded-full px-4 py-2 text-[13px] font-medium text-ink disabled:opacity-50'

interface TickPhotoPickerProps {
  value: TickPhoto | null
  onChange: (photo: TickPhoto | null) => void
  /** Photo already saved on the tick (edit mode). */
  currentUrl?: string | null
}

/**
 * Optional photo for a gym tick — gym routes get reset, so a photo is how the
 * climber remembers which one it was. Compresses in the browser on selection;
 * the page uploads `value.file` once the tick is saved.
 */
export function TickPhotoPicker({ value, onChange, currentUrl }: TickPhotoPickerProps) {
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [compressing, setCompressing] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Free the preview blob when it's replaced, removed, or the picker unmounts.
  useEffect(() => () => {
    if (value) URL.revokeObjectURL(value.previewUrl)
  }, [value])

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    e.target.value = '' // allow re-selecting the same file after a failure
    if (!file) return
    setError(null)
    setCompressing(true)
    try {
      const compressed = await compressImage(file, MAX_DIMENSION, JPEG_QUALITY)
      onChange({ file: compressed, previewUrl: URL.createObjectURL(compressed) })
    } catch {
      setError('Couldn’t read that image — try another photo')
    } finally {
      setCompressing(false)
    }
  }

  const pickFile = () => fileInputRef.current?.click()
  const shownUrl = value?.previewUrl ?? currentUrl ?? null

  return (
    <div className="px-4 mb-5">
      <div className="flex items-center justify-between mb-2">
        <p className="text-[15px] uppercase tracking-widest text-ink-3">Photo</p>
        <p className="text-[15px] text-ink-3">optional</p>
      </div>

      {shownUrl ? (
        <div className="relative h-48 rounded-xl overflow-hidden bg-paper-2">
          <img src={shownUrl} alt="Route photo" className="w-full h-full object-cover" />
          <div className="absolute bottom-2 right-2 flex gap-2">
            {value && (
              <button onClick={() => onChange(null)} disabled={compressing} className={overlayButton}>
                Remove
              </button>
            )}
            <button onClick={pickFile} disabled={compressing} className={overlayButton}>
              Replace
            </button>
          </div>
          {compressing && (
            <div className="absolute inset-0 bg-paper/60 flex items-center justify-center">
              <div
                aria-label="Compressing"
                className="h-8 w-8 rounded-full border-2 border-accent border-t-transparent animate-spin"
              />
            </div>
          )}
        </div>
      ) : (
        <button
          onClick={pickFile}
          disabled={compressing}
          className="w-full h-24 rounded-xl border-2 border-dashed border-ink/20 bg-paper text-[14px] font-medium text-ink-2 disabled:opacity-50"
        >
          {compressing ? 'Compressing…' : '＋ Add photo'}
        </button>
      )}

      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={handleFileChange}
        aria-label="Tick photo file"
        className="hidden"
      />
      {error ? (
        <p className="text-[13px] text-accent mt-1.5">{error}</p>
      ) : (
        !shownUrl && (
          <p className="text-[12px] text-ink-3 mt-1.5">Gym routes get reset — a photo helps you remember this one.</p>
        )
      )}
    </div>
  )
}
