# Personal Ticks Page Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the `/ticks` tab stub with the personal tick log from climbing-web#40: a dashboard (stat cards, grade pyramid, recent ticks) and a filterable/sortable all-ticks list.

**Architecture:** Pure client-side join (`enrichTicks`) of the user's ticks with the routes/walls/areas collections, composed at the app level (route files) per the no-cross-feature-imports rule; presentational feature components receive `EnrichedTick[]` as props. Norwegian-scale grade parsing powers "hardest" and the pyramid.

**Tech Stack:** React 19, TanStack Router v1 (file-based) + Query v5, Tailwind v4 tokens, Vitest + Testing Library.

**Spec:** `docs/superpowers/specs/2026-07-04-ticks-page-design.md` (read it first).

## Global Constraints

- Work happens on branch `feature/40-ticks-page` in the current worktree.
- **Precondition:** the branch base must contain the AreasList.test.tsx brace fix (PR #47, commit `43ae8e3`) or the suite won't parse. Task 1 Step 0 handles this.
- TDD is mandatory: write the failing test, watch it fail, then implement (see each task).
- Grades are **Norwegian scale**: `^[1-9][+-]?$` (e.g. `6-`, `6`, `6+`). NOT French (`6a`, `7b+`).
- Color/utility tokens only: `bg-paper`, `bg-paper-2`, `text-ink`, `text-ink-2`, `text-ink-3`, `text-accent`, `border-ink/…` etc. Mobile-first, big tap targets.
- No barrel files; import files directly. No cross-feature imports (features may import `src/types/`, `src/hooks/`, `src/lib/`; only `src/app/` composes features).
- Domain type is `ClimbingRoute`, never `Route` (route files must export `const Route = createFileRoute(...)`).
- Commits end with: `Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>`
- Push with `git -c credential.helper='!gh auth git-credential' push` (plain push fails).
- `npm test` = Vitest once. Single file: `npx vitest run <path>`. Full check: `npm test && npm run lint && npm run build`.
- Adding a new route file breaks `npm run build` until the route tree regenerates: run `npx vite build` once first (see Task 5).

---

### Task 1: Norwegian grade utility

**Files:**
- Create: `src/features/ticks/utils/norwegianGrade.ts`
- Test: `src/features/ticks/utils/norwegianGrade.test.ts`

**Interfaces:**
- Consumes: nothing.
- Produces: `parseNorwegianGrade(grade: string): number | null` (comparable rank; higher = harder; `null` = unparseable) and `compareNorwegianGrades(a: string, b: string): number` (sort comparator: **hardest first**, unparseable grades last).

- [ ] **Step 0: Branch setup**

```bash
git fetch origin
git checkout -b feature/40-ticks-page origin/main
git merge --no-edit docs/ticks-page-spec   # bring spec+plan into the feature branch
npm test
```
Expected: suite green (60 tests). If `AreasList.test.tsx` fails with a parsing error, PR #47 isn't merged yet — run `git cherry-pick 43ae8e3` and re-run `npm test`.

- [ ] **Step 1: Write the failing tests**

Create `src/features/ticks/utils/norwegianGrade.test.ts`:

```ts
import { describe, it, expect } from 'vitest'
import { parseNorwegianGrade, compareNorwegianGrades } from './norwegianGrade'

describe('parseNorwegianGrade', () => {
  it('parses plain, plus and minus grades', () => {
    expect(parseNorwegianGrade('6')).not.toBeNull()
    expect(parseNorwegianGrade('6-')).not.toBeNull()
    expect(parseNorwegianGrade('6+')).not.toBeNull()
    expect(parseNorwegianGrade('1')).not.toBeNull()
    expect(parseNorwegianGrade(' 9+ ')).not.toBeNull() // tolerates whitespace
  })

  it('orders ranks correctly: 5+ < 6- < 6 < 6+ < 7-', () => {
    const ranks = ['5+', '6-', '6', '6+', '7-'].map(g => parseNorwegianGrade(g)!)
    const sorted = [...ranks].sort((a, b) => a - b)
    expect(ranks).toEqual(sorted)
    expect(new Set(ranks).size).toBe(5) // all distinct
  })

  it('rejects non-Norwegian grades', () => {
    for (const bad of ['6a', '6b+', '10', '0', '', '6++', '+6', 'abc']) {
      expect(parseNorwegianGrade(bad)).toBeNull()
    }
  })
})

describe('compareNorwegianGrades', () => {
  it('sorts hardest first with unparseable grades last', () => {
    const grades = ['6', '', '7-', '6a', '6+']
    const sorted = [...grades].sort(compareNorwegianGrades)
    expect(sorted.slice(0, 3)).toEqual(['7-', '6+', '6'])
    expect(sorted.slice(3)).toEqual(expect.arrayContaining(['', '6a']))
  })
})
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run src/features/ticks/utils/norwegianGrade.test.ts`
Expected: FAIL — module `./norwegianGrade` not found.

- [ ] **Step 3: Write minimal implementation**

Create `src/features/ticks/utils/norwegianGrade.ts`:

```ts
/**
 * Norwegian sport-climbing grades: an integer 1-9 with an optional
 * `-` or `+` suffix. Ordering: 6- < 6 < 6+ < 7-. This app does NOT
 * use French grades (6a/6b+), despite older wireframes showing them.
 */
const GRADE_RE = /^([1-9])([+-]?)$/

/** Comparable rank for a grade, or null when the string isn't a Norwegian grade. */
export const parseNorwegianGrade = (grade: string): number | null => {
  const m = GRADE_RE.exec(grade.trim())
  if (!m) return null
  const base = Number(m[1]) * 3
  if (m[2] === '-') return base - 1
  if (m[2] === '+') return base + 1
  return base
}

/** Sort comparator: hardest grade first; unparseable grades last. */
export const compareNorwegianGrades = (a: string, b: string): number => {
  const ra = parseNorwegianGrade(a)
  const rb = parseNorwegianGrade(b)
  if (ra === null && rb === null) return 0
  if (ra === null) return 1
  if (rb === null) return -1
  return rb - ra
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run src/features/ticks/utils/norwegianGrade.test.ts`
Expected: PASS (4 tests).

- [ ] **Step 5: Commit**

```bash
git add src/features/ticks/utils/norwegianGrade.ts src/features/ticks/utils/norwegianGrade.test.ts
git commit -m "Add Norwegian grade parser and comparator (#40)

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
```

---

### Task 2: enrichTicks join

**Files:**
- Create: `src/features/ticks/utils/enrichTicks.ts`
- Test: `src/features/ticks/utils/enrichTicks.test.ts`

**Interfaces:**
- Consumes: types `UserRouteTick`, `ClimbingRoute`, `Wall`, `ClimbingArea` from `src/types/api.ts`.
- Produces:
  ```ts
  export interface EnrichedTick {
    tick: UserRouteTick
    route?: ClimbingRoute
    wall?: Wall
    area?: ClimbingArea
  }
  export const enrichTicks = (
    ticks: UserRouteTick[],
    routes: ClimbingRoute[],
    walls: Wall[],
    areas: ClimbingArea[],
  ): EnrichedTick[]  // sorted by tick.tickedAt descending (newest first)
  ```

- [ ] **Step 1: Write the failing tests**

Create `src/features/ticks/utils/enrichTicks.test.ts`:

```ts
import { describe, it, expect } from 'vitest'
import { enrichTicks } from './enrichTicks'
import type { ClimbingArea, ClimbingRoute, UserRouteTick, Wall } from '../../../types/api'

const tick = (id: number, routeId: number, tickedAt: string): UserRouteTick => ({
  id, userId: 7, routeId, tickedAt, style: 'redpoint', rating: 3, personalNote: '',
})
const route = (id: number, wallId: number, name: string): ClimbingRoute => ({
  id, wallId, name, grade: '6+', length: 20, style: 'sport', bolts: 8,
  ropeLengths: 1, firstAscendant: '', description: '', createdAt: '2026-01-01T00:00:00Z',
})
const wall = (id: number, areaId: number, name: string): Wall => ({
  id, areaId, name, description: '', latitude: null, longitude: null,
  approachInfo: '', imageUrl: null, createdAt: '2026-01-01T00:00:00Z',
})
const area = (id: number, name: string): ClimbingArea => ({
  id, name, description: '', latitude: 0, longitude: 0, region: 'Bergen',
  createdAt: '2026-01-01T00:00:00Z',
})

describe('enrichTicks', () => {
  it('joins tick -> route -> wall -> area by ids', () => {
    const result = enrichTicks(
      [tick(1, 10, '2026-05-12T10:00:00Z')],
      [route(10, 20, 'Nordavind')],
      [wall(20, 30, 'Hovedveggen')],
      [area(30, 'Tellevikhola')],
    )
    expect(result).toHaveLength(1)
    expect(result[0].route?.name).toBe('Nordavind')
    expect(result[0].wall?.name).toBe('Hovedveggen')
    expect(result[0].area?.name).toBe('Tellevikhola')
  })

  it('sorts newest first', () => {
    const result = enrichTicks(
      [tick(1, 10, '2026-04-01T00:00:00Z'), tick(2, 10, '2026-05-12T00:00:00Z')],
      [route(10, 20, 'Nordavind')], [wall(20, 30, 'W')], [area(30, 'A')],
    )
    expect(result.map(r => r.tick.id)).toEqual([2, 1])
  })

  it('keeps ticks whose route/wall/area is missing, with undefined joins', () => {
    const result = enrichTicks([tick(1, 999, '2026-05-12T00:00:00Z')], [], [], [])
    expect(result).toHaveLength(1)
    expect(result[0].route).toBeUndefined()
    expect(result[0].wall).toBeUndefined()
    expect(result[0].area).toBeUndefined()
  })
})
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run src/features/ticks/utils/enrichTicks.test.ts`
Expected: FAIL — module `./enrichTicks` not found.

- [ ] **Step 3: Write minimal implementation**

Create `src/features/ticks/utils/enrichTicks.ts`:

```ts
import type { ClimbingArea, ClimbingRoute, UserRouteTick, Wall } from '../../../types/api'

export interface EnrichedTick {
  tick: UserRouteTick
  route?: ClimbingRoute
  wall?: Wall
  area?: ClimbingArea
}

/**
 * Client-side join of a user's ticks with the route/wall/area collections.
 * Future-proofing seam: when the backend grows an enriched ticks endpoint,
 * this function retires and EnrichedTick[] stays the component contract.
 */
export const enrichTicks = (
  ticks: UserRouteTick[],
  routes: ClimbingRoute[],
  walls: Wall[],
  areas: ClimbingArea[],
): EnrichedTick[] => {
  const routeById = new Map(routes.map(r => [r.id, r]))
  const wallById = new Map(walls.map(w => [w.id, w]))
  const areaById = new Map(areas.map(a => [a.id, a]))

  return ticks
    .map(tick => {
      const route = routeById.get(tick.routeId)
      const wall = route ? wallById.get(route.wallId) : undefined
      const area = wall ? areaById.get(wall.areaId) : undefined
      return { tick, route, wall, area }
    })
    .sort((a, b) => b.tick.tickedAt.localeCompare(a.tick.tickedAt))
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run src/features/ticks/utils/enrichTicks.test.ts`
Expected: PASS (3 tests).

- [ ] **Step 5: Commit**

```bash
git add src/features/ticks/utils/enrichTicks.ts src/features/ticks/utils/enrichTicks.test.ts
git commit -m "Add enrichTicks client-side join (#40)

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
```

---

### Task 3: TickRow + empty state components

**Files:**
- Create: `src/features/ticks/components/TickRow.tsx`
- Create: `src/features/ticks/components/TicksEmptyState.tsx`
- Test: `src/features/ticks/components/TickRow.test.tsx`

**Interfaces:**
- Consumes: `EnrichedTick` from `../utils/enrichTicks` (Task 2).
- Produces: `TickRow({ item, showStars }: { item: EnrichedTick; showStars?: boolean })` — links to the route detail page when route+wall joined, plain row otherwise. `TicksEmptyState()` — zero-ticks nudge, links to `/`.

- [ ] **Step 1: Write the failing tests**

Create `src/features/ticks/components/TickRow.test.tsx`:

```tsx
import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import type { EnrichedTick } from '../utils/enrichTicks'
import type { ClimbingRoute, UserRouteTick, Wall } from '../../../types/api'

// Link needs router context we don't have here — render a plain anchor.
vi.mock('@tanstack/react-router', () => ({
  Link: ({ children, className }: { children: React.ReactNode; className?: string }) => (
    <a className={className}>{children}</a>
  ),
}))

import { TickRow } from './TickRow'

const tick = (over: Partial<UserRouteTick> = {}): UserRouteTick => ({
  id: 1, userId: 7, routeId: 10, tickedAt: '2026-05-12T10:00:00Z',
  style: 'redpoint', rating: 4, personalNote: '', ...over,
})
const route: ClimbingRoute = {
  id: 10, wallId: 20, name: 'Nordavind', grade: '6+', length: 20, style: 'sport',
  bolts: 8, ropeLengths: 1, firstAscendant: '', description: '', createdAt: '2026-01-01T00:00:00Z',
}
const wall: Wall = {
  id: 20, areaId: 30, name: 'Tellevikhola', description: '', latitude: null,
  longitude: null, approachInfo: '', imageUrl: null, createdAt: '2026-01-01T00:00:00Z',
}

describe('TickRow', () => {
  it('shows grade badge, name, location, style initials and short date', () => {
    const item: EnrichedTick = { tick: tick(), route, wall }
    render(<TickRow item={item} />)

    expect(screen.getByText('6+')).toBeInTheDocument()
    expect(screen.getByText('Nordavind')).toBeInTheDocument()
    expect(screen.getByText('Tellevikhola')).toBeInTheDocument()
    expect(screen.getByText('RP')).toBeInTheDocument()
    expect(screen.getByText('12 May')).toBeInTheDocument()
  })

  it('degrades when the route is missing: ? badge, no location, no link', () => {
    const item: EnrichedTick = { tick: tick() }
    const { container } = render(<TickRow item={item} />)

    expect(screen.getByText('?')).toBeInTheDocument()
    expect(screen.getByText('Unknown route')).toBeInTheDocument()
    expect(container.querySelector('a')).not.toBeInTheDocument()
  })

  it('shows stars only when showStars is set and rating > 0', () => {
    const item: EnrichedTick = { tick: tick({ rating: 3 }), route, wall }
    const { container, rerender } = render(<TickRow item={item} />)
    expect(container.textContent).not.toContain('★')

    rerender(<TickRow item={item} showStars />)
    expect(container.textContent).toContain('★★★')

    rerender(<TickRow item={{ tick: tick({ rating: 0 }), route, wall }} showStars />)
    expect(container.textContent).not.toContain('★')
  })
})
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run src/features/ticks/components/TickRow.test.tsx`
Expected: FAIL — module `./TickRow` not found.

- [ ] **Step 3: Write the implementation**

Create `src/features/ticks/components/TickRow.tsx`:

```tsx
import { Link } from '@tanstack/react-router'
import type { EnrichedTick } from '../utils/enrichTicks'

const STYLE_INITIALS: Record<string, string> = {
  onsight: 'OS',
  flash: 'FL',
  redpoint: 'RP',
  'free solo': 'FS',
}

/** '2026-05-12T10:00:00Z' -> '12 May'; empty string for invalid dates. */
const shortDate = (iso: string): string => {
  const d = new Date(iso)
  return Number.isNaN(d.getTime())
    ? ''
    : d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })
}

const RowBody = ({ item, showStars }: { item: EnrichedTick; showStars?: boolean }) => {
  const { tick, route, wall, area } = item
  const initials = STYLE_INITIALS[tick.style]
  const location = wall?.name || area?.name || ''
  return (
    <>
      <span className="shrink-0 min-w-12 h-10 px-2 flex items-center justify-center rounded-lg border border-ink/20 bg-paper text-[14px] font-bold text-ink">
        {route?.grade || '?'}
      </span>
      <span className="flex-1 min-w-0">
        <span className="flex items-center gap-2">
          <span className="text-[14px] font-semibold text-ink truncate">
            {route?.name ?? 'Unknown route'}
          </span>
          {initials && (
            <span className="shrink-0 text-[9px] font-bold text-accent border border-accent rounded-full px-1.5 py-0.5">
              {initials}
            </span>
          )}
        </span>
        {location && <span className="block text-[12px] text-ink-3 truncate">{location}</span>}
      </span>
      <span className="shrink-0 flex flex-col items-end gap-1">
        {showStars && tick.rating > 0 && (
          <span className="text-[11px] leading-none text-accent">
            {'★'.repeat(tick.rating)}
            <span className="text-ink/20">{'★'.repeat(5 - tick.rating)}</span>
          </span>
        )}
        <span className="text-[11px] text-ink-3">{shortDate(tick.tickedAt)}</span>
      </span>
    </>
  )
}

export const TickRow = ({ item, showStars }: { item: EnrichedTick; showStars?: boolean }) => {
  const { route, wall } = item
  const rowClass = 'flex items-center gap-3 py-2.5 border-b border-dashed border-ink/15'
  if (route && wall) {
    return (
      <Link
        to="/areas/$areaId/walls/$wallId/routes/$routeId"
        params={{
          areaId: String(wall.areaId),
          wallId: String(wall.id),
          routeId: String(route.id),
        }}
        data-testid="tick-row"
        className={`${rowClass} active:bg-paper-2`}
      >
        <RowBody item={item} showStars={showStars} />
      </Link>
    )
  }
  return (
    <div data-testid="tick-row" className={rowClass}>
      <RowBody item={item} showStars={showStars} />
    </div>
  )
}
```

Create `src/features/ticks/components/TicksEmptyState.tsx`:

```tsx
import { Link } from '@tanstack/react-router'

export const TicksEmptyState = () => (
  <div className="flex flex-col items-center gap-3 py-16 px-4 text-center">
    <p className="text-sm text-ink-2">No ticks yet — find a crag and log your first send</p>
    <Link to="/" className="text-sm font-semibold text-accent">
      Explore crags →
    </Link>
  </div>
)
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run src/features/ticks/components/TickRow.test.tsx`
Expected: PASS (3 tests).

- [ ] **Step 5: Commit**

```bash
git add src/features/ticks/components/TickRow.tsx src/features/ticks/components/TicksEmptyState.tsx src/features/ticks/components/TickRow.test.tsx
git commit -m "Add TickRow and TicksEmptyState components (#40)

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
```

---

### Task 4: Dashboard component + /ticks route

**Files:**
- Create: `src/features/ticks/components/TicksDashboard.tsx`
- Modify: `src/app/routes/ticks.tsx` (replace stub entirely)
- Test: `src/features/ticks/components/TicksDashboard.test.tsx`

**Interfaces:**
- Consumes: `EnrichedTick`/`enrichTicks` (Task 2), `parseNorwegianGrade` (Task 1), `TickRow`, `TicksEmptyState` (Task 3), hooks `useCurrentUser`, `useTicksByUser`, `useRoutes`, `useWalls`, `useAreas` (all pre-existing).
- Produces: `TicksDashboard({ ticks, isLoading, isError, onRetry }: { ticks: EnrichedTick[]; isLoading: boolean; isError: boolean; onRetry: () => void })`.

- [ ] **Step 1: Write the failing tests**

Create `src/features/ticks/components/TicksDashboard.test.tsx`:

```tsx
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { fireEvent, render, screen } from '@testing-library/react'
import type { EnrichedTick } from '../utils/enrichTicks'
import type { ClimbingRoute, UserRouteTick } from '../../../types/api'

vi.mock('@tanstack/react-router', () => ({
  Link: ({ children, className }: { children: React.ReactNode; className?: string }) => (
    <a className={className}>{children}</a>
  ),
}))

import { TicksDashboard } from './TicksDashboard'

const route = (id: number, grade: string, name = `R${id}`): ClimbingRoute => ({
  id, wallId: 20, name, grade, length: 20, style: 'sport', bolts: 8,
  ropeLengths: 1, firstAscendant: '', description: '', createdAt: '2026-01-01T00:00:00Z',
})
const item = (id: number, grade: string, tickedAt: string): EnrichedTick => ({
  tick: {
    id, userId: 7, routeId: id, tickedAt, style: 'redpoint', rating: 3, personalNote: '',
  } as UserRouteTick,
  route: route(id, grade),
})

// Newest-first, as enrichTicks guarantees.
const items: EnrichedTick[] = [
  item(1, '7-', '2026-07-02T10:00:00Z'),
  item(2, '6+', '2026-07-01T10:00:00Z'),
  item(3, '6+', '2026-06-20T10:00:00Z'),
  item(4, '6',  '2026-05-01T10:00:00Z'),
]

describe('TicksDashboard', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-07-04T12:00:00Z'))
  })
  afterEach(() => vi.useRealTimers())

  const noop = () => {}

  it('computes the three stat cards', () => {
    render(<TicksDashboard ticks={items} isLoading={false} isError={false} onRetry={noop} />)

    // testids, not getByText: the same digits/grades also appear in pyramid bars
    expect(screen.getByTestId('stat-routes')).toHaveTextContent('4')
    expect(screen.getByTestId('stat-hardest')).toHaveTextContent('7-')
    expect(screen.getByTestId('stat-this month')).toHaveTextContent('2') // July 2026
  })

  it('renders pyramid bars hardest-first with counts', () => {
    render(<TicksDashboard ticks={items} isLoading={false} isError={false} onRetry={noop} />)

    const bars = screen.getAllByTestId('pyramid-bar')
    expect(bars.map(b => b.getAttribute('data-grade'))).toEqual(['7-', '6+', '6'])
    expect(bars.map(b => b.getAttribute('data-count'))).toEqual(['1', '2', '1'])
  })

  it('shows the 3 newest ticks under recent', () => {
    render(<TicksDashboard ticks={items} isLoading={false} isError={false} onRetry={noop} />)

    expect(screen.getByText('R1')).toBeInTheDocument()
    expect(screen.getByText('R3')).toBeInTheDocument()
    expect(screen.queryByText('R4')).not.toBeInTheDocument()
    expect(screen.getByText(/see all/)).toBeInTheDocument()
  })

  it('shows tap-to-retry on error and calls onRetry', () => {
    const onRetry = vi.fn()
    render(<TicksDashboard ticks={[]} isLoading={false} isError onRetry={onRetry} />)

    fireEvent.click(screen.getByRole('button', { name: /couldn't load ticks/i }))
    expect(onRetry).toHaveBeenCalledTimes(1)
  })

  it('shows skeletons while loading and the empty nudge with zero ticks', () => {
    const { container, rerender } = render(
      <TicksDashboard ticks={[]} isLoading isError={false} onRetry={noop} />,
    )
    expect(container.querySelector('.animate-pulse')).toBeInTheDocument()

    rerender(<TicksDashboard ticks={[]} isLoading={false} isError={false} onRetry={noop} />)
    expect(screen.getByText(/No ticks yet/)).toBeInTheDocument()
  })
})
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run src/features/ticks/components/TicksDashboard.test.tsx`
Expected: FAIL — module `./TicksDashboard` not found.

- [ ] **Step 3: Write the implementation**

Create `src/features/ticks/components/TicksDashboard.tsx`:

```tsx
import { Link } from '@tanstack/react-router'
import { parseNorwegianGrade } from '../utils/norwegianGrade'
import type { EnrichedTick } from '../utils/enrichTicks'
import { TickRow } from './TickRow'
import { TicksEmptyState } from './TicksEmptyState'

interface TicksDashboardProps {
  ticks: EnrichedTick[]
  isLoading: boolean
  isError: boolean
  onRetry: () => void
}

const StatCard = ({ value, label }: { value: string; label: string }) => (
  <div className="flex-1 flex flex-col items-center justify-center gap-0.5 rounded-xl border border-ink/20 bg-paper py-3">
    <span data-testid={`stat-${label}`} className="text-[20px] font-bold text-ink leading-none">
      {value}
    </span>
    <span className="text-[10px] text-ink-3">{label}</span>
  </div>
)

const Skeleton = () => (
  <div className="flex flex-col gap-3">
    <div className="flex gap-2">
      {[0, 1, 2].map(i => (
        <div key={i} className="flex-1 h-16 rounded-xl bg-paper-2 animate-pulse" />
      ))}
    </div>
    <div className="h-40 rounded-xl bg-paper-2 animate-pulse" />
    {[0, 1, 2].map(i => (
      <div key={i} className="h-12 rounded-lg bg-paper-2 animate-pulse" />
    ))}
  </div>
)

export const TicksDashboard = ({ ticks, isLoading, isError, onRetry }: TicksDashboardProps) => {
  // Grade stats only consider ticks whose joined route grade parses as Norwegian.
  const graded = ticks
    .map(t => ({ grade: t.route?.grade ?? '', rank: parseNorwegianGrade(t.route?.grade ?? '') }))
    .filter((g): g is { grade: string; rank: number } => g.rank !== null)

  const hardest = graded.length
    ? graded.reduce((max, g) => (g.rank > max.rank ? g : max)).grade
    : '—'

  const now = new Date()
  const thisMonth = ticks.filter(t => {
    const d = new Date(t.tick.tickedAt)
    return d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth()
  }).length

  const counts = new Map<string, { rank: number; count: number }>()
  for (const g of graded) {
    const entry = counts.get(g.grade)
    if (entry) entry.count += 1
    else counts.set(g.grade, { rank: g.rank, count: 1 })
  }
  const bars = [...counts.entries()]
    .map(([grade, { rank, count }]) => ({ grade, rank, count }))
    .sort((a, b) => b.rank - a.rank)
  const maxCount = Math.max(1, ...bars.map(b => b.count))

  return (
    <div className="flex flex-col gap-4 px-4 pt-4 pb-2">
      <h1 className="text-3xl font-bold text-ink italic">Your ticks</h1>

      {isError ? (
        <button
          onClick={onRetry}
          className="w-full text-sm text-ink-2 text-center py-8 active:text-ink"
        >
          Couldn't load ticks — tap to retry
        </button>
      ) : isLoading ? (
        <Skeleton />
      ) : ticks.length === 0 ? (
        <TicksEmptyState />
      ) : (
        <>
          {/* stat cards */}
          <div className="flex gap-2">
            <StatCard value={String(ticks.length)} label="routes" />
            <StatCard value={hardest} label="hardest" />
            <StatCard value={String(thisMonth)} label="this month" />
          </div>

          {/* grade pyramid */}
          {bars.length > 0 && (
            <div className="rounded-xl border border-ink/20 bg-paper p-3">
              <p className="text-[11px] text-ink-3 mb-2">grade pyramid</p>
              <div className="flex flex-col gap-1.5">
                {bars.map(bar => (
                  <div
                    key={bar.grade}
                    data-testid="pyramid-bar"
                    data-grade={bar.grade}
                    data-count={bar.count}
                    className="flex items-center gap-2"
                  >
                    <span className="w-6 shrink-0 text-[11px] text-ink-2 text-right">{bar.grade}</span>
                    <div className="flex-1">
                      <div
                        className="h-3.5 rounded-sm bg-accent/80"
                        style={{ width: `${(bar.count / maxCount) * 100}%` }}
                      />
                    </div>
                    <span className="w-5 shrink-0 text-[11px] text-ink-3 text-right">{bar.count}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* recent */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <h2 className="text-[15px] font-bold text-ink">recent</h2>
              <Link to="/ticks/all" className="text-[12px] text-ink-2">
                see all →
              </Link>
            </div>
            {ticks.slice(0, 3).map(item => (
              <TickRow key={item.tick.id} item={item} />
            ))}
          </div>
        </>
      )}
    </div>
  )
}
```

Note: `to="/ticks/all"` won't type-check until Task 5 creates the route file — that's fine, this task only runs the component test (jsdom + mocked Link). The full `npm run build` gate happens in Task 5/6.

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run src/features/ticks/components/TicksDashboard.test.tsx`
Expected: PASS (5 tests).

- [ ] **Step 5: Replace the /ticks route stub**

Overwrite `src/app/routes/ticks.tsx` with:

```tsx
import { createFileRoute } from '@tanstack/react-router'
import { useCurrentUser } from '../../features/users/hooks/useCurrentUser'
import { useTicksByUser } from '../../features/ticks/hooks/useTicksByUser'
import { useRoutes } from '../../features/routes/hooks/useRoutes'
import { useWalls } from '../../features/walls/hooks/useWalls'
import { useAreas } from '../../features/areas/hooks/useAreas'
import { enrichTicks } from '../../features/ticks/utils/enrichTicks'
import { TicksDashboard } from '../../features/ticks/components/TicksDashboard'

export const Route = createFileRoute('/ticks')({
  component: TicksPage,
})

// Cross-feature data is composed here, at the app level (see CLAUDE.md).
function TicksPage() {
  const userQ = useCurrentUser()
  const userId = userQ.data?.id ?? 0
  const ticksQ = useTicksByUser(userId, { enabled: userId > 0 })
  const routesQ = useRoutes()
  const wallsQ = useWalls()
  const areasQ = useAreas()

  const ticks = enrichTicks(
    [...(ticksQ.data?.values() ?? [])],
    routesQ.data ?? [],
    wallsQ.data ?? [],
    areasQ.data ?? [],
  )
  const isError = userQ.isError || ticksQ.isError || routesQ.isError || wallsQ.isError || areasQ.isError
  const isLoading =
    userQ.isLoading || ticksQ.isPending || routesQ.isLoading || wallsQ.isLoading || areasQ.isLoading
  const onRetry = () => {
    userQ.refetch()
    ticksQ.refetch()
    routesQ.refetch()
    wallsQ.refetch()
    areasQ.refetch()
  }

  return <TicksDashboard ticks={ticks} isLoading={isLoading} isError={isError} onRetry={onRetry} />
}
```

(`ticksQ.isPending` not `isLoading`: the ticks query is disabled until the user loads, and a disabled query reports `isLoading: false` but `isPending: true`. While disabled, `userQ.isLoading` covers the spinner; `isError` is checked before `isLoading` in the component, so a user-fetch error still surfaces.)

- [ ] **Step 6: Run the full suite**

Run: `npm test`
Expected: all tests pass (dashboard suite + everything pre-existing).

- [ ] **Step 7: Commit**

```bash
git add src/features/ticks/components/TicksDashboard.tsx src/features/ticks/components/TicksDashboard.test.tsx src/app/routes/ticks.tsx
git commit -m "Add ticks dashboard: stats, grade pyramid, recent (#40)

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
```

---

### Task 5: All-ticks list + /ticks/all route

**Files:**
- Create: `src/features/ticks/components/TicksAllList.tsx`
- Create: `src/app/routes/ticks_.all.tsx` (trailing `_` un-nests: `ticks.tsx` has no `<Outlet />`, a nested child would never render — see CLAUDE.md "Un-nesting routes")
- Test: `src/features/ticks/components/TicksAllList.test.tsx`

**Interfaces:**
- Consumes: `EnrichedTick`/`enrichTicks` (Task 2), `compareNorwegianGrades` (Task 1), `TickRow`, `TicksEmptyState` (Task 3), same five pre-existing hooks as Task 4.
- Produces: `TicksAllList({ ticks, isLoading, isError, onRetry })` — same props shape as `TicksDashboard`.

- [ ] **Step 1: Write the failing tests**

Create `src/features/ticks/components/TicksAllList.test.tsx`:

```tsx
import { describe, it, expect, vi } from 'vitest'
import { fireEvent, render, screen } from '@testing-library/react'
import type { EnrichedTick } from '../utils/enrichTicks'
import type { ClimbingRoute, UserRouteTick } from '../../../types/api'

vi.mock('@tanstack/react-router', () => ({
  // Must pass data-testid through — the row-order assertions select on it.
  Link: ({
    children,
    className,
    'data-testid': testId,
  }: {
    children: React.ReactNode
    className?: string
    'data-testid'?: string
  }) => (
    <a className={className} data-testid={testId}>
      {children}
    </a>
  ),
}))

import { TicksAllList } from './TicksAllList'

const route = (id: number, grade: string, name: string): ClimbingRoute => ({
  id, wallId: 20, name, grade, length: 20, style: 'sport', bolts: 8,
  ropeLengths: 1, firstAscendant: '', description: '', createdAt: '2026-01-01T00:00:00Z',
})
const item = (
  id: number, grade: string, name: string, style: string, tickedAt: string, rating = 3,
): EnrichedTick => ({
  tick: { id, userId: 7, routeId: id, tickedAt, style, rating, personalNote: '' } as UserRouteTick,
  route: route(id, grade, name),
})

// Newest-first, as enrichTicks guarantees.
const items: EnrichedTick[] = [
  item(1, '6+', 'Nordavind', 'redpoint', '2026-05-12T10:00:00Z', 5),
  item(2, '5',  'Solveggen', 'flash',    '2026-05-03T10:00:00Z', 4),
  item(3, '7-', 'Storm',     'redpoint', '2026-04-21T10:00:00Z', 3),
]

const noop = () => {}

describe('TicksAllList', () => {
  it('shows the count and only chips for styles present in the data', () => {
    render(<TicksAllList ticks={items} isLoading={false} isError={false} onRetry={noop} />)

    expect(screen.getByText(/All ticks · 3/)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'All' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'FL' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'RP' })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'OS' })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'FS' })).not.toBeInTheDocument()
  })

  it('filters by style chip and updates the header count', () => {
    render(<TicksAllList ticks={items} isLoading={false} isError={false} onRetry={noop} />)

    fireEvent.click(screen.getByRole('button', { name: 'FL' }))

    expect(screen.getByText(/All ticks · 1/)).toBeInTheDocument()
    expect(screen.getByText('Solveggen')).toBeInTheDocument()
    expect(screen.queryByText('Nordavind')).not.toBeInTheDocument()
  })

  it('sorts by date by default and by grade (hardest first) on demand', () => {
    const { container } = render(
      <TicksAllList ticks={items} isLoading={false} isError={false} onRetry={noop} />,
    )
    const names = () =>
      Array.from(container.querySelectorAll('[data-testid="tick-row"]')).map(
        el => el.textContent ?? '',
      )

    expect(names()[0]).toContain('Nordavind') // newest

    fireEvent.change(screen.getByLabelText('Sort ticks'), { target: { value: 'grade' } })

    expect(names()[0]).toContain('Storm') // 7- is hardest
  })

  it('renders star ratings on rows', () => {
    const { container } = render(
      <TicksAllList ticks={[items[0]]} isLoading={false} isError={false} onRetry={noop} />,
    )
    expect(container.textContent).toContain('★★★★★')
  })

  it('shows tap-to-retry on error', () => {
    const onRetry = vi.fn()
    render(<TicksAllList ticks={[]} isLoading={false} isError onRetry={onRetry} />)

    fireEvent.click(screen.getByRole('button', { name: /couldn't load ticks/i }))
    expect(onRetry).toHaveBeenCalledTimes(1)
  })

  it('shows the empty nudge and hides chips with zero ticks', () => {
    render(<TicksAllList ticks={[]} isLoading={false} isError={false} onRetry={noop} />)

    expect(screen.getByText(/No ticks yet/)).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'All' })).not.toBeInTheDocument()
  })
})
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run src/features/ticks/components/TicksAllList.test.tsx`
Expected: FAIL — module `./TicksAllList` not found.

- [ ] **Step 3: Write the implementation**

Create `src/features/ticks/components/TicksAllList.tsx`:

```tsx
import { useState } from 'react'
import { Link } from '@tanstack/react-router'
import { compareNorwegianGrades } from '../utils/norwegianGrade'
import type { EnrichedTick } from '../utils/enrichTicks'
import { TickRow } from './TickRow'
import { TicksEmptyState } from './TicksEmptyState'

interface TicksAllListProps {
  ticks: EnrichedTick[]
  isLoading: boolean
  isError: boolean
  onRetry: () => void
}

// Canonical chip order; only styles present in the data render.
const STYLE_CHIPS: { value: string; label: string }[] = [
  { value: 'onsight', label: 'OS' },
  { value: 'flash', label: 'FL' },
  { value: 'redpoint', label: 'RP' },
  { value: 'free solo', label: 'FS' },
]

type SortBy = 'date' | 'grade'

export const TicksAllList = ({ ticks, isLoading, isError, onRetry }: TicksAllListProps) => {
  const [styleFilter, setStyleFilter] = useState('') // '' = All
  const [sortBy, setSortBy] = useState<SortBy>('date')

  const chips = STYLE_CHIPS.filter(c => ticks.some(t => t.tick.style === c.value))
  const filtered = styleFilter ? ticks.filter(t => t.tick.style === styleFilter) : ticks
  const sorted =
    sortBy === 'grade'
      ? [...filtered].sort((a, b) =>
          compareNorwegianGrades(a.route?.grade ?? '', b.route?.grade ?? ''),
        )
      : filtered // enrichTicks already sorts by date, newest first

  return (
    <div className="flex flex-col gap-3 px-4 pt-4 pb-2">
      {/* header */}
      <div className="flex items-center gap-2">
        <Link to="/ticks" className="text-[15px] text-ink-2">
          ‹
        </Link>
        <h1 className="text-xl font-bold text-ink italic">All ticks · {sorted.length}</h1>
      </div>

      {isError ? (
        <button
          onClick={onRetry}
          className="w-full text-sm text-ink-2 text-center py-8 active:text-ink"
        >
          Couldn't load ticks — tap to retry
        </button>
      ) : isLoading ? (
        <div className="flex flex-col gap-2">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="h-12 rounded-lg bg-paper-2 animate-pulse" />
          ))}
        </div>
      ) : ticks.length === 0 ? (
        <TicksEmptyState />
      ) : (
        <>
          {/* style chips + sort */}
          <div className="flex items-center justify-between gap-2">
            <div className="flex gap-2 overflow-x-auto no-scrollbar">
              <button
                onClick={() => setStyleFilter('')}
                className={`shrink-0 text-[11px] rounded-full border px-3 py-1 ${
                  styleFilter === '' ? 'bg-ink text-paper border-ink' : 'border-ink/25 text-ink-2 bg-paper'
                }`}
              >
                All
              </button>
              {chips.map(c => (
                <button
                  key={c.value}
                  onClick={() => setStyleFilter(c.value)}
                  className={`shrink-0 text-[11px] rounded-full border px-3 py-1 ${
                    styleFilter === c.value
                      ? 'bg-ink text-paper border-ink'
                      : 'border-ink/25 text-ink-2 bg-paper'
                  }`}
                >
                  {c.label}
                </button>
              ))}
            </div>
            <div className="relative shrink-0">
              <select
                aria-label="Sort ticks"
                value={sortBy}
                onChange={e => setSortBy(e.target.value as SortBy)}
                className="appearance-none text-[11px] text-ink-3 bg-transparent pr-4"
              >
                <option value="date">date</option>
                <option value="grade">grade</option>
              </select>
              <span
                aria-hidden
                className="pointer-events-none absolute right-0 top-1/2 -translate-y-1/2 text-[9px] text-ink-3"
              >
                ▾
              </span>
            </div>
          </div>

          {/* rows */}
          <div>
            {sorted.map(item => (
              <TickRow key={item.tick.id} item={item} showStars />
            ))}
          </div>
        </>
      )}
    </div>
  )
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run src/features/ticks/components/TicksAllList.test.tsx`
Expected: PASS (6 tests).

- [ ] **Step 5: Create the route file**

Create `src/app/routes/ticks_.all.tsx`:

```tsx
import { createFileRoute } from '@tanstack/react-router'
import { useCurrentUser } from '../../features/users/hooks/useCurrentUser'
import { useTicksByUser } from '../../features/ticks/hooks/useTicksByUser'
import { useRoutes } from '../../features/routes/hooks/useRoutes'
import { useWalls } from '../../features/walls/hooks/useWalls'
import { useAreas } from '../../features/areas/hooks/useAreas'
import { enrichTicks } from '../../features/ticks/utils/enrichTicks'
import { TicksAllList } from '../../features/ticks/components/TicksAllList'

export const Route = createFileRoute('/ticks_/all')({
  component: AllTicksPage,
})

// Cross-feature data is composed here, at the app level (see CLAUDE.md).
function AllTicksPage() {
  const userQ = useCurrentUser()
  const userId = userQ.data?.id ?? 0
  const ticksQ = useTicksByUser(userId, { enabled: userId > 0 })
  const routesQ = useRoutes()
  const wallsQ = useWalls()
  const areasQ = useAreas()

  const ticks = enrichTicks(
    [...(ticksQ.data?.values() ?? [])],
    routesQ.data ?? [],
    wallsQ.data ?? [],
    areasQ.data ?? [],
  )
  const isError = userQ.isError || ticksQ.isError || routesQ.isError || wallsQ.isError || areasQ.isError
  const isLoading =
    userQ.isLoading || ticksQ.isPending || routesQ.isLoading || wallsQ.isLoading || areasQ.isLoading
  const onRetry = () => {
    userQ.refetch()
    ticksQ.refetch()
    routesQ.refetch()
    wallsQ.refetch()
    areasQ.refetch()
  }

  return <TicksAllList ticks={ticks} isLoading={isLoading} isError={isError} onRetry={onRetry} />
}
```

Note the path string is `'/ticks_/all'` — the TanStack Router plugin strips the `_` from the URL (`/ticks/all`) but the `createFileRoute` argument must match the filename. If the generated route tree disagrees after Step 6, copy whatever literal the regenerated `routeTree.gen.ts` expects (the plugin rewrites the argument automatically on regeneration).

- [ ] **Step 6: Regenerate the route tree and run everything**

```bash
npx vite build   # regenerates routeTree.gen.ts so tsc can see the new route
npm test && npm run lint && npm run build
```
Expected: suite green, lint 0 errors (7 pre-existing fast-refresh warnings OK — the new route files add 2 more of that same warning type, also OK), build passes.

- [ ] **Step 7: Commit**

```bash
git add src/features/ticks/components/TicksAllList.tsx src/features/ticks/components/TicksAllList.test.tsx src/app/routes/ticks_.all.tsx src/app/routeTree.gen.ts
git commit -m "Add all-ticks list with style filter and date/grade sort (#40)

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
```

---

### Task 6: Backend follow-up issue, final verification, PR

**Files:**
- No source changes (verification + publishing only).

**Interfaces:**
- Consumes: everything from Tasks 1–5.
- Produces: a climbing-api issue, a pushed branch, and a PR closing #40.

- [ ] **Step 1: File the backend follow-up issue**

```bash
gh issue create --repo 585011/climbing-api \
  --title "Enriched + paginated ticks endpoint for the Ticks page" \
  --body "The frontend Ticks page (climbing-web#40) currently joins ticks with routes/walls/areas client-side by fetching all four collections, and \`GET /users/{id}/ticks?size=100\` silently caps at 100 ticks.

Follow-up (non-blocking, client works today):
- An enriched endpoint (e.g. \`GET /users/{id}/ticks?expand=route\`) returning each tick with its route (name, grade), wall (name, id, areaId) and area (name, id), so the client can drop the full-collection fetches. The frontend seam is ready: only the route-level query composition changes; \`EnrichedTick[]\` stays the component contract.
- Real pagination (page/size + total count) instead of the fixed \`size=100\`.

🤖 Generated with [Claude Code](https://claude.com/claude-code)"
```

- [ ] **Step 2: Full verification**

```bash
npm test && npm run lint && npm run build
git log --oneline origin/main..HEAD
```
Expected: green/0 errors/pass; log shows the spec, plan, and 5 implementation commits.

- [ ] **Step 3: Push and open the PR**

```bash
git -c credential.helper='!gh auth git-credential' push -u origin feature/40-ticks-page
gh pr create --repo 585011/climbing-web --head feature/40-ticks-page \
  --title "Add personal Ticks page: dashboard + all-ticks list" \
  --body "Closes #40

Implements the two wireframe screens (spec + plan in docs/superpowers/):

- **/ticks dashboard** — stat cards (routes / hardest / this month), grade pyramid (Norwegian scale: 6-, 6, 6+ — the wireframe's French-style grades were a mock artefact), 3 most recent ticks, see-all link.
- **/ticks/all** — style filter chips (only styles present in the data), date/grade sort, rows with star ratings. Un-nested route (\`ticks_.all.tsx\`).
- **Data**: pure \`enrichTicks\` client-side join composed at the app level (no cross-feature imports); backend enriched-endpoint + pagination follow-up filed on climbing-api.
- **States**: skeletons, tap-to-retry (same pattern as the crag list), zero-ticks nudge, per-row degradation when a route/wall was deleted.

All TDD: grade util, join, TickRow, dashboard, list — every suite written red-first.

🤖 Generated with [Claude Code](https://claude.com/claude-code)"
```

- [ ] **Step 4: Report**

Tell the user: PR link, backend issue link, and that the wireframe's gear icon + pyramid discipline dropdown were consciously omitted (spec: Out of scope).
