/**
 * DayDetailScreen — /(app)/calendar/[date] (US-006, WS-3, owner).
 * One day's breakdown: summary stats, by-list rows, extra charges, and leaves (with
 * a translated markedBy role label). Owner-only (useRequireOwner). 5 states; cached
 * day renders offline with a banner.
 */

import React, { useCallback, useEffect } from 'react'
import { View, StyleSheet, ScrollView } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useLocalSearchParams, useRouter } from 'expo-router'
import { Ionicons } from '@expo/vector-icons'
import { useShallow } from 'zustand/react/shallow'
import { AppHeader } from '@components/layout/AppHeader'
import { AppText } from '@components/primitives/AppText'
import { AppAlert } from '@components/primitives/AppAlert'
import { AppStatsCard } from '@components/composite/AppStatsCard'
import { AppSection } from '@components/composite/AppSection'
import { AppEmptyState } from '@components/composite/AppEmptyState'
import { ScreenErrorBoundary } from '@components/composite/ScreenErrorBoundary'
import { useDeliveryStore } from '../store/delivery.store'
import { useRequireOwner } from '@modules/roles/hooks/useRequireOwner'
import { useTranslation } from '@hooks/useTranslation'
import { useNetworkStatus } from '@hooks/useNetworkStatus'
import { formatCurrency } from '@utils/formatCurrency'
import { formatLocaleDate } from '@utils/formatDate'
import { colors, spacing, componentSizes } from '@constants/tokens'

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  banner: { paddingHorizontal: spacing[4], paddingTop: spacing[2] },
  content: { padding: spacing[4], paddingBottom: spacing[10], gap: spacing[3] },
  row: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: spacing[2], gap: spacing[2] },
  rowInfo: { flex: 1 },
})

function DayDetailScreenContent() {
  useRequireOwner()
  const { t } = useTranslation()
  const router = useRouter()
  const params = useLocalSearchParams<{ date: string }>()
  const date = params.date
  const { isConnected } = useNetworkStatus()

  const { detail, isLoading, error, fetchDayDetail } = useDeliveryStore(
    useShallow((s) => ({
      detail: s.dayDetail[date] ?? null,
      isLoading: s.isDayLoading,
      error: s.dayError,
      fetchDayDetail: s.fetchDayDetail,
    })),
  )

  const load = useCallback(() => {
    void fetchDayDetail(date)
  }, [fetchDayDetail, date])

  useEffect(() => {
    load()
  }, [load])

  const header = (
    <AppHeader
      title={date ? formatLocaleDate(date) : t('delivery.title_day_detail')}
      showBack
      onBackPress={() => router.back()}
    />
  )

  if (isLoading && !detail) {
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

  if (error && !detail) {
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

  const isEmpty =
    !detail ||
    (detail.byList.length === 0 && detail.extraCharges.length === 0 && detail.leaves.length === 0)

  if (isEmpty) {
    return (
      <SafeAreaView style={styles.safe} edges={['bottom']}>
        {header}
        <AppEmptyState
          icon={<Ionicons name="calendar-clear-outline" size={componentSizes.icon.xxxl} color={colors.primary} />}
          title={t('delivery.empty_day')}
        />
      </SafeAreaView>
    )
  }

  return (
    <SafeAreaView style={styles.safe} edges={['bottom']}>
      {header}
      {!isConnected ? (
        <View style={styles.banner}>
          <AppAlert type="warning" title={t('common.offline')} message={t('common.offline_message')} />
        </View>
      ) : null}
      <ScrollView contentContainerStyle={styles.content}>
        <AppStatsCard
          label={t('delivery.today_summary')}
          value={t('delivery.progress', {
            done: detail.summary.totalDeliveries,
            total: detail.summary.totalDeliveries,
          })}
          badge={`${t('delivery.revenue_label')}: ${formatCurrency(detail.summary.revenue)}`}
          icon="cube-outline"
        />

        <AppSection title={t('delivery.by_list')}>
          {detail.byList.map((row) => (
            <View key={row.listId} style={styles.row}>
              <View style={styles.rowInfo}>
                <AppText variant="body" weight="medium" numberOfLines={1}>
                  {row.listName}
                </AppText>
                <AppText variant="caption" color={colors.textSecondary}>
                  {row.startTime ?? ''} {row.staffName ? `· ${row.staffName}` : ''}
                </AppText>
              </View>
              <View>
                <AppText variant="caption" color={colors.textSecondary}>
                  {t('delivery.delivered_count')}: {row.delivered} · {t('delivery.leaves_count')}: {row.leaves}
                </AppText>
                <AppText variant="caption" weight="medium" color={colors.textPrimary}>
                  {formatCurrency(row.revenue)}
                </AppText>
              </View>
            </View>
          ))}
        </AppSection>

        {detail.extraCharges.length > 0 ? (
          <AppSection title={t('delivery.extra_charges_section')}>
            {detail.extraCharges.map((c, i) => (
              <View key={`charge-${i}`} style={styles.row}>
                <View style={styles.rowInfo}>
                  <AppText variant="body" numberOfLines={1}>
                    {c.customerName ?? t('common.you')}
                  </AppText>
                  <AppText variant="caption" color={colors.textSecondary} numberOfLines={1}>
                    {c.listName} · {c.reason}
                  </AppText>
                </View>
                <AppText variant="body" weight="medium" color={colors.textPrimary}>
                  {formatCurrency(c.amount)}
                </AppText>
              </View>
            ))}
          </AppSection>
        ) : null}

        {detail.leaves.length > 0 ? (
          <AppSection title={t('delivery.leaves_section')}>
            {detail.leaves.map((l, i) => (
              <View key={`leave-${i}`} style={styles.row}>
                <View style={styles.rowInfo}>
                  <AppText variant="body" numberOfLines={1}>
                    {l.customerName ?? t('common.you')}
                  </AppText>
                  <AppText variant="caption" color={colors.textSecondary} numberOfLines={1}>
                    {l.listName}
                  </AppText>
                </View>
                <AppText variant="caption" color={colors.textSecondary}>
                  {t(`delivery.marked_by_${l.markedBy}`)}
                </AppText>
              </View>
            ))}
          </AppSection>
        ) : null}
      </ScrollView>
    </SafeAreaView>
  )
}

export default function DayDetailScreen() {
  return (
    <ScreenErrorBoundary>
      <DayDetailScreenContent />
    </ScreenErrorBoundary>
  )
}

DayDetailScreen.displayName = 'DayDetailScreen'
