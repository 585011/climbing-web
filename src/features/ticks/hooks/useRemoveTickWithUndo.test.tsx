import { describe, it, expect, vi, beforeEach } from 'vitest'
import { act, renderHook, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import type { ReactNode } from 'react'
import type { UserRouteTick } from '../../../types/api'

const { deleteTick, getTicksByUser, showToast } = vi.hoisted(() => ({
  deleteTick: vi.fn(),
  getTicksByUser: vi.fn(),
  showToast: vi.fn(),
}))
vi.mock('../api/deleteTick', () => ({ deleteTick }))
vi.mock('../api/getTicksByUser', () => ({ getTicksByUser }))
vi.mock('../../../stores/toast', () => ({ showToast }))

import { useRemoveTickWithUndo } from './useRemoveTickWithUndo'
import { useTicksByUser } from './useTicksByUser'
import { clearTickPendingRemoval } from '../utils/pendingTickRemovals'

const tick: UserRouteTick = {
  id: 9, userId: 1, routeId: 42, tickedAt: '2026-05-12T10:00:00Z', style: 'flash', rating: 4, personalNote: '',
}
const other: UserRouteTick = { ...tick, id: 10, routeId: 43 }

type ToastArgs = { onAction: () => void; onDismiss: () => Promise<void> }

/** Renders the remove hook next to the ticks query, as a page would, and removes `tick`. */
const setup = async () => {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  )
  const { result } = renderHook(
    () => ({ ticks: useTicksByUser(1), remove: useRemoveTickWithUndo() }),
    { wrapper },
  )
  await waitFor(() => expect(result.current.ticks.data?.size).toBe(2))
  act(() => result.current.remove(1, tick))
  const routeIds = () => [...(result.current.ticks.data?.keys() ?? [])]
  return { queryClient, routeIds, toast: showToast.mock.calls[0][0] as ToastArgs }
}

beforeEach(() => {
  clearTickPendingRemoval(tick.id) // module-level state outlives each test
  deleteTick.mockReset()
  showToast.mockReset()
  getTicksByUser.mockReset().mockResolvedValue([tick, other])
})

describe('useRemoveTickWithUndo', () => {
  it('hides the tick immediately without deleting it yet', async () => {
    const { routeIds } = await setup()
    expect(routeIds()).toEqual([43])
    expect(deleteTick).not.toHaveBeenCalled()
  })

  it('keeps the tick hidden when a refetch still returns it', async () => {
    const { queryClient, routeIds } = await setup()
    getTicksByUser.mockClear()
    // e.g. the Ticks page mounting and refetching inside the undo window
    await act(() => queryClient.refetchQueries({ queryKey: ['users', 1, 'ticks'] }))
    expect(getTicksByUser).toHaveBeenCalledOnce()
    expect(routeIds()).toEqual([43])
  })

  it('shows the tick again on Undo and never deletes it', async () => {
    const { routeIds, toast } = await setup()
    act(() => toast.onAction())
    expect(routeIds()).toEqual([42, 43])
    expect(deleteTick).not.toHaveBeenCalled()
  })

  it('deletes the tick once the toast is dismissed, and keeps it gone', async () => {
    deleteTick.mockResolvedValue(undefined)
    const { routeIds, toast } = await setup()
    getTicksByUser.mockResolvedValue([other]) // server no longer has it
    await act(() => toast.onDismiss())

    expect(deleteTick).toHaveBeenCalledWith(1, 9)
    expect(routeIds()).toEqual([43])
  })

  it('shows the tick again and reports when the delete fails', async () => {
    deleteTick.mockRejectedValue(new Error('500'))
    const { routeIds, toast } = await setup()
    await act(() => toast.onDismiss())

    expect(showToast.mock.calls[1][0]).toMatchObject({ message: expect.stringMatching(/couldn't remove/i) })
    expect(routeIds()).toEqual([42, 43])
  })
})
