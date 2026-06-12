/**
 * DeliveryCustomerCard — composite. Purpose: a PENDING delivery row showing the
 * customer (avatar initials + name + address) and quantity, with Delivered / Leave
 * action buttons. Money (rate/amount) renders only when `showMoney` is true
 * (owner). Presentational — all data + callbacks via props; no store/API access.
 * Usage:
 *   <DeliveryCustomerCard delivery={d} showMoney={isOwner} disabled={offline}
 *     onMarkDelivered={onDelivered} onMarkLeave={onLeave} />
 */

import React from 'react'
import { View, StyleSheet } from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { AppCard } from '@components/primitives/AppCard'
import { AppText } from '@components/primitives/AppText'
import { AppAvatar } from '@components/primitives/AppAvatar'
import { AppButton } from '@components/primitives/AppButton'
import { useTranslation } from '@hooks/useTranslation'
import { formatCurrency } from '@utils/formatCurrency'
import { colors, spacing, componentSizes } from '@constants/tokens'
import type { DeliveryDto } from '../../../types/delivery'
import { initialsFromName } from './deliveryStatus'

export interface DeliveryCustomerCardProps {
  /** The pending delivery to render. */
  delivery: DeliveryDto
  /** Owner-only: show rate/amount. Never true on staff screens. */
  showMoney: boolean
  /** Disable both action buttons (e.g. offline or no permission). */
  disabled: boolean
  /** Mark this delivery DELIVERED. */
  onMarkDelivered: (id: string) => void
  /** Mark this delivery LEAVE. */
  onMarkLeave: (id: string) => void
  testID?: string
}

const styles = StyleSheet.create({
  card: {
    marginHorizontal: spacing[4],
    marginBottom: spacing[2],
    padding: spacing[3],
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[3],
  },
  info: {
    flex: 1,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[2],
    marginTop: spacing[1],
  },
  conflictRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[1],
    marginTop: spacing[2],
  },
  actions: {
    flexDirection: 'row',
    gap: spacing[2],
    marginTop: spacing[3],
  },
  actionBtn: {
    flex: 1,
  },
})

const DeliveryCustomerCardComponent: React.FC<DeliveryCustomerCardProps> = ({
  delivery,
  showMoney,
  disabled,
  onMarkDelivered,
  onMarkLeave,
  testID,
}) => {
  const { t } = useTranslation()
  const { customer, quantity, unit, amount, hasConflict, conflictReason } = delivery

  return (
    <AppCard variant="elevated" style={styles.card} testID={testID}>
      <View style={styles.topRow}>
        <AppAvatar initials={initialsFromName(customer.name)} size="md" />
        <View style={styles.info}>
          <AppText variant="body" weight="semibold" numberOfLines={1}>
            {customer.name ?? t('common.you')}
          </AppText>
          {customer.address ? (
            <AppText variant="caption" color={colors.textSecondary} numberOfLines={2}>
              {customer.address}
            </AppText>
          ) : null}
          <View style={styles.metaRow}>
            <AppText variant="caption" color={colors.textSecondary}>
              {quantity} {unit}
            </AppText>
            {showMoney && amount != null ? (
              <AppText variant="caption" color={colors.textSecondary}>
                · {formatCurrency(amount)}
              </AppText>
            ) : null}
          </View>
        </View>
      </View>

      {hasConflict ? (
        <View style={styles.conflictRow}>
          <Ionicons
            name="warning"
            size={componentSizes.icon.sm}
            color={colors.warning}
            importantForAccessibility="no"
          />
          <AppText variant="caption" color={colors.warning} numberOfLines={2}>
            {conflictReason
              ? t('delivery.conflict_reason', { reason: conflictReason })
              : t('delivery.error_conflict')}
          </AppText>
        </View>
      ) : null}

      <View style={styles.actions}>
        <AppButton
          label={t('delivery.mark_delivered')}
          variant="primary"
          size="sm"
          disabled={disabled}
          onPress={() => onMarkDelivered(delivery.id)}
          style={styles.actionBtn}
          testID={testID ? `${testID}-delivered` : undefined}
        />
        <AppButton
          label={t('delivery.mark_leave')}
          variant="secondary"
          size="sm"
          disabled={disabled}
          onPress={() => onMarkLeave(delivery.id)}
          style={styles.actionBtn}
          testID={testID ? `${testID}-leave` : undefined}
        />
      </View>
    </AppCard>
  )
}

export const DeliveryCustomerCard = React.memo(DeliveryCustomerCardComponent)
DeliveryCustomerCard.displayName = 'DeliveryCustomerCard'

export default DeliveryCustomerCard
