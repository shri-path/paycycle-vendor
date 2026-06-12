/**
 * CompletedDeliveryRow — composite. Purpose: a row for an already-marked delivery
 * (DELIVERED / LEAVE / AUTO_MARKED / CANCELLED), showing the customer, a status
 * badge (icon + text, never colour alone) and who/when it was marked. Money shows
 * only when `showMoney` is true (owner). Presentational; data via props. Usage:
 *   <CompletedDeliveryRow delivery={d} showMoney={isOwner} />
 */

import React from 'react'
import { View, StyleSheet } from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { AppText } from '@components/primitives/AppText'
import { AppAvatar } from '@components/primitives/AppAvatar'
import { useTranslation } from '@hooks/useTranslation'
import { formatCurrency } from '@utils/formatCurrency'
import { colors, spacing, componentSizes } from '@constants/tokens'
import type { DeliveryDto } from '../../../types/delivery'
import { getStatusPresentation, initialsFromName } from './deliveryStatus'

export interface CompletedDeliveryRowProps {
  /** The marked delivery to render. */
  delivery: DeliveryDto
  /** Owner-only: show amount. Never true on staff screens. */
  showMoney: boolean
  testID?: string
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[3],
    paddingVertical: spacing[2],
    paddingHorizontal: spacing[4],
  },
  info: {
    flex: 1,
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[1],
    marginTop: spacing[1],
  },
  trailing: {
    alignItems: 'flex-end',
  },
})

function formatTime(iso: string | null): string {
  if (!iso) return ''
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) return ''
  const hh = String(date.getHours()).padStart(2, '0')
  const mm = String(date.getMinutes()).padStart(2, '0')
  return `${hh}:${mm}`
}

const CompletedDeliveryRowComponent: React.FC<CompletedDeliveryRowProps> = ({
  delivery,
  showMoney,
  testID,
}) => {
  const { t } = useTranslation()
  const { customer, status, markedBy, markedAt, amount } = delivery
  const presentation = getStatusPresentation(status)
  const time = formatTime(markedAt)

  return (
    <View style={styles.row} testID={testID}>
      <AppAvatar initials={initialsFromName(customer.name)} size="md" />
      <View style={styles.info}>
        <AppText variant="body" weight="medium" numberOfLines={1}>
          {customer.name ?? t('common.you')}
        </AppText>
        <View style={styles.statusRow}>
          <Ionicons
            name={presentation.icon}
            size={componentSizes.icon.sm}
            color={presentation.color}
            importantForAccessibility="no"
          />
          <AppText variant="caption" color={presentation.color}>
            {t(presentation.labelKey)}
          </AppText>
          {markedBy ? (
            <AppText variant="caption" color={colors.textSecondary} numberOfLines={1}>
              {' · '}
              {t('delivery.marked_by', {
                name: markedBy.name ?? t(`delivery.marked_by_${markedBy.role}`),
                role: t(`delivery.marked_by_${markedBy.role}`),
              })}
            </AppText>
          ) : null}
        </View>
      </View>
      <View style={styles.trailing}>
        {time ? (
          <AppText variant="caption" color={colors.textSecondary}>
            {t('delivery.marked_at', { time })}
          </AppText>
        ) : null}
        {showMoney && amount != null ? (
          <AppText variant="caption" weight="medium" color={colors.textPrimary}>
            {formatCurrency(amount)}
          </AppText>
        ) : null}
      </View>
    </View>
  )
}

export const CompletedDeliveryRow = React.memo(CompletedDeliveryRowComponent)
CompletedDeliveryRow.displayName = 'CompletedDeliveryRow'

export default CompletedDeliveryRow
