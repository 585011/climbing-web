import { useCallback } from 'react'
import { useQuery } from '@tanstack/react-query'
import type { UserRouteTick } from '../../../types/api'
import { getTicksByUser } from '../api/getTicksByUser'
import { usePendingTickRemovals } from '../utils/pendingTickRemovals'

/**
 * Callers pass `currentUser?.id ?? 0` — the query waits until a real id (> 0) is known.
 * Ticks inside their undo window (see `useRemoveTickWithUndo`) are left out.
 */
export const useTicksByUser = (userId: number) => {
  const pending = usePendingTickRemovals()
  const select = useCallback(
    (ticks: UserRouteTick[]): Map<number, UserRouteTick> =>
      new Map(ticks.filter(t => !pending.has(t.id)).map(t => [t.routeId, t])),
    [pending],
  )
  return useQuery({
    queryKey: ['users', userId, 'ticks'],
    queryFn: () => getTicksByUser(userId),
    select,
    enabled: userId > 0,
  })
}
