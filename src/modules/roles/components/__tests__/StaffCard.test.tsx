/**
 * StaffCard tests — render, status badge, null todayStats placeholder, tap callback.
 * Assertions use i18n keys + testIDs (locale-independent).
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
import { StaffCard } from '../StaffCard'
import { t } from '@locales/index'
import type { StaffResponseDto } from '../../../../types/roles'

const baseStaff: StaffResponseDto = {
  staffId: 's1',
  userId: 'u1',
  name: 'Raju Kumar',
  phone: '+91 98765 43210',
  role: 'staff',
  status: 'ACTIVE',
  areaRouteLabel: 'Sector 15',
  permissions: ['mark_deliveries'],
  assignedListCount: 2,
  assignedListIds: ['l1', 'l2'],
  todayStats: null,
  invitedAt: null,
  joinedAt: '2026-01-15',
  createdAt: '2026-01-15',
  updatedAt: '2026-01-15',
}

describe('StaffCard', () => {
  beforeEach(() => jest.clearAllMocks())

  it('renders name, phone, and active status badge', async () => {
    const screen = await render(<StaffCard staff={baseStaff} onPress={jest.fn()} testID="card" />)
    expect(screen.getByText('Raju Kumar')).toBeTruthy()
    expect(screen.getByText('+91 98765 43210')).toBeTruthy()
    expect(screen.getByText(t('roles.status_active'))).toBeTruthy()
  })

  it('shows a placeholder when todayStats is null', async () => {
    const screen = await render(<StaffCard staff={baseStaff} onPress={jest.fn()} />)
    expect(screen.getByText('—')).toBeTruthy()
  })

  it('renders today progress when todayStats present', async () => {
    const staff = { ...baseStaff, todayStats: { deliveriesMarked: 73, leavesMarked: 9 } }
    const screen = await render(<StaffCard staff={staff} onPress={jest.fn()} />)
    expect(screen.getByText(t('roles.today_done', { done: 73, total: 82 }))).toBeTruthy()
  })

  it('shows the disabled badge for disabled staff', async () => {
    const staff = { ...baseStaff, status: 'DISABLED' as const }
    const screen = await render(<StaffCard staff={staff} onPress={jest.fn()} />)
    expect(screen.getByText(t('roles.status_disabled'))).toBeTruthy()
  })

  it('fires onPress with staffId and a light haptic on tap', async () => {
    const onPress = jest.fn()
    const screen = await render(<StaffCard staff={baseStaff} onPress={onPress} testID="card" />)
    fireEvent.press(screen.getByTestId('card'))
    expect(onPress).toHaveBeenCalledWith('s1')
    expect(Haptics.impactAsync).toHaveBeenCalledWith(Haptics.ImpactFeedbackStyle.Light)
  })
})
