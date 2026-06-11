/**
 * StaffMultiSelect tests — loading, empty, row toggle (assign/unassign), primary
 * badge vs. set-primary button, and disabled (offline) gating.
 */

jest.mock('expo-haptics', () => ({
  impactAsync: jest.fn(),
  notificationAsync: jest.fn(),
  ImpactFeedbackStyle: { Light: 'light', Medium: 'medium', Heavy: 'heavy' },
  NotificationFeedbackType: { Success: 'success', Warning: 'warning', Error: 'error' },
}))

import React from 'react'
import { render, fireEvent } from '@testing-library/react-native'
import { StaffMultiSelect, type StaffOption } from '../StaffMultiSelect'
import { t } from '@locales/index'

const options: StaffOption[] = [
  { staffId: 's1', name: 'Raju' },
  { staffId: 's2', name: 'Suresh' },
]

describe('StaffMultiSelect', () => {
  const onToggleAssign = jest.fn()
  const onSetPrimary = jest.fn()

  beforeEach(() => jest.clearAllMocks())

  it('shows the loading skeleton', async () => {
    const screen = await render(
      <StaffMultiSelect
        options={options}
        assignedIds={[]}
        onToggleAssign={onToggleAssign}
        onSetPrimary={onSetPrimary}
        isLoading
        testID="sms"
      />,
    )
    expect(screen.getByTestId('sms-loading')).toBeTruthy()
  })

  it('shows the empty state when there are no staff', async () => {
    const screen = await render(
      <StaffMultiSelect
        options={[]}
        assignedIds={[]}
        onToggleAssign={onToggleAssign}
        onSetPrimary={onSetPrimary}
        testID="sms"
      />,
    )
    expect(screen.getByTestId('sms-empty')).toBeTruthy()
  })

  it('toggles assignment on (was unassigned)', async () => {
    const screen = await render(
      <StaffMultiSelect
        options={options}
        assignedIds={[]}
        onToggleAssign={onToggleAssign}
        onSetPrimary={onSetPrimary}
        testID="sms"
      />,
    )
    fireEvent.press(screen.getByTestId('sms-s1'))
    expect(onToggleAssign).toHaveBeenCalledWith('s1', true)
  })

  it('toggles assignment off (was assigned)', async () => {
    const screen = await render(
      <StaffMultiSelect
        options={options}
        assignedIds={['s1']}
        onToggleAssign={onToggleAssign}
        onSetPrimary={onSetPrimary}
        testID="sms"
      />,
    )
    fireEvent.press(screen.getByTestId('sms-s1'))
    expect(onToggleAssign).toHaveBeenCalledWith('s1', false)
  })

  it('renders a primary badge on the primary row and a set-primary button on others', async () => {
    const screen = await render(
      <StaffMultiSelect
        options={options}
        assignedIds={['s1', 's2']}
        primaryStaffId="s1"
        onToggleAssign={onToggleAssign}
        onSetPrimary={onSetPrimary}
        testID="sms"
      />,
    )
    // s2 (non-primary, assigned) shows the set-primary action.
    fireEvent.press(screen.getByTestId('sms-primary-s2'))
    expect(onSetPrimary).toHaveBeenCalledWith('s2')
    // s1 (primary) has no set-primary button.
    expect(screen.queryByTestId('sms-primary-s1')).toBeNull()
    // The primary label is rendered (badge) at least once.
    expect(screen.getAllByText(t('supply.primary_staff')).length).toBeGreaterThan(0)
  })

  it('does not fire callbacks when disabled', async () => {
    const screen = await render(
      <StaffMultiSelect
        options={options}
        assignedIds={['s1']}
        onToggleAssign={onToggleAssign}
        onSetPrimary={onSetPrimary}
        disabled
        testID="sms"
      />,
    )
    fireEvent.press(screen.getByTestId('sms-s1'))
    expect(onToggleAssign).not.toHaveBeenCalled()
  })
})
