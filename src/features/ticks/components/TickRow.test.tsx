import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import type { EnrichedTick } from '../utils/enrichTicks'
import type { ClimbingRoute, UserRouteTick, Wall } from '../../../types/api'

// Link needs router context we don't have here — render a plain anchor.
vi.mock('@tanstack/react-router', () => ({
  Link: ({ children, className }: { children: React.ReactNode; className?: string }) => (
    <a className={className}>{children}</a>
  ),
}))

import { TickRow } from './TickRow'

const tick = (over: Partial<UserRouteTick> = {}): UserRouteTick => ({
  id: 1, userId: 7, routeId: 10, tickedAt: '2026-05-12T10:00:00Z',
  style: 'redpoint', rating: 4, personalNote: '', ...over,
})
const route: ClimbingRoute = {
  id: 10, wallId: 20, name: 'Nordavind', grade: '6+', length: 20, style: 'sport',
  bolts: 8, ropeLengths: 1, firstAscendant: '', description: '', createdAt: '2026-01-01T00:00:00Z',
}
const wall: Wall = {
  id: 20, areaId: 30, name: 'Tellevikhola', description: '', latitude: null,
  longitude: null, approachInfo: '', imageUrl: null, createdAt: '2026-01-01T00:00:00Z',
}

describe('TickRow', () => {
  it('shows grade badge, name, location, style initials and short date', () => {
    const item: EnrichedTick = { tick: tick(), route, wall }
    render(<TickRow item={item} />)

    expect(screen.getByText('6+')).toBeInTheDocument()
    expect(screen.getByText('Nordavind')).toBeInTheDocument()
    expect(screen.getByText('Tellevikhola')).toBeInTheDocument()
    expect(screen.getByText('RP')).toBeInTheDocument()
    expect(screen.getByText('12 May')).toBeInTheDocument()
  })

  it('degrades when the route is missing: ? badge, no location, no link', () => {
    const item: EnrichedTick = { tick: tick() }
    const { container } = render(<TickRow item={item} />)

    expect(screen.getByText('?')).toBeInTheDocument()
    expect(screen.getByText('Unknown route')).toBeInTheDocument()
    expect(container.querySelector('a')).not.toBeInTheDocument()
  })

  it('shows stars only when showStars is set and rating > 0', () => {
    const item: EnrichedTick = { tick: tick({ rating: 3 }), route, wall }
    const { container, rerender } = render(<TickRow item={item} />)
    expect(container.textContent).not.toContain('★')

    rerender(<TickRow item={item} showStars />)
    expect(container.textContent).toContain('★★★')

    rerender(<TickRow item={{ tick: tick({ rating: 0 }), route, wall }} showStars />)
    expect(container.textContent).not.toContain('★')
  })
})
