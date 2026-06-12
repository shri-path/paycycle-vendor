/**
 * useLimitReached — shared 451 hook (US-009).
 * Purpose: Centralizes the handling of HTTP 451 (SUBSCRIPTION_LIMIT_REACHED)
 * responses from any write endpoint (create customer, invite staff, create list).
 *
 * Usage in host screens:
 *   const limit = useLimitReached()
 *   // in submit catch:
 *   if (limit.show(err, 'customers')) return
 *   // existing non-451 handling...
 *   // in render:
 *   <LimitReachedModal {...limit.state} onUpgrade={limit.goUpgrade} onClose={limit.close} />
 *
 * `show` returns:
 * - `false` for non-axios / non-451 errors → host handles normally.
 * - `true` for 451 → extracts `error.details.limits.{max,current}` + resource,
 *   sets modal state, and returns true so the host can early-return.
 *
 * `goUpgrade` navigates to `/(app)/subscription/upgrade` (canonical upgrade screen).
 * For staff users the CTA navigates to the upgrade screen; server-side 403 prevents
 * the actual upgrade (the screen can show an error for that case).
 *
 * Per OQ-2: local state per host screen — no global modal provider.
 */

import { useState, useCallback } from 'react'
import { useRouter } from 'expo-router'
import axios from 'axios'
import type { LimitResource } from '../components/LimitReachedModal'

export interface LimitState {
  visible: boolean
  resource: LimitResource
  current: number
  max: number
}

export interface UseLimitReachedReturn {
  state: LimitState
  /**
   * Call in the catch block of a write operation.
   * Returns `true` if the error was a 451 (modal shown); `false` otherwise.
   */
  show: (err: unknown, fallbackResource?: LimitResource) => boolean
  /** Close the modal. */
  close: () => void
  /** Navigate to the upgrade screen using the URL from the 451 details (or default). */
  goUpgrade: () => void
}

const DEFAULT_STATE: LimitState = {
  visible: false,
  resource: 'customers',
  current: 0,
  max: 0,
}

const DEFAULT_UPGRADE_PATH = '/(app)/subscription/upgrade'

export function useLimitReached(): UseLimitReachedReturn {
  const router = useRouter()
  const [state, setState] = useState<LimitState>(DEFAULT_STATE)

  const show = useCallback((err: unknown, fallbackResource: LimitResource = 'customers'): boolean => {
    if (!axios.isAxiosError(err)) return false
    if (err.response?.status !== 451) return false

    // Extract details from the 451 response body.
    const errorBody = err.response.data?.error as {
      details?: {
        limits?: { max?: number; current?: number }
        upgradeUrl?: string
        resource?: string
      }
    } | undefined

    const limits = errorBody?.details?.limits
    const current = limits?.current ?? 0
    const max = limits?.max ?? 0
    const detailResource = (errorBody?.details?.resource ?? fallbackResource) as LimitResource

    setState({
      visible: true,
      resource: detailResource,
      current,
      max,
    })

    return true
  }, [])

  const close = useCallback(() => {
    setState((s) => ({ ...s, visible: false }))
  }, [])

  const goUpgrade = useCallback(() => {
    setState((s) => ({ ...s, visible: false }))
    // The API always sends a relative path; we always navigate to the canonical upgrade screen.
    // upgradeUrl is extracted for future extensibility but the Expo Router path is fixed this iteration.
    router.push(DEFAULT_UPGRADE_PATH as never)
  }, [router])

  return { state, show, close, goUpgrade }
}

export default useLimitReached
