# Wall Images (Render, Fullscreen Viewer, Admin Upload) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Render the new nullable `Wall.imageUrl`, add a fullscreen pan/zoom viewer for all users, and an admin-only add/replace image upload (`PUT /api/walls/{id}/image`, multipart) per issue #33.

**Architecture:** A new `putMultipart` path in the shared `apiClient` (plus a typed `ApiError`), a `useIsAdmin` hook that decodes the Auth0 access-token roles claim client-side (display-only, fail closed), and a `WallHero` component in the walls feature that owns the image, upload button, error line, and fullscreen viewer. Spec: `docs/superpowers/specs/2026-07-02-wall-images-design.md`.

**Tech Stack:** React 19, TypeScript, TanStack Query v5, Zod, Tailwind v4, Vitest + @testing-library/react, `react-zoom-pan-pinch` (new dependency).

**Branch:** Implementation branches off `docs/33-wall-images-design-spec` (contains the spec) as `feature/33-wall-images`.

## Global Constraints

- Upload endpoint is `PUT` to apiClient path `/walls/{id}/image`; the file part MUST be named exactly `image`.
- NEVER set `Content-Type` manually on multipart requests — the browser must set the boundary.
- `WALL_IMAGE_MAX_BYTES = 5 * 1024 * 1024`; `WALL_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp']` — single source of truth in `src/types/api.ts`; client checks are UX-only, the backend is authoritative.
- Admin roles claim is exactly `https://climbing-api/roles`; the role string is `admin`; any decode failure returns `false` (fail closed). Display-only gating — backend enforces via 403.
- Error copy (exact strings): `Image must be JPEG, PNG or WebP` (client type check + 400), `Image is larger than 5 MB` (client size check + 413), `Only admins can upload images` (403), `Upload failed — please try again` (fallback).
- `ApiError.message` MUST stay in the format `<status> <statusText>` — `src/app/provider.tsx` depends on `e.message.startsWith('404 ')`.
- On upload success invalidate query keys `['walls', wallId]` and `['areas', areaId, 'walls']`.
- Project conventions (CLAUDE.md): Zod schemas + `z.infer` only (no plain interfaces for domain types), every API fn `.parse()`s the response, no barrel files, no cross-feature imports, never name a domain type `Route`, co-locate `*.test.ts(x)`.
- Only new dependency allowed: `react-zoom-pan-pinch`.
- `imageUrl` is a ~15-minute presigned URL — never persist it; always render the value from the latest query response.

---

### Task 1: Wall schema `imageUrl` + image constants

**Files:**
- Modify: `src/types/api.ts` (WallSchema, new constants after `PERSONAL_NOTE_MAX` block)
- Test: `src/types/api.test.ts` (append)

**Interfaces:**
- Consumes: nothing new.
- Produces: `WallSchema` (and `Wall`) with `imageUrl: string | null`; exported constants `WALL_IMAGE_MAX_BYTES: number` and `WALL_IMAGE_TYPES: readonly string[]`. Tasks 4, 6 import these from `../../../types/api`.

- [ ] **Step 1: Write the failing tests** — append to `src/types/api.test.ts`:

```ts
import { WallSchema, WALL_IMAGE_MAX_BYTES, WALL_IMAGE_TYPES } from './api'

describe('WallSchema imageUrl', () => {
  const baseWall = {
    id: 1,
    areaId: 2,
    name: 'Main Wall',
    description: null,
    latitude: null,
    longitude: null,
    approachInfo: null,
    createdAt: '2026-06-12T00:00:00Z',
  }

  it('parses a string imageUrl', () => {
    const parsed = WallSchema.parse({ ...baseWall, imageUrl: 'https://r2.example/img.jpg?sig=x' })
    expect(parsed.imageUrl).toBe('https://r2.example/img.jpg?sig=x')
  })

  it('parses a null imageUrl', () => {
    const parsed = WallSchema.parse({ ...baseWall, imageUrl: null })
    expect(parsed.imageUrl).toBeNull()
  })
})

describe('wall image constants', () => {
  it('caps size at 5 MB and allows exactly three MIME types', () => {
    expect(WALL_IMAGE_MAX_BYTES).toBe(5 * 1024 * 1024)
    expect(WALL_IMAGE_TYPES).toEqual(['image/jpeg', 'image/png', 'image/webp'])
  })
})
```

Merge the new imports into the existing import line from `'./api'`.

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run src/types/api.test.ts`
Expected: FAIL — `WALL_IMAGE_MAX_BYTES` is not exported / `imageUrl` key stripped (parse output lacks `imageUrl`).

- [ ] **Step 3: Implement** — in `src/types/api.ts`, add to `WallSchema` after the `approachInfo` line:

```ts
  /** Short-lived (~15 min) presigned URL — always use the latest response, never cache long-term. */
  imageUrl: z.string().nullable(),
```

And after the `TickInput` export, add:

```ts
/**
 * Wall image upload limits. Single source of truth — referenced by the file
 * input's `accept`, the pre-upload check, and tests. Client-side checks are
 * UX / defense-in-depth only; the backend is the authoritative validator
 * (400 VALIDATION_ERROR / 413 PAYLOAD_TOO_LARGE).
 */
export const WALL_IMAGE_MAX_BYTES = 5 * 1024 * 1024
export const WALL_IMAGE_TYPES: readonly string[] = ['image/jpeg', 'image/png', 'image/webp']
```

- [ ] **Step 4: Run the full suite** (schema change may affect other tests)

Run: `npx vitest run`
Expected: PASS (no existing test constructs a raw Wall object).

- [ ] **Step 5: Commit**

```bash
git add src/types/api.ts src/types/api.test.ts
git commit -m "Add imageUrl to WallSchema and wall image upload constants"
```

---

### Task 2: `ApiError` + multipart support in `apiClient`

**Files:**
- Modify: `src/lib/api-client.ts`
- Test: `src/lib/api-client.test.ts` (create)

**Interfaces:**
- Consumes: nothing new.
- Produces: `export class ApiError extends Error { status: number; errorCode?: string }` and `apiClient.putMultipart(path: string, form: FormData): Promise<unknown>`. All apiClient methods now throw `ApiError` instead of bare `Error` on non-OK responses. Message format unchanged: `` `${status} ${statusText}` ``.

- [ ] **Step 1: Write the failing tests** — create `src/lib/api-client.test.ts`:

```ts
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { apiClient, ApiError } from './api-client'

const fetchMock = vi.fn()
vi.stubGlobal('fetch', fetchMock)

const okJson = (body: unknown) => ({
  ok: true,
  status: 200,
  json: async () => body,
})

describe('apiClient.putMultipart', () => {
  beforeEach(() => fetchMock.mockReset())

  it('sends FormData with PUT and no Content-Type header', async () => {
    fetchMock.mockResolvedValue(okJson({}))
    const form = new FormData()
    await apiClient.putMultipart('/walls/5/image', form)

    const [url, init] = fetchMock.mock.calls[0]
    expect(url).toContain('/walls/5/image')
    expect(init.method).toBe('PUT')
    expect(init.body).toBe(form)
    expect(init.headers).not.toHaveProperty('Content-Type')
  })

  it('still sets Content-Type for JSON requests', async () => {
    fetchMock.mockResolvedValue(okJson({}))
    await apiClient.post('/walls', { name: 'x' })
    const [, init] = fetchMock.mock.calls[0]
    expect(init.headers['Content-Type']).toBe('application/json')
  })
})

describe('ApiError', () => {
  beforeEach(() => fetchMock.mockReset())

  it('carries status and errorCode from a JSON error body', async () => {
    fetchMock.mockResolvedValue({
      ok: false,
      status: 413,
      statusText: 'Payload Too Large',
      json: async () => ({ errorCode: 'PAYLOAD_TOO_LARGE', message: 'too big' }),
    })
    const err = await apiClient.get('/walls/5').catch((e: unknown) => e)
    expect(err).toBeInstanceOf(ApiError)
    expect((err as ApiError).status).toBe(413)
    expect((err as ApiError).errorCode).toBe('PAYLOAD_TOO_LARGE')
    expect((err as ApiError).message).toBe('413 Payload Too Large')
  })

  it('omits errorCode when the error body is not JSON', async () => {
    fetchMock.mockResolvedValue({
      ok: false,
      status: 502,
      statusText: 'Bad Gateway',
      json: async () => { throw new Error('not json') },
    })
    const err = await apiClient.get('/walls/5').catch((e: unknown) => e)
    expect(err).toBeInstanceOf(ApiError)
    expect((err as ApiError).status).toBe(502)
    expect((err as ApiError).errorCode).toBeUndefined()
  })
})
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run src/lib/api-client.test.ts`
Expected: FAIL — `ApiError` / `putMultipart` not exported.

- [ ] **Step 3: Implement** — replace the body of `src/lib/api-client.ts` request/export section (keep `API_BASE`, `getToken`, `configureAuth` as-is):

```ts
export class ApiError extends Error {
  status: number
  errorCode?: string

  constructor(status: number, statusText: string, errorCode?: string) {
    // Keep the `<status> <statusText>` format — provider.tsx matches on it.
    super(`${status} ${statusText}`)
    this.name = 'ApiError'
    this.status = status
    this.errorCode = errorCode
  }
}

async function request(path: string, init?: RequestInit): Promise<unknown> {
    const headers: Record<string, string> = {}
    // FormData must set its own multipart boundary — no manual Content-Type.
    if (!(init?.body instanceof FormData)) {
        headers['Content-Type'] = 'application/json'
    }
    if (getToken) {
        const token = await getToken()
        headers['Authorization'] = `Bearer ${token}`
    }
    const res = await fetch(`${API_BASE}${path}`, {
        ...init,
        headers,
    });
    if (!res.ok) {
        let errorCode: string | undefined
        try {
            const body = (await res.json()) as { errorCode?: unknown }
            if (typeof body?.errorCode === 'string') errorCode = body.errorCode
        } catch {
            // non-JSON error body — status alone is enough
        }
        throw new ApiError(res.status, res.statusText, errorCode)
    }
    if (res.status === 204) return null
    return res.json()
}

export const apiClient = {
    get:    (path: string) => request(path),
    post:   (path: string, body: unknown) => request(path, { method: 'POST', body: JSON.stringify(body) }),
    put:    (path: string, body: unknown) => request(path, { method: 'PUT', body: JSON.stringify(body) }),
    putMultipart: (path: string, form: FormData) => request(path, { method: 'PUT', body: form }),
    delete: (path: string) => request(path, { method: 'DELETE' }),
}
```

- [ ] **Step 4: Run the full suite** (error shape changed for all callers)

Run: `npx vitest run`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/lib/api-client.ts src/lib/api-client.test.ts
git commit -m "Add ApiError and multipart PUT support to apiClient"
```

---

### Task 3: `useIsAdmin` hook (client-side roles-claim decode)

**Files:**
- Create: `src/hooks/useIsAdmin.ts`
- Test: `src/hooks/useIsAdmin.test.ts` (create)

**Interfaces:**
- Consumes: `useAuth0` from `@auth0/auth0-react`, `useQuery` from `@tanstack/react-query`.
- Produces: `useIsAdmin(): boolean` (default export style: named export) and pure helper `tokenHasAdminRole(token: string): boolean`. Task 6 imports `useIsAdmin` from `../../../hooks/useIsAdmin`.

- [ ] **Step 1: Write the failing tests** — create `src/hooks/useIsAdmin.ts` is NOT yet created; create `src/hooks/useIsAdmin.test.ts`:

```ts
import { describe, it, expect } from 'vitest'
import { tokenHasAdminRole } from './useIsAdmin'

// Build a fake JWT with the given claims as its (base64url) payload.
const makeToken = (claims: Record<string, unknown>) => {
  const payload = btoa(JSON.stringify(claims))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '')
  return `header.${payload}.signature`
}

describe('tokenHasAdminRole', () => {
  it('returns true when the roles claim includes admin', () => {
    const token = makeToken({ 'https://climbing-api/roles': ['admin'] })
    expect(tokenHasAdminRole(token)).toBe(true)
  })

  it('returns false when the roles claim lacks admin', () => {
    const token = makeToken({ 'https://climbing-api/roles': ['editor'] })
    expect(tokenHasAdminRole(token)).toBe(false)
  })

  it('returns false when the claim is missing', () => {
    expect(tokenHasAdminRole(makeToken({ sub: 'auth0|123' }))).toBe(false)
  })

  it('returns false when the claim is not an array', () => {
    expect(tokenHasAdminRole(makeToken({ 'https://climbing-api/roles': 'admin' }))).toBe(false)
  })

  it('fails closed on malformed tokens', () => {
    expect(tokenHasAdminRole('')).toBe(false)
    expect(tokenHasAdminRole('not-a-jwt')).toBe(false)
    expect(tokenHasAdminRole('a.%%%not-base64%%%.c')).toBe(false)
  })
})
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run src/hooks/useIsAdmin.test.ts`
Expected: FAIL — cannot resolve `./useIsAdmin`.

- [ ] **Step 3: Implement** — create `src/hooks/useIsAdmin.ts`:

```ts
import { useQuery } from '@tanstack/react-query'
import { useAuth0 } from '@auth0/auth0-react'

const ROLES_CLAIM = 'https://climbing-api/roles'

/**
 * Checks the Auth0 access token's roles claim for `admin`. Fails closed:
 * any malformed input returns false. Display-only gating — the backend
 * enforces authorization (403) regardless of what the client renders.
 */
export function tokenHasAdminRole(token: string): boolean {
  const payload = token.split('.')[1]
  if (!payload) return false
  try {
    const base64 = payload.replace(/-/g, '+').replace(/_/g, '/')
    const padded = base64.padEnd(base64.length + ((4 - (base64.length % 4)) % 4), '=')
    const claims = JSON.parse(atob(padded)) as Record<string, unknown>
    const roles = claims[ROLES_CLAIM]
    return Array.isArray(roles) && roles.includes('admin')
  } catch {
    return false
  }
}

export const useIsAdmin = (): boolean => {
  const { isAuthenticated, getAccessTokenSilently } = useAuth0()
  const { data } = useQuery({
    queryKey: ['auth', 'is-admin'],
    enabled: isAuthenticated,
    staleTime: Infinity,
    queryFn: async () => {
      try {
        const token = await getAccessTokenSilently({
          authorizationParams: { audience: import.meta.env.VITE_AUTH0_AUDIENCE },
        })
        return tokenHasAdminRole(token)
      } catch {
        return false
      }
    },
  })
  return data ?? false
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run src/hooks/useIsAdmin.test.ts`
Expected: PASS (5 tests).

- [ ] **Step 5: Commit**

```bash
git add src/hooks/useIsAdmin.ts src/hooks/useIsAdmin.test.ts
git commit -m "Add useIsAdmin hook decoding the Auth0 roles claim (fail closed)"
```

---

### Task 4: Upload plumbing — API fn, mutation hook, error messages

**Files:**
- Create: `src/features/walls/api/uploadWallImage.ts`
- Create: `src/features/walls/hooks/useUploadWallImage.ts`
- Create: `src/features/walls/utils/wallImageUpload.ts`
- Test: `src/features/walls/api/uploadWallImage.test.ts`, `src/features/walls/utils/wallImageUpload.test.ts` (create both)

**Interfaces:**
- Consumes: `apiClient.putMultipart`, `ApiError` (Task 2); `WallSchema`, `WALL_IMAGE_MAX_BYTES`, `WALL_IMAGE_TYPES` (Task 1).
- Produces:
  - `uploadWallImage(wallId: number, file: File): Promise<Wall>`
  - `useUploadWallImage()` → `useMutation` taking `{ wallId: number; file: File }`
  - `validateWallImageFile(file: File): string | null` (null = valid, string = exact error copy)
  - `uploadErrorMessage(err: unknown): string`
  Task 6 imports the hook and both helpers.

- [ ] **Step 1: Write the failing tests** — create `src/features/walls/api/uploadWallImage.test.ts`:

```ts
import { describe, it, expect, vi, beforeEach } from 'vitest'

const putMultipart = vi.fn()
vi.mock('../../../lib/api-client', () => ({
  apiClient: { putMultipart: (...args: unknown[]) => putMultipart(...args) },
}))

import { uploadWallImage } from './uploadWallImage'

const wallResponse = {
  id: 5,
  areaId: 2,
  name: 'Main Wall',
  description: null,
  latitude: null,
  longitude: null,
  approachInfo: null,
  createdAt: '2026-06-12T00:00:00Z',
  imageUrl: 'https://r2.example/img.jpg?sig=x',
}

describe('uploadWallImage', () => {
  beforeEach(() => putMultipart.mockReset())

  it('PUTs the file under the multipart part name "image"', async () => {
    putMultipart.mockResolvedValue(wallResponse)
    const file = new File(['x'], 'topo.jpg', { type: 'image/jpeg' })

    const wall = await uploadWallImage(5, file)

    const [path, form] = putMultipart.mock.calls[0] as [string, FormData]
    expect(path).toBe('/walls/5/image')
    expect(form).toBeInstanceOf(FormData)
    expect(form.get('image')).toBe(file)
    expect(wall.imageUrl).toBe('https://r2.example/img.jpg?sig=x')
  })
})
```

And `src/features/walls/utils/wallImageUpload.test.ts`:

```ts
import { describe, it, expect } from 'vitest'
import { ApiError } from '../../../lib/api-client'
import { WALL_IMAGE_MAX_BYTES } from '../../../types/api'
import { validateWallImageFile, uploadErrorMessage } from './wallImageUpload'

describe('validateWallImageFile', () => {
  it('accepts a small jpeg', () => {
    const file = new File(['x'], 'a.jpg', { type: 'image/jpeg' })
    expect(validateWallImageFile(file)).toBeNull()
  })

  it('rejects a disallowed type', () => {
    const file = new File(['x'], 'a.gif', { type: 'image/gif' })
    expect(validateWallImageFile(file)).toBe('Image must be JPEG, PNG or WebP')
  })

  it('rejects an oversized file', () => {
    const file = new File([new ArrayBuffer(WALL_IMAGE_MAX_BYTES + 1)], 'a.png', {
      type: 'image/png',
    })
    expect(validateWallImageFile(file)).toBe('Image is larger than 5 MB')
  })
})

describe('uploadErrorMessage', () => {
  it('maps 400 to the type message', () => {
    expect(uploadErrorMessage(new ApiError(400, 'Bad Request', 'VALIDATION_ERROR')))
      .toBe('Image must be JPEG, PNG or WebP')
  })

  it('maps 413 to the size message', () => {
    expect(uploadErrorMessage(new ApiError(413, 'Payload Too Large')))
      .toBe('Image is larger than 5 MB')
  })

  it('maps 403 to the admin message', () => {
    expect(uploadErrorMessage(new ApiError(403, 'Forbidden')))
      .toBe('Only admins can upload images')
  })

  it('falls back to a generic message', () => {
    expect(uploadErrorMessage(new ApiError(500, 'Internal Server Error')))
      .toBe('Upload failed — please try again')
    expect(uploadErrorMessage(new Error('boom')))
      .toBe('Upload failed — please try again')
  })
})
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run src/features/walls`
Expected: FAIL — modules not found.

- [ ] **Step 3: Implement** — create `src/features/walls/api/uploadWallImage.ts`:

```ts
import { apiClient } from '../../../lib/api-client'
import { WallSchema } from '../../../types/api'

export const uploadWallImage = async (wallId: number, file: File) => {
  const form = new FormData()
  form.append('image', file)
  const raw = await apiClient.putMultipart(`/walls/${wallId}/image`, form)
  return WallSchema.parse(raw)
}
```

Create `src/features/walls/utils/wallImageUpload.ts`:

```ts
import { ApiError } from '../../../lib/api-client'
import { WALL_IMAGE_MAX_BYTES, WALL_IMAGE_TYPES } from '../../../types/api'

const TYPE_ERROR = 'Image must be JPEG, PNG or WebP'
const SIZE_ERROR = 'Image is larger than 5 MB'

/** Pre-upload UX check mirroring the backend limits. null = valid. */
export function validateWallImageFile(file: File): string | null {
  if (!WALL_IMAGE_TYPES.includes(file.type)) return TYPE_ERROR
  if (file.size > WALL_IMAGE_MAX_BYTES) return SIZE_ERROR
  return null
}

/** Maps upload failures to user-facing copy. */
export function uploadErrorMessage(err: unknown): string {
  if (err instanceof ApiError) {
    if (err.status === 400) return TYPE_ERROR
    if (err.status === 413) return SIZE_ERROR
    if (err.status === 403) return 'Only admins can upload images'
  }
  return 'Upload failed — please try again'
}
```

Create `src/features/walls/hooks/useUploadWallImage.ts`:

```ts
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { uploadWallImage } from '../api/uploadWallImage'

export const useUploadWallImage = () => {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ wallId, file }: { wallId: number; file: File }) =>
      uploadWallImage(wallId, file),
    onSuccess: (wall) => {
      queryClient.invalidateQueries({ queryKey: ['walls', wall.id] })
      queryClient.invalidateQueries({ queryKey: ['areas', wall.areaId, 'walls'] })
    },
  })
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run src/features/walls`
Expected: PASS (8 tests across the two new files).

- [ ] **Step 5: Commit**

```bash
git add src/features/walls/api/uploadWallImage.ts src/features/walls/api/uploadWallImage.test.ts src/features/walls/hooks/useUploadWallImage.ts src/features/walls/utils/wallImageUpload.ts src/features/walls/utils/wallImageUpload.test.ts
git commit -m "Add wall image upload API, mutation hook, and error copy helpers"
```

---

### Task 5: Fullscreen `WallImageViewer` (react-zoom-pan-pinch)

**Files:**
- Modify: `package.json` (via `npm install react-zoom-pan-pinch`)
- Create: `src/features/walls/components/WallImageViewer.tsx`
- Test: `src/features/walls/components/WallImageViewer.test.tsx` (create)

**Interfaces:**
- Consumes: `react-zoom-pan-pinch` (`TransformWrapper`, `TransformComponent`).
- Produces: `WallImageViewer({ src, alt, onClose }: { src: string; alt: string; onClose: () => void })`. Task 6 imports it from `./WallImageViewer`.

- [ ] **Step 1: Install the dependency**

Run: `npm install react-zoom-pan-pinch`
Expected: added to `dependencies` in `package.json`.

- [ ] **Step 2: Write the failing test** — create `src/features/walls/components/WallImageViewer.test.tsx`:

```tsx
import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'

// The zoom lib needs real layout measurements — pass children through in jsdom.
vi.mock('react-zoom-pan-pinch', () => ({
  TransformWrapper: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  TransformComponent: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}))

import { WallImageViewer } from './WallImageViewer'

describe('WallImageViewer', () => {
  it('renders the image fullscreen and closes via the close button', () => {
    const onClose = vi.fn()
    render(<WallImageViewer src="https://r2.example/img.jpg" alt="Main Wall" onClose={onClose} />)

    expect(screen.getByRole('img', { name: 'Main Wall' })).toHaveAttribute(
      'src',
      'https://r2.example/img.jpg',
    )
    fireEvent.click(screen.getByRole('button', { name: /close/i }))
    expect(onClose).toHaveBeenCalledOnce()
  })
})
```

- [ ] **Step 3: Run test to verify it fails**

Run: `npx vitest run src/features/walls/components/WallImageViewer.test.tsx`
Expected: FAIL — cannot resolve `./WallImageViewer`.

- [ ] **Step 4: Implement** — create `src/features/walls/components/WallImageViewer.tsx`:

```tsx
import { TransformWrapper, TransformComponent } from 'react-zoom-pan-pinch'

interface WallImageViewerProps {
  src: string
  alt: string
  onClose: () => void
}

/** Fullscreen overlay with pinch-zoom / pan / double-tap zoom. */
export function WallImageViewer({ src, alt, onClose }: WallImageViewerProps) {
  return (
    <div className="fixed inset-0 z-50 bg-ink/95" role="dialog" aria-modal="true">
      <button
        onClick={onClose}
        aria-label="Close"
        className="absolute top-4 right-4 z-10 bg-paper/80 backdrop-blur-sm rounded-full w-11 h-11 text-ink text-lg"
      >
        ✕
      </button>
      <TransformWrapper doubleClick={{ mode: 'zoomIn' }}>
        <TransformComponent
          wrapperClass="!w-full !h-full"
          contentClass="!w-full !h-full flex items-center justify-center"
        >
          <img src={src} alt={alt} className="max-w-full max-h-full object-contain" />
        </TransformComponent>
      </TransformWrapper>
    </div>
  )
}
```

- [ ] **Step 5: Run test to verify it passes**

Run: `npx vitest run src/features/walls/components/WallImageViewer.test.tsx`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add package.json package-lock.json src/features/walls/components/WallImageViewer.tsx src/features/walls/components/WallImageViewer.test.tsx
git commit -m "Add fullscreen wall image viewer with pan/zoom"
```

---

### Task 6: `WallHero` component (image, admin upload, errors, viewer)

**Files:**
- Create: `src/features/walls/components/WallHero.tsx`
- Test: `src/features/walls/components/WallHero.test.tsx` (create)

**Interfaces:**
- Consumes: `useIsAdmin` (Task 3), `useUploadWallImage` (Task 4), `validateWallImageFile` / `uploadErrorMessage` (Task 4), `WallImageViewer` (Task 5), `WALL_IMAGE_TYPES` (Task 1), `Wall` type.
- Produces: `WallHero({ wall, loading, onBack }: { wall: Wall | undefined; loading: boolean; onBack: () => void })`. Task 7 imports it from `../../features/walls/components/WallHero`.

- [ ] **Step 1: Write the failing tests** — create `src/features/walls/components/WallHero.test.tsx`:

```tsx
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import type { Wall } from '../../../types/api'
import { WALL_IMAGE_MAX_BYTES } from '../../../types/api'

const isAdmin = vi.fn()
vi.mock('../../../hooks/useIsAdmin', () => ({ useIsAdmin: () => isAdmin() }))

const mutate = vi.fn()
vi.mock('../hooks/useUploadWallImage', () => ({
  useUploadWallImage: () => ({ mutate, isPending: false }),
}))

vi.mock('./WallImageViewer', () => ({
  WallImageViewer: ({ onClose }: { onClose: () => void }) => (
    <div data-testid="viewer">
      <button onClick={onClose}>close viewer</button>
    </div>
  ),
}))

import { WallHero } from './WallHero'

const wall = (imageUrl: string | null): Wall => ({
  id: 5,
  areaId: 2,
  name: 'Main Wall',
  description: '',
  latitude: null,
  longitude: null,
  approachInfo: '',
  createdAt: '2026-06-12T00:00:00Z',
  imageUrl,
})

const noop = () => {}

describe('WallHero', () => {
  beforeEach(() => {
    isAdmin.mockReturnValue(false)
    mutate.mockReset()
  })

  it('shows the placeholder when there is no image', () => {
    render(<WallHero wall={wall(null)} loading={false} onBack={noop} />)
    expect(screen.getByText('photo')).toBeInTheDocument()
  })

  it('renders the image and opens the fullscreen viewer on tap', () => {
    render(<WallHero wall={wall('https://r2.example/img.jpg')} loading={false} onBack={noop} />)
    expect(screen.queryByTestId('viewer')).not.toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'View photo fullscreen' }))
    expect(screen.getByTestId('viewer')).toBeInTheDocument()
    fireEvent.click(screen.getByText('close viewer'))
    expect(screen.queryByTestId('viewer')).not.toBeInTheDocument()
  })

  it('hides the upload button from non-admins', () => {
    render(<WallHero wall={wall(null)} loading={false} onBack={noop} />)
    expect(screen.queryByRole('button', { name: 'Add photo' })).not.toBeInTheDocument()
  })

  it('shows "Add photo" to admins when there is no image, "Replace photo" otherwise', () => {
    isAdmin.mockReturnValue(true)
    const { rerender } = render(<WallHero wall={wall(null)} loading={false} onBack={noop} />)
    expect(screen.getByRole('button', { name: 'Add photo' })).toBeInTheDocument()
    rerender(<WallHero wall={wall('https://r2.example/img.jpg')} loading={false} onBack={noop} />)
    expect(screen.getByRole('button', { name: 'Replace photo' })).toBeInTheDocument()
  })

  it('rejects a wrong file type before any request', () => {
    isAdmin.mockReturnValue(true)
    render(<WallHero wall={wall(null)} loading={false} onBack={noop} />)
    const input = screen.getByLabelText('Wall photo file')
    const file = new File(['x'], 'a.gif', { type: 'image/gif' })
    fireEvent.change(input, { target: { files: [file] } })
    expect(screen.getByText('Image must be JPEG, PNG or WebP')).toBeInTheDocument()
    expect(mutate).not.toHaveBeenCalled()
  })

  it('rejects an oversized file before any request', () => {
    isAdmin.mockReturnValue(true)
    render(<WallHero wall={wall(null)} loading={false} onBack={noop} />)
    const input = screen.getByLabelText('Wall photo file')
    const file = new File([new ArrayBuffer(WALL_IMAGE_MAX_BYTES + 1)], 'a.png', {
      type: 'image/png',
    })
    fireEvent.change(input, { target: { files: [file] } })
    expect(screen.getByText('Image is larger than 5 MB')).toBeInTheDocument()
    expect(mutate).not.toHaveBeenCalled()
  })

  it('uploads a valid file', () => {
    isAdmin.mockReturnValue(true)
    render(<WallHero wall={wall(null)} loading={false} onBack={noop} />)
    const input = screen.getByLabelText('Wall photo file')
    const file = new File(['x'], 'topo.jpg', { type: 'image/jpeg' })
    fireEvent.change(input, { target: { files: [file] } })
    expect(mutate).toHaveBeenCalledWith(
      { wallId: 5, file },
      expect.objectContaining({ onError: expect.any(Function) }),
    )
  })

  it('calls onBack from the back button', () => {
    const onBack = vi.fn()
    render(<WallHero wall={wall(null)} loading={false} onBack={onBack} />)
    fireEvent.click(screen.getByRole('button', { name: '‹ back' }))
    expect(onBack).toHaveBeenCalledOnce()
  })
})
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run src/features/walls/components/WallHero.test.tsx`
Expected: FAIL — cannot resolve `./WallHero`.

- [ ] **Step 3: Implement** — create `src/features/walls/components/WallHero.tsx`:

```tsx
import { useRef, useState } from 'react'
import type { Wall } from '../../../types/api'
import { WALL_IMAGE_TYPES } from '../../../types/api'
import { useIsAdmin } from '../../../hooks/useIsAdmin'
import { useUploadWallImage } from '../hooks/useUploadWallImage'
import { validateWallImageFile, uploadErrorMessage } from '../utils/wallImageUpload'
import { WallImageViewer } from './WallImageViewer'

interface WallHeroProps {
  wall: Wall | undefined
  loading: boolean
  onBack: () => void
}

export function WallHero({ wall, loading, onBack }: WallHeroProps) {
  const isAdmin = useIsAdmin()
  const upload = useUploadWallImage()
  const [error, setError] = useState<string | null>(null)
  const [viewerOpen, setViewerOpen] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  if (loading) return <div className="h-52 bg-paper-2 animate-pulse" />
  if (!wall) return null

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    e.target.value = '' // allow re-selecting the same file after a failure
    if (!file) return
    const validationError = validateWallImageFile(file)
    if (validationError) {
      setError(validationError)
      return
    }
    setError(null)
    upload.mutate(
      { wallId: wall.id, file },
      { onError: (err) => setError(uploadErrorMessage(err)) },
    )
  }

  return (
    <>
      <div className="relative h-52 bg-paper-2 overflow-hidden">
        {wall.imageUrl ? (
          <button
            onClick={() => setViewerOpen(true)}
            aria-label="View photo fullscreen"
            className="absolute inset-0 w-full h-full"
          >
            <img src={wall.imageUrl} alt={wall.name} className="w-full h-full object-cover" />
          </button>
        ) : (
          <div className="absolute inset-0 flex items-center justify-center text-ink-3 text-sm">
            photo
          </div>
        )}

        <button
          onClick={onBack}
          className="absolute top-4 left-4 bg-paper/80 backdrop-blur-sm rounded-full px-3 py-1.5 text-[12px] text-ink flex items-center gap-1"
        >
          ‹ back
        </button>

        {isAdmin && (
          <>
            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={upload.isPending}
              className="absolute bottom-3 right-3 bg-paper/80 backdrop-blur-sm rounded-full px-3 py-1.5 text-[12px] font-medium text-ink"
            >
              {wall.imageUrl ? 'Replace photo' : 'Add photo'}
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept={WALL_IMAGE_TYPES.join(',')}
              onChange={handleFileChange}
              aria-label="Wall photo file"
              className="hidden"
            />
          </>
        )}

        {upload.isPending && (
          <div className="absolute inset-0 bg-paper/60 flex items-center justify-center">
            <div
              aria-label="Uploading"
              className="h-8 w-8 rounded-full border-2 border-accent border-t-transparent animate-spin"
            />
          </div>
        )}
      </div>

      {error && <p className="px-4 pt-2 text-[13px] text-accent">{error}</p>}

      {viewerOpen && wall.imageUrl && (
        <WallImageViewer
          src={wall.imageUrl}
          alt={wall.name}
          onClose={() => setViewerOpen(false)}
        />
      )}
    </>
  )
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run src/features/walls/components/WallHero.test.tsx`
Expected: PASS (8 tests).

- [ ] **Step 5: Commit**

```bash
git add src/features/walls/components/WallHero.tsx src/features/walls/components/WallHero.test.tsx
git commit -m "Add WallHero with image display, admin upload, and viewer wiring"
```

---

### Task 7: Wire-up — wall page, `WallCard` thumbnail, full verification

**Files:**
- Modify: `src/app/routes/areas.$areaId.walls.$wallId.tsx` (replace the inline hero block, lines ~24–38)
- Modify: `src/features/walls/components/WallCard.tsx` (thumbnail)
- Test: `src/features/walls/components/WallCard.test.tsx` (create)

**Interfaces:**
- Consumes: `WallHero` (Task 6), `Wall.imageUrl` (Task 1).
- Produces: user-visible feature; no new exports.

- [ ] **Step 1: Write the failing WallCard test** — create `src/features/walls/components/WallCard.test.tsx`:

```tsx
import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import type { Wall } from '../../../types/api'

// Link needs router context we don't have here — render a plain anchor.
vi.mock('@tanstack/react-router', () => ({
  Link: ({ children, className }: { children: React.ReactNode; className?: string }) => (
    <a className={className}>{children}</a>
  ),
}))

import { WallCard } from './WallCard'

const wall = (imageUrl: string | null): Wall => ({
  id: 5,
  areaId: 2,
  name: 'Main Wall',
  description: '',
  latitude: null,
  longitude: null,
  approachInfo: '',
  createdAt: '2026-06-12T00:00:00Z',
  imageUrl,
})

describe('WallCard thumbnail', () => {
  it('renders the image when imageUrl is set', () => {
    render(<WallCard wall={wall('https://r2.example/img.jpg')} areaId="2" />)
    expect(screen.getByRole('presentation')).toHaveAttribute('src', 'https://r2.example/img.jpg')
    expect(screen.queryByText('photo')).not.toBeInTheDocument()
  })

  it('keeps the placeholder when imageUrl is null', () => {
    render(<WallCard wall={wall(null)} areaId="2" />)
    expect(screen.getByText('photo')).toBeInTheDocument()
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/features/walls/components/WallCard.test.tsx`
Expected: FAIL — no `img` role / placeholder always present.

- [ ] **Step 3: Implement WallCard thumbnail** — in `src/features/walls/components/WallCard.tsx`, replace the placeholder `<div>` with:

```tsx
      <div className="h-12 w-12 shrink-0 rounded-lg bg-paper-2 border border-ink/10 overflow-hidden flex items-center justify-center text-ink-3 text-[10px]">
        {wall.imageUrl ? (
          <img src={wall.imageUrl} alt="" className="h-full w-full object-cover" />
        ) : (
          'photo'
        )}
      </div>
```

(`alt=""` — decorative; the wall name sits right next to it. An empty alt gives the img `role="presentation"`.)

- [ ] **Step 4: Wire WallHero into the wall page** — in `src/app/routes/areas.$areaId.walls.$wallId.tsx`:

Add the import:

```tsx
import { WallHero } from '../../features/walls/components/WallHero'
```

Replace the entire hero block (the `{wallLoading ? (<div className="h-52 …/>) : (<div className="relative h-52 …>…</div>)}` ternary — currently lines 24–38) with:

```tsx
      <WallHero wall={wall} loading={wallLoading} onBack={() => navigate({ to: '/' })} />
```

The rest of the page (title, description, routes list) is unchanged. `navigate` is already in scope.

- [ ] **Step 5: Run the full suite, lint, and build**

Run: `npx vitest run`
Expected: PASS — all suites.

Run: `npm run lint`
Expected: no errors.

Run: `npm run build`
Expected: clean `tsc -b` + Vite build (no new route files were added, so no route-tree regen issue).

- [ ] **Step 6: Commit**

```bash
git add src/app/routes/areas.\$areaId.walls.\$wallId.tsx src/features/walls/components/WallCard.tsx src/features/walls/components/WallCard.test.tsx
git commit -m "Render wall images on wall page and cards via WallHero"
```

---

## Verification (post-plan)

- All tasks committed on `feature/33-wall-images`; `npx vitest run`, `npm run lint`, `npm run build` all clean.
- Manual smoke (optional, needs backend + admin Auth0 user): wall with image renders hero; tap → fullscreen pinch/zoom; admin sees Add/Replace photo; GIF upload → type error; >5 MB → size error; non-admin forced request → 403 message.
