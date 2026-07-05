import { z } from 'zod'
import { apiClient } from '../../../lib/api-client'
import { WallSchema, apiDataResponse } from '../../../types/api'

export const getWalls = async () => {
  // size=100: backend defaults to 20 per page; request the max until real
  // pagination lands (climbing-api#60).
  const raw = await apiClient.get('/walls?size=100')
  return apiDataResponse(z.array(WallSchema)).parse(raw).data
}
