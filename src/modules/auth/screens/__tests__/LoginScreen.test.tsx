/**
 * LoginScreen Tests
 * Purpose: Render and interaction tests for the LoginScreen component
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
    expect(screen.getByText('PayCycle Vendor')).toBeTruthy()
  })

  it('renders sign-in button', async () => {
    const screen = await render(<LoginScreen />)
    expect(screen.getByText('Sign In')).toBeTruthy()
  })

  it('renders forgot password link', async () => {
    const screen = await render(<LoginScreen />)
    expect(screen.getByText('Forgot Password?')).toBeTruthy()
  })

  it('renders sign up link', async () => {
    const screen = await render(<LoginScreen />)
    expect(screen.getByText('Sign Up')).toBeTruthy()
  })

  it('shows validation error when phone is empty and sign-in tapped', async () => {
    const screen = await render(<LoginScreen />)
    fireEvent.press(screen.getByText('Sign In'))

    await waitFor(() => {
      expect(screen.getByText('Invalid phone number')).toBeTruthy()
    })
  })

  it('shows error banner when store has an error', async () => {
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
    // In test env, t() returns the key itself, so we look for the key
    expect(screen.getByText('auth.invalid_credentials')).toBeTruthy()
  })

  it('does not call login when form fields are empty', async () => {
    const screen = await render(<LoginScreen />)
    fireEvent.press(screen.getByText('Sign In'))

    await waitFor(() => {
      expect(mockLogin).not.toHaveBeenCalled()
    })
  })
})
