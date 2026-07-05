import { describe, it, expect, vi } from 'vitest'
import { fireEvent, render, screen } from '@testing-library/react'
import type { User } from '../../../types/api'

import { MeProfile } from './MeProfile'

const user = (displayName = 'Martin'): User => ({
  id: 7,
  email: 'martin@example.com',
  displayName,
  createdAt: '2026-01-01T00:00:00Z',
  auth0Id: 'auth0|abc123',
})

const baseProps = {
  ticksCount: 47,
  onSaveName: vi.fn(),
  isSaving: false,
  saveError: false,
  onDelete: vi.fn(),
  isDeleting: false,
  deleteError: false,
  onLogout: vi.fn(),
}

describe('MeProfile display', () => {
  it('shows name, email and routes-ticked count', () => {
    render(<MeProfile user={user()} {...baseProps} />)

    expect(screen.getByText('Martin')).toBeInTheDocument()
    expect(screen.getByText('martin@example.com')).toBeInTheDocument()
    expect(screen.getByTestId('stat-ticks')).toHaveTextContent('47')
    expect(screen.getByText('routes ticked')).toBeInTheDocument()
  })

  it('prompts to add a display name when it is empty', () => {
    render(<MeProfile user={user('')} {...baseProps} />)

    expect(screen.getByText('Add display name')).toBeInTheDocument()
  })
})

describe('MeProfile name editing', () => {
  it('pencil opens a pre-filled input; save fires onSaveName with the trimmed draft', () => {
    const onSaveName = vi.fn()
    render(<MeProfile user={user()} {...baseProps} onSaveName={onSaveName} />)

    fireEvent.click(screen.getByRole('button', { name: 'Edit display name' }))
    const input = screen.getByLabelText<HTMLInputElement>('Display name')
    expect(input.value).toBe('Martin')
    expect(input).toHaveAttribute('maxlength', '100')

    fireEvent.change(input, { target: { value: '  Åse  ' } })
    fireEvent.click(screen.getByRole('button', { name: 'save' }))

    expect(onSaveName).toHaveBeenCalledWith('Åse')
    // Editor closes after save.
    expect(screen.queryByLabelText('Display name')).not.toBeInTheDocument()
  })

  it('disables save when the draft is blank or unchanged', () => {
    render(<MeProfile user={user()} {...baseProps} />)

    fireEvent.click(screen.getByRole('button', { name: 'Edit display name' }))
    const save = screen.getByRole('button', { name: 'save' })

    // Unchanged pre-fill.
    expect(save).toBeDisabled()

    fireEvent.change(screen.getByLabelText('Display name'), { target: { value: '   ' } })
    expect(save).toBeDisabled()

    fireEvent.change(screen.getByLabelText('Display name'), { target: { value: 'New Name' } })
    expect(save).toBeEnabled()
  })

  it('cancel closes the editor without saving', () => {
    const onSaveName = vi.fn()
    render(<MeProfile user={user()} {...baseProps} onSaveName={onSaveName} />)

    fireEvent.click(screen.getByRole('button', { name: 'Edit display name' }))
    fireEvent.change(screen.getByLabelText('Display name'), { target: { value: 'X' } })
    fireEvent.click(screen.getByRole('button', { name: 'cancel' }))

    expect(onSaveName).not.toHaveBeenCalled()
    expect(screen.queryByLabelText('Display name')).not.toBeInTheDocument()
  })

  it('shows an inline error when saving failed', () => {
    render(<MeProfile user={user()} {...baseProps} saveError />)

    expect(screen.getByText(/couldn't save/i)).toBeInTheDocument()
  })
})

describe('MeProfile delete flow', () => {
  it('is two-step: first tap arms with a warning, confirm fires onDelete', () => {
    const onDelete = vi.fn()
    render(<MeProfile user={user()} {...baseProps} onDelete={onDelete} />)

    fireEvent.click(screen.getByRole('button', { name: 'Delete account' }))
    expect(onDelete).not.toHaveBeenCalled()
    expect(screen.getByText(/cannot be undone/i)).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: 'Yes, delete everything' }))
    expect(onDelete).toHaveBeenCalledTimes(1)
  })

  it('cancel disarms without deleting', () => {
    const onDelete = vi.fn()
    render(<MeProfile user={user()} {...baseProps} onDelete={onDelete} />)

    fireEvent.click(screen.getByRole('button', { name: 'Delete account' }))
    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }))

    expect(onDelete).not.toHaveBeenCalled()
    expect(screen.queryByText(/cannot be undone/i)).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Delete account' })).toBeInTheDocument()
  })

  it('fires onLogout from the log out button', () => {
    const onLogout = vi.fn()
    render(<MeProfile user={user()} {...baseProps} onLogout={onLogout} />)

    fireEvent.click(screen.getByRole('button', { name: 'Log out' }))
    expect(onLogout).toHaveBeenCalledTimes(1)
  })
})
