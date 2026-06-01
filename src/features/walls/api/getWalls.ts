import { z } from 'zod'
import { apiClient } from '../../../lib/api-client'
import { WallSchema, apiDataResponse } from '../../../types/api'

export const getWalls = async () => {
  const raw = await apiClient.get('/walls')
  return apiDataResponse(z.array(WallSchema)).parse(raw).data
}
