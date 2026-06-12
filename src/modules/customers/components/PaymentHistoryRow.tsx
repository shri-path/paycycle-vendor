/**
 * PaymentHistoryRow — customer module composite (US-008).
 * Purpose: Renders one row in the payment history list. Shows amount, date,
 * payment method, and optional reference number.
 *
 * Presentational — no store/API access.
 */

import React from 'react'
import { View, StyleSheet } from 'react-native'
import { AppText } from '@components/primitives/AppText'
import { useTranslation } from '@hooks/useTranslation'
import { formatCurrency } from '@utils/formatCurrency'
import { colors, spacing, borderWidth } from '@constants/tokens'
import type { PaymentDto, PaymentMethod } from '../../../types/customer'

export interface PaymentHistoryRowProps {
  /** Payment record to display. */
  payment: PaymentDto
  /** Test ID. */
  testID?: string
}

/** i18n key for a payment method. */
const METHOD_KEYS: Record<PaymentMethod, string> = {
  CASH: 'customer.method_cash',
  ONLINE: 'customer.method_online',
  UPI: 'customer.method_upi',
  OTHER: 'customer.method_other',
}

/** Format a YYYY-MM-DD date string to a locale-friendly string. */
function formatDate(dateStr: string): string {
  try {
    return new Date(dateStr).toLocaleDateString(undefined, {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    })
  } catch {
    return dateStr
  }
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: spacing[3],
    borderBottomWidth: borderWidth.thin,
    borderBottomColor: colors.gray200,
    gap: spacing[3],
  },
  left: {
    flex: 1,
    gap: spacing[1],
  },
  right: {
    alignItems: 'flex-end',
    gap: spacing[1],
  },
})

export const PaymentHistoryRow: React.FC<PaymentHistoryRowProps> = ({ payment, testID }) => {
  const { t } = useTranslation()
  const methodKey = METHOD_KEYS[payment.method] ?? 'customer.method_other'

  return (
    <View style={styles.container} testID={testID}>
      <View style={styles.left}>
        <AppText variant="body" weight="semibold">
          {formatCurrency(payment.amount)}
        </AppText>
        <AppText variant="caption" color={colors.textSecondary}>
          {t(methodKey)}
        </AppText>
        {payment.reference !== null ? (
          <AppText variant="caption" color={colors.textSecondary} numberOfLines={1}>
            {t('customer.field_reference')}: {payment.reference}
          </AppText>
        ) : null}
      </View>
      <View style={styles.right}>
        <AppText variant="caption" color={colors.textSecondary}>
          {formatDate(payment.date)}
        </AppText>
      </View>
    </View>
  )
}

PaymentHistoryRow.displayName = 'PaymentHistoryRow'

export default PaymentHistoryRow
