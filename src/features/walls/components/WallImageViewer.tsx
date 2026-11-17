import { useEffect, useRef } from 'react'
import { TransformWrapper, TransformComponent } from 'react-zoom-pan-pinch'

interface WallImageViewerProps {
  src: string
  alt: string
  onClose: () => void
}

/**
 * Fullscreen overlay with pinch-zoom / pan / double-tap zoom. A native modal
 * <dialog> gives focus containment, an inert page behind it, and Esc /
 * back-gesture dismissal for free (all routed through `onClose`).
 */
export function WallImageViewer({ src, alt, onClose }: WallImageViewerProps) {
  const dialogRef = useRef<HTMLDialogElement>(null)

  useEffect(() => {
    const dialog = dialogRef.current
    if (dialog && !dialog.open) dialog.showModal()
  }, [])

  return (
    <dialog
      ref={dialogRef}
      onClose={onClose}
      aria-label={alt}
      className="m-0 h-dvh max-h-none w-dvw max-w-none border-0 bg-ink/95 p-0"
    >
      <button
        onClick={onClose}
        aria-label="Close"
        className="absolute top-4 right-4 z-10 bg-paper/80 backdrop-blur-sm rounded-full w-11 h-11 text-ink text-lg"
      >
        ✕
      </button>
      <TransformWrapper doubleClick={{ mode: 'zoomIn' }}>
        <TransformComponent
          wrapperClass="!w-full !h-full"
          contentClass="!w-full !h-full flex items-center justify-center"
        >
          <img src={src} alt={alt} className="max-w-full max-h-full object-contain" />
        </TransformComponent>
      </TransformWrapper>
    </dialog>
  )
}
