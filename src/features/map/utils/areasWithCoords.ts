import type { ClimbingArea } from '../../../types/api'

/**
 * Keep only areas that can be placed on the map: finite coordinates that
 * aren't the exact 0,0 "null island" (how unset coordinates surface in the
 * data — plotting them would drop a marker in the Atlantic off West Africa).
 */
export const areasWithCoords = (areas: ClimbingArea[]): ClimbingArea[] =>
  areas.filter(
    a =>
      Number.isFinite(a.latitude) &&
      Number.isFinite(a.longitude) &&
      !(a.latitude === 0 && a.longitude === 0),
  )
