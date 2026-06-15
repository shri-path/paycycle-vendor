import React from 'react'
import { View, StyleSheet } from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { AppText } from '@components/primitives/AppText'
import { useTranslation } from '@hooks/useTranslation'
import { colors, spacing, componentSizes } from '@constants/tokens'
export interface WithdrawalThresholdNoticeProps { minimumAmount: number; testID?: string }
const s = StyleSheet.create({ c: { flexDirection: 'row', alignItems: 'flex-start', padding: spacing[3], backgroundColor: colors.gray50, borderRadius: 8, marginBottom: spacing[3] }, icon: { marginRight: spacing[2], marginTop: 1 }, text: { flex: 1 } })
function Inner({ minimumAmount, testID }: WithdrawalThresholdNoticeProps) {
  const { t } = useTranslation()
  return (
    <View style={s.c} testID={testID ?? 'withdrawal-threshold-notice'}>
      <Ionicons name="information-circle-outline" size={componentSizes.icon.sm} color={colors.info} style={s.icon} />
      <AppText variant="caption" color={colors.textSecondary} style={s.text}>{t('referral.redeem.withdrawal_coming_soon', { minimum: minimumAmount })}</AppText>
    </View>
  )
}
export const WithdrawalThresholdNotice = React.memo(Inner)
WithdrawalThresholdNotice.displayName = 'WithdrawalThresholdNotice'
export default WithdrawalThresholdNotice
