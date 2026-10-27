import { describe, it, expect, vi, afterEach } from 'vitest'
import { fireEvent, render, screen } from '@testing-library/react'

// Capture the route's component and stub router primitives (no RouterProvider here).
const h = vi.hoisted(() => ({
  Captured: null as React.ComponentType | null,
  navigate: vi.fn(),
  area: { region: 'Norway' } as { region: string; type?: string },
  createTick: vi.fn(),
  uploadPhoto: vi.fn(),
  compressImage: vi.fn(),
}))

vi.mock('@tanstack/react-router', () => ({
  createFileRoute: () => (opts: { component: React.ComponentType }) => {
    h.Captured = opts.component
    return { useParams: () => ({ areaId: '1', wallId: '1', routeId: '42' }) }
  },
  useNavigate: () => h.navigate,
}))

vi.mock('../../features/areas/hooks/useArea', () => ({
  useArea: () => ({ data: h.area }),
}))
vi.mock('../../features/walls/hooks/useWall', () => ({
  useWall: () => ({ data: { name: 'North Wall' } }),
}))
vi.mock('../../features/routes/hooks/useRoute', () => ({
  useRoute: () => ({
    data: { id: 42, name: 'Test Route', grade: '7a', length: 20, style: 'sport' },
    isLoading: false,
    isError: false,
  }),
}))
vi.mock('../../features/users/hooks/useCurrentUser', () => ({
  useCurrentUser: () => ({ data: { id: 7 } }),
}))
const ticks = vi.hoisted(() => ({ map: new Map() }))
vi.mock('../../features/ticks/hooks/useTicksByUser', () => ({
  useTicksByUser: () => ({ data: ticks.map }),
}))
vi.mock('../../features/ticks/hooks/useCreateTick', () => ({
  useCreateTick: () => ({ mutate: h.createTick, isPending: false }),
}))
vi.mock('../../features/ticks/hooks/useUpdateTick', () => ({
  useUpdateTick: () => ({ mutate: vi.fn(), isPending: false }),
}))
vi.mock('../../features/ticks/hooks/useUploadTickPhoto', () => ({
  useUploadTickPhoto: () => ({ mutate: h.uploadPhoto, isPending: false, isError: false }),
}))
vi.mock('../../utils/compressImage', () => ({ compressImage: h.compressImage }))

// Importing the route module runs createFileRoute, populating h.Captured.
import './areas.$areaId.walls.$wallId.routes.$routeId_.tick'

const renderForm = () => {
  const Comp = h.Captured!
  return render(<Comp />)
}

describe('LogTickPage validation', () => {
  it('disables Save until a send style is chosen', () => {
    renderForm()

    const headerSave = screen.getByRole('button', { name: 'save' })
    const bottomSave = screen.getByRole('button', { name: /save tick/ })
    expect(headerSave).toBeDisabled()
    expect(bottomSave).toBeDisabled()
    expect(screen.getByText('Pick how you sent it to save')).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: /Onsight/ }))

    expect(headerSave).toBeEnabled()
    expect(bottomSave).toBeEnabled()
    expect(screen.queryByText('Pick how you sent it to save')).not.toBeInTheDocument()
  })

  it('caps the personal note at 500 characters', () => {
    renderForm()
    expect(
      screen.getByPlaceholderText('How did it feel? Any beta worth remembering?'),
    ).toHaveAttribute('maxlength', '500')
  })
})

describe('LogTickPage edit mode', () => {
  afterEach(() => {
    ticks.map = new Map()
  })

  it('prefills the form when the existing tick loads after first render', () => {
    // Ticks query hasn't resolved yet on first render.
    ticks.map = new Map()
    const view = renderForm()

    // …then the user's tick for this route (id 42) arrives.
    ticks.map = new Map([
      [42, { id: 9, style: 'flash', rating: 4, personalNote: 'crimpy start' }],
    ])
    const Comp = h.Captured!
    view.rerender(<Comp />)

    expect(
      screen.getByPlaceholderText('How did it feel? Any beta worth remembering?'),
    ).toHaveValue('crimpy start')
    const litStars = screen
      .getAllByText('★')
      .filter(s => s.className.includes('text-accent'))
    expect(litStars).toHaveLength(4)
    expect(screen.getByRole('button', { name: 'save' })).toBeEnabled()
  })
})

describe('LogTickPage photo', () => {
  afterEach(() => {
    h.area = { region: 'Norway' }
    h.createTick.mockReset()
    h.uploadPhoto.mockReset()
    h.navigate.mockReset()
  })

  it('offers no photo for crag routes', () => {
    renderForm()
    expect(screen.queryByLabelText('Tick photo file')).not.toBeInTheDocument()
  })

  it('uploads the compressed photo once the gym tick is created', async () => {
    h.area = { region: 'Oslo', type: 'gym' }
    const compressed = new File(['small'], 'route.jpg', { type: 'image/jpeg' })
    h.compressImage.mockResolvedValue(compressed)
    URL.createObjectURL = vi.fn(() => 'blob:preview')
    URL.revokeObjectURL = vi.fn()
    renderForm()

    fireEvent.change(screen.getByLabelText('Tick photo file'), {
      target: { files: [new File(['big'], 'route.png', { type: 'image/png' })] },
    })
    await screen.findByAltText('Route photo')
    fireEvent.click(screen.getByRole('button', { name: /Onsight/ }))
    fireEvent.click(screen.getByRole('button', { name: /save tick/ }))

    // The tick is saved first; the photo goes up against the new tick's id.
    expect(h.uploadPhoto).not.toHaveBeenCalled()
    const [, { onSuccess }] = h.createTick.mock.calls[0]
    onSuccess({ id: 55 })
    expect(h.uploadPhoto).toHaveBeenCalledWith(
      { userId: 7, tickId: 55, photo: compressed },
      expect.objectContaining({ onSuccess: expect.any(Function) }),
    )
    expect(h.navigate).not.toHaveBeenCalled()
  })
})
