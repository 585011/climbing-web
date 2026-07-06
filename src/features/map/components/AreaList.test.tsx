import { describe, it, expect, vi } from 'vitest'
import { fireEvent, render, screen } from '@testing-library/react'
import type { ClimbingArea } from '../../../types/api'

vi.mock('@tanstack/react-router', () => ({
  Link: ({
    children,
    params,
    className,
    onClick,
  }: {
    children: React.ReactNode
    params?: { areaId: string }
    className?: string
    onClick?: () => void
  }) => (
    <a className={className} data-area={params?.areaId} onClick={onClick}>
      {children}
    </a>
  ),
}))

import { AreaList } from './AreaList'

const area = (id: number, name: string): ClimbingArea => ({
  id,
  name,
  description: '',
  latitude: 60,
  longitude: 5,
  region: 'Bergen',
  createdAt: '2026-01-01T00:00:00Z',
})

describe('AreaList', () => {
  it('renders a row per area linking to the crag', () => {
    render(<AreaList areas={[area(1, 'Sotra'), area(2, 'Ulriken')]} onSelect={vi.fn()} />)

    expect(screen.getByText('Sotra').closest('a')).toHaveAttribute('data-area', '1')
    expect(screen.getByText('Ulriken').closest('a')).toHaveAttribute('data-area', '2')
  })

  it('fires onSelect with the area id when a row is tapped', () => {
    const onSelect = vi.fn()
    render(<AreaList areas={[area(1, 'Sotra')]} onSelect={onSelect} />)

    fireEvent.click(screen.getByText('Sotra'))
    expect(onSelect).toHaveBeenCalledWith(1)
  })

  it('shows a nudge when there are no areas', () => {
    render(<AreaList areas={[]} onSelect={vi.fn()} />)
    expect(screen.getByText(/no crags yet/i)).toBeInTheDocument()
  })
})
