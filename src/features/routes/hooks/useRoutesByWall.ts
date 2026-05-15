import { useQuery } from '@tanstack/react-query'
import { getRoutesByWall } from '../api/getRoutesByWall'

export const useRoutesByWall = (wallId: number) =>
  useQuery({ queryKey: ['routes', wallId], queryFn: () => getRoutesByWall(wallId) })