import { apiClient } from '../../../lib/api-client'
import { WallSchema } from '../../../types/api'

export const getWall = async (wallId: number) => {
  const raw = await apiClient.get(`/walls/${wallId}`)
  return WallSchema.parse(raw)
}
