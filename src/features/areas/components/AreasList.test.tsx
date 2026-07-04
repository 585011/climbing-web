import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { act, fireEvent, render, screen } from '@testing-library/react'
import type { ClimbingArea } from '../../../types/api'

const useAreas = vi.fn()
vi.mock('../hooks/useAreas', () => ({ useAreas: () => useAreas() }))

// Link needs router context we don't have here — render a plain anchor.
vi.mock('@tanstack/react-router', () => ({
  Link: ({ children, className }: { children: React.ReactNode; className?: string }) => (
    <a className={className}>{children}</a>
  ),
}))

import { AreasList } from './AreasList'

const area = (id: number, name: string): ClimbingArea => ({
  id,
  name,
  description: '',
  latitude: 0,
  longitude: 0,
  region: 'Norway',
  createdAt: '2026-06-12T00:00:00Z',
})

describe('AreasList search', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    useAreas.mockReturnValue({
      data: [area(1, 'Bergen'), area(2, 'Oslo')],
      isLoading: false,
      isError: false,
    })
  })
  afterEach(() => vi.useRealTimers())

  it('filters only after the debounce delay elapses', () => {
    render(<AreasList />)

    // Both crags visible initially.
    expect(screen.getByText('Bergen')).toBeInTheDocument()
    expect(screen.getByText('Oslo')).toBeInTheDocument()

    fireEvent.change(screen.getByPlaceholderText('Search crags, routes…'), {
      target: { value: 'berg' },
    })

    // Debounce not yet elapsed — list unchanged.
    expect(screen.getByText('Oslo')).toBeInTheDocument()

    act(() => vi.advanceTimersByTime(300))

    // Now filtered to the match only.
    expect(screen.getByText('Bergen')).toBeInTheDocument()
    expect(screen.queryByText('Oslo')).not.toBeInTheDocument()
  })

  it('caps the search input length', () => {
    render(<AreasList />)
    expect(screen.getByPlaceholderText('Search crags, routes…')).toHaveAttribute(
      'maxlength',
      '100',
    )
  })

  it('shows a wall photo on cards whose area has one, placeholder otherwise', () => {
    render(<AreasList imageByAreaId={new Map([[1, 'https://r2.example/img.jpg']])} />)

    const thumb = screen.getByRole('presentation')
    expect(thumb).toHaveAttribute('src', 'https://r2.example/img.jpg')
    // Area 2 (Oslo) has no image — keeps the placeholder.
    expect(screen.getByText('photo')).toBeInTheDocument()
  })
})

describe('AreasList error state', () => {
  it('shows a tap-to-retry message and refetches when tapped', () => {
    const refetch = vi.fn()
    useAreas.mockReturnValue({ data: undefined, isLoading: false, isError: true, refetch })

    render(<AreasList />)

    const retry = screen.getByRole('button', { name: /couldn't load crags/i })
    fireEvent.click(retry)
    expect(refetch).toHaveBeenCalledTimes(1)
  })

  it('does not render skeleton cards while in the error state', () => {
    useAreas.mockReturnValue({ data: undefined, isLoading: false, isError: true, refetch: vi.fn() })

    const { container } = render(<AreasList />)

    expect(container.querySelector('.animate-pulse')).not.toBeInTheDocument()
  })
})
