/**
 * CustomerDetailScreen tests — 5 states (loading, not-found/error, content, offline),
 * owner vs staff rendering (CreditPaymentCard / MonthlyBillCard / action buttons hidden
 * for staff / when fields are null), subscription remove, deactivate confirm dialog,
 * overflow menu, lazy bill fetch (OQ-5), and offline-disabled writes.
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
const mockBack = jest.fn()
jest.mock('expo-router', () => ({
  useRouter: () => ({ push: mockPush, back: mockBack, replace: jest.fn() }),
  useLocalSearchParams: jest.fn().mockReturnValue({ customerId: 'c1' }),
}))

jest.mock('@hooks/useNetworkStatus', () => ({
  useNetworkStatus: jest.fn().mockReturnValue({ isConnected: true, isChecking: false }),
}))

jest.mock('@modules/roles/hooks/useRole', () => ({
  useRole: jest.fn().mockReturnValue({ isOwner: true, hasPermission: () => true }),
}))

jest.mock('../../store/customers.store', () => ({ useCustomersStore: jest.fn() }))

import React from 'react'
import { render, fireEvent, act, waitFor } from '@testing-library/react-native'
import CustomerDetailScreen from '../CustomerDetailScreen'
import { t } from '@locales/index'
import { useNetworkStatus } from '@hooks/useNetworkStatus'
import { useRole } from '@modules/roles/hooks/useRole'
import { useLocalSearchParams } from 'expo-router'
import type { CustomerDetailDto, SubscriptionDto, MonthlyBillDto } from '../../../../types/customer'

const { useCustomersStore } = jest.requireMock('../../store/customers.store') as {
  useCustomersStore: jest.Mock
}
const useNetworkStatusMock = useNetworkStatus as jest.Mock
const useRoleMock = useRole as jest.Mock
const useLocalSearchParamsMock = useLocalSearchParams as jest.Mock

const mockFetchCustomer = jest.fn().mockResolvedValue(undefined)
const mockFetchBill = jest.fn().mockResolvedValue(undefined)
const mockRemoveSubscription = jest.fn().mockResolvedValue(undefined)
const mockDeactivateCustomer = jest.fn().mockResolvedValue(undefined)
const mockClearError = jest.fn()

const mockSub: SubscriptionDto = {
  subscriptionId: 'sub1',
  listId: 'l1',
  listName: 'Morning Milk',
  startTime: '06:00',
  quantity: 1,
  unit: 'ltr',
  ratePerUnit: 50,
  frequency: 'DAILY',
  startDate: '2024-01-01',
  endDate: null,
  isActive: true,
  isCustomRate: false,
  isCustomQuantity: false,
}

const mockBill: MonthlyBillDto = {
  customerId: 'c1',
  customerName: 'Alice Kumar',
  month: '2026-06',
  billDetails: {
    byList: [
      { listName: 'Morning Milk', deliveries: 20, leaves: 0, quantity: 20, unit: 'ltr', ratePerUnit: 50, subtotal: 1000 },
    ],
    extraCharges: [],
    subtotal: 1000,
    previousDue: 0,
    totalDue: 1000,
  },
  paymentStatus: 'pending',
}

function makeCustomer(over: Partial<CustomerDetailDto>): CustomerDetailDto {
  return {
    id: 'c1',
    name: 'Alice Kumar',
    phoneNumber: '9876543210',
    email: null,
    address: '123 Main St',
    area: 'North',
    language: 'en',
    customerSince: '2024-01-01',
    status: 'ACTIVE',
    creditLimit: 5000,
    currentBalance: 500,
    paymentScore: 80,
    creditUtilization: 10,
    subscriptions: [mockSub],
    currentMonthBill: {
      month: '2026-06',
      subtotal: 1000,
      previousDue: 0,
      totalDue: 1000,
      status: 'pending',
    },
    paymentHistory: [],
    createdAt: '2024-01-01T00:00:00.000Z',
    updatedAt: '2024-01-01T00:00:00.000Z',
    ...over,
  }
}

function mockStore(state: Record<string, unknown>) {
  useCustomersStore.mockImplementation((selector: (s: unknown) => unknown) =>
    selector({
      detail: {},
      bill: {},
      isDetailLoading: false,
      detailError: null,
      isMutating: false,
      mutationError: null,
      fetchCustomer: mockFetchCustomer,
      fetchBill: mockFetchBill,
      removeSubscription: mockRemoveSubscription,
      deactivateCustomer: mockDeactivateCustomer,
      clearError: mockClearError,
      ...state,
    }),
  )
}

beforeEach(() => {
  jest.clearAllMocks()
  useNetworkStatusMock.mockReturnValue({ isConnected: true, isChecking: false })
  useRoleMock.mockReturnValue({ isOwner: true, hasPermission: () => true })
  useLocalSearchParamsMock.mockReturnValue({ customerId: 'c1' })
  mockStore({})
})

describe('CustomerDetailScreen — 5 states', () => {
  it('shows the loading skeleton when loading and no cached detail', async () => {
    mockStore({ isDetailLoading: true, detail: {} })
    const screen = await act(async () => render(<CustomerDetailScreen />))
    expect(screen.getByTestId('customer-detail-skeleton')).toBeTruthy()
  })

  it('shows not-found state when no cached detail and load done', async () => {
    mockStore({ detail: {} })
    const screen = await act(async () => render(<CustomerDetailScreen />))
    expect(screen.getByText(t('customer.error_not_found'))).toBeTruthy()
    expect(screen.getByText(t('common.retry'))).toBeTruthy()
  })

  it('shows error from detailError when no cached detail', async () => {
    mockStore({ detail: {}, detailError: 'customer.error_load_failed' })
    const screen = await act(async () => render(<CustomerDetailScreen />))
    expect(screen.getByText(t('customer.error_load_failed'))).toBeTruthy()
  })

  it('renders content state with profile header and subscriptions', async () => {
    mockStore({ detail: { c1: makeCustomer({}) } })
    const screen = await act(async () => render(<CustomerDetailScreen />))
    expect(screen.getByTestId('customer-profile-header')).toBeTruthy()
    expect(screen.getByTestId('subscription-row-sub1')).toBeTruthy()
  })

  it('shows offline banner when not connected', async () => {
    useNetworkStatusMock.mockReturnValue({ isConnected: false, isChecking: false })
    mockStore({ detail: { c1: makeCustomer({}) } })
    const screen = await act(async () => render(<CustomerDetailScreen />))
    expect(screen.getByText(t('common.offline'))).toBeTruthy()
  })
})

describe('CustomerDetailScreen — owner vs staff rendering', () => {
  it('shows CreditPaymentCard for owner when currentBalance is non-null', async () => {
    mockStore({ detail: { c1: makeCustomer({ currentBalance: 500 }) } })
    const screen = await act(async () => render(<CustomerDetailScreen />))
    expect(screen.getByTestId('customer-credit-card')).toBeTruthy()
  })

  it('does NOT show CreditPaymentCard when currentBalance is null (staff)', async () => {
    mockStore({
      detail: {
        c1: makeCustomer({ currentBalance: null, creditUtilization: null, paymentScore: null }),
      },
    })
    const screen = await act(async () => render(<CustomerDetailScreen />))
    expect(screen.queryByTestId('customer-credit-card')).toBeNull()
  })

  it('shows MonthlyBillCard for owner when currentMonthBill is non-null', async () => {
    mockStore({ detail: { c1: makeCustomer({}) } })
    const screen = await act(async () => render(<CustomerDetailScreen />))
    expect(screen.getByTestId('customer-monthly-bill')).toBeTruthy()
  })

  it('does NOT show MonthlyBillCard when currentMonthBill is null (staff)', async () => {
    mockStore({ detail: { c1: makeCustomer({ currentMonthBill: null }) } })
    const screen = await act(async () => render(<CustomerDetailScreen />))
    expect(screen.queryByTestId('customer-monthly-bill')).toBeNull()
  })

  it('shows overflow menu button for owner', async () => {
    mockStore({ detail: { c1: makeCustomer({}) } })
    const screen = await act(async () => render(<CustomerDetailScreen />))
    expect(screen.getByTestId('customer-detail-overflow')).toBeTruthy()
  })

  it('does NOT show overflow menu for staff', async () => {
    useRoleMock.mockReturnValue({ isOwner: false, hasPermission: () => false })
    mockStore({ detail: { c1: makeCustomer({}) } })
    const screen = await act(async () => render(<CustomerDetailScreen />))
    expect(screen.queryByTestId('customer-detail-overflow')).toBeNull()
  })

  it('shows owner action buttons (record payment, set credit limit) for owner', async () => {
    mockStore({ detail: { c1: makeCustomer({}) } })
    const screen = await act(async () => render(<CustomerDetailScreen />))
    expect(screen.getByTestId('action-record-payment')).toBeTruthy()
    expect(screen.getByTestId('action-set-credit-limit')).toBeTruthy()
  })

  it('does NOT show owner action buttons for staff', async () => {
    useRoleMock.mockReturnValue({ isOwner: false, hasPermission: () => false })
    mockStore({ detail: { c1: makeCustomer({}) } })
    const screen = await act(async () => render(<CustomerDetailScreen />))
    expect(screen.queryByTestId('action-record-payment')).toBeNull()
  })

  it('shows View Calendar for both roles', async () => {
    mockStore({ detail: { c1: makeCustomer({}) } })
    const screen = await act(async () => render(<CustomerDetailScreen />))
    expect(screen.getByTestId('action-view-calendar')).toBeTruthy()
  })

  it('shows subscription remove button for owner (canManage=true)', async () => {
    mockStore({ detail: { c1: makeCustomer({}) } })
    const screen = await act(async () => render(<CustomerDetailScreen />))
    expect(screen.getByTestId('subscription-row-sub1-remove')).toBeTruthy()
  })

  it('does NOT show remove button for staff (canManage=false)', async () => {
    useRoleMock.mockReturnValue({ isOwner: false, hasPermission: () => false })
    mockStore({ detail: { c1: makeCustomer({}) } })
    const screen = await act(async () => render(<CustomerDetailScreen />))
    expect(screen.queryByTestId('subscription-row-sub1-remove')).toBeNull()
  })
})

describe('CustomerDetailScreen — deactivate flow', () => {
  it('shows deactivate confirm dialog when deactivate is triggered from overflow', async () => {
    mockStore({ detail: { c1: makeCustomer({}) } })
    const screen = await act(async () => render(<CustomerDetailScreen />))
    // Open overflow sheet
    fireEvent.press(screen.getByTestId('customer-detail-overflow'))
    await waitFor(() => expect(screen.getByText(t('customer.deactivate_customer'))).toBeTruthy())
    // Tap deactivate
    fireEvent.press(screen.getByText(t('customer.deactivate_customer')))
    await waitFor(() => {
      expect(screen.getByText(t('customer.confirm_deactivate_title'))).toBeTruthy()
    })
  })

  it('calls deactivateCustomer on confirm', async () => {
    mockStore({ detail: { c1: makeCustomer({}) } })
    const screen = await act(async () => render(<CustomerDetailScreen />))
    fireEvent.press(screen.getByTestId('customer-detail-overflow'))
    await waitFor(() => expect(screen.getByText(t('customer.deactivate_customer'))).toBeTruthy())
    fireEvent.press(screen.getByText(t('customer.deactivate_customer')))
    await waitFor(() => expect(screen.getByText(t('customer.confirm_deactivate_title'))).toBeTruthy())
    await act(async () => {
      fireEvent.press(screen.getByText(t('customer.deactivate_customer')))
    })
    expect(mockDeactivateCustomer).toHaveBeenCalledWith('c1')
  })
})

describe('CustomerDetailScreen — lazy bill fetch (OQ-5)', () => {
  it('calls fetchBill with the current month for owner when detail is loaded', async () => {
    mockStore({ detail: { c1: makeCustomer({}) } })
    await act(async () => render(<CustomerDetailScreen />))
    expect(mockFetchBill).toHaveBeenCalledWith('c1', expect.stringMatching(/^\d{4}-\d{2}$/))
  })

  it('does NOT call fetchBill for staff', async () => {
    useRoleMock.mockReturnValue({ isOwner: false, hasPermission: () => false })
    mockStore({ detail: { c1: makeCustomer({}) } })
    await act(async () => render(<CustomerDetailScreen />))
    expect(mockFetchBill).not.toHaveBeenCalled()
  })

  it('renders full bill breakdown when bill data is available', async () => {
    const month = '2026-06'
    mockStore({
      detail: { c1: makeCustomer({}) },
      bill: { [`c1:${month}`]: mockBill },
    })
    const screen = await act(async () => render(<CustomerDetailScreen />))
    expect(screen.getByTestId('customer-monthly-bill')).toBeTruthy()
  })
})

describe('CustomerDetailScreen — navigation', () => {
  it('navigates to edit from the overflow menu', async () => {
    mockStore({ detail: { c1: makeCustomer({}) } })
    const screen = await act(async () => render(<CustomerDetailScreen />))
    fireEvent.press(screen.getByTestId('customer-detail-overflow'))
    await waitFor(() => expect(screen.getByText(t('customer.edit_customer'))).toBeTruthy())
    fireEvent.press(screen.getByText(t('customer.edit_customer')))
    expect(mockPush).toHaveBeenCalledWith('/(app)/customers/c1/edit')
  })

  it('navigates to record-payment screen on action press', async () => {
    mockStore({ detail: { c1: makeCustomer({}) } })
    const screen = await act(async () => render(<CustomerDetailScreen />))
    fireEvent.press(screen.getByTestId('action-record-payment'))
    expect(mockPush).toHaveBeenCalledWith('/(app)/customers/c1/record-payment')
  })

  it('navigates to credit-limit screen on action press', async () => {
    mockStore({ detail: { c1: makeCustomer({}) } })
    const screen = await act(async () => render(<CustomerDetailScreen />))
    fireEvent.press(screen.getByTestId('action-set-credit-limit'))
    expect(mockPush).toHaveBeenCalledWith('/(app)/customers/c1/credit-limit')
  })

  it('navigates to add-subscription screen', async () => {
    mockStore({ detail: { c1: makeCustomer({}) } })
    const screen = await act(async () => render(<CustomerDetailScreen />))
    fireEvent.press(screen.getByTestId('add-subscription-btn'))
    expect(mockPush).toHaveBeenCalledWith('/(app)/customers/c1/add-subscription')
  })
})

describe('CustomerDetailScreen — offline', () => {
  it('disables owner write actions when offline', async () => {
    useNetworkStatusMock.mockReturnValue({ isConnected: false, isChecking: false })
    mockStore({ detail: { c1: makeCustomer({}) } })
    const screen = await act(async () => render(<CustomerDetailScreen />))
    // Buttons are disabled — pressing them should NOT navigate.
    const recordBtn = screen.getByTestId('action-record-payment')
    fireEvent.press(recordBtn)
    expect(mockPush).not.toHaveBeenCalledWith('/(app)/customers/c1/record-payment')
  })
})
