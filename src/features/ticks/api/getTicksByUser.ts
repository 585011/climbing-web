import { z } from 'zod'
import { apiClient } from '../../../lib/api-client'
import { UserRouteTickSchema, apiDataResponse } from '../../../types/api'

export const getTicksByUser = async (userId: number) => {
  const raw = await apiClient.get(`/users/${userId}/ticks?size=1000`)
  return apiDataResponse(z.array(UserRouteTickSchema)).parse(raw).data
}
