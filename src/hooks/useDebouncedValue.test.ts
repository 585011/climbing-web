import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { act, renderHook } from '@testing-library/react'
import { useDebouncedValue } from './useDebouncedValue'

describe('useDebouncedValue', () => {
  beforeEach(() => vi.useFakeTimers())
  afterEach(() => vi.useRealTimers())

  it('returns the initial value immediately', () => {
    const { result } = renderHook(() => useDebouncedValue('a', 300))
    expect(result.current).toBe('a')
  })

  it('updates only after the delay elapses', () => {
    const { result, rerender } = renderHook(({ v }) => useDebouncedValue(v, 300), {
      initialProps: { v: 'a' },
    })

    rerender({ v: 'ab' })
    expect(result.current).toBe('a') // not yet

    act(() => vi.advanceTimersByTime(299))
    expect(result.current).toBe('a') // still pending

    act(() => vi.advanceTimersByTime(1))
    expect(result.current).toBe('ab') // delay reached
  })

  it('resets the timer on rapid changes (only the last value lands)', () => {
    const { result, rerender } = renderHook(({ v }) => useDebouncedValue(v, 300), {
      initialProps: { v: 'a' },
    })

    rerender({ v: 'ab' })
    act(() => vi.advanceTimersByTime(200))
    rerender({ v: 'abc' })
    act(() => vi.advanceTimersByTime(200))
    expect(result.current).toBe('a') // neither settled

    act(() => vi.advanceTimersByTime(100))
    expect(result.current).toBe('abc') // only the latest
  })
})
