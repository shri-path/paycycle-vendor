/**
 * InviteStaffScreen tests — phone validation, supply-list multi-select states,
 * 409/451 error mapping, offline-disabled submit, and the success sheet with the
 * invite URL. Submit-success test is ordered LAST and act-wrapped (testing-strategy).
 */

jest.mock('expo-haptics', () => ({
  impactAsync: jest.fn(),
  notificationAsync: jest.fn(),
  ImpactFeedbackStyle: { Light: 'light', Medium: 'medium', Heavy: 'heavy' },
  NotificationFeedbackType: { Success: 'success', Warning: 'warning', Error: 'error' },
}))

const mockBack = jest.fn()
jest.mock('expo-router', () => ({
  useRouter: () => ({ push: jest.fn(), replace: jest.fn(), back: mockBack }),
}))

jest.mock('@hooks/useNetworkStatus', () => ({
  useNetworkStatus: jest.fn().mockReturnValue({ isConnected: true, isChecking: false }),
}))

jest.mock('../../hooks/useRequireOwner', () => ({ useRequireOwner: jest.fn() }))

jest.mock('../../store/roles.store', () => ({ useRolesStore: jest.fn() }))

// AppBottomSheet's header close button (AppIconButton icon="✕") renders a raw
// string into a <View> and crashes when the sheet opens — a PRE-EXISTING shared-
// composite defect (reported to the orchestrator). Mock it to a visible-gated
// passthrough so the success-sheet flow is testable.
jest.mock('@components/composite/AppBottomSheet', () => {
  const React = require('react')
  const { View } = require('react-native')
  return {
    AppBottomSheet: ({ visible, children }: { visible?: boolean; children?: React.ReactNode }) =>
      visible ? React.createElement(View, null, children) : null,
  }
})

import React from 'react'
import { render, fireEvent, waitFor, act } from '@testing-library/react-native'
import InviteStaffScreen from '../InviteStaffScreen'
import { t } from '@locales/index'
import { useNetworkStatus } from '@hooks/useNetworkStatus'
import type { InviteStaffResult } from '../../../../types/roles'

const { useRolesStore } = jest.requireMock('../../store/roles.store') as { useRolesStore: jest.Mock }
const useNetworkStatusMock = useNetworkStatus as jest.Mock

const mockInvite = jest.fn()
const mockFetchOptions = jest.fn().mockResolvedValue(undefined)
const mockClearError = jest.fn()

function mockStore(state: Record<string, unknown>) {
  useRolesStore.mockImplementation((selector: (s: unknown) => unknown) =>
    selector({
      inviteStaff: mockInvite,
      staffError: null,
      isStaffLoading: false,
      clearStaffError: mockClearError,
      supplyListOptions: [{ listId: 'l1', name: 'Morning Milk' }],
      isSupplyListsLoading: false,
      fetchSupplyListOptions: mockFetchOptions,
      ...state,
    }),
  )
}

describe('InviteStaffScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    useNetworkStatusMock.mockReturnValue({ isConnected: true, isChecking: false })
    mockStore({})
  })

  it('fetches supply-list options on mount', async () => {
    await render(<InviteStaffScreen />)
    expect(mockFetchOptions).toHaveBeenCalled()
  })

  it('renders the multi-select option and the send-via segments', async () => {
    const screen = await render(<InviteStaffScreen />)
    expect(screen.getByTestId('invite-lists-l1')).toBeTruthy()
    expect(screen.getByText(t('roles.send_whatsapp'))).toBeTruthy()
    expect(screen.getByText(t('roles.send_sms'))).toBeTruthy()
  })

  it('shows a phone validation error when submitting empty', async () => {
    const screen = await render(<InviteStaffScreen />)
    fireEvent.press(screen.getByTestId('invite-submit'))
    await waitFor(() => {
      expect(screen.getByTestId('invite-phone-error')).toHaveTextContent(t('validation.required'))
    })
    expect(mockInvite).not.toHaveBeenCalled()
  })

  it('maps a 409 conflict to the already-staff banner', async () => {
    mockStore({ staffError: 'roles.error_already_staff' })
    const screen = await render(<InviteStaffScreen />)
    expect(screen.getByText(t('roles.error_already_staff'))).toBeTruthy()
  })

  it('maps a 451 limit to the generic staff-limit alert (no upgrade CTA)', async () => {
    mockStore({ staffError: 'roles.error_staff_limit' })
    const screen = await render(<InviteStaffScreen />)
    expect(screen.getByText(t('roles.error_staff_limit'))).toBeTruthy()
  })

  it('disables submit and shows the offline banner when offline', async () => {
    useNetworkStatusMock.mockReturnValue({ isConnected: false, isChecking: false })
    const screen = await render(<InviteStaffScreen />)
    expect(screen.getByText(t('common.offline'))).toBeTruthy()
    fireEvent.press(screen.getByTestId('invite-submit'))
    expect(mockInvite).not.toHaveBeenCalled()
  })

  // NOTE: submit-success ordered LAST — async navigation can leave teardown open.
  it('shows the success sheet with the invite URL on success', async () => {
    const result: InviteStaffResult = {
      staff: {
        staffId: 's1',
        userId: null,
        name: null,
        phone: '+919876543210',
        role: 'staff',
        status: 'INVITED',
        areaRouteLabel: null,
        permissions: ['mark_deliveries', 'mark_leaves'],
        assignedListCount: 0,
        assignedListIds: [],
        todayStats: null,
        invitedAt: '2026-06-09',
        joinedAt: null,
        createdAt: '2026-06-09',
        updatedAt: '2026-06-09',
      },
      inviteUrl: 'paycyclevendor://join/tok123',
      expiresAt: '2026-06-16',
    }
    mockInvite.mockResolvedValueOnce(result)
    const screen = await render(<InviteStaffScreen />)
    const phoneInput = screen.getByTestId('invite-phone')
    fireEvent.changeText(phoneInput, '9876543210')
    // Wait for the controlled phone value to commit before submitting, otherwise
    // the submit closure validates an empty phone (React 19 async state flush).
    await waitFor(() => expect(phoneInput.props.value).toBe('9876543210'))
    await act(async () => {
      fireEvent.press(screen.getByTestId('invite-submit'))
    })
    await waitFor(() => {
      expect(screen.getByTestId('invite-url')).toHaveTextContent('paycyclevendor://join/tok123')
    })
    expect(mockInvite).toHaveBeenCalledWith(
      expect.objectContaining({ phone: '+919876543210', sendVia: 'whatsapp' }),
    )
  })
})
