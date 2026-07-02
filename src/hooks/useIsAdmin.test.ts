import { describe, it, expect } from 'vitest'
import { tokenHasAdminRole } from './useIsAdmin'

// Build a fake JWT with the given claims as its (base64url) payload.
const makeToken = (claims: Record<string, unknown>) => {
  const payload = btoa(JSON.stringify(claims))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '')
  return `header.${payload}.signature`
}

describe('tokenHasAdminRole', () => {
  it('returns true when the roles claim includes admin', () => {
    const token = makeToken({ 'https://climbing-api/roles': ['admin'] })
    expect(tokenHasAdminRole(token)).toBe(true)
  })

  it('returns false when the roles claim lacks admin', () => {
    const token = makeToken({ 'https://climbing-api/roles': ['editor'] })
    expect(tokenHasAdminRole(token)).toBe(false)
  })

  it('returns false when the claim is missing', () => {
    expect(tokenHasAdminRole(makeToken({ sub: 'auth0|123' }))).toBe(false)
  })

  it('returns false when the claim is not an array', () => {
    expect(tokenHasAdminRole(makeToken({ 'https://climbing-api/roles': 'admin' }))).toBe(false)
  })

  it('fails closed on malformed tokens', () => {
    expect(tokenHasAdminRole('')).toBe(false)
    expect(tokenHasAdminRole('not-a-jwt')).toBe(false)
    expect(tokenHasAdminRole('a.%%%not-base64%%%.c')).toBe(false)
  })
})
