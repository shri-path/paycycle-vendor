/**
 * Home Screen (placeholder)
 * Purpose: Landing screen after auth — full implementation in upcoming sprints.
 * US-009: Mounts SubscriptionBanner (owner-only, session-dismissible) above the nav.
 */

import { useState, useCallback, useEffect } from 'react'
import { View, StyleSheet } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useRouter, type Href } from 'expo-router'
import { useShallow } from 'zustand/react/shallow'
import { AppText } from '@components/primitives/AppText'
import { AppButton } from '@components/primitives/AppButton'
import { useAuthStore } from '@modules/auth/store/auth.store'
import { useTranslation } from '@hooks/useTranslation'
import { colors, spacing } from '@constants/tokens'
import { useSubscriptionStore } from '@modules/subscription/store/subscription.store'
import { SubscriptionBanner } from '@modules/subscription/components'

export default function HomeScreen() {
  const { t } = useTranslation()
  const router = useRouter()
  const { logout, vendorContext, user } = useAuthStore(
    useShallow((s) => ({ logout: s.logout, vendorContext: s.vendorContext, user: s.user })),
  )

  // Subscription banner — owner-only, session-dismissible (OQ-4).
  const [bannerDismissed, setBannerDismissed] = useState(false)
  const isOwner = useAuthStore(useShallow((s) => s.vendorContext?.role === 'owner'))
  const { currentSubscription, fetchSubscription } = useSubscriptionStore(
    useShallow((s) => ({
      currentSubscription: s.currentSubscription,
      fetchSubscription: s.fetchSubscription,
    })),
  )

  useEffect(() => {
    if (isOwner && !currentSubscription) {
      void fetchSubscription()
    }
  }, [isOwner, currentSubscription, fetchSubscription])

  const handleLogout = async () => {
    await logout()
    router.replace('/(auth)/login')
  }

  const handleBannerPress = useCallback(() => {
    router.push('/(app)/subscription' as Href)
  }, [router])

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.container}>
        {/* SubscriptionBanner: owner-only, session-dismissible, above main nav */}
        {isOwner && !bannerDismissed ? (
          <SubscriptionBanner
            subscription={currentSubscription}
            onDismiss={() => setBannerDismissed(true)}
            onPress={handleBannerPress}
          />
        ) : null}

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
          label={t('supply.title')}
          onPress={() => router.push('/(app)/supply-lists' as Href)}
          variant="primary"
          fullWidth
        />
        <AppButton
          label={t('customer.title')}
          onPress={() => router.push('/(app)/customers' as Href)}
          variant="primary"
          fullWidth
        />
        <AppButton
          label={t('audit.title')}
          onPress={() => router.push('/(app)/activity' as Href)}
          variant="primary"
          fullWidth
        />
        <AppButton
          label={t('subscription.title')}
          onPress={() => router.push('/(app)/subscription' as Href)}
          variant="primary"
          fullWidth
          testID="subscription-nav-btn"
        />
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
