/**
 * OutstandingAgingCard (US-010)
 * Purpose: Shows outstanding aging breakdown in three color-coded rows
 * (0–30 green, 30–60 warning, 60+ error). Optional "View Collections" button.
 * Reused on both OwnerDashboardScreen (with button) and CollectionsScreen (without).
 */

import React from 'react'
import { View, StyleSheet } from 'react-native'
import { AppCard } from '@components/primitives/AppCard'
import { AppText } from '@components/primitives/AppText'
import { AppButton } from '@components/primitives/AppButton'
import { formatCurrency } from '@utils/formatCurrency'
import { useTranslation } from '@hooks/useTranslation'
import { colors, spacing } from '@constants/tokens'
import type { OutstandingAgingSummary } from '../../../types/dashboard'

export interface OutstandingAgingCardProps {
  aging: OutstandingAgingSummary
  onViewCollections?: () => void
}

const styles = StyleSheet.create({
  card: { padding: spacing[4], marginBottom: spacing[3] },
  title: { marginBottom: spacing[3] },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing[2],
    gap: spacing[2],
  },
  dot: { width: 10, height: 10, borderRadius: 5 },
  rowText: { flex: 1 },
  button: { marginTop: spacing[2] },
})

export const OutstandingAgingCard: React.FC<OutstandingAgingCardProps> = ({
  aging,
  onViewCollections,
}) => {
  const { t } = useTranslation()

  return (
    <AppCard style={styles.card} testID="outstanding-aging-card">
      <AppText variant="body" weight="semibold" color={colors.textPrimary} style={styles.title}>
        {t('dashboard.outstanding_aging')}
      </AppText>

      {/* 0-30 days — green */}
      <View style={styles.row}>
        <View style={[styles.dot, { backgroundColor: colors.success }]} />
        <AppText variant="body" color={colors.textPrimary} style={styles.rowText}>
          {t('dashboard.aging_0_30')}
        </AppText>
        <AppText variant="body" weight="semibold" color={colors.success}>
          {formatCurrency(aging.fresh_0_30.amount)}{' '}
          <AppText variant="caption" color={colors.textSecondary}>
            ({aging.fresh_0_30.customerCount})
          </AppText>
        </AppText>
      </View>

      {/* 30-60 days — warning */}
      <View style={styles.row}>
        <View style={[styles.dot, { backgroundColor: colors.warning }]} />
        <AppText variant="body" color={colors.textPrimary} style={styles.rowText}>
          {t('dashboard.aging_30_60')}
        </AppText>
        <AppText variant="body" weight="semibold" color={colors.warning}>
          {formatCurrency(aging.overdue_30_60.amount)}{' '}
          <AppText variant="caption" color={colors.textSecondary}>
            ({aging.overdue_30_60.customerCount})
          </AppText>
        </AppText>
      </View>

      {/* 60+ days — error */}
      <View style={styles.row}>
        <View style={[styles.dot, { backgroundColor: colors.error }]} />
        <AppText variant="body" color={colors.textPrimary} style={styles.rowText}>
          {t('dashboard.aging_60_plus')}
        </AppText>
        <AppText variant="body" weight="semibold" color={colors.error}>
          {formatCurrency(aging.critical_60_plus.amount)}{' '}
          <AppText variant="caption" color={colors.textSecondary}>
            ({aging.critical_60_plus.customerCount})
          </AppText>
        </AppText>
      </View>

      {onViewCollections ? (
        <AppButton
          label={t('dashboard.view_collections')}
          onPress={onViewCollections}
          variant="secondary"
          fullWidth
          style={styles.button}
          testID="view-collections-btn"
        />
      ) : null}
    </AppCard>
  )
}

export default OutstandingAgingCard
