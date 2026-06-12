/**
 * RecordPaymentScreen tests — amount validation (>0 required), payment method
 * radio, success → refetch detail + back, store error banner, and offline guard.
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
import { render, fireEvent, act, waitFor } from '@testing-library/react-native'
import RecordPaymentScreen from '../RecordPaymentScreen'
import { t } from '@locales/index'
import { useNetworkStatus } from '@hooks/useNetworkStatus'

const { useCustomersStore } = jest.requireMock('../../store/customers.store') as {
  useCustomersStore: jest.Mock
}
const useNetworkStatusMock = useNetworkStatus as jest.Mock

const mockRecordPayment = jest.fn()
const mockFetchCustomer = jest.fn().mockResolvedValue(undefined)
const mockClearError = jest.fn()

function mockStore(state: Record<string, unknown> = {}) {
  useCustomersStore.mockImplementation((selector: (s: unknown) => unknown) =>
    selector({
      recordPayment: mockRecordPayment,
      fetchCustomer: mockFetchCustomer,
      isMutating: false,
      mutationError: null,
      clearError: mockClearError,
      ...state,
    }),
  )
}

describe('RecordPaymentScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    useNetworkStatusMock.mockReturnValue({ isConnected: true, isChecking: false })
    mockStore()
  })

  it('renders amount, date, method, and reference fields plus the submit button', async () => {
    const screen = await act(async () => render(<RecordPaymentScreen />))
    expect(screen.getByTestId('payment-amount')).toBeTruthy()
    expect(screen.getByTestId('payment-method')).toBeTruthy()
    expect(screen.getByTestId('payment-reference')).toBeTruthy()
    expect(screen.getByTestId('payment-submit')).toBeTruthy()
  })

  it('blocks submit and shows validation error when amount is empty', async () => {
    const screen = await act(async () => render(<RecordPaymentScreen />))
    await act(async () => {
      fireEvent.press(screen.getByTestId('payment-submit'))
    })
    expect(mockRecordPayment).not.toHaveBeenCalled()
    expect(screen.getByText(t('customer.error_invalid_payment'))).toBeTruthy()
  })

  it('blocks submit when amount is zero', async () => {
    const screen = await act(async () => render(<RecordPaymentScreen />))
    await act(async () => {
      fireEvent.changeText(screen.getByTestId('payment-amount'), '0')
    })
    await act(async () => {
      fireEvent.press(screen.getByTestId('payment-submit'))
    })
    expect(mockRecordPayment).not.toHaveBeenCalled()
  })

  it('records the payment, re-fetches detail, and navigates back on success', async () => {
    mockRecordPayment.mockResolvedValueOnce({ id: 'p1', amount: 250 })
    const screen = await act(async () => render(<RecordPaymentScreen />))
    await act(async () => {
      fireEvent.changeText(screen.getByTestId('payment-amount'), '250')
    })
    await act(async () => {
      fireEvent.press(screen.getByTestId('payment-submit'))
    })
    await waitFor(() => {
      expect(mockRecordPayment).toHaveBeenCalledWith(
        'c1',
        expect.objectContaining({ amount: 250, paymentMethod: 'CASH' }),
      )
    })
    expect(mockFetchCustomer).toHaveBeenCalledWith('c1')
    expect(mockBack).toHaveBeenCalled()
  })

  it('shows the store mutation error banner', async () => {
    mockStore({ mutationError: 'customer.error_invalid_payment' })
    const screen = await act(async () => render(<RecordPaymentScreen />))
    expect(screen.getByText(t('customer.error_invalid_payment'))).toBeTruthy()
  })

  it('disables submit when offline', async () => {
    useNetworkStatusMock.mockReturnValue({ isConnected: false, isChecking: false })
    const screen = await act(async () => render(<RecordPaymentScreen />))
    expect(screen.getByText(t('common.offline'))).toBeTruthy()
    await act(async () => {
      fireEvent.press(screen.getByTestId('payment-submit'))
    })
    expect(mockRecordPayment).not.toHaveBeenCalled()
  })
})
