import { apiClient } from '../../../lib/api-client'
import type { Wall } from '../../../types/api'

export const getWall = (wallId: number) => apiClient.get<Wall>(`/walls/${wallId}`)