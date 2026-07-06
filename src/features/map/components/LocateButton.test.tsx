import { describe, it, expect, vi, afterEach } from 'vitest'
import { fireEvent, render, screen } from '@testing-library/react'

import { LocateButton } from './LocateButton'

afterEach(() => {
  // @ts-expect-error cleanup of the stub between tests
  delete navigator.geolocation
})

describe('LocateButton', () => {
  it('does not call geolocation on mount', () => {
    const getCurrentPosition = vi.fn()
    Object.defineProperty(navigator, 'geolocation', {
      value: { getCurrentPosition },
      configurable: true,
    })

    render(<LocateButton onLocate={vi.fn()} />)
    expect(getCurrentPosition).not.toHaveBeenCalled()
  })

  it('fires onLocate with coordinates on success', () => {
    const getCurrentPosition = vi.fn((success: PositionCallback) =>
      success({ coords: { latitude: 60.39, longitude: 5.32 } } as GeolocationPosition),
    )
    Object.defineProperty(navigator, 'geolocation', {
      value: { getCurrentPosition },
      configurable: true,
    })
    const onLocate = vi.fn()

    render(<LocateButton onLocate={onLocate} />)
    fireEvent.click(screen.getByRole('button', { name: /locate me/i }))

    expect(onLocate).toHaveBeenCalledWith({ latitude: 60.39, longitude: 5.32 })
  })

  it('shows a note when geolocation fails', () => {
    const getCurrentPosition = vi.fn(
      (_success: PositionCallback, error?: PositionErrorCallback) =>
        error?.({ code: 1, message: 'denied' } as GeolocationPositionError),
    )
    Object.defineProperty(navigator, 'geolocation', {
      value: { getCurrentPosition },
      configurable: true,
    })

    render(<LocateButton onLocate={vi.fn()} />)
    fireEvent.click(screen.getByRole('button', { name: /locate me/i }))

    expect(screen.getByText(/location unavailable/i)).toBeInTheDocument()
  })
})
