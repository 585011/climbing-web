import { TransformWrapper, TransformComponent } from 'react-zoom-pan-pinch'

interface WallImageViewerProps {
  src: string
  alt: string
  onClose: () => void
}

/** Fullscreen overlay with pinch-zoom / pan / double-tap zoom. */
export function WallImageViewer({ src, alt, onClose }: WallImageViewerProps) {
  return (
    <div className="fixed inset-0 z-50 bg-ink/95" role="dialog" aria-modal="true">
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
    </div>
  )
}
