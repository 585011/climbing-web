import { useState } from 'react'
import { Link } from '@tanstack/react-router'
import { useAreas } from '../hooks/useAreas'
import { useDebouncedValue } from '../../../hooks/useDebouncedValue'
import type { ClimbingArea } from '../../../types/api'

const SEARCH_MAX = 100

const FILTERS = ['Nearby', 'Sport', 'Trad', 'Boulder'] as const
type Filter = (typeof FILTERS)[number]

const CragCard = ({ area }: { area: ClimbingArea }) => (
  <Link
    to="/areas/$areaId"
    params={{ areaId: String(area.id) }}
    className="flex flex-col gap-1.5 rounded-xl border border-ink/20 bg-paper p-2 active:bg-paper-2"
  >
    <div className="h-[52px] rounded-lg bg-paper-2 border border-ink/10 flex items-center justify-center text-ink-3 text-[10px]">
      photo
    </div>
    <span className="text-[13px] font-semibold text-ink leading-tight">{area.name}</span>
    <span className="text-[11px] text-ink-3 leading-tight truncate">{area.region || area.description}</span>
  </Link>
)

const SkeletonCard = () => (
  <div className="flex flex-col gap-1.5 rounded-xl border border-ink/10 bg-paper p-2">
    <div className="h-[52px] rounded-lg bg-paper-2 animate-pulse" />
    <div className="h-3 w-3/4 rounded bg-paper-2 animate-pulse" />
    <div className="h-2.5 w-1/2 rounded bg-paper-2 animate-pulse" />
  </div>
)

export const AreasList = () => {
  const { data: areas, isLoading, isError } = useAreas()
  const [search, setSearch] = useState('')
  const [activeFilter, setActiveFilter] = useState<Filter>('Nearby')

  // Keep `search` for instant input echo, but filter on the debounced value so
  // work runs ~300ms after typing stops (this is where future server-side
  // search will hang off).
  const debouncedSearch = useDebouncedValue(search, 300)

  const filtered = areas?.filter(a =>
    a.name.toLowerCase().includes(debouncedSearch.toLowerCase())
  ) ?? []

  return (
    <div className="flex flex-col gap-3 px-4 pt-4 pb-2">
      {/* header */}
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold text-ink">Crags</h1>
        <button disabled className="text-[12px] border border-ink/30 rounded-full px-3 py-1 text-ink-2 disabled:opacity-50">
          Bergen ▾
        </button>
      </div>

      {/* search */}
      <div className="flex items-center gap-2 border border-ink/20 rounded-xl px-3 py-2 bg-paper">
        <span className="text-ink-3 text-sm">⌕</span>
        <input
          type="text"
          placeholder="Search crags, routes…"
          value={search}
          onChange={e => setSearch(e.target.value)}
          maxLength={SEARCH_MAX}
          className="flex-1 bg-transparent text-[13px] text-ink placeholder:text-ink-3 outline-none"
        />
      </div>

      {/* filter chips */}
      <div className="flex gap-2 overflow-x-auto no-scrollbar">
        {FILTERS.map(f => (
          <button
            key={f}
            onClick={() => setActiveFilter(f)}
            className={`shrink-0 text-[12px] rounded-full border px-3 py-1 ${
              activeFilter === f
                ? 'bg-ink text-paper border-ink'
                : 'border-ink/25 text-ink-2 bg-paper'
            }`}
          >
            {f}
          </button>
        ))}
      </div>

      {/* count + sort */}
      {!isLoading && !isError && (
        <div className="flex items-center justify-between">
          <span className="text-[11px] text-ink-3">{filtered.length} crags</span>
          <button disabled className="text-[11px] text-ink-3 disabled:opacity-50">sort: name ▾</button>
        </div>
      )}

      {/* grid */}
      {isError && (
        <p className="text-sm text-ink-2 text-center py-8">Something went wrong</p>
      )}

      <div className="grid grid-cols-2 gap-3">
        {isLoading
          ? Array.from({ length: 6 }).map((_, i) => <SkeletonCard key={i} />)
          : filtered.map(area => <CragCard key={area.id} area={area} />)
        }
      </div>
    </div>
  )
}
