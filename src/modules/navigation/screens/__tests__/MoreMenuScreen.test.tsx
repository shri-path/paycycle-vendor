/**
 * MoreMenuScreen tests (Bottom Navigation Feature)
 * Covers: owner menu rows (enabled vs coming soon), logout confirm/cancel flow.
 *
 * Assertions use testIDs and i18n keys for locale-independence.
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
import MoreMenuScreen from '../MoreMenuScreen'
import { t } from '@locales/index'
import { useRole } from '@modules/roles/hooks/useRole'
import { useAuthStore } from '@modules/auth/store/auth.store'

const useRoleMock = useRole as jest.Mock
const useAuthStoreMock = useAuthStore as unknown as jest.Mock

const logoutMock = jest.fn().mockResolvedValue(undefined)

function mockOwnerRole() {
  useRoleMock.mockReturnValue({
    roleContext: { role: 'owner', vendorId: 'v1' },
    isOwner: true,
    isStaff: false,
    hasPermission: () => true,
    canAccessList: () => true,
    isLoading: false,
    error: null,
  })
}

function mockOwnerRoleLoading() {
  useRoleMock.mockReturnValue({
    roleContext: null,
    isOwner: false,
    isStaff: false,
    hasPermission: () => false,
    canAccessList: () => false,
    isLoading: true,
    error: null,
  })
}

beforeEach(() => {
  jest.clearAllMocks()
  logoutMock.mockResolvedValue(undefined)
  mockOwnerRole()
  useAuthStoreMock.mockImplementation((selector: (s: unknown) => unknown) =>
    selector({ logout: logoutMock }),
  )
})

describe('MoreMenuScreen — loading state', () => {
  it('shows a loading indicator while role is resolving', async () => {
    mockOwnerRoleLoading()
    const screen = await render(<MoreMenuScreen />)
    expect(screen.getByTestId('more-menu-loading')).toBeTruthy()
    // Should not render the logout button while loading
    expect(screen.queryByTestId('more-logout-button')).toBeNull()
  })
})

describe('MoreMenuScreen — owner', () => {
  it('renders the More menu title', async () => {
    const screen = await render(<MoreMenuScreen />)
    expect(screen.getByText(t('nav.more.title'))).toBeTruthy()
  })

  it('renders the log out button', async () => {
    const screen = await render(<MoreMenuScreen />)
    expect(screen.getByTestId('more-logout-button')).toBeTruthy()
  })

  it('shows logout confirm dialog when log out button is pressed', async () => {
    const screen = await render(<MoreMenuScreen />)
    fireEvent.press(screen.getByTestId('more-logout-button'))
    expect(await screen.findByText(t('nav.logout.confirmTitle'))).toBeTruthy()
  })

  it('calls logout and redirects to login on confirm', async () => {
    const screen = await render(<MoreMenuScreen />)
    fireEvent.press(screen.getByTestId('more-logout-button'))
    // Wait for dialog to appear; confirm title is unique text to identify dialog is open
    await screen.findByText(t('nav.logout.confirmTitle'))
    // "Log Out" appears twice (menu button + confirm button); press the last one (dialog)
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
    const screen = await render(<MoreMenuScreen />)
    fireEvent.press(screen.getByTestId('more-logout-button'))
    await screen.findByText(t('nav.logout.confirmTitle'))
    const cancelBtn = await screen.findByText(t('nav.logout.cancel'))
    fireEvent.press(cancelBtn)

    await waitFor(() => {
      expect(logoutMock).not.toHaveBeenCalled()
    })
  })

  it('enabled row (staff management) navigates on press', async () => {
    const screen = await render(<MoreMenuScreen />)
    fireEvent.press(await screen.findByTestId('more-row-staff-management'))
    expect(mockPush).toHaveBeenCalledWith('/(app)/staff')
  })

  it('enabled row (subscription) navigates on press', async () => {
    const screen = await render(<MoreMenuScreen />)
    fireEvent.press(await screen.findByTestId('more-row-subscription'))
    expect(mockPush).toHaveBeenCalledWith('/(app)/subscription')
  })

  it('enabled row (vendor settings) navigates on press', async () => {
    const screen = await render(<MoreMenuScreen />)
    fireEvent.press(await screen.findByTestId('more-row-vendor-settings'))
    expect(mockPush).toHaveBeenCalledWith('/(app)/settings')
  })

  it('enabled row (outstanding) navigates to collections', async () => {
    const screen = await render(<MoreMenuScreen />)
    fireEvent.press(await screen.findByTestId('more-row-outstanding'))
    expect(mockPush).toHaveBeenCalledWith('/(app)/collections')
  })

  it('enabled row (staff activity) navigates to activity', async () => {
    const screen = await render(<MoreMenuScreen />)
    fireEvent.press(await screen.findByTestId('more-row-staff-activity'))
    expect(mockPush).toHaveBeenCalledWith('/(app)/activity')
  })

  it('enabled row (conflict log) navigates to activity/conflicts', async () => {
    const screen = await render(<MoreMenuScreen />)
    fireEvent.press(await screen.findByTestId('more-row-conflict-log'))
    expect(mockPush).toHaveBeenCalledWith('/(app)/activity/conflicts')
  })

  it('enabled row (notifications) navigates to settings/notifications', async () => {
    const screen = await render(<MoreMenuScreen />)
    fireEvent.press(await screen.findByTestId('more-row-notifications'))
    expect(mockPush).toHaveBeenCalledWith('/(app)/settings/notifications')
  })

  it('disabled row (business profile) has disabled accessibility state', async () => {
    const screen = await render(<MoreMenuScreen />)
    const profileRow = await screen.findByTestId('more-row-business-profile')
    expect(profileRow.props.accessibilityState?.disabled).toBe(true)
  })

  it('shows coming-soon captions on disabled rows', async () => {
    const screen = await render(<MoreMenuScreen />)
    const comingSoonItems = await screen.findAllByText(t('nav.comingSoon'))
    expect(comingSoonItems.length).toBeGreaterThan(0)
  })

  it('disabled row (payments) is non-tappable', async () => {
    const screen = await render(<MoreMenuScreen />)
    const paymentsRow = await screen.findByTestId('more-row-payments')
    expect(paymentsRow.props.accessibilityState?.disabled).toBe(true)
    fireEvent.press(paymentsRow)
    expect(mockPush).not.toHaveBeenCalledWith(expect.stringContaining('payment'))
  })
})
