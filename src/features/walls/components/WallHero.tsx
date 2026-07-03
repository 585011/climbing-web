import type { Wall } from '../../../types/api'
import { WallPhoto } from './WallPhoto'

interface WallHeroProps {
  wall: Wall | undefined
  loading: boolean
  onBack: () => void
}

export function WallHero({ wall, loading, onBack }: WallHeroProps) {
  if (loading) return <div className="h-52 bg-paper-2 animate-pulse" />
  if (!wall) return null

  return (
    <WallPhoto wall={wall}>
      <button
        onClick={onBack}
        className="absolute top-4 left-4 bg-paper/80 backdrop-blur-sm rounded-full px-3 py-1.5 text-[12px] text-ink flex items-center gap-1"
      >
        ‹ back
      </button>
    </WallPhoto>
  )
}
