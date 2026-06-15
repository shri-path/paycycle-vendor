/**
 * ReferralDashboardScreen (US-014)
 * Owner-only referral engine dashboard.
 * Pull-to-refresh → invalidates and re-fetches.
 * Redeem CTA navigates to CreditRedemptionScreen.
 * Invalidated dashboard (null) caused by redeemCredits is resolved on focus.
 */

import React, { useCallback } from 'react'
import { View, ScrollView, RefreshControl, StyleSheet, ActivityIndicator } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useRouter, useFocusEffect, type Href } from 'expo-router'
import { useShallow } from 'zustand/react/shallow'
import * as Haptics from 'expo-haptics'
import { AppHeader } from '@components/layout/AppHeader'
import { AppAlert } from '@components/primitives/AppAlert'
import { AppText } from '@components/primitives/AppText'
import { AppButton } from '@components/primitives/AppButton'
import { AppEmptyState } from '@components/composite/AppEmptyState'
import { Ionicons } from '@expo/vector-icons'
import { ScreenErrorBoundary } from '@components/composite/ScreenErrorBoundary'
import { useRequireOwner } from '@modules/roles/hooks/useRequireOwner'
import { useTranslation } from '@hooks/useTranslation'
import { useNetworkStatus } from '@hooks/useNetworkStatus'
import { colors, spacing, componentSizes } from '@constants/tokens'
import { useReferralStore } from '../store/referral.store'
import {
  EarningsSummaryCard,
  VendorReferralCard,
  CustomerGrowthCard,
} from '../components'

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  scroll: { flex: 1 },
  content: { paddingHorizontal: spacing[4], paddingBottom: spacing[10] },
  alertRow: { paddingHorizontal: spacing[4], marginBottom: spacing[2] },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: spacing[6] },
  section: { marginTop: spacing[4], marginBottom: spacing[2] },
  redeemBtn: { marginTop: spacing[3], marginBottom: spacing[4] },
})

function ReferralDashboardContent() {
  const { t } = useTranslation()
  const router = useRouter()
  const { isConnected } = useNetworkStatus()
  useRequireOwner()

  const { dashboard, isDashboardLoading, dashboardError, fetchDashboard, clearErrors } =
    useReferralStore(
      useShallow((s) => ({
        dashboard: s.dashboard,
        isDashboardLoading: s.isDashboardLoading,
        dashboardError: s.dashboardError,
        fetchDashboard: s.fetchDashboard,
        clearErrors: s.clearErrors,
      })),
    )

  useFocusEffect(
    useCallback(() => {
      void fetchDashboard()
      return () => clearErrors()
    }, [fetchDashboard, clearErrors]),
  )

  const handleRefresh = useCallback(() => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)
    void fetchDashboard()
  }, [fetchDashboard])

  const goToRedeem = useCallback(() => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium)
    router.push('/(app)/referrals/redeem-credits' as Href)
  }, [router])

  const goToReferVendor = useCallback(() => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium)
    router.push('/(app)/referrals/refer-vendor' as Href)
  }, [router])

  if (isDashboardLoading && !dashboard) {
    return (
      <SafeAreaView style={s.safe} edges={['bottom']}>
        <AppHeader title={t('referral.dashboard.title')} showBack onBackPress={() => router.back()} />
        <View style={s.center}><ActivityIndicator size="large" color={colors.primary} /></View>
      </SafeAreaView>
    )
  }

  if (dashboardError && !dashboard) {
    return (
      <SafeAreaView style={s.safe} edges={['bottom']}>
        <AppHeader title={t('referral.dashboard.title')} showBack onBackPress={() => router.back()} />
        <View style={s.center}>
          <AppEmptyState
            icon={<Ionicons name="alert-circle-outline" size={componentSizes.icon.xxxl} color={colors.error} />}
            title={t('common.error')}
            description={t('referral.dashboard.error_load')}
            actionLabel={t('common.retry')}
            onActionPress={() => void fetchDashboard()}
          />
        </View>
      </SafeAreaView>
    )
  }

  return (
    <SafeAreaView style={s.safe} edges={['bottom']}>
      <AppHeader title={t('referral.dashboard.title')} showBack onBackPress={() => router.back()} />

      {!isConnected ? (
        <View style={s.alertRow}>
          <AppAlert type="warning" title={t('common.offline')} message={t('common.offline_message')} />
        </View>
      ) : null}

      {dashboardError && dashboard ? (
        <View style={s.alertRow}>
          <AppAlert type="warning" title={t('dashboard.showing_cached')} onClose={clearErrors} />
        </View>
      ) : null}

      <ScrollView
        style={s.scroll}
        contentContainerStyle={s.content}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={isDashboardLoading} onRefresh={handleRefresh} />}
      >
        {dashboard ? (
          <>
            <EarningsSummaryCard
              totalEarnings={dashboard.totalEarnings}
              availableBalance={dashboard.availableBalance}
            />

            {dashboard.availableBalance > 0 ? (
              <AppButton
                label={t('referral.dashboard.redeem_cta')}
                variant="primary"
                onPress={goToRedeem}
                style={s.redeemBtn}
                testID="redeem-credits-btn"
              />
            ) : null}

            <CustomerGrowthCard growth={dashboard.customerGrowthFromReferrals} />

            {dashboard.vendorReferrals.length > 0 ? (
              <>
                <AppText variant="body" weight="semibold" color={colors.textPrimary} style={s.section}>
                  {t('referral.dashboard.vendor_referrals_section')}
                </AppText>
                {dashboard.vendorReferrals.map((rf) => (
                  <VendorReferralCard key={rf.id} referral={rf} />
                ))}
              </>
            ) : (
              <AppEmptyState
                icon={<Ionicons name="people-outline" size={componentSizes.icon.xxxl} color={colors.textSecondary} />}
                title={t('referral.dashboard.empty_title')}
                description={t('referral.dashboard.empty_desc')}
                actionLabel={t('referral.dashboard.refer_now')}
                onActionPress={goToReferVendor}
              />
            )}
          </>
        ) : null}
      </ScrollView>
    </SafeAreaView>
  )
}

export default function ReferralDashboardScreen() {
  return (
    <ScreenErrorBoundary>
      <ReferralDashboardContent />
    </ScreenErrorBoundary>
  )
}

ReferralDashboardScreen.displayName = 'ReferralDashboardScreen'
