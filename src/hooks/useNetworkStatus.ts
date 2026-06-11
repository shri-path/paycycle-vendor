/**
 * useNetworkStatus Hook
 * Purpose: Reactively track device network connectivity state
 * Usage: const { isConnected } = useNetworkStatus()
 */

import { useState, useEffect } from 'react'
import NetInfo, { NetInfoState, NetInfoStateType } from '@react-native-community/netinfo'

interface NetworkStatus {
  /** True when the device has an active internet connection */
  isConnected: boolean
  /** True while the initial connectivity check is pending */
  isChecking: boolean
}

/**
 * Resolve connectivity from a NetInfo state.
 *
 * We treat the device as offline ONLY when the connection `type` is explicitly
 * `none`. We deliberately do NOT trust the bare `isConnected` flag: Android
 * emulators (and some devices) report `isConnected: false` while still carrying a
 * real `wifi`/`cellular` connection, which would otherwise false-block signup and
 * pop the "you are offline" banner. Unknown/null types stay optimistic (online),
 * consistent with the app's offline-first, never-needlessly-block stance.
 */
function resolveConnected(state: NetInfoState): boolean {
  return state.type !== NetInfoStateType.none
}

export function useNetworkStatus(): NetworkStatus {
  const [isConnected, setIsConnected] = useState(true)
  const [isChecking, setIsChecking] = useState(true)

  useEffect(() => {
    // Get the initial state immediately
    void NetInfo.fetch().then((state: NetInfoState) => {
      setIsConnected(resolveConnected(state))
      setIsChecking(false)
    })

    // Subscribe to connectivity changes
    const unsubscribe = NetInfo.addEventListener((state: NetInfoState) => {
      setIsConnected(resolveConnected(state))
    })

    return unsubscribe
  }, [])

  return { isConnected, isChecking }
}
