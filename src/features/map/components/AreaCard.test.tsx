import { describe, it, expect, vi } from 'vitest'
import { fireEvent, render, screen } from '@testing-library/react'
import type { ClimbingArea } from '../../../types/api'

// Link needs router context we don't have here — render a plain anchor exposing its target.
vi.mock('@tanstack/react-router', () => ({
  Link: ({
    children,
    params,
    className,
  }: {
    children: React.ReactNode
    params?: { areaId: string }
    className?: string
  }) => (
    <a className={className} data-area={params?.areaId}>
      {children}
    </a>
  ),
}))

import { AreaCard } from './AreaCard'

const area: ClimbingArea = {
  id: 3,
  name: 'Sotra',
  description: '',
  latitude: 60.3,
  longitude: 5.1,
  region: 'Bergen',
  createdAt: '2026-01-01T00:00:00Z',
}

describe('AreaCard', () => {
  it('shows the area name and a Go to crag link to that area', () => {
    render(<AreaCard area={area} onClose={vi.fn()} />)

    expect(screen.getByText('Sotra')).toBeInTheDocument()
    const link = screen.getByText(/go to crag/i).closest('a')
    expect(link).toHaveAttribute('data-area', '3')
  })

  it('fires onClose when the close button is tapped', () => {
    const onClose = vi.fn()
    render(<AreaCard area={area} onClose={onClose} />)

    fireEvent.click(screen.getByRole('button', { name: 'Close' }))
    expect(onClose).toHaveBeenCalledTimes(1)
  })
})
