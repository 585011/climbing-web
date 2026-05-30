import type { ClimbingRoute } from '../../../types/api'

interface RouteRowProps {
  route: ClimbingRoute
  index: number
  ticked: boolean
  onTick: (id: number) => void
}

export function RouteRow({ route, index, ticked, onTick }: RouteRowProps) {
  return (
    <div className="flex items-center gap-3 py-3">
      <span className="w-5 shrink-0 text-right text-[12px] text-ink-3">{index}</span>

      <div className="rounded-lg bg-paper-2 border border-ink/15 px-2 py-1 shrink-0 min-w-[38px] text-center">
        <span className="text-[12px] font-bold text-ink">{route.grade}</span>
      </div>

      <div className="flex-1 min-w-0">
        <p className="text-[14px] font-semibold text-ink leading-tight truncate">{route.name}</p>
        <p className="text-[11px] text-ink-3 mt-0.5">
          ★★★☆☆
          {route.length > 0 && <> · {route.length}m</>}
          {route.style && <> · {route.style}</>}
        </p>
      </div>

      <button
        onClick={() => onTick(route.id)}
        aria-label={ticked ? 'Remove tick' : 'Tick route'}
        className={`shrink-0 w-9 h-9 flex items-center justify-center rounded-full border text-[14px] transition-colors ${
          ticked
            ? 'border-accent bg-accent/10 text-accent'
            : 'border-ink/20 text-ink-3'
        }`}
      >
        {ticked ? '✓' : '+'}
      </button>
    </div>
  )
}
