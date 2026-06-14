/**
 * TemplateLanguageTabs Component (US-013)
 * Purpose: Horizontal scrollable pill row for selecting template language.
 * Shows nativeLabel for each of the 9 supported languages.
 */

import React, { memo } from 'react'
import { ScrollView, Pressable, StyleSheet } from 'react-native'
import { AppText } from '@components/primitives/AppText'
import { SUPPORTED_LANGUAGES } from '@locales/index'
import { colors, spacing, borderRadius } from '@constants/tokens'
import type { SupportedLanguage } from '@locales/index'

interface Props {
  selected: SupportedLanguage
  onSelect(lang: SupportedLanguage): void
  testID?: string
}

export const TemplateLanguageTabs = memo(function TemplateLanguageTabs({
  selected,
  onSelect,
  testID,
}: Props) {
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.container}
      testID={testID}
    >
      {SUPPORTED_LANGUAGES.map((lang) => {
        const isSelected = lang.code === selected
        return (
          <Pressable
            key={lang.code}
            onPress={() => onSelect(lang.code)}
            accessibilityRole="tab"
            accessibilityState={{ selected: isSelected }}
            accessibilityLabel={lang.nativeLabel}
            style={[styles.tab, isSelected && styles.tabSelected]}
            testID={`template-lang-${lang.code}`}
          >
            <AppText
              variant="caption"
              weight={isSelected ? 'semibold' : 'regular'}
              color={isSelected ? colors.primary : colors.textSecondary}
            >
              {lang.nativeLabel}
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
    paddingVertical: spacing[2],
    gap: spacing[2],
  },
  tab: {
    paddingHorizontal: spacing[4],
    paddingVertical: spacing[2],
    borderRadius: borderRadius.full,
    backgroundColor: colors.gray100,
    minHeight: 36,
    justifyContent: 'center',
  },
  tabSelected: {
    backgroundColor: colors.primaryBg,
    borderWidth: 1,
    borderColor: colors.primary,
  },
})

export default TemplateLanguageTabs
