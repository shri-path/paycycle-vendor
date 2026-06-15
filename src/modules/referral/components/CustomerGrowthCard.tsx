import React from 'react'
import { View, StyleSheet } from 'react-native'
import { AppCard } from '@components/primitives/AppCard'
import { AppText } from '@components/primitives/AppText'
import { useTranslation } from '@hooks/useTranslation'
import { colors, spacing } from '@constants/tokens'
import type { CustomerGrowthFromReferrals } from '../../../types/referral'
export interface CustomerGrowthCardProps { growth: CustomerGrowthFromReferrals; testID?: string }
const s = StyleSheet.create({ card: { padding: spacing[4], marginBottom: spacing[3] }, row: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: spacing[2] }, divider: { height: 1, backgroundColor: colors.gray100, marginVertical: spacing[2] } })
function Inner({ growth, testID }: CustomerGrowthCardProps) {
  const { t } = useTranslation()
  return (
    <AppCard style={s.card} testID={testID ?? 'customer-growth-card'}>
      <View style={s.row}><AppText variant="body" color={colors.textSecondary}>{t('referral.dashboard.new_this_month')}</AppText><AppText variant="body" weight="semibold" color={colors.primary} testID="new-this-month">{growth.newCustomersThisMonth}</AppText></View>
      <View style={s.row}><AppText variant="body" color={colors.textSecondary}>{t('referral.dashboard.total_from_referrals')}</AppText><AppText variant="body" weight="semibold" color={colors.textPrimary}>{growth.totalFromReferrals}</AppText></View>
      {growth.topReferrer != null ? (<><View style={s.divider} /><AppText variant="caption" color={colors.textSecondary}>{growth.topReferrer.customerName}</AppText></>) : null}
    </AppCard>
  )
}
export const CustomerGrowthCard = React.memo(Inner)
CustomerGrowthCard.displayName = 'CustomerGrowthCard'
export default CustomerGrowthCard
