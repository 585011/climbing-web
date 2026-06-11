import { createFileRoute, Outlet, useChildMatches, useNavigate } from '@tanstack/react-router'
import { useWall } from '../../features/walls/hooks/useWall'
import { useRoutesByWall } from '../../features/routes/hooks/useRoutesByWall'
import { RoutesList } from '../../features/routes/components/RoutesList'

export const Route = createFileRoute('/areas/$areaId/walls/$wallId')({
  component: WallPage,
})

function WallPage() {
  const childMatches = useChildMatches()
  const { areaId, wallId } = Route.useParams()
  const wallIdNum = Number(wallId)
  const { data: wall, isLoading: wallLoading, isError: wallError } = useWall(wallIdNum)
  const { data: routes, isLoading: routesLoading } = useRoutesByWall(wallIdNum)
  const navigate = useNavigate()

  if (childMatches.length > 0) return <Outlet />
  if (Number.isNaN(wallIdNum)) return <p className="p-4 text-ink-2">Invalid URL</p>
  if (wallError) return <p className="p-4 text-ink-2">Something went wrong</p>

  return (
    <div className="flex flex-col">
      {wallLoading ? (
        <div className="h-52 bg-paper-2 animate-pulse" />
      ) : (
        <div className="relative h-52 bg-paper-2 overflow-hidden">
          <div className="absolute inset-0 flex items-center justify-center text-ink-3 text-sm">
            photo
          </div>
          <button
            onClick={() => navigate({ to: '/' })}
            className="absolute top-4 left-4 bg-paper/80 backdrop-blur-sm rounded-full px-3 py-1.5 text-[12px] text-ink flex items-center gap-1"
          >
            ‹ back
          </button>
        </div>
      )}

      <div className="px-4 pt-3 pb-2">
        {wallLoading ? (
          <div className="flex flex-col gap-2">
            <div className="h-7 w-2/3 bg-paper-2 animate-pulse rounded" />
            <div className="h-4 w-1/3 bg-paper-2 animate-pulse rounded" />
          </div>
        ) : (
          <>
            <div className="flex items-baseline justify-between gap-2">
              <h1 className="text-2xl font-bold text-ink leading-tight">{wall?.name}</h1>
              <span className="text-[13px] text-ink-2 shrink-0">
                {routes?.length ?? 0} routes
              </span>
            </div>
            {wall?.description && (
              <p className="text-[13px] text-ink-3 mt-1 leading-snug">{wall.description}</p>
            )}
          </>
        )}
      </div>

      <div className="flex-1">
        {routesLoading ? (
          <div className="divide-y divide-ink/10 px-4">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="flex items-center gap-3 py-3">
                <div className="w-5 h-4 bg-paper-2 animate-pulse rounded" />
                <div className="w-10 h-7 bg-paper-2 animate-pulse rounded-lg" />
                <div className="flex-1 flex flex-col gap-1.5">
                  <div className="h-4 w-2/3 bg-paper-2 animate-pulse rounded" />
                  <div className="h-3 w-1/3 bg-paper-2 animate-pulse rounded" />
                </div>
                <div className="w-9 h-9 bg-paper-2 animate-pulse rounded-full" />
              </div>
            ))}
          </div>
        ) : (
          <RoutesList routes={routes ?? []} areaId={areaId} />
        )}
      </div>
    </div>
  )
}
