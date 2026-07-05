import { Link } from '@tanstack/react-router'
import type { EnrichedTick } from '../utils/enrichTicks'

const STYLE_INITIALS: Record<string, string> = {
  onsight: 'OS',
  flash: 'FL',
  redpoint: 'RP',
  'free solo': 'FS',
}

/** '2026-05-12T10:00:00Z' -> '12 May'; empty string for invalid dates. */
const shortDate = (iso: string): string => {
  const d = new Date(iso)
  return Number.isNaN(d.getTime())
    ? ''
    : d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })
}

const RowBody = ({ item, showStars }: { item: EnrichedTick; showStars?: boolean }) => {
  const { tick, route, wall, area } = item
  const initials = STYLE_INITIALS[tick.style]
  const location = wall?.name || area?.name || ''
  return (
    <>
      <span className="shrink-0 min-w-12 h-10 px-2 flex items-center justify-center rounded-lg border border-ink/20 bg-paper text-[14px] font-bold text-ink">
        {route?.grade || '?'}
      </span>
      <span className="flex-1 min-w-0">
        <span className="flex items-center gap-2">
          <span className="text-[14px] font-semibold text-ink truncate">
            {route?.name ?? 'Unknown route'}
          </span>
          {initials && (
            <span className="shrink-0 text-[9px] font-bold text-accent border border-accent rounded-full px-1.5 py-0.5">
              {initials}
            </span>
          )}
        </span>
        {location && <span className="block text-[12px] text-ink-3 truncate">{location}</span>}
      </span>
      <span className="shrink-0 flex flex-col items-end gap-1">
        {showStars && tick.rating > 0 && (
          <span className="text-[11px] leading-none text-accent">
            {'★'.repeat(tick.rating)}
            <span className="text-ink/20">{'★'.repeat(5 - tick.rating)}</span>
          </span>
        )}
        <span className="text-[11px] text-ink-3">{shortDate(tick.tickedAt)}</span>
      </span>
    </>
  )
}

export const TickRow = ({ item, showStars }: { item: EnrichedTick; showStars?: boolean }) => {
  const { route, wall } = item
  const rowClass = 'flex items-center gap-3 py-2.5 border-b border-dashed border-ink/15'
  if (route && wall) {
    return (
      <Link
        to="/areas/$areaId/walls/$wallId/routes/$routeId"
        params={{
          areaId: String(wall.areaId),
          wallId: String(wall.id),
          routeId: String(route.id),
        }}
        data-testid="tick-row"
        className={`${rowClass} active:bg-paper-2`}
      >
        <RowBody item={item} showStars={showStars} />
      </Link>
    )
  }
  return (
    <div data-testid="tick-row" className={rowClass}>
      <RowBody item={item} showStars={showStars} />
    </div>
  )
}
