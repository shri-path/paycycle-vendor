/**
 * TodayOverviewScreen — /(app)/deliveries/today (US-006, WS-2, owner).
 * All-lists today overview: summary stats, list filter, a ConflictBanner, and a
 * FlatList of per-list progress cards (name, start time, staff, progress, counts,
 * revenue) each with "Open list". Owner-only (useRequireOwner). 5 states; offline
 * shows cached + banner.
 */

import React, { useCallback, useEffect, useMemo, useState } from 'react'
import { View, StyleSheet, FlatList, RefreshControl } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useRouter, type Href } from 'expo-router'
import { Ionicons } from '@expo/vector-icons'
import * as Haptics from 'expo-haptics'
import { useShallow } from 'zustand/react/shallow'
import { AppHeader } from '@components/layout/AppHeader'
import { AppText } from '@components/primitives/AppText'
import { AppCard } from '@components/primitives/AppCard'
import { AppButton } from '@components/primitives/AppButton'
import { AppAlert } from '@components/primitives/AppAlert'
import { AppSelect } from '@components/primitives/AppSelect'
import { AppStatsCard } from '@components/composite/AppStatsCard'
import { AppProgressBar } from '@components/composite/AppProgressBar'
import { AppEmptyState } from '@components/composite/AppEmptyState'
import { ScreenErrorBoundary } from '@components/composite/ScreenErrorBoundary'
import { ConflictBanner } from '../components/ConflictBanner'
import { useDeliveryStore } from '../store/delivery.store'
import { useRequireOwner } from '@modules/roles/hooks/useRequireOwner'
import { useTranslation } from '@hooks/useTranslation'
import { useNetworkStatus } from '@hooks/useNetworkStatus'
import { formatCurrency } from '@utils/formatCurrency'
import { formatLocaleDate } from '@utils/formatDate'
import { colors, spacing, componentSizes } from '@constants/tokens'
import type { TodayListDto } from '../../../types/delivery'

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  banner: { paddingHorizontal: spacing[4], paddingTop: spacing[2] },
  content: { padding: spacing[4], paddingBottom: spacing[10] },
  filter: { marginBottom: spacing[3] },
  listCard: { marginBottom: spacing[3], padding: spacing[4] },
  cardMeta: { marginTop: spacing[1] },
  countsRow: { flexDirection: 'row', gap: spacing[4], marginTop: spacing[2], flexWrap: 'wrap' },
  openBtn: { marginTop: spacing[3] },
})

function TodayOverviewScreenContent() {
  useRequireOwner()
  const { t } = useTranslation()
  const router = useRouter()
  const { isConnected } = useNetworkStatus()
  const [listFilter, setListFilter] = useState<string>('all')

  const { today, isLoading, error, fetchToday } = useDeliveryStore(
    useShallow((s) => ({
      today: s.today,
      isLoading: s.isTodayLoading,
      error: s.todayError,
      fetchToday: s.fetchToday,
    })),
  )

  const load = useCallback(() => {
    void fetchToday(listFilter === 'all' ? {} : { listId: listFilter })
  }, [fetchToday, listFilter])

  useEffect(() => {
    load()
  }, [load])

  const listOptions = useMemo(() => {
    const opts = [{ label: t('delivery.all_lists'), value: 'all' }]
    today?.byList.forEach((l) => opts.push({ label: l.listName, value: l.listId }))
    return opts
  }, [today, t])

  const openList = useCallback(
    (listId: string) => {
      void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)
      router.push(`/(app)/deliveries/${listId}` as Href)
    },
    [router],
  )

  const onSelectConflict = useCallback(
    (deliveryId: string) => {
      const owningList = today?.byList.find(() => true)
      void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)
      if (owningList) router.push(`/(app)/deliveries/${owningList.listId}` as Href)
      else void deliveryId
    },
    [router, today],
  )

  const renderItem = useCallback(
    ({ item }: { item: TodayListDto }) => {
      const staffNames = item.staff.map((s) => s.name).filter(Boolean).join(', ')
      return (
        <AppCard variant="elevated" style={styles.listCard} testID={`today-list-${item.listId}`}>
          <AppText variant="h4" weight="semibold" numberOfLines={1}>
            {item.listName}
          </AppText>
          <AppText variant="caption" color={colors.textSecondary} style={styles.cardMeta} numberOfLines={1}>
            {item.startTime ?? ''} {staffNames ? `· ${staffNames}` : ''}
          </AppText>
          <AppProgressBar
            value={item.delivered}
            max={item.totalCustomers > 0 ? item.totalCustomers : 1}
            variant="success"
            containerStyle={styles.cardMeta}
          />
          <View style={styles.countsRow}>
            <AppText variant="caption" color={colors.textSecondary}>
              {t('delivery.delivered_count')}: {item.delivered}
            </AppText>
            <AppText variant="caption" color={colors.textSecondary}>
              {t('delivery.leaves_count')}: {item.onLeave}
            </AppText>
            <AppText variant="caption" color={colors.textSecondary}>
              {t('delivery.pending_count')}: {item.pending}
            </AppText>
            {item.revenue != null ? (
              <AppText variant="caption" weight="medium" color={colors.textPrimary}>
                {t('delivery.revenue_label')}: {formatCurrency(item.revenue)}
              </AppText>
            ) : null}
          </View>
          <AppButton
            label={t('delivery.open_list')}
            variant="secondary"
            size="sm"
            onPress={() => openList(item.listId)}
            style={styles.openBtn}
            testID={`today-open-${item.listId}`}
          />
        </AppCard>
      )
    },
    [t, openList],
  )

  const dateLabel = today?.date ? formatLocaleDate(today.date) : ''
  const header = (
    <AppHeader title={t('delivery.title_today')} showBack onBackPress={() => router.back()} />
  )

  if (isLoading && !today) {
    return (
      <SafeAreaView style={styles.safe} edges={['bottom']}>
        {header}
        <AppEmptyState
          icon={<Ionicons name="hourglass-outline" size={componentSizes.icon.xxxl} color={colors.primary} />}
          title={t('common.loading')}
        />
      </SafeAreaView>
    )
  }

  if (error && !today) {
    return (
      <SafeAreaView style={styles.safe} edges={['bottom']}>
        {header}
        <AppEmptyState
          icon={<Ionicons name="alert-circle-outline" size={componentSizes.icon.xxxl} color={colors.error} />}
          title={t('common.error')}
          description={t(error)}
          actionLabel={t('common.retry')}
          onActionPress={load}
        />
      </SafeAreaView>
    )
  }

  const summary = today?.summary
  const isEmpty = !today || today.byList.length === 0

  return (
    <SafeAreaView style={styles.safe} edges={['bottom']}>
      {header}
      {!isConnected ? (
        <View style={styles.banner}>
          <AppAlert type="warning" title={t('common.offline')} message={t('common.offline_message')} />
        </View>
      ) : null}

      <FlatList
        data={today?.byList ?? []}
        renderItem={renderItem}
        keyExtractor={(item) => item.listId}
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={isLoading} onRefresh={load} />}
        ListHeaderComponent={
          <View>
            {dateLabel ? (
              <AppText variant="caption" color={colors.textSecondary}>
                {dateLabel}
              </AppText>
            ) : null}
            {summary ? (
              <AppStatsCard
                label={t('delivery.today_summary')}
                value={t('delivery.progress', { done: summary.delivered, total: summary.totalDeliveries })}
                icon="cube-outline"
                badge={summary.conflicts > 0 ? t('delivery.conflicts_count', { count: summary.conflicts }) : undefined}
                badgeVariant="warning"
              />
            ) : null}
            <AppSelect
              label={t('delivery.all_lists')}
              options={listOptions}
              value={listFilter}
              onChange={(v) => setListFilter(String(v))}
              containerStyle={styles.filter}
            />
            {today ? (
              <ConflictBanner conflicts={today.conflicts} onSelectConflict={onSelectConflict} testID="conflict-banner" />
            ) : null}
          </View>
        }
        ListEmptyComponent={
          isEmpty ? (
            <AppEmptyState
              icon={<Ionicons name="calendar-outline" size={componentSizes.icon.xxxl} color={colors.primary} />}
              title={t('delivery.empty_today')}
            />
          ) : null
        }
      />
    </SafeAreaView>
  )
}

export default function TodayOverviewScreen() {
  return (
    <ScreenErrorBoundary>
      <TodayOverviewScreenContent />
    </ScreenErrorBoundary>
  )
}

TodayOverviewScreen.displayName = 'TodayOverviewScreen'
