# Wall images: render, fullscreen viewer, admin upload — design

Date: 2026-07-02
Issue: https://github.com/585011/climbing-web/issues/33 (backend contract: climbing-api#44)

## Scope

Existing walls only:

- Render the new nullable `imageUrl` field on wall pages and wall cards.
- Fullscreen pan/zoom image viewer available to all users.
- Admin-only add/replace image via `PUT /api/walls/{id}/image` (multipart).

**Out of scope:** wall-creation UI (and therefore the multipart `POST /api/walls`
variant), refresh-on-image-error machinery, backend changes.

## Backend contract (fixed, already deployed)

- `WallResponse.imageUrl: string | null` — a **short-lived presigned URL**
  (~15 min). Always use the value from the latest response; never cache it
  long-term. `null` = no image.
- `PUT /api/walls/{id}/image` — `multipart/form-data`, single file part named
  `image`. Replaces any existing image.
- Allowed types: `image/jpeg`, `image/png`, `image/webp` → otherwise `400`
  (`errorCode: VALIDATION_ERROR`). Max size 5 MB → `413`
  (`errorCode: PAYLOAD_TOO_LARGE`). Non-admin → `403` (`errorCode: FORBIDDEN`).
- Admin is determined server-side from the Auth0 JWT roles claim
  `https://climbing-api/roles` (Spring Security `hasRole("admin")`).

## Design

### 1. Types (`src/types/api.ts`)

- `WallSchema` gains `imageUrl: z.string().nullable()`, with a comment noting
  it is a ~15-min presigned URL.
- New exported constants (single source of truth, same pattern as
  `PERSONAL_NOTE_MAX`):
  - `WALL_IMAGE_MAX_BYTES = 5 * 1024 * 1024`
  - `WALL_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp']`
  Reused by the file input's `accept`, the pre-upload check, and tests.
  Client-side checks are UX / defense-in-depth only; the backend is the
  authoritative validator.

### 2. API client (`src/lib/api-client.ts`)

- New `apiClient.putMultipart(path, formData)` — sends the Authorization
  header but **no** `Content-Type` header, so the browser sets the multipart
  boundary itself.
- New `ApiError extends Error` carrying `status: number` and
  `errorCode?: string` (parsed from the backend JSON error body when present).
  `request()` throws `ApiError` instead of today's bare
  `Error('<status> <statusText>')`, so callers can branch on status without
  string-sniffing. Message stays compatible (`'<status> <statusText>'`) so the
  existing `startsWith('404 ')` check in `src/app/provider.tsx` keeps working.

### 3. Upload feature (`src/features/walls/`)

- `api/uploadWallImage.ts` — builds a `FormData` with the file under the part
  name `image`, calls `apiClient.putMultipart('/walls/{id}/image')`, parses
  the response with `WallSchema`.
- `hooks/useUploadWallImage.ts` — `useMutation`; on success invalidates
  `['walls', wallId]` and `['areas', areaId, 'walls']`.

### 4. Admin detection (`src/hooks/useIsAdmin.ts`)

- Fetches the access token via `getAccessTokenSilently`, base64url-decodes the
  JWT payload (extracted as a pure, unit-testable function), and checks whether
  the `https://climbing-api/roles` claim includes `admin`.
- Returns `false` while loading, when unauthenticated, or on any decode
  failure — **fail closed**.
- Display-only gating: hides the upload button. Authorization is enforced by
  the backend; a user forcing the button on still gets `403`.
- Note: decoding the access token client-side reads data the SPA already
  holds; it is not a security exposure. The roles claim is signed by Auth0 and
  cannot be forged.

### 5. UI

**Wall page hero** (`src/app/routes/areas.$areaId.walls.$wallId.tsx` +
new components in `src/features/walls/components/`):

- When `imageUrl` is set: render it as the hero image (`object-cover`).
  Otherwise keep the current "photo" placeholder.
- Tapping the image opens a fullscreen overlay viewer built on
  `react-zoom-pan-pinch` (pinch-zoom, pan, double-tap zoom) with a close
  button. Viewer component lives in `src/features/walls/components/`
  (single consumer today; promote to shared if reused).
- Admins additionally see an overlay button on the hero — "Add photo" when
  `imageUrl` is null, "Replace photo" otherwise — wired to a hidden
  `<input type="file" accept={WALL_IMAGE_TYPES.join(',')}>`.
- On file selection: client-side type/size pre-check → upload with a spinner
  over the hero → on failure, an inline error line beneath the hero:
  - wrong type (client or 400): "Image must be JPEG, PNG or WebP"
  - too large (client or 413): "Image is larger than 5 MB"
  - 403: "Only admins can upload images"
  - anything else: generic failure message
- Large tap targets and high contrast per the mobile/sunlight UX target.

**`WallCard`** (`src/features/walls/components/WallCard.tsx`): render the
image as the thumbnail when `imageUrl` is present; keep the placeholder
otherwise.

### 6. Presigned-URL freshness

TanStack Query's default `staleTime: 0` refetches wall data on mount, so URLs
are consumed minutes after issue — well inside the ~15-min window. No
image-error refresh logic (YAGNI).

### 7. Testing (Vitest + @testing-library/react, co-located)

- `WallSchema` parses `imageUrl` as string and as null.
- `uploadWallImage` sends the file under part name `image` and parses the
  response.
- Token decode: valid admin claim → true; missing claim, malformed token,
  no token → false (fail closed).
- Components: viewer opens on image tap; upload button hidden for
  non-admins and shown for admins; per-status error messages render; wrong
  type / oversized file rejected before any request.

### 8. New dependency

`react-zoom-pan-pinch` (~7 kB gz, zero runtime deps).
