import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { dismissToast, runToastAction, useToast } from '../../stores/toast'

export const TOAST_DURATION_MS = 5000

/**
 * Renders the current toast (see `stores/toast.ts`) above the bottom nav.
 * Mount once, in the root layout. The toast is a `popover="manual"` so it sits
 * in the top layer where supported; elsewhere it falls back to a plain fixed
 * element. Auto-dismisses after TOAST_DURATION_MS, paused while it has focus
 * (e.g. a screen-reader user moving to the Undo button).
 */
export const ToastRegion = () => {
  const toast = useToast()
  const ref = useRef<HTMLDivElement>(null)
  const [pausedId, setPausedId] = useState<number | null>(null)
  const paused = toast !== null && pausedId === toast.id

  useLayoutEffect(() => {
    const el = ref.current
    if (el && 'showPopover' in el && !el.matches(':popover-open')) el.showPopover()
  }, [toast?.id])

  useEffect(() => {
    if (!toast || paused) return
    const timer = setTimeout(() => dismissToast(toast.id), TOAST_DURATION_MS)
    return () => clearTimeout(timer)
  }, [toast, paused])

  return (
    <div role="region" aria-label="Notifications">
      {/* Present from first render so the announcement is reliable. */}
      <p role="status" className="sr-only">
        {toast ? `${toast.message}${toast.actionLabel ? '. Actions available' : ''}` : ''}
      </p>
      {toast && (
        <div
          key={toast.id}
          ref={ref}
          popover="manual"
          onFocus={() => setPausedId(toast.id)}
          onBlur={() => setPausedId(null)}
          className="fixed inset-x-0 top-auto bottom-20 mx-auto my-0 w-[92%] max-w-sm border-0 rounded-2xl bg-ink text-paper shadow-lg pl-4 pr-1 py-1 flex items-center gap-2"
        >
          <span className="flex-1 text-[14px]">{toast.message}</span>
          {toast.actionLabel && (
            <button
              type="button"
              onClick={() => runToastAction(toast.id)}
              className="min-h-11 px-4 rounded-full bg-paper text-ink text-[14px] font-semibold active:opacity-80"
            >
              {toast.actionLabel}
            </button>
          )}
          <button
            type="button"
            onClick={() => dismissToast(toast.id)}
            aria-label="Dismiss"
            className="min-h-11 min-w-11 text-paper/70 text-[14px] active:text-paper"
          >
            ✕
          </button>
        </div>
      )}
    </div>
  )
}
