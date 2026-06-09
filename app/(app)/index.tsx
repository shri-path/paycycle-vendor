/**
 * App role router — /(app)/index (US-002).
 * Purpose: After authentication, decide the landing screen by role. Owners go to
 * the dashboard (/(app)/home); staff go to the limited staff home (/(app)/staff-home).
 *
 * Waits for auth hydration + a resolved role before redirecting so the correct home
 * renders without flicker. The persisted roleContext means the right home is known
 * instantly offline on next launch (critical for delivery staff on 2G).
 */

import { useEffect } from 'react'
import { View, StyleSheet } from 'react-native'
import { Redirect } from 'expo-router'
import { useShallow } from 'zustand/react/shallow'
import { useAuthStore } from '@modules/auth/store/auth.store'
import { useRolesStore } from '@modules/roles/store/roles.store'
import { useRole } from '@modules/roles/hooks/useRole'
import { AppLoader } from '@components/primitives/AppLoader'
import { colors } from '@constants/tokens'

const styles = StyleSheet.create({
  loader: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: colors.background },
})

export default function AppRoleRouter() {
  const isHydrated = useAuthStore(useShallow((s) => s.isHydrated))
  const { fetchRole, isRolesHydrated } = useRolesStore(
    useShallow((s) => ({ fetchRole: s.fetchRole, isRolesHydrated: s.isRolesHydrated })),
  )
  const { roleContext, isOwner, isLoading } = useRole()

  // Refresh the role on entry (reactive detection — OQ-7). Cheap; serves cache offline.
  useEffect(() => {
    if (isHydrated) void fetchRole()
  }, [isHydrated, fetchRole])

  // Wait for BOTH auth + roles hydration (so we never flash the least-privileged
  // staff-home before the persisted role is read back), and for any in-flight
  // first-load fetch when no cached role exists yet.
  if (!isHydrated || !isRolesHydrated || (!roleContext && isLoading)) {
    return (
      <View style={styles.loader} testID="role-router-loader">
        <AppLoader size="large" />
      </View>
    )
  }

  // Role resolved (from cache or fetch): owners → dashboard, everyone else → staff home.
  // If the role is still unknown (no cache, fetch failed), default to staff-home — the
  // safer, least-privileged landing; owner-only routes are independently guarded.
  return isOwner ? <Redirect href="/(app)/home" /> : <Redirect href="/(app)/staff-home" />
}
