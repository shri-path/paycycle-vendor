/**
 * App Group Layout
 * Purpose: Auth guard + stack navigator for authenticated screens
 * Security: Redirects unauthenticated users to login — defence-in-depth boundary
 */

import { Stack, Redirect } from 'expo-router'
import { useAuthStore } from '@modules/auth/store/auth.store'
import { useShallow } from 'zustand/react/shallow'

export default function AppLayout() {
  const { isAuthenticated, isHydrated } = useAuthStore(
    useShallow((s) => ({ isAuthenticated: s.isAuthenticated, isHydrated: s.isHydrated })),
  )

  // Wait for store to rehydrate before making routing decisions
  if (!isHydrated) return null

  // Redirect unauthenticated users — this is a hard boundary even if index.tsx redirects correctly
  if (!isAuthenticated) return <Redirect href="/(auth)/login" />

  return <Stack screenOptions={{ headerShown: false }} />
}
