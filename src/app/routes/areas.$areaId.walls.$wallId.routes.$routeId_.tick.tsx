import { useState, useEffect } from 'react'
import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { useRoute } from '../../features/routes/hooks/useRoute'
import { useWall } from '../../features/walls/hooks/useWall'
import { useArea } from '../../features/areas/hooks/useArea'
import { useCurrentUser } from '../../features/users/hooks/useCurrentUser'
import { useTicksByUser } from '../../features/ticks/hooks/useTicksByUser'
import { useCreateTick } from '../../features/ticks/hooks/useCreateTick'
import { useUpdateTick } from '../../features/ticks/hooks/useUpdateTick'

export const Route = createFileRoute('/areas/$areaId/walls/$wallId/routes/$routeId_/tick')({
  component: LogTickPage,
})

const STYLES: { value: string; label: string; description: string }[] = [
  { value: 'onsight', label: 'Onsight', description: 'first try, no beta' },
  { value: 'flash', label: 'Flash', description: 'first try, had beta' },
  { value: 'redpoint', label: 'Redpoint', description: 'sent after working it' },
  { value: 'free solo', label: 'Free solo', description: 'no rope' },
]

function LogTickPage() {
  const { areaId, wallId, routeId } = Route.useParams()
  const areaIdNum = Number(areaId)
  const wallIdNum = Number(wallId)
  const routeIdNum = Number(routeId)
  const navigate = useNavigate()

  const { data: area } = useArea(areaIdNum)
  const { data: wall } = useWall(wallIdNum)
  const { data: route, isLoading: routeLoading, isError } = useRoute(routeIdNum)
  const { data: currentUser } = useCurrentUser()
  const userId = currentUser?.id ?? 0
  const { data: ticksMap = new Map() } = useTicksByUser(userId, { enabled: userId > 0 })
  const existingTick = route ? (ticksMap.get(route.id) ?? null) : null

  const [style, setStyle] = useState('')
  const [rating, setRating] = useState(0)
  const [note, setNote] = useState('')

  useEffect(() => {
    if (existingTick) {
      setStyle(existingTick.style)
      setRating(existingTick.rating)
      setNote(existingTick.personalNote)
    }
  }, [existingTick?.id])

  const { mutate: createTick, isPending: isCreating } = useCreateTick()
  const { mutate: updateTick, isPending: isUpdating } = useUpdateTick()
  const isPending = isCreating || isUpdating

  if (Number.isNaN(areaIdNum) || Number.isNaN(wallIdNum) || Number.isNaN(routeIdNum))
    return <p className="p-4 text-ink-2">Invalid URL</p>
  if (isError)
    return <p className="p-4 text-ink-2">Something went wrong</p>

  const metaParts = [
    route && route.length > 0 ? `${route.length}m` : null,
    route?.style || null,
  ].filter(Boolean)

  const handleSave = () => {
    if (!route || !userId) return
    const data = {
      style: style || undefined,
      rating: rating > 0 ? rating : undefined,
      personalNote: note.trim() || undefined,
    }
    if (existingTick) {
      updateTick(
        { userId, tickId: existingTick.id, ...data },
        { onSuccess: () => navigate({ to: '/areas/$areaId/walls/$wallId/routes/$routeId', params: { areaId, wallId, routeId } }) }
      )
    } else {
      createTick(
        { userId, routeId: route.id, ...data },
        { onSuccess: () => navigate({ to: '/areas/$areaId/walls/$wallId/routes/$routeId', params: { areaId, wallId, routeId } }) }
      )
    }
  }

  return (
    <div className="flex flex-col min-h-full pb-36">
      {/* Header */}
      <div className="flex items-center justify-between px-4 pt-4 pb-3">
        <button
          onClick={() => navigate({ to: '/areas/$areaId/walls/$wallId/routes/$routeId', params: { areaId, wallId, routeId } })}
          className="text-[13px] text-ink-2"
        >
          ‹ back
        </button>
        <p className="text-[15px] font-semibold text-ink">log a tick</p>
        <button
          onClick={handleSave}
          disabled={isPending}
          className="bg-accent text-paper text-[12px] font-semibold px-3 py-1 rounded-full disabled:opacity-50"
        >
          save
        </button>
      </div>

      {/* Route context */}
      <div className="px-4 pb-4">
        <p className="text-[11px] uppercase tracking-wide text-ink-3 mb-1">
          {area?.region}{wall?.name ? ` · ${wall.name}` : ''}
        </p>
        {routeLoading ? (
          <div className="flex flex-col gap-2">
            <div className="h-7 w-2/3 bg-paper-2 animate-pulse rounded" />
            <div className="h-4 w-1/4 bg-paper-2 animate-pulse rounded" />
          </div>
        ) : (
          <>
            <div className="flex items-start justify-between gap-3">
              <h1 className="text-2xl font-bold text-ink leading-tight">{route?.name}</h1>
              {route?.grade && (
                <div className="shrink-0 rounded-lg bg-paper-2 border border-ink/15 px-2.5 py-1 mt-0.5">
                  <span className="text-[13px] font-bold text-ink">{route.grade}</span>
                </div>
              )}
            </div>
            {metaParts.length > 0 && (
              <p className="text-[12px] text-ink-3 mt-1">{metaParts.join(' · ')}</p>
            )}
          </>
        )}
      </div>

      <div className="border-t border-ink/10 mx-4 mb-4" />

      {/* Style picker */}
      <div className="px-4 mb-5">
        <p className="text-[11px] uppercase tracking-widest text-ink-3 mb-3">How did you send it?</p>
        <div className="flex flex-col gap-2">
          {STYLES.map(s => (
            <button
              key={s.value}
              onClick={() => setStyle(style === s.value ? '' : s.value)}
              className={`flex items-center gap-3 w-full text-left rounded-xl border px-4 py-3 transition-colors ${
                style === s.value
                  ? 'border-accent bg-accent/5'
                  : 'border-ink/15 bg-paper'
              }`}
            >
              <span className={`w-4 h-4 rounded-full border-2 flex items-center justify-center shrink-0 ${
                style === s.value ? 'border-accent' : 'border-ink/30'
              }`}>
                {style === s.value && (
                  <span className="w-2 h-2 rounded-full bg-accent" />
                )}
              </span>
              <span>
                <span className="text-[14px] font-semibold text-ink block">{s.label}</span>
                <span className="text-[12px] text-ink-3">{s.description}</span>
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* Star rating */}
      <div className="px-4 mb-5">
        <div className="flex items-center justify-between mb-2">
          <p className="text-[11px] uppercase tracking-widest text-ink-3">Rate</p>
          {rating > 0 && (
            <button onClick={() => setRating(0)} className="text-[11px] text-ink-3">clear</button>
          )}
        </div>
        <div className="flex gap-2">
          {[1, 2, 3, 4, 5].map(star => (
            <button
              key={star}
              onClick={() => setRating(star === rating ? 0 : star)}
              className={`text-[28px] leading-none ${star <= rating ? 'text-accent' : 'text-ink/20'}`}
            >
              ★
            </button>
          ))}
        </div>
      </div>

      {/* Personal note */}
      <div className="px-4 mb-4">
        <div className="flex items-center justify-between mb-2">
          <p className="text-[11px] uppercase tracking-widest text-ink-3">Personal note</p>
          <p className="text-[11px] text-ink-3">optional</p>
        </div>
        <textarea
          value={note}
          onChange={e => setNote(e.target.value)}
          placeholder="How did it feel? Any beta worth remembering?"
          rows={3}
          className="w-full bg-paper-2 border border-ink/15 rounded-xl px-3 py-2.5 text-[14px] text-ink placeholder:text-ink-3 resize-none focus:outline-none focus:border-ink/30"
        />
      </div>

      {/* Floating save button */}
      <div className="fixed bottom-16 left-0 right-0 max-w-md mx-auto px-4">
        <button
          onClick={handleSave}
          disabled={isPending}
          className="w-full py-3.5 rounded-full bg-ink text-paper shadow-lg text-[14px] font-semibold disabled:opacity-50"
        >
          {isPending ? 'Saving…' : 'save tick ✓'}
        </button>
      </div>
    </div>
  )
}
