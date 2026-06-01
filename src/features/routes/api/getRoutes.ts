import { z } from 'zod'
import { apiClient } from '../../../lib/api-client'
import { ClimbingRouteSchema, apiDataResponse } from '../../../types/api'

export const getRoutes = async () => {
  const raw = await apiClient.get('/routes')
  return apiDataResponse(z.array(ClimbingRouteSchema)).parse(raw).data
}
