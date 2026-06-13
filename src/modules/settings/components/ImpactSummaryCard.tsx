/**
 * ImpactSummaryCard (US-011)
 * Purpose: Shared summary card for S3 (bulk leave) and S4 (bulk rate adjust).
 *
 * Variants:
 * - 'leave': shows customersAffected / days / totalLeaves / revenueImpact (negative, red)
 * - 'rate':  shows listsAffected / customersAffected / rateChange / monthlyImpact (positive, green)
 *
 * Revenue/monthly impact is always formatted as ₹ with +/- sign prefix.
 */

import React from 'react'
import { View, StyleSheet } from 'react-native'
import { AppCard } from '@components/primitives/AppCard'
import { AppText } from '@components/primitives/AppText'
import { useTranslation } from '@hooks/useTranslation'
import { colors, spacing } from '@constants/tokens'
import type { BulkLeaveImpactDto, BulkRateImpactDto } from '../../../types/settings'

export type ImpactVariant = 'leave' | 'rate'

export interface ImpactSummaryCardProps {
  variant: ImpactVariant
  leaveImpact?: BulkLeaveImpactDto
  rateImpact?: BulkRateImpactDto
  isLoading?: boolean
}

const styles = StyleSheet.create({
  card: {
    padding: spacing[4],
    marginBottom: spacing[3],
  },
  title: {
    marginBottom: spacing[3],
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing[3],
  },
  item: {
    flex: 1,
    minWidth: '40%',
  },
  label: {
    marginBottom: spacing[1],
  },
  loadingText: {
    color: colors.textSecondary,
  },
})

function formatCurrency(amount: number): string {
  const abs = Math.abs(amount)
  const sign = amount < 0 ? '-' : '+'
  return `${sign}₹${abs.toLocaleString('en-IN')}`
}

export const ImpactSummaryCard: React.FC<ImpactSummaryCardProps> = ({
  variant,
  leaveImpact,
  rateImpact,
  isLoading = false,
}) => {
  const { t } = useTranslation()

  if (isLoading) {
    return (
      <AppCard style={styles.card} testID="impact-summary-loading">
        <AppText variant="body" style={styles.loadingText}>
          {t('common.loading')}
        </AppText>
      </AppCard>
    )
  }

  if (variant === 'leave' && leaveImpact) {
    const revenueColor = leaveImpact.revenueImpact < 0 ? colors.error : colors.textPrimary
    return (
      <AppCard style={styles.card} testID="impact-summary-leave">
        <AppText variant="label" weight="semibold" style={styles.title}>
          {t('settings.impact_title')}
        </AppText>
        <View style={styles.grid}>
          <View style={styles.item}>
            <AppText variant="caption" color={colors.textSecondary} style={styles.label}>
              {t('settings.impact_customers_affected')}
            </AppText>
            <AppText variant="body" weight="semibold">
              {leaveImpact.customersAffected}
            </AppText>
          </View>
          <View style={styles.item}>
            <AppText variant="caption" color={colors.textSecondary} style={styles.label}>
              {t('settings.impact_days')}
            </AppText>
            <AppText variant="body" weight="semibold">
              {leaveImpact.days}
            </AppText>
          </View>
          <View style={styles.item}>
            <AppText variant="caption" color={colors.textSecondary} style={styles.label}>
              {t('settings.impact_total_leaves')}
            </AppText>
            <AppText variant="body" weight="semibold">
              {leaveImpact.totalLeaves}
            </AppText>
          </View>
          <View style={styles.item}>
            <AppText variant="caption" color={colors.textSecondary} style={styles.label}>
              {t('settings.impact_revenue')}
            </AppText>
            <AppText variant="body" weight="semibold" color={revenueColor}>
              {formatCurrency(leaveImpact.revenueImpact)}
            </AppText>
          </View>
        </View>
      </AppCard>
    )
  }

  if (variant === 'rate' && rateImpact) {
    const impactColor = rateImpact.monthlyImpact >= 0 ? colors.success : colors.error
    return (
      <AppCard style={styles.card} testID="impact-summary-rate">
        <AppText variant="label" weight="semibold" style={styles.title}>
          {t('settings.impact_title')}
        </AppText>
        <View style={styles.grid}>
          <View style={styles.item}>
            <AppText variant="caption" color={colors.textSecondary} style={styles.label}>
              {t('settings.impact_lists_affected')}
            </AppText>
            <AppText variant="body" weight="semibold">
              {rateImpact.listsAffected}
            </AppText>
          </View>
          <View style={styles.item}>
            <AppText variant="caption" color={colors.textSecondary} style={styles.label}>
              {t('settings.impact_customers_affected')}
            </AppText>
            <AppText variant="body" weight="semibold">
              {rateImpact.customersAffected}
            </AppText>
          </View>
          <View style={styles.item}>
            <AppText variant="caption" color={colors.textSecondary} style={styles.label}>
              {t('settings.impact_rate_change')}
            </AppText>
            <AppText variant="body" weight="semibold">
              {formatCurrency(rateImpact.rateChange)}
            </AppText>
          </View>
          <View style={styles.item}>
            <AppText variant="caption" color={colors.textSecondary} style={styles.label}>
              {t('settings.impact_monthly')}
            </AppText>
            <AppText variant="body" weight="semibold" color={impactColor}>
              {formatCurrency(rateImpact.monthlyImpact)}
            </AppText>
          </View>
        </View>
      </AppCard>
    )
  }

  return null
}

export default ImpactSummaryCard
