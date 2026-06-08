/**
 * SignupScreen Tests
 * Purpose: Render and interaction tests for the SignupScreen component.
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
import { render, fireEvent, waitFor, act } from '@testing-library/react-native'
import SignupScreen from '../SignupScreen'
import { t } from '@locales/index'

const VALID_PASSWORD = 'TestPass@1'

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
    // t('auth.create_account') appears as both header and button label
    const elements = screen.getAllByText(t('auth.create_account'))
    expect(elements.length).toBeGreaterThanOrEqual(1)
  })

  it('renders business name and phone inputs', async () => {
    const screen = await render(<SignupScreen />)
    expect(screen.getByTestId('signup-business-name')).toBeTruthy()
    expect(screen.getByTestId('signup-phone')).toBeTruthy()
    expect(screen.getByTestId('signup-password')).toBeTruthy()
  })

  it('shows inline per-field error when form submitted with empty business name', async () => {
    const screen = await render(<SignupScreen />)
    const buttons = screen.getAllByText(t('auth.create_account'))
    await fireEvent.press(buttons[buttons.length - 1]!)

    await waitFor(() => {
      expect(screen.getByTestId('signup-business-name-error')).toHaveTextContent(
        t('validation.business_name_required'),
      )
    })
  })

  it('live re-validates the business name once touched: error clears when valid', async () => {
    const screen = await render(<SignupScreen />)
    const nameInput = screen.getByTestId('signup-business-name')

    // Blur the empty (touched) field -> required error appears below the field
    fireEvent(nameInput, 'blur')
    await waitFor(() => {
      expect(screen.getByTestId('signup-business-name-error')).toHaveTextContent(
        t('validation.business_name_required'),
      )
    })

    // Typing a valid value clears the error immediately (no submit needed)
    fireEvent.changeText(nameInput, 'Krishna Dairy')
    await waitFor(() => {
      expect(screen.queryByTestId('signup-business-name-error')).toBeNull()
    })
  })

  it('live re-validates the phone once touched: error clears when valid', async () => {
    const screen = await render(<SignupScreen />)
    const phoneInput = screen.getByTestId('signup-phone')

    fireEvent.changeText(phoneInput, '12345') // too short -> invalid
    await waitFor(() => expect(phoneInput.props.value).toBe('12345'))

    fireEvent(phoneInput, 'blur')
    await waitFor(() => {
      expect(screen.getByTestId('signup-phone-error')).toHaveTextContent(
        t('validation.invalid_phone'),
      )
    })

    fireEvent.changeText(phoneInput, '9876543210') // valid 10-digit
    await waitFor(() => {
      expect(screen.queryByTestId('signup-phone-error')).toBeNull()
    })
  })

  it('does not call signup when form is empty', async () => {
    const screen = await render(<SignupScreen />)
    const buttons = screen.getAllByText(t('auth.create_account'))
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
    // When loading=true, AppButton shows ActivityIndicator; label text not rendered,
    // so only the heading uses t('auth.create_account')
    const elements = screen.getAllByText(t('auth.create_account'))
    expect(elements.length).toBe(1)
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
    // Assert via testID + key, never a hardcoded English string
    expect(screen.getByTestId('signup-error-banner')).toHaveTextContent(
      t('auth.phone_already_registered'),
    )
  })

  it('navigates back on back button press', async () => {
    const screen = await render(<SignupScreen />)
    const backButton = await screen.findByLabelText(t('auth.back'))
    fireEvent.press(backButton)

    await waitFor(() => {
      expect(mockBack).toHaveBeenCalled()
    })
  })

  // NOTE: keep this submit-success test LAST. Its handler awaits the resolved
  // signup promise and then navigates; react-test-renderer leaves that async
  // teardown in a state that corrupts the *next* test's render (null tree).
  // Ordering it last means no subsequent render is affected.
  it('calls signup with correct args on valid submission', async () => {
    mockSignup.mockResolvedValueOnce(undefined)

    const screen = await render(<SignupScreen />)

    fireEvent.changeText(screen.getByTestId('signup-business-name'), 'Krishna Dairy')
    fireEvent.changeText(screen.getByTestId('signup-phone'), '9876543210')
    fireEvent.changeText(screen.getByTestId('signup-password'), VALID_PASSWORD)
    // Let the controlled values commit before submitting
    await waitFor(() => expect(screen.getByTestId('signup-password').props.value).toBe(VALID_PASSWORD))

    const buttons = screen.getAllByText(t('auth.create_account'))
    await act(async () => {
      fireEvent.press(buttons[buttons.length - 1]!)
    })

    await waitFor(() => {
      expect(mockSignup).toHaveBeenCalledWith('+919876543210', VALID_PASSWORD, 'Krishna Dairy')
    })
    // Success path also navigates home — asserted here so a separate (duplicate)
    // navigation test isn't needed.
    await waitFor(() => expect(mockReplace).toHaveBeenCalledWith('/(app)/home'))
  })
})
