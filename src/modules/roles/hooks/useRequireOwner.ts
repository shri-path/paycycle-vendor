/**
 * useRequireOwner (US-002)
 * Purpose: Defence-in-depth guard for owner-only screens. If the role is resolved
 * and the caller is NOT an owner, redirect to the staff home. The route-group
 * structure is the primary guard; this catches direct/deep-link access.
 *
 * Waits for auth hydration + a resolved role before deciding, so it never
 * redirects during the brief loading window (avoids flicker).
 */

import { useEffect } from 'react'
import { useRouter } from 'expo-router'
import { useShallow } from 'zustand/react/shallow'
import { useAuthStore } from '@modules/auth/store/auth.store'
import { useRole } from './useRole'

export function useRequireOwner(): void {
  const router = useRouter()
  const isHydrated = useAuthStore(useShallow((s) => s.isHydrated))
  const { roleContext, isOwner, isLoading } = useRole()

  useEffect(() => {
    if (!isHydrated) return
    if (isLoading) return
    if (!roleContext) return
    if (!isOwner) {
      router.replace('/(app)/staff-home')
    }
  }, [isHydrated, isLoading, roleContext, isOwner, router])
}

export default useRequireOwner
