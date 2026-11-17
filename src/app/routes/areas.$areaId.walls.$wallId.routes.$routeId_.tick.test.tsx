import { describe, it, expect, vi, afterEach } from 'vitest'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'

// Capture the route's component and stub router primitives (no RouterProvider here).
const h = vi.hoisted(() => ({
  Captured: null as React.ComponentType | null,
  navigate: vi.fn(),
  area: { region: 'Norway' } as { region: string; type?: 'crag' | 'gym' },
  createTick: vi.fn(),
  attachPhoto: vi.fn(),
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
  useUploadTickPhoto: () => ({ attachPhoto: h.attachPhoto, isUploading: false }),
}))
// Downscaling needs a real canvas — pass the picked file straight through.
vi.mock('../../features/ticks/utils/tickPhoto', async importOriginal => ({
  ...(await importOriginal<typeof import('../../features/ticks/utils/tickPhoto')>()),
  prepareTickPhoto: async (file: File) => file,
}))

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

describe('LogTickPage gym photo', () => {
  afterEach(() => {
    h.area = { region: 'Norway' }
    vi.clearAllMocks()
  })

  it('offers no photo field on crag routes', () => {
    renderForm()
    expect(screen.queryByRole('button', { name: /add photo/i })).not.toBeInTheDocument()
  })

  it('uploads the picked photo to the tick once it is saved', async () => {
    h.area = { region: 'Oslo', type: 'gym' }
    URL.createObjectURL = vi.fn(() => 'blob:preview')
    URL.revokeObjectURL = vi.fn()
    renderForm()

    const photo = new File(['x'], 'send.jpg', { type: 'image/jpeg' })
    fireEvent.change(screen.getByLabelText('Tick photo file'), { target: { files: [photo] } })
    await waitFor(() => expect(screen.getByRole('img', { name: /your photo/i })).toBeInTheDocument())

    fireEvent.click(screen.getByRole('button', { name: /Onsight/ }))
    fireEvent.click(screen.getByRole('button', { name: /save tick/ }))

    // The tick is created first; the photo goes to the id the server returns.
    const [, { onSuccess }] = h.createTick.mock.calls[0]
    onSuccess({ id: 77 })
    expect(h.attachPhoto).toHaveBeenCalledWith(7, 77, photo, expect.any(Function))
  })

  it('rejects unsupported file types before upload', () => {
    h.area = { region: 'Oslo', type: 'gym' }
    renderForm()
    const heic = new File(['x'], 'send.heic', { type: 'image/heic' })
    fireEvent.change(screen.getByLabelText('Tick photo file'), { target: { files: [heic] } })
    expect(screen.getByText('Photo must be JPEG, PNG or WebP')).toBeInTheDocument()
  })
})
