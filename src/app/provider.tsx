import { useEffect, type ReactNode } from 'react'
import { Auth0Provider, useAuth0 } from '@auth0/auth0-react'
import { configureAuth } from '../lib/api-client'

type AppProviderProps = {
  children: ReactNode
}

const AuthSync = ({ children }: { children: ReactNode }) => {
  const { getAccessTokenSilently } = useAuth0()
  useEffect(() => {
    configureAuth(() =>
      getAccessTokenSilently({
        authorizationParams: { audience: import.meta.env.VITE_AUTH0_AUDIENCE },
      })
    )
  }, [getAccessTokenSilently])
  return <>{children}</>
}

export const AppProvider = ({ children }: AppProviderProps) => (
  <Auth0Provider
    domain={import.meta.env.VITE_AUTH0_DOMAIN}
    clientId={import.meta.env.VITE_AUTH0_CLIENT_ID}
    authorizationParams={{
      redirect_uri: window.location.origin,
      audience: import.meta.env.VITE_AUTH0_AUDIENCE,
    }}
  >
    <AuthSync>{children}</AuthSync>
  </Auth0Provider>
)
