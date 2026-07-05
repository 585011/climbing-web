import { useMutation, useQueryClient } from '@tanstack/react-query'
import { updateUser } from '../api/updateUser'

export const useUpdateUser = () => {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({
      userId,
      email,
      displayName,
    }: {
      userId: number
      email: string
      displayName: string
    }) => updateUser(userId, { email, displayName }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users', 'me'] })
    },
  })
}
