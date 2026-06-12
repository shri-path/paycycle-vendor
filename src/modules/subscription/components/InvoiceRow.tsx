/**
 * InvoiceRow — subscription module component (US-009).
 * Purpose: Tappable billing-history list row. Shows invoice number, total amount,
 * date, and a payment-status pill. Null-guards all nullable payment fields.
 * Presentational — receives `invoice` and `onPress` via props; no store access.
 */

import React from 'react'
import { TouchableOpacity, View, StyleSheet } from 'react-native'
import { AppText } from '@components/primitives/AppText'
import { AppBadge } from '@components/primitives/AppBadge'
import { useTranslation } from '@hooks/useTranslation'
import { formatLocaleDate } from '@utils/formatDate'
import { formatCurrency } from '@utils/formatCurrency'
import { colors, spacing } from '@constants/tokens'
import type { BadgeVariant } from '@components/primitives/AppBadge'
import type { InvoiceDto, InvoicePaymentStatus } from '../../../types/subscription'

export interface InvoiceRowProps {
  invoice: InvoiceDto
  onPress: (invoiceId: string) => void
}

const PAYMENT_STATUS_CONFIG: Record<InvoicePaymentStatus, { variant: BadgeVariant; key: string }> = {
  PAID:    { variant: 'success', key: 'subscription.paid' },
  PENDING: { variant: 'warning', key: 'subscription.pending' },
  OVERDUE: { variant: 'error',   key: 'subscription.overdue' },
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: spacing[3],
    paddingHorizontal: spacing[4],
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.gray100,
  },
  left: { flex: 1 },
  right: { alignItems: 'flex-end' },
  amount: { marginBottom: spacing[1] },
})

export const InvoiceRow: React.FC<InvoiceRowProps> = ({ invoice, onPress }) => {
  const { t } = useTranslation()
  const statusConfig = PAYMENT_STATUS_CONFIG[invoice.paymentStatus]

  return (
    <TouchableOpacity
      style={styles.row}
      onPress={() => onPress(invoice.id)}
      accessibilityLabel={`${invoice.invoiceNumber} ${formatCurrency(invoice.totalAmount)}`}
      accessibilityRole="button"
      testID={`invoice-row-${invoice.id}`}
    >
      <View style={styles.left}>
        <AppText variant="body" weight="medium" color={colors.textPrimary} numberOfLines={1}>
          {invoice.invoiceNumber}
        </AppText>
        <AppText variant="caption" color={colors.textSecondary}>
          {formatLocaleDate(invoice.invoiceDate)}
        </AppText>
        {invoice.paymentDate ? (
          <AppText variant="caption" color={colors.textSecondary}>
            {t('subscription.payment_date')}: {formatLocaleDate(invoice.paymentDate)}
          </AppText>
        ) : null}
      </View>
      <View style={styles.right}>
        <AppText variant="body" weight="bold" color={colors.textPrimary} style={styles.amount}>
          {formatCurrency(invoice.totalAmount)}
        </AppText>
        <AppBadge label={t(statusConfig.key)} variant={statusConfig.variant} size="sm" />
      </View>
    </TouchableOpacity>
  )
}

InvoiceRow.displayName = 'InvoiceRow'

export default InvoiceRow
