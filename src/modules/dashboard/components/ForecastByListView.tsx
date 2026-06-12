/**
 * ForecastByListView (US-010)
 * Purpose: Supply forecast table — rows grouped by supply list.
 */

import React from 'react'
import { View, StyleSheet } from 'react-native'
import { AppText } from '@components/primitives/AppText'
import { AppCard } from '@components/primitives/AppCard'
import { AppEmptyState } from '@components/composite/AppEmptyState'
import { useTranslation } from '@hooks/useTranslation'
import { colors, spacing } from '@constants/tokens'
import type { ForecastListRow } from '../../../types/dashboard'

export interface ForecastByListViewProps {
  rows: ForecastListRow[]
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    paddingVertical: spacing[2],
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.gray200,
  },
  lastRow: {
    borderBottomWidth: 0,
  },
  card: { marginBottom: spacing[3] },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingBottom: spacing[2],
    marginBottom: spacing[1],
    borderBottomWidth: 1,
    borderBottomColor: colors.gray200,
  },
  left: { flex: 2 },
  right: { flex: 1, alignItems: 'flex-end' },
  leaves: { color: colors.warning },
})

export const ForecastByListView: React.FC<ForecastByListViewProps> = ({ rows }) => {
  const { t } = useTranslation()

  if (rows.length === 0) {
    return <AppEmptyState title={t('dashboard.no_lists_today')} description="" />
  }

  return (
    <AppCard style={styles.card} testID="forecast-by-list-view">
      <View style={styles.header}>
        <AppText variant="caption" weight="semibold" color={colors.textSecondary} style={styles.left}>
          {t('supply.title')}
        </AppText>
        <AppText variant="caption" weight="semibold" color={colors.textSecondary} style={styles.right}>
          {t('dashboard.planned_leaves')}
        </AppText>
      </View>
      {rows.map((row, idx) => (
        <View
          key={row.listId}
          style={[styles.row, idx === rows.length - 1 && styles.lastRow]}
          testID={`forecast-row-${row.listId}`}
        >
          <View style={styles.left}>
            <AppText variant="body" color={colors.textPrimary}>{row.listName}</AppText>
            <AppText variant="caption" color={colors.textSecondary}>
              {row.quantity} {row.unit} ({row.customerCount})
            </AppText>
          </View>
          <View style={styles.right}>
            <AppText
              variant="body"
              weight="semibold"
              style={row.plannedLeaves > 0 ? styles.leaves : undefined}
              color={row.plannedLeaves > 0 ? colors.warning : colors.textSecondary}
            >
              {row.plannedLeaves}
            </AppText>
          </View>
        </View>
      ))}
    </AppCard>
  )
}

export default ForecastByListView
