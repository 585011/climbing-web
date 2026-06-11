import { useQuery } from '@tanstack/react-query'
import type { UserRouteTick } from '../../../types/api'
import { getTicksByUser } from '../api/getTicksByUser'

export const useTicksByUser = (userId: number, options?: { enabled?: boolean }) =>
  useQuery({
    queryKey: ['users', userId, 'ticks'],
    queryFn: () => getTicksByUser(userId),
    select: (ticks): Map<number, UserRouteTick> => new Map(ticks.map(t => [t.routeId, t])),
    enabled: options?.enabled ?? true,
  })
