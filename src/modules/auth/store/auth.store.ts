/**
 * Auth Store
 * Purpose: Authentication state management with secure token storage
 *
 * Security notes:
 * - JWT tokens (accessToken, refreshToken) are stored ONLY in expo-secure-store
 *   (Keychain on iOS, EncryptedSharedPreferences on Android). Never in AsyncStorage.
 * - Password reset uses an OTP delivered via SMS; no reset token is held client-side.
 * - Only non-sensitive fields (isAuthenticated, user, vendorContext) are persisted
 *   via AsyncStorage (native) / localStorage (web) through the Zustand persist middleware.
 */

import { Platform } from 'react-native'
import { create } from 'zustand'
import { persist, createJSONStorage, type StateStorage } from 'zustand/middleware'
import AsyncStorage from '@react-native-async-storage/async-storage'
import * as SecureStore from 'expo-secure-store'
import { authService } from '../service/auth.service'
import { mapApiError } from '@utils/errorMapper'
import { logError } from '@utils/logger'
import type { UserDto, VendorContextDto } from '../../../types/auth'

// SSR-safe storage: AsyncStorage on native, localStorage on web browser, no-op in Node.js
function buildStorage(): StateStorage {
  if (Platform.OS !== 'web') return AsyncStorage
  if (typeof window === 'undefined') {
    return { getItem: () => null, setItem: () => {}, removeItem: () => {} }
  }
  return window.localStorage
}

// SecureStore key constants
const SECURE_KEY_ACCESS_TOKEN = 'auth.accessToken'
const SECURE_KEY_REFRESH_TOKEN = 'auth.refreshToken'

// Helper to persist tokens securely
async function storeTokens(accessToken: string, refreshToken: string): Promise<void> {
  await Promise.all([
    SecureStore.setItemAsync(SECURE_KEY_ACCESS_TOKEN, accessToken),
    SecureStore.setItemAsync(SECURE_KEY_REFRESH_TOKEN, refreshToken),
  ])
}

// Helper to clear all secure tokens on logout
async function clearSecureTokens(): Promise<void> {
  await Promise.all([
    SecureStore.deleteItemAsync(SECURE_KEY_ACCESS_TOKEN).catch(() => undefined),
    SecureStore.deleteItemAsync(SECURE_KEY_REFRESH_TOKEN).catch(() => undefined),
  ])
}

interface AuthState {
  // Persisted non-sensitive state (AsyncStorage)
  isAuthenticated: boolean
  user: UserDto | null
  vendorContext: VendorContextDto | null

  // Transient flow state (in-memory only)
  isLoading: boolean
  error: string | null
  isHydrated: boolean
  pendingResetPhone: string | null
  /**
   * OTP echoed by the API in non-production environments only (never set in
   * production, where the OTP arrives via SMS). Used solely for the dev-only
   * on-screen hint on ResetPasswordScreen. In-memory, never persisted.
   */
  pendingResetOtp: string | null

  // Actions
  setHydrated: (value: boolean) => void
  login: (phone: string, password: string) => Promise<void>
  signup: (phone: string, password: string, vendorName: string) => Promise<void>
  acceptInvite: (token: string, password: string, name?: string) => Promise<void>
  logout: () => Promise<void>
  forgotPassword: (phone: string) => Promise<void>
  resetPassword: (otpCode: string, newPassword: string) => Promise<void>
  refreshTokens: () => Promise<void>
  clearError: () => void
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      isAuthenticated: false,
      user: null,
      vendorContext: null,

      isLoading: false,
      error: null,
      isHydrated: false,
      pendingResetPhone: null,
      pendingResetOtp: null,

      setHydrated: (value) => set({ isHydrated: value }),

      clearError: () => set({ error: null }),

      login: async (phone, password) => {
        set({ isLoading: true, error: null })
        try {
          const response = await authService.login(phone, password)
          const vendorContext = response.vendorContexts[0] ?? null
          // Store JWT tokens in SecureStore — never in Zustand/AsyncStorage
          await storeTokens(response.tokens.accessToken, response.tokens.refreshToken)
          set({
            isAuthenticated: true,
            user: response.user,
            vendorContext,
            isLoading: false,
          })
        } catch (err) {
          void logError(err, { screen: 'Login', action: 'login', endpoint: '/auth/login' })
          const i18nKey = mapApiError(err)
          set({ isLoading: false, error: i18nKey })
          throw err
        }
      },

      signup: async (phone, password, vendorName) => {
        set({ isLoading: true, error: null })
        try {
          const response = await authService.signup(phone, password, vendorName)
          // Store JWT tokens in SecureStore — never in Zustand/AsyncStorage
          await storeTokens(response.tokens.accessToken, response.tokens.refreshToken)
          set({
            isAuthenticated: true,
            user: response.user,
            vendorContext: response.vendorContext,
            isLoading: false,
          })
        } catch (err) {
          void logError(err, { screen: 'Signup', action: 'signup', endpoint: '/auth/signup' })
          const i18nKey = mapApiError(err)
          set({ isLoading: false, error: i18nKey })
          throw err
        }
      },

      acceptInvite: async (token, password, name) => {
        set({ isLoading: true, error: null })
        try {
          const response = await authService.acceptInvite(token, password, name)
          const vendorContext = response.vendorContexts[0] ?? null
          // Auto-login: tokens to SecureStore exactly like login.
          await storeTokens(response.tokens.accessToken, response.tokens.refreshToken)
          set({
            isAuthenticated: true,
            user: response.user,
            vendorContext,
            isLoading: false,
          })
        } catch (err) {
          void logError(err, {
            screen: 'StaffJoin',
            action: 'acceptInvite',
            endpoint: '/auth/accept-invite',
          })
          const i18nKey = mapApiError(err, 'invite_accept')
          set({ isLoading: false, error: i18nKey })
          throw err
        }
      },

      logout: async () => {
        set({ isLoading: true })
        try {
          const [accessToken, refreshToken] = await Promise.all([
            SecureStore.getItemAsync(SECURE_KEY_ACCESS_TOKEN),
            SecureStore.getItemAsync(SECURE_KEY_REFRESH_TOKEN),
          ])
          if (accessToken && refreshToken) {
            await authService.logout(refreshToken, accessToken)
          }
        } catch (err) {
          // Server-side logout failure is non-fatal — local tokens are still cleared below.
          void logError(err, { screen: 'Settings', action: 'logout', endpoint: '/auth/logout' })
        } finally {
          await clearSecureTokens()
          // Wipe all local role/permission data on logout (data-residency).
          // Lazy require to avoid a module cycle (auth.store <-> roles.store).
          try {
            // eslint-disable-next-line @typescript-eslint/no-require-imports
            const { useRolesStore } = require('@modules/roles/store/roles.store') as {
              useRolesStore: { getState: () => { clearRoles: () => void } }
            }
            useRolesStore.getState().clearRoles()
          } catch {
            // roles store not loaded yet — nothing to clear.
          }
          // Wipe all local supply-list data on logout (data-residency).
          try {
            // eslint-disable-next-line @typescript-eslint/no-require-imports
            const { useSupplyListsStore } = require('@modules/supply-lists/store/supplyLists.store') as {
              useSupplyListsStore: { getState: () => { clearSupplyLists: () => void } }
            }
            useSupplyListsStore.getState().clearSupplyLists()
          } catch {
            // supply-lists store not loaded yet — nothing to clear.
          }
          // Wipe all local delivery data (incl. customer PII) on logout (US-006).
          try {
            // eslint-disable-next-line @typescript-eslint/no-require-imports
            const { useDeliveryStore } = require('@modules/delivery/store/delivery.store') as {
              useDeliveryStore: { getState: () => { clearDelivery: () => void } }
            }
            useDeliveryStore.getState().clearDelivery()
          } catch {
            // delivery store not loaded yet — nothing to clear.
          }
          // Wipe all local customer data (incl. PII) on logout (US-008).
          try {
            // eslint-disable-next-line @typescript-eslint/no-require-imports
            const { useCustomersStore } = require('@modules/customers/store/customers.store') as {
              useCustomersStore: { getState: () => { clearCustomers: () => void } }
            }
            useCustomersStore.getState().clearCustomers()
          } catch {
            // customers store not loaded yet — nothing to clear.
          }
          // Wipe all local audit data (incl. actor/customer PII) on logout (US-007).
          try {
            // eslint-disable-next-line @typescript-eslint/no-require-imports
            const { useAuditStore } = require('@modules/audit/store/audit.store') as {
              useAuditStore: { getState: () => { clearAudit: () => void } }
            }
            useAuditStore.getState().clearAudit()
          } catch {
            // audit store not loaded yet — nothing to clear.
          }
          // Wipe all local subscription data (incl. persisted plan catalog) on logout (US-009).
          try {
            // eslint-disable-next-line @typescript-eslint/no-require-imports
            const { useSubscriptionStore } = require('@modules/subscription/store/subscription.store') as {
              useSubscriptionStore: { getState: () => { clearSubscription: () => void } }
            }
            useSubscriptionStore.getState().clearSubscription()
          } catch {
            // subscription store not loaded yet — nothing to clear.
          }
          // Wipe all local dashboard data (financial aggregates) on logout (US-010).
          try {
            // eslint-disable-next-line @typescript-eslint/no-require-imports
            const { useDashboardStore } = require('@modules/dashboard/store/dashboard.store') as {
              useDashboardStore: { getState: () => { clearDashboard: () => void } }
            }
            useDashboardStore.getState().clearDashboard()
          } catch {
            // dashboard store not loaded yet — nothing to clear.
          }
          // Wipe all local settings data (vendor config) on logout (US-011).
          try {
            // eslint-disable-next-line @typescript-eslint/no-require-imports
            const { useSettingsStore } = require('@modules/settings/store/settings.store') as {
              useSettingsStore: { getState: () => { clearSettings: () => void } }
            }
            useSettingsStore.getState().clearSettings()
          } catch {
            // settings store not loaded yet — nothing to clear.
          }
          // Wipe all local credit / collections data (financial aggregates) on logout (US-012).
          try {
            // eslint-disable-next-line @typescript-eslint/no-require-imports
            const { useCreditStore } = require('@modules/credit/store/credit.store') as {
              useCreditStore: { getState: () => { clearCredit: () => void } }
            }
            useCreditStore.getState().clearCredit()
          } catch {
            // credit store not loaded yet — nothing to clear.
          }
          set({
            isAuthenticated: false,
            user: null,
            vendorContext: null,
            isLoading: false,
            error: null,
            pendingResetPhone: null,
            pendingResetOtp: null,
          })
        }
      },

      forgotPassword: async (phone) => {
        set({ isLoading: true, error: null })
        try {
          const devOtp = await authService.forgotPassword(phone)
          // The OTP is delivered via SMS; only the target phone is retained in memory
          // to scope the subsequent reset-password call. `devOtp` is populated only in
          // non-production environments (for the dev-only on-screen hint).
          set({
            isLoading: false,
            pendingResetPhone: phone,
            pendingResetOtp: devOtp ?? null,
          })
        } catch (err) {
          void logError(err, {
            screen: 'ForgotPassword',
            action: 'forgotPassword',
            endpoint: '/auth/forgot-password',
          })
          const i18nKey = mapApiError(err)
          set({ isLoading: false, error: i18nKey })
          throw err
        }
      },

      resetPassword: async (otpCode, newPassword) => {
        const { pendingResetPhone } = get()
        if (!pendingResetPhone) {
          throw new Error('No pending reset session')
        }

        set({ isLoading: true, error: null })

        try {
          await authService.resetPassword(pendingResetPhone, otpCode, newPassword)
          set({
            isLoading: false,
            pendingResetPhone: null,
            pendingResetOtp: null,
          })
        } catch (err) {
          void logError(err, {
            screen: 'ResetPassword',
            action: 'resetPassword',
            endpoint: '/auth/reset-password',
          })
          const i18nKey = mapApiError(err)
          set({ isLoading: false, error: i18nKey })
          throw err
        }
      },

      refreshTokens: async () => {
        const refreshToken = await SecureStore.getItemAsync(SECURE_KEY_REFRESH_TOKEN)
        if (!refreshToken) return
        try {
          const refreshed = await authService.refreshTokens(refreshToken)
          await storeTokens(refreshed.accessToken, refreshed.refreshToken)
        } catch (err) {
          void logError(err, { action: 'refreshTokens', endpoint: '/auth/refresh' })
          await clearSecureTokens()
          set({
            isAuthenticated: false,
            user: null,
            vendorContext: null,
          })
        }
      },
    }),
    {
      name: 'auth-storage',
      // Only AsyncStorage for non-sensitive fields; tokens live in SecureStore
      storage: createJSONStorage(() => buildStorage()),
      partialize: (state) => ({
        isAuthenticated: state.isAuthenticated,
        user: state.user,
        vendorContext: state.vendorContext,
      }),
      onRehydrateStorage: () => (state) => {
        if (state) {
          state.setHydrated(true)
        } else {
          // Rehydration failed (e.g. AsyncStorage error) — unblock the app anyway
          useAuthStore.getState().setHydrated(true)
        }
      },
    },
  ),
)

export default useAuthStore
