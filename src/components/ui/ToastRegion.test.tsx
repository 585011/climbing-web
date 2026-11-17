import { describe, it, expect, vi, afterEach } from 'vitest'
import { act, render, screen, fireEvent } from '@testing-library/react'
import { ToastRegion, TOAST_DURATION_MS } from './ToastRegion'
import { dismissToast, showToast } from '../../stores/toast'

let lastId = 0
const show = (toast: Parameters<typeof showToast>[0]) => act(() => { lastId = showToast(toast) })

afterEach(() => {
  act(() => dismissToast(lastId))
  vi.useRealTimers()
})

describe('ToastRegion', () => {
  it('shows the message and runs the action on Undo', () => {
    const onAction = vi.fn()
    const onDismiss = vi.fn()
    render(<ToastRegion />)
    show({ message: 'Tick removed', actionLabel: 'Undo', onAction, onDismiss })

    expect(screen.getByRole('status')).toHaveTextContent('Tick removed. Actions available')
    fireEvent.click(screen.getByRole('button', { name: 'Undo' }))

    expect(onAction).toHaveBeenCalledOnce()
    expect(onDismiss).not.toHaveBeenCalled()
    expect(screen.queryByRole('button', { name: 'Undo' })).not.toBeInTheDocument()
  })

  it('auto-dismisses after the timeout', () => {
    vi.useFakeTimers()
    const onDismiss = vi.fn()
    render(<ToastRegion />)
    show({ message: 'Tick removed', actionLabel: 'Undo', onAction: vi.fn(), onDismiss })

    act(() => vi.advanceTimersByTime(TOAST_DURATION_MS - 1))
    expect(onDismiss).not.toHaveBeenCalled()
    act(() => vi.advanceTimersByTime(1))
    expect(onDismiss).toHaveBeenCalledOnce()
  })

  it('does not auto-dismiss while the toast has focus', () => {
    vi.useFakeTimers()
    const onDismiss = vi.fn()
    render(<ToastRegion />)
    show({ message: 'Tick removed', actionLabel: 'Undo', onAction: vi.fn(), onDismiss })

    act(() => screen.getByRole('button', { name: 'Undo' }).focus())
    act(() => vi.advanceTimersByTime(TOAST_DURATION_MS * 2))
    expect(onDismiss).not.toHaveBeenCalled()
  })
})
