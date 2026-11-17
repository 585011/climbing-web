import { useSyncExternalStore } from 'react'

/**
 * Tick ids the user has removed but whose DELETE hasn't been sent/confirmed
 * yet (the undo window). `useTicksByUser` filters these out, so the tick stays
 * hidden everywhere — even when a refetch still returns it from the server.
 */
let pending: ReadonlySet<number> = new Set()
const listeners = new Set<() => void>()

const update = (next: Set<number>) => {
  pending = next
  listeners.forEach(l => l())
}

export const markTickPendingRemoval = (tickId: number) => update(new Set(pending).add(tickId))

export const clearTickPendingRemoval = (tickId: number) => {
  if (!pending.has(tickId)) return
  const next = new Set(pending)
  next.delete(tickId)
  update(next)
}

const subscribe = (listener: () => void) => {
  listeners.add(listener)
  return () => {
    listeners.delete(listener)
  }
}

export const usePendingTickRemovals = () => useSyncExternalStore(subscribe, () => pending)
