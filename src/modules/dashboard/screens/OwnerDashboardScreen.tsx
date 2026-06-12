/**
 * OwnerDashboardScreen (US-010, FEATURE_PLAN §2.1)
 * Purpose: Owner's home dashboard — financial overview, outstanding aging,
 * quick stats, auto-mark toggle, tomorrow's forecast, today's supply lists.
 *
 * States:
 *  Loading  — skeleton matching the card stack (first load only)
 *  Error    — full-screen AppEmptyState + retry if no cached data
 *  Offline  — AppAlert banner + render cached store data; toggle disabled
 *  Stale    — show cached data + "showing last updated" alert on refresh failure
 *  Populated — all sections
 *
 * Defence-in-depth: `useRequireOwner()` redirects staff users who deep-link here.
 * SubscriptionBanner kept (US-009) — moved here from home.tsx per FEATURE_PLAN §5.
 * Auto-refresh: every 60 seconds (FEATURE_PLAN §4.2).
 */

import React, { useCallback, useState, useMemo } from 'react'
import {
  View,
  ScrollView,
  StyleSheet,
  RefreshControl,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useRouter, type Href, useFocusEffect } from 'expo-router'
import * as Haptics from 'expo-haptics'
import { useShallow } from 'zustand/react/shallow'
import { Ionicons } from '@expo/vector-icons'
import { AppHeader } from '@components/layout/AppHeader'
import { AppAlert } from '@components/primitives/AppAlert'
import { AppCard } from '@components/primitives/AppCard'
import { AppStatsCard } from '@components/composite/AppStatsCard'
import { AppSection } from '@components/composite/AppSection'
import { AppEmptyState } from '@components/composite/AppEmptyState'
import { ScreenErrorBoundary } from '@components/composite/ScreenErrorBoundary'
import { useRequireOwner } from '@modules/roles/hooks/useRequireOwner'
import { useAuthStore } from '@modules/auth/store/auth.store'
import { useSubscriptionStore } from '@modules/subscription/store/subscription.store'
import { SubscriptionBanner } from '@modules/subscription/components'
import { useTranslation } from '@hooks/useTranslation'
import { useNetworkStatus } from '@hooks/useNetworkStatus'
import { colors, spacing, componentSizes } from '@constants/tokens'
import { useDashboardStore } from '../store/dashboard.store'
import { useAutoRefresh } from '../hooks/useAutoRefresh'
import {
  FinancialOverviewCard,
  OutstandingAgingCard,
  AutoMarkToggleRow,
  SupplyForecastSummaryCard,
  SupplyListProgressCard,
} from '../components'

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  content: { paddingHorizontal: spacing[4], paddingTop: spacing[3], paddingBottom: spacing[8] },
  skeletonCard: { height: 120, marginBottom: spacing[3], backgroundColor: colors.gray100, borderRadius: 8 },
  skeletonSmall: { height: 72, marginBottom: spacing[3], backgroundColor: colors.gray100, borderRadius: 8 },
  statsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing[2], marginBottom: spacing[3] },
  statsItem: { width: '47%' },
  centeredState: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: spacing[6] },
  alertRow: { paddingHorizontal: spacing[4] },
})

function OwnerDashboardSkeleton() {
  return (
    <View style={styles.content} testID="owner-dashboard-skeleton">
      {[0, 1, 2, 3].map((i) => (
        <AppCard key={i} variant="flat" style={styles.skeletonCard}><View /></AppCard>
      ))}
      <View style={styles.statsGrid}>
        {[0, 1, 2, 3].map((i) => (
          <AppCard key={i} variant="flat" style={[styles.skeletonSmall, styles.statsItem]}><View /></AppCard>
        ))}
      </View>
    </View>
  )
}

function OwnerDashboardContent() {
  const { t } = useTranslation()
  const router = useRouter()
  const { isConnected } = useNetworkStatus()
  useRequireOwner()

  const vendorName = useAuthStore(useShallow((s) => s.vendorContext?.vendorName ?? null))

  // Subscription banner (US-009) — session-dismissible
  const [bannerDismissed, setBannerDismissed] = useState(false)
  const { currentSubscription, fetchSubscription } = useSubscriptionStore(
    useShallow((s) => ({ currentSubscription: s.currentSubscription, fetchSubscription: s.fetchSubscription })),
  )

  const {
    ownerDashboard,
    isOwnerLoading,
    ownerError,
    isUpdatingAutoMark,
    fetchOwnerDashboard,
    setAutoMark,
    clearErrors,
  } = useDashboardStore(
    useShallow((s) => ({
      ownerDashboard: s.ownerDashboard,
      isOwnerLoading: s.isOwnerLoading,
      ownerError: s.ownerError,
      isUpdatingAutoMark: s.isUpdatingAutoMark,
      fetchOwnerDashboard: s.fetchOwnerDashboard,
      setAutoMark: s.setAutoMark,
      clearErrors: s.clearErrors,
    })),
  )

  // Stale data indicator (edge case #9)
  const [showStaleAlert, setShowStaleAlert] = useState(false)

  const refresh = useCallback(() => {
    void fetchOwnerDashboard()
    if (!currentSubscription) void fetchSubscription()
  }, [fetchOwnerDashboard, fetchSubscription, currentSubscription])

  useFocusEffect(
    useCallback(() => {
      void fetchOwnerDashboard()
      if (!currentSubscription) void fetchSubscription()
      return () => clearErrors()
    }, [fetchOwnerDashboard, fetchSubscription, currentSubscription, clearErrors]),
  )

  // Auto-refresh every 60 seconds (FEATURE_PLAN §4.2)
  useAutoRefresh(refresh, 60_000)

  const handleAutoMarkToggle = useCallback(async (enabled: boolean) => {
    if (!isConnected) return
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)
    try {
      await setAutoMark(enabled)
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)
    } catch {
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error)
    }
  }, [setAutoMark, isConnected])

  const handleViewCollections = useCallback(() => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)
    router.push('/(app)/collections' as Href)
  }, [router])

  const handleViewForecast = useCallback(() => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)
    router.push('/(app)/forecast' as Href)
  }, [router])

  const handleListPress = useCallback((listId: string) => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)
    router.push(`/(app)/deliveries/${listId}` as Href)
  }, [router])

  const formattedMonth = useMemo(() => {
    if (!ownerDashboard?.currentMonth) return ''
    const [year, month] = ownerDashboard.currentMonth.split('-')
    const d = new Date(Number(year), Number(month) - 1)
    return d.toLocaleString('default', { month: 'long', year: 'numeric' })
  }, [ownerDashboard?.currentMonth])

  // Loading (no cached data)
  if (isOwnerLoading && !ownerDashboard) {
    return (
      <SafeAreaView style={styles.safe} edges={['bottom']}>
        <AppHeader title={vendorName ?? t('common.app_name')} />
        <OwnerDashboardSkeleton />
      </SafeAreaView>
    )
  }

  // Error (no cached data)
  if (ownerError && !ownerDashboard) {
    return (
      <SafeAreaView style={styles.safe} edges={['bottom']}>
        <AppHeader title={vendorName ?? t('common.app_name')} />
        <View style={styles.centeredState}>
          <AppEmptyState
            icon={<Ionicons name="alert-circle-outline" size={componentSizes.icon.xxxl} color={colors.error} />}
            title={t('common.error')}
            description={t('dashboard.error_load_owner')}
            actionLabel={t('common.retry')}
            onActionPress={() => void fetchOwnerDashboard()}
          />
        </View>
      </SafeAreaView>
    )
  }

  const data = ownerDashboard

  return (
    <SafeAreaView style={styles.safe} edges={['bottom']}>
      <AppHeader title={vendorName ?? t('common.app_name')} />

      {/* Subscription Banner (US-009) — owner-only, session-dismissible */}
      {!bannerDismissed ? (
        <SubscriptionBanner
          subscription={currentSubscription}
          onDismiss={() => setBannerDismissed(true)}
          onPress={() => router.push('/(app)/subscription' as Href)}
        />
      ) : null}

      {/* Offline banner */}
      {!isConnected ? (
        <View style={styles.alertRow}>
          <AppAlert type="warning" title={t('common.offline')} message={t('common.offline_message')} />
        </View>
      ) : null}

      {/* Stale data banner (edge case #9) */}
      {showStaleAlert ? (
        <View style={styles.alertRow}>
          <AppAlert
            type="warning"
            title={t('dashboard.showing_cached')}
            onClose={() => setShowStaleAlert(false)}
          />
        </View>
      ) : null}

      {/* Mutation error banner */}
      {ownerError && ownerDashboard ? (
        <View style={styles.alertRow}>
          <AppAlert
            type="error"
            title={t('common.error')}
            message={t(ownerError)}
            onClose={clearErrors}
          />
        </View>
      ) : null}

      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={isOwnerLoading}
            onRefresh={() => { void refresh() }}
            tintColor={colors.primary}
          />
        }
      >
        {/* 1. Financial Overview */}
        {data ? (
          <FinancialOverviewCard
            month={formattedMonth}
            totalRevenue={data.financial.totalRevenue}
            collected={data.financial.collected}
            pending={data.financial.pending}
            collectionPercentage={data.financial.collectionPercentage}
          />
        ) : null}

        {/* 2. Outstanding Aging */}
        {data ? (
          <OutstandingAgingCard
            aging={data.financial.outstandingAging}
            onViewCollections={handleViewCollections}
          />
        ) : null}

        {/* 3. Quick Stats — 2×2 grid */}
        {data ? (
          <View style={styles.statsGrid} testID="quick-stats-grid">
            <AppStatsCard
              label={t('dashboard.supply_lists')}
              value={data.quickStats.supplyListsCount}
              icon="list-outline"
              containerStyle={styles.statsItem}
            />
            <AppStatsCard
              label={t('dashboard.total_customers')}
              value={data.quickStats.totalCustomers}
              icon="people-outline"
              containerStyle={styles.statsItem}
            />
            <AppStatsCard
              label={t('dashboard.active_staff')}
              value={data.quickStats.activeStaff}
              icon="person-outline"
              containerStyle={styles.statsItem}
            />
            <AppStatsCard
              label={t('dashboard.conflicts_today', { count: '' }).replace(' conflict(s) today', '')}
              value={data.quickStats.conflictsToday}
              icon={data.quickStats.conflictsToday > 0 ? 'alert-circle' : 'checkmark-circle-outline'}
              badge={data.quickStats.conflictsToday > 0 ? String(data.quickStats.conflictsToday) : undefined}
              badgeVariant={data.quickStats.conflictsToday > 0 ? 'error' : undefined}
              containerStyle={styles.statsItem}
            />
          </View>
        ) : null}

        {/* 4. Auto-mark toggle */}
        {data ? (
          <AutoMarkToggleRow
            enabled={data.autoMarkStatus === 'on'}
            conflictsCount={data.quickStats.conflictsToday}
            disabled={!isConnected || isUpdatingAutoMark}
            onToggle={(next) => { void handleAutoMarkToggle(next) }}
          />
        ) : null}

        {/* 5. Tomorrow's Supply Forecast */}
        {data ? (
          <SupplyForecastSummaryCard
            tomorrow={data.supplyForecast.tomorrow}
            onViewForecast={handleViewForecast}
          />
        ) : null}

        {/* 6. Today's Supply Lists */}
        {data ? (
          <AppSection title={t('dashboard.todays_lists')}>
            {data.todaySupplyLists.length === 0 ? (
              <AppEmptyState
                icon={<Ionicons name="checkmark-done-circle-outline" size={componentSizes.icon.xxl} color={colors.success} />}
                title={t('dashboard.no_lists_today')}
                description=""
              />
            ) : (
              data.todaySupplyLists.map((list) => (
                <SupplyListProgressCard
                  key={list.id}
                  list={list}
                  onPress={() => handleListPress(list.id)}
                />
              ))
            )}
          </AppSection>
        ) : null}
      </ScrollView>
    </SafeAreaView>
  )
}

export default function OwnerDashboardScreen() {
  return (
    <ScreenErrorBoundary>
      <OwnerDashboardContent />
    </ScreenErrorBoundary>
  )
}

OwnerDashboardScreen.displayName = 'OwnerDashboardScreen'
