/**
 * ResetPasswordScreen Tests
 * Purpose: Render and interaction tests for the ResetPasswordScreen component.
 * All assertions use testID or i18n keys (t()) — never hardcoded English (MAJOR-7).
 */

// Mock native modules before component imports
jest.mock('expo-secure-store', () => ({
  getItemAsync: jest.fn().mockResolvedValue(null),
  setItemAsync: jest.fn().mockResolvedValue(undefined),
  deleteItemAsync: jest.fn().mockResolvedValue(undefined),
}))

jest.mock('@react-native-async-storage/async-storage', () => ({
  getItem: jest.fn().mockResolvedValue(null),
  setItem: jest.fn().mockResolvedValue(undefined),
  removeItem: jest.fn().mockResolvedValue(undefined),
}))

jest.mock('expo-haptics', () => ({
  impactAsync: jest.fn(),
  notificationAsync: jest.fn(),
  ImpactFeedbackStyle: { Light: 'light', Medium: 'medium', Heavy: 'heavy' },
  NotificationFeedbackType: { Success: 'success', Warning: 'warning', Error: 'error' },
}))

// Mock vector-icons so Ionicons doesn't load fonts asynchronously (the async
// font-load setState causes overlapping act() warnings and flaky renders).
jest.mock('@expo/vector-icons', () => ({ Ionicons: 'Ionicons' }))

const mockPush = jest.fn()
const mockBack = jest.fn()
const mockReplace = jest.fn()

jest.mock('expo-router', () => ({
  useRouter: () => ({ push: mockPush, replace: mockReplace, back: mockBack }),
}))

jest.mock('@react-native-community/netinfo', () => ({
  fetch: jest.fn().mockResolvedValue({ isConnected: true }),
  addEventListener: jest.fn().mockReturnValue(jest.fn()),
}))

jest.mock('@hooks/useNetworkStatus', () => ({
  useNetworkStatus: jest.fn().mockReturnValue({ isConnected: true, isChecking: false }),
}))

jest.mock('@services/config', () => ({
  isMockMode: true,
  API_MODE: 'mock',
  API_CONFIG: { baseUrl: 'http://localhost:3000/api', timeout: 30000, mockDelay: 0 },
  simulateNetworkDelay: jest.fn().mockResolvedValue(undefined),
}))

// Mock auth store
const mockResetPassword = jest.fn()
const mockClearError = jest.fn()

jest.mock('@modules/auth/store/auth.store', () => ({
  useAuthStore: jest.fn((selector: (s: unknown) => unknown) =>
    selector({
      resetPassword: mockResetPassword,
      isLoading: false,
      error: null,
      clearError: mockClearError,
      pendingResetPhone: '+919876543210',
    }),
  ),
}))

import React from 'react'
import { render, fireEvent, waitFor, act } from '@testing-library/react-native'
import ResetPasswordScreen from '../ResetPasswordScreen'
import { t } from '@locales/index'

const VALID_PASSWORD = 'TestPass@1'

describe('ResetPasswordScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    const { useAuthStore } = jest.requireMock('@modules/auth/store/auth.store') as { useAuthStore: jest.Mock }
    useAuthStore.mockImplementation((selector: (s: unknown) => unknown) =>
      selector({
        resetPassword: mockResetPassword,
        isLoading: false,
        error: null,
        clearError: mockClearError,
        pendingResetPhone: '+919876543210',
      }),
    )
  })

  it('renders without crashing', async () => {
    const screen = await render(<ResetPasswordScreen />)
    // t('auth.reset_password') appears as both the heading and the button label
    const elements = screen.getAllByText(t('auth.reset_password'))
    expect(elements.length).toBeGreaterThanOrEqual(1)
  })

  it('renders OTP and password inputs', async () => {
    const screen = await render(<ResetPasswordScreen />)
    expect(screen.getByTestId('reset-otp')).toBeTruthy()
    expect(screen.getByTestId('reset-password')).toBeTruthy()
  })

  it('shows inline per-field OTP error when form submitted with empty OTP', async () => {
    const screen = await render(<ResetPasswordScreen />)
    const buttons = screen.getAllByText(t('auth.reset_password'))
    await fireEvent.press(buttons[buttons.length - 1]!)

    await waitFor(() => {
      expect(screen.getByTestId('reset-otp-error')).toHaveTextContent(t('validation.required'))
    })
  })

  it('live re-validates the OTP once touched: error clears when valid', async () => {
    const screen = await render(<ResetPasswordScreen />)
    const otpInput = screen.getByTestId('reset-otp')

    fireEvent.changeText(otpInput, '123') // too short -> invalid
    await waitFor(() => expect(otpInput.props.value).toBe('123'))

    fireEvent(otpInput, 'blur')
    await waitFor(() => {
      expect(screen.getByTestId('reset-otp-error')).toHaveTextContent(t('validation.otp_invalid'))
    })

    fireEvent.changeText(otpInput, '123456') // valid
    await waitFor(() => {
      expect(screen.queryByTestId('reset-otp-error')).toBeNull()
    })
  })

  it('live re-validates the password once touched: error clears when valid', async () => {
    const screen = await render(<ResetPasswordScreen />)
    const pwInput = screen.getByTestId('reset-password')

    fireEvent.changeText(pwInput, 'short') // too short -> invalid once touched
    // Await the controlled value commit so the touched re-render flushes before blur.
    await waitFor(() => expect(pwInput.props.value).toBe('short'))

    fireEvent(pwInput, 'blur')
    await waitFor(() => {
      expect(screen.getByTestId('reset-password-error')).toHaveTextContent(
        t('validation.password_min_8'),
      )
    })

    fireEvent.changeText(pwInput, VALID_PASSWORD) // valid

    // AppInput always renders the `${testID}-error` node when helperText is set,
    // so assert the validation message itself is absent from the tree rather than
    // that the (always-present) error element lacks it.
    await waitFor(() => {
      expect(screen.queryByText(t('validation.password_min_8'))).toBeNull()
    })
  })

  it('does not call resetPassword when form is empty', async () => {
    const screen = await render(<ResetPasswordScreen />)
    const buttons = screen.getAllByText(t('auth.reset_password'))
    await fireEvent.press(buttons[buttons.length - 1]!)

    await waitFor(() => {
      expect(mockResetPassword).not.toHaveBeenCalled()
    })
  })

  it('shows loading spinner while request is in flight', async () => {
    const { useAuthStore } = jest.requireMock('@modules/auth/store/auth.store') as { useAuthStore: jest.Mock }
    useAuthStore.mockImplementation((selector: (s: unknown) => unknown) =>
      selector({
        resetPassword: mockResetPassword,
        isLoading: true,
        error: null,
        clearError: mockClearError,
        pendingResetPhone: '+919876543210',
      }),
    )

    const screen = await render(<ResetPasswordScreen />)
    // When loading=true, AppButton shows ActivityIndicator; only the heading remains
    const elements = screen.getAllByText(t('auth.reset_password'))
    expect(elements.length).toBe(1)
  })

  it('shows error banner when store returns an error', async () => {
    const { useAuthStore } = jest.requireMock('@modules/auth/store/auth.store') as { useAuthStore: jest.Mock }
    useAuthStore.mockImplementation((selector: (s: unknown) => unknown) =>
      selector({
        resetPassword: mockResetPassword,
        isLoading: false,
        error: 'auth.otp_expired',
        clearError: mockClearError,
        pendingResetPhone: '+919876543210',
      }),
    )

    const screen = await render(<ResetPasswordScreen />)
    // Assert via testID + key, never a hardcoded English string
    expect(screen.getByTestId('reset-error-banner')).toHaveTextContent(t('auth.otp_expired'))
  })

  it('navigates back on back button press', async () => {
    const screen = await render(<ResetPasswordScreen />)
    const backButton = await screen.findByLabelText(t('auth.back'))
    fireEvent.press(backButton)

    await waitFor(() => {
      expect(mockBack).toHaveBeenCalled()
    })
  })

  // NOTE: keep this submit-success test LAST. Its handler awaits the resolved
  // resetPassword promise and then navigates; react-test-renderer leaves that
  // async teardown in a state that corrupts the *next* test's render (null tree).
  // Ordering it last means no subsequent render is affected.
  it('calls resetPassword with correct args on valid submission', async () => {
    mockResetPassword.mockResolvedValueOnce(undefined)

    const screen = await render(<ResetPasswordScreen />)

    fireEvent.changeText(screen.getByTestId('reset-otp'), '123456')
    fireEvent.changeText(screen.getByTestId('reset-password'), VALID_PASSWORD)
    // Let the controlled values commit before submitting
    await waitFor(() => expect(screen.getByTestId('reset-password').props.value).toBe(VALID_PASSWORD))

    const buttons = screen.getAllByText(t('auth.reset_password'))
    await act(async () => {
      fireEvent.press(buttons[buttons.length - 1]!)
    })

    // Success path also navigates to login — asserted here so a separate
    // (duplicate) navigation test isn't needed.
    await waitFor(() => {
      expect(mockResetPassword).toHaveBeenCalledWith('123456', VALID_PASSWORD)
    })
    await waitFor(() => expect(mockReplace).toHaveBeenCalledWith('/(auth)/login'))
  })
})
