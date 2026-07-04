# Personal Ticks Page — Design

**Date:** 2026-07-04
**Issue:** [climbing-web#40](https://github.com/585011/climbing-web/issues/40)
**Design reference:** wireframe screenshot attached to the issue (two screens: dashboard + all-ticks list). Note the wireframe renders French-looking grades (`6b+`, `7a`); real data uses the **Norwegian scale** — see Grades below.

## Goal

Replace the `/ticks` tab stub with the personal tick log shown in the wireframe: a dashboard (stats, grade pyramid, recent ticks) and a filterable, sortable full list. Mobile-first per the project UX target: legible in sunlight, one-handed, big tap targets.

## Decisions made during brainstorming

| Decision | Choice |
|---|---|
| Scope | Both wireframe screens in this feature |
| Grade system | Norwegian scale: integer 1–9 with optional `-`/`+` (`6-` < `6` < `6+` < `7-`). Not French. |
| Pyramid discipline dropdown (`sport ▾`) | Omitted — add when data has mixed disciplines |
| Data join | Client-side (approach A), with a backend enriched-endpoint follow-up issue (approach C) filed but non-blocking |

## Screens & routing

Both screens render inside the normal shell — `<BottomNav />` visible, Ticks tab active.

| Screen | Route | File |
|---|---|---|
| Dashboard | `/ticks` | `src/app/routes/ticks.tsx` (replaces stub) |
| All ticks | `/ticks/all` | `src/app/routes/ticks_.all.tsx` |

The all-ticks file uses the trailing-underscore un-nesting convention (documented in CLAUDE.md): `ticks.tsx` renders no `<Outlet />`, so a nested `ticks.all.tsx` would silently never render.

Navigation: dashboard `see all →` links to `/ticks/all`; its `‹ All ticks` header links back. Every tick row links to the route detail page `/areas/$areaId/walls/$wallId/routes/$routeId` (`areaId` taken from the joined wall's `areaId`). No auth handling in these pages — the root-level Auth0 gate already blocks logged-out users.

## Data layer

New hook `useEnrichedTicks(userId)` in `src/features/ticks/hooks/`, composing four existing queries: `useTicksByUser(userId)`, `useRoutes()`, `useWalls()`, `useAreas()`. Returns:

```ts
{
  ticks: EnrichedTick[]   // { tick: UserRouteTick; route?: ClimbingRoute; wall?: Wall; area?: ClimbingArea }
  isLoading: boolean      // any source query loading
  isError: boolean        // any source query errored
  refetch: () => void     // refetches all source queries
}
```

- `ticks` sorted by `tickedAt` descending.
- Joins are by id maps built from the collections. A missing route/wall/area degrades that row (fields `undefined`) — the tick still renders and still counts in totals.
- **Future-proofing seam:** when the backend grows an enriched endpoint (e.g. `/users/{id}/ticks?expand=route`), only this hook's internals change; its return shape is the component contract. A climbing-api follow-up issue is filed as part of this work and must also mention pagination.
- Known limitation, accepted: `getTicksByUser` requests `?size=100`; ticks beyond 100 are invisible. Recorded in the backend follow-up issue.

## Norwegian grade utility

`src/features/ticks/utils/norwegianGrade.ts` — pure functions, co-located tests:

- `parseNorwegianGrade(s: string): number | null` — trims, matches `^([1-9])([+-]?)$`, returns a comparable rank (`digit * 3` with `-1` for `-`, `+1` for `+`), `null` otherwise.
- `compareNorwegianGrades(a, b)` — descending-capable comparator; unparseable grades sort after parseable ones.
- Display always uses the raw grade string; the util never reformats.

Unparseable/empty grades are excluded from "hardest" and the pyramid but count in the "routes" total.

## Dashboard (`/ticks`)

Components in `src/features/ticks/components/`.

- **Stat cards** (three across): `routes` = total tick count; `hardest` = max grade by rank across joined routes (`—` when no tick has a parseable grade); `this month` = ticks whose `tickedAt` falls in the current calendar month.
- **Grade pyramid card**: one horizontal bar per distinct parseable grade among ticked routes, hardest at top, width proportional to that grade's count (relative to the max count), count displayed at the right. Plain divs + percentage widths; no chart library.
- **Recent**: the 3 newest ticks as `TickRow`s, plus `see all →`.

**`TickRow`** (shared with the all-list): grade badge left (raw grade string; `?` when route missing), route name, location line = wall name falling back to area name (blank if neither), style chip (initials: OS / FL / RP / FS from the tick's style), short date (`12 May`). A `showStars` variant flag adds the 1–5 star rating (all-list only, per the wireframe; rating 0 renders no stars).

## All-ticks list (`/ticks/all`)

- Header: `‹ All ticks · N` where N counts the **currently visible** (filtered) ticks.
- **Style chips**: `All` + one chip per style actually present in the user's ticks (so `FS` appears only if a free-solo tick exists). Single-select; pill styling matching the homepage filter chips.
- **Sort**: native `<select>` (same pattern as the homepage controls from #12): `date` (default, newest first) or `grade` (hardest first, unparseable last).
- Rows: `TickRow` with stars.

## Loading / error / empty states

- **Loading**: `animate-pulse` skeletons shaped like each screen (stat-card row + list rows), consistent with the crag grid.
- **Error** (any source query): full-width "Couldn't load ticks — tap to retry" button wired to the combined `refetch` — same pattern as the crag list (#11/#43).
- **Empty** (user has zero ticks): both screens show a nudge — "No ticks yet — find a crag and log your first send" — linking to `/` (Explore). Stats, pyramid, chips, and sort are hidden in this state.
- **Partial joins**: handled per-row as described in Data layer.

## Testing (TDD)

Co-located Vitest + Testing Library suites, red first:

1. `norwegianGrade.test.ts` — parses `6-`/`6`/`6+`/`9+`/`1`; rejects `6a`, `10`, `''`, `6++`, `+6`; ordering `5+ < 6- < 6 < 6+ < 7-`.
2. `useEnrichedTicks.test.ts` — join correctness, tolerance of missing route/wall, newest-first order, combined loading/error flags, refetch fan-out (mock the four source hooks, matching existing test patterns).
3. Dashboard component test — stats math (count, hardest, this-month boundary), pyramid bar count/order/labels, recent shows exactly 3 newest.
4. All-list component test — chips derived from data, filtering, date vs grade sort, header count follows filter, stars per rating.
5. Route files stay thin (mount the feature component), like `index.tsx` → `AreasList` today.

## Out of scope

- Pyramid discipline dropdown (`sport ▾` in wireframe) — until mixed-discipline data exists.
- The wireframe's gear icon (settings) — no defined behaviour.
- Backend enriched/paginated ticks endpoint — filed as a climbing-api follow-up issue, not blocking.
- Editing/deleting ticks from these screens — the existing log-a-tick flow (reached via route detail) already covers create/edit.
