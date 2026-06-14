/**
 * TemplateEditor Component (US-013)
 * Purpose: Multiline text input with live placeholder validation.
 * Highlights invalid tokens. Exposes insert(token) via ref.
 * Validation is debounced client-side; errors show inline.
 */

import React, { memo, useRef, forwardRef, useImperativeHandle, useState, useCallback } from 'react'
import { TextInput, View, StyleSheet } from 'react-native'
import { AppText } from '@components/primitives/AppText'
import { useTranslation } from '@hooks/useTranslation'
import { colors, spacing, borderRadius } from '@constants/tokens'
import { validatePlaceholders } from '../service/templatePlaceholders'
import type { TemplateType } from '../../../types/voice'

export interface TemplateEditorRef {
  insertToken(token: string): void
  getValue(): string
  getInvalidTokens(): string[]
}

interface Props {
  templateType: TemplateType
  initialValue?: string
  onChangeText?(value: string): void
  testID?: string
}

export const TemplateEditor = memo(
  forwardRef<TemplateEditorRef, Props>(function TemplateEditor(
    { templateType, initialValue = '', onChangeText, testID },
    ref,
  ) {
    const { t } = useTranslation()
    const inputRef = useRef<TextInput>(null)
    const [value, setValue] = useState(initialValue)
    const [invalidTokens, setInvalidTokens] = useState<string[]>([])
    const debounceTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

    const validate = useCallback(
      (text: string) => {
        const invalid = validatePlaceholders(text, templateType)
        setInvalidTokens(invalid)
      },
      [templateType],
    )

    const handleChange = useCallback(
      (text: string) => {
        setValue(text)
        onChangeText?.(text)
        if (debounceTimer.current) clearTimeout(debounceTimer.current)
        debounceTimer.current = setTimeout(() => validate(text), 400)
      },
      [onChangeText, validate],
    )

    useImperativeHandle(ref, () => ({
      insertToken(token: string) {
        setValue((prev) => {
          const next = prev + token
          onChangeText?.(next)
          validate(next)
          return next
        })
      },
      getValue() {
        return value
      },
      getInvalidTokens() {
        return invalidTokens
      },
    }))

    const hasErrors = invalidTokens.length > 0

    return (
      <View testID={testID}>
        <TextInput
          ref={inputRef}
          value={value}
          onChangeText={handleChange}
          multiline
          numberOfLines={6}
          textAlignVertical="top"
          placeholder={t('templates.editor_placeholder')}
          placeholderTextColor={colors.gray400}
          style={[styles.input, hasErrors && styles.inputError]}
          testID={`${testID ?? 'template-editor'}-input`}
          accessibilityLabel={t('templates.editor_placeholder')}
        />
        {hasErrors ? (
          <View style={styles.errorContainer}>
            <AppText variant="caption" color={colors.error}>
              {t('templates.invalid_tokens', { tokens: invalidTokens.map((tk) => `{{${tk}}}`).join(', ') })}
            </AppText>
          </View>
        ) : null}
      </View>
    )
  }),
)

const styles = StyleSheet.create({
  input: {
    marginHorizontal: spacing[4],
    padding: spacing[3],
    borderWidth: 1,
    borderColor: colors.gray300,
    borderRadius: borderRadius.md,
    minHeight: 120,
    backgroundColor: colors.surface,
    color: colors.textPrimary,
    fontSize: 14,
    lineHeight: 20,
  },
  inputError: {
    borderColor: colors.error,
  },
  errorContainer: {
    marginHorizontal: spacing[4],
    marginTop: spacing[1],
  },
})

export default TemplateEditor
