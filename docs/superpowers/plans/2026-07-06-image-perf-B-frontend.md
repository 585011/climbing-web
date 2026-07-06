# Image Performance — Plan B: Frontend (climbing-web)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.
>
> **Repository:** climbing-web (this repo). **Ship AFTER Plan A (backend) is deployed and backfilled** — the frontend reads the new `thumbnailUrl` the backend now returns. (Safe either way thanks to the `?? imageUrl` fallback, but backend-first means thumbnails show immediately.)

**Goal:** Serve the tiny `thumbnailUrl` variant to the crag list instead of the full wall image.

**Architecture:** Add `thumbnailUrl` to the Zod `WallSchema`. Extract the crag-card image selection into a small pure helper that prefers `thumbnailUrl` and falls back to `imageUrl`, and wire it into the Explore route.

**Tech Stack:** React 19, TanStack Query, Zod, Vitest + @testing-library/react.

## Global Constraints

- Reference spec: `docs/superpowers/specs/2026-07-06-image-performance-design.md`.
- `thumbnailUrl` is a short-lived presigned URL, same lifecycle as `imageUrl` — never cache long-term.
- Use `z.string().nullish()` (accepts string, null, or absent) so a wall record predating the backend deploy still parses.
- The crag list must prefer `thumbnailUrl`, falling back to `imageUrl` when the thumbnail is absent (unprocessed walls).
- Follow repo conventions: Zod schemas in `src/types/api.ts` inferred via `z.infer`; no barrel files; co-locate tests. Commands: `npm test`, `npm run lint`, `npm run build`. Commit trailer `Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>`.

---

### Task 1: Add thumbnailUrl to WallSchema

**Files:**
- Modify: `src/types/api.ts` (`WallSchema`)
- Test: `src/features/walls/api/getWalls.test.ts`

**Interfaces:**
- Produces: `Wall` type gains `thumbnailUrl?: string | null` (via `z.infer`).

- [ ] **Step 1: Write the failing test**

Add to `src/features/walls/api/getWalls.test.ts`:

```ts
  it('parses thumbnailUrl through the wall schema', async () => {
    get.mockResolvedValue({
      data: [
        {
          id: 1,
          areaId: 2,
          name: 'Main Wall',
          description: null,
          latitude: null,
          longitude: null,
          approachInfo: null,
          imageUrl: 'http://img/full.jpg',
          thumbnailUrl: 'http://img/thumb.jpg',
          createdAt: '2026-01-01T00:00:00Z',
        },
      ],
    })
    const walls = await getWalls()
    expect(walls[0].thumbnailUrl).toBe('http://img/thumb.jpg')
  })

  it('accepts a wall with no thumbnailUrl field (pre-backfill record)', async () => {
    get.mockResolvedValue({
      data: [
        {
          id: 1,
          areaId: 2,
          name: 'Old Wall',
          description: null,
          latitude: null,
          longitude: null,
          approachInfo: null,
          imageUrl: 'http://img/full.jpg',
          createdAt: '2026-01-01T00:00:00Z',
        },
      ],
    })
    const walls = await getWalls()
    expect(walls[0].thumbnailUrl ?? null).toBeNull()
  })
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npm test -- src/features/walls/api/getWalls.test.ts`
Expected: FAIL on the first new test — `walls[0].thumbnailUrl` is `undefined` because the schema strips the unknown key.

- [ ] **Step 3: Add the schema field**

In `src/types/api.ts`, inside `WallSchema`, add `thumbnailUrl` right after `imageUrl`:

```ts
  /** Short-lived (~15 min) presigned URL — always use the latest response, never cache long-term. */
  imageUrl: z.string().nullable(),
  /** Short-lived presigned URL for the small list thumbnail; may be absent on pre-backfill walls. */
  thumbnailUrl: z.string().nullish(),
  createdAt: z.string(),
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npm test -- src/features/walls/api/getWalls.test.ts`
Expected: PASS (both new tests + the existing one).

- [ ] **Step 5: Commit**

```bash
git add src/types/api.ts src/features/walls/api/getWalls.test.ts
git commit -m "feat: add thumbnailUrl to WallSchema

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

### Task 2: Serve thumbnailUrl to the crag list

**Files:**
- Create: `src/features/areas/utils/areaImageMap.ts`
- Test: `src/features/areas/utils/areaImageMap.test.ts`
- Modify: `src/app/routes/index.tsx`

**Interfaces:**
- Consumes: `Wall` (with `thumbnailUrl`, Task 1).
- Produces: `areaImageMap(walls: Wall[]): Map<number, string>` — first wall per area with an image, preferring `thumbnailUrl` then `imageUrl`.

- [ ] **Step 1: Write the failing test**

Create `src/features/areas/utils/areaImageMap.test.ts`:

```ts
import { describe, it, expect } from 'vitest'
import { areaImageMap } from './areaImageMap'
import type { Wall } from '../../../types/api'

const wall = (over: Partial<Wall>): Wall => ({
  id: 1,
  areaId: 1,
  name: 'W',
  description: '',
  latitude: null,
  longitude: null,
  approachInfo: '',
  imageUrl: null,
  thumbnailUrl: null,
  createdAt: '2026-01-01T00:00:00Z',
  ...over,
})

describe('areaImageMap', () => {
  it('prefers thumbnailUrl over imageUrl', () => {
    const map = areaImageMap([wall({ areaId: 5, imageUrl: 'full', thumbnailUrl: 'thumb' })])
    expect(map.get(5)).toBe('thumb')
  })

  it('falls back to imageUrl when thumbnailUrl is absent', () => {
    const map = areaImageMap([wall({ areaId: 5, imageUrl: 'full', thumbnailUrl: null })])
    expect(map.get(5)).toBe('full')
  })

  it('keeps the first wall with an image per area', () => {
    const map = areaImageMap([
      wall({ id: 1, areaId: 5, imageUrl: null, thumbnailUrl: null }),
      wall({ id: 2, areaId: 5, thumbnailUrl: 'thumb2' }),
      wall({ id: 3, areaId: 5, thumbnailUrl: 'thumb3' }),
    ])
    expect(map.get(5)).toBe('thumb2')
  })

  it('skips walls with no image at all', () => {
    const map = areaImageMap([wall({ areaId: 5, imageUrl: null, thumbnailUrl: null })])
    expect(map.has(5)).toBe(false)
  })
})
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npm test -- src/features/areas/utils/areaImageMap.test.ts`
Expected: FAIL — `areaImageMap` does not exist.

- [ ] **Step 3: Implement the helper**

Create `src/features/areas/utils/areaImageMap.ts`:

```ts
import type { Wall } from '../../../types/api'

/**
 * Maps each area id to a representative wall image for the crag list, taking the
 * first wall (in the given order) that has one. Prefers the small `thumbnailUrl`
 * variant and falls back to the full `imageUrl` for walls that predate backfill.
 */
export function areaImageMap(walls: Wall[]): Map<number, string> {
  const byArea = new Map<number, string>()
  for (const wall of walls) {
    const url = wall.thumbnailUrl ?? wall.imageUrl
    if (url && !byArea.has(wall.areaId)) {
      byArea.set(wall.areaId, url)
    }
  }
  return byArea
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npm test -- src/features/areas/utils/areaImageMap.test.ts`
Expected: PASS (4 tests).

- [ ] **Step 5: Wire it into the Explore route**

Replace the inline loop in `src/app/routes/index.tsx` with the helper:

```tsx
import { createFileRoute } from '@tanstack/react-router'
import { AreasList } from '../../features/areas/components/AreasList'
import { useWalls } from '../../features/walls/hooks/useWalls'
import { areaImageMap } from '../../features/areas/utils/areaImageMap'

function ExplorePage() {
  const { data: walls } = useWalls()
  const imageByAreaId = areaImageMap(walls ?? [])
  return <AreasList imageByAreaId={imageByAreaId} />
}

export const Route = createFileRoute('/')({
  component: ExplorePage,
})
```

- [ ] **Step 6: Run the full suite, lint, and build**

Run: `npm test` — Expected: all pass.
Run: `npm run lint` — Expected: 0 errors.
Run: `npm run build` — Expected: succeeds.

- [ ] **Step 7: Commit**

```bash
git add src/features/areas/utils/areaImageMap.ts src/features/areas/utils/areaImageMap.test.ts src/app/routes/index.tsx
git commit -m "feat: serve thumbnailUrl to the crag list

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

## Verification (preview)

After both tasks, start the dev server and confirm the crag list renders images from `thumbnailUrl` (Network tab shows the small thumbnail objects, not the multi-MB originals). Requires the backend running with backfilled data.

## Self-Review

**Spec coverage:** `WallSchema.thumbnailUrl` (Task 1) ✅; crag list prefers thumbnail with imageUrl fallback (Task 2) ✅; hero components consume `imageUrl` (now optimized) with no change — correct, not a task ✅; CSP `img-src` pinning intentionally deferred — not in this plan ✅.

**Placeholder scan:** No TBD/TODO; all code concrete.

**Type consistency:** `areaImageMap(walls: Wall[]): Map<number, string>` identical in Task 2 def, test, and index.tsx call. `thumbnailUrl` shape (`z.string().nullish()` → `string | null | undefined`) is consumed with `?? imageUrl`, which handles null and undefined. The Task 2 test's `wall()` factory includes `thumbnailUrl: null`, matching the schema-inferred optional field.
