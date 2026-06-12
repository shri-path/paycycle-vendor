/**
 * CreditPaymentCard — customer module composite (US-008).
 * Purpose: Owner-only card showing payment score, credit limit, current balance,
 * credit utilization with colour band, and a "Set Credit Limit" action.
 *
 * Render condition: returns null when `currentBalance` is null (server nulls it for
 * staff). The caller may guard on this, but the component is self-guarding.
 *
 * Utilization colour bands:
 *   < 70%  → green (success)
 *   70–90% → amber (warning)
 *   > 90%  → red (error)
 *
 * Presentational — no store/API access.
 */

import React from 'react'
import { View, StyleSheet } from 'react-native'
import { AppCard } from '@components/primitives/AppCard'
import { AppText } from '@components/primitives/AppText'
import { AppButton } from '@components/primitives/AppButton'
import { useTranslation } from '@hooks/useTranslation'
import { formatCurrency } from '@utils/formatCurrency'
import { colors, spacing } from '@constants/tokens'
import { PaymentScoreStars } from './PaymentScoreStars'
import type { CustomerDetailDto } from '../../../types/customer'

export interface CreditPaymentCardProps {
  /** Full customer detail. */
  customer: CustomerDetailDto
  /** Called when the "Set Credit Limit" button is pressed. */
  onSetCreditLimit: () => void
  /** Test ID. */
  testID?: string
}

/** Returns the colour token for a utilization percentage. */
function utilizationColor(utilization: number): string {
  if (utilization < 70) return colors.success
  if (utilization <= 90) return colors.warning
  return colors.error
}

const styles = StyleSheet.create({
  card: {
    gap: spacing[3],
  },
  sectionTitle: {
    marginBottom: spacing[1],
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  utilizationRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: spacing[1],
  },
  divider: {
    height: 1,
    backgroundColor: colors.gray200,
  },
})

export const CreditPaymentCard: React.FC<CreditPaymentCardProps> = ({
  customer,
  onSetCreditLimit,
  testID,
}) => {
  const { t } = useTranslation()

  // Self-guard: do not render when server withholds financial data (staff access).
  if (customer.currentBalance === null) {
    return null
  }

  const utilization = customer.creditUtilization ?? 0

  return (
    <AppCard variant="elevated" style={styles.card} testID={testID}>
      <AppText variant="h4" weight="semibold" style={styles.sectionTitle}>
        {t('customer.section_credit_payment')}
      </AppText>

      {/* Payment Score */}
      {customer.paymentScore !== null ? (
        <View style={styles.row}>
          <AppText variant="label" color={colors.textSecondary}>
            {t('customer.payment_score')}
          </AppText>
          <PaymentScoreStars score={customer.paymentScore} />
        </View>
      ) : null}

      <View style={styles.divider} />

      {/* Credit Limit */}
      <View style={styles.row}>
        <AppText variant="label" color={colors.textSecondary}>
          {t('customer.credit_limit')}
        </AppText>
        <AppText variant="body" weight="semibold">
          {formatCurrency(customer.creditLimit)}
        </AppText>
      </View>

      {/* Current Balance */}
      <View style={styles.row}>
        <AppText variant="label" color={colors.textSecondary}>
          {t('customer.current_balance')}
        </AppText>
        <AppText variant="body" weight="semibold">
          {formatCurrency(customer.currentBalance)}
        </AppText>
      </View>

      {/* Utilization with colour band */}
      <View style={styles.utilizationRow}>
        <AppText variant="label" color={colors.textSecondary}>
          {t('customer.utilization')}
        </AppText>
        <AppText
          variant="body"
          weight="semibold"
          color={utilizationColor(utilization)}
        >
          {utilization.toFixed(1)}%
        </AppText>
      </View>

      {/* Set Credit Limit action */}
      <AppButton
        label={t('customer.set_credit_limit')}
        variant="secondary"
        size="md"
        onPress={onSetCreditLimit}
        testID={testID ? `${testID}-set-limit` : undefined}
      />
    </AppCard>
  )
}

CreditPaymentCard.displayName = 'CreditPaymentCard'

export default CreditPaymentCard
