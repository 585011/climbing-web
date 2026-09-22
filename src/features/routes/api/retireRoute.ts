import { apiClient } from '../../../lib/api-client'
import { ClimbingRouteSchema } from '../../../types/api'

export const retireRoute = async (routeId: number, retired: boolean) => {
  const raw = await apiClient.put(`/routes/${routeId}/retired`, { retired })
  return ClimbingRouteSchema.parse(raw)
}
