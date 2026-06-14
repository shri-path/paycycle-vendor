/**
 * PreferenceToggleCard Component (US-013)
 * Purpose: Labeled switch card for boolean language preferences
 * (voice commands, voice responses, transliteration).
 */

import React, { memo } from 'react'
import { View, Switch, StyleSheet } from 'react-native'
import { AppText } from '@components/primitives/AppText'
import { colors, spacing } from '@constants/tokens'

interface Props {
  label: string
  description?: string
  value: boolean
  onValueChange(value: boolean): void
  disabled?: boolean
  testID?: string
}

export const PreferenceToggleCard = memo(function PreferenceToggleCard({
  label,
  description,
  value,
  onValueChange,
  disabled = false,
  testID,
}: Props) {
  return (
    <View style={styles.container} testID={testID} accessibilityRole="switch">
      <View style={styles.textContainer}>
        <AppText variant="body" weight="medium" color={disabled ? colors.textSecondary : colors.textPrimary}>
          {label}
        </AppText>
        {description ? (
          <AppText variant="caption" color={colors.textSecondary} style={styles.desc}>
            {description}
          </AppText>
        ) : null}
      </View>
      <Switch
        value={value}
        onValueChange={onValueChange}
        disabled={disabled}
        trackColor={{ false: colors.gray300, true: colors.primaryLight }}
        thumbColor={value ? colors.white : colors.gray100}
        accessibilityLabel={label}
        testID={`${testID ?? 'toggle'}-switch`}
      />
    </View>
  )
})

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing[3],
    paddingHorizontal: spacing[4],
    backgroundColor: colors.surface,
    minHeight: 56,
  },
  textContainer: {
    flex: 1,
    paddingEnd: spacing[4],
  },
  desc: {
    marginTop: spacing[1],
  },
})

export default PreferenceToggleCard
