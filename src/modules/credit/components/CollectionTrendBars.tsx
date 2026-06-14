/**
 * CollectionTrendBars (US-012, T-11)
 * 6-month collection trend as vertical percentage bars — pure View (no chart lib).
 */

import React from 'react'
import { View, StyleSheet } from 'react-native'
import { AppCard } from '@components/primitives/AppCard'
import { AppText } from '@components/primitives/AppText'
import { useTranslation } from '@hooks/useTranslation'
import { colors, spacing, borderRadius } from '@constants/tokens'
import type { CollectionTrendPoint } from '../../../types/credit'

export interface CollectionTrendBarsProps {
  trend: CollectionTrendPoint[]
  testID?: string
}

const BAR_MAX_HEIGHT = 80

const styles = StyleSheet.create({
  card: { padding: spacing[4], marginBottom: spacing[3] },
  title: { marginBottom: spacing[3] },
  bars: { flexDirection: 'row', alignItems: 'flex-end', gap: spacing[2], height: BAR_MAX_HEIGHT + 28 },
  barCol: { flex: 1, alignItems: 'center', justifyContent: 'flex-end' },
  barTrack: { width: '100%', backgroundColor: colors.gray100, borderRadius: borderRadius.sm, overflow: 'hidden', justifyContent: 'flex-end' },
  barFill: { width: '100%', backgroundColor: colors.primary, borderRadius: borderRadius.sm },
  label: { marginTop: spacing[1], textAlign: 'center' },
  pctLabel: { textAlign: 'center', marginBottom: 2 },
})

export const CollectionTrendBars = React.memo<CollectionTrendBarsProps>(({ trend, testID }) => {
  const { t } = useTranslation()

  return (
    <AppCard style={styles.card} testID={testID ?? 'collection-trend-bars'}>
      <AppText variant="body" weight="semibold" color={colors.textPrimary} style={styles.title}>
        {t('credit.collection_trend_title')}
      </AppText>
      <View style={styles.bars}>
        {trend.map((point) => {
          const barHeight = (point.percentage / 100) * BAR_MAX_HEIGHT
          const monthLabel = point.month.slice(5) // MM portion
          return (
            <View key={point.month} style={styles.barCol}>
              <AppText variant="caption" color={colors.textSecondary} style={styles.pctLabel}>
                {point.percentage}%
              </AppText>
              <View style={[styles.barTrack, { height: BAR_MAX_HEIGHT }]}>
                <View style={[styles.barFill, { height: barHeight }]} />
              </View>
              <AppText variant="caption" color={colors.textSecondary} style={styles.label}>
                {monthLabel}
              </AppText>
            </View>
          )
        })}
      </View>
    </AppCard>
  )
})

CollectionTrendBars.displayName = 'CollectionTrendBars'
export default CollectionTrendBars
