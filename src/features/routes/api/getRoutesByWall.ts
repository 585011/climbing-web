import { apiClient } from '../../../lib/api-client'
import type { ClimbingRoute } from '../../../types/api'

export const getRoutesByWall = (wallId: number) =>
  apiClient.get<ClimbingRoute[]>(`/walls/${wallId}/routes`)