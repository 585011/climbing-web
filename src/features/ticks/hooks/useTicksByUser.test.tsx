import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import type { ReactNode } from 'react'

const { getTicksByUser } = vi.hoisted(() => ({ getTicksByUser: vi.fn() }))
vi.mock('../api/getTicksByUser', () => ({ getTicksByUser }))

import { useTicksByUser } from './useTicksByUser'

const wrapper = ({ children }: { children: ReactNode }) => (
  <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
    {children}
  </QueryClientProvider>
)

beforeEach(() => getTicksByUser.mockReset())

describe('useTicksByUser', () => {
  it('does not fetch until the current user id is known', () => {
    renderHook(() => useTicksByUser(0), { wrapper })
    expect(getTicksByUser).not.toHaveBeenCalled()
  })

  it('fetches and keys ticks by route id once the id is known', async () => {
    getTicksByUser.mockResolvedValue([{ id: 1, routeId: 42 }])
    const { result } = renderHook(() => useTicksByUser(7), { wrapper })

    await waitFor(() => expect(result.current.data?.get(42)).toMatchObject({ id: 1 }))
    expect(getTicksByUser).toHaveBeenCalledWith(7)
  })
})
