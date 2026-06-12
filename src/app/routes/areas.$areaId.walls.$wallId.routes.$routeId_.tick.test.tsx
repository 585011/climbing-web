import { describe, it, expect, vi } from 'vitest'
import { fireEvent, render, screen } from '@testing-library/react'

// Capture the route's component and stub router primitives (no RouterProvider here).
const h = vi.hoisted(() => ({
  Captured: null as React.ComponentType | null,
  navigate: vi.fn(),
}))

vi.mock('@tanstack/react-router', () => ({
  createFileRoute: () => (opts: { component: React.ComponentType }) => {
    h.Captured = opts.component
    return { useParams: () => ({ areaId: '1', wallId: '1', routeId: '42' }) }
  },
  useNavigate: () => h.navigate,
}))

vi.mock('../../features/areas/hooks/useArea', () => ({
  useArea: () => ({ data: { region: 'Norway' } }),
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
vi.mock('../../features/ticks/hooks/useTicksByUser', () => ({
  useTicksByUser: () => ({ data: new Map() }),
}))
vi.mock('../../features/ticks/hooks/useCreateTick', () => ({
  useCreateTick: () => ({ mutate: vi.fn(), isPending: false }),
}))
vi.mock('../../features/ticks/hooks/useUpdateTick', () => ({
  useUpdateTick: () => ({ mutate: vi.fn(), isPending: false }),
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
