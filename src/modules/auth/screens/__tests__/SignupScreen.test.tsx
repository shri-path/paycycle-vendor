/**
 * SignupScreen Tests
 * Purpose: Render and interaction tests for the SignupScreen component
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
const mockSignup = jest.fn()
const mockClearError = jest.fn()

jest.mock('@modules/auth/store/auth.store', () => ({
  useAuthStore: jest.fn((selector: (s: unknown) => unknown) =>
    selector({
      signup: mockSignup,
      isLoading: false,
      error: null,
      clearError: mockClearError,
    }),
  ),
}))

import React from 'react'
import { render, fireEvent, waitFor } from '@testing-library/react-native'
import SignupScreen from '../SignupScreen'

describe('SignupScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    const { useAuthStore } = jest.requireMock('@modules/auth/store/auth.store') as { useAuthStore: jest.Mock }
    useAuthStore.mockImplementation((selector: (s: unknown) => unknown) =>
      selector({
        signup: mockSignup,
        isLoading: false,
        error: null,
        clearError: mockClearError,
      }),
    )
  })

  it('renders without crashing', async () => {
    const screen = await render(<SignupScreen />)
    // "Create Account" appears as both header and button
    const elements = screen.getAllByText('Create Account')
    expect(elements.length).toBeGreaterThanOrEqual(1)
  })

  it('renders business name input', async () => {
    const screen = await render(<SignupScreen />)
    expect(screen.getByText('Business Name')).toBeTruthy()
  })

  it('renders phone number input', async () => {
    const screen = await render(<SignupScreen />)
    expect(screen.getByText('Phone Number')).toBeTruthy()
  })

  it('shows validation error when form submitted with empty business name', async () => {
    const screen = await render(<SignupScreen />)
    // Press the submit button (last "Create Account" element)
    const buttons = screen.getAllByText('Create Account')
    await fireEvent.press(buttons[buttons.length - 1]!)

    await waitFor(() => {
      expect(screen.getByText('Business name is required')).toBeTruthy()
    })
  })

  it('does not call signup when form is empty', async () => {
    const screen = await render(<SignupScreen />)
    const buttons = screen.getAllByText('Create Account')
    await fireEvent.press(buttons[buttons.length - 1]!)

    await waitFor(() => {
      expect(mockSignup).not.toHaveBeenCalled()
    })
  })

  it('shows loading spinner while signup is in flight', async () => {
    const { useAuthStore } = jest.requireMock('@modules/auth/store/auth.store') as { useAuthStore: jest.Mock }
    useAuthStore.mockImplementation((selector: (s: unknown) => unknown) =>
      selector({
        signup: mockSignup,
        isLoading: true,
        error: null,
        clearError: mockClearError,
      }),
    )

    const screen = await render(<SignupScreen />)
    // When loading=true, AppButton shows ActivityIndicator; label text not rendered
    // The heading "Create Account" should still be present
    expect(screen.getByText('Create Account')).toBeTruthy()
    // Submit button label is replaced by spinner — only one "Create Account" now
    const elements = screen.getAllByText('Create Account')
    expect(elements.length).toBe(1) // only the heading, not the button
  })

  it('shows error banner when store returns an error', async () => {
    const { useAuthStore } = jest.requireMock('@modules/auth/store/auth.store') as { useAuthStore: jest.Mock }
    useAuthStore.mockImplementation((selector: (s: unknown) => unknown) =>
      selector({
        signup: mockSignup,
        isLoading: false,
        error: 'auth.phone_already_registered',
        clearError: mockClearError,
      }),
    )

    const screen = await render(<SignupScreen />)
    // t() resolves to English string from en.json
    expect(screen.getByText('Phone number already registered')).toBeTruthy()
  })

  it('calls signup with correct args on valid submission', async () => {
    mockSignup.mockResolvedValueOnce(undefined)

    const screen = await render(<SignupScreen />)

    // Fill in business name
    const businessNameInput = screen.getByPlaceholderText('e.g. Krishna Dairy')
    await fireEvent.changeText(businessNameInput, 'Krishna Dairy')

    // Fill in phone number via AppPhoneInput (placeholder: "Phone number")
    const phoneInput = screen.getByPlaceholderText('Phone number')
    await fireEvent.changeText(phoneInput, '9876543210')

    // Fill in password
    const passwordInput = screen.getByPlaceholderText('••••••••')
    await fireEvent.changeText(passwordInput, 'TestPass@1')

    const buttons = screen.getAllByText('Create Account')
    await fireEvent.press(buttons[buttons.length - 1]!)

    await waitFor(() => {
      expect(mockSignup).toHaveBeenCalledWith('+919876543210', 'TestPass@1', 'Krishna Dairy')
    })
  })

  it('navigates to home on successful signup', async () => {
    mockSignup.mockResolvedValueOnce(undefined)

    const screen = await render(<SignupScreen />)

    const businessNameInput = screen.getByPlaceholderText('e.g. Krishna Dairy')
    await fireEvent.changeText(businessNameInput, 'Krishna Dairy')

    const phoneInput = screen.getByPlaceholderText('Phone number')
    await fireEvent.changeText(phoneInput, '9876543210')

    const passwordInput = screen.getByPlaceholderText('••••••••')
    await fireEvent.changeText(passwordInput, 'TestPass@1')

    const buttons = screen.getAllByText('Create Account')
    await fireEvent.press(buttons[buttons.length - 1]!)

    await waitFor(() => {
      expect(mockReplace).toHaveBeenCalledWith('/(app)/home')
    })
  })

  it('navigates back on back button press', async () => {
    const screen = await render(<SignupScreen />)
    // Use getByLabelText — matches accessibilityLabel prop
    const backButton = await screen.findByLabelText('Go back')
    fireEvent.press(backButton)

    await waitFor(() => {
      expect(mockBack).toHaveBeenCalled()
    })
  })
})
