import { createRootRoute, Outlet } from '@tanstack/react-router'
import { useAuth0 } from '@auth0/auth0-react'
import { BottomNav } from '../../components/ui/BottomNav'

const RootComponent = () => {
  const { isLoading, isAuthenticated, error, loginWithRedirect, logout } = useAuth0()

  if (isLoading) {
    return (
      <div className="min-h-screen bg-paper flex items-center justify-center">
        <p className="text-ink-3 text-sm">Loading…</p>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-paper flex flex-col items-center justify-center gap-6 px-8">
        <p className="text-ink-2 text-sm text-center">
          Something went wrong. Please try again.
        </p>
        <button
          onClick={() => {
            window.history.replaceState({}, document.title, window.location.pathname)
            logout({ 
              logoutParams: { 
                returnTo: window.location.origin 
              } 
            })
          }}
          className="w-full max-w-xs bg-accent text-white rounded-xl py-3 text-sm font-semibold active:opacity-80"
        >
          Try again
        </button>
      </div>
    )
  }

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-paper flex flex-col items-center justify-center gap-6 px-8">
        <h1 className="text-2xl font-bold text-ink tracking-tight">Climbing</h1>
        <p className="text-ink-2 text-sm text-center">
          Log in to track your climbs and explore crags.
        </p>
        <button
          onClick={() => loginWithRedirect({ authorizationParams: { prompt: 'select_account' } })}
          className="w-full max-w-xs bg-accent text-white rounded-xl py-3 text-sm font-semibold active:opacity-80"
        >
          Log in
        </button>
        <button
          onClick={() => loginWithRedirect({ authorizationParams: { screen_hint: 'signup', prompt: 'select_account' } })}
          className="w-full max-w-xs border border-ink-3 text-ink rounded-xl py-3 text-sm font-semibold active:opacity-80"
        >
          Sign up
        </button>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-paper flex flex-col max-w-md mx-auto relative">
      <main className="flex-1 pb-20 overflow-y-auto">
        <Outlet />
      </main>
      <BottomNav />
    </div>
  )
}

export const Route = createRootRoute({
  component: RootComponent,
})
