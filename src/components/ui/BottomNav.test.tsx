import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'

// Link/useLocation need router context we don't have here — render a plain anchor.
vi.mock('@tanstack/react-router', () => ({
  Link: ({ children, className }: { children: React.ReactNode; className?: string }) => (
    <a className={className}>{children}</a>
  ),
  useLocation: () => ({ pathname: '/' }),
}))

import { BottomNav } from './BottomNav'

describe('BottomNav icons', () => {
  it('renders an inline SVG icon in every tab', () => {
    const { container } = render(<BottomNav />)

    expect(container.querySelectorAll('a svg')).toHaveLength(4)
    expect(screen.getByText('Explore')).toBeInTheDocument()
    expect(screen.getByText('Map')).toBeInTheDocument()
    expect(screen.getByText('Ticks')).toBeInTheDocument()
    expect(screen.getByText('Me')).toBeInTheDocument()
  })

  it('contains no Unicode glyph icons that browsers may render as emoji', () => {
    const { container } = render(<BottomNav />)

    for (const glyph of ['◎', '◇', '✓', '○']) {
      expect(container.textContent).not.toContain(glyph)
    }
  })
})
