import type { ClimbingArea, ClimbingRoute, UserRouteTick, Wall } from '../../../types/api'

export interface EnrichedTick {
  tick: UserRouteTick
  route?: ClimbingRoute
  wall?: Wall
  area?: ClimbingArea
}

/**
 * Client-side join of a user's ticks with the route/wall/area collections.
 * Future-proofing seam: when the backend grows an enriched ticks endpoint,
 * this function retires and EnrichedTick[] stays the component contract.
 */
export const enrichTicks = (
  ticks: UserRouteTick[],
  routes: ClimbingRoute[],
  walls: Wall[],
  areas: ClimbingArea[],
): EnrichedTick[] => {
  const routeById = new Map(routes.map(r => [r.id, r]))
  const wallById = new Map(walls.map(w => [w.id, w]))
  const areaById = new Map(areas.map(a => [a.id, a]))

  return ticks
    .map(tick => {
      const route = routeById.get(tick.routeId)
      const wall = route ? wallById.get(route.wallId) : undefined
      const area = wall ? areaById.get(wall.areaId) : undefined
      return { tick, route, wall, area }
    })
    .sort((a, b) => b.tick.tickedAt.localeCompare(a.tick.tickedAt))
}
