import { useMutation, useQueryClient } from '@tanstack/react-query'
import { retireRoute } from '../api/retireRoute'

export const useRetireRoute = () => {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ routeId, retired }: { routeId: number; wallId: number; retired: boolean }) =>
      retireRoute(routeId, retired),
    onSuccess: (_data, { wallId }) => {
      queryClient.invalidateQueries({ queryKey: ['routes'] })
      queryClient.invalidateQueries({ queryKey: ['walls', wallId, 'routes'] })
      queryClient.invalidateQueries({ queryKey: ['areas'] }) // routeCount excludes retired routes
    },
  })
}
