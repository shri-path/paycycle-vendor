/**
 * BillLanguageRadioGroup Component (US-013)
 * Purpose: Radio group for bill language default selection
 * (customer / my_language / english).
 */

import React, { memo } from 'react'
import { View, Pressable, StyleSheet } from 'react-native'
import { AppText } from '@components/primitives/AppText'
import { useTranslation } from '@hooks/useTranslation'
import { colors, spacing } from '@constants/tokens'
import { SUPPORTED_LANGUAGES } from '@locales/index'
import type { BillLanguageDefault, SupportedLanguage } from '../../../types/voice'

interface Props {
  selected: BillLanguageDefault
  onSelect(value: BillLanguageDefault): void
  currentAppLanguage: SupportedLanguage
  testID?: string
}

const OPTIONS: BillLanguageDefault[] = ['customer', 'my_language', 'english']

export const BillLanguageRadioGroup = memo(function BillLanguageRadioGroup({
  selected,
  onSelect,
  currentAppLanguage,
  testID,
}: Props) {
  const { t } = useTranslation()
  const appLangLabel =
    SUPPORTED_LANGUAGES.find((l) => l.code === currentAppLanguage)?.nativeLabel ?? currentAppLanguage

  function getLabel(opt: BillLanguageDefault): string {
    if (opt === 'customer') return t('language.bill_default_customer')
    if (opt === 'my_language') return t('language.bill_default_my_language', { lang: appLangLabel })
    return t('language.bill_default_english')
  }

  return (
    <View testID={testID}>
      {OPTIONS.map((opt) => {
        const isSelected = opt === selected
        return (
          <Pressable
            key={opt}
            onPress={() => onSelect(opt)}
            accessibilityRole="radio"
            accessibilityState={{ checked: isSelected }}
            accessibilityLabel={getLabel(opt)}
            style={styles.row}
            testID={`bill-lang-radio-${opt}`}
          >
            <View style={[styles.radioOuter, isSelected && styles.radioOuterSelected]}>
              {isSelected && <View style={styles.radioInner} />}
            </View>
            <AppText
              variant="body"
              weight={isSelected ? 'semibold' : 'regular'}
              style={styles.label}
            >
              {getLabel(opt)}
            </AppText>
          </Pressable>
        )
      })}
    </View>
  )
})

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing[3],
    paddingHorizontal: spacing[4],
    minHeight: 44,
  },
  radioOuter: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    borderColor: colors.gray300,
    alignItems: 'center',
    justifyContent: 'center',
    marginEnd: spacing[3],
  },
  radioOuterSelected: {
    borderColor: colors.primary,
  },
  radioInner: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: colors.primary,
  },
  label: {
    flex: 1,
  },
})

export default BillLanguageRadioGroup
