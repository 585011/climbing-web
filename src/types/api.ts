import { z } from 'zod'

export const ClimbingAreaSchema = z.object({
  id: z.number(),
  name: z.string(),
  description: z.string().nullable().transform(v => v ?? ''),
  latitude: z.number(),
  longitude: z.number(),
  region: z.string().nullable().transform(v => v ?? ''),
  createdAt: z.string(),
  /** Total routes across all of the area's walls; absent until the API deploy that adds it. */
  routeCount: z.number().optional(),
  /** Outdoor crag or indoor gym; absent until the API deploy that adds it. */
  type: z.enum(['crag', 'gym']).optional().transform(v => v ?? 'crag'),
})

export type ClimbingArea = z.infer<typeof ClimbingAreaSchema>

export const WallSchema = z.object({
  id: z.number(),
  areaId: z.number(),
  name: z.string(),
  description: z.string().nullable().transform(v => v ?? ''),
  latitude: z.number().nullable(),
  longitude: z.number().nullable(),
  approachInfo: z.string().nullable().transform(v => v ?? ''),
  /** Short-lived (~15 min) presigned URL — always use the latest response, never cache long-term. */
  imageUrl: z.string().nullable(),
  /** Short-lived presigned URL for the small list thumbnail; may be absent on pre-backfill walls. */
  thumbnailUrl: z.string().nullish(),
  createdAt: z.string(),
})

export type Wall = z.infer<typeof WallSchema>

export const ClimbingRouteSchema = z.object({
  id: z.number(),
  wallId: z.number(),
  // Gym routes are often unnamed.
  name: z.string().nullable().transform(v => v ?? ''),
  grade: z.string().nullable().transform(v => v ?? ''),
  length: z.number().nullable().transform(v => v ?? 0),
  style: z.string().nullable().transform(v => v ?? ''),
  bolts: z.number().nullable().transform(v => v ?? 0),
  ropeLengths: z.number().nullable().transform(v => v ?? 0),
  firstAscendant: z.string().nullable().transform(v => v ?? ''),
  description: z.string().nullable().transform(v => v ?? ''),
  createdAt: z.string(),
  /** Gym routes are identified by hold colour; empty for crag routes. */
  holdColor: z.string().nullish().transform(v => v ?? ''),
  /** Set when a gym route has been rotated out; retired routes keep their ticks. */
  retiredAt: z.string().nullish().transform(v => v ?? null),
})

export type ClimbingRoute = z.infer<typeof ClimbingRouteSchema>

export const UserRouteTickSchema = z.object({
  id: z.number(),
  userId: z.number(),
  routeId: z.number(),
  tickedAt: z.string(),
  style: z.string().nullable().transform(v => v ?? ''),
  rating: z.number().nullable().transform(v => v ?? 0),
  personalNote: z.string().nullable().transform(v => v ?? ''),
  /**
   * Gym ticks only. Short-lived presigned URL — always use the latest response.
   * Absent until the API deploy that adds tick photos.
   */
  photoUrl: z.string().nullish().transform(v => v ?? null),
})

export type UserRouteTick = z.infer<typeof UserRouteTickSchema>

/**
 * Max length for a tick's personal note. Single source of truth — referenced by
 * the form's `maxLength`, the live counter, and `TickInputSchema` below.
 * NOTE: client-side validation is UX / defense-in-depth only; the backend must
 * enforce the same limit (it is the authoritative validator).
 */
export const PERSONAL_NOTE_MAX = 500

/**
 * Validates the tick write payload (create + update) before it leaves the client.
 * Unlike `UserRouteTickSchema` (which leniently parses server responses), this
 * guards user-supplied input: trims strings, caps the note, and bounds the rating.
 */
export const TickInputSchema = z.object({
  style: z.string().trim().min(1).optional(),
  rating: z.number().int().min(1).max(5).optional(),
  personalNote: z.string().trim().max(PERSONAL_NOTE_MAX).optional(),
})

export type TickInput = z.infer<typeof TickInputSchema>

/** Route disciplines accepted by the backend's `routes.style` enum. */
export const ROUTE_STYLES = ['boulder', 'sport', 'toprope', 'speed', 'trad'] as const

/**
 * Validates a gym route a user creates while ticking (`newRoute` on the tick
 * request). Mirrors the backend's NewGymRouteRequest; the backend is authoritative.
 */
export const NewGymRouteInputSchema = z.object({
  wallId: z.number().int().min(1),
  grade: z.string().trim().min(1).max(20).regex(/^[a-zA-Z0-9+\-/. ]*$/, 'grade contains invalid characters.'),
  style: z.enum(ROUTE_STYLES),
  holdColor: z
    .string()
    .trim()
    .max(30)
    .regex(/^[\p{L}\s-]*$/u, 'holdColor may only contain letters, spaces and hyphens.')
    .optional()
    .transform(v => v || undefined),
  name: z.string().trim().max(200).optional().transform(v => v || undefined),
})

export type NewGymRouteInput = z.input<typeof NewGymRouteInputSchema>

/**
 * Wall image upload limits. Single source of truth — referenced by the file
 * input's `accept`, the pre-upload check, and tests. Client-side checks are
 * UX / defense-in-depth only; the backend is the authoritative validator
 * (400 VALIDATION_ERROR / 413 PAYLOAD_TOO_LARGE).
 */
export const WALL_IMAGE_MAX_BYTES = 20 * 1024 * 1024
export const WALL_IMAGE_TYPES: readonly string[] = ['image/jpeg', 'image/png', 'image/webp']

/**
 * Display-name limits for the Me page. Mirrors the backend's
 * UpdateUserRequest validation (NotBlank, max 100, charset pattern) —
 * client-side checks are UX / defense-in-depth only; the backend is
 * the authoritative validator.
 */
export const DISPLAY_NAME_MAX = 100

export const UpdateUserInputSchema = z.object({
  email: z.string().trim().min(1),
  displayName: z
    .string()
    .trim()
    .min(1)
    .max(DISPLAY_NAME_MAX)
    .regex(/^[\p{L}\p{N}\s'\-_.]*$/u, 'displayName contains invalid characters.'),
})

export type UpdateUserInput = z.infer<typeof UpdateUserInputSchema>

export const UserSchema = z.object({
  id: z.number(),
  email: z.string(),
  displayName: z.string().nullable().transform(v => v ?? ''),
  createdAt: z.string(),
  auth0Id: z.string(),
})

export type User = z.infer<typeof UserSchema>

export const apiDataResponse = <T extends z.ZodTypeAny>(schema: T) =>
  z.object({ data: schema })
