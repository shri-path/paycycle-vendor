/**
 * useReducedMotion Hook
 * Purpose: Reactively track the OS "Reduce Motion" accessibility preference so
 *          components can skip or shorten non-essential animations.
 * Usage: const reduceMotion = useReducedMotion()
 */

import { useState, useEffect } from 'react'
import { AccessibilityInfo } from 'react-native'

/**
 * Returns true when the user has enabled "Reduce Motion" at the OS level.
 *
 * Components should treat motion as decorative: when this is true, jump
 * animated values to their end state instead of tweening. Defaults to false
 * (motion allowed) until the initial async check resolves.
 */
export function useReducedMotion(): boolean {
  const [reduceMotion, setReduceMotion] = useState(false)

  useEffect(() => {
    let mounted = true

    void AccessibilityInfo.isReduceMotionEnabled().then((enabled) => {
      if (mounted) setReduceMotion(enabled)
    })

    const subscription = AccessibilityInfo.addEventListener(
      'reduceMotionChanged',
      (enabled) => setReduceMotion(enabled),
    )

    return () => {
      mounted = false
      subscription.remove()
    }
  }, [])

  return reduceMotion
}

export default useReducedMotion
