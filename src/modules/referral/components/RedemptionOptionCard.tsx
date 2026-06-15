/**
 * RedemptionOptionCard (US-014)
 * Tappable card for a single redemption option.
 * disabled=true renders it visually muted (used for Cash Withdrawal coming-soon).
 */

import React from 'react'
import { TouchableOpacity, View, StyleSheet } from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { AppText } from '@components/primitives/AppText'
import { AppBadge } from '@components/primitives/AppBadge'
import { useTranslation } from '@hooks/useTranslation'
import { colors, spacing, componentSizes } from '@constants/tokens'

export interface RedemptionOptionCardProps {
  titleKey: string
  descriptionKey: string
  amountLabel: string
  iconName: React.ComponentProps<typeof Ionicons>['name']
  disabled?: boolean
  comingSoon?: boolean
  onPress?: () => void
  testID?: string
}

const s = StyleSheet.create({
  card: { padding: spacing[4], marginBottom: spacing[3], borderRadius: 10, borderWidth: 1, borderColor: colors.gray100, backgroundColor: colors.white },
  disabled: { opacity: 0.5 },
  header: { flexDirection: 'row', alignItems: 'center', marginBottom: spacing[2] },
  icon: { marginRight: spacing[3] },
  texts: { flex: 1 },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: spacing[2] },
})

function Inner({ titleKey, descriptionKey, amountLabel, iconName, disabled, comingSoon, onPress, testID }: RedemptionOptionCardProps) {
  const { t } = useTranslation()
  return (
    <TouchableOpacity
      style={[s.card, disabled ? s.disabled : undefined]}
      onPress={disabled ? undefined : onPress}
      disabled={disabled}
      testID={testID ?? 'redemption-option-card'}
      accessibilityRole="button"
      accessibilityState={{ disabled: !!disabled }}
    >
      <View style={s.header}>
        <Ionicons name={iconName} size={componentSizes.icon.lg} color={disabled ? colors.gray400 : colors.primary} style={s.icon} />
        <View style={s.texts}>
          <AppText variant="body" weight="semibold" color={disabled ? colors.gray400 : colors.textPrimary}>{t(titleKey)}</AppText>
          <AppText variant="caption" color={colors.textSecondary}>{t(descriptionKey)}</AppText>
        </View>
      </View>
      <View style={s.row}>
        <AppText variant="body" weight="bold" color={disabled ? colors.gray400 : colors.primary}>{amountLabel}</AppText>
        {comingSoon ? <AppBadge label={t('common.coming_soon')} variant="warning" /> : null}
      </View>
    </TouchableOpacity>
  )
}

export const RedemptionOptionCard = React.memo(Inner)
RedemptionOptionCard.displayName = 'RedemptionOptionCard'
export default RedemptionOptionCard
