import { Suspense, lazy, useState } from 'react'
import { createFileRoute } from '@tanstack/react-router'
import { useAreas } from '../../features/areas/hooks/useAreas'
import { areasWithCoords } from '../../features/map/utils/areasWithCoords'
import { AreaList } from '../../features/map/components/AreaList'

// Lazy so maplibre-gl (+ its CSS) split into their own chunk and never touch
// the main bundle — the map tab is opt-in for cellular users at the crag.
const MapView = lazy(() => import('../../features/map/components/MapView'))

export const Route = createFileRoute('/map')({
  component: MapPage,
})

const MapSkeleton = () => (
  <div className="mx-4 mt-4 h-[60vh] rounded-xl bg-paper-2 animate-pulse" />
)

type AreaTypeFilter = '' | 'crag' | 'gym'
const AREA_TYPE_CHIPS: { value: AreaTypeFilter; label: string }[] = [
  { value: '', label: 'All' },
  { value: 'crag', label: 'Crags' },
  { value: 'gym', label: 'Gyms' },
]

function MapPage() {
  const { data, isLoading, isError, refetch } = useAreas()
  const [selectedId, setSelectedId] = useState<number | null>(null)
  const [areaType, setAreaType] = useState<AreaTypeFilter>('')

  if (isError)
    return (
      <button
        onClick={() => refetch()}
        className="w-full text-sm text-ink-2 text-center py-16 active:text-ink"
      >
        Couldn't load the map — tap to retry
      </button>
    )
  if (isLoading || !data) return <MapSkeleton />

  const areas = areasWithCoords(data).filter(a => !areaType || a.type === areaType)
  const changeType = (value: AreaTypeFilter) => {
    setAreaType(value)
    setSelectedId(null)
  }

  return (
    <div className="pb-2">
      <div className="flex gap-2 px-4 pt-4">
        {AREA_TYPE_CHIPS.map(c => (
          <button
            key={c.value}
            onClick={() => changeType(c.value)}
            className={`shrink-0 text-[12px] rounded-full border px-3 py-1 ${
              areaType === c.value ? 'bg-ink text-paper border-ink' : 'border-ink/25 text-ink-2 bg-paper'
            }`}
          >
            {c.label}
          </button>
        ))}
      </div>
      <div className="px-4 pt-3">
        <Suspense fallback={<div className="h-[60vh] rounded-xl bg-paper-2 animate-pulse" />}>
          {/* MapView builds its markers once on mount, so remount it when the filter changes. */}
          <MapView key={areaType} areas={areas} selectedId={selectedId} onSelect={setSelectedId} />
        </Suspense>
      </div>
      <AreaList areas={areas} onSelect={setSelectedId} />
    </div>
  )
}
