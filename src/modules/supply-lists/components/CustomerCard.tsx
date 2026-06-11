/**
 * CustomerCard — supply-lists module domain component (US-005).
 * Purpose: One customer subscription row in the Supply-List detail screen. Shows avatar
 * initials, name, masked phone, qty@rate, a "Custom" badge when the customer overrides
 * the list default (icon + text — color is never the only signal), the start date, and
 * the first N other lists with a "+N more" overflow.
 *
 * Presentational + memoized. No store/API access. PII (phone) is shown masked via the
 * shared `maskPhone` helper and is never logged. Tokens only; every string via t().
 * Tap (owner) opens the edit-subscription sheet; omit `onPress` for read-only/staff.
 */

import React, { useCallback } from 'react'
import { View, StyleSheet } from 'react-native'
import * as Haptics from 'expo-haptics'
import { AppCard } from '@components/primitives/AppCard'
import { AppText } from '@components/primitives/AppText'
import { AppAvatar } from '@components/primitives/AppAvatar'
import { AppBadge, BadgeVariant } from '@components/primitives/AppBadge'
import { useTranslation } from '@hooks/useTranslation'
import { maskPhone } from '@utils/formatters'
import { colors, spacing, interaction } from '@constants/tokens'
import type { SubscriptionDto, SubscriptionStatus } from '../../../types/supplyLists'

export interface CustomerCardProps {
  /** Subscription row to render. */
  subscription: SubscriptionDto
  /** List unit, for "@ ₹x/unit" formatting. */
  unit: string
  /** Owner tap → edit subscription. Omit for read-only/staff. */
  onPress?: (subscriptionId: string) => void
  /** Other-list names to show before "+N more". Default 2. */
  maxOtherLists?: number
  /** Test ID. */
  testID?: string
}

/** Subscription status → labelled badge (color is never the only signal). */
const STATUS_BADGE: Record<SubscriptionStatus, { variant: BadgeVariant; key: string }> = {
  active: { variant: 'success', key: 'supply.status_active' },
  paused: { variant: 'warning', key: 'supply.status_paused' },
  ended: { variant: 'gray', key: 'supply.status_ended' },
}

/** Initials from a name (falls back to '?' so the avatar always renders). */
function initialsOf(name: string | null): string {
  if (!name) return '?'
  const parts = name.trim().split(/\s+/)
  const first = parts[0]?.[0] ?? ''
  const second = parts.length > 1 ? (parts[parts.length - 1]?.[0] ?? '') : ''
  return first + second || '?'
}

const styles = StyleSheet.create({
  card: {
    marginBottom: spacing[2],
    minHeight: interaction.minTouchTarget + spacing[3],
  },
  row: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing[3],
  },
  body: {
    flex: 1,
    gap: spacing[1],
  },
  topLine: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing[2],
  },
  name: {
    flexShrink: 1,
  },
  qtyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[2],
    flexWrap: 'wrap',
  },
})

const CustomerCardComponent: React.FC<CustomerCardProps> = ({
  subscription,
  unit,
  onPress,
  maxOtherLists = 2,
  testID,
}) => {
  const { t } = useTranslation()
  const sub = subscription
  const badge = STATUS_BADGE[sub.status]
  const isCustom = sub.isCustomQuantity || sub.isCustomRate

  const handlePress = useCallback(() => {
    if (!onPress) return
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)
    onPress(sub.subscriptionId)
  }, [onPress, sub.subscriptionId])

  const qtyLabel = t('supply.amount_label', {
    qty: String(sub.quantity),
    unit,
    rate: String(sub.ratePerUnit),
  })

  // Other lists: first N names + "+N more" overflow (count pre-computed server-side).
  const shownLists = sub.otherLists.slice(0, maxOtherLists)
  const remaining = sub.otherListsCount - shownLists.length
  const otherListsLabel =
    shownLists.length > 0
      ? remaining > 0
        ? t('supply.other_lists_more', {
            names: shownLists.join(', '),
            count: String(remaining),
          })
        : shownLists.join(', ')
      : null

  const a11yLabel = t('supply.customer_a11y', {
    name: sub.customerName ?? t('supply.unnamed_customer'),
    status: t(badge.key),
  })

  return (
    <AppCard
      variant="elevated"
      onPress={onPress ? handlePress : undefined}
      style={styles.card}
      accessibilityRole={onPress ? 'button' : 'text'}
      accessibilityLabel={a11yLabel}
      testID={testID}
    >
      <View style={styles.row}>
        <AppAvatar initials={initialsOf(sub.customerName)} size="md" />
        <View style={styles.body}>
          <View style={styles.topLine}>
            <AppText variant="body" weight="semibold" numberOfLines={1} style={styles.name}>
              {sub.customerName ?? t('supply.unnamed_customer')}
            </AppText>
            <AppBadge label={t(badge.key)} variant={badge.variant} size="sm" />
          </View>

          {sub.phoneNumber ? (
            <AppText variant="caption" color={colors.textSecondary} numberOfLines={1}>
              {maskPhone(sub.phoneNumber)}
            </AppText>
          ) : null}

          <View style={styles.qtyRow}>
            <AppText variant="caption" color={colors.textSecondary} numberOfLines={1}>
              {qtyLabel}
            </AppText>
            {isCustom ? (
              <AppBadge label={t('supply.custom_badge')} variant="primary" size="sm" />
            ) : null}
          </View>

          {sub.startDate ? (
            <AppText variant="caption" color={colors.textSecondary} numberOfLines={1}>
              {t('supply.since_date', { date: sub.startDate })}
            </AppText>
          ) : null}

          {otherListsLabel ? (
            <AppText variant="caption" color={colors.textSecondary} numberOfLines={2}>
              {otherListsLabel}
            </AppText>
          ) : null}
        </View>
      </View>
    </AppCard>
  )
}

CustomerCardComponent.displayName = 'CustomerCard'

export const CustomerCard = React.memo(CustomerCardComponent)

export default CustomerCard
