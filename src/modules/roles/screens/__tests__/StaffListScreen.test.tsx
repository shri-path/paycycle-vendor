/**
 * StaffListScreen tests — 5 states (loading skeleton, empty, error, content,
 * offline), the OQ-5 "Active: N" line (and no plan/allowed line), card→detail
 * navigation, and the online-only FAB.
 *
 * Assertions use i18n keys + testIDs (locale-independent).
 */

jest.mock('expo-haptics', () => ({
  impactAsync: jest.fn(),
  notificationAsync: jest.fn(),
  ImpactFeedbackStyle: { Light: 'light', Medium: 'medium', Heavy: 'heavy' },
  NotificationFeedbackType: { Success: 'success', Warning: 'warning', Error: 'error' },
}))

const mockPush = jest.fn()
const mockBack = jest.fn()
jest.mock('expo-router', () => {
  const ReactActual = require('react')
  return {
    useRouter: () => ({ push: mockPush, replace: jest.fn(), back: mockBack }),
    // Mimic react-navigation focus: run the effect callback once on mount.
    useFocusEffect: (cb: () => void | (() => void)) => ReactActual.useEffect(cb, [cb]),
  }
})

jest.mock('@hooks/useNetworkStatus', () => ({
  useNetworkStatus: jest.fn().mockReturnValue({ isConnected: true, isChecking: false }),
}))

// Owner guard is a no-op effect in these tests.
jest.mock('../../hooks/useRequireOwner', () => ({ useRequireOwner: jest.fn() }))

const mockFetchStaffList = jest.fn().mockResolvedValue(undefined)
const mockFetchRole = jest.fn().mockResolvedValue(undefined)
jest.mock('../../store/roles.store', () => ({
  useRolesStore: jest.fn(),
}))

import React from 'react'
import { render, fireEvent } from '@testing-library/react-native'
import StaffListScreen from '../StaffListScreen'
import { t } from '@locales/index'
import { useNetworkStatus } from '@hooks/useNetworkStatus'
import type { StaffResponseDto } from '../../../../types/roles'

const { useRolesStore } = jest.requireMock('../../store/roles.store') as { useRolesStore: jest.Mock }
const useNetworkStatusMock = useNetworkStatus as jest.Mock

function makeStaff(over: Partial<StaffResponseDto>): StaffResponseDto {
  return {
    staffId: 's1',
    userId: 'u1',
    name: 'Raju',
    phone: '+91 98765 43210',
    role: 'staff',
    status: 'ACTIVE',
    areaRouteLabel: null,
    permissions: [],
    assignedListCount: 1,
    assignedListIds: ['l1'],
    todayStats: null,
    invitedAt: null,
    joinedAt: '2026-01-15',
    createdAt: '2026-01-15',
    updatedAt: '2026-01-15',
    ...over,
  }
}

function mockStore(state: Record<string, unknown>) {
  useRolesStore.mockImplementation((selector: (s: unknown) => unknown) =>
    selector({
      staffList: [],
      staffLimits: null,
      isStaffLoading: false,
      staffError: null,
      fetchStaffList: mockFetchStaffList,
      fetchRole: mockFetchRole,
      roleContext: null,
      ...state,
    }),
  )
}

describe('StaffListScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    useNetworkStatusMock.mockReturnValue({ isConnected: true, isChecking: false })
    mockStore({})
  })

  it('shows the loading skeleton on first load', async () => {
    mockStore({ isStaffLoading: true, staffList: [] })
    const screen = await render(<StaffListScreen />)
    expect(screen.getByTestId('staff-list-skeleton')).toBeTruthy()
  })

  it('shows the empty state with an invite CTA', async () => {
    mockStore({ staffList: [] })
    const screen = await render(<StaffListScreen />)
    expect(screen.getByText(t('roles.no_staff'))).toBeTruthy()
    expect(screen.getByText(t('roles.invite_staff'))).toBeTruthy()
  })

  it('shows an error state with retry when load fails and no cache', async () => {
    mockStore({ staffError: 'roles.error_forbidden', staffList: [] })
    const screen = await render(<StaffListScreen />)
    expect(screen.getByText(t('roles.error_forbidden'))).toBeTruthy()
    expect(screen.getByText(t('common.retry'))).toBeTruthy()
  })

  it('renders staff and only the "Active: N" line (no plan/allowed line)', async () => {
    mockStore({
      staffList: [makeStaff({ staffId: 's1', status: 'ACTIVE' }), makeStaff({ staffId: 's2', status: 'DISABLED', name: 'Kumar' })],
    })
    const screen = await render(<StaffListScreen />)
    expect(screen.getByText(t('roles.active_count', { active: 1 }))).toBeTruthy()
    expect(screen.getByText(t('roles.active_staff'))).toBeTruthy()
    expect(screen.getByText(t('roles.disabled_staff', { count: 1 }))).toBeTruthy()
    // OQ-5: no plan/staff-allowed text exists anywhere on screen.
    expect(screen.queryByText(/Plan|Allowed/i)).toBeNull()
  })

  it('navigates to detail when a card is tapped', async () => {
    mockStore({ staffList: [makeStaff({ staffId: 's1' })] })
    const screen = await render(<StaffListScreen />)
    fireEvent.press(screen.getByTestId('staff-card-s1'))
    expect(mockPush).toHaveBeenCalledWith('/(app)/staff/s1')
  })

  it('disables the invite FAB when offline and shows the offline banner', async () => {
    useNetworkStatusMock.mockReturnValue({ isConnected: false, isChecking: false })
    mockStore({ staffList: [makeStaff({ staffId: 's1' })] })
    const screen = await render(<StaffListScreen />)
    expect(screen.getByText(t('common.offline'))).toBeTruthy()
    fireEvent.press(screen.getByTestId('invite-staff-fab'))
    expect(mockPush).not.toHaveBeenCalledWith('/(app)/staff/invite')
  })

  // US-004 — plan limits
  it('hides the usage line for the unlimited stub (maxStaff null)', async () => {
    mockStore({
      staffList: [makeStaff({ staffId: 's1' })],
      staffLimits: { maxStaff: null, currentActive: 1, canAddMore: true },
    })
    const screen = await render(<StaffListScreen />)
    expect(screen.queryByTestId('staff-usage')).toBeNull()
    fireEvent.press(screen.getByTestId('invite-staff-fab'))
    expect(mockPush).toHaveBeenCalledWith('/(app)/staff/invite')
  })

  it('shows the usage line under a real cap (US-004)', async () => {
    mockStore({
      staffList: [makeStaff({ staffId: 's1' })],
      staffLimits: { maxStaff: 5, currentActive: 3, canAddMore: true },
    })
    const screen = await render(<StaffListScreen />)
    expect(screen.getByTestId('staff-usage')).toHaveTextContent(
      t('roles.staff_usage', { current: 3, max: 5 }),
    )
  })

  it('gates the Invite FAB and shows the upgrade alert when at cap', async () => {
    mockStore({
      staffList: [makeStaff({ staffId: 's1' })],
      staffLimits: { maxStaff: 4, currentActive: 4, canAddMore: false },
    })
    const screen = await render(<StaffListScreen />)
    expect(screen.getByText(t('roles.staff_limit_reached'))).toBeTruthy()
    fireEvent.press(screen.getByTestId('invite-staff-fab'))
    expect(mockPush).not.toHaveBeenCalledWith('/(app)/staff/invite')
  })

  it('hides the empty-state CTA when at cap', async () => {
    mockStore({
      staffList: [],
      staffLimits: { maxStaff: 4, currentActive: 4, canAddMore: false },
    })
    const screen = await render(<StaffListScreen />)
    expect(screen.getByText(t('roles.no_staff'))).toBeTruthy()
    expect(screen.queryByText(t('roles.invite_staff'))).toBeNull()
  })
})
