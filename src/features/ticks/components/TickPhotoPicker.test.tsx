import { describe, it, expect, vi, beforeEach } from 'vitest'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'

const compressImage = vi.hoisted(() => vi.fn())
vi.mock('../../../utils/compressImage', () => ({ compressImage }))

import { TickPhotoPicker } from './TickPhotoPicker'

const pick = (file: File) =>
  fireEvent.change(screen.getByLabelText('Tick photo file'), { target: { files: [file] } })

describe('TickPhotoPicker', () => {
  beforeEach(() => {
    compressImage.mockReset()
    URL.createObjectURL = vi.fn(() => 'blob:preview')
    URL.revokeObjectURL = vi.fn()
  })

  it('compresses the picked file and reports it with a preview URL', async () => {
    const original = new File(['big'], 'IMG_1.png', { type: 'image/png' })
    const compressed = new File(['small'], 'IMG_1.jpg', { type: 'image/jpeg' })
    compressImage.mockResolvedValue(compressed)
    const onChange = vi.fn()
    render(<TickPhotoPicker value={null} onChange={onChange} />)

    pick(original)

    await waitFor(() =>
      expect(onChange).toHaveBeenCalledWith({ file: compressed, previewUrl: 'blob:preview' }),
    )
    expect(compressImage).toHaveBeenCalledWith(original, 1600, 0.8)
  })

  it('shows an error when the image cannot be read', async () => {
    compressImage.mockRejectedValue(new Error('EncodingError'))
    const onChange = vi.fn()
    render(<TickPhotoPicker value={null} onChange={onChange} />)

    pick(new File(['x'], 'IMG_1.heic', { type: 'image/heic' }))

    expect(await screen.findByText('Couldn’t read that image — try another photo')).toBeInTheDocument()
    expect(onChange).not.toHaveBeenCalled()
  })

  it('previews a new pick over the saved photo, and Remove reverts to the saved one', () => {
    const picked = { file: new File(['p'], 'p.jpg', { type: 'image/jpeg' }), previewUrl: 'blob:picked' }
    const onChange = vi.fn()
    const view = render(
      <TickPhotoPicker value={picked} onChange={onChange} currentUrl="https://r2.example/saved.jpg" />,
    )
    expect(screen.getByAltText('Route photo')).toHaveAttribute('src', 'blob:picked')

    fireEvent.click(screen.getByRole('button', { name: 'Remove' }))
    expect(onChange).toHaveBeenCalledWith(null)

    view.rerender(<TickPhotoPicker value={null} onChange={onChange} currentUrl="https://r2.example/saved.jpg" />)
    expect(screen.getByAltText('Route photo')).toHaveAttribute('src', 'https://r2.example/saved.jpg')
    expect(screen.queryByRole('button', { name: 'Remove' })).not.toBeInTheDocument()
    // The dropped preview's blob is released.
    expect(URL.revokeObjectURL).toHaveBeenCalledWith('blob:picked')
  })
})
