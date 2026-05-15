import { useQuery } from '@tanstack/react-query'
import { getWallsByArea } from '../api/getWallsByArea'

export const useWallsByArea = (areaId: number) =>
  useQuery({ queryKey: ['walls', areaId], queryFn: () => getWallsByArea(areaId) })