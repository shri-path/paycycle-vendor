/**
 * useAutoRefresh hook tests (US-010)
 * Verifies: immediate call on focus, interval-based calls, offline/background pause.
 *
 * NOTE: renderHook is not supported under the jest-expo preset (returns empty result).
 * Tests use a Probe component + render() as the recommended pattern for this project
 * (see src/hooks/__tests__/useNetworkStatus.test.tsx for reference).
 */

jest.mock('expo-router', () => ({
  useFocusEffect: jest.fn(),
}))

jest.mock('@hooks/useNetworkStatus', () => ({
  useNetworkStatus: jest.fn(),
}))

import React from 'react'
import { View, AppState } from 'react-native'
import { render, act } from '@testing-library/react-native'
import { useFocusEffect } from 'expo-router'
import { useNetworkStatus } from '@hooks/useNetworkStatus'
import { useAutoRefresh } from '../useAutoRefresh'

const mockUseFocusEffect = useFocusEffect as jest.MockedFunction<typeof useFocusEffect>
const mockUseNetworkStatus = useNetworkStatus as jest.MockedFunction<typeof useNetworkStatus>

// Capture AppState change listeners for manual triggering
const appStateListeners: Array<(state: string) => void> = []

// Probe component: wrap the hook so render() works (renderHook unsupported under jest-expo)
interface ProbeProps {
  refresh: jest.Mock
  intervalMs: number
}
function Probe({ refresh, intervalMs }: ProbeProps) {
  useAutoRefresh(refresh, intervalMs)
  return React.createElement(View, null)
}

// Helper: sets AppState.currentState as a configurable value property
function setCurrentState(val: 'active' | 'background' | 'inactive') {
  Object.defineProperty(AppState, 'currentState', {
    value: val,
    writable: true,
    configurable: true,
  })
}

beforeEach(() => {
  jest.useFakeTimers()
  appStateListeners.length = 0
  setCurrentState('active')

  // Default: run the focus effect callback immediately (simulates screen focus)
  mockUseFocusEffect.mockImplementation((cb) => {
    cb()
  })

  mockUseNetworkStatus.mockReturnValue({ isConnected: true, isChecking: false })

  // Capture AppState listeners
  jest.spyOn(AppState, 'addEventListener').mockImplementation((_event, handler) => {
    appStateListeners.push(handler as (state: string) => void)
    return { remove: jest.fn() }
  })
})

afterEach(() => {
  jest.useRealTimers()
  jest.restoreAllMocks()
  jest.clearAllMocks()
  setCurrentState('active')
})

describe('useAutoRefresh', () => {
  it('useFocusEffect mock is invoked during render', async () => {
    const refresh = jest.fn()
    await render(React.createElement(Probe, { refresh, intervalMs: 1000 }))
    expect(mockUseFocusEffect).toHaveBeenCalled()
  })

  it('calls refresh immediately on focus when online and active', async () => {
    const refresh = jest.fn()
    await render(React.createElement(Probe, { refresh, intervalMs: 1000 }))
    expect(refresh).toHaveBeenCalledTimes(1)
  })

  it('calls refresh every intervalMs while focused + online + active', async () => {
    const refresh = jest.fn()
    await render(React.createElement(Probe, { refresh, intervalMs: 1000 }))
    refresh.mockClear()

    act(() => { jest.advanceTimersByTime(1000) })
    expect(refresh).toHaveBeenCalledTimes(1)

    act(() => { jest.advanceTimersByTime(1000) })
    expect(refresh).toHaveBeenCalledTimes(2)
  })

  it('does not fire when offline', async () => {
    mockUseNetworkStatus.mockReturnValue({ isConnected: false, isChecking: false })
    const refresh = jest.fn()
    await render(React.createElement(Probe, { refresh, intervalMs: 1000 }))
    expect(refresh).not.toHaveBeenCalled()

    act(() => { jest.advanceTimersByTime(3000) })
    expect(refresh).not.toHaveBeenCalled()
  })

  it('does not start interval when app is backgrounded', async () => {
    setCurrentState('background')
    const refresh = jest.fn()
    await render(React.createElement(Probe, { refresh, intervalMs: 1000 }))
    expect(refresh).not.toHaveBeenCalled()

    act(() => { jest.advanceTimersByTime(3000) })
    expect(refresh).not.toHaveBeenCalled()
  })

  it('pauses interval when AppState changes to background', async () => {
    const refresh = jest.fn()
    await render(React.createElement(Probe, { refresh, intervalMs: 1000 }))
    refresh.mockClear()

    // Simulate going to background via AppState change event
    act(() => {
      appStateListeners.forEach((h) => h('background'))
    })

    act(() => { jest.advanceTimersByTime(3000) })
    expect(refresh).not.toHaveBeenCalled()
  })
})
