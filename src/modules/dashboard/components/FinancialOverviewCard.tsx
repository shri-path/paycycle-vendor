/**
 * FinancialOverviewCard (US-010)
 * Purpose: Shows monthly revenue summary with collected/pending amounts and a
 * color-coded collection progress bar.
 *
 * Color rule (useMemo in caller, passed as variant):
 *   collectionPercentage >= 80 → success
 *   collectionPercentage >= 60 → warning
 *   else                       → error
 */

import React, { useMemo } from 'react'
import { View, StyleSheet } from 'react-native'
import { AppCard } from '@components/primitives/AppCard'
import { AppText } from '@components/primitives/AppText'
import { AppProgressBar, type ProgressVariant } from '@components/composite/AppProgressBar'
import { formatCurrency } from '@utils/formatCurrency'
import { useTranslation } from '@hooks/useTranslation'
import { colors, spacing } from '@constants/tokens'

export interface FinancialOverviewCardProps {
  month: string              // e.g. "April 2026"
  totalRevenue: number
  collected: number
  pending: number
  collectionPercentage: number
}

const styles = StyleSheet.create({
  card: { padding: spacing[4], marginBottom: spacing[3] },
  monthLabel: { marginBottom: spacing[2] },
  revenueAmount: { marginBottom: spacing[1] },
  revenueLabel: { marginBottom: spacing[3] },
  row: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: spacing[3] },
  col: { flex: 1 },
  colRight: { flex: 1, alignItems: 'flex-end' },
  pctRow: { flexDirection: 'row', justifyContent: 'flex-end', marginTop: -spacing[2] },
})

export const FinancialOverviewCard: React.FC<FinancialOverviewCardProps> = ({
  month,
  totalRevenue,
  collected,
  pending,
  collectionPercentage,
}) => {
  const { t } = useTranslation()

  const progressVariant = useMemo((): ProgressVariant => {
    if (collectionPercentage >= 80) return 'success'
    if (collectionPercentage >= 60) return 'warning'
    return 'error'
  }, [collectionPercentage])

  return (
    <AppCard style={styles.card} testID="financial-overview-card">
      <AppText variant="caption" color={colors.textSecondary} style={styles.monthLabel}>
        {month}
      </AppText>

      <AppText variant="h2" weight="bold" color={colors.textPrimary} style={styles.revenueAmount}>
        {formatCurrency(totalRevenue)}
      </AppText>
      <AppText variant="caption" color={colors.textSecondary} style={styles.revenueLabel}>
        {t('dashboard.total_revenue')}
      </AppText>

      <View style={styles.row}>
        <View style={styles.col}>
          <AppText variant="caption" color={colors.textSecondary}>{t('dashboard.collected')}</AppText>
          <AppText variant="body" weight="semibold" color={colors.success}>
            {formatCurrency(collected)}
          </AppText>
        </View>
        <View style={styles.colRight}>
          <AppText variant="caption" color={colors.textSecondary}>{t('dashboard.pending')}</AppText>
          <AppText variant="body" weight="semibold" color={colors.warning}>
            {formatCurrency(pending)}
          </AppText>
        </View>
      </View>

      <AppProgressBar
        value={collectionPercentage}
        max={100}
        variant={progressVariant}
        animated
      />
      <View style={styles.pctRow}>
        <AppText variant="caption" color={colors.textSecondary}>
          {t('dashboard.collection_pct', { pct: collectionPercentage })}
        </AppText>
      </View>
    </AppCard>
  )
}

export default FinancialOverviewCard
