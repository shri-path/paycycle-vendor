/**
 * MonthProgressCard (US-012, T-07)
 * Dashboard card: billed/collected, progress bar, target/gap.
 */

import React from 'react'
import { View, StyleSheet } from 'react-native'
import { AppCard } from '@components/primitives/AppCard'
import { AppText } from '@components/primitives/AppText'
import { AppProgressBar } from '@components/composite/AppProgressBar'
import { formatCurrency } from '@utils/formatCurrency'
import { useTranslation } from '@hooks/useTranslation'
import { colors, spacing } from '@constants/tokens'
import type { MonthProgressDto } from '../../../types/credit'

export interface MonthProgressCardProps {
  progress: MonthProgressDto
  testID?: string
}

const styles = StyleSheet.create({
  card: { padding: spacing[4], marginBottom: spacing[3] },
  title: { marginBottom: spacing[3] },
  row: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: spacing[1] },
  progressLabel: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: spacing[2] },
  metaRow: { flexDirection: 'row', justifyContent: 'space-between', marginTop: spacing[2] },
  metaItem: { alignItems: 'center' },
})

export const MonthProgressCard = React.memo<MonthProgressCardProps>(
  ({ progress, testID }) => {
    const { t } = useTranslation()
    const variant = progress.percentage >= 90 ? 'success' : progress.percentage >= 60 ? 'default' : 'warning'

    return (
      <AppCard style={styles.card} testID={testID ?? 'month-progress-card'}>
        <AppText variant="body" weight="semibold" color={colors.textPrimary} style={styles.title}>
          {t('credit.month_progress_title')}
        </AppText>

        <View style={styles.progressLabel}>
          <AppText variant="body" color={colors.textSecondary}>{t('credit.collected')}</AppText>
          <AppText variant="body" weight="semibold" color={colors.textPrimary}>
            {formatCurrency(progress.collected)} / {formatCurrency(progress.totalBilled)}
          </AppText>
        </View>

        <AppProgressBar
          value={progress.percentage}
          max={100}
          variant={variant}
          animated
        />

        <View style={styles.metaRow}>
          <View style={styles.metaItem}>
            <AppText variant="caption" color={colors.textSecondary}>{t('credit.target')}</AppText>
            <AppText variant="body" weight="semibold" color={colors.textPrimary}>
              {formatCurrency(progress.target)}
            </AppText>
          </View>
          <View style={styles.metaItem}>
            <AppText variant="caption" color={colors.textSecondary}>{t('credit.gap')}</AppText>
            <AppText variant="body" weight="semibold" color={progress.gap > 0 ? colors.error : colors.success}>
              {formatCurrency(progress.gap)}
            </AppText>
          </View>
          <View style={styles.metaItem}>
            <AppText variant="caption" color={colors.textSecondary}>{t('credit.collection_pct')}</AppText>
            <AppText variant="body" weight="semibold" color={colors.textPrimary}>
              {progress.percentage}%
            </AppText>
          </View>
        </View>
      </AppCard>
    )
  },
)

MonthProgressCard.displayName = 'MonthProgressCard'
export default MonthProgressCard
