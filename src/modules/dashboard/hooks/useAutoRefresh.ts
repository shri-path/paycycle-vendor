/**
 * useAutoRefresh (US-010)
 * Purpose: Polls `refresh()` at `intervalMs` only when the screen is focused,
 * the app is in the foreground, and the device is connected — prevents battery
 * drain and needless API calls on low-end devices / 2G connections.
 *
 * Behavior:
 *  - Fires one immediate `refresh()` on screen focus.
 *  - Sets a `setInterval` that fires every `intervalMs` while:
 *      • screen is focused (useFocusEffect)
 *      • AppState === 'active'
 *      • useNetworkStatus().isConnected
 *  - Clears the interval on blur, background transition, or going offline.
 *  - Re-arms the interval when the screen re-focuses or app resumes.
 *
 * Owner screen passes 60_000 ms; staff screen passes 30_000 ms.
 */

import { useRef, useCallback, useEffect } from 'react'
import { AppState, type AppStateStatus } from 'react-native'
import { useFocusEffect } from 'expo-router'
import { useNetworkStatus } from '@hooks/useNetworkStatus'

export function useAutoRefresh(refresh: () => void, intervalMs: number): void {
  const { isConnected } = useNetworkStatus()
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const appStateRef = useRef<AppStateStatus>(AppState.currentState)
  const isConnectedRef = useRef(isConnected)

  // Keep the ref in sync with the hook's reactive value.
  useEffect(() => {
    isConnectedRef.current = isConnected
  }, [isConnected])

  const startInterval = useCallback(() => {
    if (intervalRef.current !== null) return // already running
    if (!isConnectedRef.current) return
    if (appStateRef.current !== 'active') return
    intervalRef.current = setInterval(() => {
      if (isConnectedRef.current && appStateRef.current === 'active') {
        refresh()
      }
    }, intervalMs)
  }, [refresh, intervalMs])

  const stopInterval = useCallback(() => {
    if (intervalRef.current !== null) {
      clearInterval(intervalRef.current)
      intervalRef.current = null
    }
  }, [])

  useFocusEffect(
    useCallback(() => {
      // Immediate refresh on focus.
      if (isConnectedRef.current && appStateRef.current === 'active') {
        refresh()
      }
      startInterval()

      // AppState listener — pause when backgrounded, resume on foreground.
      const appStateSub = AppState.addEventListener('change', (nextState) => {
        appStateRef.current = nextState
        if (nextState === 'active') {
          startInterval()
          if (isConnectedRef.current) refresh()
        } else {
          stopInterval()
        }
      })

      return () => {
        stopInterval()
        appStateSub.remove()
      }
    }, [refresh, startInterval, stopInterval]),
  )

  // Stop polling when going offline, restart when reconnecting.
  useEffect(() => {
    if (!isConnected) {
      stopInterval()
    } else {
      startInterval()
    }
  }, [isConnected, startInterval, stopInterval])
}

export default useAutoRefresh
