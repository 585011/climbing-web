import { Link } from '@tanstack/react-router'
import type { Wall } from '../../../types/api'

interface WallCardProps {
  wall: Wall
  areaId: string
}

export function WallCard({ wall, areaId }: WallCardProps) {
  return (
    <Link
      to="/areas/$areaId/walls/$wallId"
      params={{ areaId, wallId: String(wall.id) }}
      className="flex items-center gap-3 rounded-xl border border-ink/20 bg-paper p-3 active:bg-paper-2"
    >
      <div className="h-12 w-12 shrink-0 rounded-lg bg-paper-2 border border-ink/10 flex items-center justify-center text-ink-3 text-[10px]">
        photo
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-[15px] font-semibold text-ink leading-tight">{wall.name}</p>
        {wall.description && (
          <p className="text-[12px] text-ink-3 leading-tight truncate mt-0.5">{wall.description}</p>
        )}
      </div>
      <span className="text-ink-3 text-lg shrink-0">›</span>
    </Link>
  )
}
