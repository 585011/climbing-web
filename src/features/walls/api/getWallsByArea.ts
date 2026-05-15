import { apiClient } from '../../../lib/api-client'
import type { Walls } from '../../../types/api'

export const getWallsByArea = (areaId: number) =>
  apiClient.get<Walls[]>(`/climbing-areas/${areaId}/walls`)