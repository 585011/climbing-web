import { apiClient } from '../../../lib/api-client'
import { ClimbingAreaSchema } from '../../../types/api'

export const getArea = async (areaId: number) => {
  const raw = await apiClient.get(`/climbing-areas/${areaId}`)
  return ClimbingAreaSchema.parse(raw)
}
