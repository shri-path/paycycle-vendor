/**
 * RecentAdditionRow (US-014)
 * Row for a customer recently added via a referral.
 * Shows referred customer name, referrer name, and join date.
 */

import React from 'react'
import { View, StyleSheet } from 'react-native'
import { AppText } from '@components/primitives/AppText'
import { useTranslation } from '@hooks/useTranslation'
import { colors, spacing } from '@constants/tokens'
import type { RecentAdditionDto } from '../../../types/referral'

export interface RecentAdditionRowProps {
  addition: RecentAdditionDto
  testID?: string
}

const s = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: spacing[2] },
  info: { flex: 1 },
})

function Inner({ addition, testID }: RecentAdditionRowProps) {
  const { t } = useTranslation()
  return (
    <View style={s.row} testID={testID ?? `recent-addition-row`}>
      <View style={s.info}>
        <AppText variant="body" color={colors.textPrimary}>{addition.referredCustomerName}</AppText>
        <AppText variant="caption" color={colors.textSecondary}>
          {t('referral.customer.referred_by', { name: addition.referrerCustomerName })}
        </AppText>
        <AppText variant="caption" color={colors.textSecondary}>{addition.joinedDate}</AppText>
      </View>
    </View>
  )
}

export const RecentAdditionRow = React.memo(Inner)
RecentAdditionRow.displayName = 'RecentAdditionRow'
export default RecentAdditionRow
