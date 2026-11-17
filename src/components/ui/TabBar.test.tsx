import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { TabBar } from './TabBar'

describe('TabBar', () => {
  it('exposes tab semantics with the selected tab marked', () => {
    const onChange = vi.fn()
    render(<TabBar tabs={['Routes', 'Info'] as const} active="Routes" onChange={onChange} label="Area sections" />)

    expect(screen.getByRole('tablist', { name: 'Area sections' })).toBeInTheDocument()
    expect(screen.getByRole('tab', { name: 'Routes' })).toHaveAttribute('aria-selected', 'true')
    expect(screen.getByRole('tab', { name: 'Info' })).toHaveAttribute('aria-selected', 'false')

    fireEvent.click(screen.getByRole('tab', { name: 'Info' }))
    expect(onChange).toHaveBeenCalledWith('Info')
  })
})
