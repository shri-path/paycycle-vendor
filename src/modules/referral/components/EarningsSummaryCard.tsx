import React from 'react'
import { View, StyleSheet } from 'react-native'
import { AppCard } from '@components/primitives/AppCard'
import { AppText } from '@components/primitives/AppText'
import { formatCurrency } from '@utils/formatCurrency'
import { useTranslation } from '@hooks/useTranslation'
import { colors, spacing } from '@constants/tokens'
import type { TotalEarnings } from '../../../types/referral'

export interface EarningsSummaryCardProps {
  totalEarnings: TotalEarnings
  availableBalance: number
  testID?: string
}

const s = StyleSheet.create({
  card: { padding: spacing[4], marginBottom: spacing[3] },
  row: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: spacing[2] },
  divider: { height: 1, backgroundColor: colors.gray100, marginVertical: spacing[2] },
  bal: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
})

function EarningsSummaryCardInner({ totalEarnings, availableBalance, testID }: EarningsSummaryCardProps) {
  const { t } = useTranslation()
  return (
    <AppCard style={s.card} testID={testID ?? 'earnings-summary-card'}>
      <View style={s.row}>
        <AppText variant="body" color={colors.textSecondary}>{t('referral.dashboard.credits_earned')}</AppText>
        <AppText variant="body" weight="semibold" color={colors.primary}>{formatCurrency(totalEarnings.credits)}</AppText>
      </View>
      <View style={s.row}>
        <AppText variant="body" color={colors.textSecondary}>{t('referral.dashboard.revenue_share')}</AppText>
        <AppText variant="body" weight="semibold" color={colors.primary}>{formatCurrency(totalEarnings.revenueShare)}</AppText>
      </View>
      <View style={s.divider} />
      <View style={s.bal}>
        <AppText variant="body" weight="semibold" color={colors.textPrimary}>{t('referral.dashboard.available_balance')}</AppText>
        <AppText variant="h3" weight="bold" color={colors.success} testID="available-balance-value">{formatCurrency(availableBalance)}</AppText>
      </View>
    </AppCard>
  )
}

export const EarningsSummaryCard = React.memo(EarningsSummaryCardInner)
EarningsSummaryCard.displayName = 'EarningsSummaryCard'
export default EarningsSummaryCard
