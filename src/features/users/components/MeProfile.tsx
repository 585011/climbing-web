import { useState } from 'react'
import type { User } from '../../../types/api'
import { DISPLAY_NAME_MAX, UpdateUserInputSchema } from '../../../types/api'

interface MeProfileProps {
  user: User
  ticksCount: number
  onSaveName: (displayName: string) => void
  isSaving: boolean
  saveError: boolean
  onDelete: () => void
  isDeleting: boolean
  deleteError: boolean
  onLogout: () => void
}

// Same stroke family as the bottom-nav icons.
const PencilIcon = () => (
  <svg
    width={16}
    height={16}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth={2}
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden
  >
    <path d="m17 3 4 4L8 20l-5 1 1-5Z" />
  </svg>
)

export const MeProfile = ({
  user,
  ticksCount,
  onSaveName,
  isSaving,
  saveError,
  onDelete,
  isDeleting,
  deleteError,
  onLogout,
}: MeProfileProps) => {
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState('')
  const [armed, setArmed] = useState(false)

  const trimmed = draft.trim()
  const canSave =
    !isSaving &&
    trimmed !== user.displayName &&
    UpdateUserInputSchema.safeParse({ email: user.email, displayName: trimmed }).success

  const startEdit = () => {
    setDraft(user.displayName)
    setEditing(true)
  }
  const save = () => {
    onSaveName(trimmed)
    setEditing(false)
  }

  return (
    <div className="flex flex-col gap-6 px-4 pt-6 pb-2">
      {/* profile header */}
      <div>
        {editing ? (
          <div className="flex flex-col gap-2">
            <input
              aria-label="Display name"
              value={draft}
              onChange={e => setDraft(e.target.value)}
              maxLength={DISPLAY_NAME_MAX}
              autoFocus
              className="w-full bg-paper border border-ink/25 rounded-xl px-3 py-2.5 text-[16px] font-semibold text-ink outline-none focus:border-ink/40"
            />
            <div className="flex gap-2">
              <button
                onClick={save}
                disabled={!canSave}
                className="flex-1 bg-ink text-paper rounded-xl py-2.5 text-sm font-semibold disabled:opacity-50"
              >
                save
              </button>
              <button
                onClick={() => setEditing(false)}
                className="flex-1 border border-ink/25 text-ink-2 rounded-xl py-2.5 text-sm"
              >
                cancel
              </button>
            </div>
          </div>
        ) : (
          <div className="flex items-center gap-2">
            {user.displayName ? (
              <h1 className="text-3xl font-bold text-ink">{user.displayName}</h1>
            ) : (
              <h1 className="text-2xl font-bold text-ink-3">Add display name</h1>
            )}
            <button
              onClick={startEdit}
              aria-label="Edit display name"
              className="p-2 text-ink-2 active:text-ink"
            >
              <PencilIcon />
            </button>
          </div>
        )}
        <p className="text-sm text-ink-2 mt-1">{user.email}</p>
        {saveError && (
          <p className="text-[12px] text-accent mt-1">Couldn't save — try again</p>
        )}
      </div>

      {/* stat card (same style as ticks dashboard) */}
      <div className="flex">
        <div className="flex-1 flex flex-col items-center justify-center gap-0.5 rounded-xl border border-ink/20 bg-paper py-3">
          <span
            data-testid="stat-ticks"
            className="text-[20px] font-bold text-ink leading-none"
          >
            {ticksCount}
          </span>
          <span className="text-[10px] text-ink-3">routes ticked</span>
        </div>
      </div>

      {/* log out */}
      <button
        onClick={onLogout}
        className="w-full border border-ink-3 text-ink rounded-xl py-3 text-sm font-semibold active:opacity-80"
      >
        Log out
      </button>

      {/* delete account */}
      <div className="border-t border-ink/10 pt-4">
        {armed ? (
          <div className="flex flex-col gap-2">
            <p className="text-[13px] text-ink-2">
              Deletes your account and all your ticks. This cannot be undone.
            </p>
            <button
              onClick={onDelete}
              disabled={isDeleting}
              className="w-full bg-accent text-paper rounded-xl py-3 text-sm font-semibold disabled:opacity-50"
            >
              {isDeleting ? 'Deleting…' : 'Yes, delete everything'}
            </button>
            <button
              onClick={() => setArmed(false)}
              disabled={isDeleting}
              className="w-full border border-ink/25 text-ink-2 rounded-xl py-3 text-sm"
            >
              Cancel
            </button>
          </div>
        ) : (
          <button
            onClick={() => setArmed(true)}
            className="w-full border border-accent text-accent rounded-xl py-3 text-sm font-semibold active:bg-accent/5"
          >
            Delete account
          </button>
        )}
        {deleteError && (
          <p className="text-[12px] text-accent mt-1">Couldn't delete — try again</p>
        )}
      </div>
    </div>
  )
}
