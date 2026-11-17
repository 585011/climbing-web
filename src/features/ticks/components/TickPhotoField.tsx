import { useEffect, useRef, useState } from 'react'
import { TICK_PHOTO_TYPES } from '../../../types/api'
import { prepareTickPhoto, TICK_PHOTO_SIZE_ERROR, validateTickPhotoFile } from '../utils/tickPhoto'

interface TickPhotoFieldProps {
  /** The tick's current photo when editing; replaced (not deleted) by a new pick. */
  existingUrl: string | null
  /** Receives the downscaled photo to upload after save, or null when cleared. */
  onChange: (photo: File | null) => void
  /** True while a picked photo is being downscaled — the form should hold off saving. */
  onPreparingChange: (preparing: boolean) => void
}

/** Optional "your photo" picker for gym ticks: camera or gallery, with a preview. */
export function TickPhotoField({ existingUrl, onChange, onPreparingChange }: TickPhotoFieldProps) {
  const inputRef = useRef<HTMLInputElement>(null)
  const objectUrlRef = useRef<string | null>(null)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [preparing, setPreparing] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const showPreview = (url: string | null) => {
    if (objectUrlRef.current) URL.revokeObjectURL(objectUrlRef.current)
    objectUrlRef.current = url
    setPreviewUrl(url)
  }
  useEffect(() => () => {
    if (objectUrlRef.current) URL.revokeObjectURL(objectUrlRef.current)
  }, [])

  const setBusy = (busy: boolean) => {
    setPreparing(busy)
    onPreparingChange(busy)
  }

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    e.target.value = '' // allow re-picking the same file after an error
    if (!file) return
    const typeError = validateTickPhotoFile(file)
    if (typeError) {
      setError(typeError)
      return
    }
    setError(null)
    setBusy(true)
    try {
      const photo = await prepareTickPhoto(file)
      showPreview(URL.createObjectURL(photo))
      onChange(photo)
    } catch {
      setError(TICK_PHOTO_SIZE_ERROR)
    } finally {
      setBusy(false)
    }
  }

  const clear = () => {
    showPreview(null)
    onChange(null)
  }

  const shownUrl = previewUrl ?? existingUrl

  return (
    <div>
      {shownUrl && (
        <img src={shownUrl} alt="Your photo of this route" className="w-full max-h-64 object-cover rounded-xl border border-ink/15 mb-2" />
      )}
      <div className="flex gap-2">
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          disabled={preparing}
          className="flex-1 min-h-11 rounded-xl border border-ink/20 bg-paper text-[14px] font-semibold text-ink disabled:opacity-50"
        >
          {preparing ? 'Preparing photo…' : shownUrl ? 'Replace photo' : '+ Add photo'}
        </button>
        {previewUrl && (
          <button
            type="button"
            onClick={clear}
            className="min-h-11 px-4 rounded-xl border border-ink/20 text-[14px] text-ink-2"
          >
            Remove
          </button>
        )}
      </div>
      <input
        ref={inputRef}
        type="file"
        accept={TICK_PHOTO_TYPES.join(',')}
        onChange={handleFileChange}
        aria-label="Tick photo file"
        className="hidden"
      />
      {error && <p className="text-[13px] text-accent mt-2">{error}</p>}
    </div>
  )
}
