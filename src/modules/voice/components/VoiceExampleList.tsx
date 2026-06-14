/**
 * VoiceExampleList Component (US-013)
 * Purpose: Shows localized example voice commands the user can speak.
 * Content adapts to current appLanguage.
 */

import React, { memo } from 'react'
import { View, StyleSheet } from 'react-native'
import { AppText } from '@components/primitives/AppText'
import { useTranslation } from '@hooks/useTranslation'
import { colors, spacing } from '@constants/tokens'

export const VoiceExampleList = memo(function VoiceExampleList() {
  const { t } = useTranslation()

  const examples: string[] = [
    t('voice.example_mark_delivered'),
    t('voice.example_mark_all'),
    t('voice.example_single_customer'),
  ]

  return (
    <View style={styles.container}>
      <AppText variant="caption" weight="medium" color={colors.textSecondary} style={styles.heading}>
        {t('voice.examples_heading')}
      </AppText>
      {examples.map((ex, i) => (
        <View key={i} style={styles.row}>
          <AppText variant="caption" color={colors.textSecondary} style={styles.bullet}>
            {'•'}
          </AppText>
          <AppText variant="caption" color={colors.textSecondary} style={styles.example}>
            {ex}
          </AppText>
        </View>
      ))}
    </View>
  )
})

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: spacing[4],
    paddingVertical: spacing[3],
  },
  heading: {
    marginBottom: spacing[2],
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  row: {
    flexDirection: 'row',
    marginBottom: spacing[1],
  },
  bullet: {
    marginEnd: spacing[2],
    lineHeight: 20,
  },
  example: {
    flex: 1,
    fontStyle: 'italic',
    lineHeight: 20,
  },
})

export default VoiceExampleList
