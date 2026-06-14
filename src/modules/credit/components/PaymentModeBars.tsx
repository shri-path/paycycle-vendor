/**
 * PaymentModeBars (US-012, T-11)
 * Horizontal bar chart for payment-mode breakdown — pure View bars (no chart lib).
 */

import React from 'react'
import { View, StyleSheet } from 'react-native'
import { AppCard } from '@components/primitives/AppCard'
import { AppText } from '@components/primitives/AppText'
import { formatCurrency } from '@utils/formatCurrency'
import { useTranslation } from '@hooks/useTranslation'
import { colors, spacing, borderRadius } from '@constants/tokens'
import type { PaymentModeBreakdown } from '../../../types/credit'

export interface PaymentModeBarsProps {
  breakdown: PaymentModeBreakdown
  testID?: string
}

type Mode = keyof PaymentModeBreakdown

const MODE_COLORS: Record<Mode, string> = {
  upi: '#4F46E5',
  cash: '#059669',
  bank: '#2563EB',
  online: '#7C3AED',
  other: '#6B7280',
}

const styles = StyleSheet.create({
  card: { padding: spacing[4], marginBottom: spacing[3] },
  title: { marginBottom: spacing[3] },
  row: { marginBottom: spacing[3] },
  labelRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: spacing[1] },
  barTrack: { height: 8, backgroundColor: colors.gray100, borderRadius: borderRadius.full, overflow: 'hidden' },
  barFill: { height: 8, borderRadius: borderRadius.full },
})

const MODE_LABEL_KEYS: Record<Mode, string> = {
  upi: 'credit.payment_mode_upi',
  cash: 'credit.payment_mode_cash',
  bank: 'credit.payment_mode_bank',
  online: 'credit.payment_mode_online',
  other: 'credit.payment_mode_other',
}

export const PaymentModeBars = React.memo<PaymentModeBarsProps>(({ breakdown, testID }) => {
  const { t } = useTranslation()

  const modes = Object.keys(breakdown) as Mode[]

  return (
    <AppCard style={styles.card} testID={testID ?? 'payment-mode-bars'}>
      <AppText variant="body" weight="semibold" color={colors.textPrimary} style={styles.title}>
        {t('credit.payment_mode_title')}
      </AppText>
      {modes.map((mode) => {
        const entry = breakdown[mode]
        return (
          <View key={mode} style={styles.row}>
            <View style={styles.labelRow}>
              <AppText variant="body" color={colors.textPrimary}>{t(MODE_LABEL_KEYS[mode])}</AppText>
              <AppText variant="body" color={colors.textSecondary}>
                {formatCurrency(entry.amount)} · {entry.percentage}%
              </AppText>
            </View>
            <View style={styles.barTrack}>
              <View
                style={[
                  styles.barFill,
                  { width: `${Math.min(entry.percentage, 100)}%`, backgroundColor: MODE_COLORS[mode] },
                ]}
              />
            </View>
          </View>
        )
      })}
    </AppCard>
  )
})

PaymentModeBars.displayName = 'PaymentModeBars'
export default PaymentModeBars
