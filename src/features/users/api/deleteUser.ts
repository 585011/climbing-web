import { apiClient } from '../../../lib/api-client'

export const deleteUser = async (userId: number) => {
  await apiClient.delete(`/users/${userId}`)
}
