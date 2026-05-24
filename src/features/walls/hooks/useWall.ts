import { useQuery } from '@tanstack/react-query'
import { getWall } from '../api/getWall'

export const useWall = (wallId: number) =>
  useQuery({ queryKey: ['wall', wallId], queryFn: () => getWall(wallId) })