/**
 * PaymentHistoryScreen tests — loading skeleton, empty state, content FlatList
 * with PaymentHistoryRow rows, error + retry, pull-to-refresh and load-more,
 * and the offline banner (reads cache when available).
 */

jest.mock('@expo/vector-icons', () => ({ Ionicons: 'Ionicons' }))

jest.mock('expo-haptics', () => ({
  impactAsync: jest.fn(),
  notificationAsync: jest.fn(),
  ImpactFeedbackStyle: { Light: 'light', Medium: 'medium', Heavy: 'heavy' },
  NotificationFeedbackType: { Success: 'success', Warning: 'warning', Error: 'error' },
}))

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
import PaymentHistoryScreen from '../PaymentHistoryScreen'
import { t } from '@locales/index'
import { useNetworkStatus } from '@hooks/useNetworkStatus'
import type { PaymentDto, PaginationMeta } from '../../../../types/customer'

const { useCustomersStore } = jest.requireMock('../../store/customers.store') as {
  useCustomersStore: jest.Mock
}
const useNetworkStatusMock = useNetworkStatus as jest.Mock

const mockFetchPayments = jest.fn().mockResolvedValue(undefined)
const mockClearError = jest.fn()

const samplePayments: PaymentDto[] = [
  {
    id: 'p1',
    amount: 300,
    date: '2026-06-01',
    method: 'CASH',
    reference: null,
    createdAt: '2026-06-01T10:00:00Z',
  },
  {
    id: 'p2',
    amount: 500,
    date: '2026-05-15',
    method: 'UPI',
    reference: 'REF-001',
    createdAt: '2026-05-15T10:00:00Z',
  },
]

const sampleMeta: PaginationMeta = { page: 1, limit: 20, total: 2, totalPages: 1 }

function mockStore(state: Record<string, unknown> = {}) {
  useCustomersStore.mockImplementation((selector: (s: unknown) => unknown) =>
    selector({
      payments: { c1: samplePayments },
      paymentsMeta: { c1: sampleMeta },
      isPaymentsLoading: false,
      paymentsError: null,
      fetchPayments: mockFetchPayments,
      clearError: mockClearError,
      ...state,
    }),
  )
}

describe('PaymentHistoryScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    useNetworkStatusMock.mockReturnValue({ isConnected: true, isChecking: false })
    mockStore()
  })

  it('renders the payment rows', async () => {
    const screen = await act(async () => render(<PaymentHistoryScreen />))
    expect(screen.getByTestId('payment-row-p1')).toBeTruthy()
    expect(screen.getByTestId('payment-row-p2')).toBeTruthy()
  })

  it('shows the loading skeleton when fetching the first page with no rows', async () => {
    mockStore({ payments: {}, isPaymentsLoading: true })
    const screen = await act(async () => render(<PaymentHistoryScreen />))
    expect(screen.getByTestId('payments-loading')).toBeTruthy()
  })

  it('shows the empty state when no payments exist', async () => {
    mockStore({ payments: { c1: [] } })
    const screen = await act(async () => render(<PaymentHistoryScreen />))
    expect(screen.getByText(t('customer.no_payments'))).toBeTruthy()
  })

  it('shows the error view with a retry button when there is an error and no rows', async () => {
    mockStore({ payments: {}, paymentsError: 'customer.error_load_failed' })
    const screen = await act(async () => render(<PaymentHistoryScreen />))
    expect(screen.getByText(t('customer.error_load_failed'))).toBeTruthy()
    expect(screen.getByTestId('payments-retry')).toBeTruthy()
  })

  it('retries fetch when the retry button is pressed', async () => {
    mockStore({ payments: {}, paymentsError: 'customer.error_load_failed' })
    const screen = await act(async () => render(<PaymentHistoryScreen />))
    await act(async () => {
      fireEvent.press(screen.getByTestId('payments-retry'))
    })
    expect(mockFetchPayments).toHaveBeenCalledWith('c1', { page: 1 })
  })

  it('calls fetchPayments on mount with page 1', async () => {
    await act(async () => render(<PaymentHistoryScreen />))
    expect(mockFetchPayments).toHaveBeenCalledWith('c1', { page: 1 })
  })

  it('calls fetchPayments with page 2 on load-more when totalPages > 1', async () => {
    const multiPageMeta: PaginationMeta = { page: 1, limit: 20, total: 40, totalPages: 2 }
    mockStore({ paymentsMeta: { c1: multiPageMeta } })
    const screen = await act(async () => render(<PaymentHistoryScreen />))
    const list = screen.getByTestId('payments-list')
    await act(async () => {
      fireEvent(list, 'onEndReached')
    })
    await waitFor(() =>
      expect(mockFetchPayments).toHaveBeenCalledWith('c1', { page: 2 }),
    )
  })

  it('shows the offline banner when disconnected but has cached rows', async () => {
    useNetworkStatusMock.mockReturnValue({ isConnected: false, isChecking: false })
    const screen = await act(async () => render(<PaymentHistoryScreen />))
    expect(screen.getByText(t('common.offline'))).toBeTruthy()
    // Rows still render from cache.
    expect(screen.getByTestId('payment-row-p1')).toBeTruthy()
  })
})
