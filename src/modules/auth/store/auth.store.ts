/**
 * Auth Store
 * Purpose: Authentication state management with secure token storage
 *
 * Security notes:
 * - JWT tokens (accessToken, refreshToken) are stored ONLY in expo-secure-store
 *   (Keychain on iOS, EncryptedSharedPreferences on Android). Never in AsyncStorage.
 * - pendingResetToken is stored in SecureStore, not in Zustand state.
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
const SECURE_KEY_PENDING_RESET_TOKEN = 'auth.pendingResetToken'

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
    SecureStore.deleteItemAsync(SECURE_KEY_PENDING_RESET_TOKEN).catch(() => undefined),
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

  // Actions
  setHydrated: (value: boolean) => void
  login: (phone: string, password: string) => Promise<void>
  signup: (phone: string, password: string, vendorName: string) => Promise<void>
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
          set({
            isAuthenticated: false,
            user: null,
            vendorContext: null,
            isLoading: false,
            error: null,
            pendingResetPhone: null,
          })
        }
      },

      forgotPassword: async (phone) => {
        set({ isLoading: true, error: null })
        try {
          const resetToken = await authService.forgotPassword(phone)
          // Store the reset token in SecureStore — never in Zustand state
          if (resetToken) {
            await SecureStore.setItemAsync(SECURE_KEY_PENDING_RESET_TOKEN, resetToken)
          }
          set({
            isLoading: false,
            pendingResetPhone: phone,
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

        const resetToken = await SecureStore.getItemAsync(SECURE_KEY_PENDING_RESET_TOKEN)
        if (!resetToken) {
          const err = new Error('No pending reset token in secure storage')
          void logError(err, { screen: 'ResetPassword', action: 'resetPassword' })
          set({ isLoading: false, error: 'common.error' })
          throw err
        }

        try {
          await authService.resetPassword(pendingResetPhone, resetToken, otpCode, newPassword)
          await SecureStore.deleteItemAsync(SECURE_KEY_PENDING_RESET_TOKEN).catch(() => undefined)
          set({
            isLoading: false,
            pendingResetPhone: null,
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
