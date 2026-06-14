/**
 * CreditPriorityCard (US-012, T-08)
 * Priority customer card with Remind/Call/Block actions.
 * New component (not regressing US-010 PriorityCustomerCard).
 *
 * Priority action sets:
 *   high   → Remind + Call + Block
 *   medium → Remind + Call
 *   low    → read-only
 *
 * Per-card in-flight remind state via `isReminding` prop (from store `remindingCustomerIds`).
 */

import React, { useCallback } from 'react'
import { View, Linking, StyleSheet } from 'react-native'
import * as Haptics from 'expo-haptics'
import { AppCard } from '@components/primitives/AppCard'
import { AppText } from '@components/primitives/AppText'
import { AppButton } from '@components/primitives/AppButton'
import { AppBadge } from '@components/primitives/AppBadge'
import { formatCurrency } from '@utils/formatCurrency'
import { useTranslation } from '@hooks/useTranslation'
import { colors, spacing } from '@constants/tokens'
import type { CreditPriorityCustomer } from '../../../types/credit'

export type CreditPriority = 'high' | 'medium' | 'low'

export interface CreditPriorityCardProps {
  customer: CreditPriorityCustomer
  priority: CreditPriority
  isReminding: boolean
  isConnected: boolean
  onRemind: (customerId: string) => void
  onBlock: (customerId: string) => void
  testID?: string
}

const PRIORITY_COLORS: Record<CreditPriority, string> = {
  high: colors.error,
  medium: colors.warning,
  low: colors.primary,
}

const styles = StyleSheet.create({
  card: { marginBottom: spacing[3], padding: spacing[4] },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: spacing[2] },
  nameRow: { flex: 1, marginRight: spacing[2] },
  metaRow: { flexDirection: 'row', gap: spacing[3], marginBottom: spacing[3] },
  metaItem: { alignItems: 'flex-start' },
  actions: { flexDirection: 'row', gap: spacing[2] },
  actionBtn: { flex: 1 },
  daysOverdue: { marginTop: spacing[1] },
})

function formatDaysOverdue(days: number): string {
  if (days > 365) return '365+'
  return String(days)
}

export const CreditPriorityCard = React.memo<CreditPriorityCardProps>(
  ({ customer, priority, isReminding, isConnected, onRemind, onBlock, testID }) => {
    const { t } = useTranslation()
    const priorityColor = PRIORITY_COLORS[priority]

    const handleCall = useCallback(() => {
      void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)
      void Linking.openURL(`tel:${customer.phoneNumber}`)
    }, [customer.phoneNumber])

    const handleRemind = useCallback(() => {
      void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium)
      onRemind(customer.customerId)
    }, [customer.customerId, onRemind])

    const handleBlock = useCallback(() => {
      void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium)
      onBlock(customer.customerId)
    }, [customer.customerId, onBlock])

    const writesDisabled = !isConnected

    return (
      <AppCard style={styles.card} testID={testID ?? `credit-priority-card-${customer.customerId}`}>
        {/* Header: name + priority badge */}
        <View style={styles.header}>
          <View style={styles.nameRow}>
            <AppText variant="body" weight="semibold" color={colors.textPrimary} numberOfLines={1}>
              {customer.customerName}
            </AppText>
            <View style={styles.daysOverdue}>
              <AppText variant="caption" color={priorityColor}>
                {t('credit.days_overdue_label', { days: formatDaysOverdue(customer.daysOverdue) })}
              </AppText>
            </View>
          </View>
          <AppBadge
            label={t(`credit.priority_${priority}`)}
            variant={priority === 'high' ? 'error' : priority === 'medium' ? 'warning' : 'gray'}
          />
        </View>

        {/* Metrics row */}
        <View style={styles.metaRow}>
          <View style={styles.metaItem}>
            <AppText variant="caption" color={colors.textSecondary}>{t('credit.outstanding')}</AppText>
            <AppText variant="body" weight="semibold" color={colors.error}>
              {formatCurrency(customer.outstanding)}
            </AppText>
          </View>
          <View style={styles.metaItem}>
            <AppText variant="caption" color={colors.textSecondary}>{t('credit.utilization')}</AppText>
            <AppText variant="body" weight="semibold" color={customer.utilizationPercentage >= 100 ? colors.error : colors.textPrimary}>
              {customer.utilizationPercentage}%
            </AppText>
          </View>
          <View style={styles.metaItem}>
            <AppText variant="caption" color={colors.textSecondary}>{t('credit.score')}</AppText>
            <AppText variant="body" weight="semibold" color={colors.textPrimary}>
              {customer.paymentScore}/10
            </AppText>
          </View>
        </View>

        {/* Action row */}
        {priority !== 'low' ? (
          <View style={styles.actions}>
            <AppButton
              label={isReminding ? t('credit.reminding') : t('credit.remind')}
              variant="secondary"
              disabled={writesDisabled || isReminding}
              loading={isReminding}
              onPress={handleRemind}
              style={styles.actionBtn}
              testID={`remind-btn-${customer.customerId}`}
            />
            <AppButton
              label={t('credit.call')}
              variant="secondary"
              onPress={handleCall}
              style={styles.actionBtn}
              testID={`call-btn-${customer.customerId}`}
              accessibilityHint={t('credit.call_customer', { name: customer.customerName })}
            />
            {priority === 'high' ? (
              <AppButton
                label={t('credit.block')}
                variant="secondary"
                disabled={writesDisabled}
                onPress={handleBlock}
                style={StyleSheet.flatten([styles.actionBtn, { borderColor: colors.error }])}
                testID={`block-btn-${customer.customerId}`}
              />
            ) : null}
          </View>
        ) : null}
      </AppCard>
    )
  },
)

CreditPriorityCard.displayName = 'CreditPriorityCard'
export default CreditPriorityCard
