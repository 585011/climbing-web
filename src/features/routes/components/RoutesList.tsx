import type { ClimbingRoute } from '../../../types/api'
import { useTicksByUser } from '../../ticks/hooks/useTicksByUser'
import { useCreateTick } from '../../ticks/hooks/useCreateTick'
import { useDeleteTick } from '../../ticks/hooks/useDeleteTick'
import { RouteRow } from './RouteRow'

// TODO: replace with real user ID from auth session once auth is implemented
const USER_ID = 1

interface RoutesListProps {
  routes: ClimbingRoute[]
  areaId: string
}

export function RoutesList({ routes, areaId }: RoutesListProps) {
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

  if (routes.length === 0) {
    return <p className="text-center text-ink-3 text-sm py-12">No routes yet</p>
  }

  return (
    <div className="divide-y divide-ink/10 px-4">
      {routes.map((route, i) => (
        <RouteRow
          key={route.id}
          route={route}
          index={i + 1}
          ticked={ticksMap.has(route.id)}
          onTick={handleTick}
          areaId={areaId}
        />
      ))}
    </div>
  )
}
