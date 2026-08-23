import { useEffect, type ReactNode } from 'react'
import { Auth0Provider, useAuth0 } from '@auth0/auth0-react'
import { apiClient, configureAuth } from '../lib/api-client'

type AppProviderProps = {
  children: ReactNode
}

async function syncBackendUser(displayName: string, email: string) {
  try {
    await apiClient.get('/users/me')
  } catch (e) {
    if (e instanceof Error && e.message.startsWith('404 ')) {
      try {
        await apiClient.post('/users/me', { displayName, email })
      } catch (postErr) {
        console.error('[UserSync] Failed to register user in backend:', postErr)
      }
    } else {
      console.error('[UserSync] Failed to check user registration:', e)
    }
  }
}

// Auth0 rejects with these when the cached session can no longer be renewed —
// a rotated-away, revoked or expired refresh token. Nothing client-side can
// recover it, so every later request would fail until localStorage is cleared
// by hand. Send the user back through login instead.
const UNRECOVERABLE_SESSION_ERRORS = ['invalid_grant', 'missing_refresh_token', 'login_required']

const isUnrecoverableSession = (e: unknown): boolean =>
  typeof e === 'object' &&
  e !== null &&
  'error' in e &&
  typeof (e as { error: unknown }).error === 'string' &&
  UNRECOVERABLE_SESSION_ERRORS.includes((e as { error: string }).error)

const AuthSync = ({ children }: { children: ReactNode }) => {
  const { getAccessTokenSilently, loginWithRedirect, isAuthenticated, user } = useAuth0()

  useEffect(() => {
    // Concurrent requests fail together; only the first should kick off a redirect.
    let reauthenticating = false

    configureAuth(async () => {
      try {
        return await getAccessTokenSilently({
          authorizationParams: { audience: import.meta.env.VITE_AUTH0_AUDIENCE },
        })
      } catch (e) {
        if (isUnrecoverableSession(e) && !reauthenticating) {
          reauthenticating = true
          loginWithRedirect().catch((redirectErr) => {
            reauthenticating = false
            console.error('[Auth] Re-authentication failed:', redirectErr)
          })
        }
        throw e
      }
    })
  }, [getAccessTokenSilently, loginWithRedirect])

  useEffect(() => {
    if (isAuthenticated && user?.email) {
      syncBackendUser(user.name ?? user.email, user.email)
    }
  }, [isAuthenticated, user])

  return <>{children}</>
}

export const AppProvider = ({ children }: AppProviderProps) => (
  <Auth0Provider
    domain={import.meta.env.VITE_AUTH0_DOMAIN}
    clientId={import.meta.env.VITE_AUTH0_CLIENT_ID}
    cacheLocation="localstorage"
    useRefreshTokens={true}
    // v2 defaults this to false, leaving a failed refresh grant with no recovery path.
    useRefreshTokensFallback={true}
    authorizationParams={{
      redirect_uri: window.location.origin,
      audience: import.meta.env.VITE_AUTH0_AUDIENCE,
      scope: 'openid profile email offline_access',
    }}
  >
    <AuthSync>{children}</AuthSync>
  </Auth0Provider>
)
