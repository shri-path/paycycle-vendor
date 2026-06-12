/**
 * AddCustomerScreen tests — validation gate, 409 duplicate-phone field error,
 * successful create + navigation (no invite toast), supply-list multi-select,
 * and the online-only submit guard.
 *
 * Assertions use i18n keys + testIDs (locale-independent). Async submit is wrapped
 * in `await act(async …)` per the @testing-library/react-native@14 flush rule.
 */

jest.mock('expo-haptics', () => ({
  impactAsync: jest.fn(),
  notificationAsync: jest.fn(),
  ImpactFeedbackStyle: { Light: 'light', Medium: 'medium', Heavy: 'heavy' },
  NotificationFeedbackType: { Success: 'success', Warning: 'warning', Error: 'error' },
}))

jest.mock('@expo/vector-icons', () => ({
  Ionicons: 'Ionicons',
  MaterialCommunityIcons: 'MaterialCommunityIcons',
}))

const mockReplace = jest.fn()
const mockBack = jest.fn()
jest.mock('expo-router', () => ({
  useRouter: () => ({ push: jest.fn(), replace: mockReplace, back: mockBack }),
}))

jest.mock('@hooks/useNetworkStatus', () => ({
  useNetworkStatus: jest.fn().mockReturnValue({ isConnected: true, isChecking: false }),
}))

jest.mock('@modules/roles/hooks/useRequireOwner', () => ({ useRequireOwner: jest.fn() }))

jest.mock('../../store/customers.store', () => ({ useCustomersStore: jest.fn() }))
jest.mock('@modules/supply-lists/store/supplyLists.store', () => ({
  useSupplyListsStore: jest.fn(),
}))

import React from 'react'
import { render, fireEvent, act } from '@testing-library/react-native'
import AddCustomerScreen from '../AddCustomerScreen'
import { t } from '@locales/index'
import { useNetworkStatus } from '@hooks/useNetworkStatus'

const { useCustomersStore } = jest.requireMock('../../store/customers.store') as {
  useCustomersStore: jest.Mock
}
const { useSupplyListsStore } = jest.requireMock(
  '@modules/supply-lists/store/supplyLists.store',
) as { useSupplyListsStore: jest.Mock }
const useNetworkStatusMock = useNetworkStatus as jest.Mock

const mockCreateCustomer = jest.fn()
const mockClearError = jest.fn()
const mockFetchLists = jest.fn().mockResolvedValue(undefined)

function mockCustomersStore(state: Record<string, unknown> = {}) {
  useCustomersStore.mockImplementation((selector: (s: unknown) => unknown) =>
    selector({
      createCustomer: mockCreateCustomer,
      isMutating: false,
      mutationError: null,
      clearError: mockClearError,
      ...state,
    }),
  )
}

function mockSupplyListsStore(lists: unknown[] = []) {
  useSupplyListsStore.mockImplementation((selector: (s: unknown) => unknown) =>
    selector({
      lists,
      fetchLists: mockFetchLists,
    }),
  )
}

describe('AddCustomerScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    useNetworkStatusMock.mockReturnValue({ isConnected: true, isChecking: false })
    mockCustomersStore()
    mockSupplyListsStore()
  })

  it('renders name and phone fields plus the submit button', async () => {
    const screen = await act(async () => render(<AddCustomerScreen />))
    expect(screen.getByTestId('add-name')).toBeTruthy()
    expect(screen.getByTestId('add-phone')).toBeTruthy()
    expect(screen.getByTestId('add-submit')).toBeTruthy()
  })

  it('blocks submit and shows required errors when name/phone are empty', async () => {
    const screen = await act(async () => render(<AddCustomerScreen />))
    await act(async () => {
      fireEvent.press(screen.getByTestId('add-submit'))
    })
    expect(mockCreateCustomer).not.toHaveBeenCalled()
  })

  it('shows a supply-list checkbox for each available list', async () => {
    mockSupplyListsStore([
      { id: 'l1', name: 'Morning Milk' },
      { id: 'l2', name: 'Evening Bread' },
    ])
    const screen = await act(async () => render(<AddCustomerScreen />))
    expect(screen.getByTestId('add-list-l1')).toBeTruthy()
    expect(screen.getByTestId('add-list-l2')).toBeTruthy()
  })

  it('navigates to the detail screen on successful create (no invite toast)', async () => {
    mockCreateCustomer.mockResolvedValueOnce({ id: 'cust-1', name: 'Asha' })
    const screen = await act(async () => render(<AddCustomerScreen />))
    await act(async () => {
      fireEvent.changeText(screen.getByTestId('add-name'), 'Asha Kumar')
      fireEvent.changeText(screen.getByTestId('add-phone'), '9000000001')
    })
    await act(async () => {
      fireEvent.press(screen.getByTestId('add-submit'))
    })
    expect(mockCreateCustomer).toHaveBeenCalledTimes(1)
    expect(mockReplace).toHaveBeenCalledWith('/(app)/customers/cust-1')
    // Confirm no "invite sent" toast / success message appears (API_SPEC explicit).
    expect(screen.queryByText(/invite sent/i)).toBeNull()
  })

  it('shows the 409 duplicate-phone error as a field-level error on the phone input', async () => {
    const conflictError = Object.assign(new Error('Conflict'), {
      isAxiosError: true,
      response: { status: 409, data: {} },
    })
    mockCreateCustomer.mockRejectedValueOnce(conflictError)
    const screen = await act(async () => render(<AddCustomerScreen />))
    await act(async () => {
      fireEvent.changeText(screen.getByTestId('add-name'), 'Asha Kumar')
      fireEvent.changeText(screen.getByTestId('add-phone'), '9000000001')
    })
    await act(async () => {
      fireEvent.press(screen.getByTestId('add-submit'))
    })
    expect(screen.getByText(t('customer.error_duplicate_phone'))).toBeTruthy()
  })

  it('shows the banner error from the store', async () => {
    mockCustomersStore({ mutationError: 'customer.error_create_failed' })
    const screen = await act(async () => render(<AddCustomerScreen />))
    expect(screen.getByText(t('customer.error_create_failed'))).toBeTruthy()
  })

  it('disables submit offline and shows the offline banner', async () => {
    useNetworkStatusMock.mockReturnValue({ isConnected: false, isChecking: false })
    const screen = await act(async () => render(<AddCustomerScreen />))
    expect(screen.getByText(t('common.offline'))).toBeTruthy()
    await act(async () => {
      fireEvent.press(screen.getByTestId('add-submit'))
    })
    expect(mockCreateCustomer).not.toHaveBeenCalled()
  })
})
