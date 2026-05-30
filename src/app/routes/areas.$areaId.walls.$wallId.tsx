import { createFileRoute } from '@tanstack/react-router'
import { useWall } from '../../features/walls/hooks/useWall'
import { useRoutesByWall } from '../../features/routes/hooks/useRoutesByWall'

export const Route = createFileRoute('/areas/$areaId/walls/$wallId')({
  component: WallPage,
})

function WallPage() {
  const { wallId } = Route.useParams()
  const wallIdNum = Number(wallId)

  if (Number.isNaN(wallIdNum)) return <p className="p-4 text-ink-2">Invalid URL</p>

  const { data: wall, isLoading: wallLoading } = useWall(wallIdNum)
  const { data: routes, isLoading: routesLoading } = useRoutesByWall(wallIdNum)

  if (wallLoading || routesLoading) return <p>Loading...</p>

  return (
    <div>
      <h1>{wall?.name}</h1>
      <p>{wall?.description}</p>
      <ul>
        {routes?.map(route => (
          <li key={route.id}>
            {route.name} — {route.grade}
          </li>
        ))}
      </ul>
    </div>
  )
}
