import { Link } from '@tanstack/react-router'
import { useAreas } from '../hooks/useAreas'

export const AreasList = () => {
  const { data: areas, isLoading, isError } = useAreas()

  if (isLoading) return <p>Loading...</p>
  if (isError) return <p>Something went wrong</p>

  return (
    <ul>
      {areas?.map(area => (
        <li key={area.id}>
          <Link to="/areas/$areaId" params={{ areaId: String(area.id) }}>
            {area.name}
          </Link>
        </li>
      ))}
    </ul>
  )
}