/**
 * NetReceivableCard (US-012, T-07)
 * Dashboard card: advance credit total + net receivable.
 */

import React from 'react'
import { View, StyleSheet } from 'react-native'
import { AppCard } from '@components/primitives/AppCard'
import { AppText } from '@components/primitives/AppText'
import { formatCurrency } from '@utils/formatCurrency'
import { useTranslation } from '@hooks/useTranslation'
import { colors, spacing } from '@constants/tokens'
import type { AdvanceCreditSummary } from '../../../types/credit'

export interface NetReceivableCardProps {
  advanceCredit: AdvanceCreditSummary
  netReceivable: number
  testID?: string
}

const styles = StyleSheet.create({
  card: { padding: spacing[4], marginBottom: spacing[3] },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing[2] },
  divider: { height: 1, backgroundColor: colors.gray100, marginVertical: spacing[2] },
  netRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
})

export const NetReceivableCard = React.memo<NetReceivableCardProps>(
  ({ advanceCredit, netReceivable, testID }) => {
    const { t } = useTranslation()

    return (
      <AppCard style={styles.card} testID={testID ?? 'net-receivable-card'}>
        <View style={styles.row}>
          <AppText variant="body" color={colors.textSecondary}>
            {t('credit.advance_credit_label')}
          </AppText>
          <View style={{ alignItems: 'flex-end' }}>
            <AppText variant="body" weight="semibold" color={colors.primary}>
              {formatCurrency(advanceCredit.totalAmount)}
            </AppText>
            <AppText variant="caption" color={colors.textSecondary}>
              {t('credit.advance_credit_customers', { count: advanceCredit.customerCount })}
            </AppText>
          </View>
        </View>

        <View style={styles.divider} />

        <View style={styles.netRow}>
          <AppText variant="body" weight="semibold" color={colors.textPrimary}>
            {t('credit.net_receivable')}
          </AppText>
          <AppText variant="h3" weight="bold" color={netReceivable >= 0 ? colors.error : colors.success}>
            {formatCurrency(netReceivable)}
          </AppText>
        </View>
      </AppCard>
    )
  },
)

NetReceivableCard.displayName = 'NetReceivableCard'
export default NetReceivableCard
