/**
 * CalendarScreen — /(app)/calendar (US-006, WS-3, owner).
 * Month navigator (prev/next + locale month label), list/customer filters, the
 * CalendarMonthGrid (icon+text status indicators), and a month-summary stats card.
 * Tap a populated day → /(app)/calendar/[date]. Owner-only (useRequireOwner).
 * 5 states; cached month renders offline with a banner.
 */

import React, { useCallback, useEffect, useMemo, useState } from 'react'
import { View, StyleSheet, ScrollView } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useRouter, type Href } from 'expo-router'
import { Ionicons } from '@expo/vector-icons'
import * as Haptics from 'expo-haptics'
import { useShallow } from 'zustand/react/shallow'
import { AppHeader } from '@components/layout/AppHeader'
import { AppText } from '@components/primitives/AppText'
import { AppAlert } from '@components/primitives/AppAlert'
import { AppIconButton } from '@components/primitives/AppIconButton'
import { AppStatsCard } from '@components/composite/AppStatsCard'
import { AppEmptyState } from '@components/composite/AppEmptyState'
import { ScreenErrorBoundary } from '@components/composite/ScreenErrorBoundary'
import { CalendarMonthGrid } from '../components/CalendarMonthGrid'
import { useDeliveryStore } from '../store/delivery.store'
import { useRequireOwner } from '@modules/roles/hooks/useRequireOwner'
import { useTranslation } from '@hooks/useTranslation'
import { useNetworkStatus } from '@hooks/useNetworkStatus'
import { formatCurrency } from '@utils/formatCurrency'
import { getCurrentLanguage } from '@locales/index'
import { colors, spacing, componentSizes } from '@constants/tokens'

function currentMonth(): string {
  return new Date().toISOString().slice(0, 7)
}

function shiftMonth(month: string, delta: number): string {
  const parts = month.split('-').map(Number)
  const y = parts[0] ?? 0
  const m = parts[1] ?? 1
  const date = new Date(y, m - 1 + delta, 1)
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`
}

function monthLabel(month: string): string {
  const parts = month.split('-').map(Number)
  const y = parts[0] ?? 0
  const m = parts[1] ?? 1
  const date = new Date(y, m - 1, 1)
  try {
    return date.toLocaleDateString(getCurrentLanguage(), { month: 'long', year: 'numeric' })
  } catch {
    return month
  }
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  banner: { paddingHorizontal: spacing[4], paddingTop: spacing[2] },
  navRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing[4],
    paddingVertical: spacing[3],
  },
  content: { paddingBottom: spacing[10] },
  summary: { paddingHorizontal: spacing[4], paddingTop: spacing[4] },
})

function CalendarScreenContent() {
  useRequireOwner()
  const { t } = useTranslation()
  const router = useRouter()
  const { isConnected } = useNetworkStatus()
  const [month, setMonth] = useState(currentMonth())

  const { calendar, isLoading, error, fetchCalendar } = useDeliveryStore(
    useShallow((s) => ({
      calendar: s.calendar,
      isLoading: s.isCalendarLoading,
      error: s.calendarError,
      fetchCalendar: s.fetchCalendar,
    })),
  )

  const monthData = calendar[month] ?? null

  const load = useCallback(() => {
    void fetchCalendar(month)
  }, [fetchCalendar, month])

  useEffect(() => {
    load()
  }, [load])

  const goPrev = useCallback(() => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)
    setMonth((m) => shiftMonth(m, -1))
  }, [])

  const goNext = useCallback(() => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)
    setMonth((m) => shiftMonth(m, 1))
  }, [])

  const onSelectDay = useCallback(
    (date: string) => {
      void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)
      router.push(`/(app)/calendar/${date}` as Href)
    },
    [router],
  )

  const label = useMemo(() => monthLabel(month), [month])

  const header = <AppHeader title={t('delivery.title_calendar')} showBack onBackPress={() => router.back()} />

  const nav = (
    <View style={styles.navRow}>
      <AppIconButton
        icon={<Ionicons name="chevron-back" size={componentSizes.icon.lg} color={colors.primary} />}
        onPress={goPrev}
        accessibilityLabel={t('common.back')}
      />
      <AppText variant="h4" weight="semibold">
        {label}
      </AppText>
      <AppIconButton
        icon={<Ionicons name="chevron-forward" size={componentSizes.icon.lg} color={colors.primary} />}
        onPress={goNext}
        accessibilityLabel={t('common.menu')}
      />
    </View>
  )

  if (isLoading && !monthData) {
    return (
      <SafeAreaView style={styles.safe} edges={['bottom']}>
        {header}
        {nav}
        <AppEmptyState
          icon={<Ionicons name="hourglass-outline" size={componentSizes.icon.xxxl} color={colors.primary} />}
          title={t('common.loading')}
        />
      </SafeAreaView>
    )
  }

  if (error && !monthData) {
    return (
      <SafeAreaView style={styles.safe} edges={['bottom']}>
        {header}
        {nav}
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

  const isEmpty = !monthData || Object.keys(monthData.days).length === 0

  return (
    <SafeAreaView style={styles.safe} edges={['bottom']}>
      {header}
      {!isConnected ? (
        <View style={styles.banner}>
          <AppAlert type="warning" title={t('common.offline')} message={t('common.offline_message')} />
        </View>
      ) : null}
      {nav}
      <ScrollView contentContainerStyle={styles.content}>
        {isEmpty ? (
          <AppEmptyState
            icon={<Ionicons name="calendar-outline" size={componentSizes.icon.xxxl} color={colors.primary} />}
            title={t('delivery.empty_calendar')}
          />
        ) : (
          <>
            <CalendarMonthGrid
              month={month}
              days={monthData.days}
              onSelectDay={onSelectDay}
              testID="calendar-grid"
            />
            <View style={styles.summary}>
              <AppStatsCard
                label={t('delivery.month_summary')}
                value={t('delivery.progress', {
                  done: monthData.summary.totalDeliveries,
                  total: monthData.summary.totalDeliveries,
                })}
                badge={`${t('delivery.total_leaves')}: ${monthData.summary.totalLeaves}`}
                badgeVariant="warning"
                icon="cube-outline"
              />
              <AppText variant="caption" color={colors.textSecondary}>
                {t('delivery.revenue_label')}: {formatCurrency(monthData.summary.revenue)}
              </AppText>
            </View>
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  )
}

export default function CalendarScreen() {
  return (
    <ScreenErrorBoundary>
      <CalendarScreenContent />
    </ScreenErrorBoundary>
  )
}

CalendarScreen.displayName = 'CalendarScreen'
