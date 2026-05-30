# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run dev       # Start dev server with HMR
npm run build     # Type-check + production build (tsc -b && vite build)
npm run lint      # ESLint
npm run preview   # Preview the production build locally
```

There is no test runner configured yet.

## Stack

React 19 + TypeScript 6 + Vite 8 + Tailwind CSS v4, using `@vitejs/plugin-react` (Oxc-based transformer) and `@tailwindcss/vite`. Entry point is `src/main.tsx`; root component is `src/app/index.tsx`.

- **TanStack Router v1** — file-based routing; `routeTree.gen.ts` is auto-generated, do not hand-edit it
- **TanStack Query v5** — all server state fetching and caching
- **`apiClient`** — custom fetch wrapper in `src/lib/api-client.ts`; no axios

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

**Domain type naming:** The climbing route data model is `ClimbingRoute` (not `Route`) in `src/types/api.ts`. TanStack Router requires every route file to export `const Route = createFileRoute(...)`, so using `Route` as a domain type name causes a collision. Follow the same pattern for any future domain types that clash with framework names.

**TanStack Query keys:** Use a hierarchical `[entity, ...params]` pattern so cache invalidation is predictable:

| Hook | Query key |
|---|---|
| `useAreas()` | `['areas']` |
| `useWall(id)` | `['walls', id]` |
| `useWalls()` | `['walls']` |
| `useWallsByArea(areaId)` | `['areas', areaId, 'walls']` |
| `useRoutesByWall(wallId)` | `['walls', wallId, 'routes']` |

**URL param parsing:** TanStack Router provides URL params as strings. Always parse with `Number()` and guard with `Number.isNaN()` before passing to queries:
```ts
const id = Number(param)
if (Number.isNaN(id)) return <p>Invalid URL</p>
```

## Build notes

**New file-based routes:** `npm run build` runs `tsc -b` before Vite, so adding a new route file will fail on the first build run — TypeScript can't see the updated `routeTree.gen.ts` yet. Fix: run `npx vite build` once first to regenerate the route tree, then `npm run build` passes cleanly.

## TypeScript strictness

`tsconfig.app.json` enforces `noUnusedLocals`, `noUnusedParameters`, and `erasableSyntaxOnly`. The build runs `tsc -b` before Vite, so type errors break the build.

## ESLint

`eslint.config.js` uses flat config with `typescript-eslint`, `eslint-plugin-react-hooks`, and `eslint-plugin-react-refresh`. Type-aware rules are **not** enabled yet — if upgrading, add `tseslint.configs.recommendedTypeChecked` and set `parserOptions.project` in the config.
