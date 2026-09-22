import { describe, it, expect } from 'vitest'
import { routeDisplayName } from './routeDisplayName'

describe('routeDisplayName', () => {
  it('prefers the route name', () => {
    expect(routeDisplayName({ name: 'Svaet', holdColor: 'yellow' })).toBe('Svaet')
  })
  it('falls back to the hold colour', () => {
    expect(routeDisplayName({ name: '', holdColor: 'yellow' })).toBe('Yellow route')
  })
  it('falls back to a placeholder', () => {
    expect(routeDisplayName({ name: '', holdColor: '' })).toBe('Unnamed route')
  })
})
