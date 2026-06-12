import { useEffect, useState } from 'react'

/**
 * Returns a copy of `value` that only updates after `delayMs` of no changes.
 * Use it to debounce expensive work driven by fast-changing input (e.g. search
 * filtering, and any future server-side search requests).
 */
export function useDebouncedValue<T>(value: T, delayMs: number): T {
  const [debounced, setDebounced] = useState(value)

  useEffect(() => {
    const id = setTimeout(() => setDebounced(value), delayMs)
    return () => clearTimeout(id)
  }, [value, delayMs])

  return debounced
}
