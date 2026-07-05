import { apiClient } from '../../../lib/api-client'
import { UpdateUserInputSchema, UserSchema } from '../../../types/api'
import type { UpdateUserInput } from '../../../types/api'

export const updateUser = async (userId: number, data: UpdateUserInput) => {
  const input = UpdateUserInputSchema.parse(data)
  const raw = await apiClient.put(`/users/${userId}`, input)
  return UserSchema.parse(raw)
}
