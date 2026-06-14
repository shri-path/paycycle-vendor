/**
 * Language Store Tests — T-28 (US-013)
 * Covers: setAppLanguage bumps version, fetchPreferences server-wins,
 *         English forces transliteration reconciliation in fetchPreferences,
 *         clearLanguage keeps appLanguage, clearErrors, updatePreferences rethrow.
 */

// ---------------------------------------------------------------------------
// Mocks — must precede imports (jest.mock is hoisted automatically)
// ---------------------------------------------------------------------------

jest.mock('@modules/auth/store/auth.store', () => ({
  useAuthStore: {
    getState: () => ({ user: { id: 'user-1' } }),
  },
}))

jest.mock('@utils/logger', () => ({ logError: jest.fn() }))
jest.mock('@utils/errorMapper', () => ({
  mapApiError: jest.fn(() => 'voice.error_unknown'),
}))

const mockGetPreferences = jest.fn()
const mockUpdatePreferences = jest.fn()

jest.mock('../../service/language.service', () => ({
  languageService: {
    getPreferences: (...args: unknown[]) => mockGetPreferences(...args),
    updatePreferences: (...args: unknown[]) => mockUpdatePreferences(...args),
  },
}))

// Mock locales — use jest.fn() inside factory (hoisting-safe; access via requireMock)
jest.mock('@locales/index', () => ({
  setLanguage: jest.fn(),
  getCurrentLanguage: jest.fn(() => 'en'),
  t: (key: string) => key,
}))

// AsyncStorage is already mocked globally in jest.setup.js; re-declare here
// for clarity but the global one is sufficient.

// ---------------------------------------------------------------------------
// Imports
// ---------------------------------------------------------------------------

import { act } from '@testing-library/react-native'
import { useLanguageStore } from '../language.store'
import type { LanguagePreferencesDto } from '../../../../types/voice'

// Access mocked locale functions via requireMock (safe after hoisting)
const { setLanguage: mockLocalesSetLanguage } = jest.requireMock('@locales/index') as {
  setLanguage: jest.Mock
  getCurrentLanguage: jest.Mock
}

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

const mockPreferences: LanguagePreferencesDto = {
  appLanguage: 'hi',
  secondaryLanguage: 'en',
  voiceCommandsEnabled: true,
  voiceResponsesEnabled: false,
  transliterationEnabled: true,
  billLanguageDefault: 'customer',
  preferredVoiceAccent: null,
}

const mockEnglishPreferences: LanguagePreferencesDto = {
  ...mockPreferences,
  appLanguage: 'en',
  transliterationEnabled: true, // server returns true but English should force false in UI
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function resetStore() {
  useLanguageStore.setState({
    appLanguage: 'en',
    version: 0,
    preferences: null,
    isPreferencesLoading: false,
    preferencesError: null,
    isMutating: false,
    mutationError: null,
  })
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('useLanguageStore', () => {
  beforeEach(() => {
    resetStore()
    jest.clearAllMocks()
  })

  // -------------------------------------------------------------------------
  // setAppLanguage
  // -------------------------------------------------------------------------
  describe('setAppLanguage', () => {
    it('bumps version on language change', async () => {
      const before = useLanguageStore.getState().version
      await act(async () => {
        await useLanguageStore.getState().setAppLanguage('hi')
      })
      const state = useLanguageStore.getState()
      expect(state.version).toBe(before + 1)
    })

    it('updates appLanguage in store', async () => {
      await act(async () => {
        await useLanguageStore.getState().setAppLanguage('ta')
      })
      expect(useLanguageStore.getState().appLanguage).toBe('ta')
    })

    it('calls locales setLanguage with new lang', async () => {
      await act(async () => {
        await useLanguageStore.getState().setAppLanguage('mr')
      })
      expect(mockLocalesSetLanguage).toHaveBeenCalledWith('mr')
    })

    it('each sequential call increments version by 1', async () => {
      await act(async () => {
        await useLanguageStore.getState().setAppLanguage('hi')
      })
      await act(async () => {
        await useLanguageStore.getState().setAppLanguage('en')
      })
      await act(async () => {
        await useLanguageStore.getState().setAppLanguage('ta')
      })
      expect(useLanguageStore.getState().version).toBe(3)
    })
  })

  // -------------------------------------------------------------------------
  // fetchPreferences — server wins on login
  // -------------------------------------------------------------------------
  describe('fetchPreferences', () => {
    it('sets preferences on success', async () => {
      mockGetPreferences.mockResolvedValueOnce(mockPreferences)
      await act(async () => {
        await useLanguageStore.getState().fetchPreferences()
      })
      const state = useLanguageStore.getState()
      expect(state.preferences).toEqual(mockPreferences)
      expect(state.isPreferencesLoading).toBe(false)
      expect(state.preferencesError).toBeNull()
    })

    it('applies server appLanguage (server wins on login)', async () => {
      mockGetPreferences.mockResolvedValueOnce(mockPreferences)
      await act(async () => {
        await useLanguageStore.getState().fetchPreferences()
      })
      expect(useLanguageStore.getState().appLanguage).toBe('hi')
      expect(mockLocalesSetLanguage).toHaveBeenCalledWith('hi')
    })

    it('bumps version after server language applied', async () => {
      const before = useLanguageStore.getState().version
      mockGetPreferences.mockResolvedValueOnce(mockPreferences)
      await act(async () => {
        await useLanguageStore.getState().fetchPreferences()
      })
      expect(useLanguageStore.getState().version).toBe(before + 1)
    })

    it('sets preferencesError on failure and does not throw', async () => {
      mockGetPreferences.mockRejectedValueOnce(new Error('network'))
      await act(async () => {
        await useLanguageStore.getState().fetchPreferences()
      })
      const state = useLanguageStore.getState()
      expect(state.preferences).toBeNull()
      expect(state.isPreferencesLoading).toBe(false)
      expect(state.preferencesError).toBe('voice.error_unknown')
    })

    it('no-ops when userId is not available', async () => {
      // Temporarily override auth mock to return no user
      const { useAuthStore } = jest.requireMock('@modules/auth/store/auth.store') as {
        useAuthStore: { getState: () => { user: { id: string } | null } }
      }
      const origGetState = useAuthStore.getState
      useAuthStore.getState = () => ({ user: null })
      await act(async () => {
        await useLanguageStore.getState().fetchPreferences()
      })
      expect(mockGetPreferences).not.toHaveBeenCalled()
      useAuthStore.getState = origGetState
    })

    it('sets appLanguage to en when server returns en (transliteration stored as-is)', async () => {
      mockGetPreferences.mockResolvedValueOnce(mockEnglishPreferences)
      await act(async () => {
        await useLanguageStore.getState().fetchPreferences()
      })
      expect(useLanguageStore.getState().appLanguage).toBe('en')
      // Preferences stored exactly as server sent (UI enforces transliteration=false for en)
      expect(useLanguageStore.getState().preferences?.transliterationEnabled).toBe(true)
    })
  })

  // -------------------------------------------------------------------------
  // updatePreferences — rethrows on failure
  // -------------------------------------------------------------------------
  describe('updatePreferences', () => {
    it('updates preferences in store on success', async () => {
      const updated = { ...mockPreferences, voiceCommandsEnabled: false }
      mockUpdatePreferences.mockResolvedValueOnce(updated)
      await act(async () => {
        await useLanguageStore.getState().updatePreferences({ voiceCommandsEnabled: false })
      })
      expect(useLanguageStore.getState().preferences?.voiceCommandsEnabled).toBe(false)
      expect(useLanguageStore.getState().isMutating).toBe(false)
    })

    it('sets mutationError and RETHROWS on failure', async () => {
      mockUpdatePreferences.mockRejectedValueOnce(new Error('network'))
      await expect(
        act(async () => {
          await useLanguageStore.getState().updatePreferences({ voiceCommandsEnabled: true })
        }),
      ).rejects.toThrow()
      expect(useLanguageStore.getState().mutationError).toBe('voice.error_unknown')
      expect(useLanguageStore.getState().isMutating).toBe(false)
    })
  })

  // -------------------------------------------------------------------------
  // clearLanguage — wipes preferences, KEEPS appLanguage
  // -------------------------------------------------------------------------
  describe('clearLanguage', () => {
    it('wipes preferences but keeps appLanguage', async () => {
      useLanguageStore.setState({
        preferences: mockPreferences,
        appLanguage: 'hi',
        preferencesError: 'some.error',
        mutationError: 'other.error',
      })
      await act(async () => {
        useLanguageStore.getState().clearLanguage()
      })
      const state = useLanguageStore.getState()
      expect(state.preferences).toBeNull()
      expect(state.appLanguage).toBe('hi') // preserved!
      expect(state.preferencesError).toBeNull()
      expect(state.mutationError).toBeNull()
      expect(state.isPreferencesLoading).toBe(false)
      expect(state.isMutating).toBe(false)
    })
  })

  // -------------------------------------------------------------------------
  // clearErrors
  // -------------------------------------------------------------------------
  describe('clearErrors', () => {
    it('resets all error fields to null', async () => {
      useLanguageStore.setState({
        preferencesError: 'voice.error_unknown',
        mutationError: 'voice.error_unknown',
      })
      await act(async () => {
        useLanguageStore.getState().clearErrors()
      })
      const state = useLanguageStore.getState()
      expect(state.preferencesError).toBeNull()
      expect(state.mutationError).toBeNull()
    })
  })
})
