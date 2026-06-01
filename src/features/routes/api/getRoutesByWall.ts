import { z } from 'zod'
import { apiClient } from '../../../lib/api-client'
import { ClimbingRouteSchema } from '../../../types/api'

export const getRoutesByWall = async (wallId: number) => {
  const raw = await apiClient.get(`/walls/${wallId}/routes`)
  return z.array(ClimbingRouteSchema).parse(raw)
}
