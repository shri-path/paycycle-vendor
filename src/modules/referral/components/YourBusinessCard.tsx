/**
 * YourBusinessCard (US-014)
 * Card showing the current vendor's stats in the NearbyVendorsScreen.
 * Distance is NEVER rendered (null in v1).
 */

import React from 'react'
import { View, StyleSheet } from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { AppCard } from '@components/primitives/AppCard'
import { AppText } from '@components/primitives/AppText'
import { useTranslation } from '@hooks/useTranslation'
import { colors, spacing, componentSizes } from '@constants/tokens'
import type { YourBusinessDto } from '../../../types/referral'

export interface YourBusinessCardProps {
  business: YourBusinessDto
  testID?: string
}

const s = StyleSheet.create({
  card: { padding: spacing[4], marginBottom: spacing[3] },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing[2] },
  row: { flexDirection: 'row', alignItems: 'center', marginTop: spacing[1] },
  icon: { marginRight: spacing[1] },
})

function Inner({ business, testID }: YourBusinessCardProps) {
  const { t } = useTranslation()
  return (
    <AppCard style={s.card} testID={testID ?? 'your-business-card'}>
      <View style={s.header}>
        <AppText variant="body" weight="semibold" color={colors.textPrimary}>{business.name}</AppText>
        <AppText variant="caption" color={colors.textSecondary}>
          {t('referral.nearby.rank_in_area', { rank: business.rankInArea })}
        </AppText>
      </View>
      <View style={s.row}>
        <Ionicons name="people-outline" size={componentSizes.icon.xs} color={colors.textSecondary} style={s.icon} />
        <AppText variant="caption" color={colors.textSecondary}>
          {t('referral.nearby.customer_count', { count: business.customersOnPaycycle })}
        </AppText>
      </View>
    </AppCard>
  )
}

export const YourBusinessCard = React.memo(Inner)
YourBusinessCard.displayName = 'YourBusinessCard'
export default YourBusinessCard
