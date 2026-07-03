import { useState } from 'react'
import { createFileRoute, Outlet, useChildMatches } from '@tanstack/react-router'
import { useArea } from '../../features/areas/hooks/useArea'
import { AreaHeroOverlays } from '../../features/areas/components/AreaHeroOverlays'
import { useWallsByArea } from '../../features/walls/hooks/useWallsByArea'
import { WallCard } from '../../features/walls/components/WallCard'
import { WallPhoto } from '../../features/walls/components/WallPhoto'
import { AreaRoutesList } from '../../features/routes/components/AreaRoutesList'
import { TabBar } from '../../components/ui/TabBar'

export const Route = createFileRoute('/areas/$areaId')({
  component: AreaPage,
})

type AreaTab = 'Walls' | 'Routes' | 'Approach' | 'Info'
const AREA_TABS = ['Walls', 'Routes', 'Approach', 'Info'] as const

function AreaPage() {
  const childMatches = useChildMatches()
  const { areaId } = Route.useParams()
  const areaIdNum = Number(areaId)
  const [activeTab, setActiveTab] = useState<AreaTab>('Routes')
  const { data: area, isLoading: areaLoading, isError: areaError } = useArea(areaIdNum)
  const { data: walls, isLoading: wallsLoading } = useWallsByArea(areaIdNum)
  const visibleTabs = (walls?.length ?? 0) > 1
    ? AREA_TABS
    : AREA_TABS.filter(t => t !== 'Walls')

  if (childMatches.length > 0) return <Outlet />
  if (Number.isNaN(areaIdNum)) return <p className="p-4 text-ink-2">Invalid URL</p>
  if (areaError) return <p className="p-4 text-ink-2">Something went wrong</p>

  return (
    <div className="flex flex-col">
      {/* Hero — when the area has a single wall, it doubles as that wall's photo */}
      {areaLoading ? (
        <div className="h-52 bg-paper-2 animate-pulse" />
      ) : walls?.length === 1 ? (
        <WallPhoto wall={walls[0]}>
          <AreaHeroOverlays region={area?.region} />
        </WallPhoto>
      ) : (
        <div className="relative h-52 bg-paper-2 overflow-hidden">
          <div className="absolute inset-0 flex items-center justify-center text-ink-3 text-sm">
            photo
          </div>
          <AreaHeroOverlays region={area?.region} />
        </div>
      )}

      {/* Area info */}
      <div className="px-4 pt-3 pb-2">
        {areaLoading ? (
          <div className="flex flex-col gap-2">
            <div className="h-7 w-2/3 bg-paper-2 animate-pulse rounded" />
            <div className="h-4 w-1/3 bg-paper-2 animate-pulse rounded" />
          </div>
        ) : (
          <>
            <div className="flex items-baseline justify-between gap-2">
              <h1 className="text-2xl font-bold text-ink leading-tight">{area?.name}</h1>
              <span className="text-[13px] text-ink-2 shrink-0">
                {walls?.length ?? 0} walls
              </span>
            </div>
            <div className="flex gap-2 mt-2 flex-wrap">
              {(['Sport', 'Boulder', 'Trad'] as const).map(style => (
                <span
                  key={style}
                  className="text-[12px] border border-ink/20 rounded-full px-3 py-1 text-ink-2"
                >
                  {style}
                </span>
              ))}
            </div>
          </>
        )}
      </div>

      {/* Tabs */}
      {areaLoading ? (
        <div className="h-10 mx-4 bg-paper-2 animate-pulse rounded" />
      ) : (
        <TabBar tabs={visibleTabs} active={activeTab} onChange={setActiveTab} />
      )}

      {/* Tab content */}
      {!areaLoading && (
        <div className="flex-1">
          {activeTab === 'Walls' && (
            <div className="flex flex-col gap-2 px-4 py-3">
              {wallsLoading
                ? Array.from({ length: 3 }).map((_, i) => (
                    <div key={i} className="h-16 bg-paper-2 animate-pulse rounded-xl" />
                  ))
                : walls && walls.length > 0
                  ? walls.map(wall => (
                      <WallCard key={wall.id} wall={wall} areaId={areaId} />
                    ))
                  : <p className="text-center text-ink-3 text-sm py-8">No walls yet</p>
              }
            </div>
          )}

          {activeTab === 'Routes' && (
            wallsLoading || !walls
              ? (
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
              )
              : walls.length === 0
                ? <p className="text-center text-ink-3 text-sm py-12">No routes yet</p>
                : <AreaRoutesList walls={walls} />
          )}

          {activeTab === 'Approach' && (
            <div className="flex flex-col gap-5 px-4 py-3">
              {wallsLoading
                ? Array.from({ length: 2 }).map((_, i) => (
                    <div key={i} className="flex flex-col gap-2">
                      <div className="h-4 w-1/3 bg-paper-2 animate-pulse rounded" />
                      <div className="h-10 w-full bg-paper-2 animate-pulse rounded" />
                    </div>
                  ))
                : walls && walls.length > 0
                  ? walls.map(wall => (
                      <div key={wall.id}>
                        {walls.length > 1 && (
                          <p className="text-[12px] font-semibold text-ink-2 uppercase tracking-wide mb-1">
                            {wall.name}
                          </p>
                        )}
                        <p className="text-[14px] text-ink leading-relaxed">
                          {wall.approachInfo || <span className="text-ink-3">No approach info.</span>}
                        </p>
                      </div>
                    ))
                  : <p className="text-center text-ink-3 text-sm py-12">No approach info yet</p>
              }
            </div>
          )}

          {activeTab === 'Info' && (
            <div className="px-4 py-3 text-[14px] text-ink-2 leading-relaxed">
              {area?.description || 'No description.'}
            </div>
          )}
        </div>
      )}

    </div>
  )
}
