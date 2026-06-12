/**
 * AdvanceCreditCard (US-010)
 * Purpose: Shows a customer's advance credit balance and months covered.
 * Rendered only when advanceCredit.customers.length > 0 (edge case #6).
 */

import React from 'react'
import { View, StyleSheet } from 'react-native'
import { AppCard } from '@components/primitives/AppCard'
import { AppText } from '@components/primitives/AppText'
import { formatCurrency } from '@utils/formatCurrency'
import { useTranslation } from '@hooks/useTranslation'
import { colors, spacing } from '@constants/tokens'
import type { AdvanceCreditCustomer } from '../../../types/dashboard'

export interface AdvanceCreditCardProps {
  customer: AdvanceCreditCustomer
}

const styles = StyleSheet.create({
  card: {
    padding: spacing[3],
    marginBottom: spacing[2],
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  right: { alignItems: 'flex-end', gap: spacing[0] },
})

export const AdvanceCreditCard: React.FC<AdvanceCreditCardProps> = ({ customer }) => {
  const { t } = useTranslation()

  return (
    <AppCard style={styles.card} testID={`advance-credit-${customer.customerId}`}>
      <AppText variant="body" weight="medium" color={colors.textPrimary}>
        {customer.customerName}
      </AppText>
      <View style={styles.right}>
        <AppText variant="body" weight="bold" color={colors.success}>
          {formatCurrency(Math.abs(customer.creditBalance))}
        </AppText>
        <AppText variant="caption" color={colors.textSecondary}>
          {t('dashboard.advance_credit')} · {customer.monthsCovered}mo
        </AppText>
      </View>
    </AppCard>
  )
}

export default AdvanceCreditCard
