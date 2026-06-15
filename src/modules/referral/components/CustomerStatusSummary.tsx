/**
 * CustomerStatusSummary (US-014)
 * Summary row showing how many customers are on/off PayCycle.
 * Used on BulkInviteCustomersScreen to help the owner understand invite potential.
 */

import React from 'react'
import { View, StyleSheet } from 'react-native'
import { AppCard } from '@components/primitives/AppCard'
import { AppText } from '@components/primitives/AppText'
import { useTranslation } from '@hooks/useTranslation'
import { colors, spacing } from '@constants/tokens'

export interface CustomerStatusSummaryProps {
  total: number
  onPaycycle: number
  notOnPaycycle: number
  testID?: string
}

const s = StyleSheet.create({
  card: { padding: spacing[4], marginBottom: spacing[3] },
  row: { flexDirection: 'row', justifyContent: 'space-around' },
  stat: { alignItems: 'center' },
})

function Inner({ total, onPaycycle, notOnPaycycle, testID }: CustomerStatusSummaryProps) {
  const { t } = useTranslation()
  return (
    <AppCard style={s.card} testID={testID ?? 'customer-status-summary'}>
      <View style={s.row}>
        <View style={s.stat}>
          <AppText variant="h3" weight="bold" color={colors.primary} testID="total-customers">{total}</AppText>
          <AppText variant="caption" color={colors.textSecondary}>{t('referral.invite.total')}</AppText>
        </View>
        <View style={s.stat}>
          <AppText variant="h3" weight="bold" color={colors.success} testID="on-paycycle-count">{onPaycycle}</AppText>
          <AppText variant="caption" color={colors.textSecondary}>{t('referral.invite.on_paycycle')}</AppText>
        </View>
        <View style={s.stat}>
          <AppText variant="h3" weight="bold" color={colors.warning} testID="invite-eligible-count">{notOnPaycycle}</AppText>
          <AppText variant="caption" color={colors.textSecondary}>{t('referral.invite.eligible')}</AppText>
        </View>
      </View>
    </AppCard>
  )
}

export const CustomerStatusSummary = React.memo(Inner)
CustomerStatusSummary.displayName = 'CustomerStatusSummary'
export default CustomerStatusSummary
