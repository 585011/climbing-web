import { describe, it, expect } from 'vitest'
import { PERSONAL_NOTE_MAX, TickInputSchema } from './api'

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
