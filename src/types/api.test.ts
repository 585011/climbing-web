import { describe, it, expect } from 'vitest'
import { ClimbingAreaSchema, ClimbingRouteSchema, NewGymRouteInputSchema, PERSONAL_NOTE_MAX, TickInputSchema, UserRouteTickSchema, WallSchema, WALL_IMAGE_MAX_BYTES, WALL_IMAGE_TYPES } from './api'

describe('TickInputSchema', () => {
  it('accepts a note exactly at the max length', () => {
    const note = 'a'.repeat(PERSONAL_NOTE_MAX)
    const result = TickInputSchema.safeParse({ style: 'redpoint', personalNote: note })
    expect(result.success).toBe(true)
  })

  it('rejects a note over the max length', () => {
    const note = 'a'.repeat(PERSONAL_NOTE_MAX + 1)
    const result = TickInputSchema.safeParse({ style: 'redpoint', personalNote: note })
    expect(result.success).toBe(false)
  })

  it('trims surrounding whitespace from the note and style', () => {
    const parsed = TickInputSchema.parse({ style: '  flash  ', personalNote: '  beta  ' })
    expect(parsed.style).toBe('flash')
    expect(parsed.personalNote).toBe('beta')
  })

  it('rejects an empty (whitespace-only) style', () => {
    const result = TickInputSchema.safeParse({ style: '   ' })
    expect(result.success).toBe(false)
  })

  it('rejects a rating outside 1–5', () => {
    expect(TickInputSchema.safeParse({ rating: 0 }).success).toBe(false)
    expect(TickInputSchema.safeParse({ rating: 6 }).success).toBe(false)
    expect(TickInputSchema.safeParse({ rating: 2.5 }).success).toBe(false)
    expect(TickInputSchema.safeParse({ rating: 3 }).success).toBe(true)
  })

  it('allows an entirely empty payload (all fields optional)', () => {
    expect(TickInputSchema.safeParse({}).success).toBe(true)
  })
})

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
  it('caps size at 20 MB and allows exactly three MIME types', () => {
    expect(WALL_IMAGE_MAX_BYTES).toBe(20 * 1024 * 1024)
    expect(WALL_IMAGE_TYPES).toEqual(['image/jpeg', 'image/png', 'image/webp'])
  })
})

describe('gym fields', () => {
  const baseArea = { id: 1, name: 'A', description: null, latitude: 1, longitude: 1, region: null, createdAt: 'x' }
  const baseRoute = {
    id: 1, wallId: 2, name: null, grade: '6B', length: null, style: 'boulder', bolts: null,
    ropeLengths: null, firstAscendant: null, description: null, createdAt: 'x',
  }

  it('defaults area type to crag for pre-gym API responses', () => {
    expect(ClimbingAreaSchema.parse(baseArea).type).toBe('crag')
    expect(ClimbingAreaSchema.parse({ ...baseArea, type: 'gym' }).type).toBe('gym')
  })

  it('accepts unnamed gym routes and normalises holdColor/retiredAt', () => {
    const parsed = ClimbingRouteSchema.parse(baseRoute)
    expect(parsed.name).toBe('')
    expect(parsed.holdColor).toBe('')
    expect(parsed.retiredAt).toBeNull()
    const gym = ClimbingRouteSchema.parse({ ...baseRoute, holdColor: 'yellow', retiredAt: '2026-09-01T00:00:00Z' })
    expect(gym.holdColor).toBe('yellow')
    expect(gym.retiredAt).toBe('2026-09-01T00:00:00Z')
  })
})

describe('NewGymRouteInputSchema', () => {
  it('trims and drops empty optional fields', () => {
    const parsed = NewGymRouteInputSchema.parse({ wallId: 5, grade: ' 6B ', style: 'boulder', holdColor: ' ', name: '' })
    expect(parsed).toEqual({ wallId: 5, grade: '6B', style: 'boulder' })
  })

  it('requires grade and a known style', () => {
    expect(NewGymRouteInputSchema.safeParse({ wallId: 5, grade: '', style: 'boulder' }).success).toBe(false)
    expect(NewGymRouteInputSchema.safeParse({ wallId: 5, grade: '6B', style: 'alpine' }).success).toBe(false)
  })

  it('accepts Norwegian letters in hold colours', () => {
    expect(NewGymRouteInputSchema.safeParse({ wallId: 5, grade: '6B', style: 'boulder', holdColor: 'grønn' }).success).toBe(true)
  })
})

describe('UserRouteTickSchema photoUrl', () => {
  const baseTick = {
    id: 1, userId: 7, routeId: 42, tickedAt: '2026-10-01T00:00:00Z', style: 'flash', rating: null, personalNote: null,
  }

  it('defaults to null for pre-photo API responses', () => {
    expect(UserRouteTickSchema.parse(baseTick).photoUrl).toBeNull()
  })

  it('parses a presigned photo URL', () => {
    const parsed = UserRouteTickSchema.parse({ ...baseTick, photoUrl: 'https://r2.example/tick.jpg?sig=x' })
    expect(parsed.photoUrl).toBe('https://r2.example/tick.jpg?sig=x')
  })
})
