/**
 * Subscription Store (US-009)
 * Purpose: Subscription & pricing state for the active vendor (owner-scoped).
 *
 * - PII policy: `currentSubscription` (billing dates) and `invoices` (amounts,
 *   references) are IN-MEMORY ONLY, never persisted. `partialize` persists ONLY
 *   the `plans` catalog (plan names, limits, prices — public, non-PII) for fast
 *   upgrade-screen paint. Matches the customers/audit partialize discipline.
 * - Commands (upgrade/renew/cancel/toggleAutoRenewal) are ONLINE-ONLY — screens
 *   disable command buttons offline.
 * - `toggleAutoRenewal` uses OPTIMISTIC update with rollback on failure (OQ-6).
 * - error fields hold i18n KEYS (never raw messages); failures go through the shared
 *   logger (correlationId, no PII) + mapApiError(_, 'subscription', action).
 * - `clearSubscription()` wipes all slices incl. persisted `plans`; called by
 *   auth.store.logout() (lazy-require, same pattern as clearCustomers/clearAudit).
 *
 * Security: vendorId always from auth.store.vendorContext (JWT-derived) — never
 * from route params or user input.
 */

import { Platform } from 'react-native'
import { create } from 'zustand'
import { persist, createJSONStorage, type StateStorage } from 'zustand/middleware'
import AsyncStorage from '@react-native-async-storage/async-storage'
import { subscriptionService } from '../service/subscription.service'
import { useAuthStore } from '@modules/auth/store/auth.store'
import { mapApiError } from '@utils/errorMapper'
import { logError } from '@utils/logger'
import type {
  PlanDto,
  SubscriptionViewDto,
  InvoiceDto,
  PaginationMeta,
  BillingCycle,
  ListInvoicesOptions,
} from '../../../types/subscription'

// ---------------------------------------------------------------------------
// SSR-safe storage (same pattern as customers.store / audit.store)
// ---------------------------------------------------------------------------

function buildStorage(): StateStorage {
  if (Platform.OS !== 'web') return AsyncStorage
  if (typeof window === 'undefined') {
    return { getItem: () => null, setItem: () => {}, removeItem: () => {} }
  }
  return window.localStorage
}

/** Resolves the active vendorId from auth state (JWT-derived). */
function getActiveVendorId(): string | null {
  return useAuthStore.getState().vendorContext?.vendorId ?? null
}

// ---------------------------------------------------------------------------
// State interface
// ---------------------------------------------------------------------------

export interface SubscriptionState {
  // Current subscription slice — PII-adjacent (billing dates) → in-memory only.
  currentSubscription: SubscriptionViewDto | null
  isSubLoading: boolean
  subError: string | null

  // Plan catalog — non-PII (names, limits, prices); PERSISTED for fast paint.
  plans: PlanDto[]
  isPlansLoading: boolean
  plansError: string | null

  // Invoices slice — financial PII (amounts, references) → in-memory only.
  invoices: InvoiceDto[]
  invoicesMeta: PaginationMeta | null
  isInvoicesLoading: boolean
  invoicesError: string | null

  // Shared mutation state (upgrade, renew, cancel, auto-renewal).
  isMutating: boolean
  mutationError: string | null

  // ---------------------------------------------------------------------------
  // Queries
  // ---------------------------------------------------------------------------

  /** GET /vendors/:id/subscription — fetched by SubscriptionScreen + Banner. */
  fetchSubscription: () => Promise<void>
  /** GET /subscription-plans — fetched by UpgradePlanScreen. */
  fetchPlans: () => Promise<void>
  /** GET /vendors/:id/subscription/invoices — paginated; appends on page > 1. */
  fetchInvoices: (opts?: ListInvoicesOptions) => Promise<void>

  // ---------------------------------------------------------------------------
  // Commands (online-only)
  // ---------------------------------------------------------------------------

  /** Upgrade to a strictly higher-tier plan. Refetches subscription + prepends invoice. */
  upgrade: (newPlanId: string, billingCycle: BillingCycle) => Promise<void>
  /** Manually renew for another billing period. Refetches subscription + prepends invoice. */
  renew: (billingCycle: BillingCycle) => Promise<void>
  /** Cancel the subscription. Patches currentSubscription in-place. */
  cancel: () => Promise<void>
  /** Optimistically toggle auto-renewal. Rolls back on failure. */
  toggleAutoRenewal: (enabled: boolean) => Promise<void>

  // ---------------------------------------------------------------------------
  // Lifecycle
  // ---------------------------------------------------------------------------

  clearError: () => void
  /** Wipe all slices incl. persisted `plans`. Called by auth.store.logout(). */
  clearSubscription: () => void
}

// ---------------------------------------------------------------------------
// Non-persisted initial state
// ---------------------------------------------------------------------------

const initialNonPersisted = {
  currentSubscription: null as SubscriptionViewDto | null,
  isSubLoading: false,
  subError: null as string | null,

  invoices: [] as InvoiceDto[],
  invoicesMeta: null as PaginationMeta | null,
  isInvoicesLoading: false,
  invoicesError: null as string | null,

  isMutating: false,
  mutationError: null as string | null,
}

// ---------------------------------------------------------------------------
// Store
// ---------------------------------------------------------------------------

export const useSubscriptionStore = create<SubscriptionState>()(
  persist(
    (set, get) => ({
      // Persisted (non-PII plan catalog).
      plans: [] as PlanDto[],
      isPlansLoading: false,
      plansError: null as string | null,

      ...initialNonPersisted,

      // -----------------------------------------------------------------------
      // Lifecycle
      // -----------------------------------------------------------------------

      clearError: () => set({ subError: null, plansError: null, invoicesError: null, mutationError: null }),

      clearSubscription: () =>
        set({
          plans: [],
          isPlansLoading: false,
          plansError: null,
          ...initialNonPersisted,
        }),

      // -----------------------------------------------------------------------
      // Queries
      // -----------------------------------------------------------------------

      fetchSubscription: async () => {
        const vendorId = getActiveVendorId()
        if (!vendorId) return
        set({ isSubLoading: true, subError: null })
        try {
          const result = await subscriptionService.getSubscription(vendorId)
          set({ currentSubscription: result, isSubLoading: false })
        } catch (err) {
          void logError(err, {
            screen: 'SubscriptionScreen',
            action: 'fetchSubscription',
            endpoint: 'GET /vendors/:id/subscription',
          })
          set({ isSubLoading: false, subError: mapApiError(err, 'subscription') })
        }
      },

      fetchPlans: async () => {
        set({ isPlansLoading: true, plansError: null })
        try {
          const plans = await subscriptionService.getPlans()
          set({ plans, isPlansLoading: false })
        } catch (err) {
          void logError(err, {
            screen: 'UpgradePlanScreen',
            action: 'fetchPlans',
            endpoint: 'GET /subscription-plans',
          })
          set({ isPlansLoading: false, plansError: mapApiError(err, 'subscription') })
        }
      },

      fetchInvoices: async (opts = {}) => {
        const vendorId = getActiveVendorId()
        if (!vendorId) return
        const page = opts.page ?? 1
        set({ isInvoicesLoading: true, invoicesError: null })
        try {
          const result = await subscriptionService.getInvoices(vendorId, opts)
          set((s) => ({
            invoices: page > 1 ? [...s.invoices, ...result.data] : result.data,
            invoicesMeta: result.meta,
            isInvoicesLoading: false,
          }))
        } catch (err) {
          void logError(err, {
            screen: 'SubscriptionScreen',
            action: 'fetchInvoices',
            endpoint: 'GET /vendors/:id/subscription/invoices',
          })
          set({ isInvoicesLoading: false, invoicesError: mapApiError(err, 'subscription') })
        }
      },

      // -----------------------------------------------------------------------
      // Commands
      // -----------------------------------------------------------------------

      upgrade: async (newPlanId, billingCycle) => {
        const vendorId = getActiveVendorId()
        if (!vendorId) return
        set({ isMutating: true, mutationError: null })
        try {
          const result = await subscriptionService.upgradeSubscription(vendorId, newPlanId, billingCycle)
          // Refetch subscription (limits change after upgrade) + prepend invoice.
          await get().fetchSubscription()
          const upgradeInvoice = { ...result.invoice, paymentDate: null, paymentMethod: null, paymentReference: null }
          set((s) => ({
            invoices: [upgradeInvoice, ...s.invoices],
            isMutating: false,
          }))
        } catch (err) {
          void logError(err, {
            screen: 'UpgradePlanScreen',
            action: 'upgrade',
            endpoint: 'POST /vendors/:id/subscription/upgrade',
          })
          set({ isMutating: false, mutationError: mapApiError(err, 'subscription', 'upgrade') })
          throw err
        }
      },

      renew: async (billingCycle) => {
        const vendorId = getActiveVendorId()
        if (!vendorId) return
        set({ isMutating: true, mutationError: null })
        try {
          const result = await subscriptionService.renewSubscription(vendorId, billingCycle)
          await get().fetchSubscription()
          const renewInvoice = { ...result.invoice, paymentDate: null, paymentMethod: null, paymentReference: null }
          set((s) => ({
            invoices: [renewInvoice, ...s.invoices],
            isMutating: false,
          }))
        } catch (err) {
          void logError(err, {
            screen: 'SubscriptionScreen',
            action: 'renew',
            endpoint: 'POST /vendors/:id/subscription/renew',
          })
          set({ isMutating: false, mutationError: mapApiError(err, 'subscription', 'renew') })
          throw err
        }
      },

      cancel: async () => {
        const vendorId = getActiveVendorId()
        if (!vendorId) return
        set({ isMutating: true, mutationError: null })
        try {
          const result = await subscriptionService.cancelSubscription(vendorId)
          // Patch currentSubscription in-place (no full refetch needed — plan limits unchanged).
          set((s) => ({
            currentSubscription: s.currentSubscription
              ? {
                  ...s.currentSubscription,
                  currentPlan: {
                    ...s.currentSubscription.currentPlan,
                    status: result.status,
                    autoRenewal: result.autoRenewal,
                  },
                }
              : null,
            isMutating: false,
          }))
        } catch (err) {
          void logError(err, {
            screen: 'SubscriptionScreen',
            action: 'cancel',
            endpoint: 'POST /vendors/:id/subscription/cancel',
          })
          set({ isMutating: false, mutationError: mapApiError(err, 'subscription', 'cancel') })
          throw err
        }
      },

      toggleAutoRenewal: async (enabled) => {
        const vendorId = getActiveVendorId()
        if (!vendorId) return
        // Optimistic update.
        const previousSubscription = get().currentSubscription
        set((s) => ({
          currentSubscription: s.currentSubscription
            ? {
                ...s.currentSubscription,
                currentPlan: {
                  ...s.currentSubscription.currentPlan,
                  autoRenewal: enabled,
                },
              }
            : null,
        }))
        try {
          await subscriptionService.toggleAutoRenewal(vendorId, enabled)
        } catch (err) {
          // Rollback on failure.
          set({ currentSubscription: previousSubscription })
          void logError(err, {
            screen: 'SubscriptionScreen',
            action: 'toggleAutoRenewal',
            endpoint: 'PATCH /vendors/:id/subscription/auto-renewal',
          })
          set({ mutationError: mapApiError(err, 'subscription', 'auto_renewal') })
          throw err
        }
      },
    }),
    {
      name: 'subscription-storage',
      storage: createJSONStorage(() => buildStorage()),
      /**
       * Persist ONLY `plans` (public plan catalog — names, limits, prices).
       * `currentSubscription` and `invoices` carry billing dates / amounts /
       * references (PII-adjacent / financial PII) → DELIBERATELY OMITTED.
       * Wiped on restart or clearSubscription(). Matches customers/audit pattern.
       */
      partialize: (state) => ({
        plans: state.plans,
      }),
    },
  ),
)

export default useSubscriptionStore
