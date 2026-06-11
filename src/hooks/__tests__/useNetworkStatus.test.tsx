/**
 * useNetworkStatus tests
 * Purpose: Connectivity is derived from NetInfo's connection `type`, NOT the bare
 * `isConnected` flag — so a real wifi/cellular link that the Android emulator
 * mis-reports as `isConnected: false` is still treated as online (no false
 * "you are offline" banner / blocked signup).
 *
 * Uses a probe component + render() (renderHook is unsupported under this
 * jest-expo preset — it returns an empty result).
 */

import React from 'react'
import { Text } from 'react-native'
import { render, screen, waitFor, act } from '@testing-library/react-native'
import NetInfo, { NetInfoStateType } from '@react-native-community/netinfo'
import { useNetworkStatus } from '../useNetworkStatus'

jest.mock('@react-native-community/netinfo', () => ({
  __esModule: true,
  NetInfoStateType: {
    none: 'none',
    unknown: 'unknown',
    wifi: 'wifi',
    cellular: 'cellular',
  },
  default: {
    fetch: jest.fn(),
    addEventListener: jest.fn().mockReturnValue(() => {}),
  },
}))

const fetchMock = NetInfo.fetch as jest.Mock
const addEventListenerMock = NetInfo.addEventListener as jest.Mock

function Probe() {
  const { isConnected, isChecking } = useNetworkStatus()
  return (
    <Text testID="status">{`${isChecking ? 'checking' : 'ready'}:${isConnected ? 'online' : 'offline'}`}</Text>
  )
}

describe('useNetworkStatus', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    addEventListenerMock.mockReturnValue(() => {})
  })

  it('treats a wifi connection as online even when NetInfo reports isConnected: false (emulator quirk)', async () => {
    fetchMock.mockResolvedValue({ type: NetInfoStateType.wifi, isConnected: false })
    render(<Probe />)
    await waitFor(() => expect(screen.getByTestId('status').props.children).toBe('ready:online'))
  })

  it('is offline only when the connection type is none', async () => {
    fetchMock.mockResolvedValue({ type: NetInfoStateType.none, isConnected: false })
    render(<Probe />)
    await waitFor(() => expect(screen.getByTestId('status').props.children).toBe('ready:offline'))
  })

  it('stays optimistic (online) for unknown connection type', async () => {
    fetchMock.mockResolvedValue({ type: NetInfoStateType.unknown, isConnected: null })
    render(<Probe />)
    await waitFor(() => expect(screen.getByTestId('status').props.children).toBe('ready:online'))
  })

  it('reacts to connectivity changes from the subscription', async () => {
    fetchMock.mockResolvedValue({ type: NetInfoStateType.wifi, isConnected: true })
    let listener: (state: { type: string; isConnected: boolean }) => void = () => {}
    addEventListenerMock.mockImplementation((cb) => {
      listener = cb
      return () => {}
    })

    render(<Probe />)
    await waitFor(() => expect(screen.getByTestId('status').props.children).toBe('ready:online'))

    await act(async () => {
      listener({ type: NetInfoStateType.none, isConnected: false })
    })
    await waitFor(() => expect(screen.getByTestId('status').props.children).toBe('ready:offline'))
  })
})
