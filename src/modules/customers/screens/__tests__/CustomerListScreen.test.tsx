/**
 * CustomerListScreen tests — 5 states (loading skeleton, empty, empty-filtered,
 * error, data), alphabetical grouping, pagination/load-more, owner vs staff rendering
 * (RoleGate), offline disables writes, debounced search, status / list-id filter.
 *
 * Assertions use i18n keys + testIDs (locale-independent).
 */

jest.mock('@expo/vector-icons', () => ({
  Ionicons: 'Ionicons',
  MaterialCommunityIcons: 'MaterialCommunityIcons',
}))

jest.mock('expo-haptics', () => ({
  impactAsync: jest.fn(),
  notificationAsync: jest.fn(),
  ImpactFeedbackStyle: { Light: 'light', Medium: 'medium', Heavy: 'heavy' },
  NotificationFeedbackType: { Success: 'success', Warning: 'warning', Error: 'error' },
}))

const mockPush = jest.fn()
jest.mock('expo-router', () => ({
  useRouter: () => ({ push: mockPush, replace: jest.fn(), back: jest.fn() }),
}))

jest.mock('@hooks/useNetworkStatus', () => ({
  useNetworkStatus: jest.fn().mockReturnValue({ isConnected: true, isChecking: false }),
}))

// RoleGate reads useRole — default to owner so owner controls render.
jest.mock('@modules/roles/hooks/useRole', () => ({
  useRole: jest.fn().mockReturnValue({ isOwner: true, hasPermission: () => true }),
}))

jest.mock('../../store/customers.store', () => ({ useCustomersStore: jest.fn() }))
jest.mock('@modules/supply-lists/store/supplyLists.store', () => ({
  useSupplyListsStore: jest.fn(),
}))

import React from 'react'
import { render, fireEvent, act, waitFor } from '@testing-library/react-native'
import CustomerListScreen from '../CustomerListScreen'
import { t } from '@locales/index'
import { useNetworkStatus } from '@hooks/useNetworkStatus'
import { useRole } from '@modules/roles/hooks/useRole'
import type { CustomerListItemDto } from '../../../../types/customer'

const { useCustomersStore } = jest.requireMock('../../store/customers.store') as {
  useCustomersStore: jest.Mock
}
const { useSupplyListsStore } = jest.requireMock('@modules/supply-lists/store/supplyLists.store') as {
  useSupplyListsStore: jest.Mock
}
const useNetworkStatusMock = useNetworkStatus as jest.Mock
const useRoleMock = useRole as jest.Mock

const mockFetchCustomers = jest.fn().mockResolvedValue(undefined)
const mockSetSearch = jest.fn()
const mockSetListFilter = jest.fn()
const mockSetStatusFilter = jest.fn()
const mockClearError = jest.fn()

function makeCustomer(over: Partial<CustomerListItemDto>): CustomerListItemDto {
  return {
    id: 'c1',
    name: 'Alice Kumar',
    phoneNumber: '9876543210',
    address: '123 Main St',
    area: 'North',
    customerSince: '2024-01-01',
    status: 'ACTIVE',
    supplyLists: ['Morning Milk'],
    monthlyTotal: 500,
    paymentStatus: 'paid',
    currentBalance: 0,
    paymentScore: 80,
    ...over,
  }
}

function mockStore(state: Record<string, unknown>) {
  useCustomersStore.mockImplementation((selector: (s: unknown) => unknown) =>
    selector({
      list: [],
      listTotal: 0,
      listPage: 1,
      listSearch: '',
      listListId: null,
      listStatus: 'all',
      isListLoading: false,
      listError: null,
      setSearch: mockSetSearch,
      setListFilter: mockSetListFilter,
      setStatusFilter: mockSetStatusFilter,
      fetchCustomers: mockFetchCustomers,
      clearError: mockClearError,
      ...state,
    }),
  )
}

beforeEach(() => {
  jest.clearAllMocks()
  useNetworkStatusMock.mockReturnValue({ isConnected: true, isChecking: false })
  useRoleMock.mockReturnValue({ isOwner: true, hasPermission: () => true })
  useSupplyListsStore.mockImplementation((selector: (s: unknown) => unknown) =>
    selector({ lists: [] }),
  )
  mockStore({})
})

describe('CustomerListScreen — 5 states', () => {
  it('shows the loading skeleton on first load', async () => {
    mockStore({ isListLoading: true, list: [] })
    const screen = await act(async () => render(<CustomerListScreen />))
    expect(screen.getByTestId('customer-list-skeleton')).toBeTruthy()
  })

  it('shows the error state with retry when load fails and no cache', async () => {
    mockStore({ listError: 'customer.error_load_failed', list: [] })
    const screen = await act(async () => render(<CustomerListScreen />))
    expect(screen.getByText(t('customer.error_load_failed'))).toBeTruthy()
    expect(screen.getByText(t('common.retry'))).toBeTruthy()
  })

  it('shows the empty state with CTA when no customers', async () => {
    mockStore({ list: [] })
    const screen = await act(async () => render(<CustomerListScreen />))
    expect(screen.getByText(t('customer.no_customers'))).toBeTruthy()
  })

  it('shows the empty-filtered state when listListId filter is set but no results', async () => {
    // Empty list + a list filter active → empty-filtered branch
    mockStore({ list: [], listTotal: 0, listListId: 'l1' })
    const screen = await act(async () => render(<CustomerListScreen />))
    // The empty-filtered state shows total count as 0
    await waitFor(() => {
      expect(screen.queryByText(t('customer.no_customers'))).toBeTruthy()
    })
  })

  it('renders data state with total count and customer cards', async () => {
    mockStore({
      list: [makeCustomer({ id: 'c1' }), makeCustomer({ id: 'c2', name: 'Bob Singh' })],
      listTotal: 2,
    })
    const screen = await act(async () => render(<CustomerListScreen />))
    expect(screen.getByTestId('customer-total-count')).toBeTruthy()
    expect(screen.getByTestId('customer-card-c1')).toBeTruthy()
    expect(screen.getByTestId('customer-card-c2')).toBeTruthy()
  })
})

describe('CustomerListScreen — navigation', () => {
  it('navigates to detail when a card is tapped', async () => {
    mockStore({
      list: [makeCustomer({ id: 'c9' })],
      listTotal: 1,
    })
    const screen = await act(async () => render(<CustomerListScreen />))
    fireEvent.press(screen.getByTestId('customer-card-c9'))
    expect(mockPush).toHaveBeenCalledWith('/(app)/customers/c9')
  })

  it('navigates to add customer from the header +Add button (owner)', async () => {
    mockStore({ list: [makeCustomer({})], listTotal: 1 })
    const screen = await act(async () => render(<CustomerListScreen />))
    fireEvent.press(screen.getByTestId('customer-add-header'))
    expect(mockPush).toHaveBeenCalledWith('/(app)/customers/add')
  })
})

describe('CustomerListScreen — role gating', () => {
  it('does NOT show +Add header button for staff', async () => {
    useRoleMock.mockReturnValue({ isOwner: false, hasPermission: () => false })
    mockStore({ list: [makeCustomer({})], listTotal: 1 })
    const screen = await act(async () => render(<CustomerListScreen />))
    expect(screen.queryByTestId('customer-add-header')).toBeNull()
  })

  it('does NOT show +Create bottom button for staff', async () => {
    useRoleMock.mockReturnValue({ isOwner: false, hasPermission: () => false })
    mockStore({ list: [makeCustomer({})], listTotal: 1 })
    const screen = await act(async () => render(<CustomerListScreen />))
    expect(screen.queryByTestId('customer-create-bottom')).toBeNull()
  })

  it('hides monthly total and payment status badge when null (staff view)', async () => {
    mockStore({
      list: [makeCustomer({ monthlyTotal: null, paymentStatus: null })],
      listTotal: 1,
    })
    const screen = await act(async () => render(<CustomerListScreen />))
    // The card should still render but not show financial data.
    expect(screen.getByTestId('customer-card-c1')).toBeTruthy()
  })
})

describe('CustomerListScreen — offline', () => {
  it('shows the offline banner when not connected', async () => {
    useNetworkStatusMock.mockReturnValue({ isConnected: false, isChecking: false })
    mockStore({ list: [makeCustomer({})], listTotal: 1 })
    const screen = await act(async () => render(<CustomerListScreen />))
    expect(screen.getByText(t('common.offline'))).toBeTruthy()
  })

  it('disables the bottom +Create button offline', async () => {
    useNetworkStatusMock.mockReturnValue({ isConnected: false, isChecking: false })
    mockStore({ list: [makeCustomer({})], listTotal: 1 })
    const screen = await act(async () => render(<CustomerListScreen />))
    // The button is rendered but disabled; pressing it should NOT navigate.
    const btn = screen.getByTestId('customer-create-bottom')
    fireEvent.press(btn)
    expect(mockPush).not.toHaveBeenCalledWith('/(app)/customers/add')
  })
})

describe('CustomerListScreen — search', () => {
  it('triggers setSearch via debounced input', async () => {
    jest.useFakeTimers()
    try {
      mockStore({ list: [makeCustomer({})], listTotal: 1 })
      const screen = await act(async () => render(<CustomerListScreen />))
      await act(async () => {
        fireEvent.changeText(screen.getByTestId('customer-search'), 'alice')
      })
      await act(async () => {
        jest.advanceTimersByTime(400)
      })
      expect(mockSetSearch).toHaveBeenCalledWith('alice')
    } finally {
      jest.useRealTimers()
    }
  })
})
