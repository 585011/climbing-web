import { useState } from 'react'
import type { Wall } from '../../../types/api'
import { useRoutesByWall } from '../hooks/useRoutesByWall'
import { RouteRow } from './RouteRow'

interface WallSectionProps {
  wall: Wall
  showHeader: boolean
  ticked: Set<number>
  onTick: (id: number) => void
}

function WallSection({ wall, showHeader, ticked, onTick }: WallSectionProps) {
  const { data: routes, isLoading } = useRoutesByWall(wall.id)

  if (isLoading) return (
    <div className="divide-y divide-ink/10 px-4">
      {Array.from({ length: 3 }).map((_, i) => (
        <div key={i} className="flex items-center gap-3 py-3">
          <div className="w-5 h-4 bg-paper-2 animate-pulse rounded" />
          <div className="w-10 h-7 bg-paper-2 animate-pulse rounded-lg" />
          <div className="flex-1 flex flex-col gap-1.5">
            <div className="h-4 w-2/3 bg-paper-2 animate-pulse rounded" />
            <div className="h-3 w-1/3 bg-paper-2 animate-pulse rounded" />
          </div>
          <div className="w-9 h-9 bg-paper-2 animate-pulse rounded-full" />
        </div>
      ))}
    </div>
  )

  if (!routes?.length) return null

  return (
    <>
      {showHeader && (
        <p className="px-4 pt-4 pb-1 text-[12px] font-semibold text-ink-2 uppercase tracking-wide">
          {wall.name}
        </p>
      )}
      <div className="divide-y divide-ink/10 px-4">
        {routes.map((route, i) => (
          <RouteRow
            key={route.id}
            route={route}
            index={i + 1}
            ticked={ticked.has(route.id)}
            onTick={onTick}
          />
        ))}
      </div>
    </>
  )
}

interface AreaRoutesListProps {
  walls: Wall[]
}

export function AreaRoutesList({ walls }: AreaRoutesListProps) {
  const [ticked, setTicked] = useState<Set<number>>(new Set())

  const handleTick = (id: number) => {
    setTicked(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  return (
    <div className="flex flex-col">
      {walls.map(wall => (
        <WallSection
          key={wall.id}
          wall={wall}
          showHeader={walls.length > 1}
          ticked={ticked}
          onTick={handleTick}
        />
      ))}
    </div>
  )
}
