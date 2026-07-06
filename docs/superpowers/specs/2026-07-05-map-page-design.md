# Map Page — Design

**Date:** 2026-07-05
**Issue:** [climbing-web#31](https://github.com/585011/climbing-web/issues/31)
**Design reference:** sketch attached to the issue (fullscreen map, area markers, selected-area card, expand button, area list below).

## Goal

Replace the `/map` tab stub with an interactive map of all climbing areas: markers from area coordinates, tap-a-marker card with a "Go to crag" link, a locate-me button, a fullscreen/expand button, and a scrollable area list below the map. Mobile-first per the UX target; users are at crags on cellular, so the heavy map library must not bloat the main bundle.

## Decisions made during brainstorming

| Decision | Choice |
|---|---|
| Map library | **MapLibre GL JS** (renderer). |
| Tile / style source | **OpenFreeMap** — `https://tiles.openfreemap.org/styles/liberty`. Free, no API key, no signup, hosted vector tiles + style. |
| Route count on card | **Omitted for now** — card shows area name + "Go to crag" only. Backend `routeCount` field filed as a non-blocking follow-up. |
| Expand button | **Browser Fullscreen API** on the map container (true edge-to-edge fullscreen). |
| Filter chips (sport/boulder/trad in sketch) | **Omitted** — homepage's identical chips are also stubs; area data has no discipline field. |
| Bundle strategy | **`React.lazy()` on the `MapView` sub-component** — MapLibre + CSS split into their own chunk; the route shell and area list render instantly. |

## Precondition

Depends on [climbing-web PR #52](https://github.com/585011/climbing-web/pull/52) (`?size=100` on `getAreas`) being merged — otherwise `useAreas()` returns only the first 20 areas and the map plots ≤ 20 markers. The plan's first task must confirm the fix is on `main`.

## Structure

New feature `src/features/map/`. New dependency: `maplibre-gl`.

| File | Responsibility |
|---|---|
| `src/app/routes/map.tsx` | Replaces stub. Static/tiny: `useAreas()`, coordinate filter, `<Suspense>`-wrapped lazy `MapView`, `AreaList` below, loading/error states. |
| `src/features/map/utils/areasWithCoords.ts` | Pure filter: keep areas with usable coordinates. Tested. |
| `src/features/map/components/MapView.tsx` | The only file importing `maplibre-gl` (+ its CSS). Lazy-loaded. |
| `src/features/map/components/AreaCard.tsx` | Selected-marker card: name + "Go to crag" link + close. |
| `src/features/map/components/AreaList.tsx` | Scrollable area list below the map. |
| `src/features/map/components/LocateButton.tsx` | Geolocation control. |

Feature imports only from `src/types/` — no cross-feature imports. The route composes at the app level (house pattern). No barrel files.

## Routing, data, states (route file)

`map.tsx` stays static (not itself lazy) so the shell + area list paint immediately:

```
const MapView = lazy(() => import('../../features/map/components/MapView'))
```

- Data: one `useAreas()`. No route-count fetch.
- Coordinate guard: `areasWithCoords(areas)` drops areas whose `latitude`/`longitude` are absent or exactly `0,0` (null-island — unset DB coordinates would otherwise drop a marker off West Africa).
- Loading: pulse skeleton in the map's shape. Error: full-width "Couldn't load the map — tap to retry" button → `useAreas().refetch` (house pattern).
- `<Suspense fallback={mapSkeleton}>` around `MapView` so the lazy chunk downloading on cellular shows the skeleton, not a blank gap.
- Selection state (`selectedId: number | null`) lives in the route and is passed to both `MapView` and `AreaList`, so a marker tap and a list-row tap stay in sync.

## MapView (the MapLibre wrapper)

Props: `{ areas: ClimbingArea[]; selectedId: number | null; onSelect: (id: number | null) => void }`. Imports `maplibre-gl` and `'maplibre-gl/dist/maplibre-gl.css'` (both ride the lazy chunk).

- On mount: `new maplibregl.Map({ container, style: 'https://tiles.openfreemap.org/styles/liberty' })`, then fit bounds to all area markers (a sensible Norway/Bergen default center + zoom when only one area).
- **Markers:** one `maplibregl.Marker` per area at `[longitude, latitude]` using a custom accent-colored DOM pin; click → `onSelect(area.id)`. The marker matching `selectedId` gets a scaled/ringed variant (the sketch's Sotra highlight), updated via refs on `selectedId` change — not a full re-mount.
- **Selected card:** `AreaCard` overlays the bottom of the map (absolute), shown when `selectedId` is set: area name + `Go to crag →` (`Link` to `/areas/$areaId`) + close (×) that calls `onSelect(null)`. Tapping the map background also clears selection.
- **Locate-me:** `LocateButton` (bottom-right, over the map) calls `navigator.geolocation.getCurrentPosition` on demand only (never auto on load); success flies the map to the position and drops a distinct blue user-dot marker; denial/failure shows a small inline "Location unavailable" note.
- **Fullscreen:** expand button (top-right) toggles the Fullscreen API on the map container; a `fullscreenchange` listener calls `map.resize()` so the canvas re-fits; the icon swaps expand/collapse.
- **Cleanup:** `map.remove()`, geolocation and `fullscreenchange` listener teardown on unmount.

## AreaList

Below the map. Each area is a tappable row (name + region) linking to `/areas/$areaId`; the row also calls `onSelect(area.id)` so the map card + marker highlight sync. Same row styling as the crag list. Empty data → "No crags yet" nudge.

## Testing

MapLibre renders to a WebGL canvas that jsdom cannot execute, so logic is extracted from the canvas and tested; the wrapper gets a light mocked-module smoke test plus manual browser verification.

- `areasWithCoords.test.ts` — keeps valid coords, drops missing and exact `0,0`.
- `AreaCard.test.tsx` — renders name, "Go to crag" links to `/areas/$id`, close fires `onSelect(null)`. (Mock `@tanstack/react-router` `Link`, house pattern.)
- `AreaList.test.tsx` — rows render with link targets; row tap fires `onSelect(id)`; empty nudge.
- `LocateButton.test.tsx` — mock `navigator.geolocation`: success fires the locate callback with coords; denial shows the note; no geolocation call on mount.
- `MapView.test.tsx` — `vi.mock('maplibre-gl')`: asserts the map is constructed with the OpenFreeMap style URL, one `Marker` per area, and `map.remove()` on unmount. Thin smoke test; real rendering verified in the browser preview.
- Route file thin, untested (house pattern).

## Out of scope

- Route count on the card — backend `routeCount` follow-up (file a climbing-api issue during implementation).
- Filter chips (sport/boulder/trad).
- Marker clustering / offline tiles.
- Editing area coordinates.
