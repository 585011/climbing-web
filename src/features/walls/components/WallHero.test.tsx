import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import type { Wall } from '../../../types/api'
import { WALL_IMAGE_MAX_BYTES } from '../../../types/api'

const isAdmin = vi.fn()
vi.mock('../../../hooks/useIsAdmin', () => ({ useIsAdmin: () => isAdmin() }))

const mutate = vi.fn()
vi.mock('../hooks/useUploadWallImage', () => ({
  useUploadWallImage: () => ({ mutate, isPending: false }),
}))

vi.mock('./WallImageViewer', () => ({
  WallImageViewer: ({ onClose }: { onClose: () => void }) => (
    <div data-testid="viewer">
      <button onClick={onClose}>close viewer</button>
    </div>
  ),
}))

import { WallHero } from './WallHero'

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

const noop = () => {}

describe('WallHero', () => {
  beforeEach(() => {
    isAdmin.mockReturnValue(false)
    mutate.mockReset()
  })

  it('shows the placeholder when there is no image', () => {
    render(<WallHero wall={wall(null)} loading={false} onBack={noop} />)
    expect(screen.getByText('photo')).toBeInTheDocument()
  })

  it('renders the image and opens the fullscreen viewer on tap', () => {
    render(<WallHero wall={wall('https://r2.example/img.jpg')} loading={false} onBack={noop} />)
    expect(screen.queryByTestId('viewer')).not.toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'View photo fullscreen' }))
    expect(screen.getByTestId('viewer')).toBeInTheDocument()
    fireEvent.click(screen.getByText('close viewer'))
    expect(screen.queryByTestId('viewer')).not.toBeInTheDocument()
  })

  it('hides the upload button from non-admins', () => {
    render(<WallHero wall={wall(null)} loading={false} onBack={noop} />)
    expect(screen.queryByRole('button', { name: 'Add photo' })).not.toBeInTheDocument()
  })

  it('shows "Add photo" to admins when there is no image, "Replace photo" otherwise', () => {
    isAdmin.mockReturnValue(true)
    const { rerender } = render(<WallHero wall={wall(null)} loading={false} onBack={noop} />)
    expect(screen.getByRole('button', { name: 'Add photo' })).toBeInTheDocument()
    rerender(<WallHero wall={wall('https://r2.example/img.jpg')} loading={false} onBack={noop} />)
    expect(screen.getByRole('button', { name: 'Replace photo' })).toBeInTheDocument()
  })

  it('rejects a wrong file type before any request', () => {
    isAdmin.mockReturnValue(true)
    render(<WallHero wall={wall(null)} loading={false} onBack={noop} />)
    const input = screen.getByLabelText('Wall photo file')
    const file = new File(['x'], 'a.gif', { type: 'image/gif' })
    fireEvent.change(input, { target: { files: [file] } })
    expect(screen.getByText('Image must be JPEG, PNG or WebP')).toBeInTheDocument()
    expect(mutate).not.toHaveBeenCalled()
  })

  it('rejects an oversized file before any request', () => {
    isAdmin.mockReturnValue(true)
    render(<WallHero wall={wall(null)} loading={false} onBack={noop} />)
    const input = screen.getByLabelText('Wall photo file')
    const file = new File([new ArrayBuffer(WALL_IMAGE_MAX_BYTES + 1)], 'a.png', {
      type: 'image/png',
    })
    fireEvent.change(input, { target: { files: [file] } })
    expect(screen.getByText('Image is larger than 20 MB')).toBeInTheDocument()
    expect(mutate).not.toHaveBeenCalled()
  })

  it('uploads a valid file', () => {
    isAdmin.mockReturnValue(true)
    render(<WallHero wall={wall(null)} loading={false} onBack={noop} />)
    const input = screen.getByLabelText('Wall photo file')
    const file = new File(['x'], 'topo.jpg', { type: 'image/jpeg' })
    fireEvent.change(input, { target: { files: [file] } })
    expect(mutate).toHaveBeenCalledWith(
      { wallId: 5, file },
      expect.objectContaining({ onError: expect.any(Function) }),
    )
  })

  it('calls onBack from the back button', () => {
    const onBack = vi.fn()
    render(<WallHero wall={wall(null)} loading={false} onBack={onBack} />)
    fireEvent.click(screen.getByRole('button', { name: '‹ back' }))
    expect(onBack).toHaveBeenCalledOnce()
  })
})
