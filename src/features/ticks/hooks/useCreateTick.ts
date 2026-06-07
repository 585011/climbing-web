import { useMutation, useQueryClient } from '@tanstack/react-query'
import { createTick } from '../api/createTick'

export const useCreateTick = () => {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ userId, routeId }: { userId: number; routeId: number }) =>
      createTick(userId, routeId),
    onSuccess: (_data, { userId }) => {
      queryClient.invalidateQueries({ queryKey: ['users', userId, 'ticks'] })
    },
  })
}
