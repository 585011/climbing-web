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

const AuthSync = ({ children }: { children: ReactNode }) => {
  const { getAccessTokenSilently, isAuthenticated, user } = useAuth0()

  useEffect(() => {
    configureAuth(() =>
      getAccessTokenSilently({
        authorizationParams: { audience: import.meta.env.VITE_AUTH0_AUDIENCE },
      })
    )
  }, [getAccessTokenSilently])

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
    authorizationParams={{
      redirect_uri: window.location.origin,
      audience: import.meta.env.VITE_AUTH0_AUDIENCE,
      scope: 'openid profile email offline_access',
    }}
  >
    <AuthSync>{children}</AuthSync>
  </Auth0Provider>
)
