import { z } from 'zod'
import { apiClient } from '../../../lib/api-client'
import { ClimbingRouteSchema, apiDataResponse } from '../../../types/api'

export const getRoutes = async (options?: { includeRetired?: boolean }) => {
  // size=100: backend defaults to 20 per page; request the max until real
  // pagination lands (climbing-api#60).
  const retired = options?.includeRetired ? '&includeRetired=true' : ''
  const raw = await apiClient.get(`/routes?size=100${retired}`)
  return apiDataResponse(z.array(ClimbingRouteSchema)).parse(raw).data
}
