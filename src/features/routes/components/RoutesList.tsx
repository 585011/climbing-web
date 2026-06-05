import { useState } from 'react'
import type { ClimbingRoute } from '../../../types/api'
import { RouteRow } from './RouteRow'

interface RoutesListProps {
  routes: ClimbingRoute[]
}

export function RoutesList({ routes }: RoutesListProps) {
  const [ticked, setTicked] = useState<Set<number>>(new Set())

  const handleTick = (id: number) => {
    setTicked(prev => {
      const next = new Set(prev)
      if (next.has(id)) {
        next.delete(id)
      } else {
        next.add(id)
      }
      return next
    })
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
          ticked={ticked.has(route.id)}
          onTick={handleTick}
        />
      ))}
    </div>
  )
}
