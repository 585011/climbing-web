import { useQuery } from '@tanstack/react-query'
import { useAuth0 } from '@auth0/auth0-react'

const ROLES_CLAIM = 'https://climbing-api/roles'

/**
 * Checks the Auth0 access token's roles claim for `admin`. Fails closed:
 * any malformed input returns false. Display-only gating — the backend
 * enforces authorization (403) regardless of what the client renders.
 */
export function tokenHasAdminRole(token: string): boolean {
  const payload = token.split('.')[1]
  if (!payload) return false
  try {
    const base64 = payload.replace(/-/g, '+').replace(/_/g, '/')
    const padded = base64.padEnd(base64.length + ((4 - (base64.length % 4)) % 4), '=')
    const claims = JSON.parse(atob(padded)) as Record<string, unknown>
    const roles = claims[ROLES_CLAIM]
    return Array.isArray(roles) && roles.includes('admin')
  } catch {
    return false
  }
}

export const useIsAdmin = (): boolean => {
  const { isAuthenticated, getAccessTokenSilently } = useAuth0()
  const { data } = useQuery({
    queryKey: ['auth', 'is-admin'],
    enabled: isAuthenticated,
    staleTime: Infinity,
    queryFn: async () => {
      try {
        const token = await getAccessTokenSilently({
          authorizationParams: { audience: import.meta.env.VITE_AUTH0_AUDIENCE },
        })
        return tokenHasAdminRole(token)
      } catch {
        return false
      }
    },
  })
  return data ?? false
}
