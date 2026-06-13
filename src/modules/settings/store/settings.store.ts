/**
 * Settings Store (US-011)
 * Purpose: Vendor settings + bulk-operations state for the active vendor (owner-scoped).
 *
 * - PII policy: `settings` contains automation toggles, credit config, notification
 *   preferences — non-PII config values. PERSISTED for instant paint on the settings
 *   screen. Bulk operation results are transient (never persisted).
 * - Commands (updateSettings, bulk ops) are ONLINE-ONLY — screens disable command
 *   buttons offline (useNetworkStatus).
 * - error fields hold i18n KEYS (never raw messages); failures go through the shared
 *   logger (correlationId, no PII) + mapApiError(_, 'settings', action).
 * - `clearSettings()` wipes all slices incl. persisted `settings`; called by
 *   auth.store.logout() (lazy-require, same pattern as clearSubscription/clearCustomers).
 *
 * Migration (OQ-5 resolution): the settings store is now the SINGLE writer of
 * `/vendors/:id/settings`. The dashboard's setAutoMark delegates to
 * `useSettingsStore.updateSettings({ autoMarkEnabled })`.
 *
 * Security: vendorId always from auth.store.vendorContext (JWT-derived) — never
 * from route params or user input.
 */

import { Platform } from 'react-native'
import { create } from 'zustand'
import { persist, createJSONStorage, type StateStorage } from 'zustand/middleware'
import AsyncStorage from '@react-native-async-storage/async-storage'
import { settingsService } from '../service/settings.service'
import { useAuthStore } from '@modules/auth/store/auth.store'
import { mapApiError } from '@utils/errorMapper'
import { logError } from '@utils/logger'
import type {
  VendorSettingsDto,
  NotificationPreferencesDto,
  BulkLeaveInput,
  BulkLeaveResultDto,
  BulkRateInput,
  BulkRateResultDto,
  BulkReminderInput,
  BulkReminderResultDto,
} from '../../../types/settings'

// ---------------------------------------------------------------------------
// SSR-safe storage (same pattern as subscription.store / customers.store)
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

export interface SettingsState {
  // Settings slice — non-PII config; PERSISTED for fast paint.
  settings: VendorSettingsDto | null
  isLoading: boolean
  error: string | null

  // Shared mutation state (save settings / notif-prefs / bulk ops).
  isMutating: boolean
  mutationError: string | null

  // ---------------------------------------------------------------------------
  // Queries
  // ---------------------------------------------------------------------------

  /** GET /vendors/:id/settings — fetched on screen focus. */
  fetchSettings: () => Promise<void>

  // ---------------------------------------------------------------------------
  // Commands (online-only)
  // ---------------------------------------------------------------------------

  /** PATCH /vendors/:id/settings — sends only dirty fields; merges result. */
  updateSettings: (patch: Partial<VendorSettingsDto>) => Promise<void>
  /** PATCH /vendors/:id/notification-preferences — deep-merges into settings. */
  updateNotificationPreferences: (prefs: NotificationPreferencesDto) => Promise<void>
  /** POST /vendors/:id/bulk-operations/mark-leave — throws on error. */
  bulkMarkLeave: (input: BulkLeaveInput) => Promise<BulkLeaveResultDto>
  /** POST /vendors/:id/bulk-operations/adjust-rate — throws on error. */
  bulkAdjustRate: (input: BulkRateInput) => Promise<BulkRateResultDto>
  /** POST /vendors/:id/bulk-operations/send-reminders — throws on error. */
  bulkSendReminders: (input: BulkReminderInput) => Promise<BulkReminderResultDto>

  // ---------------------------------------------------------------------------
  // Lifecycle
  // ---------------------------------------------------------------------------

  clearError: () => void
  /** Wipe all slices incl. persisted `settings`. Called by auth.store.logout(). */
  clearSettings: () => void
}

// ---------------------------------------------------------------------------
// Non-persisted initial state
// ---------------------------------------------------------------------------

const initialNonPersisted = {
  isLoading: false,
  error: null as string | null,
  isMutating: false,
  mutationError: null as string | null,
}

// ---------------------------------------------------------------------------
// Store
// ---------------------------------------------------------------------------

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set, _get) => ({
      // Persisted (non-PII vendor config).
      settings: null as VendorSettingsDto | null,

      ...initialNonPersisted,

      // -----------------------------------------------------------------------
      // Lifecycle
      // -----------------------------------------------------------------------

      clearError: () => set({ error: null, mutationError: null }),

      clearSettings: () =>
        set({
          settings: null,
          ...initialNonPersisted,
        }),

      // -----------------------------------------------------------------------
      // Queries
      // -----------------------------------------------------------------------

      fetchSettings: async () => {
        const vendorId = getActiveVendorId()
        if (!vendorId) return
        set({ isLoading: true, error: null })
        try {
          const result = await settingsService.getSettings(vendorId)
          set({ settings: result, isLoading: false })
        } catch (err) {
          void logError(err, {
            screen: 'VendorSettingsScreen',
            action: 'fetchSettings',
            endpoint: 'GET /vendors/:id/settings',
          })
          set({ isLoading: false, error: mapApiError(err, 'settings') })
        }
      },

      // -----------------------------------------------------------------------
      // Commands
      // -----------------------------------------------------------------------

      updateSettings: async (patch) => {
        const vendorId = getActiveVendorId()
        if (!vendorId) return
        set({ isMutating: true, mutationError: null })
        try {
          const result = await settingsService.updateSettings(vendorId, patch)
          set({ settings: result, isMutating: false })
        } catch (err) {
          void logError(err, {
            screen: 'VendorSettingsScreen',
            action: 'updateSettings',
            endpoint: 'PATCH /vendors/:id/settings',
          })
          set({
            isMutating: false,
            mutationError: mapApiError(err, 'settings'),
          })
          throw err
        }
      },

      updateNotificationPreferences: async (prefs) => {
        const vendorId = getActiveVendorId()
        if (!vendorId) return
        set({ isMutating: true, mutationError: null })
        try {
          const result = await settingsService.updateNotificationPreferences(vendorId, prefs)
          // Deep-merge notification prefs into the settings slice.
          set((s) => ({
            settings: s.settings
              ? { ...s.settings, notificationPreferences: result.notificationPreferences }
              : result,
            isMutating: false,
          }))
        } catch (err) {
          void logError(err, {
            screen: 'NotificationPreferencesScreen',
            action: 'updateNotificationPreferences',
            endpoint: 'PATCH /vendors/:id/notification-preferences',
          })
          set({
            isMutating: false,
            mutationError: mapApiError(err, 'settings'),
          })
          throw err
        }
      },

      bulkMarkLeave: async (input) => {
        const vendorId = getActiveVendorId()
        if (!vendorId) throw new Error('common.error')
        set({ isMutating: true, mutationError: null })
        try {
          const result = await settingsService.bulkMarkLeave(vendorId, input)
          set({ isMutating: false })
          return result
        } catch (err) {
          void logError(err, {
            screen: 'BulkMarkLeaveScreen',
            action: 'bulkMarkLeave',
            endpoint: 'POST /vendors/:id/bulk-operations/mark-leave',
          })
          set({
            isMutating: false,
            mutationError: mapApiError(err, 'settings', 'mark_leave'),
          })
          throw err
        }
      },

      bulkAdjustRate: async (input) => {
        const vendorId = getActiveVendorId()
        if (!vendorId) throw new Error('common.error')
        set({ isMutating: true, mutationError: null })
        try {
          const result = await settingsService.bulkAdjustRate(vendorId, input)
          set({ isMutating: false })
          return result
        } catch (err) {
          void logError(err, {
            screen: 'BulkAdjustRateScreen',
            action: 'bulkAdjustRate',
            endpoint: 'POST /vendors/:id/bulk-operations/adjust-rate',
          })
          set({
            isMutating: false,
            mutationError: mapApiError(err, 'settings', 'adjust_rate'),
          })
          throw err
        }
      },

      bulkSendReminders: async (input) => {
        const vendorId = getActiveVendorId()
        if (!vendorId) throw new Error('common.error')
        set({ isMutating: true, mutationError: null })
        try {
          const result = await settingsService.bulkSendReminders(vendorId, input)
          set({ isMutating: false })
          return result
        } catch (err) {
          void logError(err, {
            screen: 'BulkSendRemindersScreen',
            action: 'bulkSendReminders',
            endpoint: 'POST /vendors/:id/bulk-operations/send-reminders',
          })
          set({
            isMutating: false,
            mutationError: mapApiError(err, 'settings', 'send_reminders'),
          })
          throw err
        }
      },

    }),
    {
      name: 'settings-storage',
      storage: createJSONStorage(() => buildStorage()),
      /**
       * Persist ONLY `settings` (non-PII config: toggles, credit config, notif prefs).
       * Bulk operation results are transient → DELIBERATELY OMITTED.
       * Wiped on restart or clearSettings(). Matches subscription/customers pattern.
       */
      partialize: (state) => ({
        settings: state.settings,
      }),
    },
  ),
)

export default useSettingsStore
