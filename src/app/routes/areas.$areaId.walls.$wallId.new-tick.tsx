import { useState } from 'react'
import { createFileRoute, Link, useNavigate } from '@tanstack/react-router'
import { useWall } from '../../features/walls/hooks/useWall'
import { useArea } from '../../features/areas/hooks/useArea'
import { useRoutesByWall } from '../../features/routes/hooks/useRoutesByWall'
import { useCurrentUser } from '../../features/users/hooks/useCurrentUser'
import { useCreateGymTick } from '../../features/ticks/hooks/useCreateGymTick'
import { useUploadTickPhoto } from '../../features/ticks/hooks/useUploadTickPhoto'
import { TickPhotoPicker } from '../../features/ticks/components/TickPhotoPicker'
import type { TickPhoto } from '../../features/ticks/components/TickPhotoPicker'
import { TICK_STYLES } from '../../features/ticks/utils/tickStyles'
import { HoldColorChip } from '../../components/ui/HoldColorChip'
import { HOLD_COLORS } from '../../utils/holdColors'
import { routeDisplayName } from '../../utils/routeDisplayName'
import { NewGymRouteInputSchema, PERSONAL_NOTE_MAX } from '../../types/api'

export const Route = createFileRoute('/areas/$areaId/walls/$wallId/new-tick')({
  component: NewGymTickPage,
})

const DISCIPLINES: { value: 'boulder' | 'sport' | 'toprope' | 'speed'; label: string }[] = [
  { value: 'boulder', label: 'Boulder' },
  { value: 'sport', label: 'Lead' },
  { value: 'toprope', label: 'Top rope' },
  { value: 'speed', label: 'Speed' },
]

const chipClass = (active: boolean) =>
  `shrink-0 text-[13px] rounded-full border px-3 py-1.5 ${
    active ? 'bg-ink text-paper border-ink' : 'border-ink/25 text-ink-2 bg-paper'
  }`

const sameText = (a: string, b: string) => a.trim().toLowerCase() === b.trim().toLowerCase()

function NewGymTickPage() {
  const { areaId, wallId } = Route.useParams()
  const wallIdNum = Number(wallId)
  const navigate = useNavigate()

  const { data: area } = useArea(Number(areaId))
  const { data: wall } = useWall(wallIdNum)
  const { data: routes = [] } = useRoutesByWall(wallIdNum)
  const { data: currentUser } = useCurrentUser()
  const userId = currentUser?.id ?? 0

  const [grade, setGrade] = useState('')
  const [discipline, setDiscipline] = useState<(typeof DISCIPLINES)[number]['value'] | ''>('')
  const [holdColor, setHoldColor] = useState('')
  const [name, setName] = useState('')
  const [style, setStyle] = useState('')
  const [rating, setRating] = useState(0)
  const [note, setNote] = useState('')
  const [photo, setPhoto] = useState<TickPhoto | null>(null)
  // Set once the route + tick exist, so retrying a failed photo upload never
  // creates the route a second time.
  const [savedTickId, setSavedTickId] = useState<number | null>(null)

  const { mutate: createGymTick, isPending: isCreating, isError } = useCreateGymTick()
  const { mutate: uploadPhoto, isPending: isUploading, isError: photoFailed } = useUploadTickPhoto()
  const isPending = isCreating || isUploading

  const newRoute = { wallId: wallIdNum, grade, style: discipline, holdColor, name }
  const routeValid = NewGymRouteInputSchema.safeParse(newRoute).success
  const canSave = savedTickId !== null || (routeValid && style.length > 0 && userId > 0)

  // "Picker first": warn when an active route on this wall already looks like the one being added.
  // Skipped once saved — the refetched list then contains the route we just created.
  const lookalikes = grade.trim() && savedTickId === null
    ? routes.filter(r => sameText(r.grade, grade) && (!holdColor || sameText(r.holdColor, holdColor)))
    : []

  const backToWall = () => navigate({ to: '/areas/$areaId/walls/$wallId', params: { areaId, wallId } })

  if (Number.isNaN(wallIdNum)) return <p className="p-4 text-ink-2">Invalid URL</p>
  if (area && area.type !== 'gym')
    return <p className="p-4 text-ink-2">New routes can only be added in climbing gyms.</p>

  const finish = (tickId: number) => {
    if (!photo) return backToWall()
    uploadPhoto({ userId, tickId, photo: photo.file }, { onSuccess: backToWall })
  }

  const handleSave = () => {
    if (savedTickId !== null) return finish(savedTickId)
    if (!canSave || !discipline) return
    createGymTick(
      {
        userId,
        newRoute: { ...newRoute, style: discipline },
        style,
        rating: rating > 0 ? rating : undefined,
        personalNote: note.trim() || undefined,
      },
      {
        onSuccess: tick => {
          setSavedTickId(tick.id)
          finish(tick.id)
        },
      }
    )
  }

  const saveLabel = savedTickId === null ? 'add route & save tick ✓' : photo ? 'retry photo upload' : 'done'

  return (
    <div className="flex flex-col min-h-full">
      {/* Header */}
      <div className="flex items-center justify-between px-4 pt-4 pb-3">
        <button onClick={backToWall} className="text-[13px] text-ink-2">‹ back</button>
        <p className="text-[15px] font-semibold text-ink">add &amp; tick route</p>
        <span className="w-10" />
      </div>

      <div className="px-4 pb-4">
        <p className="text-[11px] uppercase tracking-wide text-ink-3">
          {area?.name}{wall?.name ? ` · ${wall.name}` : ''}
        </p>
      </div>

      {/* Grade */}
      <div className="px-4 mb-5">
        <label htmlFor="grade" className="block text-[15px] uppercase tracking-widest text-ink-3 mb-2">Grade</label>
        <input
          id="grade"
          value={grade}
          onChange={e => setGrade(e.target.value)}
          placeholder="e.g. 6B or 6+"
          maxLength={20}
          autoComplete="off"
          className="w-full bg-paper-2 border border-ink/15 rounded-xl px-3 py-2.5 text-[16px] text-ink placeholder:text-ink-3 focus:outline-none focus:border-ink/30"
        />
      </div>

      {/* Discipline */}
      <div className="px-4 mb-5">
        <p className="text-[15px] uppercase tracking-widest text-ink-3 mb-2">Type</p>
        <div className="flex gap-2 flex-wrap">
          {DISCIPLINES.map(d => (
            <button key={d.value} onClick={() => setDiscipline(d.value)} className={chipClass(discipline === d.value)}>
              {d.label}
            </button>
          ))}
        </div>
      </div>

      {/* Hold colour */}
      <div className="px-4 mb-5">
        <div className="flex items-center justify-between mb-2">
          <p className="text-[15px] uppercase tracking-widest text-ink-3">Hold colour</p>
          <p className="text-[15px] text-ink-3">optional</p>
        </div>
        <div className="flex gap-2 flex-wrap mb-2">
          {HOLD_COLORS.map(c => (
            <button
              key={c.value}
              onClick={() => setHoldColor(sameText(holdColor, c.value) ? '' : c.value)}
              aria-label={c.value}
              aria-pressed={sameText(holdColor, c.value)}
              className={`w-9 h-9 rounded-full border-2 ${
                sameText(holdColor, c.value) ? 'border-accent scale-110' : 'border-ink/20'
              }`}
              style={{ background: c.swatch }}
            />
          ))}
        </div>
        <input
          aria-label="Hold colour"
          value={holdColor}
          onChange={e => setHoldColor(e.target.value)}
          placeholder="or type a colour"
          maxLength={30}
          className="w-full bg-paper-2 border border-ink/15 rounded-xl px-3 py-2 text-[14px] text-ink placeholder:text-ink-3 focus:outline-none focus:border-ink/30"
        />
      </div>

      {/* Name */}
      <div className="px-4 mb-5">
        <div className="flex items-center justify-between mb-2">
          <label htmlFor="route-name" className="text-[15px] uppercase tracking-widest text-ink-3">Name</label>
          <p className="text-[15px] text-ink-3">optional</p>
        </div>
        <input
          id="route-name"
          value={name}
          onChange={e => setName(e.target.value)}
          maxLength={200}
          className="w-full bg-paper-2 border border-ink/15 rounded-xl px-3 py-2 text-[14px] text-ink focus:outline-none focus:border-ink/30"
        />
      </div>

      {/* Possible duplicates */}
      {lookalikes.length > 0 && (
        <div className="mx-4 mb-5 rounded-xl border border-accent/40 bg-accent/5 p-3">
          <p className="text-[13px] text-ink mb-2">Already on this wall? Tick it instead:</p>
          <div className="flex flex-col gap-1.5">
            {lookalikes.map(r => (
              <Link
                key={r.id}
                to="/areas/$areaId/walls/$wallId/routes/$routeId/tick"
                params={{ areaId, wallId, routeId: String(r.id) }}
                className="flex items-center gap-2 text-[13px] font-semibold text-accent"
              >
                <span>{r.grade}</span>
                <HoldColorChip color={r.holdColor} />
                <span className="truncate">{routeDisplayName(r)} →</span>
              </Link>
            ))}
          </div>
        </div>
      )}

      <div className="border-t border-ink/10 mx-4 mb-4" />

      {/* Tick style */}
      <div className="px-4 mb-5">
        <p className="text-[15px] uppercase tracking-widest text-ink-3 mb-3">How did you send it?</p>
        <div className="flex gap-2 flex-wrap">
          {TICK_STYLES.map(s => (
            <button key={s.value} onClick={() => setStyle(style === s.value ? '' : s.value)} className={chipClass(style === s.value)}>
              {s.label}
            </button>
          ))}
        </div>
      </div>

      {/* Star rating */}
      <div className="px-4 mb-5">
        <p className="text-[15px] uppercase tracking-widest text-ink-3 mb-2">Rate</p>
        <div className="flex gap-2">
          {[1, 2, 3, 4, 5].map(star => (
            <button
              key={star}
              onClick={() => setRating(star === rating ? 0 : star)}
              aria-label={`${star} star`}
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
          <p className="text-[15px] uppercase tracking-widest text-ink-3">Personal note</p>
          <p className="text-[15px] text-ink-3">optional</p>
        </div>
        <textarea
          value={note}
          onChange={e => setNote(e.target.value)}
          rows={3}
          maxLength={PERSONAL_NOTE_MAX}
          className="w-full bg-paper-2 border border-ink/15 rounded-xl px-3 py-2.5 text-[14px] text-ink resize-none focus:outline-none focus:border-ink/30"
        />
      </div>

      {/* Photo */}
      <TickPhotoPicker value={photo} onChange={setPhoto} />

      {/* Save */}
      <div className="px-4 pb-4">
        {isError && <p className="text-center text-[12px] text-accent mb-2">Couldn't save — try again</p>}
        {photoFailed && (
          <p className="text-center text-[12px] text-accent mb-2">Tick saved, but the photo didn’t upload — try again</p>
        )}
        <button
          onClick={handleSave}
          disabled={isPending || !canSave}
          className="w-full py-3.5 rounded-full bg-ink text-paper shadow-lg text-[14px] font-semibold disabled:opacity-50"
        >
          {isPending ? 'Saving…' : saveLabel}
        </button>
        {!canSave && (
          <p className="text-center text-[12px] text-ink-3 mt-2">Grade, type and how you sent it are required</p>
        )}
      </div>
    </div>
  )
}
