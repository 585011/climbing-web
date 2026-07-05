import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { fireEvent, render, screen } from '@testing-library/react'
import type { EnrichedTick } from '../utils/enrichTicks'
import type { ClimbingRoute, UserRouteTick } from '../../../types/api'

vi.mock('@tanstack/react-router', () => ({
  Link: ({ children, className }: { children: React.ReactNode; className?: string }) => (
    <a className={className}>{children}</a>
  ),
}))

import { TicksDashboard } from './TicksDashboard'

const route = (id: number, grade: string, name = `R${id}`): ClimbingRoute => ({
  id, wallId: 20, name, grade, length: 20, style: 'sport', bolts: 8,
  ropeLengths: 1, firstAscendant: '', description: '', createdAt: '2026-01-01T00:00:00Z',
})
const item = (id: number, grade: string, tickedAt: string): EnrichedTick => ({
  tick: {
    id, userId: 7, routeId: id, tickedAt, style: 'redpoint', rating: 3, personalNote: '',
  } as UserRouteTick,
  route: route(id, grade),
})

// Newest-first, as enrichTicks guarantees.
const items: EnrichedTick[] = [
  item(1, '7-', '2026-07-02T10:00:00Z'),
  item(2, '6+', '2026-07-01T10:00:00Z'),
  item(3, '6+', '2026-06-20T10:00:00Z'),
  item(4, '6',  '2026-05-01T10:00:00Z'),
]

describe('TicksDashboard', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-07-04T12:00:00Z'))
  })
  afterEach(() => vi.useRealTimers())

  const noop = () => {}

  it('computes the three stat cards', () => {
    render(<TicksDashboard ticks={items} isLoading={false} isError={false} onRetry={noop} />)

    // testids, not getByText: the same digits/grades also appear in pyramid bars
    expect(screen.getByTestId('stat-routes')).toHaveTextContent('4')
    expect(screen.getByTestId('stat-hardest')).toHaveTextContent('7-')
    expect(screen.getByTestId('stat-this month')).toHaveTextContent('2') // July 2026
  })

  it('renders pyramid bars hardest-first with counts', () => {
    render(<TicksDashboard ticks={items} isLoading={false} isError={false} onRetry={noop} />)

    const bars = screen.getAllByTestId('pyramid-bar')
    expect(bars.map(b => b.getAttribute('data-grade'))).toEqual(['7-', '6+', '6'])
    expect(bars.map(b => b.getAttribute('data-count'))).toEqual(['1', '2', '1'])
  })

  it('shows the 3 newest ticks under recent', () => {
    render(<TicksDashboard ticks={items} isLoading={false} isError={false} onRetry={noop} />)

    expect(screen.getByText('R1')).toBeInTheDocument()
    expect(screen.getByText('R3')).toBeInTheDocument()
    expect(screen.queryByText('R4')).not.toBeInTheDocument()
    expect(screen.getByText(/see all/)).toBeInTheDocument()
  })

  it('shows tap-to-retry on error and calls onRetry', () => {
    const onRetry = vi.fn()
    render(<TicksDashboard ticks={[]} isLoading={false} isError onRetry={onRetry} />)

    fireEvent.click(screen.getByRole('button', { name: /couldn't load ticks/i }))
    expect(onRetry).toHaveBeenCalledTimes(1)
  })

  it('shows skeletons while loading and the empty nudge with zero ticks', () => {
    const { container, rerender } = render(
      <TicksDashboard ticks={[]} isLoading isError={false} onRetry={noop} />,
    )
    expect(container.querySelector('.animate-pulse')).toBeInTheDocument()

    rerender(<TicksDashboard ticks={[]} isLoading={false} isError={false} onRetry={noop} />)
    expect(screen.getByText(/No ticks yet/)).toBeInTheDocument()
  })
})
