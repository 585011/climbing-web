import { createFileRoute } from '@tanstack/react-router'
import { useAuth0 } from '@auth0/auth0-react'

const MePage = () => {
  const { user, logout } = useAuth0()

  return (
    <div className="px-4 pt-6 pb-4 flex flex-col gap-6">
      <div>
        <p className="font-semibold text-ink">{user?.name}</p>
        <p className="text-sm text-ink-2">{user?.email}</p>
      </div>

      <button
        onClick={() => logout({ logoutParams: { returnTo: window.location.origin } })}
        className="w-full border border-ink-3 text-ink rounded-xl py-3 text-sm font-semibold active:opacity-80"
      >
        Log out
      </button>
    </div>
  )
}

export const Route = createFileRoute('/me')({
  component: MePage,
})
