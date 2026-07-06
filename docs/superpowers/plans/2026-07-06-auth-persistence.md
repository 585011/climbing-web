# Auth Persistence + CSP Hardening Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Stop the site logging users out on refresh by persisting the Auth0 session, and tighten the CSP so the now-persisted token cannot be exfiltrated to arbitrary hosts.

**Architecture:** Switch `Auth0Provider` from the default in-memory token cache to `localStorage` with rotating refresh tokens (`offline_access` scope), so the SDK silently restores the session on load. Then narrow the CSP `connect-src`/`frame-src` from blanket `https:` to the specific Auth0 + map-tile origins the app actually calls.

**Tech Stack:** React 19, `@auth0/auth0-react`, Vite 8, Vitest + @testing-library/react (jsdom), Caddy (prod static server + security headers).

## Global Constraints

- Frontend-only. No `climbing-api` / backend code changes in this plan.
- `img-src` in the CSP stays `'self' https: data:` — do NOT pin it (R2 presigned hosts unknown; issue #50 will change image origins). Pinning it is out of scope.
- Do NOT speculatively add `worker-src blob:`. Add it ONLY if a MapLibre blob-worker CSP violation is observed during verification.
- CSP `connect-src` MUST keep `'self'` (same-origin `/api` proxy) and MUST include `https://tiles.openfreemap.org` (MapLibre) and `https://*.auth0.com` (Auth0 token endpoint). Missing any of these breaks the API, the map, or login respectively.
- Auth0 scope string must be exactly `'openid profile email offline_access'`.
- Tests: co-locate `*.test.tsx` next to source. Run via `npm test`.
- Commit messages end with the `Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>` trailer.

---

### Task 1: Auth session persistence

**Files:**
- Modify: `src/app/provider.tsx` (the `<Auth0Provider>` element, ~lines 45-56)
- Test: `src/app/provider.test.tsx` (create)

**Interfaces:**
- Consumes: `AppProvider` (default export-style named export `AppProvider` from `src/app/provider.tsx`), `@auth0/auth0-react` `Auth0Provider` + `useAuth0`.
- Produces: nothing consumed by later tasks (Task 2 is independent config).

- [ ] **Step 1: Write the failing test**

Create `src/app/provider.test.tsx`:

```tsx
import { render } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'

// vi.mock is hoisted above imports, so the spy it references must be created
// with vi.hoisted (a plain outer const would be uninitialized when the mock runs).
const { auth0ProviderProps } = vi.hoisted(() => ({ auth0ProviderProps: vi.fn() }))

vi.mock('@auth0/auth0-react', () => ({
  Auth0Provider: (props: Record<string, unknown>) => {
    auth0ProviderProps(props)
    return props.children as React.ReactNode
  },
  useAuth0: () => ({
    getAccessTokenSilently: vi.fn(),
    isAuthenticated: false,
    user: undefined,
  }),
}))

import { AppProvider } from './provider'

describe('AppProvider Auth0 configuration', () => {
  it('persists the session across refresh via localStorage + rotating refresh tokens', () => {
    render(
      <AppProvider>
        <div />
      </AppProvider>
    )

    const props = auth0ProviderProps.mock.calls[0][0] as {
      cacheLocation?: string
      useRefreshTokens?: boolean
      authorizationParams?: { scope?: string }
    }

    expect(props.cacheLocation).toBe('localstorage')
    expect(props.useRefreshTokens).toBe(true)
    expect(props.authorizationParams?.scope).toContain('offline_access')
  })
})
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npm test -- src/app/provider.test.tsx`
Expected: FAIL — `props.cacheLocation` is `undefined` (expected `'localstorage'`).

- [ ] **Step 3: Implement the minimal change**

In `src/app/provider.tsx`, update the `<Auth0Provider>` element to add the three props (keep `domain`, `clientId`, and the existing `redirect_uri`/`audience`):

```tsx
  <Auth0Provider
    domain={import.meta.env.VITE_AUTH0_DOMAIN}
    clientId={import.meta.env.VITE_AUTH0_CLIENT_ID}
    cacheLocation="localstorage"
    useRefreshTokens={true}
    authorizationParams={{
      redirect_uri: window.location.origin,
      audience: import.meta.env.VITE_AUTH0_AUDIENCE,
      scope: 'openid profile email offline_access',
    }}
  >
    <AuthSync>{children}</AuthSync>
  </Auth0Provider>
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npm test -- src/app/provider.test.tsx`
Expected: PASS.

- [ ] **Step 5: Run the full suite, lint, and type-check/build**

Run: `npm test` — Expected: all pass (no regressions).
Run: `npm run lint` — Expected: 0 errors.
Run: `npm run build` — Expected: succeeds (tsc -b + vite build).

- [ ] **Step 6: Commit**

```bash
git add src/app/provider.tsx src/app/provider.test.tsx
git commit -m "fix: persist Auth0 session across refresh via localStorage + refresh tokens

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

### Task 2: Tighten CSP connect-src / frame-src

**Files:**
- Modify: `Caddyfile` (the `Content-Security-Policy` header line and the CSP comment block above it)

**Interfaces:**
- Consumes: nothing from Task 1.
- Produces: nothing consumed later.

There is no unit-test harness for the Caddyfile; this task is a static-config change verified by exact-content assertion plus browser verification.

- [ ] **Step 1: Edit the CSP header**

In `Caddyfile`, replace the `Content-Security-Policy` value so that `connect-src` and `frame-src` are pinned. Change ONLY those two directives; leave every other directive (including `img-src 'self' https: data:`) exactly as-is. New header value:

```
Content-Security-Policy "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' https: data:; connect-src 'self' https://*.auth0.com https://tiles.openfreemap.org; frame-src https://*.auth0.com; frame-ancestors 'none'; base-uri 'self'; object-src 'none'"
```

- [ ] **Step 2: Update the CSP comment block to match**

Directly above the `header {` block, the comment currently says `frame-src https: allows Auth0's silent-auth iframe`. Update the comment so it stays accurate — note that `connect-src` is pinned to Auth0 (`https://*.auth0.com`, covering the token endpoint used by refresh tokens) and the OpenFreeMap tile host (`https://tiles.openfreemap.org`), and `frame-src` is pinned to Auth0 for the silent-auth iframe. Keep the existing notes about `style-src 'unsafe-inline'` and `img-src https:`.

- [ ] **Step 3: Verify the exact directives are present**

Run: `grep -n "connect-src 'self' https://\*.auth0.com https://tiles.openfreemap.org; frame-src https://\*.auth0.com" Caddyfile`
Expected: one matching line.

Run: `grep -c "img-src 'self' https: data:" Caddyfile`
Expected: `1` (image directive unchanged).

- [ ] **Step 4: Browser verification (preview)**

Start the dev server via the preview tooling and, if Auth0 + backend are reachable locally, verify in the browser:
- Log in, then refresh the page → session persists, no login screen re-appears.
- The `/map` page renders tiles (confirms `connect-src` allows `tiles.openfreemap.org`).
- The `/` crag list renders images (confirms `img-src` untouched).
- Console shows no CSP violations.

Note: the Caddyfile CSP applies to the Caddy-served production build, not the Vite dev server. If verifying the exact header requires the built image, at minimum confirm no functionality depends on the now-removed blanket `https:` (Auth0 token calls, map tiles, API, images all use the origins listed above). If a MapLibre blob-worker CSP violation appears, add `worker-src 'self' blob:` to the header, update the comment, and re-verify.

- [ ] **Step 5: Commit**

```bash
git add Caddyfile
git commit -m "fix: pin CSP connect-src/frame-src to Auth0 + map-tile origins

Narrow the blanket https: on the exfil-capable directives to reduce the
blast radius of the localStorage-stored access token (FIND-001).

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

## Self-Review

**Spec coverage:**
- Task 1 spec §"Task 1 — Auth persistence" → covered (three props + provider test). ✅
- Task 2 spec §"Task 2 — CSP tightening" → covered (connect-src/frame-src pin, img-src untouched, worker-src conditional). ✅
- `__root.tsx` no-change decision → honored (no task touches it). ✅
- Manual Auth0-dashboard steps → out of code, documented in spec, not a plan task. ✅ (correctly excluded)

**Placeholder scan:** No TBD/TODO; all code and commands are concrete. The `worker-src` addition is conditional-on-observation by design, not a placeholder. ✅

**Type consistency:** `cacheLocation`/`useRefreshTokens`/`authorizationParams.scope` names match between the test assertions (Task 1 Step 1) and the implementation (Task 1 Step 3). CSP directive strings match between Task 2 Step 1 and the Step 3 grep. ✅
