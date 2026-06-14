/**
 * CollectionsDashboardScreen [S1] (US-012, T-12, wireframe 2.33)
 * Purpose: Outstanding overview, advance credit, net receivable, month progress,
 * customers at/near their credit limit, and a Quick Actions grid.
 *
 * 5 states: Loading / Empty / Error / Populated / Offline (cached + banner)
 * Owner-only: `useRequireOwner()` guard.
 * Refetches on focus.
 */

import React, { useCallback } from 'react'
import { View, ScrollView, StyleSheet, ActivityIndicator } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useRouter, useFocusEffect, type Href } from 'expo-router'
import { useShallow } from 'zustand/react/shallow'
import { Ionicons } from '@expo/vector-icons'
import * as Haptics from 'expo-haptics'
import { AppHeader } from '@components/layout/AppHeader'
import { AppAlert } from '@components/primitives/AppAlert'
import { AppText } from '@components/primitives/AppText'
import { AppEmptyState } from '@components/composite/AppEmptyState'
import { AppIconButton } from '@components/primitives/AppIconButton'
import { ScreenErrorBoundary } from '@components/composite/ScreenErrorBoundary'
import { useRequireOwner } from '@modules/roles/hooks/useRequireOwner'
import { useTranslation } from '@hooks/useTranslation'
import { useNetworkStatus } from '@hooks/useNetworkStatus'
import { colors, spacing, componentSizes } from '@constants/tokens'
import { useCreditStore } from '../store/credit.store'
import {
  OutstandingOverviewCard,
  NetReceivableCard,
  MonthProgressCard,
  QuickActionsGrid,
  AtLimitList,
} from '../components'
import type { QuickAction } from '../components'

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  scroll: { flex: 1 },
  content: { paddingHorizontal: spacing[4], paddingBottom: spacing[10] },
  alertRow: { paddingHorizontal: spacing[4], marginBottom: spacing[2] },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: spacing[6] },
  sectionTitle: { marginTop: spacing[4], marginBottom: spacing[2] },
})

function CollectionsDashboardContent() {
  const { t } = useTranslation()
  const router = useRouter()
  const { isConnected } = useNetworkStatus()
  useRequireOwner()

  const { dashboard, isDashboardLoading, dashboardError, fetchDashboard, clearErrors } =
    useCreditStore(
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

  const goToSettings = useCallback(() => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)
    router.push('/(app)/collections/reminder-config' as Href)
  }, [router])

  const quickActions: QuickAction[] = [
    {
      key: 'bulk_reminders',
      labelKey: 'credit.quick_bulk_reminders',
      iconName: 'notifications-outline',
      onPress: () => {
        void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium)
        router.push('/(app)/settings/bulk/send-reminders' as Href)
      },
    },
    {
      key: 'priority',
      labelKey: 'credit.quick_view_priority',
      iconName: 'list-outline',
      onPress: () => {
        void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium)
        router.push('/(app)/collections/priority' as Href)
      },
    },
    {
      key: 'analytics',
      labelKey: 'credit.quick_analytics',
      iconName: 'bar-chart-outline',
      onPress: () => {
        void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium)
        router.push('/(app)/collections/analytics' as Href)
      },
    },
    {
      key: 'export',
      labelKey: 'credit.quick_export',
      iconName: 'download-outline',
      onPress: () => {},
      comingSoon: true,
    },
  ]

  const handleAtLimitRowPress = useCallback(
    (customerId: string) => {
      void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)
      router.push(`/(app)/customers/${customerId}/credit-settings` as Href)
    },
    [router],
  )

  // Loading state (no cached data)
  if (isDashboardLoading && !dashboard) {
    return (
      <SafeAreaView style={styles.safe} edges={['bottom']}>
        <AppHeader
          title={t('credit.dashboard_title')}
          rightAction={
            <AppIconButton
              icon={<Ionicons name="settings-outline" size={componentSizes.icon.md} color={colors.white} />}
              onPress={goToSettings}
              accessibilityLabel={t('credit.reminder_settings')}
            />
          }
        />
        <View style={styles.center}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      </SafeAreaView>
    )
  }

  // Error state (no cached data)
  if (dashboardError && !dashboard) {
    return (
      <SafeAreaView style={styles.safe} edges={['bottom']}>
        <AppHeader title={t('credit.dashboard_title')} />
        <View style={styles.center}>
          <AppEmptyState
            icon={<Ionicons name="alert-circle-outline" size={componentSizes.icon.xxxl} color={colors.error} />}
            title={t('common.error')}
            description={t('credit.error_load_dashboard')}
            actionLabel={t('common.retry')}
            onActionPress={() => void fetchDashboard()}
          />
        </View>
      </SafeAreaView>
    )
  }

  return (
    <SafeAreaView style={styles.safe} edges={['bottom']}>
      <AppHeader
        title={t('credit.dashboard_title')}
        rightAction={
          <AppIconButton
            icon={<Ionicons name="settings-outline" size={componentSizes.icon.md} color={colors.white} />}
            onPress={goToSettings}
            accessibilityLabel={t('credit.reminder_settings')}
          />
        }
      />

      {/* Offline banner */}
      {!isConnected ? (
        <View style={styles.alertRow}>
          <AppAlert type="warning" title={t('common.offline')} message={t('common.offline_message')} />
        </View>
      ) : null}

      {/* Stale data banner */}
      {dashboardError && dashboard ? (
        <View style={styles.alertRow}>
          <AppAlert type="warning" title={t('dashboard.showing_cached')} onClose={clearErrors} />
        </View>
      ) : null}

      <ScrollView style={styles.scroll} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {/* Empty/celebratory state */}
        {dashboard && dashboard.outstandingOverview.totalOutstanding === 0 ? (
          <AppEmptyState
            icon={<Ionicons name="checkmark-circle-outline" size={componentSizes.icon.xxxl} color={colors.success} />}
            title={t('credit.empty_outstanding_title')}
            description={t('credit.empty_outstanding_desc')}
          />
        ) : null}

        {dashboard ? (
          <>
            <OutstandingOverviewCard overview={dashboard.outstandingOverview} />
            <NetReceivableCard
              advanceCredit={dashboard.advanceCredit}
              netReceivable={dashboard.netReceivable}
            />
            <MonthProgressCard progress={dashboard.thisMonthProgress} />

            {/* Quick actions */}
            <AppText variant="body" weight="semibold" color={colors.textPrimary} style={styles.sectionTitle}>
              {t('credit.quick_actions_title')}
            </AppText>
            <QuickActionsGrid actions={quickActions} />

            {/* Customers at limit */}
            {dashboard.customersAtLimit.length > 0 ? (
              <>
                <AtLimitList
                  customers={dashboard.customersAtLimit}
                  onRowPress={handleAtLimitRowPress}
                />
              </>
            ) : null}
          </>
        ) : null}
      </ScrollView>
    </SafeAreaView>
  )
}

export default function CollectionsDashboardScreen() {
  return (
    <ScreenErrorBoundary>
      <CollectionsDashboardContent />
    </ScreenErrorBoundary>
  )
}

CollectionsDashboardScreen.displayName = 'CollectionsDashboardScreen'
