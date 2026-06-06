/**
 * App Store
 * Purpose: Global app state management
 * Usage: useAppStore() hook for accessing app-level state like language, theme, loading
 */

import { create } from 'zustand'
import type { SupportedLanguage } from '@locales/index'

export interface AppStoreState {
  // Language
  language: SupportedLanguage
  setLanguage: (language: SupportedLanguage) => void

  // Theme
  isDarkMode: boolean
  toggleDarkMode: () => void

  // Loading states
  isLoading: boolean
  setLoading: (loading: boolean) => void

  // Error handling
  error: string | null
  setError: (error: string | null) => void
  clearError: () => void

  // Offline status
  isOnline: boolean
  setOnline: (online: boolean) => void

  // Sync status
  isSyncing: boolean
  setSyncing: (syncing: boolean) => void
}

/**
 * App Store
 */
export const useAppStore = create<AppStoreState>((set) => ({
  // Language
  language: 'en',
  setLanguage: (language) => set({ language }),

  // Theme
  isDarkMode: false,
  toggleDarkMode: () => set((state) => ({ isDarkMode: !state.isDarkMode })),

  // Loading
  isLoading: false,
  setLoading: (isLoading) => set({ isLoading }),

  // Error
  error: null,
  setError: (error) => set({ error }),
  clearError: () => set({ error: null }),

  // Offline
  isOnline: true,
  setOnline: (isOnline) => set({ isOnline }),

  // Sync
  isSyncing: false,
  setSyncing: (isSyncing) => set({ isSyncing }),
}))

export default useAppStore
