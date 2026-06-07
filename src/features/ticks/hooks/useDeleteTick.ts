import { useMutation, useQueryClient } from '@tanstack/react-query'
import { deleteTick } from '../api/deleteTick'

export const useDeleteTick = () => {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ userId, tickId }: { userId: number; tickId: number }) =>
      deleteTick(userId, tickId),
    onSuccess: (_data, { userId }) => {
      queryClient.invalidateQueries({ queryKey: ['users', userId, 'ticks'] })
    },
  })
}
