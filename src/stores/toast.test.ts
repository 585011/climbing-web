import { describe, it, expect, vi } from 'vitest'
import { dismissToast, runToastAction, showToast } from './toast'

describe('toast store', () => {
  it('runs onAction (not onDismiss) when the action is taken', () => {
    const onAction = vi.fn()
    const onDismiss = vi.fn()
    const id = showToast({ message: 'x', actionLabel: 'Undo', onAction, onDismiss })

    runToastAction(id)
    expect(onAction).toHaveBeenCalledOnce()
    expect(onDismiss).not.toHaveBeenCalled()
  })

  it('runs onDismiss when dismissed, and ignores stale ids afterwards', () => {
    const onAction = vi.fn()
    const onDismiss = vi.fn()
    const id = showToast({ message: 'x', onAction, onDismiss })

    dismissToast(id)
    dismissToast(id)
    runToastAction(id)
    expect(onDismiss).toHaveBeenCalledOnce()
    expect(onAction).not.toHaveBeenCalled()
  })

  it('dismisses the previous toast when a new one replaces it', () => {
    const firstDismiss = vi.fn()
    showToast({ message: 'first', onDismiss: firstDismiss })
    const id = showToast({ message: 'second' })

    expect(firstDismiss).toHaveBeenCalledOnce()
    dismissToast(id)
  })
})
