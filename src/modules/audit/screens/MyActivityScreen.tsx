/**
 * MyActivityScreen — Owner + Staff (US-007).
 * The caller's own recent activity + today/week/month rolling counts. Always
 * self-scoped on the server; no owner guard. 4 states: Loading / Error / Empty / Data.
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
import { AuditLogRow, ActivitySummaryStat } from '../components'
import { useAuditStore } from '../store/audit.store'
import { useTranslation } from '@hooks/useTranslation'
import { useNetworkStatus } from '@hooks/useNetworkStatus'
import { colors, spacing } from '@constants/tokens'
import type { MyActivityEntryDto, AuditLogDto } from '../../../types/audit'

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  listContent: { paddingHorizontal: spacing[4], paddingVertical: spacing[3] },
  statsRow: {
    flexDirection: 'row',
    gap: spacing[2],
    paddingHorizontal: spacing[4],
    paddingTop: spacing[3],
  },
  skeletonCard: { height: 80, marginBottom: spacing[2], backgroundColor: colors.gray100 },
})

/** Adapts a self-activity entry to the AuditLogRow DTO (no role/ipAddress on self feed). */
function toRowDto(entry: MyActivityEntryDto): AuditLogDto {
  return {
    id: entry.id,
    timestamp: entry.timestamp,
    actionType: entry.actionType,
    actionLabel: entry.actionLabel,
    entityType: null,
    entityId: null,
    user: { id: 'self', name: '', role: 'staff' },
    customer: entry.customer,
    supplyList: entry.supplyList,
    details: entry.details,
    ipAddress: null,
  }
}

function MyActivityScreenContent() {
  const { t } = useTranslation()
  const router = useRouter()
  const { isConnected } = useNetworkStatus()

  const {
    myActivity,
    myActivitySummary,
    isMyActivityLoading,
    myActivityError,
    fetchMyActivity,
    clearError,
  } = useAuditStore(
    useShallow((s) => ({
      myActivity: s.myActivity,
      myActivitySummary: s.myActivitySummary,
      isMyActivityLoading: s.isMyActivityLoading,
      myActivityError: s.myActivityError,
      fetchMyActivity: s.fetchMyActivity,
      clearError: s.clearError,
    })),
  )

  useFocusEffect(
    useCallback(() => {
      void fetchMyActivity()
    }, [fetchMyActivity]),
  )

  const onRefresh = useCallback(() => {
    clearError()
    void fetchMyActivity()
  }, [fetchMyActivity, clearError])

  const renderItem = useCallback(
    ({ item }: { item: MyActivityEntryDto }) => (
      <AuditLogRow log={toRowDto(item)} testID={`my-activity-${item.id}`} />
    ),
    [],
  )
  const keyExtractor = useCallback((e: MyActivityEntryDto) => e.id, [])

  const header = (
    <AppHeader title={t('audit.title_my_activity')} showBack onBackPress={() => router.back()} />
  )
  const offlineBanner = !isConnected ? (
    <AppAlert type="warning" title={t('common.offline')} message={t('common.offline_message')} />
  ) : null

  const statsRow = myActivitySummary ? (
    <View style={styles.statsRow}>
      <ActivitySummaryStat
        label={t('audit.my_today')}
        value={myActivitySummary.todayActions}
        testID="my-stat-today"
      />
      <ActivitySummaryStat
        label={t('audit.my_this_week')}
        value={myActivitySummary.thisWeekActions}
        testID="my-stat-week"
      />
      <ActivitySummaryStat
        label={t('audit.my_this_month')}
        value={myActivitySummary.thisMonthActions}
        testID="my-stat-month"
      />
    </View>
  ) : null

  if (isMyActivityLoading && myActivity.length === 0 && !myActivitySummary) {
    return (
      <SafeAreaView style={styles.safe} edges={['bottom']}>
        {header}
        {offlineBanner}
        <View style={styles.listContent} testID="my-activity-skeleton">
          {[0, 1, 2].map((i) => (
            <AppCard key={i} variant="flat" style={styles.skeletonCard}>
              <View />
            </AppCard>
          ))}
        </View>
      </SafeAreaView>
    )
  }

  if (myActivityError && myActivity.length === 0) {
    return (
      <SafeAreaView style={styles.safe} edges={['bottom']}>
        {header}
        {offlineBanner}
        <AppEmptyState
          title={t('common.error')}
          description={t(myActivityError)}
          actionLabel={t('common.retry')}
          onActionPress={onRefresh}
        />
      </SafeAreaView>
    )
  }

  if (myActivity.length === 0) {
    return (
      <SafeAreaView style={styles.safe} edges={['bottom']}>
        {header}
        {offlineBanner}
        {statsRow}
        <AppEmptyState
          title={t('audit.no_my_activity')}
          description={t('audit.no_my_activity_desc')}
        />
      </SafeAreaView>
    )
  }

  return (
    <SafeAreaView style={styles.safe} edges={['bottom']}>
      {header}
      {offlineBanner}
      <FlatList
        data={myActivity}
        renderItem={renderItem}
        keyExtractor={keyExtractor}
        ListHeaderComponent={statsRow}
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl
            refreshing={isMyActivityLoading}
            onRefresh={onRefresh}
            tintColor={colors.primary}
          />
        }
      />
    </SafeAreaView>
  )
}

export default function MyActivityScreen() {
  return (
    <ScreenErrorBoundary>
      <MyActivityScreenContent />
    </ScreenErrorBoundary>
  )
}

MyActivityScreen.displayName = 'MyActivityScreen'
