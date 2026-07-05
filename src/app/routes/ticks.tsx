import { createFileRoute } from '@tanstack/react-router'
import { useCurrentUser } from '../../features/users/hooks/useCurrentUser'
import { useTicksByUser } from '../../features/ticks/hooks/useTicksByUser'
import { useRoutes } from '../../features/routes/hooks/useRoutes'
import { useWalls } from '../../features/walls/hooks/useWalls'
import { useAreas } from '../../features/areas/hooks/useAreas'
import { enrichTicks } from '../../features/ticks/utils/enrichTicks'
import { TicksDashboard } from '../../features/ticks/components/TicksDashboard'

export const Route = createFileRoute('/ticks')({
  component: TicksPage,
})

// Cross-feature data is composed here, at the app level (see CLAUDE.md).
function TicksPage() {
  const userQ = useCurrentUser()
  const userId = userQ.data?.id ?? 0
  const ticksQ = useTicksByUser(userId, { enabled: userId > 0 })
  const routesQ = useRoutes()
  const wallsQ = useWalls()
  const areasQ = useAreas()

  const ticks = enrichTicks(
    [...(ticksQ.data?.values() ?? [])],
    routesQ.data ?? [],
    wallsQ.data ?? [],
    areasQ.data ?? [],
  )
  const isError = userQ.isError || ticksQ.isError || routesQ.isError || wallsQ.isError || areasQ.isError
  const isLoading =
    userQ.isLoading || ticksQ.isPending || routesQ.isLoading || wallsQ.isLoading || areasQ.isLoading
  const onRetry = () => {
    userQ.refetch()
    ticksQ.refetch()
    routesQ.refetch()
    wallsQ.refetch()
    areasQ.refetch()
  }

  return <TicksDashboard ticks={ticks} isLoading={isLoading} isError={isError} onRetry={onRetry} />
}
