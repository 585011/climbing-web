import { z } from 'zod'

export const ClimbingAreaSchema = z.object({
  id: z.number(),
  name: z.string(),
  description: z.string(),
  latitude: z.number(),
  longitude: z.number(),
  region: z.string(),
  createdAt: z.string(),
})

export type ClimbingArea = z.infer<typeof ClimbingAreaSchema>

export const WallSchema = z.object({
  id: z.number(),
  areaId: z.number(),
  name: z.string(),
  description: z.string(),
  latitude: z.number(),
  longitude: z.number(),
  approachInfo: z.string(),
  createdAt: z.string(),
})

export type Wall = z.infer<typeof WallSchema>

export const ClimbingRouteSchema = z.object({
  id: z.number(),
  wallId: z.number(),
  name: z.string(),
  grade: z.string(),
  length: z.number(),
  style: z.string(),
  bolts: z.number(),
  ropeLengths: z.number(),
  firstAscendant: z.string(),
  description: z.string(),
  createdAt: z.string(),
})

export type ClimbingRoute = z.infer<typeof ClimbingRouteSchema>

export const apiDataResponse = <T extends z.ZodTypeAny>(schema: T) =>
  z.object({ data: schema })
