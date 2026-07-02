import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import type { Wall } from '../../../types/api'

// Link needs router context we don't have here — render a plain anchor.
vi.mock('@tanstack/react-router', () => ({
  Link: ({ children, className }: { children: React.ReactNode; className?: string }) => (
    <a className={className}>{children}</a>
  ),
}))

import { WallCard } from './WallCard'

const wall = (imageUrl: string | null): Wall => ({
  id: 5,
  areaId: 2,
  name: 'Main Wall',
  description: '',
  latitude: null,
  longitude: null,
  approachInfo: '',
  createdAt: '2026-06-12T00:00:00Z',
  imageUrl,
})

describe('WallCard thumbnail', () => {
  it('renders the image when imageUrl is set', () => {
    render(<WallCard wall={wall('https://r2.example/img.jpg')} areaId="2" />)
    expect(screen.getByRole('presentation')).toHaveAttribute('src', 'https://r2.example/img.jpg')
    expect(screen.queryByText('photo')).not.toBeInTheDocument()
  })

  it('keeps the placeholder when imageUrl is null', () => {
    render(<WallCard wall={wall(null)} areaId="2" />)
    expect(screen.getByText('photo')).toBeInTheDocument()
  })
})
