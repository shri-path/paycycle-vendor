/**
 * Dashboard Store (US-010)
 * Purpose: Dashboard state for the active vendor (owner + staff).
 *
 * - NO persistence: dashboard data is live/ephemeral. Persisting stale
 *   financials is undesirable. Mirrors the subscription store's in-memory-only
 *   discipline for financial slices.
 * - `error` fields hold i18n KEYS (never raw messages); failures go through the
 *   shared logger (correlationId, no PII) + mapApiError(_, 'dashboard', action).
 * - `clearDashboard()` wipes all slices; called by auth.store.logout() alongside
 *   the existing clearRoles() / clearSubscription() (lazy-require, same pattern).
 * - `setAutoMark` uses OPTIMISTIC update with rollback on failure (FEATURE_PLAN §4.1).
 *
 * Security: vendorId always from auth.store.vendorContext (JWT-derived) — never
 * from route params or user input.
 */

import { create } from 'zustand'
import { dashboardService } from '../service/dashboard.service'
import { useAuthStore } from '@modules/auth/store/auth.store'
import { mapApiError } from '@utils/errorMapper'
import { logError } from '@utils/logger'
import type {
  OwnerDashboardDto,
  StaffDashboardDto,
  SupplyForecastDto,
  OutstandingAgingDto,
} from '../../../types/dashboard'
import type { ForecastOptions } from '../service/dashboard.service'

// ---------------------------------------------------------------------------
// Helper
// ---------------------------------------------------------------------------

/** Resolves the active vendorId from auth state (JWT-derived). */
function getActiveVendorId(): string | null {
  return useAuthStore.getState().vendorContext?.vendorId ?? null
}

// ---------------------------------------------------------------------------
// State interface
// ---------------------------------------------------------------------------

export interface DashboardState {
  // Owner dashboard slice
  ownerDashboard: OwnerDashboardDto | null
  isOwnerLoading: boolean
  ownerError: string | null

  // Staff dashboard slice
  staffDashboard: StaffDashboardDto | null
  isStaffLoading: boolean
  staffError: string | null

  // Supply forecast slice
  forecast: SupplyForecastDto | null
  isForecastLoading: boolean
  forecastError: string | null

  // Collections / outstanding aging slice
  collections: OutstandingAgingDto | null
  isCollectionsLoading: boolean
  collectionsError: string | null

  // Optimistic auto-mark mutation state
  isUpdatingAutoMark: boolean

  // ---------------------------------------------------------------------------
  // Queries
  // ---------------------------------------------------------------------------

  /** GET /vendors/:id/dashboard/owner — fetched by OwnerDashboardScreen. */
  fetchOwnerDashboard: () => Promise<void>
  /** GET /vendors/:id/dashboard/staff — fetched by StaffDashboardScreen. */
  fetchStaffDashboard: () => Promise<void>
  /** GET /vendors/:id/supply-forecast — fetched by SupplyForecastScreen. */
  fetchForecast: (opts: ForecastOptions) => Promise<void>
  /** GET /vendors/:id/outstanding-aging — fetched by CollectionsScreen. */
  fetchCollections: () => Promise<void>

  // ---------------------------------------------------------------------------
  // Commands (online-only)
  // ---------------------------------------------------------------------------

  /**
   * Optimistically updates autoMarkEnabled on the owner dashboard.
   * 1. Snapshots current value.
   * 2. Sets optimistic value in store.
   * 3. Calls API; on success writes server-confirmed value.
   * 4. On failure: rolls back, logs error, sets ownerError, RETHROWS so the
   *    screen can fire error haptic + show a transient AppAlert.
   */
  setAutoMark: (enabled: boolean) => Promise<void>

  // ---------------------------------------------------------------------------
  // Lifecycle
  // ---------------------------------------------------------------------------

  /** Wipe all slices. Called by auth.store.logout(). */
  clearDashboard: () => void
  clearErrors: () => void
}

// ---------------------------------------------------------------------------
// Initial state (no persistence)
// ---------------------------------------------------------------------------

const initialState = {
  ownerDashboard: null as OwnerDashboardDto | null,
  isOwnerLoading: false,
  ownerError: null as string | null,

  staffDashboard: null as StaffDashboardDto | null,
  isStaffLoading: false,
  staffError: null as string | null,

  forecast: null as SupplyForecastDto | null,
  isForecastLoading: false,
  forecastError: null as string | null,

  collections: null as OutstandingAgingDto | null,
  isCollectionsLoading: false,
  collectionsError: null as string | null,

  isUpdatingAutoMark: false,
}

// ---------------------------------------------------------------------------
// Store
// ---------------------------------------------------------------------------

export const useDashboardStore = create<DashboardState>()((set, get) => ({
  ...initialState,

  // -------------------------------------------------------------------------
  // Lifecycle
  // -------------------------------------------------------------------------

  clearErrors: () =>
    set({
      ownerError: null,
      staffError: null,
      forecastError: null,
      collectionsError: null,
    }),

  clearDashboard: () => set({ ...initialState }),

  // -------------------------------------------------------------------------
  // Queries
  // -------------------------------------------------------------------------

  fetchOwnerDashboard: async () => {
    const vendorId = getActiveVendorId()
    if (!vendorId) return
    set({ isOwnerLoading: true, ownerError: null })
    try {
      const result = await dashboardService.getOwnerDashboard(vendorId)
      set({ ownerDashboard: result, isOwnerLoading: false })
    } catch (err) {
      void logError(err, {
        screen: 'OwnerDashboardScreen',
        action: 'fetchOwnerDashboard',
        endpoint: 'GET /vendors/:id/dashboard/owner',
      })
      set({ isOwnerLoading: false, ownerError: mapApiError(err, 'dashboard' as never) })
    }
  },

  fetchStaffDashboard: async () => {
    const vendorId = getActiveVendorId()
    if (!vendorId) return
    set({ isStaffLoading: true, staffError: null })
    try {
      const result = await dashboardService.getStaffDashboard(vendorId)
      set({ staffDashboard: result, isStaffLoading: false })
    } catch (err) {
      void logError(err, {
        screen: 'StaffDashboardScreen',
        action: 'fetchStaffDashboard',
        endpoint: 'GET /vendors/:id/dashboard/staff',
      })
      set({ isStaffLoading: false, staffError: mapApiError(err, 'dashboard' as never) })
    }
  },

  fetchForecast: async (opts) => {
    const vendorId = getActiveVendorId()
    if (!vendorId) return
    set({ isForecastLoading: true, forecastError: null })
    try {
      const result = await dashboardService.getSupplyForecast(vendorId, opts)
      set({ forecast: result, isForecastLoading: false })
    } catch (err) {
      void logError(err, {
        screen: 'SupplyForecastScreen',
        action: 'fetchForecast',
        endpoint: 'GET /vendors/:id/supply-forecast',
      })
      set({ isForecastLoading: false, forecastError: mapApiError(err, 'dashboard' as never) })
    }
  },

  fetchCollections: async () => {
    const vendorId = getActiveVendorId()
    if (!vendorId) return
    set({ isCollectionsLoading: true, collectionsError: null })
    try {
      const result = await dashboardService.getOutstandingAging(vendorId)
      set({ collections: result, isCollectionsLoading: false })
    } catch (err) {
      void logError(err, {
        screen: 'CollectionsScreen',
        action: 'fetchCollections',
        endpoint: 'GET /vendors/:id/outstanding-aging',
      })
      set({ isCollectionsLoading: false, collectionsError: mapApiError(err, 'dashboard' as never) })
    }
  },

  // -------------------------------------------------------------------------
  // Commands
  // -------------------------------------------------------------------------

  setAutoMark: async (enabled) => {
    const vendorId = getActiveVendorId()
    if (!vendorId) return
    // 1. Snapshot previous value.
    const prev = get().ownerDashboard?.autoMarkStatus ?? null
    // 2. Optimistically set new value.
    const currentDashboard = get().ownerDashboard
    if (currentDashboard) {
      set({
        ownerDashboard: {
          ...currentDashboard,
          autoMarkStatus: enabled ? 'on' : 'off',
        },
        isUpdatingAutoMark: true,
      })
    } else {
      set({ isUpdatingAutoMark: true })
    }
    try {
      // 3. Call API and write server-confirmed value.
      const result = await dashboardService.updateSettings(vendorId, { autoMarkEnabled: enabled })
      const updated = get().ownerDashboard
      if (updated) {
        set({
          ownerDashboard: {
            ...updated,
            autoMarkStatus: result.autoMarkEnabled ? 'on' : 'off',
          },
          isUpdatingAutoMark: false,
        })
      } else {
        set({ isUpdatingAutoMark: false })
      }
    } catch (err) {
      // 4. Rollback on failure, log, set error, rethrow for screen haptic.
      const rollback = get().ownerDashboard
      if (rollback && prev !== null) {
        set({
          ownerDashboard: { ...rollback, autoMarkStatus: prev },
          isUpdatingAutoMark: false,
        })
      } else {
        set({ isUpdatingAutoMark: false })
      }
      void logError(err, {
        screen: 'OwnerDashboardScreen',
        action: 'setAutoMark',
        endpoint: 'PATCH /vendors/:id/settings',
      })
      set({ ownerError: mapApiError(err, 'dashboard' as never) })
      throw err
    }
  },
}))

export default useDashboardStore
