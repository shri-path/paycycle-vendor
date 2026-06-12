/**
 * StaffActivityLogScreen — Owner (US-007, wireframe 2.24).
 * Activity timeline of all staff/owner actions with Staff + Action-type + Period
 * filters, conflict highlighting, infinite-scroll pagination, pull-to-refresh, and a
 * CSV Export Activity Report button.
 *
 * 5 states: Loading skeleton / Error / Empty / Empty-filtered / Data.
 * Owner-only: guarded by `useRequireOwner` (defence-in-depth) + the owner route group.
 * Export is online-only (disabled offline). Refetch on focus; no background polling (OQ-4).
 *
 * Security: vendorId is JWT-derived in the store — never from route params.
 */

import React, { useCallback, useEffect, useMemo, useState } from 'react'
import { View, StyleSheet, FlatList, RefreshControl, Platform } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useFocusEffect, useRouter, type Href } from 'expo-router'
import * as Haptics from 'expo-haptics'
import { useShallow } from 'zustand/react/shallow'
import { AppHeader } from '@components/layout/AppHeader'
import { AppText } from '@components/primitives/AppText'
import { AppButton } from '@components/primitives/AppButton'
import { AppCard } from '@components/primitives/AppCard'
import { AppAlert } from '@components/primitives/AppAlert'
import { AppSelect } from '@components/primitives/AppSelect'
import { AppSegmentedControl } from '@components/composite/AppSegmentedControl'
import { AppEmptyState } from '@components/composite/AppEmptyState'
import { ScreenErrorBoundary } from '@components/composite/ScreenErrorBoundary'
import { AuditLogRow } from '../components'
import { useAuditStore } from '../store/audit.store'
import { useRequireOwner } from '@modules/roles/hooks/useRequireOwner'
import { useTranslation } from '@hooks/useTranslation'
import { useNetworkStatus } from '@hooks/useNetworkStatus'
import { colors, spacing } from '@constants/tokens'
import { periodToDateRange, PERIOD_KEYS, type ActivityPeriod } from '../utils/period'
import type { AuditLogDto } from '../../../types/audit'

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  controls: { paddingHorizontal: spacing[4], paddingTop: spacing[3], gap: spacing[3] },
  filterRow: { flexDirection: 'row', gap: spacing[2] },
  filterItem: { flex: 1 },
  navRow: { flexDirection: 'row', gap: spacing[2] },
  navItem: { flex: 1 },
  listContent: { paddingHorizontal: spacing[4], paddingBottom: spacing[24], paddingTop: spacing[3] },
  skeletonCard: { height: 88, marginBottom: spacing[2], backgroundColor: colors.gray100 },
  bottomBar: { position: 'absolute', left: spacing[4], right: spacing[4], bottom: spacing[6] },
})

function ActivitySkeleton() {
  return (
    <View style={styles.listContent} testID="audit-log-skeleton">
      {[0, 1, 2, 3].map((i) => (
        <AppCard key={i} variant="flat" style={styles.skeletonCard}>
          <View />
        </AppCard>
      ))}
    </View>
  )
}

function StaffActivityLogScreenContent() {
  useRequireOwner()
  const { t } = useTranslation()
  const router = useRouter()
  const { isConnected } = useNetworkStatus()

  const {
    logs,
    pagination,
    filters,
    isLogsLoading,
    logsError,
    isExporting,
    filterStaffId,
    filterActionType,
    setStaffFilter,
    setActionFilter,
    setDateRange,
    fetchAuditLogs,
    exportLogs,
    clearError,
  } = useAuditStore(
    useShallow((s) => ({
      logs: s.logs,
      pagination: s.pagination,
      filters: s.filters,
      isLogsLoading: s.isLogsLoading,
      logsError: s.logsError,
      isExporting: s.isExporting,
      filterStaffId: s.filterStaffId,
      filterActionType: s.filterActionType,
      setStaffFilter: s.setStaffFilter,
      setActionFilter: s.setActionFilter,
      setDateRange: s.setDateRange,
      fetchAuditLogs: s.fetchAuditLogs,
      exportLogs: s.exportLogs,
      clearError: s.clearError,
    })),
  )

  const [period, setPeriod] = useState<ActivityPeriod>('today')
  const [exportNote, setExportNote] = useState<string | null>(null)

  // Refetch page 1 whenever filters change.
  useEffect(() => {
    void fetchAuditLogs({ page: 1 })
  }, [fetchAuditLogs, filterStaffId, filterActionType])

  // Refetch on focus (reactive freshness; no background polling — OQ-4).
  useFocusEffect(
    useCallback(() => {
      void fetchAuditLogs({ page: 1 })
    }, [fetchAuditLogs]),
  )

  // ---- Staff filter ----
  const staffOptions = useMemo(
    () => [
      { label: t('audit.filter_all_staff'), value: '' },
      ...filters.availableStaff.map((s) => ({ label: s.name, value: s.id })),
    ],
    [filters.availableStaff, t],
  )
  const onChangeStaff = useCallback(
    (value: string | number) => setStaffFilter(value === '' ? null : String(value)),
    [setStaffFilter],
  )

  // ---- Action-type filter ----
  const actionOptions = useMemo(
    () => [
      { label: t('audit.filter_all_actions'), value: '' },
      ...filters.availableActionTypes.map((a) => ({ label: a, value: a })),
    ],
    [filters.availableActionTypes, t],
  )
  const onChangeAction = useCallback(
    (value: string | number) => setActionFilter(value === '' ? null : String(value)),
    [setActionFilter],
  )

  // ---- Period filter ----
  const periodIndex = PERIOD_KEYS.indexOf(period)
  const onChangePeriod = useCallback(
    (index: number) => {
      const next = PERIOD_KEYS[index] ?? 'today'
      if (next === period) return
      void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)
      setPeriod(next)
      const { startDate, endDate } = periodToDateRange(next)
      setDateRange(startDate, endDate)
    },
    [period, setDateRange],
  )

  // ---- Pagination ----
  const onEndReached = useCallback(() => {
    if (isLogsLoading || !pagination) return
    if (pagination.page >= pagination.totalPages) return
    void fetchAuditLogs({ page: pagination.page + 1 })
  }, [isLogsLoading, pagination, fetchAuditLogs])

  // ---- Pull to refresh ----
  const onRefresh = useCallback(() => {
    clearError()
    void fetchAuditLogs({ page: 1 })
  }, [fetchAuditLogs, clearError])

  // ---- Export ----
  const onExport = useCallback(async () => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium)
    const outcome = await exportLogs()
    // Surface the outcome in a one-shot banner (success / unavailable / failed).
    setExportNote(
      outcome === 'shared'
        ? 'audit.export_success'
        : outcome === 'unavailable'
          ? 'audit.export_unavailable'
          : 'audit.export_failed',
    )
  }, [exportLogs])

  const renderItem = useCallback(
    ({ item }: { item: AuditLogDto }) => (
      <AuditLogRow log={item} testID={`audit-row-${item.id}`} />
    ),
    [],
  )

  const keyExtractor = useCallback((l: AuditLogDto) => l.id, [])

  const header = <AppHeader title={t('audit.title')} />

  const offlineBanner = !isConnected ? (
    <AppAlert type="warning" title={t('common.offline')} message={t('common.offline_message')} />
  ) : null

  const exportSucceeded = exportNote === 'audit.export_success'
  const exportBanner = exportNote ? (
    <AppAlert
      type={exportSucceeded ? 'success' : 'warning'}
      title={t(exportSucceeded ? 'common.success' : 'common.warning')}
      message={t(exportNote)}
    />
  ) : null

  const controls = (
    <View style={styles.controls}>
      <View style={styles.filterRow}>
        <View style={styles.filterItem}>
          <AppSelect
            options={staffOptions}
            value={filterStaffId ?? ''}
            onChange={onChangeStaff}
            placeholder={t('audit.filter_all_staff')}
          />
        </View>
        <View style={styles.filterItem}>
          <AppSelect
            options={actionOptions}
            value={filterActionType ?? ''}
            onChange={onChangeAction}
            placeholder={t('audit.filter_all_actions')}
          />
        </View>
      </View>
      <AppSegmentedControl
        segments={[
          t('audit.period_today'),
          t('audit.period_yesterday'),
          t('audit.period_this_week'),
          t('audit.period_this_month'),
        ]}
        selectedIndex={periodIndex >= 0 ? periodIndex : 0}
        onChange={onChangePeriod}
      />
      <View style={styles.navRow}>
        <View style={styles.navItem}>
          <AppButton
            label={t('audit.view_conflicts')}
            onPress={() => router.push('/(app)/activity/conflicts' as Href)}
            variant="secondary"
            fullWidth
            testID="audit-nav-conflicts"
          />
        </View>
        <View style={styles.navItem}>
          <AppButton
            label={t('audit.view_staff_summary')}
            onPress={() => router.push('/(app)/activity/staff-summary' as Href)}
            variant="secondary"
            fullWidth
            testID="audit-nav-summary"
          />
        </View>
      </View>
    </View>
  )

  const exportBar = (
    <View style={styles.bottomBar}>
      <AppButton
        label={isExporting ? t('audit.exporting') : t('audit.export')}
        onPress={onExport}
        variant="primary"
        fullWidth
        loading={isExporting}
        disabled={!isConnected || isExporting || logs.length === 0}
        accessibilityHint={!isConnected ? t('common.needs_connection') : undefined}
        testID="audit-export"
      />
    </View>
  )

  // ---- Loading (first load) ----
  if (isLogsLoading && logs.length === 0) {
    return (
      <SafeAreaView style={styles.safe} edges={['bottom']}>
        {header}
        {offlineBanner}
        {controls}
        <ActivitySkeleton />
      </SafeAreaView>
    )
  }

  // ---- Error (no cached data) ----
  if (logsError && logs.length === 0) {
    return (
      <SafeAreaView style={styles.safe} edges={['bottom']}>
        {header}
        {offlineBanner}
        {controls}
        <AppEmptyState
          title={t('common.error')}
          description={t(logsError)}
          actionLabel={t('common.retry')}
          onActionPress={onRefresh}
        />
      </SafeAreaView>
    )
  }

  const isEmpty = logs.length === 0
  const isFiltered = filterStaffId !== null || filterActionType !== null || period !== 'today'

  // ---- Empty ----
  if (isEmpty) {
    return (
      <SafeAreaView style={styles.safe} edges={['bottom']}>
        {header}
        {offlineBanner}
        {controls}
        <AppEmptyState
          title={t('audit.no_activity')}
          description={isFiltered ? t('audit.no_activity') : t('audit.no_activity_desc')}
        />
      </SafeAreaView>
    )
  }

  // ---- Data ----
  return (
    <SafeAreaView style={styles.safe} edges={['bottom']}>
      {header}
      {offlineBanner}
      {exportBanner}
      {controls}
      <FlatList
        data={logs}
        renderItem={renderItem}
        keyExtractor={keyExtractor}
        contentContainerStyle={styles.listContent}
        initialNumToRender={8}
        maxToRenderPerBatch={10}
        windowSize={5}
        removeClippedSubviews={Platform.OS === 'android'}
        onEndReached={onEndReached}
        onEndReachedThreshold={0.5}
        ListHeaderComponent={
          <AppText variant="caption" weight="semibold" color={colors.textSecondary}>
            {t('audit.timeline')}
          </AppText>
        }
        refreshControl={
          <RefreshControl
            refreshing={isLogsLoading}
            onRefresh={onRefresh}
            tintColor={colors.primary}
          />
        }
      />
      {exportBar}
    </SafeAreaView>
  )
}

export default function StaffActivityLogScreen() {
  return (
    <ScreenErrorBoundary>
      <StaffActivityLogScreenContent />
    </ScreenErrorBoundary>
  )
}

StaffActivityLogScreen.displayName = 'StaffActivityLogScreen'
