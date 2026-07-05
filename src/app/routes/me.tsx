import { createFileRoute } from '@tanstack/react-router'
import { useAuth0 } from '@auth0/auth0-react'
import { useCurrentUser } from '../../features/users/hooks/useCurrentUser'
import { useTicksByUser } from '../../features/ticks/hooks/useTicksByUser'
import { useUpdateUser } from '../../features/users/hooks/useUpdateUser'
import { useDeleteUser } from '../../features/users/hooks/useDeleteUser'
import { MeProfile } from '../../features/users/components/MeProfile'

export const Route = createFileRoute('/me')({
  component: MePage,
})

// Cross-feature data is composed here, at the app level (see CLAUDE.md).
function MePage() {
  const { logout } = useAuth0()
  const userQ = useCurrentUser()
  const userId = userQ.data?.id ?? 0
  const ticksQ = useTicksByUser(userId, { enabled: userId > 0 })
  const updateM = useUpdateUser()
  const deleteM = useDeleteUser()

  const doLogout = () =>
    logout({ logoutParams: { returnTo: window.location.origin } })

  if (userQ.isError)
    return (
      <button
        onClick={() => userQ.refetch()}
        className="w-full text-sm text-ink-2 text-center py-16 active:text-ink"
      >
        Couldn't load profile — tap to retry
      </button>
    )
  if (userQ.isLoading || !userQ.data)
    return (
      <div className="flex flex-col gap-4 px-4 pt-6">
        <div className="h-9 w-2/3 rounded bg-paper-2 animate-pulse" />
        <div className="h-4 w-1/2 rounded bg-paper-2 animate-pulse" />
        <div className="h-16 rounded-xl bg-paper-2 animate-pulse" />
      </div>
    )

  const user = userQ.data
  return (
    <MeProfile
      user={user}
      ticksCount={ticksQ.data?.size ?? 0}
      onSaveName={displayName =>
        updateM.mutate({ userId: user.id, email: user.email, displayName })
      }
      isSaving={updateM.isPending}
      saveError={updateM.isError}
      onDelete={() => deleteM.mutate({ userId: user.id }, { onSuccess: doLogout })}
      isDeleting={deleteM.isPending}
      deleteError={deleteM.isError}
      onLogout={doLogout}
    />
  )
}
