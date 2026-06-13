/**
 * StaffMoreMenuScreen tests (Bottom Navigation Feature)
 * Covers: staff menu rows (enabled vs coming soon), Today's Leaves destination,
 * My Delivery History destination, logout confirm/cancel flow.
 *
 * Modal content is found with findBy* (async) to account for RN Modal's async mount.
 */

jest.mock('expo-haptics', () => ({
  selectionAsync: jest.fn(),
  notificationAsync: jest.fn(),
  NotificationFeedbackType: { Success: 'success', Warning: 'warning', Error: 'error' },
}))

const mockPush = jest.fn()
const mockReplace = jest.fn()
jest.mock('expo-router', () => ({
  useRouter: () => ({ push: mockPush, replace: mockReplace, back: jest.fn() }),
}))

jest.mock('@modules/roles/hooks/useRole', () => ({ useRole: jest.fn() }))
jest.mock('@modules/auth/store/auth.store', () => ({ useAuthStore: jest.fn() }))

import React from 'react'
import { render, fireEvent, act, waitFor } from '@testing-library/react-native'
import StaffMoreMenuScreen from '../StaffMoreMenuScreen'
import { t } from '@locales/index'
import { useRole } from '@modules/roles/hooks/useRole'
import { useAuthStore } from '@modules/auth/store/auth.store'

const useRoleMock = useRole as jest.Mock
const useAuthStoreMock = useAuthStore as unknown as jest.Mock

const logoutMock = jest.fn().mockResolvedValue(undefined)

function mockStaffRole() {
  useRoleMock.mockReturnValue({
    roleContext: { role: 'staff', vendorId: 'v1', staffId: 's1', permissions: [] },
    isOwner: false,
    isStaff: true,
    hasPermission: () => false,
    canAccessList: () => true,
    isLoading: false,
    error: null,
  })
}

beforeEach(() => {
  jest.clearAllMocks()
  logoutMock.mockResolvedValue(undefined)
  mockStaffRole()
  useAuthStoreMock.mockImplementation((selector: (s: unknown) => unknown) =>
    selector({ logout: logoutMock }),
  )
})

describe('StaffMoreMenuScreen', () => {
  it('renders the More menu title', async () => {
    const screen = await render(<StaffMoreMenuScreen />)
    expect(screen.getByText(t('nav.more.title'))).toBeTruthy()
  })

  it('renders the log out button', async () => {
    const screen = await render(<StaffMoreMenuScreen />)
    expect(screen.getByTestId('more-logout-button')).toBeTruthy()
  })

  it("Today's Leaves row is enabled and navigates to mark-leave (OQ-2)", async () => {
    const screen = await render(<StaffMoreMenuScreen />)
    fireEvent.press(await screen.findByTestId('more-row-todays-leaves'))
    expect(mockPush).toHaveBeenCalledWith('/(app)/deliveries/mark-leave')
  })

  it('My Delivery History navigates to /activity/my-activity', async () => {
    const screen = await render(<StaffMoreMenuScreen />)
    fireEvent.press(await screen.findByTestId('more-row-my-delivery-history'))
    expect(mockPush).toHaveBeenCalledWith('/(app)/activity/my-activity')
  })

  it('Notifications navigates to /settings/notifications', async () => {
    const screen = await render(<StaffMoreMenuScreen />)
    fireEvent.press(await screen.findByTestId('more-row-notifications'))
    expect(mockPush).toHaveBeenCalledWith('/(app)/settings/notifications')
  })

  it('Change Password is disabled (coming soon)', async () => {
    const screen = await render(<StaffMoreMenuScreen />)
    const row = await screen.findByTestId('more-row-change-password')
    expect(row.props.accessibilityState?.disabled).toBe(true)
  })

  it('Help & FAQ is disabled (coming soon)', async () => {
    const screen = await render(<StaffMoreMenuScreen />)
    const row = await screen.findByTestId('more-row-help-faq')
    expect(row.props.accessibilityState?.disabled).toBe(true)
  })

  it('Contact Owner is disabled (coming soon)', async () => {
    const screen = await render(<StaffMoreMenuScreen />)
    const row = await screen.findByTestId('more-row-contact-owner')
    expect(row.props.accessibilityState?.disabled).toBe(true)
  })

  it('shows coming soon captions on disabled rows', async () => {
    const screen = await render(<StaffMoreMenuScreen />)
    const comingSoon = await screen.findAllByText(t('nav.comingSoon'))
    expect(comingSoon.length).toBeGreaterThan(0)
  })

  it('shows logout confirm dialog when log out is pressed', async () => {
    const screen = await render(<StaffMoreMenuScreen />)
    fireEvent.press(screen.getByTestId('more-logout-button'))
    expect(await screen.findByText(t('nav.logout.confirmTitle'))).toBeTruthy()
  })

  it('calls logout and redirects to login on confirm', async () => {
    const screen = await render(<StaffMoreMenuScreen />)
    fireEvent.press(screen.getByTestId('more-logout-button'))
    await screen.findByText(t('nav.logout.confirmTitle'))
    const allLogoutBtns = await screen.findAllByText(t('nav.logout.confirm'))
    const dialogConfirm = allLogoutBtns[allLogoutBtns.length - 1]!

    await act(async () => {
      fireEvent.press(dialogConfirm)
    })

    await waitFor(() => {
      expect(logoutMock).toHaveBeenCalled()
      expect(mockReplace).toHaveBeenCalledWith('/(auth)/login')
    })
  })

  it('dismisses dialog on cancel without logging out', async () => {
    const screen = await render(<StaffMoreMenuScreen />)
    fireEvent.press(screen.getByTestId('more-logout-button'))
    await screen.findByText(t('nav.logout.confirmTitle'))
    const cancelBtn = await screen.findByText(t('nav.logout.cancel'))
    fireEvent.press(cancelBtn)

    await waitFor(() => {
      expect(logoutMock).not.toHaveBeenCalled()
    })
  })
})
