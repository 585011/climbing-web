# Auth persistence + CSP hardening — design

**Date:** 2026-07-06
**Status:** Approved
**Scope:** Frontend-only (climbing-web). No backend/API code changes. Issue #50 (image performance) is a **separate** spec/plan tracked independently.

## Problem

Refreshing the site logs the user out, forcing re-login every time. The user wants login to persist across refreshes while keeping the system access-restricted.

## Root cause

`Auth0Provider` in `src/app/provider.tsx` uses Auth0's default `cacheLocation="memory"`. On a full page refresh the in-memory token cache is cleared. The SDK's fallback silent SSO (hidden iframe against the Auth0 session cookie) fails whenever the browser blocks third-party cookies (Safari ITP, Chrome), so `isAuthenticated` resolves to `false` after loading and the login screen renders. There is no durable client-side credential to restore the session from.

## Decision

Store tokens in `localStorage` and use rotating refresh tokens, so the SDK can silently restore the session on load without depending on a third-party-cookie iframe. Pair this with CSP tightening to reduce the exfiltration blast radius of the now-persisted token.

Rejected alternatives:
- **BFF / token-handler pattern** (httpOnly cookies, tokens never in JS) — the gold standard for XSS token theft, but requires a new deployable backend proxy service. Disproportionate at this stage.
- **Memory + silent auth only** — lowest token-theft risk but unreliable under third-party-cookie blocking; would not dependably fix the reported bug.

## Security analysis

localStorage tokens are readable only by JavaScript on our origin, so the risk reduces to XSS. Current XSS posture:

| Vector | Status |
|---|---|
| Reflected/stored XSS (injected markup) | Blocked — React default escaping; zero `dangerouslySetInnerHTML` in codebase |
| Inline `<script>` / `eval` injection | Blocked — existing CSP `script-src 'self'` (no `unsafe-inline`, no `unsafe-eval`) |
| Malicious first-party bundle (compromised npm dep) | Not blocked — runs as `'self'` |

The existing strong CSP (`Caddyfile`) already neutralizes the two common XSS classes, which is what makes localStorage acceptable here. The residual risk is a supply-chain / same-origin script that exfiltrates the token — and today's CSP allows exfil to any host via `connect-src 'self' https:` and `img-src 'self' https:`.

### Findings

- **FIND-001 (Medium) — broad `connect-src`/`frame-src` enable exfiltration.** Fixed in this work (Task 2).
- **FIND-002 (Medium, accepted) — bearer token in localStorage.** Accepted; mitigated by CSP + Auth0 config (short TTL, rotation, reuse detection).

## Changes

### Task 1 — Auth persistence (`src/app/provider.tsx`)

Add to `<Auth0Provider>`:
- `cacheLocation="localstorage"`
- `useRefreshTokens={true}`
- `scope: 'openid profile email offline_access'` inside `authorizationParams` (`offline_access` is what makes Auth0 issue a refresh token)

No change to `src/app/routes/__root.tsx`: it already renders a Loading state while `isLoading`, so the SDK restores the session from the stored refresh token before gating on `isAuthenticated`.

**Test:** new test co-located with the provider. Mock `@auth0/auth0-react`; render `AppProvider`; assert `Auth0Provider` receives `cacheLocation="localstorage"`, `useRefreshTokens={true}`, and a `scope` containing `offline_access`.

### Task 2 — CSP tightening (`Caddyfile`)

In the `Content-Security-Policy` header, replace the blanket `https:` on the exfil-capable directives:

- `connect-src 'self' https://*.auth0.com https://tiles.openfreemap.org`
  - `'self'` — same-origin `/api` proxy + app assets
  - `https://*.auth0.com` — Auth0 `/oauth/token` calls from `getAccessTokenSilently`; wildcard covers dev tenant (`dev-nzfyv008cyalqnhz.eu.auth0.com`) and any prod tenant without hardcoding a secret
  - `https://tiles.openfreemap.org` — MapLibre style/tiles/glyphs (`src/features/map/components/MapView.tsx`)
- `frame-src https://*.auth0.com` — Auth0 silent-auth iframe only (was `https:`)
- `img-src 'self' https: data:` — **unchanged.** R2 presigned image hosts are not pinned yet, and issue #50 will change image origins; pinning `img-src` is deferred to that work. This leaves an accepted low-priority img-beacon exfil channel.

`worker-src blob:` is **not** added speculatively. MapLibre may need it; if a CSP violation for a blob worker appears during verification, add `worker-src 'self' blob:` then — driven by the observed violation, not a guess.

Keep all other directives (`default-src`, `script-src`, `style-src`, `frame-ancestors`, `base-uri`, `object-src`) and the update comment block accurate to the new values.

## Verification

- `npm test`, `npm run lint`, `npm run build` pass.
- Preview (if Auth0 + backend run locally): log in, refresh — session persists, no login screen. Map tiles render. Crag images render. No CSP violations in the console (if a MapLibre blob-worker violation appears, apply the `worker-src` note above and re-verify).

## Manual steps (user, Auth0 dashboard — out of code)

Required for the refresh token to actually be issued and to keep FIND-002 mitigated:
- SPA application: enable **Refresh Token Rotation** (+ reuse interval) and **automatic reuse detection**.
- API: **Allow Offline Access** = on.
- Set a short access-token TTL (≤ 15 min) and sensible absolute + inactivity refresh-token expiry.

Without Rotation + Allow Offline Access, `offline_access` yields no refresh token and behavior is unchanged.

## Out of scope

- Issue #50 image performance (separate spec/plan).
- `img-src` pinning (deferred to #50).
- BFF / token-handler architecture.
