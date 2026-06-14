/**
 * WarningThresholdField (US-012, T-09)
 * Integer field 0–100 for the credit warning threshold percentage.
 */

import React, { useCallback } from 'react'
import { View, StyleSheet } from 'react-native'
import { AppInput } from '@components/primitives/AppInput'
import { AppText } from '@components/primitives/AppText'
import { useTranslation } from '@hooks/useTranslation'
import { colors, spacing } from '@constants/tokens'

export interface WarningThresholdFieldProps {
  value: number | undefined
  onChange: (value: number | undefined) => void
  error?: string
  disabled?: boolean
}

const styles = StyleSheet.create({
  container: { marginBottom: spacing[3] },
  hint: { marginTop: spacing[1] },
})

export const WarningThresholdField: React.FC<WarningThresholdFieldProps> = ({
  value,
  onChange,
  error,
  disabled,
}) => {
  const { t } = useTranslation()

  const handleChange = useCallback(
    (text: string) => {
      if (text === '') {
        onChange(undefined)
        return
      }
      const parsed = parseInt(text, 10)
      if (!isNaN(parsed)) {
        onChange(Math.min(100, Math.max(0, parsed)))
      }
    },
    [onChange],
  )

  return (
    <View style={styles.container}>
      <AppInput
        label={t('credit.warning_threshold_label')}
        placeholder="80"
        value={value !== undefined ? String(value) : ''}
        onChangeText={handleChange}
        keyboardType="numeric"
        maxLength={3}
        editable={!disabled}
        error={error}
        testID="warning-threshold-input"
      />
      <AppText variant="caption" color={colors.textSecondary} style={styles.hint}>
        {t('credit.warning_threshold_hint')}
      </AppText>
    </View>
  )
}

WarningThresholdField.displayName = 'WarningThresholdField'
export default WarningThresholdField
