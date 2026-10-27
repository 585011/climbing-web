import { describe, it, expect, vi } from 'vitest'
import { act, fireEvent, render, screen } from '@testing-library/react'

// Capture the route's component and stub router primitives (no RouterProvider here).
const h = vi.hoisted(() => ({
  Captured: null as React.ComponentType | null,
  navigate: vi.fn(),
  createGymTick: vi.fn(),
  uploadPhoto: vi.fn(),
  compressImage: vi.fn(),
}))

vi.mock('@tanstack/react-router', () => ({
  createFileRoute: () => (opts: { component: React.ComponentType }) => {
    h.Captured = opts.component
    return { useParams: () => ({ areaId: '1', wallId: '3' }) }
  },
  useNavigate: () => h.navigate,
  Link: ({ children }: { children: React.ReactNode }) => <a>{children}</a>,
}))

vi.mock('../../features/areas/hooks/useArea', () => ({
  useArea: () => ({ data: { name: 'Klatreverket', type: 'gym' } }),
}))
vi.mock('../../features/walls/hooks/useWall', () => ({
  useWall: () => ({ data: { name: 'Boulder cave' } }),
}))
vi.mock('../../features/routes/hooks/useRoutesByWall', () => ({
  useRoutesByWall: () => ({ data: [] }),
}))
vi.mock('../../features/users/hooks/useCurrentUser', () => ({
  useCurrentUser: () => ({ data: { id: 7 } }),
}))
vi.mock('../../features/ticks/hooks/useCreateGymTick', () => ({
  useCreateGymTick: () => ({ mutate: h.createGymTick, isPending: false, isError: false }),
}))
vi.mock('../../features/ticks/hooks/useUploadTickPhoto', () => ({
  useUploadTickPhoto: () => ({ mutate: h.uploadPhoto, isPending: false, isError: false }),
}))
vi.mock('../../utils/compressImage', () => ({ compressImage: h.compressImage }))

// Importing the route module runs createFileRoute, populating h.Captured.
import './areas.$areaId.walls.$wallId.new-tick'

describe('NewGymTickPage photo', () => {
  it('retries only the photo upload after it fails — the route is created once', async () => {
    const compressed = new File(['small'], 'route.jpg', { type: 'image/jpeg' })
    h.compressImage.mockResolvedValue(compressed)
    URL.createObjectURL = vi.fn(() => 'blob:preview')
    URL.revokeObjectURL = vi.fn()
    const Comp = h.Captured!
    render(<Comp />)

    fireEvent.change(screen.getByLabelText('Grade'), { target: { value: '6B' } })
    fireEvent.click(screen.getByRole('button', { name: 'Boulder' }))
    fireEvent.click(screen.getByRole('button', { name: 'Flash' }))
    fireEvent.change(screen.getByLabelText('Tick photo file'), {
      target: { files: [new File(['big'], 'route.png', { type: 'image/png' })] },
    })
    await screen.findByAltText('Route photo')

    fireEvent.click(screen.getByRole('button', { name: /add route & save tick/ }))
    const [, { onSuccess }] = h.createGymTick.mock.calls[0]
    act(() => onSuccess({ id: 77 }))
    expect(h.uploadPhoto).toHaveBeenLastCalledWith(
      { userId: 7, tickId: 77, photo: compressed },
      expect.objectContaining({ onSuccess: expect.any(Function) }),
    )

    // The upload failed (its onSuccess never ran); saving again retries just the photo.
    fireEvent.click(screen.getByRole('button', { name: 'retry photo upload' }))
    expect(h.createGymTick).toHaveBeenCalledTimes(1)
    expect(h.uploadPhoto).toHaveBeenCalledTimes(2)
    expect(h.uploadPhoto).toHaveBeenLastCalledWith(
      { userId: 7, tickId: 77, photo: compressed },
      expect.anything(),
    )
    expect(h.navigate).not.toHaveBeenCalled()
  })
})
