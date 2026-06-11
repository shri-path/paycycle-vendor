/**
 * AppTextArea Component
 * Layer 1 - Primitive Component
 *
 * Purpose: Multi-line text input for longer form content
 * Usage: <AppTextArea label="Description" placeholder="Enter details" value={text} onChange={setText} />
 *
 * Features:
 * - Label and helper text support
 * - Multiple lines with auto-expand
 * - Character count support
 * - Error state with message
 * - Disabled state
 */

import React from 'react'
import {
  View,
  Animated,
  TextInput,
  StyleSheet,
  ViewStyle,
  TextInputProps,
  TextStyle,
} from 'react-native'
import { AppText } from './AppText'
import { useFocusRing, inputOutlineReset } from '@hooks/useFocusRing'
import { colors, spacing, borderRadius, fontSize, componentSizes, borderWidth } from '@constants/tokens'

export interface AppTextAreaProps extends TextInputProps {
  /** Label text displayed above textarea */
  label?: string
  /** Error message displayed below textarea */
  error?: string
  /** Helper text displayed below textarea (when no error) */
  helperText?: string
  /** Maximum character count */
  maxLength?: number
  /** Show character counter */
  showCounter?: boolean
  /** Minimum number of lines */
  numberOfLines?: number
  /** Container style override */
  containerStyle?: ViewStyle
}

// ============================================================================
// STYLES - Created once at module load (performance optimization)
// ============================================================================

const styles = StyleSheet.create({
  container: {
    marginBottom: spacing[4],
  },
  labelText: {
    marginBottom: spacing[1],
  },
  textAreaWrapper: {
    borderWidth: borderWidth.thin,
    borderColor: colors.gray200,
    borderRadius: borderRadius.md,
    paddingHorizontal: spacing[3],
    paddingVertical: spacing[2],
    backgroundColor: colors.white,
    minHeight: componentSizes.textArea,
  },
  textAreaWrapperError: {
    borderColor: colors.error,
  },
  textAreaWrapperDisabled: {
    backgroundColor: colors.gray50,
    borderColor: colors.gray300,
  },
  textArea: {
    fontSize: fontSize.base,
    color: colors.textPrimary,
    textAlignVertical: 'top',
    paddingHorizontal: 0,
    paddingVertical: 0,
  },
  textAreaDisabled: {
    color: colors.gray400,
  },
  footerContainer: {
    marginTop: spacing[2],
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  helperText: {
    flex: 1,
  },
  helperTextError: {
    color: colors.error,
  },
  helperTextNormal: {
    color: colors.textSecondary,
  },
  counterText: {
    color: colors.textSecondary,
    marginLeft: spacing[2],
    textAlign: 'right',
  },
  counterTextWarning: {
    color: colors.warning,
  },
  counterTextError: {
    color: colors.error,
  },
})

// ============================================================================
// COMPONENT
// ============================================================================

/**
 * AppTextArea - Multi-line text input component
 *
 * @example
 * // Basic textarea
 * <AppTextArea
 *   label="Description"
 *   placeholder="Enter description"
 *   value={description}
 *   onChange={(e) => setDescription(e.nativeEvent.text)}
 * />
 *
 * // With character limit
 * <AppTextArea
 *   label="Notes"
 *   placeholder="Add notes"
 *   maxLength={500}
 *   showCounter
 *   value={notes}
 *   onChange={(e) => setNotes(e.nativeEvent.text)}
 * />
 *
 * // With error
 * <AppTextArea
 *   label="Feedback"
 *   value={feedback}
 *   onChange={(e) => setFeedback(e.nativeEvent.text)}
 *   error="Feedback is required"
 * />
 */
export const AppTextArea: React.FC<AppTextAreaProps> = ({
  label,
  error,
  helperText,
  maxLength,
  showCounter = false,
  numberOfLines = 5,
  containerStyle,
  style,
  value,
  editable = true,
  placeholderTextColor,
  ...props
}) => {
  const { onFocus, onBlur, focusRingStyle } = useFocusRing({
    error: !!error,
    disabled: !editable,
  })

  const charCount = String(value || '').length
  const charLimitPercentage = maxLength ? (charCount / maxLength) * 100 : 0

  let counterColor: string = colors.textSecondary
  if (charLimitPercentage > 90) {
    counterColor = colors.error
  } else if (charLimitPercentage > 75) {
    counterColor = colors.warning
  }

  const textAreaStyle: TextStyle = {
    ...styles.textArea,
    ...inputOutlineReset,
    ...(!editable && styles.textAreaDisabled),
  }

  return (
    <View style={[styles.container, containerStyle]}>
      {label && (
        <AppText variant="label" style={styles.labelText}>
          {label}
        </AppText>
      )}

      <Animated.View
        style={[
          styles.textAreaWrapper,
          error && styles.textAreaWrapperError,
          !editable && styles.textAreaWrapperDisabled,
          focusRingStyle,
        ]}
      >
        <TextInput
          {...props}
          value={value}
          editable={editable}
          style={[textAreaStyle, style]}
          numberOfLines={numberOfLines}
          multiline
          maxLength={maxLength}
          placeholderTextColor={placeholderTextColor || colors.textSecondary}
          onFocus={(e) => {
            onFocus()
            props.onFocus?.(e)
          }}
          onBlur={(e) => {
            onBlur()
            props.onBlur?.(e)
          }}
        />
      </Animated.View>

      {(error || helperText || showCounter) && (
        <View style={styles.footerContainer}>
          {(error || helperText) && (
            <AppText
              variant="caption"
              style={styles.helperText}
              color={error ? colors.error : colors.textSecondary}
            >
              {error || helperText}
            </AppText>
          )}

          {showCounter && maxLength && (
            <AppText
              variant="caption"
              style={[styles.counterText, { color: counterColor }]}
            >
              {charCount}/{maxLength}
            </AppText>
          )}
        </View>
      )}
    </View>
  )
}

export default AppTextArea
