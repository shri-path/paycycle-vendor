/**
 * AdvanceCreditRow (US-012, T-08)
 * One advance-credit customer row (balance, months covered).
 */

import React from 'react'
import { View, StyleSheet } from 'react-native'
import { AppText } from '@components/primitives/AppText'
import { formatCurrency } from '@utils/formatCurrency'
import { useTranslation } from '@hooks/useTranslation'
import { colors, spacing } from '@constants/tokens'
import type { AdvanceCreditEntry } from '../../../types/credit'

export interface AdvanceCreditRowProps {
  entry: AdvanceCreditEntry
  testID?: string
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: spacing[2],
    borderBottomWidth: 1,
    borderBottomColor: colors.gray100,
  },
  right: { alignItems: 'flex-end' },
})

export const AdvanceCreditRow = React.memo<AdvanceCreditRowProps>(({ entry, testID }) => {
  const { t } = useTranslation()

  return (
    <View style={styles.row} testID={testID ?? `advance-credit-row-${entry.customerId}`}>
      <AppText variant="body" color={colors.textPrimary} numberOfLines={1} style={{ flex: 1 }}>
        {entry.customerName}
      </AppText>
      <View style={styles.right}>
        <AppText variant="body" weight="semibold" color={colors.success}>
          {formatCurrency(Math.abs(entry.creditBalance))}
        </AppText>
        <AppText variant="caption" color={colors.textSecondary}>
          {t('credit.months_covered', { count: entry.monthsCovered })}
        </AppText>
      </View>
    </View>
  )
})

AdvanceCreditRow.displayName = 'AdvanceCreditRow'
export default AdvanceCreditRow
