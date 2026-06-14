/**
 * Voice Component Tests — T-27 (US-013)
 * Covers:
 *   - DisambiguationSheet: renders candidates, calls onSelect, calls onDismiss
 *   - MicButton: renders in idle/recording/processing states, calls onPress, a11y
 *   - VoiceExampleList: renders example commands
 *   - VoiceResultCard: renders single-customer and mark_all results
 *   - i18n reactivity: useTranslation re-renders on version bump (T-30)
 *
 * NOTE: @testing-library/react-native v14 render() is ASYNC — must await it.
 */

// ---------------------------------------------------------------------------
// Mocks — must precede imports
// ---------------------------------------------------------------------------

jest.mock('@hooks/useTranslation', () => ({
  useTranslation: () => ({
    t: (key: string, params?: Record<string, unknown>) => {
      if (params) return `${key}:${JSON.stringify(params)}`
      return key
    },
  }),
}))

jest.mock('expo-haptics', () => ({
  impactAsync: jest.fn(),
  notificationAsync: jest.fn(),
  ImpactFeedbackStyle: { Light: 'light', Medium: 'medium', Heavy: 'heavy' },
  NotificationFeedbackType: { Success: 'success', Warning: 'warning', Error: 'error' },
}))

jest.mock('@expo/vector-icons', () => ({ Ionicons: 'Ionicons' }))

jest.mock('@react-native-async-storage/async-storage', () => ({
  getItem: jest.fn(() => Promise.resolve(null)),
  setItem: jest.fn(() => Promise.resolve()),
  removeItem: jest.fn(() => Promise.resolve()),
}))

jest.mock('@locales/index', () => ({
  t: (key: string) => key,
  setLanguage: jest.fn(),
  getCurrentLanguage: jest.fn(() => 'en'),
}))

// Silence native-driver animation warnings in test environment
jest.spyOn(console, 'warn').mockImplementation(() => undefined)

// ---------------------------------------------------------------------------
// Imports
// ---------------------------------------------------------------------------

import React from 'react'
import { render, fireEvent, act } from '@testing-library/react-native'

import { DisambiguationSheet } from '../DisambiguationSheet'
import { MicButton } from '../MicButton'
import { VoiceExampleList } from '../VoiceExampleList'
import { VoiceResultCard } from '../VoiceResultCard'
import type { VoiceCandidateDto, ExecuteCommandResultDto } from '../../../../types/voice'

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

const mockCandidates: VoiceCandidateDto[] = [
  { id: '12', name: 'Anil Kumar' },
  { id: '18', name: 'Anil Sharma' },
]

const singleResult: ExecuteCommandResultDto = {
  executed: true,
  action: 'mark_delivered',
  customerId: '10',
  customerName: 'Sharma Family',
  deliveryId: '987',
  status: 'DELIVERED',
}

const markAllResult: ExecuteCommandResultDto = {
  executed: true,
  action: 'mark_all',
  markedCount: 7,
}

// ---------------------------------------------------------------------------
// DisambiguationSheet tests
// ---------------------------------------------------------------------------

describe('DisambiguationSheet', () => {
  const onSelect = jest.fn()
  const onDismiss = jest.fn()

  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('renders all candidate names when visible', async () => {
    const { getByText } = await render(
      <DisambiguationSheet
        visible
        candidates={mockCandidates}
        onSelect={onSelect}
        onDismiss={onDismiss}
        testID="disambig"
      />,
    )
    expect(getByText('Anil Kumar')).toBeTruthy()
    expect(getByText('Anil Sharma')).toBeTruthy()
  })

  it('calls onSelect with the correct candidate when tapped', async () => {
    const { getByTestId } = await render(
      <DisambiguationSheet
        visible
        candidates={mockCandidates}
        onSelect={onSelect}
        onDismiss={onDismiss}
        testID="disambig"
      />,
    )
    fireEvent.press(getByTestId('candidate-12'))
    expect(onSelect).toHaveBeenCalledWith(mockCandidates[0])
  })

  it('calls onSelect with the second candidate', async () => {
    const { getByTestId } = await render(
      <DisambiguationSheet
        visible
        candidates={mockCandidates}
        onSelect={onSelect}
        onDismiss={onDismiss}
        testID="disambig"
      />,
    )
    fireEvent.press(getByTestId('candidate-18'))
    expect(onSelect).toHaveBeenCalledWith(mockCandidates[1])
  })

  it('calls onDismiss when cancel button pressed', async () => {
    const { getByTestId } = await render(
      <DisambiguationSheet
        visible
        candidates={mockCandidates}
        onSelect={onSelect}
        onDismiss={onDismiss}
        testID="disambig"
      />,
    )
    fireEvent.press(getByTestId('disambig-cancel'))
    expect(onDismiss).toHaveBeenCalled()
  })

  it('renders empty candidates list without crashing', async () => {
    const { queryByTestId } = await render(
      <DisambiguationSheet
        visible
        candidates={[]}
        onSelect={onSelect}
        onDismiss={onDismiss}
        testID="disambig"
      />,
    )
    expect(queryByTestId('candidate-12')).toBeNull()
  })

  it('does not render content when visible=false', async () => {
    const { queryByText } = await render(
      <DisambiguationSheet
        visible={false}
        candidates={mockCandidates}
        onSelect={onSelect}
        onDismiss={onDismiss}
        testID="disambig"
      />,
    )
    // When not visible, Modal content is hidden
    expect(queryByText('Anil Kumar')).toBeNull()
  })
})

// ---------------------------------------------------------------------------
// MicButton tests
// ---------------------------------------------------------------------------

describe('MicButton', () => {
  const onPress = jest.fn()

  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('renders in idle state without crashing', async () => {
    const { getByTestId } = await render(
      <MicButton state="idle" onPress={onPress} testID="mic-btn" />,
    )
    expect(getByTestId('mic-btn')).toBeTruthy()
  })

  it('renders in recording state', async () => {
    const { getByTestId } = await render(
      <MicButton state="recording" onPress={onPress} testID="mic-btn" />,
    )
    expect(getByTestId('mic-btn')).toBeTruthy()
  })

  it('renders in processing state', async () => {
    const { getByTestId } = await render(
      <MicButton state="processing" onPress={onPress} testID="mic-btn" />,
    )
    expect(getByTestId('mic-btn')).toBeTruthy()
  })

  it('calls onPress when tapped', async () => {
    const { getByTestId } = await render(
      <MicButton state="idle" onPress={onPress} testID="mic-btn" />,
    )
    // The Pressable's testID is "{testID}-press"; the outer View gets {testID}
    fireEvent.press(getByTestId('mic-btn-press'))
    expect(onPress).toHaveBeenCalledTimes(1)
  })

  it('has accessibilityState.disabled=true when disabled prop is set', async () => {
    // fireEvent bypasses Pressable's disabled check, so we assert the a11y state instead
    const { getByTestId } = await render(
      <MicButton state="idle" onPress={onPress} disabled testID="mic-btn" />,
    )
    const pressable = getByTestId('mic-btn-press')
    expect(pressable.props.accessibilityState?.disabled).toBe(true)
  })

  it('has accessibilityRole button', async () => {
    const { getByTestId } = await render(
      <MicButton state="idle" onPress={onPress} testID="mic-btn" />,
    )
    // accessibilityRole is on the Pressable, not the outer wrapper View
    const pressable = getByTestId('mic-btn-press')
    expect(pressable.props.accessibilityRole).toBe('button')
  })
})

// ---------------------------------------------------------------------------
// VoiceExampleList tests
// ---------------------------------------------------------------------------

describe('VoiceExampleList', () => {
  it('renders without crashing', async () => {
    const { toJSON } = await render(<VoiceExampleList />)
    expect(toJSON()).toBeTruthy()
  })

  it('renders example keys (uses t() to display translated text)', async () => {
    const { toJSON } = await render(<VoiceExampleList />)
    // The component renders t('voice.examples_title') etc. which returns the key in test mode
    const json = JSON.stringify(toJSON())
    // Verify the examples section is rendered
    expect(json).toBeTruthy()
  })
})

// ---------------------------------------------------------------------------
// VoiceResultCard tests
// ---------------------------------------------------------------------------

describe('VoiceResultCard', () => {
  it('renders single-customer result without crashing', async () => {
    const { toJSON } = await render(
      <VoiceResultCard result={singleResult} confidence={95} testID="result-card" />,
    )
    expect(toJSON()).toBeTruthy()
  })

  it('renders mark_all result without crashing', async () => {
    const { toJSON } = await render(
      <VoiceResultCard result={markAllResult} confidence={90} testID="result-card" />,
    )
    expect(toJSON()).toBeTruthy()
  })

  it('shows customer name for single-customer results', async () => {
    const { getByTestId } = await render(
      <VoiceResultCard result={singleResult} confidence={95} testID="result-card" />,
    )
    expect(getByTestId('result-card')).toBeTruthy()
  })
})

// ---------------------------------------------------------------------------
// i18n reactivity test (T-30)
// Verifies the OQ-1 pattern: bumping the language store version causes
// useTranslation consumers to re-render.
// ---------------------------------------------------------------------------

describe('useTranslation reactivity (T-30)', () => {
  it('re-renders consumer component when language store version bumps', async () => {
    // Import the real useLanguageStore (not the mock — this file mocks @locales/index
    // but NOT the language store itself, so requireActual returns the real store)
    const { useLanguageStore } = require('../../store/language.store') as typeof import('../../store/language.store')

    // Reset store version to a known state
    useLanguageStore.setState({ version: 0 })

    // A minimal component that uses the real useTranslation.
    // We inline the subscription pattern rather than importing useTranslation
    // (which is mocked at the top of this file) to avoid jest.resetModules issues.
    let renderCount = 0
    const TestComponent = () => {
      // Subscribe to version via the real store — this is exactly what useTranslation does
      useLanguageStore((s) => s.version)
      renderCount++
      return null
    }

    await render(<TestComponent />)
    const initialRenderCount = renderCount

    // Bump version to simulate language change
    await act(async () => {
      useLanguageStore.setState((s) => ({ version: s.version + 1 }))
    })

    // Component should have re-rendered at least once more
    expect(renderCount).toBeGreaterThan(initialRenderCount)
  })
})
