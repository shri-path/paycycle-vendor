/**
 * TemplateTypeSelector Component (US-013)
 * Purpose: Segmented control / radio group to pick one of 4 template types
 * (greeting / payment_reminder / delivery_update / collection_notice).
 */

import React, { memo } from 'react'
import { Pressable, ScrollView, StyleSheet } from 'react-native'
import { AppText } from '@components/primitives/AppText'
import { useTranslation } from '@hooks/useTranslation'
import { colors, spacing, borderRadius } from '@constants/tokens'
import type { TemplateType } from '../../../types/voice'

const TYPES: TemplateType[] = [
  'payment_reminder',
  'monthly_bill',
  'delivery_confirmation',
  'leave_confirmation',
]

interface Props {
  selected: TemplateType
  onSelect(type: TemplateType): void
  testID?: string
}

export const TemplateTypeSelector = memo(function TemplateTypeSelector({
  selected,
  onSelect,
  testID,
}: Props) {
  const { t } = useTranslation()

  const labelKey: Record<TemplateType, string> = {
    payment_reminder: 'templates.type_payment_reminder',
    monthly_bill: 'templates.type_monthly_bill',
    delivery_confirmation: 'templates.type_delivery_confirmation',
    leave_confirmation: 'templates.type_leave_confirmation',
  }

  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.container}
      testID={testID}
    >
      {TYPES.map((type) => {
        const isSelected = type === selected
        return (
          <Pressable
            key={type}
            onPress={() => onSelect(type)}
            accessibilityRole="radio"
            accessibilityState={{ checked: isSelected }}
            accessibilityLabel={t(labelKey[type])}
            style={[styles.chip, isSelected && styles.chipSelected]}
            testID={`template-type-${type}`}
          >
            <AppText
              variant="caption"
              weight={isSelected ? 'semibold' : 'regular'}
              color={isSelected ? colors.white : colors.textPrimary}
            >
              {t(labelKey[type])}
            </AppText>
          </Pressable>
        )
      })}
    </ScrollView>
  )
})

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: spacing[4],
    paddingVertical: spacing[3],
    gap: spacing[2],
  },
  chip: {
    paddingHorizontal: spacing[4],
    paddingVertical: spacing[2],
    borderRadius: borderRadius.full,
    borderWidth: 1,
    borderColor: colors.gray300,
    backgroundColor: colors.surface,
    minHeight: 36,
    justifyContent: 'center',
  },
  chipSelected: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
})

export default TemplateTypeSelector
