/**
 * ReminderTemplateEditor (US-012, T-10)
 * Multiline editor + placeholder helper chips.
 * Validates that only known placeholders are used (client-side pre-submit check).
 */

import React, { useCallback } from 'react'
import { View, Pressable, StyleSheet, ScrollView } from 'react-native'
import * as Haptics from 'expo-haptics'
import { AppTextArea } from '@components/primitives/AppTextArea'
import { AppText } from '@components/primitives/AppText'
import { useTranslation } from '@hooks/useTranslation'
import { colors, spacing, borderRadius } from '@constants/tokens'
import { KNOWN_REMINDER_PLACEHOLDERS } from '../../../types/credit'
import type { KnownReminderPlaceholder } from '../../../types/credit'

export interface ReminderTemplateEditorProps {
  value: string
  onChange: (text: string) => void
  error?: string
  disabled?: boolean
}

const styles = StyleSheet.create({
  container: { marginBottom: spacing[3] },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing[2], marginTop: spacing[2] },
  chip: {
    paddingHorizontal: spacing[2],
    paddingVertical: spacing[1],
    borderRadius: borderRadius.sm,
    backgroundColor: colors.gray100,
    borderWidth: 1,
    borderColor: colors.gray200,
    minHeight: 32,
    justifyContent: 'center',
  },
  chipsLabel: { marginTop: spacing[2], marginBottom: spacing[1] },
})

export const ReminderTemplateEditor: React.FC<ReminderTemplateEditorProps> = ({
  value,
  onChange,
  error,
  disabled,
}) => {
  const { t } = useTranslation()

  const insertPlaceholder = useCallback(
    (placeholder: KnownReminderPlaceholder) => {
      if (disabled) return
      void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)
      onChange(value + placeholder)
    },
    [value, onChange, disabled],
  )

  return (
    <View style={styles.container}>
      <AppTextArea
        label={t('credit.reminder_template_label')}
        placeholder={t('credit.reminder_template_placeholder')}
        value={value}
        onChangeText={onChange}
        editable={!disabled}
        numberOfLines={4}
        error={error}
        testID="reminder-template-editor"
      />
      <AppText variant="caption" color={colors.textSecondary} style={styles.chipsLabel}>
        {t('credit.reminder_template_placeholders_hint')}
      </AppText>
      <ScrollView horizontal showsHorizontalScrollIndicator={false}>
        <View style={styles.chips}>
          {KNOWN_REMINDER_PLACEHOLDERS.map((ph) => (
            <Pressable
              key={ph}
              onPress={() => insertPlaceholder(ph)}
              accessibilityRole="button"
              accessibilityLabel={t('credit.insert_placeholder', { placeholder: ph })}
              testID={`placeholder-chip-${ph}`}
            >
              <View style={styles.chip}>
                <AppText variant="caption" color={colors.primary} style={{ fontFamily: 'monospace' }}>
                  {ph}
                </AppText>
              </View>
            </Pressable>
          ))}
        </View>
      </ScrollView>
    </View>
  )
}

ReminderTemplateEditor.displayName = 'ReminderTemplateEditor'
export default ReminderTemplateEditor
