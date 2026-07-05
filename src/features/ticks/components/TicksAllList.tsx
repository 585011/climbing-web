import { useState } from 'react'
import { Link } from '@tanstack/react-router'
import { compareNorwegianGrades } from '../utils/norwegianGrade'
import type { EnrichedTick } from '../utils/enrichTicks'
import { TickRow } from './TickRow'
import { TicksEmptyState } from './TicksEmptyState'

interface TicksAllListProps {
  ticks: EnrichedTick[]
  isLoading: boolean
  isError: boolean
  onRetry: () => void
}

// Canonical chip order; only styles present in the data render.
const STYLE_CHIPS: { value: string; label: string }[] = [
  { value: 'onsight', label: 'OS' },
  { value: 'flash', label: 'FL' },
  { value: 'redpoint', label: 'RP' },
  { value: 'free solo', label: 'FS' },
]

type SortBy = 'date' | 'grade'

export const TicksAllList = ({ ticks, isLoading, isError, onRetry }: TicksAllListProps) => {
  const [styleFilter, setStyleFilter] = useState('') // '' = All
  const [sortBy, setSortBy] = useState<SortBy>('date')

  const chips = STYLE_CHIPS.filter(c => ticks.some(t => t.tick.style === c.value))
  const filtered = styleFilter ? ticks.filter(t => t.tick.style === styleFilter) : ticks
  const sorted =
    sortBy === 'grade'
      ? [...filtered].sort((a, b) =>
          compareNorwegianGrades(a.route?.grade ?? '', b.route?.grade ?? ''),
        )
      : filtered // enrichTicks already sorts by date, newest first

  return (
    <div className="flex flex-col gap-3 px-4 pt-4 pb-2">
      {/* header */}
      <div className="flex items-center gap-2">
        <Link to="/ticks" className="text-[15px] text-ink-2">
          ‹
        </Link>
        <h1 className="text-xl font-bold text-ink italic">All ticks · {sorted.length}</h1>
      </div>

      {isError ? (
        <button
          onClick={onRetry}
          className="w-full text-sm text-ink-2 text-center py-8 active:text-ink"
        >
          Couldn't load ticks — tap to retry
        </button>
      ) : isLoading ? (
        <div className="flex flex-col gap-2">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="h-12 rounded-lg bg-paper-2 animate-pulse" />
          ))}
        </div>
      ) : ticks.length === 0 ? (
        <TicksEmptyState />
      ) : (
        <>
          {/* style chips + sort */}
          <div className="flex items-center justify-between gap-2">
            <div className="flex gap-2 overflow-x-auto no-scrollbar">
              <button
                onClick={() => setStyleFilter('')}
                className={`shrink-0 text-[11px] rounded-full border px-3 py-1 ${
                  styleFilter === '' ? 'bg-ink text-paper border-ink' : 'border-ink/25 text-ink-2 bg-paper'
                }`}
              >
                All
              </button>
              {chips.map(c => (
                <button
                  key={c.value}
                  onClick={() => setStyleFilter(c.value)}
                  className={`shrink-0 text-[11px] rounded-full border px-3 py-1 ${
                    styleFilter === c.value
                      ? 'bg-ink text-paper border-ink'
                      : 'border-ink/25 text-ink-2 bg-paper'
                  }`}
                >
                  {c.label}
                </button>
              ))}
            </div>
            <div className="relative shrink-0">
              <select
                aria-label="Sort ticks"
                value={sortBy}
                onChange={e => setSortBy(e.target.value as SortBy)}
                className="appearance-none text-[11px] text-ink-3 bg-transparent pr-4"
              >
                <option value="date">date</option>
                <option value="grade">grade</option>
              </select>
              <span
                aria-hidden
                className="pointer-events-none absolute right-0 top-1/2 -translate-y-1/2 text-[9px] text-ink-3"
              >
                ▾
              </span>
            </div>
          </div>

          {/* rows */}
          <div>
            {sorted.map(item => (
              <TickRow key={item.tick.id} item={item} showStars />
            ))}
          </div>
        </>
      )}
    </div>
  )
}
