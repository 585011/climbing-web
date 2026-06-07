import { useQuery } from '@tanstack/react-query'
import { getRoute } from '../api/getRoute'

export const useRoute = (routeId: number) =>
  useQuery({ queryKey: ['routes', routeId], queryFn: () => getRoute(routeId) })
