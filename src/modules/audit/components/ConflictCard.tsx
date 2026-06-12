/**
 * ConflictCard — one delivery-action conflict (US-007).
 * Shows the delivery date, customer/supply-list, the staff mark vs. the owner/customer
 * override, and the time difference between them. Pure + memoized; null-guards the
 * optional customer/supplyList refs.
 */

import React, { memo } from 'react'
import { View, StyleSheet } from 'react-native'
import { AppText } from '@components/primitives/AppText'
import { AppCard } from '@components/primitives/AppCard'
import { AppBadge } from '@components/primitives/AppBadge'
import { useTranslation } from '@hooks/useTranslation'
import { colors, spacing } from '@constants/tokens'
import { formatLocaleDate } from '@utils/formatDate'
import type { ConflictDto } from '../../../types/audit'

export interface ConflictCardProps {
  conflict: ConflictDto
  testID?: string
}

/** Maps an override `by` value to a localized label. */
function overrideByLabel(by: string, t: (k: string) => string): string {
  switch (by) {
    case 'owner':
      return t('audit.by_owner')
    case 'customer':
      return t('audit.by_customer')
    case 'staff':
      return t('audit.by_staff')
    default:
      return by
  }
}

const styles = StyleSheet.create({
  card: { marginBottom: spacing[2], borderLeftWidth: 4, borderLeftColor: colors.warning },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing[1],
  },
  body: { gap: spacing[1], marginTop: spacing[1] },
  diffRow: { marginTop: spacing[2] },
})

function ConflictCardComponent({ conflict, testID }: ConflictCardProps) {
  const { t } = useTranslation()
  const { staffAction, overrideAction } = conflict
  const byLabel = overrideByLabel(overrideAction.by, t)

  return (
    <AppCard variant="default" style={styles.card} testID={testID}>
      <View style={styles.headerRow}>
        <AppText variant="caption" color={colors.textSecondary}>
          {t('audit.conflict_delivery_date', {
            date: formatLocaleDate(conflict.deliveryDate),
          })}
        </AppText>
        <AppBadge label={t('audit.conflict_badge')} variant="warning" size="sm" />
      </View>

      {conflict.customer ? (
        <AppText variant="body" weight="semibold">
          {conflict.customer.name}
          {conflict.supplyList ? ` · ${conflict.supplyList.name}` : ''}
        </AppText>
      ) : conflict.supplyList ? (
        <AppText variant="body" weight="semibold">
          {conflict.supplyList.name}
        </AppText>
      ) : null}

      <View style={styles.body}>
        <AppText variant="caption" color={colors.textSecondary}>
          {t('audit.conflict_staff_marked', {
            name: staffAction.staff.name,
            status: staffAction.status,
          })}
        </AppText>
        <AppText variant="caption" color={colors.warning}>
          {t('audit.conflict_override', {
            by: byLabel,
            status: overrideAction.status,
          })}
        </AppText>
      </View>

      <AppText variant="caption" color={colors.textSecondary} style={styles.diffRow}>
        {t('audit.conflict_time_diff', {
          count: Math.round(overrideAction.timeDiffMinutes),
        })}
      </AppText>
    </AppCard>
  )
}

export const ConflictCard = memo(ConflictCardComponent)
ConflictCard.displayName = 'ConflictCard'

export default ConflictCard
