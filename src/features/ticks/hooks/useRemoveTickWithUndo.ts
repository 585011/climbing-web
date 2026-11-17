import { useQueryClient } from '@tanstack/react-query'
import type { UserRouteTick } from '../../../types/api'
import { deleteTick } from '../api/deleteTick'
import { showToast } from '../../../stores/toast'
import { clearTickPendingRemoval, markTickPendingRemoval } from '../utils/pendingTickRemovals'

/**
 * Removes a tick behind an "Undo" toast. The tick is hidden everywhere at once
 * (marked pending, filtered by `useTicksByUser`), but the DELETE is only sent
 * when the toast closes without Undo — so an undone tick keeps its id and
 * original `tickedAt`. Deliberately not a component-scoped mutation: the toast
 * outlives the list that triggered it.
 */
export const useRemoveTickWithUndo = () => {
  const queryClient = useQueryClient()

  return (userId: number, tick: UserRouteTick) => {
    markTickPendingRemoval(tick.id)

    showToast({
      message: 'Tick removed',
      actionLabel: 'Undo',
      onAction: () => clearTickPendingRemoval(tick.id),
      onDismiss: async () => {
        try {
          await deleteTick(userId, tick.id)
          // Refetch before un-hiding, so the deleted tick can't flash back.
          await queryClient.invalidateQueries({ queryKey: ['users', userId, 'ticks'] })
        } catch {
          showToast({ message: "Couldn't remove tick — try again" })
        } finally {
          clearTickPendingRemoval(tick.id)
        }
      },
    })
  }
}
