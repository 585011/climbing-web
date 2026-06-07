import { apiClient } from '../../../lib/api-client'
import { ClimbingRouteSchema } from '../../../types/api'

export const getRoute = async (routeId: number) => {
  const raw = await apiClient.get(`/routes/${routeId}`)
  return ClimbingRouteSchema.parse(raw)
}
