/**
 * PriorityCustomerCard (US-010)
 * Purpose: Collections screen — shows outstanding, days overdue, utilization %,
 * last payment, payment score for a priority customer. Read-only metrics only.
 * "Record Payment" navigates to US-008 record-payment screen (OQ-5: no reminder).
 */

import React from 'react'
import { View, StyleSheet } from 'react-native'
import { AppCard } from '@components/primitives/AppCard'
import { AppText } from '@components/primitives/AppText'
import { AppButton } from '@components/primitives/AppButton'
import { AppBadge } from '@components/primitives/AppBadge'
import { formatCurrency } from '@utils/formatCurrency'
import { useTranslation } from '@hooks/useTranslation'
import { colors, spacing } from '@constants/tokens'
import type { PriorityCustomer } from '../../../types/dashboard'

export type Priority = 'high' | 'medium' | 'low'

export interface PriorityCustomerCardProps {
  customer: PriorityCustomer
  priority: Priority
  onRecordPayment: () => void
}

function priorityBadgeVariant(p: Priority) {
  switch (p) {
    case 'high': return 'error' as const
    case 'medium': return 'warning' as const
    default: return 'success' as const
  }
}

const styles = StyleSheet.create({
  card: { padding: spacing[3], marginBottom: spacing[3] },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: spacing[2],
  },
  nameCol: { flex: 1, gap: spacing[1] },
  metricsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing[3], marginBottom: spacing[2] },
  metric: { gap: spacing[0] },
  btn: { marginTop: spacing[1] },
})

export const PriorityCustomerCard: React.FC<PriorityCustomerCardProps> = ({
  customer,
  priority,
  onRecordPayment,
}) => {
  const { t } = useTranslation()

  return (
    <AppCard style={styles.card} testID={`priority-customer-${customer.customerId}`}>
      <View style={styles.header}>
        <View style={styles.nameCol}>
          <AppText variant="body" weight="semibold" color={colors.textPrimary}>
            {customer.customerName}
          </AppText>
          <AppText variant="body" weight="bold" color={colors.error}>
            {formatCurrency(customer.outstanding)}
          </AppText>
        </View>
        <AppBadge
          label={t(`dashboard.priority_${priority}`)}
          variant={priorityBadgeVariant(priority)}
        />
      </View>

      <View style={styles.metricsRow}>
        <View style={styles.metric}>
          <AppText variant="caption" color={colors.textSecondary}>{t('dashboard.days_overdue')}</AppText>
          <AppText variant="body" weight="semibold" color={customer.daysOverdue > 60 ? colors.error : colors.textPrimary}>
            {customer.daysOverdue}d
          </AppText>
        </View>
        <View style={styles.metric}>
          <AppText variant="caption" color={colors.textSecondary}>{t('dashboard.utilization')}</AppText>
          <AppText variant="body" weight="semibold" color={colors.textPrimary}>
            {customer.utilizationPercentage}%
          </AppText>
        </View>
        <View style={styles.metric}>
          <AppText variant="caption" color={colors.textSecondary}>{t('customer.payment_score')}</AppText>
          <AppText variant="body" weight="semibold" color={colors.textPrimary}>
            {customer.paymentScore}
          </AppText>
        </View>
      </View>

      {customer.lastPaymentDate ? (
        <AppText variant="caption" color={colors.textSecondary}>
          {t('customer.last_payment')}: {customer.lastPaymentDate}
        </AppText>
      ) : null}

      <AppButton
        label={t('dashboard.record_payment')}
        onPress={onRecordPayment}
        variant="secondary"
        size="sm"
        fullWidth
        style={styles.btn}
        testID={`record-payment-${customer.customerId}`}
      />
    </AppCard>
  )
}

export default PriorityCustomerCard
