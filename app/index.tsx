/**
 * App Root Route
 * Purpose: Redirect to auth or home based on authentication state
 */

import { View, ActivityIndicator } from 'react-native'
import { Redirect } from 'expo-router'
import { useAuthStore } from '@modules/auth/store/auth.store'
import { colors } from '@constants/tokens'

export default function Index() {
  const { isAuthenticated, isHydrated } = useAuthStore()

  if (!isHydrated) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: colors.background }}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    )
  }

  // Authenticated users go to the role router, which lands them on the
  // role-correct home (owner → dashboard, staff → staff-home).
  return isAuthenticated
    ? <Redirect href="/(app)" />
    : <Redirect href="/(auth)/login" />
}
