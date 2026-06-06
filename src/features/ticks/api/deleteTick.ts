import { apiClient } from '../../../lib/api-client'

export const deleteTick = async (userId: number, tickId: number) => {
  await apiClient.delete(`/users/${userId}/ticks/${tickId}`)
}
