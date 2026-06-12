import { apiClient } from '../../../lib/api-client'
import { TickInputSchema, UserRouteTickSchema } from '../../../types/api'
import type { TickInput } from '../../../types/api'

export const createTick = async (
  userId: number,
  routeId: number,
  data?: TickInput
) => {
  const input = TickInputSchema.parse(data ?? {})
  const raw = await apiClient.post(`/users/${userId}/ticks`, { routeId, ...input })
  return UserRouteTickSchema.parse(raw)
}
