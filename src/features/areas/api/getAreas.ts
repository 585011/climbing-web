import { z } from 'zod'
import { apiClient } from '../../../lib/api-client'
import { ClimbingAreaSchema, apiDataResponse } from '../../../types/api'

export const getAreas = async () => {
  const raw = await apiClient.get('/climbing-areas')
  return apiDataResponse(z.array(ClimbingAreaSchema)).parse(raw).data
}
