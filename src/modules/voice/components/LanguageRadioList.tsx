/**
 * LanguageRadioList Component (US-013)
 * Purpose: 9-language radio list for selecting the app language.
 * Shows nativeLabel (script) + label (English) per language.
 * Accessible, ≥44pt touch targets.
 */

import React, { memo } from 'react'
import { View, Pressable, StyleSheet } from 'react-native'
import { AppText } from '@components/primitives/AppText'
import { SUPPORTED_LANGUAGES } from '@locales/index'
import { colors, spacing } from '@constants/tokens'
import type { SupportedLanguage } from '@locales/index'

interface Props {
  selected: SupportedLanguage
  onSelect(lang: SupportedLanguage): void
  testID?: string
}

export const LanguageRadioList = memo(function LanguageRadioList({
  selected,
  onSelect,
  testID,
}: Props) {
  return (
    <View testID={testID}>
      {SUPPORTED_LANGUAGES.map((lang) => {
        const isSelected = lang.code === selected
        return (
          <Pressable
            key={lang.code}
            onPress={() => onSelect(lang.code)}
            accessibilityRole="radio"
            accessibilityState={{ checked: isSelected }}
            accessibilityLabel={`${lang.nativeLabel} (${lang.label})`}
            style={styles.row}
            testID={`lang-radio-${lang.code}`}
          >
            <View style={[styles.radioOuter, isSelected && styles.radioOuterSelected]}>
              {isSelected && <View style={styles.radioInner} />}
            </View>
            <View style={styles.labels}>
              <AppText variant="body" weight={isSelected ? 'semibold' : 'regular'}>
                {lang.nativeLabel}
              </AppText>
              <AppText variant="caption" color={colors.textSecondary}>
                {lang.label}
              </AppText>
            </View>
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
    borderColor: colors.gray300 ?? '#CBD5E0',
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
  labels: {
    flex: 1,
  },
})

export default LanguageRadioList
