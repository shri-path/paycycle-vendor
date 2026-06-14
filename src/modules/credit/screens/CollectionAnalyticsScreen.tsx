/**
 * CollectionAnalyticsScreen [S7] (US-012, T-18, wireframe 2.39)
 * Purpose: Month selector, summary, payment-mode bars, 6-month trend, ranked lists.
 *
 * Cache-first: reads from store before refetching on month change.
 * Owner-only: useRequireOwner().
 */

import React, { useCallback } from 'react'
import { View, ScrollView, StyleSheet, ActivityIndicator } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useRouter, useFocusEffect } from 'expo-router'
import { useShallow } from 'zustand/react/shallow'
import { Ionicons } from '@expo/vector-icons'
import * as Haptics from 'expo-haptics'
import { AppHeader } from '@components/layout/AppHeader'
import { AppAlert } from '@components/primitives/AppAlert'
import { AppText } from '@components/primitives/AppText'
import { AppCard } from '@components/primitives/AppCard'
import { AppIconButton } from '@components/primitives/AppIconButton'
import { AppEmptyState } from '@components/composite/AppEmptyState'
import { ScreenErrorBoundary } from '@components/composite/ScreenErrorBoundary'
import { useRequireOwner } from '@modules/roles/hooks/useRequireOwner'
import { useTranslation } from '@hooks/useTranslation'
import { useNetworkStatus } from '@hooks/useNetworkStatus'
import { formatCurrency } from '@utils/formatCurrency'
import { colors, spacing, componentSizes } from '@constants/tokens'
import { useCreditStore } from '../store/credit.store'
import { PaymentModeBars, CollectionTrendBars, RankedAmountList } from '../components'

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  scroll: { flex: 1 },
  content: { paddingHorizontal: spacing[4], paddingBottom: spacing[10] },
  alertRow: { paddingHorizontal: spacing[4], marginBottom: spacing[2] },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: spacing[6] },
  monthRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: spacing[3], gap: spacing[3] },
  summaryCard: { padding: spacing[4], marginBottom: spacing[3] },
  summaryGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing[3] },
  summaryItem: { flex: 1, minWidth: '44%' },
})

function stepMonth(month: string, delta: number): string {
  const [year, m] = month.split('-').map(Number) as [number, number]
  const date = new Date(year, m - 1 + delta, 1)
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`
}

function CollectionAnalyticsContent() {
  const { t } = useTranslation()
  const router = useRouter()
  const { isConnected } = useNetworkStatus()
  useRequireOwner()

  const {
    analytics,
    isAnalyticsLoading,
    analyticsError,
    analyticsMonth,
    fetchAnalytics,
    clearErrors,
  } = useCreditStore(
    useShallow((s) => ({
      analytics: s.analytics,
      isAnalyticsLoading: s.isAnalyticsLoading,
      analyticsError: s.analyticsError,
      analyticsMonth: s.analyticsMonth,
      fetchAnalytics: s.fetchAnalytics,
      clearErrors: s.clearErrors,
    })),
  )

  useFocusEffect(
    useCallback(() => {
      void fetchAnalytics()
      return () => clearErrors()
    }, [fetchAnalytics, clearErrors]),
  )

  const handlePrevMonth = useCallback(() => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)
    void fetchAnalytics(stepMonth(analyticsMonth, -1))
  }, [analyticsMonth, fetchAnalytics])

  const handleNextMonth = useCallback(() => {
    const nextMonth = stepMonth(analyticsMonth, 1)
    const currentMonth = stepMonth(new Date().toISOString().slice(0, 7), 0)
    if (nextMonth > currentMonth) return // don't navigate into future
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)
    void fetchAnalytics(nextMonth)
  }, [analyticsMonth, fetchAnalytics])

  const isFutureNext = stepMonth(analyticsMonth, 1) > new Date().toISOString().slice(0, 7)

  if (isAnalyticsLoading && !analytics) {
    return (
      <SafeAreaView style={styles.safe} edges={['bottom']}>
        <AppHeader title={t('credit.analytics_title')} showBack />
        <View style={styles.center}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      </SafeAreaView>
    )
  }

  if (analyticsError && !analytics) {
    return (
      <SafeAreaView style={styles.safe} edges={['bottom']}>
        <AppHeader title={t('credit.analytics_title')} showBack />
        <View style={styles.center}>
          <AppEmptyState
            icon={<Ionicons name="alert-circle-outline" size={componentSizes.icon.xxxl} color={colors.error} />}
            title={t('common.error')}
            description={t('credit.error_load_analytics')}
            actionLabel={t('common.retry')}
            onActionPress={() => void fetchAnalytics()}
          />
        </View>
      </SafeAreaView>
    )
  }

  return (
    <SafeAreaView style={styles.safe} edges={['bottom']}>
      <AppHeader title={t('credit.analytics_title')} showBack onBackPress={() => router.back()} />

      {!isConnected ? (
        <View style={styles.alertRow}>
          <AppAlert type="warning" title={t('common.offline')} message={t('common.offline_message')} />
        </View>
      ) : null}

      {analyticsError && analytics ? (
        <View style={styles.alertRow}>
          <AppAlert type="warning" title={t('dashboard.showing_cached')} onClose={clearErrors} />
        </View>
      ) : null}

      {/* Month navigation */}
      <View style={styles.monthRow}>
        <AppIconButton
          icon={<Ionicons name="chevron-back" size={20} color={colors.primary} />}
          onPress={handlePrevMonth}
          accessibilityLabel={t('delivery.prev_month')}
        />
        <AppText variant="body" weight="semibold" color={colors.textPrimary}>
          {analyticsMonth}
        </AppText>
        <AppIconButton
          icon={<Ionicons name="chevron-forward" size={20} color={isFutureNext ? colors.gray300 : colors.primary} />}
          onPress={handleNextMonth}
          disabled={isFutureNext}
          accessibilityLabel={t('delivery.next_month')}
        />
      </View>

      <ScrollView style={styles.scroll} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {analytics?.monthlySummary ? (
          <>
            {/* Monthly summary */}
            <AppCard style={styles.summaryCard} testID="analytics-summary-card">
              <View style={styles.summaryGrid}>
                <View style={styles.summaryItem}>
                  <AppText variant="caption" color={colors.textSecondary}>{t('credit.billed')}</AppText>
                  <AppText variant="body" weight="semibold" color={colors.textPrimary}>
                    {formatCurrency(analytics.monthlySummary.totalBilled)}
                  </AppText>
                </View>
                <View style={styles.summaryItem}>
                  <AppText variant="caption" color={colors.textSecondary}>{t('credit.collected')}</AppText>
                  <AppText variant="body" weight="semibold" color={colors.success}>
                    {formatCurrency(analytics.monthlySummary.collected)}
                  </AppText>
                </View>
                <View style={styles.summaryItem}>
                  <AppText variant="caption" color={colors.textSecondary}>{t('credit.outstanding')}</AppText>
                  <AppText variant="body" weight="semibold" color={colors.error}>
                    {formatCurrency(analytics.monthlySummary.outstanding)}
                  </AppText>
                </View>
                <View style={styles.summaryItem}>
                  <AppText variant="caption" color={colors.textSecondary}>{t('credit.collection_pct')}</AppText>
                  <AppText variant="body" weight="semibold" color={colors.textPrimary}>
                    {analytics.monthlySummary.collectionPercentage}%
                  </AppText>
                </View>
              </View>
            </AppCard>

            {/* Payment mode bars */}
            <PaymentModeBars breakdown={analytics.paymentModeBreakdown} />

            {/* 6-month trend */}
            {analytics.collectionTrend.length > 0 ? (
              <CollectionTrendBars trend={analytics.collectionTrend} />
            ) : null}

            {/* Top payers */}
            {analytics.topPayers.length > 0 ? (
              <RankedAmountList
                items={analytics.topPayers}
                titleKey="credit.top_payers_title"
                amountColor={colors.success}
                testID="top-payers-list"
              />
            ) : null}

            {/* Defaulters */}
            {analytics.defaulters.length > 0 ? (
              <RankedAmountList
                items={analytics.defaulters}
                titleKey="credit.defaulters_title"
                amountColor={colors.error}
                showDaysOverdue
                testID="defaulters-list"
              />
            ) : null}
          </>
        ) : (
          <AppEmptyState
            title={t('credit.analytics_empty_title')}
            description={t('credit.analytics_empty_desc')}
          />
        )}
      </ScrollView>
    </SafeAreaView>
  )
}

export default function CollectionAnalyticsScreen() {
  return (
    <ScreenErrorBoundary>
      <CollectionAnalyticsContent />
    </ScreenErrorBoundary>
  )
}

CollectionAnalyticsScreen.displayName = 'CollectionAnalyticsScreen'
