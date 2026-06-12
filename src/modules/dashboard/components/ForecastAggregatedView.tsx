/**
 * ForecastAggregatedView (US-010)
 * Purpose: Supply forecast grouped by supply type. Shows total qty per type.
 * Daily average is shown only when `showDailyAvg` is true (i.e. 7-day range).
 */

import React from 'react'
import { View, StyleSheet } from 'react-native'
import { AppCard } from '@components/primitives/AppCard'
import { AppText } from '@components/primitives/AppText'
import { AppEmptyState } from '@components/composite/AppEmptyState'
import { useTranslation } from '@hooks/useTranslation'
import { colors, spacing } from '@constants/tokens'
import type { ForecastAggregateGroup } from '../../../types/dashboard'

export interface ForecastAggregatedViewProps {
  groups: ForecastAggregateGroup[]
  showDailyAvg: boolean
}

const styles = StyleSheet.create({
  card: { marginBottom: spacing[3] },
  group: {
    paddingVertical: spacing[3],
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.gray200,
  },
  lastGroup: { borderBottomWidth: 0 },
  groupHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: spacing[1] },
  lists: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing[1] },
  listTag: {
    backgroundColor: colors.gray100,
    paddingHorizontal: spacing[2],
    paddingVertical: spacing[0],
    borderRadius: 4,
  },
})

export const ForecastAggregatedView: React.FC<ForecastAggregatedViewProps> = ({
  groups,
  showDailyAvg,
}) => {
  const { t } = useTranslation()

  if (groups.length === 0) {
    return <AppEmptyState title={t('dashboard.no_lists_today')} description="" />
  }

  return (
    <AppCard style={styles.card} testID="forecast-aggregated-view">
      {groups.map((group, idx) => (
        <View
          key={group.supplyType}
          style={[styles.group, idx === groups.length - 1 && styles.lastGroup]}
          testID={`forecast-group-${group.supplyType}`}
        >
          <View style={styles.groupHeader}>
            <AppText variant="body" weight="semibold" color={colors.textPrimary}>
              {group.supplyType.charAt(0).toUpperCase() + group.supplyType.slice(1)}
            </AppText>
            <AppText variant="body" weight="semibold" color={colors.primary}>
              {group.totalQuantity} {group.unit}
            </AppText>
          </View>

          {showDailyAvg && group.dailyAverage !== undefined ? (
            <AppText variant="caption" color={colors.textSecondary}>
              {t('dashboard.daily_avg')}: {group.dailyAverage} {group.unit}
            </AppText>
          ) : null}

          <View style={styles.lists}>
            {group.lists.map((listName) => (
              <View key={listName} style={styles.listTag}>
                <AppText variant="caption" color={colors.textSecondary}>{listName}</AppText>
              </View>
            ))}
          </View>
        </View>
      ))}
    </AppCard>
  )
}

export default ForecastAggregatedView
