/**
 * Customers Store (US-008)
 * Purpose: customer management state for the active vendor (owner + staff).
 *
 * - PII policy: list rows, detail records, bill, payments, and calendar all carry
 *   customer PII (name, phone, address, balance) → IN-MEMORY ONLY, never persisted.
 *   `partialize` persists ONLY `listListId` + `listStatus` (non-PII filter state)
 *   for UX continuity across app restarts.
 * - Writes (create/update/deactivate/subscription/payment/credit-limit) are
 *   ONLINE-ONLY — screens disable submit offline; the store does NOT queue.
 * - `removeSubscription` applies an OPTIMISTIC drop and ROLLS BACK on failure.
 * - `recordPayment`, `setCreditLimit`, `createCustomer`, and `updateCustomer` all
 *   re-fetch the affected customer detail after success because balance, utilization,
 *   and currentMonthBill change server-side.
 * - error fields hold i18n KEYS (never raw messages); failures go through the shared
 *   logger (correlationId, no PII) + mapApiError(_, 'customer', action).
 * - clearCustomers() wipes all local data; auth.store.logout() should call it.
 *   NOTE: auth.store is NOT owned here — wiring flagged to the orchestrator
 *   (same pattern as delivery.store / supplyLists.store).
 *
 * Security: vendorId always comes from auth.store.vendorContext (JWT-derived) —
 * never from route params or user input.
 */

import { Platform } from 'react-native'
import { create } from 'zustand'
import { persist, createJSONStorage, type StateStorage } from 'zustand/middleware'
import AsyncStorage from '@react-native-async-storage/async-storage'
import { customersService } from '../service/customers.service'
import type {
  ListCustomersOptions,
  ListPaymentsOptions,
} from '../service/customers.service'
import { useAuthStore } from '@modules/auth/store/auth.store'
import { mapApiError } from '@utils/errorMapper'
import { logError } from '@utils/logger'
import type {
  CustomerListItemDto,
  CustomerDetailDto,
  MonthlyBillDto,
  CustomerCalendarDto,
  PaymentDto,
  PaginationMeta,
  CustomerStatusFilter,
  CreateCustomerInput,
  UpdateCustomerInput,
  AddSubscriptionInput,
  RecordPaymentInput,
  SubscriptionDto,
} from '../../../types/customer'

// ---------------------------------------------------------------------------
// SSR-safe storage (same pattern as delivery.store / supplyLists.store)
// ---------------------------------------------------------------------------

function buildStorage(): StateStorage {
  if (Platform.OS !== 'web') return AsyncStorage
  if (typeof window === 'undefined') {
    return { getItem: () => null, setItem: () => {}, removeItem: () => {} }
  }
  return window.localStorage
}

// ---------------------------------------------------------------------------
// Auth helper — vendorId always from JWT context, never from user input
// ---------------------------------------------------------------------------

/** Resolves the active vendorId from auth state (JWT-derived). */
function getActiveVendorId(): string | null {
  return useAuthStore.getState().vendorContext?.vendorId ?? null
}

// ---------------------------------------------------------------------------
// State interface
// ---------------------------------------------------------------------------

export interface CustomersState {
  // List slice — PII (name, phone, address) → in-memory only.
  list: CustomerListItemDto[]
  listTotal: number
  listPage: number
  listSearch: string
  /** Non-PII filter — persisted for UX continuity. */
  listListId: string | null
  /** Non-PII filter — persisted for UX continuity. */
  listStatus: CustomerStatusFilter
  isListLoading: boolean
  listError: string | null

  // Detail slice — PII (name, phone, address, balance) → in-memory only.
  detail: Record<string, CustomerDetailDto>
  isDetailLoading: boolean
  detailError: string | null

  // Bill slice — owner-only, PII-adjacent → in-memory only. Keyed `${id}:${month}`.
  bill: Record<string, MonthlyBillDto>
  isBillLoading: boolean
  billError: string | null

  // Payments slice — owner-only, financial PII → in-memory only. Keyed by customerId.
  payments: Record<string, PaymentDto[]>
  paymentsMeta: Record<string, PaginationMeta>
  isPaymentsLoading: boolean
  paymentsError: string | null

  // Calendar slice — mixed (owner: amounts; staff: null) → in-memory only.
  // Keyed `${customerId}:${month}`.
  calendar: Record<string, CustomerCalendarDto>
  isCalendarLoading: boolean
  calendarError: string | null

  // Shared mutation flags (create/update/deactivate/subscription/payment/creditLimit).
  isMutating: boolean
  mutationError: string | null

  // ---------------------------------------------------------------------------
  // Queries
  // ---------------------------------------------------------------------------

  /**
   * Fetch the customer list (owner + staff).
   * Appends to `list` when `opts.page > 1` for infinite scroll; replaces otherwise.
   */
  fetchCustomers: (opts?: ListCustomersOptions) => Promise<void>

  /** Fetch a single customer's full detail. Caches by id. */
  fetchCustomer: (customerId: string) => Promise<void>

  /** Fetch the monthly bill for a customer. Cached by `${customerId}:${month}`. */
  fetchBill: (customerId: string, month: string) => Promise<void>

  /** Fetch paginated payment history for a customer. */
  fetchPayments: (customerId: string, opts?: ListPaymentsOptions) => Promise<void>

  /** Fetch the delivery calendar for a customer. Cached by `${customerId}:${month}`. */
  fetchCalendar: (customerId: string, month: string) => Promise<void>

  // ---------------------------------------------------------------------------
  // Filter setters (screens call these then re-fetch via useEffect)
  // ---------------------------------------------------------------------------

  setSearch: (search: string) => void
  setListFilter: (listId: string | null) => void
  setStatusFilter: (status: CustomerStatusFilter) => void

  // ---------------------------------------------------------------------------
  // Commands (online-only; screens must block offline before calling)
  // ---------------------------------------------------------------------------

  /**
   * Create a new customer.
   * Re-fetches and caches detail on success.
   * Returns the created CustomerDetailDto so the screen can navigate to it.
   */
  createCustomer: (input: CreateCustomerInput) => Promise<CustomerDetailDto>

  /**
   * Update a customer's profile (PATCH).
   * Re-fetches and caches detail on success.
   */
  updateCustomer: (customerId: string, input: UpdateCustomerInput) => Promise<void>

  /**
   * Soft-deactivate a customer (DELETE).
   * Evicts the customer from in-memory list and detail cache on success.
   */
  deactivateCustomer: (customerId: string) => Promise<void>

  /**
   * Add a supply-list subscription for a customer.
   * Appends the returned SubscriptionDto to the cached detail's subscriptions.
   */
  addSubscription: (customerId: string, input: AddSubscriptionInput) => Promise<SubscriptionDto>

  /**
   * Remove a supply-list subscription.
   * Optimistic: drops the row immediately and rolls back on failure.
   */
  removeSubscription: (customerId: string, subscriptionId: string) => Promise<void>

  /**
   * Record a payment for a customer.
   * Re-fetches detail after success (balance + currentMonthBill change server-side).
   * Returns the created PaymentDto.
   */
  recordPayment: (customerId: string, input: RecordPaymentInput) => Promise<PaymentDto>

  /**
   * Set the credit limit for a customer.
   * Re-fetches detail after success (creditLimit + creditUtilization change server-side).
   */
  setCreditLimit: (customerId: string, value: number) => Promise<void>

  // ---------------------------------------------------------------------------
  // Lifecycle
  // ---------------------------------------------------------------------------

  clearError: () => void

  /**
   * Wipe all in-memory and persisted customer data.
   * Called by auth.store.logout() — wiring owned by the orchestrator (NOT here).
   */
  clearCustomers: () => void
}

// ---------------------------------------------------------------------------
// Non-persisted initial state (PII-bearing or transient slices)
// ---------------------------------------------------------------------------

const initialNonPersisted = {
  list: [] as CustomerListItemDto[],
  listTotal: 0,
  listPage: 1,
  listSearch: '',
  isListLoading: false,
  listError: null as string | null,

  detail: {} as Record<string, CustomerDetailDto>,
  isDetailLoading: false,
  detailError: null as string | null,

  bill: {} as Record<string, MonthlyBillDto>,
  isBillLoading: false,
  billError: null as string | null,

  payments: {} as Record<string, PaymentDto[]>,
  paymentsMeta: {} as Record<string, PaginationMeta>,
  isPaymentsLoading: false,
  paymentsError: null as string | null,

  calendar: {} as Record<string, CustomerCalendarDto>,
  isCalendarLoading: false,
  calendarError: null as string | null,

  isMutating: false,
  mutationError: null as string | null,
}

// ---------------------------------------------------------------------------
// Store
// ---------------------------------------------------------------------------

export const useCustomersStore = create<CustomersState>()(
  persist(
    (set, get) => ({
      // Persisted filter state (non-PII).
      listListId: null,
      listStatus: 'all' as CustomerStatusFilter,

      // All other slices start as non-persisted defaults.
      ...initialNonPersisted,

      // -----------------------------------------------------------------------
      // Lifecycle
      // -----------------------------------------------------------------------

      clearError: () =>
        set({
          listError: null,
          detailError: null,
          billError: null,
          paymentsError: null,
          calendarError: null,
          mutationError: null,
        }),

      clearCustomers: () =>
        set({
          // Reset persisted filter state as well.
          listListId: null,
          listStatus: 'all',
          ...initialNonPersisted,
        }),

      // -----------------------------------------------------------------------
      // Filter setters
      // -----------------------------------------------------------------------

      setSearch: (search) => set({ listSearch: search, listPage: 1 }),

      setListFilter: (listId) => set({ listListId: listId, listPage: 1 }),

      setStatusFilter: (status) => set({ listStatus: status, listPage: 1 }),

      // -----------------------------------------------------------------------
      // Queries
      // -----------------------------------------------------------------------

      fetchCustomers: async (opts = {}) => {
        const vendorId = getActiveVendorId()
        if (!vendorId) return
        const { listSearch, listListId, listStatus } = get()
        const page = opts.page ?? 1
        set({ isListLoading: true, listError: null })
        try {
          const result = await customersService.listCustomers(vendorId, {
            search: opts.search ?? (listSearch || undefined),
            listId: opts.listId ?? (listListId ?? undefined),
            status: opts.status ?? listStatus,
            page,
            limit: opts.limit ?? 20,
          })
          set((s) => ({
            // Append for infinite scroll (page > 1), replace otherwise.
            list: page > 1 ? [...s.list, ...result.customers] : result.customers,
            listTotal: result.total,
            listPage: page,
            isListLoading: false,
          }))
        } catch (err) {
          void logError(err, {
            screen: 'CustomerList',
            action: 'fetchCustomers',
            endpoint: 'GET /vendors/:id/customers',
          })
          const key = mapApiError(err, 'customer')
          const isOffline = key === 'common.offline_message'
          set((s) => ({
            isListLoading: false,
            listError: key,
            // Offline: preserve cached list. API error: clear stale rows.
            ...(isOffline ? {} : { list: page > 1 ? s.list : [], listTotal: 0 }),
          }))
        }
      },

      fetchCustomer: async (customerId) => {
        const vendorId = getActiveVendorId()
        if (!vendorId) return
        set({ isDetailLoading: true, detailError: null })
        try {
          const customer = await customersService.getCustomer(vendorId, customerId)
          set((s) => ({
            detail: { ...s.detail, [customerId]: customer },
            isDetailLoading: false,
          }))
        } catch (err) {
          void logError(err, {
            screen: 'CustomerDetail',
            action: 'fetchCustomer',
            endpoint: 'GET /vendors/:id/customers/:customerId',
          })
          set({ isDetailLoading: false, detailError: mapApiError(err, 'customer') })
        }
      },

      fetchBill: async (customerId, month) => {
        const vendorId = getActiveVendorId()
        if (!vendorId) return
        const cacheKey = `${customerId}:${month}`
        set({ isBillLoading: true, billError: null })
        try {
          const bill = await customersService.getBill(vendorId, customerId, month)
          set((s) => ({
            bill: { ...s.bill, [cacheKey]: bill },
            isBillLoading: false,
          }))
        } catch (err) {
          void logError(err, {
            screen: 'CustomerDetail',
            action: 'fetchBill',
            endpoint: 'GET /vendors/:id/customers/:customerId/bill/:month',
          })
          set({ isBillLoading: false, billError: mapApiError(err, 'customer') })
        }
      },

      fetchPayments: async (customerId, opts = {}) => {
        const vendorId = getActiveVendorId()
        if (!vendorId) return
        set({ isPaymentsLoading: true, paymentsError: null })
        try {
          const result = await customersService.listPayments(vendorId, customerId, opts)
          const page = opts.page ?? 1
          set((s) => ({
            payments: {
              ...s.payments,
              // Append for load-more, replace for pull-to-refresh.
              [customerId]: page > 1
                ? [...(s.payments[customerId] ?? []), ...result.data]
                : result.data,
            },
            paymentsMeta: { ...s.paymentsMeta, [customerId]: result.meta },
            isPaymentsLoading: false,
          }))
        } catch (err) {
          void logError(err, {
            screen: 'PaymentHistory',
            action: 'fetchPayments',
            endpoint: 'GET /vendors/:id/customers/:customerId/payments',
          })
          set({ isPaymentsLoading: false, paymentsError: mapApiError(err, 'customer') })
        }
      },

      fetchCalendar: async (customerId, month) => {
        const vendorId = getActiveVendorId()
        if (!vendorId) return
        const cacheKey = `${customerId}:${month}`
        set({ isCalendarLoading: true, calendarError: null })
        try {
          const calendar = await customersService.getCalendar(vendorId, customerId, month)
          set((s) => ({
            calendar: { ...s.calendar, [cacheKey]: calendar },
            isCalendarLoading: false,
          }))
        } catch (err) {
          void logError(err, {
            screen: 'CustomerCalendar',
            action: 'fetchCalendar',
            endpoint: 'GET /vendors/:id/customers/:customerId/calendar/:month',
          })
          set({ isCalendarLoading: false, calendarError: mapApiError(err, 'customer') })
        }
      },

      // -----------------------------------------------------------------------
      // Commands
      // -----------------------------------------------------------------------

      createCustomer: async (input) => {
        const vendorId = getActiveVendorId()
        if (!vendorId) throw new Error('customer.error_create_failed')
        set({ isMutating: true, mutationError: null })
        try {
          const customer = await customersService.createCustomer(vendorId, input)
          // Cache detail immediately so the detail screen renders without a second request.
          set((s) => ({
            detail: { ...s.detail, [customer.id]: customer },
            isMutating: false,
          }))
          // Re-fetch detail to ensure server-computed fields (balance etc.) are fresh.
          void get().fetchCustomer(customer.id)
          return customer
        } catch (err) {
          void logError(err, {
            screen: 'AddCustomer',
            action: 'createCustomer',
            endpoint: 'POST /vendors/:id/customers',
          })
          const key = mapApiError(err, 'customer', 'create')
          set({ isMutating: false, mutationError: key })
          throw err
        }
      },

      updateCustomer: async (customerId, input) => {
        const vendorId = getActiveVendorId()
        if (!vendorId) throw new Error('customer.error_update_failed')
        set({ isMutating: true, mutationError: null })
        try {
          const updated = await customersService.updateCustomer(vendorId, customerId, input)
          // Cache the returned detail immediately.
          set((s) => ({
            detail: { ...s.detail, [customerId]: updated },
            isMutating: false,
          }))
          // Re-fetch to get latest server-computed state.
          void get().fetchCustomer(customerId)
        } catch (err) {
          void logError(err, {
            screen: 'EditCustomer',
            action: 'updateCustomer',
            endpoint: 'PATCH /vendors/:id/customers/:customerId',
          })
          const key = mapApiError(err, 'customer', 'update')
          set({ isMutating: false, mutationError: key })
          throw err
        }
      },

      deactivateCustomer: async (customerId) => {
        const vendorId = getActiveVendorId()
        if (!vendorId) throw new Error('customer.error_update_failed')
        set({ isMutating: true, mutationError: null })
        try {
          await customersService.deactivateCustomer(vendorId, customerId)
          // Evict from in-memory caches — the customer is now inactive.
          set((s) => {
            const { [customerId]: _dropped, ...remainingDetail } = s.detail
            return {
              list: s.list.filter((c) => c.id !== customerId),
              listTotal: Math.max(0, s.listTotal - 1),
              detail: remainingDetail,
              isMutating: false,
            }
          })
        } catch (err) {
          void logError(err, {
            screen: 'CustomerDetail',
            action: 'deactivateCustomer',
            endpoint: 'DELETE /vendors/:id/customers/:customerId',
          })
          const key = mapApiError(err, 'customer', 'deactivate')
          set({ isMutating: false, mutationError: key })
          throw err
        }
      },

      addSubscription: async (customerId, input) => {
        const vendorId = getActiveVendorId()
        if (!vendorId) throw new Error('customer.error_create_failed')
        set({ isMutating: true, mutationError: null })
        try {
          const sub = await customersService.addSubscription(vendorId, customerId, input)
          // Append to cached detail's subscriptions so the detail screen updates.
          set((s) => {
            const existing = s.detail[customerId]
            return {
              detail: existing
                ? {
                    ...s.detail,
                    [customerId]: {
                      ...existing,
                      subscriptions: [...existing.subscriptions, sub],
                    },
                  }
                : s.detail,
              isMutating: false,
            }
          })
          return sub
        } catch (err) {
          void logError(err, {
            screen: 'AddSubscription',
            action: 'addSubscription',
            endpoint: 'POST /vendors/:id/customers/:customerId/subscriptions',
          })
          const key = mapApiError(err, 'customer', 'add_subscription')
          set({ isMutating: false, mutationError: key })
          throw err
        }
      },

      removeSubscription: async (customerId, subscriptionId) => {
        const vendorId = getActiveVendorId()
        if (!vendorId) throw new Error('customer.error_update_failed')

        // Optimistic: drop the subscription row immediately.
        const prevDetail = get().detail[customerId]
        set((s) => {
          const existing = s.detail[customerId]
          return {
            detail: existing
              ? {
                  ...s.detail,
                  [customerId]: {
                    ...existing,
                    subscriptions: existing.subscriptions.filter(
                      (sub: SubscriptionDto) => sub.subscriptionId !== subscriptionId,
                    ),
                  },
                }
              : s.detail,
            isMutating: true,
            mutationError: null,
          }
        })

        try {
          await customersService.removeSubscription(vendorId, customerId, subscriptionId)
          set({ isMutating: false })
        } catch (err) {
          // Rollback — restore the previous detail state.
          set((s) => ({
            detail: prevDetail
              ? { ...s.detail, [customerId]: prevDetail }
              : s.detail,
            isMutating: false,
            mutationError: mapApiError(err, 'customer', 'remove_subscription'),
          }))
          void logError(err, {
            screen: 'CustomerDetail',
            action: 'removeSubscription',
            endpoint: 'DELETE /vendors/:id/customers/:customerId/subscriptions/:subId',
          })
          throw err
        }
      },

      recordPayment: async (customerId, input) => {
        const vendorId = getActiveVendorId()
        if (!vendorId) throw new Error('customer.error_create_failed')
        set({ isMutating: true, mutationError: null })
        try {
          const payment = await customersService.recordPayment(vendorId, customerId, input)
          set({ isMutating: false })
          // Re-fetch detail — balance and currentMonthBill change server-side.
          void get().fetchCustomer(customerId)
          return payment
        } catch (err) {
          void logError(err, {
            screen: 'RecordPayment',
            action: 'recordPayment',
            endpoint: 'POST /vendors/:id/customers/:customerId/payments',
          })
          const key = mapApiError(err, 'customer', 'record_payment')
          set({ isMutating: false, mutationError: key })
          throw err
        }
      },

      setCreditLimit: async (customerId, value) => {
        const vendorId = getActiveVendorId()
        if (!vendorId) throw new Error('customer.error_update_failed')
        set({ isMutating: true, mutationError: null })
        try {
          const result = await customersService.setCreditLimit(vendorId, customerId, value)
          // Patch the cached detail immediately with the returned values.
          set((s) => {
            const existing = s.detail[customerId]
            return {
              detail: existing
                ? {
                    ...s.detail,
                    [customerId]: {
                      ...existing,
                      creditLimit: result.creditLimit,
                      creditUtilization: result.creditUtilization,
                    },
                  }
                : s.detail,
              isMutating: false,
            }
          })
          // Re-fetch detail — server may recompute other fields too.
          void get().fetchCustomer(customerId)
        } catch (err) {
          void logError(err, {
            screen: 'SetCreditLimit',
            action: 'setCreditLimit',
            endpoint: 'PATCH /vendors/:id/customers/:customerId/credit-limit',
          })
          const key = mapApiError(err, 'customer', 'set_credit_limit')
          set({ isMutating: false, mutationError: key })
          throw err
        }
      },
    }),
    {
      name: 'customers-storage',
      storage: createJSONStorage(() => buildStorage()),
      /**
       * Persist ONLY non-PII filter state for UX continuity:
       *   - `listListId`  — selected supply-list filter (an opaque ID, not PII)
       *   - `listStatus`  — selected status filter (enum string, not PII)
       *
       * Everything else (list rows, detail, bill, payments, calendar) carries customer
       * PII (name, phone, address, balance, transaction amounts) and is DELIBERATELY
       * OMITTED — in-memory only, wiped on app restart or clearCustomers().
       *
       * Mirror of the delivery.store.ts pattern comment.
       */
      partialize: (state) => ({
        listListId: state.listListId,
        listStatus: state.listStatus,
      }),
    },
  ),
)

export default useCustomersStore
