/**
 * ReminderTimelineItem (US-012, T-10)
 * One reminder history row: date, amount, via, status, response.
 */

import React from 'react'
import { View, StyleSheet } from 'react-native'
import { AppText } from '@components/primitives/AppText'
import { AppBadge } from '@components/primitives/AppBadge'
import { formatCurrency } from '@utils/formatCurrency'
import { useTranslation } from '@hooks/useTranslation'
import { colors, spacing } from '@constants/tokens'
import type { ReminderHistoryItem, ReminderStatus } from '../../../types/credit'

export interface ReminderTimelineItemProps {
  item: ReminderHistoryItem
  testID?: string
}

function statusVariant(status: ReminderStatus): 'success' | 'error' | 'gray' {
  if (status === 'delivered') return 'success'
  if (status === 'failed') return 'error'
  return 'gray'
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    paddingVertical: spacing[3],
    borderBottomWidth: 1,
    borderBottomColor: colors.gray100,
    gap: spacing[3],
    alignItems: 'flex-start',
  },
  indicator: {
    width: 10,
    height: 10,
    borderRadius: 5,
    marginTop: spacing[1],
    flexShrink: 0,
  },
  content: { flex: 1 },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing[1] },
  metaRow: { flexDirection: 'row', gap: spacing[3], marginTop: spacing[1] },
})

function indicatorColor(status: ReminderStatus): string {
  if (status === 'delivered') return colors.success
  if (status === 'failed') return colors.error
  return colors.primary
}

export const ReminderTimelineItem = React.memo<ReminderTimelineItemProps>(({ item, testID }) => {
  const { t } = useTranslation()

  return (
    <View style={styles.container} testID={testID ?? `reminder-item-${item.id}`}>
      <View style={[styles.indicator, { backgroundColor: indicatorColor(item.status) }]} />
      <View style={styles.content}>
        <View style={styles.row}>
          <AppText variant="body" color={colors.textPrimary}>
            {item.reminderDate}
          </AppText>
          <AppBadge
            label={t(`credit.reminder_status_${item.status}`)}
            variant={statusVariant(item.status)}
          />
        </View>
        <View style={styles.metaRow}>
          <AppText variant="caption" color={colors.textSecondary}>
            {t('credit.amount_due_label')}: {formatCurrency(item.amountDue)}
          </AppText>
          <AppText variant="caption" color={colors.textSecondary}>
            {t('credit.sent_via_label')}: {item.sentVia}
          </AppText>
        </View>
        {item.responseType ? (
          <AppText variant="caption" color={colors.success} style={{ marginTop: spacing[1] }}>
            {t(`credit.response_${item.responseType}`, {
              amount: item.responseAmount != null ? formatCurrency(item.responseAmount) : '',
            })}
          </AppText>
        ) : null}
      </View>
    </View>
  )
})

ReminderTimelineItem.displayName = 'ReminderTimelineItem'
export default ReminderTimelineItem
