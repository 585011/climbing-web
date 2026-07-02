import { describe, it, expect } from 'vitest'
import { PERSONAL_NOTE_MAX, TickInputSchema, WallSchema, WALL_IMAGE_MAX_BYTES, WALL_IMAGE_TYPES } from './api'

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
  it('caps size at 5 MB and allows exactly three MIME types', () => {
    expect(WALL_IMAGE_MAX_BYTES).toBe(5 * 1024 * 1024)
    expect(WALL_IMAGE_TYPES).toEqual(['image/jpeg', 'image/png', 'image/webp'])
  })
})
