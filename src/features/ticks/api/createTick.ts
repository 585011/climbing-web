import { apiClient } from '../../../lib/api-client'
import { UserRouteTickSchema } from '../../../types/api'

export const createTick = async (
  userId: number,
  routeId: number,
  data?: { style?: string; rating?: number; personalNote?: string }
) => {
  const raw = await apiClient.post(`/users/${userId}/ticks`, { routeId, ...data })
  return UserRouteTickSchema.parse(raw)
}
