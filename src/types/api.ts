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
