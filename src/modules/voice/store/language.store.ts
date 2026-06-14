/**
 * Language Store (US-013)
 * Purpose: Reactive i18n language state + server-side language preferences.
 *
 * Two responsibilities:
 * 1. Reactivity fix — `version` counter triggers useTranslation re-renders when
 *    language changes (OQ-1). Components that call useTranslation() subscribe to
 *    `version` and re-render on every language switch.
 * 2. Persistence fix — `appLanguage` is persisted via Zustand persist +
 *    AsyncStorage so the chosen language survives app restarts (OQ-2).
 *
 * Server sync: fetchPreferences() hydrates `preferences` from the server on login.
 *   The server `appLanguage` wins on login and overrides local persisted value.
 *   setAppLanguage() is optimistic: updates locally + persists, then PATCHes server.
 *
 * Security:
 * - userId from auth.store.user.id — never from params/UI.
 * - Only appLanguage is persisted; preferences (server data) is ephemeral.
 *
 * Logout: clearLanguage() wipes preferences but KEEPS appLanguage so the login
 *   screen remains in the user's chosen language.
 */

import { Platform } from 'react-native'
import { create } from 'zustand'
import { persist, createJSONStorage, type StateStorage } from 'zustand/middleware'
import AsyncStorage from '@react-native-async-storage/async-storage'
import { setLanguage as localesSetLanguage, getCurrentLanguage } from '@locales/index'
import { languageService } from '../service/language.service'
import { mapApiError } from '@utils/errorMapper'
import { logError } from '@utils/logger'
import type { SupportedLanguage } from '@locales/index'
import type { LanguagePreferencesDto, UpdateLanguagePreferencesDto } from '../../../types/voice'

// SSR-safe storage — same helper as auth.store
function buildStorage(): StateStorage {
  if (Platform.OS !== 'web') return AsyncStorage
  if (typeof window === 'undefined') {
    return { getItem: () => null, setItem: () => {}, removeItem: () => {} }
  }
  return window.localStorage
}

/** Derive userId from auth store at call time (avoids module cycle at import). */
function getUserId(): string | null {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { useAuthStore } = require('@modules/auth/store/auth.store') as {
    useAuthStore: { getState: () => { user: { id: string } | null } }
  }
  return useAuthStore.getState().user?.id ?? null
}

// ---------------------------------------------------------------------------
// State interface
// ---------------------------------------------------------------------------

export interface LanguageState {
  // Active UI language (drives t()). Persisted.
  appLanguage: SupportedLanguage
  // Bump on every setAppLanguage so useTranslation re-renders subscribers.
  version: number

  // Full preferences from the server (null until fetched).
  preferences: LanguagePreferencesDto | null
  isPreferencesLoading: boolean
  preferencesError: string | null
  isMutating: boolean
  mutationError: string | null

  // Actions
  setAppLanguage(lang: SupportedLanguage): Promise<void>
  hydrateFromDevice(): void
  fetchPreferences(): Promise<void>
  updatePreferences(patch: UpdateLanguagePreferencesDto): Promise<LanguagePreferencesDto>
  clearLanguage(): void
  clearErrors(): void
}

// ---------------------------------------------------------------------------
// Store
// ---------------------------------------------------------------------------

export const useLanguageStore = create<LanguageState>()(
  persist(
    (set, get) => ({
      appLanguage: getCurrentLanguage(),
      version: 0,

      preferences: null,
      isPreferencesLoading: false,
      preferencesError: null,
      isMutating: false,
      mutationError: null,

      /**
       * Set the active UI language. Calls locales layer, bumps version counter,
       * and persists via Zustand. Does NOT fire a network PATCH — callers call
       * updatePreferences() separately (OQ-2: apply on Save, not on tap).
       */
      setAppLanguage: async (lang) => {
        localesSetLanguage(lang)
        set((s) => ({ appLanguage: lang, version: s.version + 1 }))
      },

      /**
       * Called on cold boot: applies the persisted appLanguage to the locales
       * module in case the module was initialised before rehydration.
       */
      hydrateFromDevice: () => {
        const { appLanguage } = get()
        localesSetLanguage(appLanguage)
      },

      /**
       * GET /users/:userId/language-preferences
       * On success: reconcile appLanguage with server value (server wins on login).
       */
      fetchPreferences: async () => {
        const userId = getUserId()
        if (!userId) return
        set({ isPreferencesLoading: true, preferencesError: null })
        try {
          const prefs = await languageService.getPreferences(userId)
          // Server wins on login — apply server language to the UI
          const serverLang = prefs.appLanguage as SupportedLanguage
          localesSetLanguage(serverLang)
          set((s) => ({
            preferences: prefs,
            appLanguage: serverLang,
            version: s.version + 1,
            isPreferencesLoading: false,
          }))
        } catch (err) {
          void logError(err, {
            screen: 'LanguageSettingsScreen',
            action: 'fetchPreferences',
            endpoint: 'GET /users/:userId/language-preferences',
          })
          set({
            isPreferencesLoading: false,
            preferencesError: mapApiError(err, 'voice'),
          })
        }
      },

      /**
       * PATCH /users/:userId/language-preferences
       * Rethrows so the screen can show inline error + rollback radio selection.
       */
      updatePreferences: async (patch) => {
        const userId = getUserId()
        if (!userId) throw new Error('common.error')
        set({ isMutating: true, mutationError: null })
        try {
          const updated = await languageService.updatePreferences(userId, patch)
          set({ isMutating: false, preferences: updated })
          return updated
        } catch (err) {
          void logError(err, {
            screen: 'LanguageSettingsScreen',
            action: 'updatePreferences',
            endpoint: 'PATCH /users/:userId/language-preferences',
          })
          const i18nKey = mapApiError(err, 'voice')
          set({ isMutating: false, mutationError: i18nKey })
          throw err
        }
      },

      /**
       * Wipe server preferences on logout. Keep appLanguage so the login screen
       * stays in the user's chosen language (per plan §3a / §cross-store).
       */
      clearLanguage: () => {
        set({
          preferences: null,
          isPreferencesLoading: false,
          preferencesError: null,
          isMutating: false,
          mutationError: null,
        })
      },

      clearErrors: () => {
        set({ preferencesError: null, mutationError: null })
      },
    }),
    {
      name: 'language-storage',
      storage: createJSONStorage(() => buildStorage()),
      // Only persist the active language — preferences are server-side truth
      partialize: (state) => ({ appLanguage: state.appLanguage }),
      onRehydrateStorage: () => (state) => {
        // Apply persisted language to the locales module after hydration
        if (state?.appLanguage) {
          localesSetLanguage(state.appLanguage)
        }
      },
    },
  ),
)

export default useLanguageStore
