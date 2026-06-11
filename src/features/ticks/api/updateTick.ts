import { apiClient } from '../../../lib/api-client'
import { UserRouteTickSchema } from '../../../types/api'

export const updateTick = async (
  userId: number,
  tickId: number,
  data: { style?: string; rating?: number; personalNote?: string }
) => {
  const raw = await apiClient.put(`/users/${userId}/ticks/${tickId}`, data)
  return UserRouteTickSchema.parse(raw)
}
