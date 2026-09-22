import { apiClient } from '../../../lib/api-client'
import { NewGymRouteInputSchema, TickInputSchema, UserRouteTickSchema } from '../../../types/api'
import type { NewGymRouteInput, TickInput } from '../../../types/api'

/** Creates a gym route and ticks it in one request (backend `newRoute`). */
export const createGymTick = async (
  userId: number,
  newRoute: NewGymRouteInput,
  data?: TickInput
) => {
  const route = NewGymRouteInputSchema.parse(newRoute)
  const input = TickInputSchema.parse(data ?? {})
  const raw = await apiClient.post(`/users/${userId}/ticks`, { newRoute: route, ...input })
  return UserRouteTickSchema.parse(raw)
}
