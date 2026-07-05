import { z } from 'zod'
import { apiClient } from '../../../lib/api-client'
import { ClimbingAreaSchema, apiDataResponse } from '../../../types/api'

export const getAreas = async () => {
  // size=100: backend defaults to 20 per page; request the max until real
  // pagination lands (climbing-api#60).
  const raw = await apiClient.get('/climbing-areas?size=100')
  return apiDataResponse(z.array(ClimbingAreaSchema)).parse(raw).data
}
