import { Link } from '@tanstack/react-router'
import { parseNorwegianGrade } from '../utils/norwegianGrade'
import type { EnrichedTick } from '../utils/enrichTicks'
import { TickRow } from './TickRow'
import { TicksEmptyState } from './TicksEmptyState'

interface TicksDashboardProps {
  ticks: EnrichedTick[]
  isLoading: boolean
  isError: boolean
  onRetry: () => void
}

const StatCard = ({ value, label }: { value: string; label: string }) => (
  <div className="flex-1 flex flex-col items-center justify-center gap-0.5 rounded-xl border border-ink/20 bg-paper py-3">
    <span data-testid={`stat-${label}`} className="text-[20px] font-bold text-ink leading-none">
      {value}
    </span>
    <span className="text-[10px] text-ink-3">{label}</span>
  </div>
)

const Skeleton = () => (
  <div className="flex flex-col gap-3">
    <div className="flex gap-2">
      {[0, 1, 2].map(i => (
        <div key={i} className="flex-1 h-16 rounded-xl bg-paper-2 animate-pulse" />
      ))}
    </div>
    <div className="h-40 rounded-xl bg-paper-2 animate-pulse" />
    {[0, 1, 2].map(i => (
      <div key={i} className="h-12 rounded-lg bg-paper-2 animate-pulse" />
    ))}
  </div>
)

export const TicksDashboard = ({ ticks, isLoading, isError, onRetry }: TicksDashboardProps) => {
  // Grade stats only consider ticks whose joined route grade parses as Norwegian.
  const graded = ticks
    .map(t => ({ grade: t.route?.grade ?? '', rank: parseNorwegianGrade(t.route?.grade ?? '') }))
    .filter((g): g is { grade: string; rank: number } => g.rank !== null)

  const hardest = graded.length
    ? graded.reduce((max, g) => (g.rank > max.rank ? g : max)).grade
    : '—'

  const now = new Date()
  const thisMonth = ticks.filter(t => {
    const d = new Date(t.tick.tickedAt)
    return d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth()
  }).length

  const counts = new Map<string, { rank: number; count: number }>()
  for (const g of graded) {
    const entry = counts.get(g.grade)
    if (entry) entry.count += 1
    else counts.set(g.grade, { rank: g.rank, count: 1 })
  }
  const bars = [...counts.entries()]
    .map(([grade, { rank, count }]) => ({ grade, rank, count }))
    .sort((a, b) => b.rank - a.rank)
  const maxCount = Math.max(1, ...bars.map(b => b.count))

  return (
    <div className="flex flex-col gap-4 px-4 pt-4 pb-2">
      <h1 className="text-3xl font-bold text-ink italic">Your ticks</h1>

      {isError ? (
        <button
          onClick={onRetry}
          className="w-full text-sm text-ink-2 text-center py-8 active:text-ink"
        >
          Couldn't load ticks — tap to retry
        </button>
      ) : isLoading ? (
        <Skeleton />
      ) : ticks.length === 0 ? (
        <TicksEmptyState />
      ) : (
        <>
          {/* stat cards */}
          <div className="flex gap-2">
            <StatCard value={String(ticks.length)} label="routes" />
            <StatCard value={hardest} label="hardest" />
            <StatCard value={String(thisMonth)} label="this month" />
          </div>

          {/* grade pyramid */}
          {bars.length > 0 && (
            <div className="rounded-xl border border-ink/20 bg-paper p-3">
              <p className="text-[11px] text-ink-3 mb-2">grade pyramid</p>
              <div className="flex flex-col gap-1.5">
                {bars.map(bar => (
                  <div
                    key={bar.grade}
                    data-testid="pyramid-bar"
                    data-grade={bar.grade}
                    data-count={bar.count}
                    className="flex items-center gap-2"
                  >
                    <span className="w-6 shrink-0 text-[11px] text-ink-2 text-right">{bar.grade}</span>
                    <div className="flex-1">
                      <div
                        className="h-3.5 rounded-sm bg-accent/80"
                        style={{ width: `${(bar.count / maxCount) * 100}%` }}
                      />
                    </div>
                    <span className="w-5 shrink-0 text-[11px] text-ink-3 text-right">{bar.count}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* recent */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <h2 className="text-[15px] font-bold text-ink">recent</h2>
              <Link to="/ticks/all" className="text-[12px] text-ink-2">
                see all →
              </Link>
            </div>
            {ticks.slice(0, 3).map(item => (
              <TickRow key={item.tick.id} item={item} />
            ))}
          </div>
        </>
      )}
    </div>
  )
}
