import { render } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'

// vi.mock is hoisted above imports, so the spies it references must be created
// with vi.hoisted (a plain outer const would be uninitialized when the mock runs).
const { auth0ProviderProps, getAccessTokenSilently, loginWithRedirect, configureAuth } =
  vi.hoisted(() => ({
    auth0ProviderProps: vi.fn(),
    getAccessTokenSilently: vi.fn(),
    loginWithRedirect: vi.fn(),
    configureAuth: vi.fn(),
  }))

vi.mock('@auth0/auth0-react', () => ({
  Auth0Provider: (props: Record<string, unknown>) => {
    auth0ProviderProps(props)
    return props.children as React.ReactNode
  },
  useAuth0: () => ({
    getAccessTokenSilently,
    loginWithRedirect,
    isAuthenticated: false,
    user: undefined,
  }),
}))

vi.mock('../lib/api-client', () => ({
  configureAuth,
  apiClient: { get: vi.fn(), post: vi.fn() },
}))

import { AppProvider } from './provider'

/** Renders the provider and returns the token getter it handed to apiClient. */
const renderAndGetTokenFn = () => {
  render(
    <AppProvider>
      <div />
    </AppProvider>
  )
  return configureAuth.mock.calls[0][0] as () => Promise<string>
}

beforeEach(() => {
  vi.clearAllMocks()
  // The real loginWithRedirect returns a promise; the caller attaches a handler to it.
  loginWithRedirect.mockResolvedValue(undefined)
})

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
      useRefreshTokensFallback?: boolean
      authorizationParams?: { scope?: string }
    }

    expect(props.cacheLocation).toBe('localstorage')
    expect(props.useRefreshTokens).toBe(true)
    expect(props.authorizationParams?.scope).toContain('offline_access')
  })

  it('falls back to silent iframe auth when the refresh grant fails', () => {
    render(
      <AppProvider>
        <div />
      </AppProvider>
    )

    const props = auth0ProviderProps.mock.calls[0][0] as { useRefreshTokensFallback?: boolean }
    expect(props.useRefreshTokensFallback).toBe(true)
  })
})

describe('token getter recovery', () => {
  it.each(['invalid_grant', 'missing_refresh_token', 'login_required'])(
    're-authenticates when the cached session is unusable (%s)',
    async (error) => {
      getAccessTokenSilently.mockRejectedValue(Object.assign(new Error(error), { error }))

      await expect(renderAndGetTokenFn()()).rejects.toThrow(error)
      expect(loginWithRedirect).toHaveBeenCalledTimes(1)
    }
  )

  it('does not re-authenticate on unrelated failures', async () => {
    getAccessTokenSilently.mockRejectedValue(new Error('network down'))

    await expect(renderAndGetTokenFn()()).rejects.toThrow('network down')
    expect(loginWithRedirect).not.toHaveBeenCalled()
  })

  it('redirects only once when concurrent requests all fail', async () => {
    getAccessTokenSilently.mockRejectedValue(
      Object.assign(new Error('invalid_grant'), { error: 'invalid_grant' })
    )
    const getTokenFn = renderAndGetTokenFn()

    await Promise.allSettled([getTokenFn(), getTokenFn(), getTokenFn()])

    expect(loginWithRedirect).toHaveBeenCalledTimes(1)
  })

  it('returns the token when the session is healthy', async () => {
    getAccessTokenSilently.mockResolvedValue('jwt-token')

    await expect(renderAndGetTokenFn()()).resolves.toBe('jwt-token')
    expect(loginWithRedirect).not.toHaveBeenCalled()
  })
})
