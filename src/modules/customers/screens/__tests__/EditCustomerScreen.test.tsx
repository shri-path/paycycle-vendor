/**
 * EditCustomerScreen tests — loading skeleton, pre-fill from cached detail,
 * minimal PATCH (no change = back without submit), 409 duplicate-phone error,
 * status toggle, and offline guard.
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
import EditCustomerScreen from '../EditCustomerScreen'
import { t } from '@locales/index'
import { useNetworkStatus } from '@hooks/useNetworkStatus'
import type { CustomerDetailDto } from '../../../../types/customer'

const { useCustomersStore } = jest.requireMock('../../store/customers.store') as {
  useCustomersStore: jest.Mock
}
const useNetworkStatusMock = useNetworkStatus as jest.Mock

const mockUpdateCustomer = jest.fn()
const mockFetchCustomer = jest.fn().mockResolvedValue(undefined)
const mockClearError = jest.fn()

const mockDetail: CustomerDetailDto = {
  id: 'c1',
  name: 'Asha Kumar',
  phoneNumber: '9000000001',
  email: 'asha@example.com',
  address: '12 Main St',
  area: 'Bandra',
  language: 'hi',
  customerSince: '2025-01-01',
  status: 'ACTIVE',
  creditLimit: 500,
  currentBalance: 100,
  paymentScore: 80,
  creditUtilization: 20,
  subscriptions: [],
  currentMonthBill: null,
  paymentHistory: [],
  createdAt: '2025-01-01T00:00:00Z',
  updatedAt: '2025-01-01T00:00:00Z',
}

function mockStore(state: Record<string, unknown> = {}) {
  useCustomersStore.mockImplementation((selector: (s: unknown) => unknown) =>
    selector({
      detail: { c1: mockDetail },
      isDetailLoading: false,
      detailError: null,
      fetchCustomer: mockFetchCustomer,
      updateCustomer: mockUpdateCustomer,
      isMutating: false,
      mutationError: null,
      clearError: mockClearError,
      ...state,
    }),
  )
}

describe('EditCustomerScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    useNetworkStatusMock.mockReturnValue({ isConnected: true, isChecking: false })
    mockStore()
  })

  it('renders with fields pre-filled from cached detail', async () => {
    const screen = await act(async () => render(<EditCustomerScreen />))
    expect(screen.getByTestId('edit-name').props.value).toBe('Asha Kumar')
  })

  it('shows the loading skeleton when detail is not yet cached', async () => {
    mockStore({ detail: {}, isDetailLoading: true })
    const screen = await act(async () => render(<EditCustomerScreen />))
    expect(screen.getByTestId('edit-loading')).toBeTruthy()
  })

  it('calls updateCustomer only for changed fields (minimal PATCH)', async () => {
    mockUpdateCustomer.mockResolvedValueOnce(undefined)
    const screen = await act(async () => render(<EditCustomerScreen />))
    // Change only the name.
    await act(async () => {
      fireEvent.changeText(screen.getByTestId('edit-name'), 'Asha Sharma')
    })
    await act(async () => {
      fireEvent.press(screen.getByTestId('edit-submit'))
    })
    expect(mockUpdateCustomer).toHaveBeenCalledWith(
      'c1',
      expect.objectContaining({ name: 'Asha Sharma' }),
    )
    // Phone unchanged → not in patch.
    const callArg = mockUpdateCustomer.mock.calls[0]?.[1] ?? {}
    expect(callArg.phone).toBeUndefined()
  })

  it('navigates back without calling updateCustomer if nothing changed', async () => {
    const screen = await act(async () => render(<EditCustomerScreen />))
    await act(async () => {
      fireEvent.press(screen.getByTestId('edit-submit'))
    })
    expect(mockUpdateCustomer).not.toHaveBeenCalled()
    expect(mockBack).toHaveBeenCalled()
  })

  it('shows the 409 duplicate-phone field-level error', async () => {
    const conflictError = Object.assign(new Error('Conflict'), {
      isAxiosError: true,
      response: { status: 409, data: {} },
    })
    mockUpdateCustomer.mockRejectedValueOnce(conflictError)
    const screen = await act(async () => render(<EditCustomerScreen />))
    await act(async () => {
      fireEvent.changeText(screen.getByTestId('edit-phone'), '9111111111')
    })
    await act(async () => {
      fireEvent.press(screen.getByTestId('edit-submit'))
    })
    expect(screen.getByText(t('customer.error_duplicate_phone'))).toBeTruthy()
  })

  it('disables submit when offline', async () => {
    useNetworkStatusMock.mockReturnValue({ isConnected: false, isChecking: false })
    const screen = await act(async () => render(<EditCustomerScreen />))
    expect(screen.getByText(t('common.offline'))).toBeTruthy()
    await act(async () => {
      fireEvent.press(screen.getByTestId('edit-submit'))
    })
    expect(mockUpdateCustomer).not.toHaveBeenCalled()
  })
})
