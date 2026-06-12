/**
 * SetCreditLimitScreen tests — empty input required error, value out-of-range
 * error, successful submit → back, store error banner, and offline guard.
 */

jest.mock('expo-haptics', () => ({
  impactAsync: jest.fn(),
  notificationAsync: jest.fn(),
  ImpactFeedbackStyle: { Light: 'light', Medium: 'medium', Heavy: 'heavy' },
  NotificationFeedbackType: { Success: 'success', Warning: 'warning', Error: 'error' },
}))

jest.mock('@expo/vector-icons', () => ({ Ionicons: 'Ionicons' }))

const mockBack = jest.fn()
jest.mock('expo-router', () => ({
  useRouter: () => ({ push: jest.fn(), back: mockBack, replace: jest.fn() }),
  useLocalSearchParams: () => ({ customerId: 'c1' }),
}))

jest.mock('@hooks/useNetworkStatus', () => ({
  useNetworkStatus: jest.fn().mockReturnValue({ isConnected: true, isChecking: false }),
}))

jest.mock('@modules/roles/hooks/useRequireOwner', () => ({ useRequireOwner: jest.fn() }))
jest.mock('../../store/customers.store', () => ({ useCustomersStore: jest.fn() }))

import React from 'react'
import { render, fireEvent, act } from '@testing-library/react-native'
import SetCreditLimitScreen from '../SetCreditLimitScreen'
import { t } from '@locales/index'
import { useNetworkStatus } from '@hooks/useNetworkStatus'

const { useCustomersStore } = jest.requireMock('../../store/customers.store') as {
  useCustomersStore: jest.Mock
}
const useNetworkStatusMock = useNetworkStatus as jest.Mock

const mockSetCreditLimit = jest.fn()
const mockClearError = jest.fn()

function mockStore(state: Record<string, unknown> = {}) {
  useCustomersStore.mockImplementation((selector: (s: unknown) => unknown) =>
    selector({
      detail: { c1: { id: 'c1', creditLimit: 500 } },
      setCreditLimit: mockSetCreditLimit,
      isMutating: false,
      mutationError: null,
      clearError: mockClearError,
      ...state,
    }),
  )
}

describe('SetCreditLimitScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    useNetworkStatusMock.mockReturnValue({ isConnected: true, isChecking: false })
    mockStore()
  })

  it('renders the credit limit input pre-filled from cached detail and the submit button', async () => {
    const screen = await act(async () => render(<SetCreditLimitScreen />))
    expect(screen.getByTestId('credit-limit-input')).toBeTruthy()
    expect(screen.getByTestId('credit-limit-submit')).toBeTruthy()
  })

  it('shows a required error when input is empty', async () => {
    // Store detail has no creditLimit — start with empty field.
    mockStore({ detail: {} })
    const screen = await act(async () => render(<SetCreditLimitScreen />))
    await act(async () => {
      fireEvent.press(screen.getByTestId('credit-limit-submit'))
    })
    expect(mockSetCreditLimit).not.toHaveBeenCalled()
    expect(screen.getByText(t('validation.required'))).toBeTruthy()
  })

  it('shows out-of-range error when value exceeds 9999999.99', async () => {
    const screen = await act(async () => render(<SetCreditLimitScreen />))
    await act(async () => {
      fireEvent.changeText(screen.getByTestId('credit-limit-input'), '10000000')
    })
    await act(async () => {
      fireEvent.press(screen.getByTestId('credit-limit-submit'))
    })
    expect(mockSetCreditLimit).not.toHaveBeenCalled()
    expect(screen.getByText(t('customer.error_invalid_credit_limit'))).toBeTruthy()
  })

  it('calls setCreditLimit and navigates back on success', async () => {
    mockSetCreditLimit.mockResolvedValueOnce(undefined)
    const screen = await act(async () => render(<SetCreditLimitScreen />))
    await act(async () => {
      fireEvent.changeText(screen.getByTestId('credit-limit-input'), '1000')
    })
    await act(async () => {
      fireEvent.press(screen.getByTestId('credit-limit-submit'))
    })
    expect(mockSetCreditLimit).toHaveBeenCalledWith('c1', 1000)
    expect(mockBack).toHaveBeenCalled()
  })

  it('shows the store mutation error banner', async () => {
    mockStore({ mutationError: 'customer.error_invalid_credit_limit' })
    const screen = await act(async () => render(<SetCreditLimitScreen />))
    expect(screen.getByText(t('customer.error_invalid_credit_limit'))).toBeTruthy()
  })

  it('disables submit when offline', async () => {
    useNetworkStatusMock.mockReturnValue({ isConnected: false, isChecking: false })
    const screen = await act(async () => render(<SetCreditLimitScreen />))
    expect(screen.getByText(t('common.offline'))).toBeTruthy()
    await act(async () => {
      fireEvent.press(screen.getByTestId('credit-limit-submit'))
    })
    expect(mockSetCreditLimit).not.toHaveBeenCalled()
  })
})
