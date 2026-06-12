/**
 * Subscription Store Tests (US-009)
 * Purpose: unit tests for the subscription store with a mocked service. Covers:
 *   - vendorId pulled from auth state (JWT-derived, never from user input)
 *   - fetchSubscription / fetchPlans / fetchInvoices populate slices; error → i18n KEY
 *   - fetchInvoices appends on page > 1, replaces on page 1
 *   - upgrade / renew refetch subscription + prepend invoice
 *   - cancel patches currentSubscription in-place (no full refetch)
 *   - toggleAutoRenewal optimistic update + rollback on failure
 *   - partialize persists ONLY `plans`; clearSubscription wipes all slices
 *
 * Pattern: mirrors audit.store.test.ts from US-007.
 */

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

jest.mock('@services/config', () => ({
  isMockMode: true,
  API_MODE: 'mock',
  API_CONFIG: { baseUrl: 'http://localhost:3000/api', socketUrl: '', timeout: 30000, mockDelay: 0 },
  simulateNetworkDelay: jest.fn().mockResolvedValue(undefined),
}))

jest.mock('../../service/subscription.service', () => ({
  subscriptionService: {
    getPlans: jest.fn(),
    getSubscription: jest.fn(),
    getInvoices: jest.fn(),
    upgradeSubscription: jest.fn(),
    renewSubscription: jest.fn(),
    cancelSubscription: jest.fn(),
    toggleAutoRenewal: jest.fn(),
  },
}))

import axios from 'axios'
import { subscriptionService } from '../../service/subscription.service'
import { useSubscriptionStore } from '../subscription.store'
import { useAuthStore } from '@modules/auth/store/auth.store'
import type { SubscriptionViewDto, PlanDto, InvoiceDto, PaginationMeta } from '../../../../types/subscription'

const svc = subscriptionService as jest.Mocked<typeof subscriptionService>
const VENDOR_ID = 'vendor-99'

function setActiveVendor(vendorId: string | null): void {
  useAuthStore.setState({
    vendorContext: vendorId
      ? { vendorId, vendorName: 'Test Vendor', role: 'owner' }
      : null,
  })
}

/** Builds an axios-shaped error with a given HTTP status (or none = network error). */
function axiosError(status?: number): unknown {
  return {
    isAxiosError: true,
    response: status
      ? { status, data: { error: { code: 'ERR', correlationId: 'cid' } } }
      : undefined,
    config: { url: '/test' },
  }
}

const mockPlan: PlanDto = {
  id: '2',
  planCode: 'GROWTH',
  planName: 'Growth',
  maxCustomers: 150,
  maxStaff: 3,
  maxSupplyLists: 10,
  priceMonthly: 499,
  priceYearly: 4990,
  features: { basic_delivery_tracking: true, customer_management: true },
}

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
  paymentReference: 'UPI123456',
}

const mockMeta: PaginationMeta = { page: 1, limit: 20, total: 1, totalPages: 1 }

beforeEach(() => {
  jest.clearAllMocks()
  jest.spyOn(axios, 'isAxiosError').mockImplementation(
    (e: unknown): e is import('axios').AxiosError =>
      !!e && typeof e === 'object' && (e as { isAxiosError?: boolean }).isAxiosError === true,
  )
  setActiveVendor(VENDOR_ID)
  useSubscriptionStore.getState().clearSubscription()
})

describe('useSubscriptionStore', () => {
  // ---------------------------------------------------------------------------
  // Guard: no vendor → no fetch
  // ---------------------------------------------------------------------------
  it('does not call the service when there is no active vendor', async () => {
    setActiveVendor(null)
    await useSubscriptionStore.getState().fetchSubscription()
    expect(svc.getSubscription).not.toHaveBeenCalled()
  })

  // ---------------------------------------------------------------------------
  // fetchSubscription
  // ---------------------------------------------------------------------------
  it('fetchSubscription populates currentSubscription', async () => {
    svc.getSubscription.mockResolvedValue(mockSub)
    await useSubscriptionStore.getState().fetchSubscription()
    const s = useSubscriptionStore.getState()
    expect(s.currentSubscription).not.toBeNull()
    expect(s.currentSubscription!.currentPlan.planCode).toBe('GROWTH')
    expect(s.subError).toBeNull()
    expect(s.isSubLoading).toBe(false)
  })

  it('passes JWT-derived vendorId to getSubscription', async () => {
    svc.getSubscription.mockResolvedValue(mockSub)
    await useSubscriptionStore.getState().fetchSubscription()
    expect(svc.getSubscription).toHaveBeenCalledWith(VENDOR_ID)
  })

  it('fetchSubscription error sets subError as an i18n key', async () => {
    svc.getSubscription.mockRejectedValue(axiosError(403))
    await useSubscriptionStore.getState().fetchSubscription()
    const s = useSubscriptionStore.getState()
    expect(s.subError).toBe('roles.error_forbidden')
    expect(s.currentSubscription).toBeNull()
  })

  // ---------------------------------------------------------------------------
  // fetchPlans
  // ---------------------------------------------------------------------------
  it('fetchPlans populates plans', async () => {
    svc.getPlans.mockResolvedValue([mockPlan])
    await useSubscriptionStore.getState().fetchPlans()
    const s = useSubscriptionStore.getState()
    expect(s.plans).toHaveLength(1)
    expect(s.plans[0]!.planCode).toBe('GROWTH')
    expect(s.plansError).toBeNull()
  })

  it('fetchPlans error sets plansError', async () => {
    svc.getPlans.mockRejectedValue(axiosError(500))
    await useSubscriptionStore.getState().fetchPlans()
    expect(useSubscriptionStore.getState().plansError).not.toBeNull()
  })

  // ---------------------------------------------------------------------------
  // fetchInvoices
  // ---------------------------------------------------------------------------
  it('fetchInvoices populates invoices on page 1', async () => {
    svc.getInvoices.mockResolvedValue({ data: [mockInvoice], meta: mockMeta })
    await useSubscriptionStore.getState().fetchInvoices()
    const s = useSubscriptionStore.getState()
    expect(s.invoices).toHaveLength(1)
    expect(s.invoicesMeta).not.toBeNull()
  })

  it('fetchInvoices appends on page > 1', async () => {
    const inv2: InvoiceDto = { ...mockInvoice, id: '56' }
    svc.getInvoices.mockResolvedValueOnce({ data: [mockInvoice], meta: { ...mockMeta, total: 2, totalPages: 2 } })
    await useSubscriptionStore.getState().fetchInvoices({ page: 1 })
    svc.getInvoices.mockResolvedValueOnce({ data: [inv2], meta: { ...mockMeta, page: 2 } })
    await useSubscriptionStore.getState().fetchInvoices({ page: 2 })
    expect(useSubscriptionStore.getState().invoices.map((i) => i.id)).toEqual(['55', '56'])
  })

  it('fetchInvoices replaces on page 1', async () => {
    const inv2: InvoiceDto = { ...mockInvoice, id: '99' }
    svc.getInvoices.mockResolvedValueOnce({ data: [mockInvoice], meta: mockMeta })
    await useSubscriptionStore.getState().fetchInvoices({ page: 1 })
    svc.getInvoices.mockResolvedValueOnce({ data: [inv2], meta: mockMeta })
    await useSubscriptionStore.getState().fetchInvoices({ page: 1 })
    expect(useSubscriptionStore.getState().invoices.map((i) => i.id)).toEqual(['99'])
  })

  // ---------------------------------------------------------------------------
  // upgrade
  // ---------------------------------------------------------------------------
  it('upgrade refetches subscription and prepends invoice', async () => {
    // Seed existing state.
    svc.getSubscription.mockResolvedValue({ ...mockSub, currentPlan: { ...mockSub.currentPlan, planCode: 'GROWTH' } })
    await useSubscriptionStore.getState().fetchSubscription()

    const proSub: SubscriptionViewDto = { ...mockSub, currentPlan: { ...mockSub.currentPlan, planCode: 'PRO' } }
    svc.getSubscription.mockResolvedValue(proSub)
    svc.upgradeSubscription.mockResolvedValue({
      subscription: { subscriptionId: '11', planId: '3', planCode: 'PRO', planName: 'Pro', status: 'ACTIVE', billingCycle: 'MONTHLY', startDate: '2026-04-15', endDate: null, nextBillingDate: '2026-05-15', autoRenewal: true },
      invoice: { id: '57', invoiceNumber: 'INV-NEW', amount: 250, tax: 0, totalAmount: 250, invoiceDate: '2026-04-15', dueDate: '2026-04-20', paymentStatus: 'PENDING', paymentUrl: 'http://pay.example.com' },
    })

    await useSubscriptionStore.getState().upgrade('3', 'MONTHLY')

    const s = useSubscriptionStore.getState()
    expect(s.currentSubscription!.currentPlan.planCode).toBe('PRO')
    expect(s.invoices[0]!.id).toBe('57')
    expect(s.isMutating).toBe(false)
  })

  it('upgrade throws and sets mutationError on failure', async () => {
    svc.upgradeSubscription.mockRejectedValue(axiosError(422))
    await expect(useSubscriptionStore.getState().upgrade('3', 'MONTHLY')).rejects.toBeTruthy()
    // mapApiError(_, 'subscription', 'upgrade') maps 422 → error_not_higher_tier
    expect(useSubscriptionStore.getState().mutationError).toBe('subscription.error_not_higher_tier')
  })

  // ---------------------------------------------------------------------------
  // cancel
  // ---------------------------------------------------------------------------
  it('cancel patches currentSubscription status to CANCELLED in-place', async () => {
    svc.getSubscription.mockResolvedValue(mockSub)
    await useSubscriptionStore.getState().fetchSubscription()

    svc.cancelSubscription.mockResolvedValue({
      subscriptionId: '10',
      status: 'CANCELLED',
      autoRenewal: false,
      activeUntil: '2026-05-01',
    })

    await useSubscriptionStore.getState().cancel()
    const s = useSubscriptionStore.getState()
    expect(s.currentSubscription!.currentPlan.status).toBe('CANCELLED')
    expect(s.currentSubscription!.currentPlan.autoRenewal).toBe(false)
  })

  // ---------------------------------------------------------------------------
  // toggleAutoRenewal — optimistic + rollback
  // ---------------------------------------------------------------------------
  it('toggleAutoRenewal optimistically updates autoRenewal', async () => {
    svc.getSubscription.mockResolvedValue(mockSub)
    await useSubscriptionStore.getState().fetchSubscription()

    svc.toggleAutoRenewal.mockResolvedValue({ subscriptionId: '10', autoRenewal: false })
    await useSubscriptionStore.getState().toggleAutoRenewal(false)

    expect(useSubscriptionStore.getState().currentSubscription!.currentPlan.autoRenewal).toBe(false)
  })

  it('toggleAutoRenewal rolls back on failure', async () => {
    svc.getSubscription.mockResolvedValue(mockSub)
    await useSubscriptionStore.getState().fetchSubscription()
    // Original is autoRenewal: true (from mockSub).

    svc.toggleAutoRenewal.mockRejectedValue(axiosError(500))
    await expect(useSubscriptionStore.getState().toggleAutoRenewal(false)).rejects.toBeTruthy()

    // Should have rolled back to original (true).
    expect(useSubscriptionStore.getState().currentSubscription!.currentPlan.autoRenewal).toBe(true)
  })

  // ---------------------------------------------------------------------------
  // partialize + clearSubscription
  // ---------------------------------------------------------------------------
  it('partialize persists ONLY plans (no PII slices)', () => {
    const persisted = useSubscriptionStore.persist.getOptions().partialize?.({
      ...useSubscriptionStore.getState(),
      plans: [mockPlan],
      currentSubscription: mockSub,
      invoices: [mockInvoice],
    } as never) as Record<string, unknown>

    expect(Object.keys(persisted)).toEqual(['plans'])
    expect(persisted.currentSubscription).toBeUndefined()
    expect(persisted.invoices).toBeUndefined()
  })

  it('clearSubscription wipes all slices including persisted plans', async () => {
    svc.getPlans.mockResolvedValue([mockPlan])
    await useSubscriptionStore.getState().fetchPlans()
    svc.getSubscription.mockResolvedValue(mockSub)
    await useSubscriptionStore.getState().fetchSubscription()

    useSubscriptionStore.getState().clearSubscription()
    const s = useSubscriptionStore.getState()
    expect(s.plans).toEqual([])
    expect(s.currentSubscription).toBeNull()
    expect(s.invoices).toEqual([])
    expect(s.mutationError).toBeNull()
  })

  // ---------------------------------------------------------------------------
  // clearError
  // ---------------------------------------------------------------------------
  it('clearError resets all error slices', async () => {
    svc.getSubscription.mockRejectedValue(axiosError(403))
    await useSubscriptionStore.getState().fetchSubscription()
    expect(useSubscriptionStore.getState().subError).not.toBeNull()

    useSubscriptionStore.getState().clearError()
    expect(useSubscriptionStore.getState().subError).toBeNull()
    expect(useSubscriptionStore.getState().plansError).toBeNull()
    expect(useSubscriptionStore.getState().invoicesError).toBeNull()
    expect(useSubscriptionStore.getState().mutationError).toBeNull()
  })
})
