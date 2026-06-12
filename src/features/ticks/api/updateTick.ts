import { apiClient } from '../../../lib/api-client'
import { TickInputSchema, UserRouteTickSchema } from '../../../types/api'
import type { TickInput } from '../../../types/api'

export const updateTick = async (
  userId: number,
  tickId: number,
  data: TickInput
) => {
  const input = TickInputSchema.parse(data)
  const raw = await apiClient.put(`/users/${userId}/ticks/${tickId}`, input)
  return UserRouteTickSchema.parse(raw)
}
