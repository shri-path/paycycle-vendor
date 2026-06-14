/**
 * PlaceholderChips Component (US-013)
 * Purpose: Renders tappable token chips (e.g. {{customer_name}}).
 * Tapping a chip inserts the token text at the cursor position.
 * onInsert() receives the token string so the editor can append/insert it.
 */

import React, { memo } from 'react'
import { View, Pressable, ScrollView, StyleSheet } from 'react-native'
import { AppText } from '@components/primitives/AppText'
import { useTranslation } from '@hooks/useTranslation'
import { colors, spacing, borderRadius } from '@constants/tokens'
import { TEMPLATE_PLACEHOLDERS } from '../service/templatePlaceholders'
import type { TemplateType } from '../../../types/voice'

interface Props {
  templateType: TemplateType
  onInsert(token: string): void
  invalidTokens?: string[]
  testID?: string
}

export const PlaceholderChips = memo(function PlaceholderChips({
  templateType,
  onInsert,
  invalidTokens = [],
  testID,
}: Props) {
  const { t } = useTranslation()
  const tokens = TEMPLATE_PLACEHOLDERS[templateType] ?? []

  if (tokens.length === 0) return null

  return (
    <View testID={testID}>
      <AppText variant="caption" color={colors.textSecondary} style={styles.heading}>
        {t('templates.insert_placeholder')}
      </AppText>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.row}
      >
        {tokens.map((token) => {
          const isInvalid = invalidTokens.includes(token)
          return (
            <Pressable
              key={token}
              onPress={() => onInsert(`{{${token}}}`)}
              accessibilityRole="button"
              accessibilityLabel={`${t('templates.insert_placeholder')} ${token}`}
              style={[styles.chip, isInvalid && styles.chipInvalid]}
              testID={`placeholder-chip-${token}`}
            >
              <AppText
                variant="caption"
                weight="medium"
                color={isInvalid ? colors.error : colors.primary}
              >
                {'{{'}
                {token}
                {'}}'}
              </AppText>
            </Pressable>
          )
        })}
      </ScrollView>
    </View>
  )
})

const styles = StyleSheet.create({
  heading: {
    paddingHorizontal: spacing[4],
    paddingTop: spacing[3],
    paddingBottom: spacing[1],
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  row: {
    paddingHorizontal: spacing[4],
    paddingBottom: spacing[3],
    gap: spacing[2],
  },
  chip: {
    paddingHorizontal: spacing[3],
    paddingVertical: spacing[1],
    borderRadius: borderRadius.sm,
    backgroundColor: colors.primaryBg,
    borderWidth: 1,
    borderColor: colors.primary + '40',
    minHeight: 32,
    justifyContent: 'center',
  },
  chipInvalid: {
    backgroundColor: colors.errorBg,
    borderColor: colors.error + '40',
  },
})

export default PlaceholderChips
