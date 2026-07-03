import { useRef, useState } from 'react'
import type { ReactNode } from 'react'
import type { Wall } from '../../../types/api'
import { WALL_IMAGE_TYPES } from '../../../types/api'
import { useIsAdmin } from '../../../hooks/useIsAdmin'
import { useUploadWallImage } from '../hooks/useUploadWallImage'
import { validateWallImageFile, uploadErrorMessage } from '../utils/wallImageUpload'
import { WallImageViewer } from './WallImageViewer'

interface WallPhotoProps {
  wall: Wall
  /** Page-specific hero overlays (back/save buttons, chips) — absolutely positioned by the caller. */
  children?: ReactNode
}

/**
 * A wall's photo as a hero block: tap-to-fullscreen viewer for everyone,
 * add/replace upload for admins, inline error line beneath. Used by the wall
 * page (via WallHero) and by the area page when the area has a single wall.
 */
export function WallPhoto({ wall, children }: WallPhotoProps) {
  const isAdmin = useIsAdmin()
  const upload = useUploadWallImage()
  const [error, setError] = useState<string | null>(null)
  const [viewerOpen, setViewerOpen] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    e.target.value = '' // allow re-selecting the same file after a failure
    if (!file) return
    const validationError = validateWallImageFile(file)
    if (validationError) {
      setError(validationError)
      return
    }
    setError(null)
    upload.mutate(
      { wallId: wall.id, file },
      { onError: (err) => setError(uploadErrorMessage(err)) },
    )
  }

  return (
    <>
      <div className="relative h-52 bg-paper-2 overflow-hidden">
        {wall.imageUrl ? (
          <button
            onClick={() => setViewerOpen(true)}
            aria-label="View photo fullscreen"
            className="absolute inset-0 w-full h-full"
          >
            <img src={wall.imageUrl} alt={wall.name} className="w-full h-full object-cover" />
          </button>
        ) : (
          <div className="absolute inset-0 flex items-center justify-center text-ink-3 text-sm">
            photo
          </div>
        )}

        {children}

        {isAdmin && (
          <>
            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={upload.isPending}
              className="absolute bottom-3 right-3 bg-paper/80 backdrop-blur-sm rounded-full px-3 py-1.5 text-[12px] font-medium text-ink"
            >
              {wall.imageUrl ? 'Replace photo' : 'Add photo'}
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept={WALL_IMAGE_TYPES.join(',')}
              onChange={handleFileChange}
              aria-label="Wall photo file"
              className="hidden"
            />
          </>
        )}

        {upload.isPending && (
          <div className="absolute inset-0 bg-paper/60 flex items-center justify-center">
            <div
              aria-label="Uploading"
              className="h-8 w-8 rounded-full border-2 border-accent border-t-transparent animate-spin"
            />
          </div>
        )}
      </div>

      {error && <p className="px-4 pt-2 text-[13px] text-accent">{error}</p>}

      {viewerOpen && wall.imageUrl && (
        <WallImageViewer
          src={wall.imageUrl}
          alt={wall.name}
          onClose={() => setViewerOpen(false)}
        />
      )}
    </>
  )
}
