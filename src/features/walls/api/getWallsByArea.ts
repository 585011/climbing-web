import { apiClient } from '../../../lib/api-client'
import type { Wall } from '../../../types/api'

export const getWallsByArea = (areaId: number) =>
  apiClient.get<Wall[]>(`/climbing-areas/${areaId}/walls`)