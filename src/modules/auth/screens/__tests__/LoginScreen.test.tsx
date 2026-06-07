/**
 * LoginScreen Tests
 * Purpose: Render and interaction tests for the LoginScreen component
 *
 * Assertions use i18n keys via t(...) and testIDs only — never hardcoded
 * English strings (MAJOR-7), so tests stay locale-independent.
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

jest.mock('expo-router', () => ({
  useRouter: () => ({ push: jest.fn(), replace: jest.fn(), back: jest.fn() }),
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
const mockLogin = jest.fn()
const mockClearError = jest.fn()

jest.mock('@modules/auth/store/auth.store', () => ({
  useAuthStore: jest.fn((selector: (s: unknown) => unknown) =>
    selector({
      login: mockLogin,
      isLoading: false,
      error: null,
      clearError: mockClearError,
    }),
  ),
}))

import React from 'react'
import { render, fireEvent, waitFor } from '@testing-library/react-native'
import LoginScreen from '../LoginScreen'
import { t } from '@locales/index'

describe('LoginScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    // Reset mock to default state
    const { useAuthStore } = jest.requireMock('@modules/auth/store/auth.store') as { useAuthStore: jest.Mock }
    useAuthStore.mockImplementation((selector: (s: unknown) => unknown) =>
      selector({
        login: mockLogin,
        isLoading: false,
        error: null,
        clearError: mockClearError,
      }),
    )
  })

  it('renders without crashing', async () => {
    const screen = await render(<LoginScreen />)
    expect(screen.getByText(t('common.app_name'))).toBeTruthy()
  })

  it('renders sign-in button', async () => {
    const screen = await render(<LoginScreen />)
    expect(screen.getByText(t('auth.sign_in'))).toBeTruthy()
  })

  it('renders forgot password link', async () => {
    const screen = await render(<LoginScreen />)
    expect(screen.getByText(t('auth.forgot_password'))).toBeTruthy()
  })

  it('renders sign up link', async () => {
    const screen = await render(<LoginScreen />)
    expect(screen.getByText(t('auth.sign_up'))).toBeTruthy()
  })

  it('shows inline per-field validation error when phone is empty and sign-in tapped', async () => {
    const screen = await render(<LoginScreen />)
    fireEvent.press(screen.getByText(t('auth.sign_in')))

    await waitFor(() => {
      // Error renders below the phone field via its own testID (not a shared banner).
      // An empty phone fails the required check.
      expect(screen.getByTestId('login-phone-error')).toHaveTextContent(
        t('validation.required'),
      )
    })
  })

  it('shows the store error in a banner (not as a field error)', async () => {
    const { useAuthStore } = jest.requireMock('@modules/auth/store/auth.store') as { useAuthStore: jest.Mock }
    useAuthStore.mockImplementation((selector: (s: unknown) => unknown) =>
      selector({
        login: mockLogin,
        isLoading: false,
        error: 'auth.invalid_credentials',
        clearError: mockClearError,
      }),
    )

    const screen = await render(<LoginScreen />)
    // Assert via testID + key, never a hardcoded English string
    expect(screen.getByTestId('login-error-banner')).toHaveTextContent(t('auth.invalid_credentials'))
  })

  it('does not call login when form fields are empty', async () => {
    const screen = await render(<LoginScreen />)
    fireEvent.press(screen.getByText(t('auth.sign_in')))

    await waitFor(() => {
      expect(mockLogin).not.toHaveBeenCalled()
    })
  })

  it('live re-validates the phone field once touched: error clears when valid', async () => {
    const screen = await render(<LoginScreen />)
    const phoneInput = screen.getByTestId('login-phone')

    // Type an invalid (too-short) value and let the controlled value commit
    fireEvent.changeText(phoneInput, '12345')
    await waitFor(() => expect(phoneInput.props.value).toBe('12345'))

    // Blur the touched, invalid field -> error appears below the field
    fireEvent(phoneInput, 'blur')
    await waitFor(() => {
      expect(screen.getByTestId('login-phone-error')).toHaveTextContent(t('validation.invalid_phone'))
    })

    // Typing a valid value must clear the error immediately (no submit needed)
    fireEvent.changeText(phoneInput, '9876543210')
    await waitFor(() => {
      expect(screen.queryByTestId('login-phone-error')).toBeNull()
    })
  })

  it('live re-validates the password field once touched: error clears when valid', async () => {
    const screen = await render(<LoginScreen />)
    const passwordInput = screen.getByTestId('login-password')

    // Blur an empty (touched) password -> required error appears below the field
    fireEvent(passwordInput, 'blur')

    await waitFor(() => {
      expect(screen.getByTestId('login-password-error')).toHaveTextContent(
        t('validation.password_required'),
      )
    })

    // Typing any value clears the error immediately (login only requires presence)
    fireEvent.changeText(passwordInput, 'secret123')

    await waitFor(() => {
      expect(screen.queryByTestId('login-password-error')).toBeNull()
    })
  })
})
