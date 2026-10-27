import { useState } from 'react'
import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { useRoute } from '../../features/routes/hooks/useRoute'
import { useWall } from '../../features/walls/hooks/useWall'
import { useArea } from '../../features/areas/hooks/useArea'
import { useTicksByUser } from '../../features/ticks/hooks/useTicksByUser'
import { useCurrentUser } from '../../features/users/hooks/useCurrentUser'
import { useRetireRoute } from '../../features/routes/hooks/useRetireRoute'
import { WallImageViewer } from '../../features/walls/components/WallImageViewer'
import { useIsAdmin } from '../../hooks/useIsAdmin'
import { HoldColorChip } from '../../components/ui/HoldColorChip'
import { routeDisplayName } from '../../utils/routeDisplayName'

export const Route = createFileRoute('/areas/$areaId/walls/$wallId/routes/$routeId')({
  component: RoutePage,
})

function RoutePage() {
  const { areaId, wallId, routeId } = Route.useParams()
  const areaIdNum = Number(areaId)
  const wallIdNum = Number(wallId)
  const routeIdNum = Number(routeId)
  const navigate = useNavigate()

  const { data: area, isLoading: areaLoading } = useArea(areaIdNum)
  const { data: wall, isLoading: wallLoading } = useWall(wallIdNum)
  const { data: route, isLoading: routeLoading, isError } = useRoute(routeIdNum)
  const { data: currentUser } = useCurrentUser()
  const userId = currentUser?.id ?? 0
  const { data: ticksMap = new Map() } = useTicksByUser(userId)
  const isAdmin = useIsAdmin()
  const { mutate: setRetired, isPending: isRetiring } = useRetireRoute()
  const [confirmRetire, setConfirmRetire] = useState(false)
  const [photoOpen, setPhotoOpen] = useState(false)

  if (Number.isNaN(areaIdNum) || Number.isNaN(wallIdNum) || Number.isNaN(routeIdNum))
    return <p className="p-4 text-ink-2">Invalid URL</p>
  if (isError)
    return <p className="p-4 text-ink-2">Something went wrong</p>

  const isLoading = routeLoading || wallLoading || areaLoading
  const tick = route ? (ticksMap.get(route.id) ?? null) : null

  const goToTickForm = () =>
    navigate({ to: '/areas/$areaId/walls/$wallId/routes/$routeId/tick', params: { areaId, wallId, routeId } })

  // Gym routes rotate often, so any climber may retire one; restoring is admin-only.
  const isGym = area?.type === 'gym'
  const canRetire = !!route && !route.retiredAt && (isGym || isAdmin)
  const canRestore = !!route?.retiredAt && isAdmin
  const handleRetire = (retired: boolean) => {
    if (!route) return
    setRetired(
      { routeId: route.id, wallId: route.wallId, retired },
      { onSuccess: () => setConfirmRetire(false) }
    )
  }

  const metaParts = [
    route && route.length > 0 ? `${route.length}m` : null,
    route?.style || null,
    route && route.bolts > 0 ? `${route.bolts} bolts` : null,
  ].filter(Boolean)

  return (
    <div className="flex flex-col min-h-full">
      {/* Header */}
      <div className="px-4 pt-4 pb-2">
        <button
          onClick={() => navigate({ to: '/areas/$areaId/walls/$wallId', params: { areaId, wallId } })}
          className="bg-paper-2 rounded-full px-3 py-1.5 text-[12px] text-ink flex items-center gap-1 w-fit"
        >
          ‹ back
        </button>
      </div>

      {/* Breadcrumb */}
      <div className="px-4 pb-1">
        {isLoading ? (
          <div className="h-3 w-1/2 bg-paper-2 animate-pulse rounded" />
        ) : (
          <p className="text-[11px] uppercase tracking-wide text-ink-3">
            {area?.region} · {wall?.name}
          </p>
        )}
      </div>

      {/* Route name + grade */}
      <div className="px-4 pb-2">
        {isLoading ? (
          <div className="flex flex-col gap-2">
            <div className="h-7 w-2/3 bg-paper-2 animate-pulse rounded" />
            <div className="h-4 w-1/4 bg-paper-2 animate-pulse rounded" />
          </div>
        ) : (
          <div className="flex items-start justify-between gap-3">
            <h1 className="text-2xl font-bold text-ink leading-tight">{route && routeDisplayName(route)}</h1>
            {route?.grade && (
              <div className="shrink-0 rounded-lg bg-paper-2 border border-ink/15 px-2.5 py-1 mt-0.5">
                <span className="text-[13px] font-bold text-ink">{route.grade}</span>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Meta row */}
      {!isLoading && (metaParts.length > 0 || route?.holdColor) && (
        <p className="px-4 pb-3 text-[12px] text-ink-3 flex items-center gap-2">
          {route?.holdColor && <HoldColorChip color={route.holdColor} />}
          {metaParts.join(' · ')}
        </p>
      )}

      {/* Retired banner */}
      {route?.retiredAt && (
        <div className="mx-4 mb-3 rounded-xl border border-ink/20 bg-paper-2 px-3 py-2 text-[13px] text-ink-2">
          This route has been taken down. Your tick is kept.
        </div>
      )}

      {/* Topo photo placeholder */}
      <div className="mx-4 mb-3 h-48 bg-paper-2 rounded-xl flex items-center justify-center text-ink-3 text-sm">
        topo photo
      </div>

      {/* Description */}
      <div className="px-4 mb-3">
        {isLoading ? (
          <div className="flex flex-col gap-1.5">
            <div className="h-3.5 w-full bg-paper-2 animate-pulse rounded" />
            <div className="h-3.5 w-4/5 bg-paper-2 animate-pulse rounded" />
          </div>
        ) : (
          <p className="text-[14px] text-ink leading-relaxed">
            {route?.description || <span className="text-ink-3">No description.</span>}
          </p>
        )}
      </div>

      {/* Sun tag */}
      <div className="px-4 mb-4">
        <span className="inline-flex items-center gap-1.5 text-[12px] border border-ink/20 rounded-full px-3 py-1 text-ink-2">
          ⊙ all-day sun
        </span>
      </div>

      <div className="border-t border-ink/10 mx-4 mb-4" />

      {/* Tick section */}
      <div className="px-4 mb-4">
        {tick ? (
          <>
            <div className="flex items-center justify-between mb-2">
              <p className="text-[14px] font-semibold text-ink">Your tick</p>
              <button onClick={goToTickForm} className="text-[12px] text-ink-3">Edit</button>
            </div>
            <div className="border border-green-600/40 bg-green-600/5 rounded-xl p-3">
              <div className="flex items-center gap-2 mb-1">
                <span className="text-[14px] font-semibold uppercase text-green-700 bg-accent/10 rounded-full px-2 py-0.5">
                  {tick.style || 'send'}
                </span>
                {tick.rating > 0 && (
                  <span className="text-[15px] text-ink-2">
                    {'★'.repeat(tick.rating)}{'☆'.repeat(5 - tick.rating)}
                  </span>
                )}
                <span className="text-[13px] text-ink-3 ml-auto">
                  {new Date(tick.tickedAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: '2-digit' })}
                </span>
              </div>
              {tick.personalNote && (
                <p className="text-[13px] text-ink-2 italic">"{tick.personalNote}"</p>
              )}
              {tick.photoUrl && (
                <button
                  onClick={() => setPhotoOpen(true)}
                  aria-label="View tick photo fullscreen"
                  className="mt-2 block w-full h-48 rounded-lg overflow-hidden"
                >
                  <img src={tick.photoUrl} alt="Your photo of this route" className="w-full h-full object-cover" />
                </button>
              )}
            </div>
            {photoOpen && tick.photoUrl && (
              <WallImageViewer
                src={tick.photoUrl}
                alt="Your photo of this route"
                onClose={() => setPhotoOpen(false)}
              />
            )}
          </>
        ) : (
          <p className="text-[13px] text-ink-3 leading-relaxed">
            You haven't ticked this route yet. Log your send to track it.
          </p>
        )}
      </div>

      {/* Retire / restore */}
      {(canRetire || canRestore) && (
        <div className="px-4 mb-2">
          {canRestore ? (
            <button
              onClick={() => handleRetire(false)}
              disabled={isRetiring}
              className="w-full py-3 rounded-xl border border-ink/20 text-[13px] text-ink-2 disabled:opacity-50"
            >
              Restore route
            </button>
          ) : confirmRetire ? (
            <div className="flex gap-2">
              <button
                onClick={() => setConfirmRetire(false)}
                className="flex-1 py-3 rounded-xl border border-ink/20 text-[13px] text-ink-2"
              >
                Cancel
              </button>
              <button
                onClick={() => handleRetire(true)}
                disabled={isRetiring}
                className="flex-1 py-3 rounded-xl bg-ink text-paper text-[13px] font-semibold disabled:opacity-50"
              >
                {isRetiring ? 'Retiring…' : 'Yes, it’s gone'}
              </button>
            </div>
          ) : (
            <button
              onClick={() => setConfirmRetire(true)}
              className="w-full py-3 rounded-xl border border-ink/20 text-[13px] text-ink-2"
            >
              Route taken down? Mark as retired
            </button>
          )}
        </div>
      )}

      {/* Sticky bottom bar */}
      <div className="px-4 pb-4 pt-2">
        {tick ? (
          <button
            onClick={goToTickForm}
            className="w-full py-3 rounded-xl bg-paper-2 border border-ink/20 text-[14px] font-semibold text-ink"
          >
            Edit your tick
          </button>
        ) : (
          <button
            onClick={goToTickForm}
            className="w-full py-3 rounded-xl bg-accent text-paper text-[14px] font-semibold"
          >
            Log route
          </button>
        )}
      </div>
    </div>
  )
}
