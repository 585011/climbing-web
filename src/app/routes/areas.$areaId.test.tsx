import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import type { Wall } from '../../types/api'

// Capture the route's component and stub router primitives (no RouterProvider here).
const h = vi.hoisted(() => ({
  Captured: null as React.ComponentType | null,
  walls: [] as Wall[],
}))

vi.mock('@tanstack/react-router', () => ({
  createFileRoute: () => (opts: { component: React.ComponentType }) => {
    h.Captured = opts.component
    return { useParams: () => ({ areaId: '1' }) }
  },
  useChildMatches: () => [],
  Outlet: () => null,
  Link: ({ children }: { children: React.ReactNode }) => <a>{children}</a>,
}))

vi.mock('../../features/areas/hooks/useArea', () => ({
  useArea: () => ({
    data: { id: 1, name: 'BOF-veggen', region: 'Bergen nord', description: '' },
    isLoading: false,
    isError: false,
  }),
}))
vi.mock('../../features/walls/hooks/useWallsByArea', () => ({
  useWallsByArea: () => ({ data: h.walls, isLoading: false }),
}))
// Photo mechanics are covered by WallHero/WallPhoto tests — here we only
// assert which hero variant the area page picks.
vi.mock('../../features/walls/components/WallPhoto', () => ({
  WallPhoto: ({ wall, children }: { wall: Wall; children?: React.ReactNode }) => (
    <div data-testid="wall-photo" data-wall-id={wall.id}>
      {children}
    </div>
  ),
}))
vi.mock('../../features/routes/components/AreaRoutesList', () => ({
  AreaRoutesList: () => <div data-testid="area-routes" />,
}))

// Importing the route module runs createFileRoute, populating h.Captured.
import './areas.$areaId'

const wall = (id: number): Wall => ({
  id,
  areaId: 1,
  name: `Wall ${id}`,
  description: '',
  latitude: null,
  longitude: null,
  approachInfo: '',
  createdAt: '2026-06-12T00:00:00Z',
  imageUrl: null,
})

const renderPage = () => {
  const Comp = h.Captured!
  return render(<Comp />)
}

describe('AreaPage hero', () => {
  it('shows the wall photo hero when the area has exactly one wall', () => {
    h.walls = [wall(12)]
    renderPage()
    expect(screen.getByTestId('wall-photo')).toHaveAttribute('data-wall-id', '12')
    // The area overlays render inside the photo hero.
    expect(screen.getByText('‹ back')).toBeInTheDocument()
    expect(screen.getByText('Bergen nord')).toBeInTheDocument()
  })

  it('keeps the placeholder hero when the area has multiple walls', () => {
    h.walls = [wall(1), wall(2)]
    renderPage()
    expect(screen.queryByTestId('wall-photo')).not.toBeInTheDocument()
    // Hero placeholder + the two wall cards' thumbnail placeholders (Walls is the default tab).
    expect(screen.getAllByText('photo')).toHaveLength(3)
  })
})

describe('AreaPage tabs', () => {
  it('opens on the Walls tab when the area has several walls', () => {
    h.walls = [wall(1), wall(2)]
    renderPage()
    expect(screen.getByText('Wall 1')).toBeInTheDocument()
    expect(screen.getByText('Wall 2')).toBeInTheDocument()
    expect(screen.queryByTestId('area-routes')).not.toBeInTheDocument()
  })

  it('falls back to Routes when a single-wall area hides the Walls tab', () => {
    h.walls = [wall(12)]
    renderPage()
    expect(screen.queryByRole('button', { name: 'Walls' })).not.toBeInTheDocument()
    expect(screen.getByTestId('area-routes')).toBeInTheDocument()
  })
})
