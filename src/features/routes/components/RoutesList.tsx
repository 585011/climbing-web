import type { ClimbingRoute } from '../../../types/api'
import { useTicksByUser } from '../../ticks/hooks/useTicksByUser'
import { useDeleteTick } from '../../ticks/hooks/useDeleteTick'
import { useCurrentUser } from '../../users/hooks/useCurrentUser'
import { RouteRow } from './RouteRow'

interface RoutesListProps {
  routes: ClimbingRoute[]
  areaId: string
}

export function RoutesList({ routes, areaId }: RoutesListProps) {
  const { data: currentUser } = useCurrentUser()
  const userId = currentUser?.id ?? 0
  const { data: ticksMap = new Map() } = useTicksByUser(userId)
  const { mutate: deleteTick } = useDeleteTick()

  const handleUntick = (routeId: number) => {
    const tick = ticksMap.get(routeId)
    if (tick) deleteTick({ userId, tickId: tick.id })
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
          onUntick={handleUntick}
          areaId={areaId}
        />
      ))}
    </div>
  )
}
