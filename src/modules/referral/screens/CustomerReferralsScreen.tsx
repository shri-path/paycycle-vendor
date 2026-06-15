/**
 * CustomerReferralsScreen (US-014)
 * Owner-only. Shows top referrers and recent additions (infinite scroll).
 * "Thank" → WhatsApp deeplink (no API).
 * "Give Discount" → navigates to /(app)/customers/:id/credit-settings (US-012).
 * ₹50 reward is a bill credit — labeled accordingly.
 */

import React, { useCallback } from 'react'
import { View, ScrollView, FlatList, StyleSheet, ActivityIndicator } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useRouter, useFocusEffect, type Href } from 'expo-router'
import { useShallow } from 'zustand/react/shallow'
import { AppHeader } from '@components/layout/AppHeader'
import { AppAlert } from '@components/primitives/AppAlert'
import { AppText } from '@components/primitives/AppText'
import { AppEmptyState } from '@components/composite/AppEmptyState'
import { Ionicons } from '@expo/vector-icons'
import { ScreenErrorBoundary } from '@components/composite/ScreenErrorBoundary'
import { useRequireOwner } from '@modules/roles/hooks/useRequireOwner'
import { useTranslation } from '@hooks/useTranslation'
import { colors, spacing, componentSizes } from '@constants/tokens'
import { useReferralStore } from '../store/referral.store'
import { TopReferrerRow, RecentAdditionRow } from '../components'
import type { RecentAdditionDto } from '../../../types/referral'

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  scroll: { flex: 1 },
  content: { paddingHorizontal: spacing[4], paddingBottom: spacing[10] },
  alertRow: { paddingHorizontal: spacing[4], marginBottom: spacing[2] },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: spacing[6] },
  section: { marginTop: spacing[4], marginBottom: spacing[2] },
})

function CustomerReferralsContent() {
  const { t } = useTranslation()
  const router = useRouter()
  useRequireOwner()

  const { customerRefs, recentAdditions, recentAdditionsMeta, isCustomerRefsLoading, customerRefsError, fetchCustomerReferrals, clearErrors } =
    useReferralStore(
      useShallow((s) => ({
        customerRefs: s.customerRefs,
        recentAdditions: s.recentAdditions,
        recentAdditionsMeta: s.recentAdditionsMeta,
        isCustomerRefsLoading: s.isCustomerRefsLoading,
        customerRefsError: s.customerRefsError,
        fetchCustomerReferrals: s.fetchCustomerReferrals,
        clearErrors: s.clearErrors,
      })),
    )

  useFocusEffect(
    useCallback(() => {
      void fetchCustomerReferrals(1)
      return () => clearErrors()
    }, [fetchCustomerReferrals, clearErrors]),
  )

  const loadMore = useCallback(() => {
    if (!recentAdditionsMeta) return
    const { page, totalPages } = recentAdditionsMeta
    if (page < totalPages && !isCustomerRefsLoading) {
      void fetchCustomerReferrals(page + 1)
    }
  }, [recentAdditionsMeta, isCustomerRefsLoading, fetchCustomerReferrals])

  const handleGiveDiscount = useCallback(
    (customerId: string) => {
      router.push(`/(app)/customers/${customerId}/credit-settings` as Href)
    },
    [router],
  )

  const renderAddition = useCallback(
    ({ item }: { item: RecentAdditionDto }) => <RecentAdditionRow addition={item} />,
    [],
  )

  const keyExtractor = useCallback((_item: RecentAdditionDto, idx: number) => String(idx), [])

  if (isCustomerRefsLoading && !customerRefs) {
    return (
      <SafeAreaView style={s.safe} edges={['bottom']}>
        <AppHeader title={t('referral.customer.title')} showBack onBackPress={() => router.back()} />
        <View style={s.center}><ActivityIndicator size="large" color={colors.primary} /></View>
      </SafeAreaView>
    )
  }

  if (customerRefsError && !customerRefs) {
    return (
      <SafeAreaView style={s.safe} edges={['bottom']}>
        <AppHeader title={t('referral.customer.title')} showBack onBackPress={() => router.back()} />
        <View style={s.center}>
          <AppEmptyState
            icon={<Ionicons name="alert-circle-outline" size={componentSizes.icon.xxxl} color={colors.error} />}
            title={t('common.error')}
            description={t('referral.customer.error_load')}
            actionLabel={t('common.retry')}
            onActionPress={() => void fetchCustomerReferrals(1)}
          />
        </View>
      </SafeAreaView>
    )
  }

  if (!customerRefs || (customerRefs.topReferrers.length === 0 && recentAdditions.length === 0)) {
    return (
      <SafeAreaView style={s.safe} edges={['bottom']}>
        <AppHeader title={t('referral.customer.title')} showBack onBackPress={() => router.back()} />
        <View style={s.center}>
          <AppEmptyState
            icon={<Ionicons name="people-outline" size={componentSizes.icon.xxxl} color={colors.textSecondary} />}
            title={t('referral.customer.empty_title')}
            description={t('referral.customer.empty_desc')}
          />
        </View>
      </SafeAreaView>
    )
  }

  return (
    <SafeAreaView style={s.safe} edges={['bottom']}>
      <AppHeader title={t('referral.customer.title')} showBack onBackPress={() => router.back()} />

      {customerRefsError && customerRefs ? (
        <View style={s.alertRow}>
          <AppAlert type="warning" title={t('dashboard.showing_cached')} onClose={clearErrors} />
        </View>
      ) : null}

      <ScrollView style={s.scroll} contentContainerStyle={s.content} showsVerticalScrollIndicator={false}>
        {/* Summary */}
        {customerRefs ? (
          <>
            <AppText variant="caption" color={colors.textSecondary}>
              {t('referral.customer.summary_label', {
                total: customerRefs.summary.totalFromReferrals,
                month: customerRefs.summary.newThisMonth,
              })}
            </AppText>

            {/* Top Referrers */}
            {customerRefs.topReferrers.length > 0 ? (
              <>
                <AppText variant="body" weight="semibold" color={colors.textPrimary} style={s.section}>
                  {t('referral.customer.top_referrers_title')}
                </AppText>
                {customerRefs.topReferrers.map((ref) => (
                  <TopReferrerRow key={ref.customerId} referrer={ref} onGiveDiscount={handleGiveDiscount} />
                ))}
              </>
            ) : null}

            {/* Recent Additions (infinite scroll) */}
            {recentAdditions.length > 0 ? (
              <>
                <AppText variant="body" weight="semibold" color={colors.textPrimary} style={s.section}>
                  {t('referral.customer.recent_additions_title')}
                </AppText>
                <FlatList
                  data={recentAdditions}
                  renderItem={renderAddition}
                  keyExtractor={keyExtractor}
                  onEndReached={loadMore}
                  onEndReachedThreshold={0.3}
                  scrollEnabled={false}
                />
              </>
            ) : null}
          </>
        ) : null}
      </ScrollView>
    </SafeAreaView>
  )
}

export default function CustomerReferralsScreen() {
  return (
    <ScreenErrorBoundary>
      <CustomerReferralsContent />
    </ScreenErrorBoundary>
  )
}

CustomerReferralsScreen.displayName = 'CustomerReferralsScreen'
