/**
 * Home Screen (placeholder)
 * Purpose: Landing screen after auth — full implementation in upcoming sprints
 */

import { View, StyleSheet } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useRouter } from 'expo-router'
import { useShallow } from 'zustand/react/shallow'
import { AppText } from '@components/primitives/AppText'
import { AppButton } from '@components/primitives/AppButton'
import { useAuthStore } from '@modules/auth/store/auth.store'
import { useTranslation } from '@hooks/useTranslation'
import { colors, spacing } from '@constants/tokens'

export default function HomeScreen() {
  const { t } = useTranslation()
  const router = useRouter()
  const { logout, vendorContext, user } = useAuthStore(
    useShallow((s) => ({ logout: s.logout, vendorContext: s.vendorContext, user: s.user })),
  )

  const handleLogout = async () => {
    await logout()
    router.replace('/(auth)/login')
  }

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.container}>
        <AppText variant="h2" weight="bold" color={colors.primary}>
          {t('common.app_name')}
        </AppText>
        {vendorContext ? (
          <AppText variant="body" color={colors.textSecondary}>
            {vendorContext.vendorName}
          </AppText>
        ) : null}
        {user ? (
          <AppText variant="caption" color={colors.textSecondary}>
            {user.phone}
          </AppText>
        ) : null}
        <View style={styles.spacer} />
        <AppButton
          label={t('auth.logout')}
          onPress={handleLogout}
          variant="secondary"
          fullWidth
        />
      </View>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  container: {
    flex: 1,
    paddingHorizontal: spacing[4],
    paddingTop: spacing[10],
    alignItems: 'center',
    gap: spacing[2],
  },
  spacer: { flex: 1 },
})
