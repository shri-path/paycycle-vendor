/**
 * ForgotPasswordScreen Tests
 * Purpose: Render and interaction tests for the ForgotPasswordScreen component
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
const mockForgotPassword = jest.fn()
const mockClearError = jest.fn()

jest.mock('@modules/auth/store/auth.store', () => ({
  useAuthStore: jest.fn((selector: (s: unknown) => unknown) =>
    selector({
      forgotPassword: mockForgotPassword,
      isLoading: false,
      error: null,
      clearError: mockClearError,
    }),
  ),
}))

import React from 'react'
import { render, fireEvent, waitFor } from '@testing-library/react-native'
import ForgotPasswordScreen from '../ForgotPasswordScreen'

describe('ForgotPasswordScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    const { useAuthStore } = jest.requireMock('@modules/auth/store/auth.store') as { useAuthStore: jest.Mock }
    useAuthStore.mockImplementation((selector: (s: unknown) => unknown) =>
      selector({
        forgotPassword: mockForgotPassword,
        isLoading: false,
        error: null,
        clearError: mockClearError,
      }),
    )
  })

  it('renders without crashing', async () => {
    const screen = await render(<ForgotPasswordScreen />)
    expect(screen.getByText('Forgot Password?')).toBeTruthy()
  })

  it('renders send OTP button', async () => {
    const screen = await render(<ForgotPasswordScreen />)
    expect(screen.getByText('Send OTP')).toBeTruthy()
  })

  it('renders description text', async () => {
    const screen = await render(<ForgotPasswordScreen />)
    expect(screen.getByText('Enter your phone number to receive an OTP.')).toBeTruthy()
  })

  it('shows validation error when form submitted with empty phone', async () => {
    const screen = await render(<ForgotPasswordScreen />)
    await fireEvent.press(screen.getByText('Send OTP'))

    await waitFor(() => {
      expect(screen.getByText('Invalid phone number')).toBeTruthy()
    })
  })

  it('does not call forgotPassword when phone is empty', async () => {
    const screen = await render(<ForgotPasswordScreen />)
    await fireEvent.press(screen.getByText('Send OTP'))

    await waitFor(() => {
      expect(mockForgotPassword).not.toHaveBeenCalled()
    })
  })

  it('shows loading spinner while request is in flight', async () => {
    const { useAuthStore } = jest.requireMock('@modules/auth/store/auth.store') as { useAuthStore: jest.Mock }
    useAuthStore.mockImplementation((selector: (s: unknown) => unknown) =>
      selector({
        forgotPassword: mockForgotPassword,
        isLoading: true,
        error: null,
        clearError: mockClearError,
      }),
    )

    const screen = await render(<ForgotPasswordScreen />)
    // When loading=true, AppButton shows ActivityIndicator instead of label text
    // Verify the screen still renders without crashing
    expect(screen.getByText('Forgot Password?')).toBeTruthy()
    // The button label text is NOT rendered during loading (replaced by spinner)
    expect(screen.queryByText('Send OTP')).toBeNull()
  })

  it('shows error banner when store returns an error', async () => {
    const { useAuthStore } = jest.requireMock('@modules/auth/store/auth.store') as { useAuthStore: jest.Mock }
    useAuthStore.mockImplementation((selector: (s: unknown) => unknown) =>
      selector({
        forgotPassword: mockForgotPassword,
        isLoading: false,
        error: 'auth.invalid_credentials',
        clearError: mockClearError,
      }),
    )

    const screen = await render(<ForgotPasswordScreen />)
    // t() resolves the key to the English string from en.json
    expect(screen.getByText('Invalid phone number or password')).toBeTruthy()
  })

  it('calls forgotPassword with correct phone on valid submission', async () => {
    mockForgotPassword.mockResolvedValueOnce(undefined)

    const screen = await render(<ForgotPasswordScreen />)

    // AppPhoneInput renders a TextInput with placeholder "Phone number"
    const phoneInput = screen.getByPlaceholderText('Phone number')
    await fireEvent.changeText(phoneInput, '9876543210')

    await fireEvent.press(screen.getByText('Send OTP'))

    await waitFor(() => {
      expect(mockForgotPassword).toHaveBeenCalledWith('+919876543210')
    })
  })

  it('navigates to reset-password screen on success', async () => {
    mockForgotPassword.mockResolvedValueOnce(undefined)

    const screen = await render(<ForgotPasswordScreen />)

    const phoneInput = screen.getByPlaceholderText('Phone number')
    await fireEvent.changeText(phoneInput, '9876543210')
    await fireEvent.press(screen.getByText('Send OTP'))

    await waitFor(() => {
      expect(mockPush).toHaveBeenCalledWith('/(auth)/reset-password')
    })
  })

  it('navigates back on back button press', async () => {
    const screen = await render(<ForgotPasswordScreen />)
    // Use findByLabelText — async variant waits for accessibilityLabel to be set
    const backButton = await screen.findByLabelText('Go back')
    fireEvent.press(backButton)

    await waitFor(() => {
      expect(mockBack).toHaveBeenCalled()
    })
  })
})
