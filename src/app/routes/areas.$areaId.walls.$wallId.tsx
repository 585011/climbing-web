import { createFileRoute } from '@tanstack/react-router'
import { useWall } from '../../features/walls/hooks/useWall'
import { useRoutesByWall } from '../../features/routes/hooks/useRoutesByWall'

export const Route = createFileRoute('/areas/$areaId/walls/$wallId')({
  component: WallPage,
})

function WallPage() {
  const { wallId } = Route.useParams()
  console.log('wallId:', wallId)
  const { data: wall, isLoading: wallLoading } = useWall(Number(wallId))
  const { data: routes, isLoading: routesLoading } = useRoutesByWall(Number(wallId))
  console.log('wall:', wall)
  console.log('routes:', routes)
  
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