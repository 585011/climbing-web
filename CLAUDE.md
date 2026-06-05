# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run dev       # Start dev server with HMR
npm run build     # Type-check + production build (tsc -b && vite build)
npm run lint      # ESLint
npm run preview   # Preview the production build locally

docker build --build-arg VITE_API_URL=<url> -t climbing-web .   # Build image
docker run -p 8000:80 climbing-web                               # Run container
```

There is no test runner configured yet.

## Stack

React 19 + TypeScript 6 + Vite 8 + Tailwind CSS v4, using `@vitejs/plugin-react` (Oxc-based transformer) and `@tailwindcss/vite`. Entry point is `src/main.tsx`; root component is `src/app/index.tsx`.

- **TanStack Router v1** — file-based routing; `routeTree.gen.ts` is auto-generated, do not hand-edit it
- **TanStack Query v5** — all server state fetching and caching
- **`apiClient`** — custom fetch wrapper in `src/lib/api-client.ts`; returns `Promise<unknown>`; no axios
- **Zod** — runtime validation of all API responses; schemas live in `src/types/api.ts`

## Project structure

Follows [bulletproof-react](https://github.com/alan2207/bulletproof-react/blob/master/docs/project-structure.md) conventions:

```
src/
├── app/         # Root component, provider wrappers, router
├── assets/      # Static files
├── components/  # Shared components
├── config/      # Global config and env variables
├── features/    # Feature modules (each may contain api/, components/, hooks/, etc.)
├── hooks/       # Shared hooks
├── lib/         # Preconfigured libraries
├── stores/      # Global state
├── testing/     # Test utilities and mocks
├── types/       # Shared TypeScript types
└── utils/       # Shared utility functions
```

Code flows in one direction: `shared → features → app`. Avoid cross-feature imports; compose features at the app level. Import files directly — no barrel files.

## Backend API

Kotlin + Spring Boot 3.5 REST API backed by PostgreSQL — repo: https://github.com/585011/climbing-api

- Runs at `http://localhost:8080`; Swagger UI at `/swagger-ui.html`
- Set `VITE_API_URL` to override the base URL (e.g. for staging)
- Layer flow: `Controller → Service → Repository` — no business logic in controllers
- Flyway migrations in `src/main/resources/db/migration/` (`V{n}__{description}.sql`)
- Domain: `ClimbingAreas → Walls → Routes` (FK chain), plus `Users` and `UserRouteTicks`
- Error response shape: `{ timestamp, status, error, message, path }`
- No auth layer yet

## UX target

Primary users are climbers at outdoor crags on mobile — design for one-handed use and bright sunlight. Prioritise legibility and large tap targets over information density.

## Layout shell

`src/app/routes/__root.tsx` wraps every page with a `max-w-md mx-auto` container and a fixed `<BottomNav />`:

| Tab | Route | State |
|---|---|---|
| Explore | `/` | Implemented (crag grid) |
| Map | `/map` | Stub |
| Ticks | `/ticks` | Stub |
| Me | `/me` | Stub |

Active tab is detected via `useLocation` in `src/components/ui/BottomNav.tsx`.

Detail pages (not tabs):

| Page | Route | State |
|---|---|---|
| Area (Crag) | `/areas/:areaId` | Implemented — hero, info, tabs (Routes/Walls/Approach/Info); Walls tab hidden when ≤ 1 wall; Approach tab shows per-wall `approachInfo` |
| Wall | `/areas/:areaId/walls/:wallId` | Stub |

## Design system

> **Temporary** — these tokens were derived from early wireframes and will be replaced once a proper design system is established.

Color tokens are registered in `src/index.css` via Tailwind v4's `@theme` and usable as utilities (`bg-paper`, `text-ink`, `bg-accent`, etc.):

| Token | Value | Use |
|---|---|---|
| `--color-ink` | `#1a1814` | Primary text |
| `--color-ink-2` | `#4b463e` | Secondary text |
| `--color-ink-3` | `#8a8377` | Muted / placeholder |
| `--color-paper` | `#f4f1ea` | Page background |
| `--color-paper-2` | `#ebe6db` | Card / surface background |
| `--color-accent` | `#c8553d` | Interactive / highlight |

`no-scrollbar` is registered as a custom `@utility` in `src/index.css` — use it to hide scrollbars on horizontally scrollable containers. It is **not** a built-in Tailwind class.

## Conventions

**API types and validation:** Domain types in `src/types/api.ts` are defined as Zod schemas and inferred with `z.infer<>` — do not add plain interfaces alongside them. `apiClient` returns `Promise<unknown>`; every API function must call `.parse()` on the raw response before returning. Use the `apiDataResponse` schema helper for endpoints that wrap their payload:

```ts
// Endpoint returns { data: [...] }
const raw = await apiClient.get('/climbing-areas')
return apiDataResponse(z.array(ClimbingAreaSchema)).parse(raw).data

// Endpoint returns a plain array
const raw = await apiClient.get(`/climbing-areas/${id}/walls`)
return z.array(WallSchema).parse(raw)
```

**Backend response shape:** Top-level collection endpoints (`/climbing-areas`, `/walls`, `/routes`) return `{ data: [...] }`. Sub-resource collections (`/climbing-areas/:id/walls`, `/walls/:id/routes`) and single-item endpoints return the payload directly.

**Domain type naming:** The climbing route data model is `ClimbingRoute` (not `Route`) in `src/types/api.ts`. TanStack Router requires every route file to export `const Route = createFileRoute(...)`, so using `Route` as a domain type name causes a collision. Follow the same pattern for any future domain types that clash with framework names.

**TanStack Query keys:** Use a hierarchical `[entity, ...params]` pattern so cache invalidation is predictable:

| Hook | Query key |
|---|---|
| `useAreas()` | `['areas']` |
| `useArea(id)` | `['areas', id]` |
| `useWall(id)` | `['walls', id]` |
| `useWalls()` | `['walls']` |
| `useWallsByArea(areaId)` | `['areas', areaId, 'walls']` |
| `useRoutesByWall(wallId)` | `['walls', wallId, 'routes']` |

**URL param parsing:** TanStack Router provides URL params as strings. Always parse with `Number()` and guard with `Number.isNaN()` before passing to queries:
```ts
const id = Number(param)
if (Number.isNaN(id)) return <p>Invalid URL</p>
```

## Design files

`docs/designs/climbing-app-wireframes.html` — open in a browser to view all wireframes. Primary reference for UI decisions.

## Build notes

**New file-based routes:** `npm run build` runs `tsc -b` before Vite, so adding a new route file will fail on the first build run — TypeScript can't see the updated `routeTree.gen.ts` yet. Fix: run `npx vite build` once first to regenerate the route tree, then `npm run build` passes cleanly.

## TypeScript strictness

`tsconfig.app.json` enforces `noUnusedLocals`, `noUnusedParameters`, and `erasableSyntaxOnly`. The build runs `tsc -b` before Vite, so type errors break the build.

## ESLint

`eslint.config.js` uses flat config with `typescript-eslint`, `eslint-plugin-react-hooks`, and `eslint-plugin-react-refresh`. Type-aware rules are **not** enabled yet — if upgrading, add `tseslint.configs.recommendedTypeChecked` and set `parserOptions.project` in the config.

## Code guidelines

Behavioral guidelines to reduce common LLM coding mistakes. Merge with project-specific instructions as needed.

**Tradeoff:** These guidelines bias toward caution over speed. For trivial tasks, use judgment.

### 1. Think Before Coding

**Don't assume. Don't hide confusion. Surface tradeoffs.**

Before implementing:
- State your assumptions explicitly. If uncertain, ask.
- If multiple interpretations exist, present them - don't pick silently.
- If a simpler approach exists, say so. Push back when warranted.
- If something is unclear, stop. Name what's confusing. Ask.

### 2. Simplicity First

**Minimum code that solves the problem. Nothing speculative.**

- No features beyond what was asked.
- No abstractions for single-use code.
- No "flexibility" or "configurability" that wasn't requested.
- No error handling for impossible scenarios.
- If you write 200 lines and it could be 50, rewrite it.

Ask yourself: "Would a senior engineer say this is overcomplicated?" If yes, simplify.

### 3. Surgical Changes

**Touch only what you must. Clean up only your own mess.**

When editing existing code:
- Don't "improve" adjacent code, comments, or formatting.
- Don't refactor things that aren't broken.
- Match existing style, even if you'd do it differently.
- If you notice unrelated dead code, mention it - don't delete it.

When your changes create orphans:
- Remove imports/variables/functions that YOUR changes made unused.
- Don't remove pre-existing dead code unless asked.

The test: Every changed line should trace directly to the user's request.

### 4. Goal-Driven Execution

**Define success criteria. Loop until verified.**

Transform tasks into verifiable goals:
- "Add validation" → "Write tests for invalid inputs, then make them pass"
- "Fix the bug" → "Write a test that reproduces it, then make it pass"
- "Refactor X" → "Ensure tests pass before and after"

For multi-step tasks, state a brief plan:
```
1. [Step] → verify: [check]
2. [Step] → verify: [check]
3. [Step] → verify: [check]
```

Strong success criteria let you loop independently. Weak criteria ("make it work") require constant clarification.

---

**These guidelines are working if:** fewer unnecessary changes in diffs, fewer rewrites due to overcomplication, and clarifying questions come before implementation rather than after mistakes.
