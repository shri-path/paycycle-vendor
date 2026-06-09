/**
 * StaffJoinScreen tests (US-002, WS-3).
 * Covers: invite summary from URL query params (OQ-1), successful accept →
 * role-router redirect, already-logged-in sign-out-first prompt (OQ-2), the
 * invalid/missing-token error state, and offline (submit disabled).
 *
 * Assertions use i18n keys + testIDs (locale-independent).
 */

jest.mock('expo-haptics', () => ({
  impactAsync: jest.fn(),
  notificationAsync: jest.fn(),
  ImpactFeedbackStyle: { Light: 'light', Medium: 'medium', Heavy: 'heavy' },
  NotificationFeedbackType: { Success: 'success', Warning: 'warning', Error: 'error' },
}))

const mockReplace = jest.fn()
let mockParams: Record<string, string | undefined> = {}
jest.mock('expo-router', () => ({
  useRouter: () => ({ push: jest.fn(), replace: mockReplace, back: jest.fn() }),
  useLocalSearchParams: () => mockParams,
}))

jest.mock('@hooks/useNetworkStatus', () => ({
  useNetworkStatus: jest.fn().mockReturnValue({ isConnected: true, isChecking: false }),
}))

jest.mock('@modules/auth/store/auth.store', () => ({
  useAuthStore: jest.fn(),
}))

import React from 'react'
import { render, fireEvent, waitFor } from '@testing-library/react-native'
import StaffJoinScreen from '../StaffJoinScreen'
import { t } from '@locales/index'
import { useNetworkStatus } from '@hooks/useNetworkStatus'
import { useAuthStore } from '@modules/auth/store/auth.store'

const useAuthStoreMock = useAuthStore as unknown as jest.Mock
const useNetworkStatusMock = useNetworkStatus as jest.Mock

const acceptInvite = jest.fn().mockResolvedValue(undefined)
const logout = jest.fn().mockResolvedValue(undefined)
const clearError = jest.fn()

function mockAuth(state: Record<string, unknown>) {
  useAuthStoreMock.mockImplementation((selector: (s: unknown) => unknown) =>
    selector({
      acceptInvite,
      logout,
      clearError,
      isLoading: false,
      error: null,
      isAuthenticated: false,
      user: null,
      isHydrated: true,
      ...state,
    }),
  )
}

describe('StaffJoinScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockParams = { token: 'tok-123', vendor: 'Sharma Dairy', lists: 'Morning Milk,Evening Bread' }
    useNetworkStatusMock.mockReturnValue({ isConnected: true, isChecking: false })
    mockAuth({})
  })

  it('renders the invite summary from the URL query params (OQ-1)', async () => {
    const screen = await render(<StaffJoinScreen />)
    expect(screen.getByTestId('join-summary-card')).toBeTruthy()
    expect(screen.getByText(t('roles.join_title', { vendor: 'Sharma Dairy' }))).toBeTruthy()
    expect(screen.getByText('• Morning Milk')).toBeTruthy()
    expect(screen.getByText('• Evening Bread')).toBeTruthy()
  })

  it('accepts the invite and redirects to the role router on success', async () => {
    const screen = await render(<StaffJoinScreen />)
    const pwd = screen.getByTestId('join-password')
    fireEvent.changeText(pwd, 'Supersecret1!')
    // Wait for the controlled value to commit before pressing (the submit handler
    // reads `password` from its closure at press time).
    await waitFor(() => expect(pwd.props.value).toBe('Supersecret1!'))
    fireEvent.press(screen.getByText(t('roles.join_as_staff')))
    await waitFor(() => {
      expect(acceptInvite).toHaveBeenCalledWith('tok-123', 'Supersecret1!', undefined)
      expect(mockReplace).toHaveBeenCalledWith('/(app)')
    })
  })

  it('does not submit when the password fails validation', async () => {
    const screen = await render(<StaffJoinScreen />)
    const pwd = screen.getByTestId('join-password')
    fireEvent.changeText(pwd, 'short')
    await waitFor(() => expect(pwd.props.value).toBe('short'))
    fireEvent.press(screen.getByText(t('roles.join_as_staff')))
    await waitFor(() =>
      expect(screen.getByTestId('join-password-error')).toHaveTextContent(
        t('validation.password_min_8'),
      ),
    )
    expect(acceptInvite).not.toHaveBeenCalled()
  })

  it('shows the sign-out-first prompt when a session already exists (OQ-2)', async () => {
    mockAuth({ isAuthenticated: true, user: { phone: '+91 90000 11111' } })
    const screen = await render(<StaffJoinScreen />)
    expect(screen.getByTestId('join-sign-out-continue')).toBeTruthy()
    expect(screen.queryByTestId('join-submit')).toBeNull()
    fireEvent.press(screen.getByText(t('roles.join_sign_out_continue')))
    await waitFor(() => expect(logout).toHaveBeenCalled())
    // Joining is NOT attempted while logged in — explicit sign-out only.
    expect(acceptInvite).not.toHaveBeenCalled()
  })

  it('shows the invalid-token error state when the token is missing', async () => {
    mockParams = { vendor: 'Sharma Dairy' }
    const screen = await render(<StaffJoinScreen />)
    expect(screen.getByText(t('roles.error_invite_invalid'))).toBeTruthy()
    expect(screen.queryByTestId('join-submit')).toBeNull()
  })

  it('surfaces a mapped invite error from the store', async () => {
    mockAuth({ error: 'roles.error_invite_expired' })
    const screen = await render(<StaffJoinScreen />)
    expect(screen.getByTestId('join-error-banner')).toBeTruthy()
    expect(screen.getByText(t('roles.error_invite_expired'))).toBeTruthy()
  })

  it('disables submit and shows the offline banner when offline', async () => {
    useNetworkStatusMock.mockReturnValue({ isConnected: false, isChecking: false })
    const screen = await render(<StaffJoinScreen />)
    expect(screen.getByText(t('common.offline'))).toBeTruthy()
    const pwd = screen.getByTestId('join-password')
    fireEvent.changeText(pwd, 'Supersecret1!')
    await waitFor(() => expect(pwd.props.value).toBe('Supersecret1!'))
    // The submit button is disabled offline, so pressing its label is a no-op.
    fireEvent.press(screen.getByText(t('roles.join_as_staff')))
    expect(acceptInvite).not.toHaveBeenCalled()
  })
})
