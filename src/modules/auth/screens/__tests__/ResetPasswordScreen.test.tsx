/**
 * ResetPasswordScreen Tests
 * Purpose: Render and interaction tests for the ResetPasswordScreen component
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
import { render, fireEvent, waitFor } from '@testing-library/react-native'
import ResetPasswordScreen from '../ResetPasswordScreen'

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
    // "Reset Password" appears as both the heading and the button
    const elements = screen.getAllByText('Reset Password')
    expect(elements.length).toBeGreaterThanOrEqual(1)
  })

  it('renders OTP and password inputs', async () => {
    const screen = await render(<ResetPasswordScreen />)
    expect(screen.getByText('OTP Code')).toBeTruthy()
    expect(screen.getByText('New Password')).toBeTruthy()
  })

  it('shows OTP validation error when form submitted with empty OTP', async () => {
    const screen = await render(<ResetPasswordScreen />)
    const buttons = screen.getAllByText('Reset Password')
    await fireEvent.press(buttons[buttons.length - 1]!)

    await waitFor(() => {
      expect(screen.getByText('Enter a valid 6-digit OTP')).toBeTruthy()
    })
  })

  it('does not call resetPassword when form is empty', async () => {
    const screen = await render(<ResetPasswordScreen />)
    const buttons = screen.getAllByText('Reset Password')
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
    // When loading=true, AppButton shows ActivityIndicator; "Reset Password" text only in heading
    const elements = screen.getAllByText('Reset Password')
    expect(elements.length).toBe(1) // only the heading, not the button
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
    // t() resolves the key to the English string from en.json
    expect(screen.getByText('OTP has expired. Please request a new one.')).toBeTruthy()
  })

  it('calls resetPassword with correct args on valid submission', async () => {
    mockResetPassword.mockResolvedValueOnce(undefined)

    const screen = await render(<ResetPasswordScreen />)

    // Fill in OTP
    const otpInput = screen.getByPlaceholderText('Enter 6-digit OTP')
    await fireEvent.changeText(otpInput, '123456')

    // Fill in password
    const passwordInput = screen.getByPlaceholderText('••••••••')
    await fireEvent.changeText(passwordInput, 'TestPass@1')

    const buttons = screen.getAllByText('Reset Password')
    await fireEvent.press(buttons[buttons.length - 1]!)

    await waitFor(() => {
      expect(mockResetPassword).toHaveBeenCalledWith('123456', 'TestPass@1')
    })
  })

  it('navigates to login on successful reset', async () => {
    mockResetPassword.mockResolvedValueOnce(undefined)

    const screen = await render(<ResetPasswordScreen />)

    const otpInput = screen.getByPlaceholderText('Enter 6-digit OTP')
    await fireEvent.changeText(otpInput, '123456')

    const passwordInput = screen.getByPlaceholderText('••••••••')
    await fireEvent.changeText(passwordInput, 'TestPass@1')

    const buttons = screen.getAllByText('Reset Password')
    await fireEvent.press(buttons[buttons.length - 1]!)

    await waitFor(() => {
      expect(mockReplace).toHaveBeenCalledWith('/(auth)/login')
    })
  })

  it('navigates back on back button press', async () => {
    const screen = await render(<ResetPasswordScreen />)
    // Use findByLabelText — async variant waits for accessibilityLabel to be set
    const backButton = await screen.findByLabelText('Go back')
    fireEvent.press(backButton)

    await waitFor(() => {
      expect(mockBack).toHaveBeenCalled()
    })
  })
})
