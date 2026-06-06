/**
 * Auth Store
 * Purpose: Authentication state management with AsyncStorage persistence
 */

import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'
import AsyncStorage from '@react-native-async-storage/async-storage'
import { authService } from '../service/auth.service'
import type { UserDto, TokenDto, VendorContextDto } from '../../../types/auth'

interface AuthState {
  // Persisted state
  isAuthenticated: boolean
  user: UserDto | null
  tokens: TokenDto | null
  vendorContext: VendorContextDto | null

  // Transient flow state
  isLoading: boolean
  error: string | null
  isHydrated: boolean
  pendingResetPhone: string | null
  pendingResetToken: string | null

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
      tokens: null,
      vendorContext: null,

      isLoading: false,
      error: null,
      isHydrated: false,
      pendingResetPhone: null,
      pendingResetToken: null,

      setHydrated: (value) => set({ isHydrated: value }),

      clearError: () => set({ error: null }),

      login: async (phone, password) => {
        set({ isLoading: true, error: null })
        try {
          const response = await authService.login(phone, password)
          const vendorContext = response.vendorContexts[0] ?? null
          set({
            isAuthenticated: true,
            user: response.user,
            tokens: response.tokens,
            vendorContext,
            isLoading: false,
          })
        } catch (err) {
          const message = err instanceof Error ? err.message : 'auth.invalid_credentials'
          set({ isLoading: false, error: message })
          throw err
        }
      },

      signup: async (phone, password, vendorName) => {
        set({ isLoading: true, error: null })
        try {
          const response = await authService.signup(phone, password, vendorName)
          set({
            isAuthenticated: true,
            user: response.user,
            tokens: response.tokens,
            vendorContext: response.vendorContext,
            isLoading: false,
          })
        } catch (err) {
          const message = err instanceof Error ? err.message : 'auth.invalid_credentials'
          set({ isLoading: false, error: message })
          throw err
        }
      },

      logout: async () => {
        const { tokens } = get()
        set({ isLoading: true })
        try {
          if (tokens) {
            await authService.logout(tokens.refreshToken, tokens.accessToken)
          }
        } finally {
          set({
            isAuthenticated: false,
            user: null,
            tokens: null,
            vendorContext: null,
            isLoading: false,
            error: null,
          })
        }
      },

      forgotPassword: async (phone) => {
        set({ isLoading: true, error: null })
        try {
          const resetToken = await authService.forgotPassword(phone)
          set({
            isLoading: false,
            pendingResetPhone: phone,
            pendingResetToken: resetToken,
          })
        } catch (err) {
          const message = err instanceof Error ? err.message : 'common.error'
          set({ isLoading: false, error: message })
          throw err
        }
      },

      resetPassword: async (otpCode, newPassword) => {
        const { pendingResetPhone, pendingResetToken } = get()
        if (!pendingResetPhone || !pendingResetToken) {
          throw new Error('No pending reset session')
        }
        set({ isLoading: true, error: null })
        try {
          await authService.resetPassword(
            pendingResetPhone,
            pendingResetToken,
            otpCode,
            newPassword,
          )
          set({
            isLoading: false,
            pendingResetPhone: null,
            pendingResetToken: null,
          })
        } catch (err) {
          const message = err instanceof Error ? err.message : 'common.error'
          set({ isLoading: false, error: message })
          throw err
        }
      },

      refreshTokens: async () => {
        const { tokens } = get()
        if (!tokens) return
        try {
          const refreshed = await authService.refreshTokens(tokens.refreshToken)
          set({ tokens: refreshed })
        } catch {
          set({
            isAuthenticated: false,
            user: null,
            tokens: null,
            vendorContext: null,
          })
        }
      },
    }),
    {
      name: 'auth-storage',
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (state) => ({
        isAuthenticated: state.isAuthenticated,
        user: state.user,
        tokens: state.tokens,
        vendorContext: state.vendorContext,
      }),
      onRehydrateStorage: () => (state) => {
        state?.setHydrated(true)
      },
    },
  ),
)

export default useAuthStore
