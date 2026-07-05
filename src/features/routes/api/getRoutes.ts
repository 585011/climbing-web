import { z } from 'zod'
import { apiClient } from '../../../lib/api-client'
import { ClimbingRouteSchema, apiDataResponse } from '../../../types/api'

export const getRoutes = async () => {
  // size=100: backend defaults to 20 per page; request the max until real
  // pagination lands (climbing-api#60).
  const raw = await apiClient.get('/routes?size=100')
  return apiDataResponse(z.array(ClimbingRouteSchema)).parse(raw).data
}
