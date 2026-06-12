/**
 * SupplyForecastScreen (US-010, FEATURE_PLAN §2.3)
 * Purpose: Supply forecast drill-down for owners. Shows tomorrow's quantities
 * or next 7 days, filterable by supply type, switchable between By List / Aggregated views.
 *
 * Note: Custom date range is deferred (OQ-3). Only Tomorrow + Next 7 Days ship in MVP.
 * Owner-only: `useRequireOwner()` guard.
 *
 * State is held locally (dateRange, supplyTypeFilter, viewMode); each change
 * triggers a store fetch. Pull-to-refresh only (no auto-refresh on drill-downs).
 */

import React, { useState, useCallback, useMemo } from 'react'
import {
  View,
  ScrollView,
  StyleSheet,
  RefreshControl,
  ActivityIndicator,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useRouter, useFocusEffect } from 'expo-router'
import { useShallow } from 'zustand/react/shallow'
import { Ionicons } from '@expo/vector-icons'
import { AppHeader } from '@components/layout/AppHeader'
import { AppCard } from '@components/primitives/AppCard'
import { AppText } from '@components/primitives/AppText'
import { AppAlert } from '@components/primitives/AppAlert'
import { AppSegmentedControl } from '@components/composite/AppSegmentedControl'
import { AppEmptyState } from '@components/composite/AppEmptyState'
import { ScreenErrorBoundary } from '@components/composite/ScreenErrorBoundary'
import { useRequireOwner } from '@modules/roles/hooks/useRequireOwner'
import { useTranslation } from '@hooks/useTranslation'
import { useNetworkStatus } from '@hooks/useNetworkStatus'
import { colors, spacing, componentSizes } from '@constants/tokens'
import { useDashboardStore } from '../store/dashboard.store'
import { ForecastByListView, ForecastAggregatedView } from '../components'
import type { ForecastAggregateGroup } from '../../../types/dashboard'

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  content: { paddingHorizontal: spacing[4], paddingTop: spacing[3], paddingBottom: spacing[8] },
  controls: { gap: spacing[3], marginBottom: spacing[3] },
  controlLabel: { marginBottom: spacing[1] },
  summaryCard: { padding: spacing[4], marginBottom: spacing[3] },
  summaryRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: spacing[2] },
  centeredState: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: spacing[6] },
  alertRow: { paddingHorizontal: spacing[4] },
  loadingRow: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: spacing[6] },
})

function SupplyForecastContent() {
  const { t } = useTranslation()
  const router = useRouter()
  const { isConnected } = useNetworkStatus()
  useRequireOwner()

  // Local UI state (FEATURE_PLAN §2.3)
  const [dateRangeIndex, setDateRangeIndex] = useState(0) // 0=Tomorrow, 1=Next 7 Days
  const [supplyTypeFilter, setSupplyTypeFilter] = useState<string | null>(null)
  const [viewModeIndex, setViewModeIndex] = useState(0) // 0=By List, 1=Aggregated

  const {
    forecast,
    isForecastLoading,
    forecastError,
    fetchForecast,
    clearErrors,
  } = useDashboardStore(
    useShallow((s) => ({
      forecast: s.forecast,
      isForecastLoading: s.isForecastLoading,
      forecastError: s.forecastError,
      fetchForecast: s.fetchForecast,
      clearErrors: s.clearErrors,
    })),
  )

  const days = dateRangeIndex === 1 ? 7 : 1

  const doFetch = useCallback(() => {
    void fetchForecast({ days, supplyType: supplyTypeFilter })
  }, [fetchForecast, days, supplyTypeFilter])

  useFocusEffect(
    useCallback(() => {
      doFetch()
      return () => clearErrors()
    }, [doFetch, clearErrors]),
  )

  // Rebuild aggregate groups from the DTO (map Record → array)
  const aggregateGroups: ForecastAggregateGroup[] = useMemo(() => {
    if (!forecast) return []
    const src = days === 7 && forecast.next7Days ? forecast.next7Days : forecast.aggregatedByType
    return Object.entries(src).map(([type, v]) => ({
      supplyType: type,
      totalQuantity: v.totalQuantity,
      unit: v.unit,
      lists: v.lists,
      dailyAverage: 'dailyAverage' in v ? (v as { dailyAverage: number }).dailyAverage : undefined,
    }))
  }, [forecast, days])

  // Supply type filter options derived from forecast data
  const supplyTypeOptions = useMemo(() => {
    if (!forecast) return []
    return Array.from(new Set(forecast.byList.map((r) => r.supplyType)))
  }, [forecast])

  const dateSegments = [t('dashboard.tomorrow'), t('dashboard.next_7_days')]
  const viewSegments = [t('dashboard.by_list'), t('dashboard.aggregated')]

  if (isForecastLoading && !forecast) {
    return (
      <SafeAreaView style={styles.safe} edges={['bottom']}>
        <AppHeader title={t('dashboard.forecast_title')} showBack onBackPress={() => router.back()} />
        <View style={styles.loadingRow}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      </SafeAreaView>
    )
  }

  if (forecastError && !forecast) {
    return (
      <SafeAreaView style={styles.safe} edges={['bottom']}>
        <AppHeader title={t('dashboard.forecast_title')} showBack onBackPress={() => router.back()} />
        <View style={styles.centeredState}>
          <AppEmptyState
            icon={<Ionicons name="alert-circle-outline" size={componentSizes.icon.xxxl} color={colors.error} />}
            title={t('common.error')}
            description={t('dashboard.error_load_forecast')}
            actionLabel={t('common.retry')}
            onActionPress={doFetch}
          />
        </View>
      </SafeAreaView>
    )
  }

  return (
    <SafeAreaView style={styles.safe} edges={['bottom']}>
      <AppHeader title={t('dashboard.forecast_title')} showBack onBackPress={() => router.back()} />

      {!isConnected ? (
        <View style={styles.alertRow}>
          <AppAlert type="warning" title={t('common.offline')} message={t('common.offline_message')} />
        </View>
      ) : null}

      {forecastError && forecast ? (
        <View style={styles.alertRow}>
          <AppAlert type="error" title={t('dashboard.showing_cached')} onClose={clearErrors} />
        </View>
      ) : null}

      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={isForecastLoading}
            onRefresh={doFetch}
            tintColor={colors.primary}
          />
        }
      >
        {/* Controls */}
        <View style={styles.controls}>
          {/* Date range: Tomorrow | Next 7 Days */}
          <AppSegmentedControl
            segments={dateSegments}
            selectedIndex={dateRangeIndex}
            onChange={(idx) => {
              setDateRangeIndex(idx)
              void fetchForecast({ days: idx === 1 ? 7 : 1, supplyType: supplyTypeFilter })
            }}
          />

          {/* Supply type filter buttons */}
          {supplyTypeOptions.length > 0 ? (
            <View>
              <AppText variant="caption" color={colors.textSecondary} style={styles.controlLabel}>
                {t('dashboard.filter_supply_type')}
              </AppText>
              <AppSegmentedControl
                segments={[t('dashboard.filter_all'), ...supplyTypeOptions]}
                selectedIndex={supplyTypeFilter === null ? 0 : supplyTypeOptions.indexOf(supplyTypeFilter) + 1}
                onChange={(idx) => {
                  const filter = idx === 0 ? null : supplyTypeOptions[idx - 1] ?? null
                  setSupplyTypeFilter(filter)
                  void fetchForecast({ days, supplyType: filter })
                }}
              />
            </View>
          ) : null}

          {/* View mode: By List | Aggregated */}
          <AppSegmentedControl
            segments={viewSegments}
            selectedIndex={viewModeIndex}
            onChange={(idx) => setViewModeIndex(idx)}
          />
        </View>

        {/* Content — By List or Aggregated */}
        {viewModeIndex === 0 ? (
          <ForecastByListView rows={forecast?.byList ?? []} />
        ) : (
          <ForecastAggregatedView groups={aggregateGroups} showDailyAvg={days === 7} />
        )}

        {/* 7-day summary card */}
        {days === 7 && forecast?.next7Days ? (
          <AppCard style={styles.summaryCard} testID="7day-summary-card">
            <AppText variant="body" weight="semibold" color={colors.textPrimary}>
              {t('dashboard.next_7_days')}
            </AppText>
            {Object.entries(forecast.next7Days).map(([type, v]) => (
              <View key={type} style={styles.summaryRow}>
                <AppText variant="body" color={colors.textPrimary}>
                  {type.charAt(0).toUpperCase() + type.slice(1)}
                </AppText>
                <AppText variant="body" weight="semibold" color={colors.primary}>
                  {v.totalQuantity} {v.unit}{' '}
                  <AppText variant="caption" color={colors.textSecondary}>
                    ({t('dashboard.daily_avg')}: {v.dailyAverage})
                  </AppText>
                </AppText>
              </View>
            ))}
          </AppCard>
        ) : null}
      </ScrollView>
    </SafeAreaView>
  )
}

export default function SupplyForecastScreen() {
  return (
    <ScreenErrorBoundary>
      <SupplyForecastContent />
    </ScreenErrorBoundary>
  )
}

SupplyForecastScreen.displayName = 'SupplyForecastScreen'
