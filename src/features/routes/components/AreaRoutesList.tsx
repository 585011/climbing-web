import type { Wall } from '../../../types/api'
import { useRoutesByWall } from '../hooks/useRoutesByWall'
import { useTicksByUser } from '../../ticks/hooks/useTicksByUser'
import { useCreateTick } from '../../ticks/hooks/useCreateTick'
import { useDeleteTick } from '../../ticks/hooks/useDeleteTick'
import { RouteRow } from './RouteRow'

// TODO: replace with real user ID from auth session once auth is implemented
const USER_ID = 1

interface WallSectionProps {
  wall: Wall
  showHeader: boolean
}

function WallSection({ wall, showHeader }: WallSectionProps) {
  const { data: routes, isLoading } = useRoutesByWall(wall.id)
  const { data: ticksMap = new Map() } = useTicksByUser(USER_ID)
  const { mutate: createTick } = useCreateTick()
  const { mutate: deleteTick } = useDeleteTick()

  const handleTick = (routeId: number) => {
    const tick = ticksMap.get(routeId)
    if (tick) {
      deleteTick({ userId: USER_ID, tickId: tick.id })
    } else {
      createTick({ userId: USER_ID, routeId })
    }
  }

  if (isLoading) return (
    <div className="divide-y divide-ink/10 px-4">
      {Array.from({ length: 3 }).map((_, i) => (
        <div key={i} className="flex items-center gap-3 py-3">
          <div className="w-5 h-4 bg-paper-2 animate-pulse rounded" />
          <div className="w-10 h-7 bg-paper-2 animate-pulse rounded-lg" />
          <div className="flex-1 flex flex-col gap-1.5">
            <div className="h-4 w-2/3 bg-paper-2 animate-pulse rounded" />
            <div className="h-3 w-1/3 bg-paper-2 animate-pulse rounded" />
          </div>
          <div className="w-9 h-9 bg-paper-2 animate-pulse rounded-full" />
        </div>
      ))}
    </div>
  )

  if (!routes?.length) return null

  return (
    <>
      {showHeader && (
        <p className="px-4 pt-4 pb-1 text-[12px] font-semibold text-ink-2 uppercase tracking-wide">
          {wall.name}
        </p>
      )}
      <div className="divide-y divide-ink/10 px-4">
        {routes.map((route, i) => (
          <RouteRow
            key={route.id}
            route={route}
            index={i + 1}
            ticked={ticksMap.has(route.id)}
            onTick={handleTick}
            areaId={String(wall.areaId)}
          />
        ))}
      </div>
    </>
  )
}

interface AreaRoutesListProps {
  walls: Wall[]
}

export function AreaRoutesList({ walls }: AreaRoutesListProps) {
  return (
    <div className="flex flex-col">
      {walls.map(wall => (
        <WallSection key={wall.id} wall={wall} showHeader={walls.length > 1} />
      ))}
    </div>
  )
}
