/**
 * useNetworkStatus Hook
 * Purpose: Reactively track device network connectivity state
 * Usage: const { isConnected } = useNetworkStatus()
 */

import { useState, useEffect } from 'react'
import NetInfo, { NetInfoState } from '@react-native-community/netinfo'

interface NetworkStatus {
  /** True when the device has an active internet connection */
  isConnected: boolean
  /** True while the initial connectivity check is pending */
  isChecking: boolean
}

export function useNetworkStatus(): NetworkStatus {
  const [isConnected, setIsConnected] = useState(true)
  const [isChecking, setIsChecking] = useState(true)

  useEffect(() => {
    // Get the initial state immediately
    void NetInfo.fetch().then((state: NetInfoState) => {
      setIsConnected(state.isConnected ?? true)
      setIsChecking(false)
    })

    // Subscribe to connectivity changes
    const unsubscribe = NetInfo.addEventListener((state: NetInfoState) => {
      setIsConnected(state.isConnected ?? true)
    })

    return unsubscribe
  }, [])

  return { isConnected, isChecking }
}
