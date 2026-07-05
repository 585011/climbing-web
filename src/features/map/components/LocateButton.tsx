import { useState } from 'react'

// Crosshair icon — same stroke family as the bottom-nav icons.
const LocateIcon = () => (
  <svg
    width={18}
    height={18}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth={2}
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden
  >
    <circle cx="12" cy="12" r="7" />
    <line x1="12" y1="1" x2="12" y2="4" />
    <line x1="12" y1="20" x2="12" y2="23" />
    <line x1="1" y1="12" x2="4" y2="12" />
    <line x1="20" y1="12" x2="23" y2="12" />
  </svg>
)

export const LocateButton = ({
  onLocate,
}: {
  onLocate: (coords: { latitude: number; longitude: number }) => void
}) => {
  const [failed, setFailed] = useState(false)

  const locate = () => {
    setFailed(false)
    if (!navigator.geolocation) {
      setFailed(true)
      return
    }
    navigator.geolocation.getCurrentPosition(
      pos => onLocate({ latitude: pos.coords.latitude, longitude: pos.coords.longitude }),
      () => setFailed(true),
    )
  }

  return (
    <div className="absolute bottom-3 right-3 flex flex-col items-end gap-1">
      {failed && (
        <span className="rounded bg-paper/95 px-2 py-1 text-[11px] text-accent shadow">
          Location unavailable
        </span>
      )}
      <button
        onClick={locate}
        aria-label="Locate me"
        className="h-10 w-10 flex items-center justify-center rounded-full border border-ink/20 bg-paper/95 text-ink-2 shadow active:text-ink"
      >
        <LocateIcon />
      </button>
    </div>
  )
}
