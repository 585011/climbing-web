# Image performance (issue #50) — design

**Date:** 2026-07-06
**Status:** Approved
**Issue:** https://github.com/585011/climbing-web/issues/50
**Scope:** Cross-repo — climbing-api (backend, the bulk) + climbing-web (frontend, small). Backend ships first.

## Problem

The crag list (`/`) renders wall images that are stored and served as their **original** uploads — 1–18 MB PNGs — then squeezed into ~72 px card thumbnails. The backend stores raw upload bytes unmodified (`R2StorageService.upload`), so no size reduction ever happens. Lazy-loading is already in place but the raw byte volume still makes the list render slowly, top to bottom.

## Decision

On upload, generate two resized **JPEG** variants (a small thumbnail and an optimized full-size) in addition to keeping the original. Serve the thumbnail to the crag list and the optimized-full to the wall/area hero. Migrate existing images with an idempotent admin backfill endpoint.

### Decisions locked during brainstorming

- **Format: JPEG, pure-JVM** (Thumbnailator). Thumbnailing delivers ~99.8% of the win (18 MB → ~20 KB thumbnail); WebP would add ~30% on top of an already-tiny file but requires native `cwebp`/`dwebp` binaries that force a glibc container base and a runtime exec. Not worth the infra risk now; revisit as a fast-follow if bandwidth still bites.
- **Keep the original** + add variant keys. Storage is cheap; keeping the original lets us re-encode later (e.g. add WebP) with no re-uploads.
- **Backfill via a one-off admin endpoint** — idempotent, re-runnable, explicit; triggered manually once.

Rejected: Cloudflare Image Resizing (costs + config, user chose backend), frontend-only preload/cache (cannot shrink the download), discarding originals, lazy on-read generation, startup runner.

## Backend design (climbing-api)

### Dependency
Add `net.coobird:thumbnailator` (pure-JVM; reads PNG/JPEG via ImageIO, writes JPEG).

### `ImageVariantService` (new)
```
data class ImageVariants(val optimized: ByteArray, val thumbnail: ByteArray, val contentType: String)
fun generate(bytes: ByteArray, contentType: String): ImageVariants
```
- **thumbnail:** max width **400 px**, JPEG quality **0.80**
- **optimized:** max width **1080 px**, JPEG quality **0.82**
- Preserve aspect ratio; **never upscale** (variant width = min(target, source width)).
- Dimensions and qualities live as named constants (single source of truth).
- **WebP-input edge case:** ImageIO cannot decode WebP. If decoding yields no image, fall back to using the original bytes for both variants with the original content type. WebP uploads are already small, so this is acceptable and avoids a native reader dependency. Documented behaviour, not an error.
- Genuinely corrupt/undecodable non-WebP input → `IllegalArgumentException` (maps to 400 via the existing handler).

### Storage
`StorageService` gains `fun get(key: String): ByteArray` (download an original for backfill). `R2StorageService` implements via `getObject`. Existing `upload`/`delete`/`presignGet` unchanged; upload is simply called three times.

### Schema (Flyway V6)
```sql
ALTER TABLE walls
  ADD COLUMN optimized_key varchar,
  ADD COLUMN thumbnail_key varchar;
```
Both nullable. `image_key` remains the **original** key.

### Model / repository
`Wall` gains `optimizedKey: String?` and `thumbnailKey: String?`. The row mapper and insert/update statements in `WallRepository` carry all three keys. The image-key update path sets all three together.

### `WallService`
- Upload path (`create`, `replaceImage`): validate (unchanged limits/types) → `ImageVariantService.generate` → upload **original + optimized + thumbnail** (3 objects) → persist the 3 keys. Original is always kept.
- Failure compensation (row insert fails) deletes all three newly-created objects. `replaceImage` deletes all three **old** keys after a successful swap.
- New `backfillImages(): BackfillResult` — iterate walls where `imageKey != null` and (`optimizedKey == null` or `thumbnailKey == null`); download the original via `StorageService.get`; regenerate variants; upload; update the row. Idempotent (skips already-done walls). A per-wall failure is logged and counted, not fatal to the run. Returns `{ processed, failed }`.

### Response / mapper
`WallResponse` gains `thumbnailUrl: String?`. In `WallMapper`:
- `imageUrl = presignGet(optimizedKey ?: imageKey)` — serve the optimized full, fall back to the original for not-yet-backfilled walls.
- `thumbnailUrl = presignGet(thumbnailKey ?: imageKey)` — serve the thumbnail, fall back to the original.

This keeps unprocessed walls rendering (at large size) until the backfill runs.

### Endpoint
`POST /api/walls/backfill-images` → returns `{ processed, failed }`. Admin-only for free: the existing `SecurityConfig` matcher `POST /api/walls/**` already requires `hasRole("admin")`. No security-config change.

### Tests (existing Testcontainers + MockMvc patterns)
- `ImageVariantService`: output dimensions shrink to the caps, output is JPEG, aspect ratio preserved, no upscale of a small source, WebP-input falls back to original bytes.
- `WallService`: create stores three distinct keys, replace deletes the three old keys, backfill is idempotent (second run processes 0), backfill skips walls with no original.
- `WallMapper`: `imageUrl` prefers optimized then original; `thumbnailUrl` prefers thumbnail then original.
- Controller: `POST /api/walls/backfill-images` requires admin (401/403 without the role), returns the count shape.

## Frontend design (climbing-web)

- `WallSchema` (`src/types/api.ts`) gains `thumbnailUrl: z.string().nullish()` (accepts string, null, or absent — a wall predating the backend deploy still parses).
- `src/app/routes/index.tsx` builds `imageByAreaId` from `wall.thumbnailUrl ?? wall.imageUrl` (thumbnail for the crag list, original-fallback if a wall predates backfill).
- Wall and area hero components already consume `imageUrl` (now the optimized variant) — they benefit with no code change.
- Update the affected tests (`getWalls`/schema test, `index` crag-list test) for the new field.
- **CSP `img-src` pinning stays deferred.** Presigned R2 URLs come from a stable host, but pinning is out of scope here; track as a later hardening pass. (See the auth-persistence spec's FIND-001 note.)

## Rollout order

1. climbing-api: merge → deploy → run `POST /api/walls/backfill-images` once with an admin token.
2. climbing-web: merge → deploy. (Safe in either order because of the `?: imageKey` fallbacks, but backend-first means the frontend immediately sees thumbnails.)

## Decomposition

One spec (this file, in climbing-web). Two implementation plans:
- **Plan A — climbing-api** (backend pipeline + backfill), written into the climbing-api repo, shipped first.
- **Plan B — climbing-web** (schema + crag-list wiring), shipped after.

## Out of scope

- WebP output (possible fast-follow).
- Multi-image topo gallery (climbing-api#52 / climbing-web#36) — separate effort; this stays on the single-image model.
- CSP `img-src` pinning.
- Preload / client-side caching (issue #50 options 3 & 4) — not needed once payloads are small.
