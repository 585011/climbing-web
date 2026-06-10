import { useMutation, useQueryClient } from '@tanstack/react-query'
import { updateTick } from '../api/updateTick'

export const useUpdateTick = () => {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({
      userId,
      tickId,
      style,
      rating,
      personalNote,
    }: {
      userId: number
      tickId: number
      style?: string
      rating?: number
      personalNote?: string
    }) => updateTick(userId, tickId, { style, rating, personalNote }),
    onSuccess: (_data, { userId }) => {
      queryClient.invalidateQueries({ queryKey: ['users', userId, 'ticks'] })
    },
  })
}
