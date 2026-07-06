import { render } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'

// vi.mock is hoisted above imports, so the spy it references must be created
// with vi.hoisted (a plain outer const would be uninitialized when the mock runs).
const { auth0ProviderProps } = vi.hoisted(() => ({ auth0ProviderProps: vi.fn() }))

vi.mock('@auth0/auth0-react', () => ({
  Auth0Provider: (props: Record<string, unknown>) => {
    auth0ProviderProps(props)
    return props.children as React.ReactNode
  },
  useAuth0: () => ({
    getAccessTokenSilently: vi.fn(),
    isAuthenticated: false,
    user: undefined,
  }),
}))

import { AppProvider } from './provider'

describe('AppProvider Auth0 configuration', () => {
  it('persists the session across refresh via localStorage + rotating refresh tokens', () => {
    render(
      <AppProvider>
        <div />
      </AppProvider>
    )

    const props = auth0ProviderProps.mock.calls[0][0] as {
      cacheLocation?: string
      useRefreshTokens?: boolean
      authorizationParams?: { scope?: string }
    }

    expect(props.cacheLocation).toBe('localstorage')
    expect(props.useRefreshTokens).toBe(true)
    expect(props.authorizationParams?.scope).toContain('offline_access')
  })
})
