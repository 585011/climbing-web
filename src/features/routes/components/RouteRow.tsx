import { Link } from '@tanstack/react-router'
import type { ClimbingRoute } from '../../../types/api'

interface RouteRowProps {
  route: ClimbingRoute
  index: number
  ticked: boolean
  onUntick: (id: number) => void
  areaId: string
}

export function RouteRow({ route, index, ticked, onUntick, areaId }: RouteRowProps) {
  const wallId = String(route.wallId)
  const routeId = String(route.id)

  return (
    <div className="flex items-center gap-3 py-3">
      <Link
        to="/areas/$areaId/walls/$wallId/routes/$routeId"
        params={{ areaId, wallId, routeId }}
        className="flex-1 flex items-center gap-3 min-w-0"
      >
        <span className="w-5 shrink-0 text-right text-[12px] text-ink-3">{index}</span>

        <div className="rounded-lg bg-paper-2 border border-ink/15 px-2 py-1 shrink-0 min-w-[38px] text-center">
          <span className="text-[12px] font-bold text-ink">{route.grade}</span>
        </div>

        <div className="flex-1 min-w-0">
          <p className="text-[14px] font-semibold text-ink leading-tight truncate">{route.name}</p>
          <p className="text-[11px] text-ink-3 mt-0.5">
            {route.length > 0 && <> · {route.length}m</>}
            {route.style && <> · {route.style}</>}
            {route.bolts > 0 && <> · {route.bolts} bolts</>}
          </p>
        </div>
      </Link>

      {ticked ? (
        <button
          onClick={() => onUntick(route.id)}
          aria-label="Remove tick"
          className="shrink-0 w-9 h-9 flex items-center justify-center rounded-full border border-green-600 bg-green-600/10 text-green-600 text-[14px] transition-colors"
        >
          ✓
        </button>
      ) : (
        <Link
          to="/areas/$areaId/walls/$wallId/routes/$routeId/tick"
          params={{ areaId, wallId, routeId }}
          aria-label="Log tick"
          className="shrink-0 w-9 h-9 flex items-center justify-center rounded-full border border-ink/20 text-ink-3 text-[14px]"
        >
          +
        </Link>
      )}
    </div>
  )
}
