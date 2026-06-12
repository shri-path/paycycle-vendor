/**
 * StaffSummaryScreen — Owner (US-007).
 * Per-staff activity aggregation (counts, active days, by-action breakdown).
 * 5 states: Loading / Error / Empty / Data. Owner-only (useRequireOwner + route group).
 */

import React, { useCallback } from 'react'
import { View, StyleSheet, FlatList, RefreshControl } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useFocusEffect, useRouter } from 'expo-router'
import { useShallow } from 'zustand/react/shallow'
import { AppHeader } from '@components/layout/AppHeader'
import { AppCard } from '@components/primitives/AppCard'
import { AppAlert } from '@components/primitives/AppAlert'
import { AppEmptyState } from '@components/composite/AppEmptyState'
import { ScreenErrorBoundary } from '@components/composite/ScreenErrorBoundary'
import { StaffSummaryCard } from '../components'
import { useAuditStore } from '../store/audit.store'
import { useRequireOwner } from '@modules/roles/hooks/useRequireOwner'
import { useTranslation } from '@hooks/useTranslation'
import { useNetworkStatus } from '@hooks/useNetworkStatus'
import { colors, spacing } from '@constants/tokens'
import type { StaffSummaryDto } from '../../../types/audit'

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  listContent: { paddingHorizontal: spacing[4], paddingVertical: spacing[3] },
  skeletonCard: { height: 140, marginBottom: spacing[2], backgroundColor: colors.gray100 },
})

function SummarySkeleton() {
  return (
    <View style={styles.listContent} testID="staff-summary-skeleton">
      {[0, 1].map((i) => (
        <AppCard key={i} variant="flat" style={styles.skeletonCard}>
          <View />
        </AppCard>
      ))}
    </View>
  )
}

function StaffSummaryScreenContent() {
  useRequireOwner()
  const { t } = useTranslation()
  const router = useRouter()
  const { isConnected } = useNetworkStatus()

  const {
    staffSummary,
    isSummaryLoading,
    summaryError,
    fetchStaffSummary,
    clearError,
  } = useAuditStore(
    useShallow((s) => ({
      staffSummary: s.staffSummary,
      isSummaryLoading: s.isSummaryLoading,
      summaryError: s.summaryError,
      fetchStaffSummary: s.fetchStaffSummary,
      clearError: s.clearError,
    })),
  )

  useFocusEffect(
    useCallback(() => {
      void fetchStaffSummary()
    }, [fetchStaffSummary]),
  )

  const onRefresh = useCallback(() => {
    clearError()
    void fetchStaffSummary()
  }, [fetchStaffSummary, clearError])

  const renderItem = useCallback(
    ({ item }: { item: StaffSummaryDto }) => (
      <StaffSummaryCard summary={item} testID={`staff-summary-${item.staffId}`} />
    ),
    [],
  )
  const keyExtractor = useCallback((s: StaffSummaryDto) => s.staffId, [])

  const header = (
    <AppHeader title={t('audit.title_staff_summary')} showBack onBackPress={() => router.back()} />
  )
  const offlineBanner = !isConnected ? (
    <AppAlert type="warning" title={t('common.offline')} message={t('common.offline_message')} />
  ) : null

  if (isSummaryLoading && staffSummary.length === 0) {
    return (
      <SafeAreaView style={styles.safe} edges={['bottom']}>
        {header}
        {offlineBanner}
        <SummarySkeleton />
      </SafeAreaView>
    )
  }

  if (summaryError && staffSummary.length === 0) {
    return (
      <SafeAreaView style={styles.safe} edges={['bottom']}>
        {header}
        {offlineBanner}
        <AppEmptyState
          title={t('common.error')}
          description={t(summaryError)}
          actionLabel={t('common.retry')}
          onActionPress={onRefresh}
        />
      </SafeAreaView>
    )
  }

  if (staffSummary.length === 0) {
    return (
      <SafeAreaView style={styles.safe} edges={['bottom']}>
        {header}
        {offlineBanner}
        <AppEmptyState title={t('audit.no_summary')} description={t('audit.no_summary_desc')} />
      </SafeAreaView>
    )
  }

  return (
    <SafeAreaView style={styles.safe} edges={['bottom']}>
      {header}
      {offlineBanner}
      <FlatList
        data={staffSummary}
        renderItem={renderItem}
        keyExtractor={keyExtractor}
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl
            refreshing={isSummaryLoading}
            onRefresh={onRefresh}
            tintColor={colors.primary}
          />
        }
      />
    </SafeAreaView>
  )
}

export default function StaffSummaryScreen() {
  return (
    <ScreenErrorBoundary>
      <StaffSummaryScreenContent />
    </ScreenErrorBoundary>
  )
}

StaffSummaryScreen.displayName = 'StaffSummaryScreen'
