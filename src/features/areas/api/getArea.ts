import { apiClient } from '../../../lib/api-client'
import type { ClimbingArea } from '../../../types/api'

export const getArea = (areaId: number) =>
  apiClient.get<ClimbingArea>(`/climbing-areas/${areaId}`)
