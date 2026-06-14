/**
 * Credit Store (US-012)
 * Purpose: Credit control & outstanding management state for the active vendor.
 *
 * - NO persistence: financial data is live/ephemeral (mirrors dashboard.store discipline).
 * - `error` fields hold i18n KEYS (never raw messages); failures go through the shared
 *   logger (correlationId, no PII) + mapApiError(_, 'credit', action).
 * - Command actions RETHROW so screens can fire haptics + show contextual UI.
 * - Query actions swallow errors and set per-slice error keys.
 * - `remindingCustomerIds` guards per-card in-flight state so one remind tap does not
 *   disable every card's Remind button.
 * - Cross-aggregate: after credit-settings / enable-prepaid mutations, the screen calls
 *   `useCustomersStore.getState().invalidateDetail(customerId)` via lazy-require
 *   (same pattern dashboard.store uses for settings.store) to avoid module cycles.
 * - `clearCredit()` wipes all slices; called by auth.store.logout().
 *
 * Security: vendorId always from auth.store.vendorContext (JWT-derived) — never from
 * route params or user input.
 */

import { create } from 'zustand'
import { creditService } from '../service/credit.service'
import { useAuthStore } from '@modules/auth/store/auth.store'
import { mapApiError } from '@utils/errorMapper'
import { logError } from '@utils/logger'
import type {
  CollectionsDashboardDto,
  PriorityListDto,
  CollectionAnalyticsDto,
  ReminderConfigDto,
  ReminderHistoryDto,
  UpdateCreditSettingsDto,
  CreditSettingsResultDto,
  EnablePrepaidDto,
  EnablePrepaidResultDto,
  SendReminderResultDto,
  UpdateReminderConfigDto,
  BulkReminderResultDto,
  SendBulkRemindersDto,
  PrioritySort,
} from '../../../types/credit'

// ---------------------------------------------------------------------------
// Helper
// ---------------------------------------------------------------------------

function getActiveVendorId(): string | null {
  return useAuthStore.getState().vendorContext?.vendorId ?? null
}

// ---------------------------------------------------------------------------
// State interface
// ---------------------------------------------------------------------------

export interface CreditState {
  // --- Dashboard slice ---
  dashboard: CollectionsDashboardDto | null
  isDashboardLoading: boolean
  dashboardError: string | null

  // --- Priority list slice ---
  priorityList: PriorityListDto | null
  isPriorityLoading: boolean
  priorityError: string | null
  prioritySort: PrioritySort

  // --- Analytics slice ---
  analytics: CollectionAnalyticsDto | null
  isAnalyticsLoading: boolean
  analyticsError: string | null
  analyticsMonth: string // YYYY-MM; default = current month

  // --- Reminder config slice ---
  reminderConfig: ReminderConfigDto | null
  isReminderConfigLoading: boolean
  reminderConfigError: string | null

  // --- History slice (keyed by customerId; append on page > 1) ---
  history: Record<string, ReminderHistoryDto>
  isHistoryLoading: boolean
  historyError: string | null

  // --- Mutation flags ---
  isMutating: boolean
  mutationError: string | null
  /** Per-customer in-flight remind guard (avoids disabling all cards at once). */
  remindingCustomerIds: string[]

  // --- Query actions ---
  fetchDashboard(): Promise<void>
  fetchPriorityList(sort?: PrioritySort): Promise<void>
  fetchAnalytics(month?: string): Promise<void>
  fetchReminderConfig(): Promise<void>
  fetchReminderHistory(customerId: string, page?: number): Promise<void>

  // --- Command actions (online-only; rethrow so screens can haptic + route) ---
  updateCreditSettings(
    customerId: string,
    patch: UpdateCreditSettingsDto,
  ): Promise<CreditSettingsResultDto>
  enablePrepaid(
    customerId: string,
    dto: EnablePrepaidDto,
  ): Promise<EnablePrepaidResultDto>
  sendReminder(
    customerId: string,
    customMessage?: string,
  ): Promise<SendReminderResultDto>
  sendBulkReminders(dto: SendBulkRemindersDto): Promise<BulkReminderResultDto>
  updateReminderConfig(patch: UpdateReminderConfigDto): Promise<ReminderConfigDto>

  // --- Lifecycle ---
  clearErrors(): void
  clearCredit(): void
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function currentMonth(): string {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
}

// ---------------------------------------------------------------------------
// Initial state (no persistence)
// ---------------------------------------------------------------------------

const initialState = {
  dashboard: null as CollectionsDashboardDto | null,
  isDashboardLoading: false,
  dashboardError: null as string | null,

  priorityList: null as PriorityListDto | null,
  isPriorityLoading: false,
  priorityError: null as string | null,
  prioritySort: 'oldest_first' as PrioritySort,

  analytics: null as CollectionAnalyticsDto | null,
  isAnalyticsLoading: false,
  analyticsError: null as string | null,
  analyticsMonth: currentMonth(),

  reminderConfig: null as ReminderConfigDto | null,
  isReminderConfigLoading: false,
  reminderConfigError: null as string | null,

  history: {} as Record<string, ReminderHistoryDto>,
  isHistoryLoading: false,
  historyError: null as string | null,

  isMutating: false,
  mutationError: null as string | null,
  remindingCustomerIds: [] as string[],
}

// ---------------------------------------------------------------------------
// Store
// ---------------------------------------------------------------------------

export const useCreditStore = create<CreditState>()((set, get) => ({
  ...initialState,

  // -------------------------------------------------------------------------
  // Lifecycle
  // -------------------------------------------------------------------------

  clearErrors: () =>
    set({
      dashboardError: null,
      priorityError: null,
      analyticsError: null,
      reminderConfigError: null,
      historyError: null,
      mutationError: null,
    }),

  clearCredit: () => set({ ...initialState }),

  // -------------------------------------------------------------------------
  // Queries
  // -------------------------------------------------------------------------

  fetchDashboard: async () => {
    const vendorId = getActiveVendorId()
    if (!vendorId) return
    set({ isDashboardLoading: true, dashboardError: null })
    try {
      const result = await creditService.getDashboard(vendorId)
      set({ dashboard: result, isDashboardLoading: false })
    } catch (err) {
      void logError(err, {
        screen: 'CollectionsDashboardScreen',
        action: 'fetchDashboard',
        endpoint: 'GET /vendors/:v/collections/dashboard',
      })
      set({
        isDashboardLoading: false,
        dashboardError: mapApiError(err, 'credit'),
      })
    }
  },

  fetchPriorityList: async (sort) => {
    const vendorId = getActiveVendorId()
    if (!vendorId) return
    const resolvedSort = sort ?? get().prioritySort
    set({ isPriorityLoading: true, priorityError: null, prioritySort: resolvedSort })
    try {
      const result = await creditService.getPriorityList(vendorId, resolvedSort)
      set({ priorityList: result, isPriorityLoading: false })
    } catch (err) {
      void logError(err, {
        screen: 'PriorityListScreen',
        action: 'fetchPriorityList',
        endpoint: 'GET /vendors/:v/collections/priority-list',
      })
      set({
        isPriorityLoading: false,
        priorityError: mapApiError(err, 'credit'),
      })
    }
  },

  fetchAnalytics: async (month) => {
    const vendorId = getActiveVendorId()
    if (!vendorId) return
    const resolvedMonth = month ?? get().analyticsMonth
    set({ isAnalyticsLoading: true, analyticsError: null, analyticsMonth: resolvedMonth })
    try {
      const result = await creditService.getAnalytics(vendorId, resolvedMonth)
      set({ analytics: result, isAnalyticsLoading: false })
    } catch (err) {
      void logError(err, {
        screen: 'CollectionAnalyticsScreen',
        action: 'fetchAnalytics',
        endpoint: 'GET /vendors/:v/collections/analytics',
      })
      set({
        isAnalyticsLoading: false,
        analyticsError: mapApiError(err, 'credit'),
      })
    }
  },

  fetchReminderConfig: async () => {
    const vendorId = getActiveVendorId()
    if (!vendorId) return
    set({ isReminderConfigLoading: true, reminderConfigError: null })
    try {
      const result = await creditService.getReminderConfig(vendorId)
      set({ reminderConfig: result, isReminderConfigLoading: false })
    } catch (err) {
      void logError(err, {
        screen: 'ReminderConfigScreen',
        action: 'fetchReminderConfig',
        endpoint: 'GET /vendors/:v/reminder-config',
      })
      set({
        isReminderConfigLoading: false,
        reminderConfigError: mapApiError(err, 'credit'),
      })
    }
  },

  fetchReminderHistory: async (customerId, page = 1) => {
    const vendorId = getActiveVendorId()
    if (!vendorId) return
    set({ isHistoryLoading: true, historyError: null })
    try {
      const { data } = await creditService.getReminderHistory(vendorId, customerId, page)
      set((state) => {
        if (page > 1) {
          // Append reminders for subsequent pages
          const existing = state.history[customerId]
          return {
            isHistoryLoading: false,
            history: {
              ...state.history,
              [customerId]: existing
                ? {
                    ...data,
                    reminders: [...existing.reminders, ...data.reminders],
                  }
                : data,
            },
          }
        }
        return {
          isHistoryLoading: false,
          history: { ...state.history, [customerId]: data },
        }
      })
    } catch (err) {
      void logError(err, {
        screen: 'ReminderHistoryScreen',
        action: 'fetchReminderHistory',
        endpoint: 'GET /vendors/:v/customers/:c/reminders',
      })
      set({
        isHistoryLoading: false,
        historyError: mapApiError(err, 'credit'),
      })
    }
  },

  // -------------------------------------------------------------------------
  // Commands (rethrow on failure)
  // -------------------------------------------------------------------------

  updateCreditSettings: async (customerId, patch) => {
    const vendorId = getActiveVendorId()
    if (!vendorId) throw new Error('common.error')
    set({ isMutating: true, mutationError: null })
    try {
      const result = await creditService.updateCreditSettings(vendorId, customerId, patch)
      set({ isMutating: false })
      // Lazy-require to avoid module cycle (credit.store <-> customers.store)
      try {
        // eslint-disable-next-line @typescript-eslint/no-require-imports
        const { useCustomersStore } = require('@modules/customers/store/customers.store') as {
          useCustomersStore: { getState: () => { fetchCustomer: (id: string) => Promise<void> } }
        }
        void useCustomersStore.getState().fetchCustomer(customerId)
      } catch {
        // customers store not loaded — nothing to invalidate
      }
      return result
    } catch (err) {
      void logError(err, {
        screen: 'SetCreditSettingsScreen',
        action: 'updateCreditSettings',
        endpoint: 'PATCH /vendors/:v/customers/:c/credit-settings',
      })
      set({ isMutating: false, mutationError: mapApiError(err, 'credit') })
      throw err
    }
  },

  enablePrepaid: async (customerId, dto) => {
    const vendorId = getActiveVendorId()
    if (!vendorId) throw new Error('common.error')
    set({ isMutating: true, mutationError: null })
    try {
      const result = await creditService.enablePrepaid(vendorId, customerId, dto)
      set({ isMutating: false })
      if (!result.clearOutstandingRequired) {
        // Success: invalidate customer detail (lazy-require)
        try {
          // eslint-disable-next-line @typescript-eslint/no-require-imports
          const { useCustomersStore } = require('@modules/customers/store/customers.store') as {
            useCustomersStore: { getState: () => { fetchCustomer: (id: string) => Promise<void> } }
          }
          void useCustomersStore.getState().fetchCustomer(customerId)
        } catch {
          // customers store not loaded
        }
      }
      return result
    } catch (err) {
      void logError(err, {
        screen: 'EnablePrepaidScreen',
        action: 'enablePrepaid',
        endpoint: 'POST /vendors/:v/customers/:c/enable-prepaid',
      })
      set({ isMutating: false, mutationError: mapApiError(err, 'credit') })
      throw err
    }
  },

  sendReminder: async (customerId, customMessage) => {
    const vendorId = getActiveVendorId()
    if (!vendorId) throw new Error('common.error')
    // Per-card in-flight guard
    set((s) => ({
      remindingCustomerIds: [...s.remindingCustomerIds, customerId],
      mutationError: null,
    }))
    try {
      const result = await creditService.sendReminder(vendorId, customerId, customMessage)
      set((s) => ({
        remindingCustomerIds: s.remindingCustomerIds.filter((id) => id !== customerId),
      }))
      return result
    } catch (err) {
      void logError(err, {
        screen: 'PriorityListScreen',
        action: 'sendReminder',
        endpoint: 'POST /vendors/:v/customers/:c/reminders',
      })
      set((s) => ({
        remindingCustomerIds: s.remindingCustomerIds.filter((id) => id !== customerId),
        mutationError: mapApiError(err, 'credit'),
      }))
      throw err
    }
  },

  sendBulkReminders: async (dto) => {
    const vendorId = getActiveVendorId()
    if (!vendorId) throw new Error('common.error')
    set({ isMutating: true, mutationError: null })
    try {
      const result = await creditService.sendBulkReminders(vendorId, dto)
      set({ isMutating: false })
      return result
    } catch (err) {
      void logError(err, {
        screen: 'BulkSendRemindersScreen',
        action: 'sendBulkReminders',
        endpoint: 'POST /vendors/:v/reminders/send-bulk',
      })
      set({ isMutating: false, mutationError: mapApiError(err, 'credit') })
      throw err
    }
  },

  updateReminderConfig: async (patch) => {
    const vendorId = getActiveVendorId()
    if (!vendorId) throw new Error('common.error')
    set({ isMutating: true, mutationError: null })
    try {
      const result = await creditService.updateReminderConfig(vendorId, patch)
      set({ isMutating: false, reminderConfig: result })
      return result
    } catch (err) {
      void logError(err, {
        screen: 'ReminderConfigScreen',
        action: 'updateReminderConfig',
        endpoint: 'PATCH /vendors/:v/reminder-config',
      })
      set({ isMutating: false, mutationError: mapApiError(err, 'credit') })
      throw err
    }
  },
}))

export default useCreditStore
