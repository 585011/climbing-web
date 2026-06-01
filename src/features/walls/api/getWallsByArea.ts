import { z } from 'zod'
import { apiClient } from '../../../lib/api-client'
import { WallSchema } from '../../../types/api'

export const getWallsByArea = async (areaId: number) => {
  const raw = await apiClient.get(`/climbing-areas/${areaId}/walls`)
  return z.array(WallSchema).parse(raw)
}
