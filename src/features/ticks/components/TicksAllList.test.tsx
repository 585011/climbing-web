import { describe, it, expect, vi } from 'vitest'
import { fireEvent, render, screen } from '@testing-library/react'
import type { EnrichedTick } from '../utils/enrichTicks'
import type { ClimbingRoute, UserRouteTick } from '../../../types/api'

vi.mock('@tanstack/react-router', () => ({
  // Must pass data-testid through — the row-order assertions select on it.
  Link: ({
    children,
    className,
    'data-testid': testId,
  }: {
    children: React.ReactNode
    className?: string
    'data-testid'?: string
  }) => (
    <a className={className} data-testid={testId}>
      {children}
    </a>
  ),
}))

import { TicksAllList } from './TicksAllList'

const route = (id: number, grade: string, name: string): ClimbingRoute => ({
  id, wallId: 20, name, grade, length: 20, style: 'sport', bolts: 8,
  ropeLengths: 1, firstAscendant: '', description: '', createdAt: '2026-01-01T00:00:00Z',
})
const item = (
  id: number, grade: string, name: string, style: string, tickedAt: string, rating = 3,
): EnrichedTick => ({
  tick: { id, userId: 7, routeId: id, tickedAt, style, rating, personalNote: '' } as UserRouteTick,
  route: route(id, grade, name),
})

// Newest-first, as enrichTicks guarantees.
const items: EnrichedTick[] = [
  item(1, '6+', 'Nordavind', 'redpoint', '2026-05-12T10:00:00Z', 5),
  item(2, '5',  'Solveggen', 'flash',    '2026-05-03T10:00:00Z', 4),
  item(3, '7-', 'Storm',     'redpoint', '2026-04-21T10:00:00Z', 3),
]

const noop = () => {}

describe('TicksAllList', () => {
  it('shows the count and only chips for styles present in the data', () => {
    render(<TicksAllList ticks={items} isLoading={false} isError={false} onRetry={noop} />)

    expect(screen.getByText(/All ticks · 3/)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'All' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'FL' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'RP' })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'OS' })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'FS' })).not.toBeInTheDocument()
  })

  it('filters by style chip and updates the header count', () => {
    render(<TicksAllList ticks={items} isLoading={false} isError={false} onRetry={noop} />)

    fireEvent.click(screen.getByRole('button', { name: 'FL' }))

    expect(screen.getByText(/All ticks · 1/)).toBeInTheDocument()
    expect(screen.getByText('Solveggen')).toBeInTheDocument()
    expect(screen.queryByText('Nordavind')).not.toBeInTheDocument()
  })

  it('sorts by date by default and by grade (hardest first) on demand', () => {
    const { container } = render(
      <TicksAllList ticks={items} isLoading={false} isError={false} onRetry={noop} />,
    )
    const names = () =>
      Array.from(container.querySelectorAll('[data-testid="tick-row"]')).map(
        el => el.textContent ?? '',
      )

    expect(names()[0]).toContain('Nordavind') // newest

    fireEvent.change(screen.getByLabelText('Sort ticks'), { target: { value: 'grade' } })

    expect(names()[0]).toContain('Storm') // 7- is hardest
  })

  it('renders star ratings on rows', () => {
    const { container } = render(
      <TicksAllList ticks={[items[0]]} isLoading={false} isError={false} onRetry={noop} />,
    )
    expect(container.textContent).toContain('★★★★★')
  })

  it('shows tap-to-retry on error', () => {
    const onRetry = vi.fn()
    render(<TicksAllList ticks={[]} isLoading={false} isError onRetry={onRetry} />)

    fireEvent.click(screen.getByRole('button', { name: /couldn't load ticks/i }))
    expect(onRetry).toHaveBeenCalledTimes(1)
  })

  it('shows the empty nudge and hides chips with zero ticks', () => {
    render(<TicksAllList ticks={[]} isLoading={false} isError={false} onRetry={noop} />)

    expect(screen.getByText(/No ticks yet/)).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'All' })).not.toBeInTheDocument()
  })
})
