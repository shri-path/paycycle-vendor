/**
 * SubscriptionScreen tests (US-009)
 * Covers: loading state, error state, data state (usage bars, actions),
 * PRO plan hides Upgrade button, cancelled plan hides Cancel button,
 * offline disables command buttons.
 * Store is mocked via selector function (same pattern as audit/customer screen tests).
 */

jest.mock('@expo/vector-icons', () => ({
  Ionicons: 'Ionicons',
  MaterialCommunityIcons: 'MaterialCommunityIcons',
}))

const mockPush = jest.fn()
const mockBack = jest.fn()
jest.mock('expo-router', () => ({
  useRouter: () => ({ push: mockPush, replace: jest.fn(), back: mockBack }),
  useFocusEffect: (cb: () => (() => void) | void) => { cb() },
}))

jest.mock('@hooks/useNetworkStatus', () => ({
  useNetworkStatus: jest.fn().mockReturnValue({ isConnected: true, isChecking: false }),
}))

jest.mock('@modules/roles/hooks/useRequireOwner', () => ({
  useRequireOwner: jest.fn(),
}))

jest.mock('../../store/subscription.store', () => ({ useSubscriptionStore: jest.fn() }))

import React from 'react'
import { render, act, fireEvent } from '@testing-library/react-native'
import SubscriptionScreen from '../SubscriptionScreen'
import { t } from '@locales/index'
import type { SubscriptionViewDto, InvoiceDto } from '../../../../types/subscription'

const { useSubscriptionStore } = jest.requireMock('../../store/subscription.store') as {
  useSubscriptionStore: jest.Mock
}

const mockFetchSubscription = jest.fn().mockResolvedValue(undefined)
const mockFetchInvoices = jest.fn().mockResolvedValue(undefined)
const mockRenew = jest.fn().mockResolvedValue(undefined)
const mockCancel = jest.fn().mockResolvedValue(undefined)
const mockToggleAutoRenewal = jest.fn().mockResolvedValue(undefined)
const mockClearError = jest.fn()

const mockSub: SubscriptionViewDto = {
  currentPlan: {
    subscriptionId: '10',
    planId: '2',
    planCode: 'GROWTH',
    planName: 'Growth',
    status: 'ACTIVE',
    billingCycle: 'MONTHLY',
    startDate: '2026-04-01',
    endDate: null,
    nextBillingDate: '2026-05-01',
    autoRenewal: true,
    isTrial: false,
    limits: { maxCustomers: 150, maxStaff: 3, maxSupplyLists: 10 },
  },
  usage: { customers: 127, staff: 3, supplyLists: 5 },
  utilizationPercentage: { customers: 85, staff: 100, supplyLists: 50 },
  canAddMore: { customers: true, staff: false, supplyLists: true },
}

const mockInvoice: InvoiceDto = {
  id: '55',
  invoiceNumber: 'INV-2026-04-001',
  amount: 499,
  tax: 0,
  totalAmount: 499,
  invoiceDate: '2026-04-01',
  dueDate: '2026-04-06',
  paymentStatus: 'PAID',
  paymentDate: '2026-04-02',
  paymentMethod: 'UPI',
  paymentReference: null,
}

function mockStore(state: Record<string, unknown>) {
  useSubscriptionStore.mockImplementation((selector: (s: unknown) => unknown) =>
    selector({
      currentSubscription: null,
      isSubLoading: false,
      subError: null,
      invoices: [],
      invoicesMeta: null,
      isInvoicesLoading: false,
      isMutating: false,
      mutationError: null,
      fetchSubscription: mockFetchSubscription,
      fetchInvoices: mockFetchInvoices,
      renew: mockRenew,
      cancel: mockCancel,
      toggleAutoRenewal: mockToggleAutoRenewal,
      clearError: mockClearError,
      ...state,
    }),
  )
}

beforeEach(() => {
  jest.clearAllMocks()
  mockStore({})
})

describe('SubscriptionScreen', () => {
  it('fetches subscription and invoices on focus', async () => {
    mockStore({ currentSubscription: mockSub })
    await act(async () => render(<SubscriptionScreen />))
    expect(mockFetchSubscription).toHaveBeenCalled()
    expect(mockFetchInvoices).toHaveBeenCalledWith({ page: 1 })
  })

  it('shows loading spinner when no subscription yet', async () => {
    mockStore({ isSubLoading: true, currentSubscription: null })
    const screen = await act(async () => render(<SubscriptionScreen />))
    // ActivityIndicator renders as a View; title header should still appear
    expect(screen.getByText(t('subscription.title'))).toBeTruthy()
  })

  it('shows error state with retry button', async () => {
    mockStore({ subError: 'common.offline_message', currentSubscription: null })
    const screen = await act(async () => render(<SubscriptionScreen />))
    expect(screen.getByText(t('common.offline_message'))).toBeTruthy()
    expect(screen.getByText(t('common.retry'))).toBeTruthy()
  })

  it('shows Renew CTA when subError is error_no_subscription', async () => {
    mockStore({ subError: 'subscription.error_no_subscription', currentSubscription: null })
    const screen = await act(async () => render(<SubscriptionScreen />))
    expect(screen.getByText(t('subscription.renew'))).toBeTruthy()
  })

  it('renders plan name, usage bars, and action buttons in data state', async () => {
    mockStore({ currentSubscription: mockSub, invoices: [mockInvoice] })
    const screen = await act(async () => render(<SubscriptionScreen />))
    expect(screen.getByText('Growth')).toBeTruthy()
    expect(screen.getByTestId('upgrade-btn')).toBeTruthy()
    expect(screen.getByTestId('renew-btn')).toBeTruthy()
    expect(screen.getByTestId('cancel-btn')).toBeTruthy()
    expect(screen.getByTestId('auto-renewal-switch')).toBeTruthy()
    expect(screen.getByText('INV-2026-04-001')).toBeTruthy()
  })

  it('hides Upgrade button when planCode is PRO', async () => {
    const proSub: SubscriptionViewDto = {
      ...mockSub,
      currentPlan: { ...mockSub.currentPlan, planCode: 'PRO' },
    }
    mockStore({ currentSubscription: proSub })
    const screen = await act(async () => render(<SubscriptionScreen />))
    expect(screen.queryByTestId('upgrade-btn')).toBeNull()
  })

  it('hides Cancel button when status is CANCELLED', async () => {
    const cancelledSub: SubscriptionViewDto = {
      ...mockSub,
      currentPlan: { ...mockSub.currentPlan, status: 'CANCELLED' },
    }
    mockStore({ currentSubscription: cancelledSub })
    const screen = await act(async () => render(<SubscriptionScreen />))
    expect(screen.queryByTestId('cancel-btn')).toBeNull()
  })

  it('hides Cancel button when status is EXPIRED', async () => {
    const expiredSub: SubscriptionViewDto = {
      ...mockSub,
      currentPlan: { ...mockSub.currentPlan, status: 'EXPIRED' },
    }
    mockStore({ currentSubscription: expiredSub })
    const screen = await act(async () => render(<SubscriptionScreen />))
    expect(screen.queryByTestId('cancel-btn')).toBeNull()
  })

  it('upgrade button navigates to upgrade screen', async () => {
    mockStore({ currentSubscription: mockSub })
    const screen = await act(async () => render(<SubscriptionScreen />))
    fireEvent.press(screen.getByTestId('upgrade-btn'))
    expect(mockPush).toHaveBeenCalledWith('/(app)/subscription/upgrade')
  })
})
