import { describe, it, expect, vi, beforeEach, type Mock } from 'vitest'
import { render } from '@testing-library/react'
import type { ClimbingArea } from '../../../types/api'

// vi.mock factories are hoisted above top-level const declarations, so the
// mock instances/constructors must be created inside vi.hoisted to avoid a
// temporal-dead-zone reference error.
const { mapInstance, MapCtor, MarkerCtor, LngLatBoundsCtor } = vi.hoisted(() => {
  const mapInstance = {
    on: vi.fn(),
    remove: vi.fn(),
    fitBounds: vi.fn(),
    flyTo: vi.fn(),
    resize: vi.fn(),
  }
  const markerInstance = {
    setLngLat: vi.fn().mockReturnThis(),
    addTo: vi.fn().mockReturnThis(),
    remove: vi.fn(),
    getElement: vi.fn(() => document.createElement('div')),
  }
  const boundsInstance = { extend: vi.fn().mockReturnThis(), isEmpty: vi.fn(() => false) }

  // function (not arrow) expressions so these are usable as `new` constructors.
  const MapCtor: Mock<(options: { style: string }) => typeof mapInstance> = vi.fn(function () {
    return mapInstance
  })
  const MarkerCtor: Mock<(options?: { element: HTMLElement }) => typeof markerInstance> = vi.fn(
    function () {
      return markerInstance
    },
  )
  const LngLatBoundsCtor = vi.fn(function () {
    return boundsInstance
  })

  return { mapInstance, markerInstance, boundsInstance, MapCtor, MarkerCtor, LngLatBoundsCtor }
})

vi.mock('maplibre-gl', () => ({
  default: { Map: MapCtor, Marker: MarkerCtor, LngLatBounds: LngLatBoundsCtor },
}))
// CSS import is a no-op under vitest, but stub it so resolution never fails.
vi.mock('maplibre-gl/dist/maplibre-gl.css', () => ({}))

// AreaCard/LocateButton render plain nodes here; they have their own tests.
vi.mock('./AreaCard', () => ({ AreaCard: () => <div data-testid="area-card" /> }))
vi.mock('./LocateButton', () => ({ LocateButton: () => <div data-testid="locate" /> }))

import MapView from './MapView'

const area = (id: number): ClimbingArea => ({
  id,
  name: `Area ${id}`,
  description: '',
  latitude: 60 + id / 100,
  longitude: 5 + id / 100,
  region: 'Bergen',
  createdAt: '2026-01-01T00:00:00Z',
})

// Capture ResizeObserver callbacks so tests can fire them; jsdom has no RO.
let roCallbacks: ResizeObserverCallback[] = []
class MockResizeObserver {
  constructor(cb: ResizeObserverCallback) {
    roCallbacks.push(cb)
  }
  observe = vi.fn()
  unobserve = vi.fn()
  disconnect = vi.fn()
}

describe('MapView', () => {
  beforeEach(() => {
    MapCtor.mockClear()
    MarkerCtor.mockClear()
    mapInstance.remove.mockClear()
    mapInstance.resize.mockClear()
    roCallbacks = []
    vi.stubGlobal('ResizeObserver', MockResizeObserver)
  })

  it('creates a MapLibre map with the OpenFreeMap style', () => {
    render(<MapView areas={[area(1)]} selectedId={null} onSelect={vi.fn()} />)

    expect(MapCtor).toHaveBeenCalledTimes(1)
    const opts = MapCtor.mock.calls[0][0] as { style: string }
    expect(opts.style).toBe('https://tiles.openfreemap.org/styles/liberty')
  })

  it('adds one marker per area', () => {
    render(<MapView areas={[area(1), area(2), area(3)]} selectedId={null} onSelect={vi.fn()} />)
    expect(MarkerCtor).toHaveBeenCalledTimes(3)
  })

  it('removes the map on unmount', () => {
    const { unmount } = render(<MapView areas={[area(1)]} selectedId={null} onSelect={vi.fn()} />)
    unmount()
    expect(mapInstance.remove).toHaveBeenCalledTimes(1)
  })

  it('resizes the map when its container gets sized (no fullscreen needed)', () => {
    render(<MapView areas={[area(1)]} selectedId={null} onSelect={vi.fn()} />)

    // A ResizeObserver must be watching the container so the canvas fills it
    // once layout resolves — otherwise the map inits at 0×0 and stays blank
    // until something else (e.g. entering fullscreen) forces a resize.
    expect(roCallbacks.length).toBeGreaterThan(0)

    roCallbacks[0]([], {} as ResizeObserver)
    expect(mapInstance.resize).toHaveBeenCalled()
  })
})
