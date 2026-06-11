import { apiClient } from '../../../lib/api-client'
import { UserSchema } from '../../../types/api'

export const getCurrentUser = async () => {
  const raw = await apiClient.get('/users/me')
  return UserSchema.parse(raw)
}
