import { apiClient } from '../../../lib/api-client'
import { UserRouteTickSchema } from '../../../types/api'

export const createTick = async (userId: number, routeId: number) => {
  const raw = await apiClient.post(`/users/${userId}/ticks`, { routeId })
  return UserRouteTickSchema.parse(raw)
}
