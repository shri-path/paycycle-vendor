/**
 * SuggestedLimitChips (US-012, T-09)
 * Chips for quick credit limit selection: ₹2,000 / ₹5,000 / ₹10,000.
 */

import React, { useCallback } from 'react'
import { View, Pressable, StyleSheet } from 'react-native'
import * as Haptics from 'expo-haptics'
import { AppText } from '@components/primitives/AppText'
import { formatCurrency } from '@utils/formatCurrency'
import { useTranslation } from '@hooks/useTranslation'
import { colors, spacing, borderRadius } from '@constants/tokens'

const SUGGESTED_LIMITS = [2000, 5000, 10000]

export interface SuggestedLimitChipsProps {
  selectedLimit: number | undefined
  onSelect: (limit: number) => void
  disabled?: boolean
}

const styles = StyleSheet.create({
  container: { marginBottom: spacing[3] },
  label: { marginBottom: spacing[2] },
  chips: { flexDirection: 'row', gap: spacing[2], flexWrap: 'wrap' },
  chip: {
    paddingHorizontal: spacing[3],
    paddingVertical: spacing[2],
    borderRadius: borderRadius.full,
    borderWidth: 1,
    borderColor: colors.gray200,
    backgroundColor: colors.white,
    minHeight: 44,
    justifyContent: 'center',
    alignItems: 'center',
  },
  chipSelected: {
    borderColor: colors.primary,
    backgroundColor: colors.primary + '15',
  },
  chipDisabled: { opacity: 0.5 },
})

export const SuggestedLimitChips: React.FC<SuggestedLimitChipsProps> = ({
  selectedLimit,
  onSelect,
  disabled,
}) => {
  const { t } = useTranslation()

  const handlePress = useCallback(
    (limit: number) => {
      if (disabled) return
      void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)
      onSelect(limit)
    },
    [disabled, onSelect],
  )

  return (
    <View style={styles.container}>
      <AppText variant="caption" color={colors.textSecondary} style={styles.label}>
        {t('credit.suggested_limits')}
      </AppText>
      <View style={styles.chips}>
        {SUGGESTED_LIMITS.map((limit) => {
          const isSelected = selectedLimit === limit
          return (
            <Pressable
              key={limit}
              onPress={() => handlePress(limit)}
              accessibilityRole="button"
              accessibilityState={{ selected: isSelected, disabled }}
              testID={`limit-chip-${limit}`}
            >
              <View style={[styles.chip, isSelected && styles.chipSelected, disabled && styles.chipDisabled]}>
                <AppText
                  variant="body"
                  weight={isSelected ? 'semibold' : 'regular'}
                  color={isSelected ? colors.primary : colors.textPrimary}
                >
                  {formatCurrency(limit)}
                </AppText>
              </View>
            </Pressable>
          )
        })}
      </View>
    </View>
  )
}

SuggestedLimitChips.displayName = 'SuggestedLimitChips'
export default SuggestedLimitChips
