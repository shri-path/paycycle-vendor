/**
 * MonthlyBillCard — customer module composite (US-008).
 * Purpose: Owner-only card showing the monthly bill breakdown. Uses the full
 * `MonthlyBillDto` when available (per-list lines + extra charges) or falls back
 * to the `CurrentMonthBillSummary` from the customer detail for summary totals.
 *
 * Render condition: returns null when both `bill` and `summary` are null.
 *
 * Presentational — no store/API access.
 */

import React from 'react'
import { View, StyleSheet } from 'react-native'
import { AppCard } from '@components/primitives/AppCard'
import { AppText } from '@components/primitives/AppText'
import { useTranslation } from '@hooks/useTranslation'
import { formatCurrency } from '@utils/formatCurrency'
import { colors, spacing } from '@constants/tokens'
import { PaymentStatusBadge } from './PaymentStatusBadge'
import type { MonthlyBillDto, CurrentMonthBillSummary } from '../../../types/customer'

export interface MonthlyBillCardProps {
  /** Full monthly bill (from GET .../bill/:month). Null until lazily fetched. */
  bill: MonthlyBillDto | null
  /** Summary from the customer detail payload. Rendered when `bill` is unavailable. */
  summary: CurrentMonthBillSummary | null
  /** Test ID. */
  testID?: string
}

const styles = StyleSheet.create({
  card: {
    gap: spacing[3],
  },
  sectionTitle: {
    marginBottom: spacing[1],
  },
  divider: {
    height: 1,
    backgroundColor: colors.gray200,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  statusRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: spacing[1],
  },
  listLine: {
    gap: spacing[1],
    paddingVertical: spacing[1],
    borderBottomWidth: 1,
    borderBottomColor: colors.gray100,
  },
  extraCharge: {
    gap: spacing[1],
    paddingVertical: spacing[1],
  },
  subHeading: {
    marginBottom: spacing[1],
    marginTop: spacing[2],
  },
})

export const MonthlyBillCard: React.FC<MonthlyBillCardProps> = ({ bill, summary, testID }) => {
  const { t } = useTranslation()

  // Self-guard: nothing to render
  if (bill === null && summary === null) {
    return null
  }

  const subtotal = bill?.billDetails.subtotal ?? summary?.subtotal ?? 0
  const previousDue = bill?.billDetails.previousDue ?? summary?.previousDue ?? 0
  const totalDue = bill?.billDetails.totalDue ?? summary?.totalDue ?? 0
  const status = bill?.paymentStatus ?? summary?.status

  return (
    <AppCard variant="elevated" style={styles.card} testID={testID}>
      <AppText variant="h4" weight="semibold" style={styles.sectionTitle}>
        {t('customer.section_month_summary')}
      </AppText>

      {/* Per-list breakdown — only when full bill is available */}
      {bill !== null ? (
        <>
          {bill.billDetails.byList.length > 0 ? (
            <>
              <AppText variant="label" weight="semibold" color={colors.textSecondary} style={styles.subHeading}>
                {t('customer.section_supply_lists')}
              </AppText>
              {bill.billDetails.byList.map((line, idx) => (
                <View key={idx} style={styles.listLine}>
                  <View style={styles.row}>
                    <AppText variant="caption" weight="semibold" numberOfLines={1} style={{ flex: 1 }}>
                      {line.listName}
                    </AppText>
                    <AppText variant="caption" weight="semibold">
                      {formatCurrency(line.subtotal)}
                    </AppText>
                  </View>
                  <AppText variant="caption" color={colors.textSecondary}>
                    {line.deliveries} deliveries · {line.quantity} {line.unit} @ Rs.{line.ratePerUnit}/{line.unit}
                  </AppText>
                </View>
              ))}
            </>
          ) : null}

          {/* Extra charges */}
          {bill.billDetails.extraCharges.length > 0 ? (
            <>
              <AppText variant="label" weight="semibold" color={colors.textSecondary} style={styles.subHeading}>
                {t('customer.add_extra_charge')}
              </AppText>
              {bill.billDetails.extraCharges.map((charge, idx) => (
                <View key={idx} style={styles.extraCharge}>
                  <View style={styles.row}>
                    <AppText variant="caption" color={colors.textSecondary} style={{ flex: 1 }}>
                      {charge.reason} ({charge.listName})
                    </AppText>
                    <AppText variant="caption" weight="semibold">
                      {formatCurrency(charge.amount)}
                    </AppText>
                  </View>
                </View>
              ))}
            </>
          ) : null}

          <View style={styles.divider} />
        </>
      ) : null}

      {/* Totals */}
      <View style={styles.row}>
        <AppText variant="label" color={colors.textSecondary}>
          {t('customer.this_month')}
        </AppText>
        <AppText variant="body" weight="semibold">
          {formatCurrency(subtotal)}
        </AppText>
      </View>

      <View style={styles.row}>
        <AppText variant="label" color={colors.textSecondary}>
          {t('customer.previous_due')}
        </AppText>
        <AppText variant="body" weight="semibold" color={previousDue > 0 ? colors.error : colors.textPrimary}>
          {formatCurrency(previousDue)}
        </AppText>
      </View>

      <View style={styles.divider} />

      <View style={styles.statusRow}>
        <View>
          <AppText variant="label" color={colors.textSecondary}>
            {t('customer.total_due')}
          </AppText>
          <AppText variant="h4" weight="bold">
            {formatCurrency(totalDue)}
          </AppText>
        </View>
        {status !== undefined ? <PaymentStatusBadge status={status} /> : null}
      </View>
    </AppCard>
  )
}

MonthlyBillCard.displayName = 'MonthlyBillCard'

export default MonthlyBillCard
