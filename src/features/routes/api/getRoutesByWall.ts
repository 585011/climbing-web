import { apiClient } from '../../../lib/api-client'
import type { Route } from '../../../types/api'

export const getRoutesByWall = (wallId: number) =>
  apiClient.get<Route[]>(`/walls/${wallId}/routes`)