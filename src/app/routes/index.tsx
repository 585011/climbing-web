import { createFileRoute } from '@tanstack/react-router'
import { AreasList } from '../../features/areas/components/AreasList'
import { useWalls } from '../../features/walls/hooks/useWalls'

function ExplorePage() {
  const { data: walls } = useWalls()

  // First wall with a photo represents its area on the crag cards.
  const imageByAreaId = new Map<number, string>()
  for (const wall of walls ?? []) {
    if (wall.imageUrl && !imageByAreaId.has(wall.areaId)) {
      imageByAreaId.set(wall.areaId, wall.imageUrl)
    }
  }

  return <AreasList imageByAreaId={imageByAreaId} />
}

export const Route = createFileRoute('/')({
  component: ExplorePage,
})
