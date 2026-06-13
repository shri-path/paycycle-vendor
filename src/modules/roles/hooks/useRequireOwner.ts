/**
 * useRequireOwner (US-002)
 * Purpose: Defence-in-depth guard for owner-only screens. If the role is resolved
 * and the caller is NOT an owner, redirect to the staff home. The route-group
 * structure is the primary guard; this catches direct/deep-link access.
 *
 * Waits for auth hydration + a resolved role before deciding, so it never
 * redirects during the brief loading window (avoids flicker).
 *
 * Uses useFocusEffect instead of useEffect so the guard only fires when the
 * screen is actually visible. This prevents the crash that occurred when staff
 * cross-navigated to /(app)/supply-lists/[listId]: the supply-lists Stack
 * initializes SupplyListsScreen as its base route (unfocused, behind the detail
 * screen), and a useEffect-based redirect fired during that same commit cycle,
 * causing "maximum update depth exceeded".
 */

import { useCallback } from 'react'
import { useRouter, useFocusEffect } from 'expo-router'
import { useShallow } from 'zustand/react/shallow'
import { useAuthStore } from '@modules/auth/store/auth.store'
import { useRole } from './useRole'

export function useRequireOwner(): void {
  const router = useRouter()
  const isHydrated = useAuthStore(useShallow((s) => s.isHydrated))
  const { roleContext, isOwner, isLoading } = useRole()

  useFocusEffect(
    useCallback(() => {
      if (!isHydrated) return
      if (isLoading) return
      if (!roleContext) return
      if (!isOwner) {
        router.replace('/(app)/(tabs)/staff-home')
      }
    }, [isHydrated, isLoading, roleContext, isOwner, router]),
  )
}

export default useRequireOwner
