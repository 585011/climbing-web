import { z } from 'zod'

export const ClimbingAreaSchema = z.object({
  id: z.number(),
  name: z.string(),
  description: z.string().nullable().transform(v => v ?? ''),
  latitude: z.number(),
  longitude: z.number(),
  region: z.string().nullable().transform(v => v ?? ''),
  createdAt: z.string(),
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
  createdAt: z.string(),
})

export type Wall = z.infer<typeof WallSchema>

export const ClimbingRouteSchema = z.object({
  id: z.number(),
  wallId: z.number(),
  name: z.string(),
  grade: z.string().nullable().transform(v => v ?? ''),
  length: z.number().nullable().transform(v => v ?? 0),
  style: z.string().nullable().transform(v => v ?? ''),
  bolts: z.number().nullable().transform(v => v ?? 0),
  ropeLengths: z.number().nullable().transform(v => v ?? 0),
  firstAscendant: z.string().nullable().transform(v => v ?? ''),
  description: z.string().nullable().transform(v => v ?? ''),
  createdAt: z.string(),
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

/**
 * Wall image upload limits. Single source of truth — referenced by the file
 * input's `accept`, the pre-upload check, and tests. Client-side checks are
 * UX / defense-in-depth only; the backend is the authoritative validator
 * (400 VALIDATION_ERROR / 413 PAYLOAD_TOO_LARGE).
 */
export const WALL_IMAGE_MAX_BYTES = 20 * 1024 * 1024
export const WALL_IMAGE_TYPES: readonly string[] = ['image/jpeg', 'image/png', 'image/webp']

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
