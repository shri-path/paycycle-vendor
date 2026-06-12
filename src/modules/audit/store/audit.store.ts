/**
 * Audit Store (US-007)
 * Purpose: audit & accountability state for the active vendor (owner + staff).
 *
 * - PII policy: timeline rows, conflicts, staff summary, and my-activity all carry
 *   actor/customer PII (names) → IN-MEMORY ONLY, never persisted. `partialize`
 *   persists ONLY non-PII filter state (staff/action/date range) for UX continuity.
 * - This is a READ-ONLY domain. The single "command" is the CSV export, which fetches
 *   the CSV and hands it to the OS share sheet via `exportTextFile`. It mutates no
 *   server state.
 * - error fields hold i18n KEYS (never raw messages); failures go through the shared
 *   logger (correlationId, no PII) + mapApiError(_, 'audit').
 * - Export is ONLINE-ONLY — screens disable the button offline.
 * - clearAudit() wipes all local data; auth.store.logout() calls it (orchestrator-wired,
 *   same pattern as clearCustomers / clearDelivery).
 *
 * Security: vendorId always comes from auth.store.vendorContext (JWT-derived) — never
 * from route params or user input.
 */

import { Platform } from 'react-native'
import { create } from 'zustand'
import { persist, createJSONStorage, type StateStorage } from 'zustand/middleware'
import AsyncStorage from '@react-native-async-storage/async-storage'
import { auditService } from '../service/audit.service'
import { exportTextFile } from '@utils/exportFile'
import { useAuthStore } from '@modules/auth/store/auth.store'
import { mapApiError } from '@utils/errorMapper'
import { logError } from '@utils/logger'
import type {
  AuditLogDto,
  AuditPagination,
  AuditFilters,
  ConflictDto,
  StaffSummaryDto,
  MyActivityEntryDto,
  MyActivitySummary,
  ListAuditLogsOptions,
  StaffSummaryOptions,
} from '../../../types/audit'

// ---------------------------------------------------------------------------
// SSR-safe storage (same pattern as customers.store / delivery.store)
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

/** Outcome of an export attempt, so the screen can show the right message. */
export type ExportOutcome = 'shared' | 'unavailable' | 'failed'

// ---------------------------------------------------------------------------
// State interface
// ---------------------------------------------------------------------------

export interface AuditState {
  // Timeline slice (owner: all; staff: own-only) — PII → in-memory only.
  logs: AuditLogDto[]
  pagination: AuditPagination | null
  filters: AuditFilters
  isLogsLoading: boolean
  logsError: string | null

  // Conflicts slice (owner-only) — PII → in-memory only.
  conflicts: ConflictDto[]
  isConflictsLoading: boolean
  conflictsError: string | null

  // Staff summary slice (owner-only) — PII → in-memory only.
  staffSummary: StaffSummaryDto[]
  isSummaryLoading: boolean
  summaryError: string | null

  // My activity slice (owner + staff, self) — PII → in-memory only.
  myActivity: MyActivityEntryDto[]
  myActivitySummary: MyActivitySummary | null
  isMyActivityLoading: boolean
  myActivityError: string | null

  // Export flag.
  isExporting: boolean

  // Persisted (non-PII) filter state.
  filterStaffId: string | null
  filterActionType: string | null
  filterStartDate: string | null
  filterEndDate: string | null

  // ---------------------------------------------------------------------------
  // Queries
  // ---------------------------------------------------------------------------

  /** Fetch the activity timeline. Appends when `opts.page > 1`, replaces otherwise. */
  fetchAuditLogs: (opts?: ListAuditLogsOptions) => Promise<void>
  /** Fetch delivery-action conflicts (owner-only). */
  fetchConflicts: () => Promise<void>
  /** Fetch per-staff activity summary (owner-only). */
  fetchStaffSummary: (opts?: StaffSummaryOptions) => Promise<void>
  /** Fetch the caller's own activity + rolling counts. */
  fetchMyActivity: () => Promise<void>

  // ---------------------------------------------------------------------------
  // Filter setters (screens call these then re-fetch via useEffect)
  // ---------------------------------------------------------------------------

  setStaffFilter: (staffId: string | null) => void
  setActionFilter: (actionType: string | null) => void
  setDateRange: (startDate: string | null, endDate: string | null) => void

  // ---------------------------------------------------------------------------
  // Command (online-only)
  // ---------------------------------------------------------------------------

  /**
   * Export the currently-filtered logs as CSV and open the OS share sheet.
   * Returns the outcome so the screen can show a success/unavailable/failed message.
   */
  exportLogs: () => Promise<ExportOutcome>

  // ---------------------------------------------------------------------------
  // Lifecycle
  // ---------------------------------------------------------------------------

  clearError: () => void
  /** Wipe all in-memory + persisted audit data. Called by auth.store.logout(). */
  clearAudit: () => void
}

// ---------------------------------------------------------------------------
// Non-persisted initial state (PII-bearing / transient slices)
// ---------------------------------------------------------------------------

const initialNonPersisted = {
  logs: [] as AuditLogDto[],
  pagination: null as AuditPagination | null,
  filters: { availableStaff: [], availableActionTypes: [] } as AuditFilters,
  isLogsLoading: false,
  logsError: null as string | null,

  conflicts: [] as ConflictDto[],
  isConflictsLoading: false,
  conflictsError: null as string | null,

  staffSummary: [] as StaffSummaryDto[],
  isSummaryLoading: false,
  summaryError: null as string | null,

  myActivity: [] as MyActivityEntryDto[],
  myActivitySummary: null as MyActivitySummary | null,
  isMyActivityLoading: false,
  myActivityError: null as string | null,

  isExporting: false,
}

// ---------------------------------------------------------------------------
// Store
// ---------------------------------------------------------------------------

export const useAuditStore = create<AuditState>()(
  persist(
    (set, get) => ({
      // Persisted filter state (non-PII).
      filterStaffId: null,
      filterActionType: null,
      filterStartDate: null,
      filterEndDate: null,

      ...initialNonPersisted,

      // -----------------------------------------------------------------------
      // Lifecycle
      // -----------------------------------------------------------------------

      clearError: () =>
        set({
          logsError: null,
          conflictsError: null,
          summaryError: null,
          myActivityError: null,
        }),

      clearAudit: () =>
        set({
          filterStaffId: null,
          filterActionType: null,
          filterStartDate: null,
          filterEndDate: null,
          ...initialNonPersisted,
        }),

      // -----------------------------------------------------------------------
      // Filter setters
      // -----------------------------------------------------------------------

      setStaffFilter: (staffId) => set({ filterStaffId: staffId }),
      setActionFilter: (actionType) => set({ filterActionType: actionType }),
      setDateRange: (startDate, endDate) =>
        set({ filterStartDate: startDate, filterEndDate: endDate }),

      // -----------------------------------------------------------------------
      // Queries
      // -----------------------------------------------------------------------

      fetchAuditLogs: async (opts = {}) => {
        const vendorId = getActiveVendorId()
        if (!vendorId) return
        const { filterStaffId, filterActionType, filterStartDate, filterEndDate } = get()
        const page = opts.page ?? 1
        set({ isLogsLoading: true, logsError: null })
        try {
          const result = await auditService.listAuditLogs(vendorId, {
            staffId: opts.staffId ?? (filterStaffId ?? undefined),
            actionType: opts.actionType ?? (filterActionType ?? undefined),
            startDate: opts.startDate ?? (filterStartDate ?? undefined),
            endDate: opts.endDate ?? (filterEndDate ?? undefined),
            page,
            limit: opts.limit ?? 50,
          })
          set((s) => ({
            logs: page > 1 ? [...s.logs, ...result.auditLogs] : result.auditLogs,
            pagination: result.pagination,
            filters: result.filters,
            isLogsLoading: false,
          }))
        } catch (err) {
          void logError(err, {
            screen: 'StaffActivityLog',
            action: 'fetchAuditLogs',
            endpoint: 'GET /vendors/:id/audit-logs',
          })
          const key = mapApiError(err, 'audit')
          const isOffline = key === 'common.offline_message'
          set((s) => ({
            isLogsLoading: false,
            logsError: key,
            ...(isOffline ? {} : { logs: page > 1 ? s.logs : [], pagination: null }),
          }))
        }
      },

      fetchConflicts: async () => {
        const vendorId = getActiveVendorId()
        if (!vendorId) return
        set({ isConflictsLoading: true, conflictsError: null })
        try {
          const conflicts = await auditService.listConflicts(vendorId)
          set({ conflicts, isConflictsLoading: false })
        } catch (err) {
          void logError(err, {
            screen: 'Conflicts',
            action: 'fetchConflicts',
            endpoint: 'GET /vendors/:id/audit-logs/conflicts',
          })
          const key = mapApiError(err, 'audit')
          const isOffline = key === 'common.offline_message'
          set({
            isConflictsLoading: false,
            conflictsError: key,
            ...(isOffline ? {} : { conflicts: [] }),
          })
        }
      },

      fetchStaffSummary: async (opts = {}) => {
        const vendorId = getActiveVendorId()
        if (!vendorId) return
        const { filterStaffId, filterStartDate, filterEndDate } = get()
        set({ isSummaryLoading: true, summaryError: null })
        try {
          const summary = await auditService.getStaffSummary(vendorId, {
            staffId: opts.staffId ?? (filterStaffId ?? undefined),
            startDate: opts.startDate ?? (filterStartDate ?? undefined),
            endDate: opts.endDate ?? (filterEndDate ?? undefined),
          })
          set({ staffSummary: summary, isSummaryLoading: false })
        } catch (err) {
          void logError(err, {
            screen: 'StaffSummary',
            action: 'fetchStaffSummary',
            endpoint: 'GET /vendors/:id/audit-logs/staff-summary',
          })
          const key = mapApiError(err, 'audit')
          const isOffline = key === 'common.offline_message'
          set({
            isSummaryLoading: false,
            summaryError: key,
            ...(isOffline ? {} : { staffSummary: [] }),
          })
        }
      },

      fetchMyActivity: async () => {
        const vendorId = getActiveVendorId()
        if (!vendorId) return
        set({ isMyActivityLoading: true, myActivityError: null })
        try {
          const result = await auditService.getMyActivity(vendorId)
          set({
            myActivity: result.activity,
            myActivitySummary: result.summary,
            isMyActivityLoading: false,
          })
        } catch (err) {
          void logError(err, {
            screen: 'MyActivity',
            action: 'fetchMyActivity',
            endpoint: 'GET /vendors/:id/audit-logs/my-activity',
          })
          const key = mapApiError(err, 'audit')
          const isOffline = key === 'common.offline_message'
          set({
            isMyActivityLoading: false,
            myActivityError: key,
            ...(isOffline ? {} : { myActivity: [], myActivitySummary: null }),
          })
        }
      },

      // -----------------------------------------------------------------------
      // Command — CSV export (online-only)
      // -----------------------------------------------------------------------

      exportLogs: async () => {
        const vendorId = getActiveVendorId()
        if (!vendorId) return 'failed'
        const { filterStaffId, filterActionType, filterStartDate, filterEndDate } = get()
        set({ isExporting: true })
        try {
          const csv = await auditService.exportAuditLogs(vendorId, {
            format: 'csv',
            staffId: filterStaffId ?? undefined,
            actionType: filterActionType ?? undefined,
            startDate: filterStartDate ?? undefined,
            endDate: filterEndDate ?? undefined,
          })
          const filename = `audit-logs-${Date.now()}.csv`
          const result = await exportTextFile(filename, csv, 'text/csv')
          set({ isExporting: false })
          return result.shared ? 'shared' : 'unavailable'
        } catch (err) {
          void logError(err, {
            screen: 'StaffActivityLog',
            action: 'exportLogs',
            endpoint: 'POST /vendors/:id/audit-logs/export',
          })
          set({ isExporting: false })
          return 'failed'
        }
      },
    }),
    {
      name: 'audit-storage',
      storage: createJSONStorage(() => buildStorage()),
      /**
       * Persist ONLY non-PII filter state for UX continuity. Everything else
       * (timeline rows, conflicts, summaries, my-activity) carries actor/customer
       * PII (names) and is DELIBERATELY OMITTED — in-memory only, wiped on app
       * restart or clearAudit(). Mirror of the customers.store partialize comment.
       */
      partialize: (state) => ({
        filterStaffId: state.filterStaffId,
        filterActionType: state.filterActionType,
        filterStartDate: state.filterStartDate,
        filterEndDate: state.filterEndDate,
      }),
    },
  ),
)

export default useAuditStore
