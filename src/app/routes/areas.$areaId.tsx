import { createFileRoute, Link, Outlet } from '@tanstack/react-router'
import { useWallsByArea } from '../../features/walls/hooks/useWallsByArea'

export const Route = createFileRoute('/areas/$areaId')({
  component: AreaPage,
})

function AreaPage() {
  const { areaId } = Route.useParams()
  const { data: walls, isLoading, isError } = useWallsByArea(Number(areaId))

  if (isLoading) return <p>Loading...</p>
  if (isError) return <p>Something went wrong</p>

  return (
    <div>
      <ul>
        {walls?.map(wall => (
          <li key={wall.id}>
            <Link to="/areas/$areaId/walls/$wallId" params={{ areaId, wallId: String(wall.id) }}>
              {wall.name}
            </Link>
          </li>
        ))}
      </ul>
      <Outlet />
    </div>
  )
}