import { createFileRoute } from '@tanstack/react-router'
import { AreasList } from '../../features/areas/components/AreasList'
import { useWalls } from '../../features/walls/hooks/useWalls'
import { areaImageMap } from '../../features/areas/utils/areaImageMap'

function ExplorePage() {
  const { data: walls } = useWalls()
  const imageByAreaId = areaImageMap(walls ?? [])
  return <AreasList imageByAreaId={imageByAreaId} />
}

export const Route = createFileRoute('/')({
  component: ExplorePage,
})
