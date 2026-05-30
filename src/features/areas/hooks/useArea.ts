import { useQuery } from '@tanstack/react-query'
import { getArea } from '../api/getArea'

export const useArea = (areaId: number) =>
  useQuery({ queryKey: ['areas', areaId], queryFn: () => getArea(areaId) })
