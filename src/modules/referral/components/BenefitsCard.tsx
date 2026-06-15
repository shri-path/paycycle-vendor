/**
 * BenefitsCard (US-014)
 * Static card listing what the vendor earns by referring other vendors.
 */

import React from 'react'
import { View, StyleSheet } from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { AppCard } from '@components/primitives/AppCard'
import { AppText } from '@components/primitives/AppText'
import { useTranslation } from '@hooks/useTranslation'
import { colors, spacing, componentSizes } from '@constants/tokens'

export interface BenefitsCardProps {
  testID?: string
}

const BENEFITS = [
  'referral.refer.benefit_credits',
  'referral.refer.benefit_revenue',
  'referral.refer.benefit_milestone',
] as const

const styles = StyleSheet.create({
  card: { padding: spacing[4], marginBottom: spacing[3] },
  title: { marginBottom: spacing[3] },
  row: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: spacing[2] },
  icon: { marginRight: spacing[2], marginTop: 2 },
})

export const BenefitsCard = React.memo<BenefitsCardProps>(({ testID }) => {
  const { t } = useTranslation()
  return (
    <AppCard style={styles.card} testID={testID ?? 'benefits-card'}>
      <AppText variant="body" weight="semibold" color={colors.textPrimary} style={styles.title}>
        {t('referral.refer.benefits_title')}
      </AppText>
      {BENEFITS.map((key) => (
        <View key={key} style={styles.row}>
          <Ionicons
            name="checkmark-circle"
            size={componentSizes.icon.sm}
            color={colors.success}
            style={styles.icon}
          />
          <AppText variant="body" color={colors.textSecondary} style={{ flex: 1 }}>
            {t(key)}
          </AppText>
        </View>
      ))}
    </AppCard>
  )
})

BenefitsCard.displayName = 'BenefitsCard'
export default BenefitsCard
