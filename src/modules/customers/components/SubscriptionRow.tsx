/**
 * SubscriptionRow — customer module composite (US-008).
 * Purpose: Renders one supply-list subscription entry. Shows list name, start time,
 * quantity/rate/unit, frequency, custom-rate/qty badges. Owner-only [Remove] action.
 * [Edit Qty/Rate] is rendered disabled per OQ-4 (no PATCH-subscription endpoint this iteration).
 *
 * Presentational — receives `sub`, `onRemove`, `canManage` via props; no store/API access.
 */

import React, { useCallback } from 'react'
import { View, StyleSheet } from 'react-native'
import { AppCard } from '@components/primitives/AppCard'
import { AppText } from '@components/primitives/AppText'
import { AppBadge } from '@components/primitives/AppBadge'
import { AppButton } from '@components/primitives/AppButton'
import { useTranslation } from '@hooks/useTranslation'
import { colors, spacing } from '@constants/tokens'
import type { SubscriptionDto } from '../../../types/customer'

export interface SubscriptionRowProps {
  /** Subscription data. */
  sub: SubscriptionDto
  /** Called with subscriptionId when [Remove] is pressed. Owner-only. */
  onRemove: (subscriptionId: string) => void
  /** True for owner; false for staff. Controls Remove button visibility. */
  canManage: boolean
  /** Test ID. */
  testID?: string
}

const styles = StyleSheet.create({
  card: {
    gap: spacing[2],
    marginBottom: spacing[2],
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing[2],
  },
  badges: {
    flexDirection: 'row',
    gap: spacing[1],
    flexWrap: 'wrap',
    marginTop: spacing[1],
  },
  actions: {
    flexDirection: 'row',
    gap: spacing[2],
    marginTop: spacing[1],
  },
  actionBtn: {
    flex: 1,
  },
})

export const SubscriptionRow: React.FC<SubscriptionRowProps> = ({
  sub,
  onRemove,
  canManage,
  testID,
}) => {
  const { t } = useTranslation()

  const handleRemove = useCallback(() => {
    onRemove(sub.subscriptionId)
  }, [onRemove, sub.subscriptionId])

  const rateLabel = `${sub.quantity} ${sub.unit} @ Rs.${sub.ratePerUnit}/${sub.unit}`

  return (
    <AppCard variant="default" style={styles.card} testID={testID}>
      <View style={styles.headerRow}>
        <AppText variant="body" weight="semibold" numberOfLines={1} style={{ flex: 1 }}>
          {sub.listName}
        </AppText>
        <AppText variant="caption" color={colors.textSecondary}>
          {sub.startTime}
        </AppText>
      </View>

      <AppText variant="caption" color={colors.textSecondary}>
        {rateLabel}
      </AppText>

      <AppText variant="caption" color={colors.textSecondary}>
        {sub.frequency}
      </AppText>

      {/* Custom rate / qty badges */}
      {(sub.isCustomRate || sub.isCustomQuantity) ? (
        <View style={styles.badges}>
          {sub.isCustomRate ? (
            <AppBadge
              label={t('customer.custom_rate')}
              variant="primary"
              size="sm"
            />
          ) : null}
          {sub.isCustomQuantity ? (
            <AppBadge
              label={t('customer.custom_quantity')}
              variant="primary"
              size="sm"
            />
          ) : null}
        </View>
      ) : null}

      {/* Owner-only actions */}
      {canManage ? (
        <View style={styles.actions}>
          <AppButton
            label={t('customer.remove_subscription')}
            variant="danger"
            size="sm"
            onPress={handleRemove}
            style={styles.actionBtn}
            testID={testID ? `${testID}-remove` : undefined}
          />
          {/* Edit Qty/Rate deferred — OQ-4: no PATCH-subscription endpoint this iteration */}
          <AppButton
            label={t('customer.edit_qty_rate')}
            variant="ghost"
            size="sm"
            disabled
            onPress={() => { /* deferred */ }}
            style={styles.actionBtn}
            testID={testID ? `${testID}-edit` : undefined}
          />
        </View>
      ) : null}
    </AppCard>
  )
}

SubscriptionRow.displayName = 'SubscriptionRow'

export default SubscriptionRow
