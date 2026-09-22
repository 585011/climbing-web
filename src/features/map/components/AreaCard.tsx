import { Link } from '@tanstack/react-router'
import type { ClimbingArea } from '../../../types/api'
import { GymBadge } from '../../../components/ui/GymBadge'

export const AreaCard = ({ area, onClose }: { area: ClimbingArea; onClose: () => void }) => (
  <div className="absolute inset-x-3 bottom-3 rounded-xl border border-ink/20 bg-paper/95 backdrop-blur shadow-lg p-3">
    <div className="flex items-start justify-between gap-2">
      <div className="min-w-0">
        <p className="text-[11px] uppercase tracking-wide text-ink-3">Selected</p>
        <h2 className="flex items-center gap-2 text-lg font-bold text-ink min-w-0">
          <span className="truncate">{area.name}</span>
          {area.type === 'gym' && <GymBadge />}
        </h2>
        {area.routeCount !== undefined && (
          <p className="text-sm text-ink-2">
            {area.routeCount} {area.routeCount === 1 ? 'route' : 'routes'}
          </p>
        )}
      </div>
      <button
        onClick={onClose}
        aria-label="Close"
        className="shrink-0 p-1 text-ink-3 active:text-ink text-sm leading-none"
      >
        ✕
      </button>
    </div>
    <Link
      to="/areas/$areaId"
      params={{ areaId: String(area.id) }}
      className="mt-2 inline-block text-sm font-semibold text-accent"
    >
      {area.type === 'gym' ? 'Go to gym →' : 'Go to crag →'}
    </Link>
  </div>
)
