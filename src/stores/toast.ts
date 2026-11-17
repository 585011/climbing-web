import { useSyncExternalStore } from 'react'

export type Toast = {
  id: number
  message: string
  actionLabel?: string
  /** Runs when the action button is tapped. `onDismiss` is then skipped. */
  onAction?: () => void
  /** Runs when the toast goes away any other way: timeout, close button, or replaced by a newer toast. */
  onDismiss?: () => void
}

// One toast at a time. Module-level so it outlives route changes — a pending
// action (e.g. a deferred delete) still resolves after the user navigates away.
let current: Toast | null = null
let nextId = 1
const listeners = new Set<() => void>()
const emit = () => listeners.forEach(l => l())

export const showToast = (toast: Omit<Toast, 'id'>): number => {
  const previous = current
  current = { ...toast, id: nextId++ }
  emit()
  previous?.onDismiss?.()
  return current.id
}

/** Closes the toast without its action — runs `onDismiss`. Ignores stale ids. */
export const dismissToast = (id: number) => {
  if (current?.id !== id) return
  const toast = current
  current = null
  emit()
  toast.onDismiss?.()
}

/** Closes the toast via its action — runs `onAction`, skips `onDismiss`. Ignores stale ids. */
export const runToastAction = (id: number) => {
  if (current?.id !== id) return
  const toast = current
  current = null
  emit()
  toast.onAction?.()
}

const subscribe = (listener: () => void) => {
  listeners.add(listener)
  return () => {
    listeners.delete(listener)
  }
}

export const useToast = () => useSyncExternalStore(subscribe, () => current)
