/**
 * OutstandingOverviewCard (US-012, T-07)
 * Dashboard card: total outstanding + three aging bucket rows with colour dots.
 */

import React from 'react'
import { View, StyleSheet } from 'react-native'
import { AppCard } from '@components/primitives/AppCard'
import { AppText } from '@components/primitives/AppText'
import { formatCurrency } from '@utils/formatCurrency'
import { useTranslation } from '@hooks/useTranslation'
import { colors, spacing } from '@constants/tokens'
import type { OutstandingOverviewDto } from '../../../types/credit'

export interface OutstandingOverviewCardProps {
  overview: OutstandingOverviewDto
  testID?: string
}

const styles = StyleSheet.create({
  card: { padding: spacing[4], marginBottom: spacing[3] },
  totalRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing[3] },
  bucketRow: { flexDirection: 'row', alignItems: 'center', marginBottom: spacing[2], gap: spacing[2] },
  dot: { width: 10, height: 10, borderRadius: 5 },
  rowLabel: { flex: 1 },
})

export const OutstandingOverviewCard = React.memo<OutstandingOverviewCardProps>(
  ({ overview, testID }) => {
    const { t } = useTranslation()

    return (
      <AppCard style={styles.card} testID={testID ?? 'outstanding-overview-card'}>
        {/* Total header */}
        <View style={styles.totalRow}>
          <AppText variant="body" color={colors.textSecondary}>
            {t('credit.total_outstanding')}
          </AppText>
          <AppText variant="h2" weight="bold" color={colors.error}>
            {formatCurrency(overview.totalOutstanding)}
          </AppText>
        </View>

        {/* 0–30 days — green */}
        <View style={styles.bucketRow}>
          <View style={[styles.dot, { backgroundColor: colors.success }]} />
          <AppText variant="body" color={colors.textPrimary} style={styles.rowLabel}>
            {t('credit.aging_0_30')}
          </AppText>
          <AppText variant="body" weight="semibold" color={colors.success}>
            {formatCurrency(overview.fresh_0_30.amount)}{' '}
            <AppText variant="caption" color={colors.textSecondary}>
              ({overview.fresh_0_30.customerCount})
            </AppText>
          </AppText>
        </View>

        {/* 30–60 days — warning */}
        <View style={styles.bucketRow}>
          <View style={[styles.dot, { backgroundColor: colors.warning }]} />
          <AppText variant="body" color={colors.textPrimary} style={styles.rowLabel}>
            {t('credit.aging_30_60')}
          </AppText>
          <AppText variant="body" weight="semibold" color={colors.warning}>
            {formatCurrency(overview.overdue_30_60.amount)}{' '}
            <AppText variant="caption" color={colors.textSecondary}>
              ({overview.overdue_30_60.customerCount})
            </AppText>
          </AppText>
        </View>

        {/* 60+ days — error */}
        <View style={styles.bucketRow}>
          <View style={[styles.dot, { backgroundColor: colors.error }]} />
          <AppText variant="body" color={colors.textPrimary} style={styles.rowLabel}>
            {t('credit.aging_60_plus')}
          </AppText>
          <AppText variant="body" weight="semibold" color={colors.error}>
            {formatCurrency(overview.critical_60_plus.amount)}{' '}
            <AppText variant="caption" color={colors.textSecondary}>
              ({overview.critical_60_plus.customerCount})
            </AppText>
          </AppText>
        </View>
      </AppCard>
    )
  },
)

OutstandingOverviewCard.displayName = 'OutstandingOverviewCard'
export default OutstandingOverviewCard
