/**
 * PermissionToggleList tests — renders the three permissions, toggles add/remove
 * keys, fires a haptic, and renders read-only when not editable.
 */

jest.mock('expo-haptics', () => ({
  impactAsync: jest.fn(),
  notificationAsync: jest.fn(),
  ImpactFeedbackStyle: { Light: 'light', Medium: 'medium', Heavy: 'heavy' },
  NotificationFeedbackType: { Success: 'success', Warning: 'warning', Error: 'error' },
}))

import React from 'react'
import { render, fireEvent } from '@testing-library/react-native'
import * as Haptics from 'expo-haptics'
import { PermissionToggleList } from '../PermissionToggleList'
import { t } from '@locales/index'

describe('PermissionToggleList', () => {
  beforeEach(() => jest.clearAllMocks())

  it('renders all three permission rows', async () => {
    const screen = await render(<PermissionToggleList value={[]} onChange={jest.fn()} editable />)
    expect(screen.getByText(t('roles.perm_mark_deliveries'))).toBeTruthy()
    expect(screen.getByText(t('roles.perm_mark_leaves'))).toBeTruthy()
    expect(screen.getByText(t('roles.perm_add_extra_charges'))).toBeTruthy()
  })

  it('adds a permission key when an unchecked row is toggled', async () => {
    const onChange = jest.fn()
    const screen = await render(
      <PermissionToggleList value={['mark_deliveries']} onChange={onChange} editable testID="perms" />,
    )
    fireEvent.press(screen.getByTestId('perms-mark_leaves'))
    expect(onChange).toHaveBeenCalledWith(['mark_deliveries', 'mark_leaves'])
    expect(Haptics.impactAsync).toHaveBeenCalledWith(Haptics.ImpactFeedbackStyle.Light)
  })

  it('removes a permission key when a checked row is toggled', async () => {
    const onChange = jest.fn()
    const screen = await render(
      <PermissionToggleList
        value={['mark_deliveries', 'mark_leaves']}
        onChange={onChange}
        editable
        testID="perms"
      />,
    )
    fireEvent.press(screen.getByTestId('perms-mark_deliveries'))
    expect(onChange).toHaveBeenCalledWith(['mark_leaves'])
  })

  it('does not change value when not editable', async () => {
    const onChange = jest.fn()
    const screen = await render(
      <PermissionToggleList value={[]} onChange={onChange} editable={false} testID="perms" />,
    )
    fireEvent.press(screen.getByTestId('perms-mark_deliveries'))
    expect(onChange).not.toHaveBeenCalled()
  })
})
