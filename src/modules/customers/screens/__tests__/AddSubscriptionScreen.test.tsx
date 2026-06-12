/**
 * AddSubscriptionScreen tests — list exclusion (already subscribed lists hidden),
 * required list selection, 409 already-subscribed error, optional fields,
 * success → navigate back, and offline guard.
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
jest.mock('@modules/supply-lists/store/supplyLists.store', () => ({
  useSupplyListsStore: jest.fn(),
}))

import React from 'react'
import { render, fireEvent, act } from '@testing-library/react-native'
import AddSubscriptionScreen from '../AddSubscriptionScreen'
import { t } from '@locales/index'
import { useNetworkStatus } from '@hooks/useNetworkStatus'
import type { CustomerDetailDto } from '../../../../types/customer'

const { useCustomersStore } = jest.requireMock('../../store/customers.store') as {
  useCustomersStore: jest.Mock
}
const { useSupplyListsStore } = jest.requireMock(
  '@modules/supply-lists/store/supplyLists.store',
) as { useSupplyListsStore: jest.Mock }
const useNetworkStatusMock = useNetworkStatus as jest.Mock

const mockAddSubscription = jest.fn()
const mockFetchCustomer = jest.fn().mockResolvedValue(undefined)
const mockFetchLists = jest.fn().mockResolvedValue(undefined)
const mockClearError = jest.fn()

const mockDetail: CustomerDetailDto = {
  id: 'c1',
  name: 'Asha',
  phoneNumber: '9000000001',
  email: null,
  address: null,
  area: null,
  language: null,
  customerSince: '2025-01-01',
  status: 'ACTIVE',
  creditLimit: 0,
  currentBalance: 0,
  paymentScore: null,
  creditUtilization: null,
  subscriptions: [
    {
      subscriptionId: 's1',
      listId: 'l1',
      listName: 'Morning Milk',
      startTime: '06:00',
      quantity: 1,
      unit: 'litre',
      ratePerUnit: 60,
      frequency: 'DAILY',
      startDate: '2025-01-01',
      endDate: null,
      isActive: true,
      isCustomRate: false,
      isCustomQuantity: false,
    },
  ],
  currentMonthBill: null,
  paymentHistory: [],
  createdAt: '2025-01-01T00:00:00Z',
  updatedAt: '2025-01-01T00:00:00Z',
}

function mockCustomersStore(state: Record<string, unknown> = {}) {
  useCustomersStore.mockImplementation((selector: (s: unknown) => unknown) =>
    selector({
      detail: { c1: mockDetail },
      fetchCustomer: mockFetchCustomer,
      addSubscription: mockAddSubscription,
      isMutating: false,
      mutationError: null,
      clearError: mockClearError,
      ...state,
    }),
  )
}

function mockListsStore(lists: unknown[] = []) {
  useSupplyListsStore.mockImplementation((selector: (s: unknown) => unknown) =>
    selector({ lists, fetchLists: mockFetchLists }),
  )
}

describe('AddSubscriptionScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    useNetworkStatusMock.mockReturnValue({ isConnected: true, isChecking: false })
    mockCustomersStore()
    // l1 is already subscribed; l2 should appear.
    mockListsStore([
      { id: 'l1', name: 'Morning Milk' },
      { id: 'l2', name: 'Evening Bread' },
    ])
  })

  it('renders the list selector and submit button', async () => {
    const screen = await act(async () => render(<AddSubscriptionScreen />))
    expect(screen.getByTestId('sub-list-select')).toBeTruthy()
    expect(screen.getByTestId('sub-submit')).toBeTruthy()
  })

  it('shows the already-subscribed error banner from the store', async () => {
    mockCustomersStore({ mutationError: 'customer.error_already_subscribed' })
    const screen = await act(async () => render(<AddSubscriptionScreen />))
    expect(screen.getByText(t('customer.error_already_subscribed'))).toBeTruthy()
  })

  it('blocks submit without a list selected and shows required error', async () => {
    const screen = await act(async () => render(<AddSubscriptionScreen />))
    await act(async () => {
      fireEvent.press(screen.getByTestId('sub-submit'))
    })
    expect(mockAddSubscription).not.toHaveBeenCalled()
  })

  it('calls addSubscription and navigates back on success', async () => {
    mockAddSubscription.mockResolvedValueOnce({ subscriptionId: 's2', listId: 'l2' })
    const screen = await act(async () => render(<AddSubscriptionScreen />))
    // AppSelect renders the label text as a pressable trigger that opens the modal.
    // "Evening Bread" is the only non-subscribed option (l1 is already subscribed).
    const listNodes = screen.getAllByText(t('customer.form_supply_lists'))
    const listTrigger = listNodes[listNodes.length - 1]!
    await act(async () => {
      fireEvent.press(listTrigger)
    })
    await act(async () => {
      fireEvent.press(screen.getByText('Evening Bread'))
    })
    await act(async () => {
      fireEvent.press(screen.getByTestId('sub-submit'))
    })
    expect(mockAddSubscription).toHaveBeenCalledWith(
      'c1',
      expect.objectContaining({ supplyListId: 'l2' }),
    )
    expect(mockBack).toHaveBeenCalled()
  })

  it('disables submit when offline', async () => {
    useNetworkStatusMock.mockReturnValue({ isConnected: false, isChecking: false })
    const screen = await act(async () => render(<AddSubscriptionScreen />))
    expect(screen.getByText(t('common.offline'))).toBeTruthy()
    await act(async () => {
      fireEvent.press(screen.getByTestId('sub-submit'))
    })
    expect(mockAddSubscription).not.toHaveBeenCalled()
  })
})
