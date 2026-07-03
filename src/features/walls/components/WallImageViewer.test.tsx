import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'

// The zoom lib needs real layout measurements — pass children through in jsdom.
vi.mock('react-zoom-pan-pinch', () => ({
  TransformWrapper: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  TransformComponent: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}))

import { WallImageViewer } from './WallImageViewer'

describe('WallImageViewer', () => {
  it('renders the image fullscreen and closes via the close button', () => {
    const onClose = vi.fn()
    render(<WallImageViewer src="https://r2.example/img.jpg" alt="Main Wall" onClose={onClose} />)

    expect(screen.getByRole('img', { name: 'Main Wall' })).toHaveAttribute(
      'src',
      'https://r2.example/img.jpg',
    )
    fireEvent.click(screen.getByRole('button', { name: /close/i }))
    expect(onClose).toHaveBeenCalledOnce()
  })
})
