import { useMutation, useQueryClient } from '@tanstack/react-query'
import { createGymTick } from '../api/createGymTick'
import type { NewGymRouteInput } from '../../../types/api'

export const useCreateGymTick = () => {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({
      userId,
      newRoute,
      style,
      rating,
      personalNote,
    }: {
      userId: number
      newRoute: NewGymRouteInput
      style?: string
      rating?: number
      personalNote?: string
    }) => createGymTick(userId, newRoute, { style, rating, personalNote }),
    onSuccess: (_data, { userId, newRoute }) => {
      queryClient.invalidateQueries({ queryKey: ['users', userId, 'ticks'] })
      queryClient.invalidateQueries({ queryKey: ['walls', newRoute.wallId, 'routes'] })
      queryClient.invalidateQueries({ queryKey: ['routes'] })
      queryClient.invalidateQueries({ queryKey: ['areas'] }) // routeCount
    },
  })
}
