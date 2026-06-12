/**
 * StaffSummaryCard — per-staff activity aggregation (US-007).
 * Shows the staff name, headline totals (actions / active days / per-day avg), and a
 * breakdown by action type. Pure + memoized.
 */

import React, { memo } from 'react'
import { View, StyleSheet } from 'react-native'
import { AppText } from '@components/primitives/AppText'
import { AppCard } from '@components/primitives/AppCard'
import { AppBadge } from '@components/primitives/AppBadge'
import { useTranslation } from '@hooks/useTranslation'
import { colors, spacing } from '@constants/tokens'
import type { StaffSummaryDto } from '../../../types/audit'

export interface StaffSummaryCardProps {
  summary: StaffSummaryDto
  testID?: string
}

const styles = StyleSheet.create({
  card: { marginBottom: spacing[2] },
  name: { marginBottom: spacing[2] },
  statsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing[2], marginBottom: spacing[2] },
  section: { marginTop: spacing[1] },
  actionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: spacing[1],
  },
})

function StaffSummaryCardComponent({ summary, testID }: StaffSummaryCardProps) {
  const { t } = useTranslation()

  return (
    <AppCard variant="default" style={styles.card} testID={testID}>
      <AppText variant="body" weight="semibold" style={styles.name}>
        {summary.staffName}
      </AppText>

      <View style={styles.statsRow}>
        <AppBadge
          label={t('audit.summary_total_actions', { count: summary.totalActions })}
          variant="primary"
          size="sm"
        />
        <AppBadge
          label={t('audit.summary_active_days', { count: summary.activeDays })}
          variant="gray"
          size="sm"
        />
        <AppBadge
          label={t('audit.summary_avg_per_day', { count: summary.avgActionsPerDay })}
          variant="gray"
          size="sm"
        />
      </View>

      {summary.byActionType.length > 0 ? (
        <View style={styles.section}>
          <AppText variant="caption" weight="semibold" color={colors.textSecondary}>
            {t('audit.summary_by_action')}
          </AppText>
          {summary.byActionType.map((a) => (
            <View key={a.actionType} style={styles.actionRow}>
              <AppText variant="caption" color={colors.textPrimary}>
                {a.actionLabel}
              </AppText>
              <AppText variant="caption" weight="semibold" color={colors.textSecondary}>
                {t('audit.actions_count', { count: a.count })}
              </AppText>
            </View>
          ))}
        </View>
      ) : null}
    </AppCard>
  )
}

export const StaffSummaryCard = memo(StaffSummaryCardComponent)
StaffSummaryCard.displayName = 'StaffSummaryCard'

export default StaffSummaryCard
