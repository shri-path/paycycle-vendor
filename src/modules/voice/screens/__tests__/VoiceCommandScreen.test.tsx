/**
 * VoiceCommandScreen Tests — T-31 (US-013)
 * Covers:
 *   - voice-disabled CTA rendered when voiceCommandsEnabled=false
 *   - idle state: mic button visible, example list visible
 *   - done state: undo + next customer buttons shown for single result
 *   - done state: undo NOT shown for mark_all result
 *   - Regression: handleUndo passes listId as first arg (BLOCKER-1 fix)
 *   - offline state: banner shown
 *   - error state: error message shown
 *
 * NOTE: @testing-library/react-native v14 render() is ASYNC — must await it.
 * DisambiguationSheet uses React Native <Modal> which reads Platform.OS;
 * we mock it at the component level to avoid that dependency.
 */

// ---------------------------------------------------------------------------
// Global mocks — must precede all imports
// ---------------------------------------------------------------------------

jest.mock('expo-haptics', () => ({
  impactAsync: jest.fn(),
  notificationAsync: jest.fn(),
  ImpactFeedbackStyle: { Light: 'light', Medium: 'medium', Heavy: 'heavy' },
  NotificationFeedbackType: { Success: 'success', Warning: 'warning', Error: 'error' },
}))

jest.mock('@expo/vector-icons', () => ({ Ionicons: 'Ionicons' }))

const mockBack = jest.fn()
const mockPush = jest.fn()
jest.mock('expo-router', () => ({
  useRouter: () => ({ push: mockPush, back: mockBack, replace: jest.fn() }),
  useLocalSearchParams: jest.fn().mockReturnValue({ listId: 'list-1' }),
}))

jest.mock('@hooks/useNetworkStatus', () => ({
  useNetworkStatus: jest.fn().mockReturnValue({ isConnected: true, isChecking: false }),
}))

jest.mock('@hooks/useTranslation', () => ({
  useTranslation: () => ({
    t: (key: string, params?: Record<string, unknown>) => {
      if (params) return `${key}:${JSON.stringify(params)}`
      return key
    },
  }),
}))

// Silence native-driver animation warnings in test environment
jest.spyOn(console, 'warn').mockImplementation(() => undefined)

jest.mock('@modules/voice/store/voice.store', () => ({
  useVoiceStore: jest.fn(),
}))

jest.mock('@modules/voice/store/language.store', () => ({
  useLanguageStore: jest.fn(),
}))

// Mock useVoiceRecorder with controllable start/stop
const mockRecorderStart = jest.fn()
const mockRecorderStop = jest.fn()
const mockRecorderCancel = jest.fn()
jest.mock('../../hooks/useVoiceRecorder', () => ({
  useVoiceRecorder: () => ({
    start: mockRecorderStart,
    stop: mockRecorderStop,
    cancel: mockRecorderCancel,
    isRecording: false,
    durationMs: 0,
  }),
}))

// Mock DisambiguationSheet to avoid Platform.OS dependency from React Native Modal
jest.mock('../../components', () => {
  const React = require('react')
  const { View, Text, TouchableOpacity } = require('react-native')
  return {
    MicButton: ({ testID, onPress, state: _state }: { testID?: string; onPress: () => void; state: string }) =>
      React.createElement(
        TouchableOpacity,
        { testID: testID ?? 'mic-button', onPress, accessibilityRole: 'button' },
        React.createElement(Text, null, 'MicButton'),
      ),
    VoiceExampleList: () => React.createElement(View, { testID: 'voice-example-list' }),
    LastCommandCard: () => null,
    VoiceResultCard: ({ testID }: { testID?: string }) =>
      React.createElement(View, { testID: testID ?? 'voice-result-card' }),
    DisambiguationSheet: () => null,
  }
})

// Suppress ScreenErrorBoundary
jest.mock('@components/composite/ScreenErrorBoundary', () => {
  const { View } = require('react-native')
  return {
    ScreenErrorBoundary: ({ children }: { children: React.ReactNode }) =>
      require('react').createElement(View, null, children),
  }
})

jest.mock('zustand/react/shallow', () => ({
  useShallow: (selector: (s: unknown) => unknown) => selector,
}))

// Mock the delivery store so handleUndo doesn't hit real DB/auth logic
const mockMarkDelivery = jest.fn().mockResolvedValue(undefined)
jest.mock('@modules/delivery/store/delivery.store', () => ({
  useDeliveryStore: {
    getState: () => ({ markDelivery: mockMarkDelivery }),
  },
}))

// ---------------------------------------------------------------------------
// Imports
// ---------------------------------------------------------------------------

import React from 'react'
import { render, fireEvent, act } from '@testing-library/react-native'
import { useNetworkStatus } from '@hooks/useNetworkStatus'

import VoiceCommandScreen from '../VoiceCommandScreen'

const { useVoiceStore } = jest.requireMock('@modules/voice/store/voice.store') as {
  useVoiceStore: jest.Mock & { setState: jest.Mock; getState: jest.Mock }
}
const { useLanguageStore } = jest.requireMock('@modules/voice/store/language.store') as {
  useLanguageStore: jest.Mock
}
const useNetworkStatusMock = useNetworkStatus as jest.Mock

// ---------------------------------------------------------------------------
// Helper: build default store mocks
// ---------------------------------------------------------------------------

interface VoiceStoreMock {
  recordingState?: string
  lastTranscription?: string | null
  lastInterpretation?: Record<string, unknown> | null
  lastResult?: Record<string, unknown> | null
  lastLogId?: string | null
  candidates?: Array<{ id: string; name: string }>
  error?: string | null
  transcribe?: jest.Mock
  executeCommand?: jest.Mock
  reset?: jest.Mock
  setRecordingState?: jest.Mock
}

function makeVoiceStore(overrides: VoiceStoreMock = {}) {
  return {
    recordingState: 'idle',
    lastTranscription: null,
    lastInterpretation: null,
    lastResult: null,
    lastLogId: null,
    candidates: [],
    error: null,
    transcribe: jest.fn(),
    executeCommand: jest.fn(),
    reset: jest.fn(),
    setRecordingState: jest.fn(),
    ...overrides,
  }
}

function makeLanguageStore(overrides: Partial<{
  appLanguage: string
  voiceCommandsEnabled: boolean
  preferences: Record<string, unknown> | null
}> = {}) {
  const { voiceCommandsEnabled = true, ...rest } = overrides
  return {
    appLanguage: 'en',
    preferences: { voiceCommandsEnabled },
    ...rest,
  }
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('VoiceCommandScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    useNetworkStatusMock.mockReturnValue({ isConnected: true, isChecking: false })

    // Default: voice enabled, idle state
    useVoiceStore.mockImplementation((selector: (s: unknown) => unknown) => {
      const state = makeVoiceStore()
      return typeof selector === 'function' ? selector(state) : state
    })
    ;(useVoiceStore as unknown as { getState: jest.Mock }).getState = jest.fn().mockReturnValue(
      makeVoiceStore(),
    )

    useLanguageStore.mockImplementation((selector: (s: unknown) => unknown) => {
      const state = makeLanguageStore()
      return typeof selector === 'function' ? selector(state) : state
    })
  })

  // -------------------------------------------------------------------------
  // Voice disabled CTA
  // -------------------------------------------------------------------------
  describe('voice-disabled state', () => {
    it('renders go-to-settings CTA when voiceCommandsEnabled=false', async () => {
      useLanguageStore.mockImplementation((selector: (s: unknown) => unknown) => {
        const state = makeLanguageStore({ voiceCommandsEnabled: false })
        return typeof selector === 'function' ? selector(state) : state
      })

      const { getByTestId } = await render(<VoiceCommandScreen />)
      expect(getByTestId('goto-lang-settings-btn')).toBeTruthy()
    })

    it('does NOT render mic button when disabled', async () => {
      useLanguageStore.mockImplementation((selector: (s: unknown) => unknown) => {
        const state = makeLanguageStore({ voiceCommandsEnabled: false })
        return typeof selector === 'function' ? selector(state) : state
      })

      const { queryByTestId } = await render(<VoiceCommandScreen />)
      expect(queryByTestId('mic-button')).toBeNull()
    })

    it('navigates to language settings when CTA pressed', async () => {
      useLanguageStore.mockImplementation((selector: (s: unknown) => unknown) => {
        const state = makeLanguageStore({ voiceCommandsEnabled: false })
        return typeof selector === 'function' ? selector(state) : state
      })

      const { getByTestId } = await render(<VoiceCommandScreen />)
      fireEvent.press(getByTestId('goto-lang-settings-btn'))
      expect(mockPush).toHaveBeenCalledWith('/(app)/settings/language')
    })

    it('defaults voiceCommandsEnabled to false when preferences=null (MAJOR-2 fix)', async () => {
      // When preferences haven't loaded yet, should show disabled state (not functional)
      useLanguageStore.mockImplementation((selector: (s: unknown) => unknown) => {
        const state = { appLanguage: 'en', preferences: null }
        return typeof selector === 'function' ? selector(state) : state
      })

      const { getByTestId } = await render(<VoiceCommandScreen />)
      // With ?? false, preferences=null means disabled → shows CTA
      expect(getByTestId('goto-lang-settings-btn')).toBeTruthy()
    })
  })

  // -------------------------------------------------------------------------
  // Idle state
  // -------------------------------------------------------------------------
  describe('idle state', () => {
    it('renders mic button in idle state', async () => {
      const { getByTestId } = await render(<VoiceCommandScreen />)
      expect(getByTestId('mic-button')).toBeTruthy()
    })

    it('does not show undo or next-customer buttons in idle state', async () => {
      const { queryByTestId } = await render(<VoiceCommandScreen />)
      expect(queryByTestId('undo-btn')).toBeNull()
      expect(queryByTestId('next-customer-btn')).toBeNull()
    })
  })

  // -------------------------------------------------------------------------
  // Done state — single customer result
  // -------------------------------------------------------------------------
  describe('done state (single customer)', () => {
    const singleResult = {
      executed: true,
      action: 'mark_delivered',
      customerId: '10',
      customerName: 'Sharma Family',
      deliveryId: '987',
      status: 'DELIVERED',
    }

    beforeEach(() => {
      useVoiceStore.mockImplementation((selector: (s: unknown) => unknown) => {
        const state = makeVoiceStore({
          lastResult: singleResult,
          recordingState: 'idle',
        })
        return typeof selector === 'function' ? selector(state) : state
      })
    })

    it('shows VoiceResultCard when lastResult is set', async () => {
      const { getByTestId } = await render(<VoiceCommandScreen />)
      expect(getByTestId('voice-result-card')).toBeTruthy()
    })

    it('shows Undo button for single-customer result with deliveryId', async () => {
      const { getByTestId } = await render(<VoiceCommandScreen />)
      expect(getByTestId('undo-btn')).toBeTruthy()
    })

    it('shows Next Customer button', async () => {
      const { getByTestId } = await render(<VoiceCommandScreen />)
      expect(getByTestId('next-customer-btn')).toBeTruthy()
    })

    it('calls reset() when Next Customer pressed', async () => {
      const resetFn = jest.fn()
      useVoiceStore.mockImplementation((selector: (s: unknown) => unknown) => {
        const state = makeVoiceStore({
          lastResult: singleResult,
          recordingState: 'idle',
          reset: resetFn,
        })
        return typeof selector === 'function' ? selector(state) : state
      })

      const { getByTestId } = await render(<VoiceCommandScreen />)
      fireEvent.press(getByTestId('next-customer-btn'))
      expect(resetFn).toHaveBeenCalled()
    })
  })

  // -------------------------------------------------------------------------
  // Done state — mark_all result
  // -------------------------------------------------------------------------
  describe('done state (mark_all)', () => {
    const markAllResult = {
      executed: true,
      action: 'mark_all',
      markedCount: 7,
    }

    beforeEach(() => {
      useVoiceStore.mockImplementation((selector: (s: unknown) => unknown) => {
        const state = makeVoiceStore({
          lastResult: markAllResult,
          recordingState: 'idle',
        })
        return typeof selector === 'function' ? selector(state) : state
      })
    })

    it('shows VoiceResultCard', async () => {
      const { getByTestId } = await render(<VoiceCommandScreen />)
      expect(getByTestId('voice-result-card')).toBeTruthy()
    })

    it('does NOT show Undo button for mark_all', async () => {
      const { queryByTestId } = await render(<VoiceCommandScreen />)
      expect(queryByTestId('undo-btn')).toBeNull()
    })

    it('shows Next Customer button', async () => {
      const { getByTestId } = await render(<VoiceCommandScreen />)
      expect(getByTestId('next-customer-btn')).toBeTruthy()
    })
  })

  // -------------------------------------------------------------------------
  // Undo path regression (BLOCKER-1)
  // -------------------------------------------------------------------------
  describe('undo path regression (BLOCKER-1)', () => {
    it('handleUndo calls markDelivery(listId, deliveryId, PENDING) — 3-arg fix', async () => {
      // BLOCKER-1 fix verification: markDelivery must receive listId as the FIRST argument,
      // not deliveryId first (the original 2-arg bug). Confirmed by checking all 3 arguments.
      const resetFn = jest.fn()
      mockMarkDelivery.mockResolvedValue(undefined)

      const singleResult = {
        executed: true,
        action: 'mark_delivered',
        customerId: '10',
        customerName: 'Sharma Family',
        deliveryId: '987',
        status: 'DELIVERED',
      }

      useVoiceStore.mockImplementation((selector: (s: unknown) => unknown) => {
        const state = makeVoiceStore({
          lastResult: singleResult,
          recordingState: 'idle',
          reset: resetFn,
        })
        return typeof selector === 'function' ? selector(state) : state
      })

      const { getByTestId } = await render(<VoiceCommandScreen />)

      await act(async () => {
        fireEvent.press(getByTestId('undo-btn'))
      })

      // Verify 3-arg call: markDelivery(listId, deliveryId, 'PENDING')
      // listId comes from useLocalSearchParams which returns { listId: 'list-1' }
      expect(mockMarkDelivery).toHaveBeenCalledWith('list-1', '987', 'PENDING')

      // reset() is always called after undo
      expect(resetFn).toHaveBeenCalled()
    })
  })

  // -------------------------------------------------------------------------
  // Offline state
  // -------------------------------------------------------------------------
  describe('offline state', () => {
    it('shows offline warning banner when not connected', async () => {
      useNetworkStatusMock.mockReturnValue({ isConnected: false, isChecking: false })
      const { toJSON } = await render(<VoiceCommandScreen />)
      // Banner contains 'common.offline' key (since useTranslation mock returns key)
      const json = JSON.stringify(toJSON())
      expect(json).toContain('common.offline')
    })
  })

  // -------------------------------------------------------------------------
  // Error state
  // -------------------------------------------------------------------------
  describe('error state', () => {
    it('shows error banner when voice store has error', async () => {
      useVoiceStore.mockImplementation((selector: (s: unknown) => unknown) => {
        const state = makeVoiceStore({ error: 'voice.error_unknown' })
        return typeof selector === 'function' ? selector(state) : state
      })

      const { toJSON } = await render(<VoiceCommandScreen />)
      const json = JSON.stringify(toJSON())
      expect(json).toContain('voice.error_unknown')
    })
  })
})
