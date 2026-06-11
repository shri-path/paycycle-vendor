/**
 * AppInput Component
 * Layer 1 - Primitive Component
 *
 * Purpose: Flexible text input with labels, error messages, and icons
 * Usage: <AppInput label="Name" placeholder="Enter name" onChange={handleChange} />
 *
 * Features:
 * - Label and helper text support
 * - Left/right icon slots
 * - Prefix and suffix (e.g., currency, units)
 * - Clear button for input
 * - Error state with message
 */

import React from 'react'
import {
  View,
  Animated,
  TextInput,
  StyleSheet,
  ViewStyle,
  TextInputProps,
  TouchableOpacity,
  TextStyle,
} from 'react-native'
import { AppText } from './AppText'
import { useFocusRing, inputOutlineReset } from '@hooks/useFocusRing'
import { colors, spacing, borderRadius, fontSize, componentSizes, borderWidth, interaction } from '@constants/tokens'

export interface AppInputProps extends TextInputProps {
  /** Label text displayed above input */
  label?: string
  /** Error message displayed below input */
  error?: string
  /** Helper text displayed below input (when no error) */
  helperText?: string
  /** Icon to display on the left */
  leftIcon?: React.ReactNode
  /** Icon to display on the right */
  rightIcon?: React.ReactNode
  /** Prefix text (e.g., "₹") */
  prefix?: string
  /** Suffix text (e.g., "kg") */
  suffix?: string
  /** Show clear button */
  clearable?: boolean
  /** Called when clear button is pressed */
  onClear?: () => void
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
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: borderWidth.thin,
    borderColor: colors.gray200,
    borderRadius: borderRadius.md,
    paddingHorizontal: spacing[3],
    backgroundColor: colors.white,
    minHeight: componentSizes.input.md,
  },
  inputWrapperError: {
    borderColor: colors.error,
  },
  inputWrapperDisabled: {
    backgroundColor: colors.gray50,
    borderColor: colors.gray300,
  },
  iconWrapper: {
    width: componentSizes.icon.md,
    height: componentSizes.icon.md,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: spacing[2],
  },
  rightIconWrapper: {
    marginRight: 0,
    marginLeft: spacing[2],
  },
  affixText: {
    fontSize: fontSize.base,
    color: colors.textSecondary,
    marginHorizontal: spacing[1],
  },
  input: {
    flex: 1,
    fontSize: fontSize.base,
    color: colors.textPrimary,
    paddingVertical: spacing[2],
    paddingHorizontal: 0,
  },
  inputDisabled: {
    color: colors.gray400,
  },
  helperText: {
    marginTop: spacing[1],
  },
  helperTextError: {
    color: colors.error,
  },
  helperTextNormal: {
    color: colors.textSecondary,
  },
  clearButton: {
    padding: spacing[1],
  },
})

// ============================================================================
// COMPONENT
// ============================================================================

/**
 * AppInput - Flexible text input component with support for labels, icons, and error states
 *
 * @example
 * // Basic input
 * <AppInput label="Name" placeholder="Enter name" />
 *
 * // Input with icon and clear button
 * <AppInput
 *   label="Search"
 *   placeholder="Search customers"
 *   leftIcon={<SearchIcon />}
 *   clearable
 *   onClear={() => setSearchText('')}
 * />
 *
 * // Currency input with error
 * <AppInput
 *   label="Amount"
 *   prefix="₹"
 *   error="Invalid amount"
 *   keyboardType="numeric"
 * />
 */
export const AppInput: React.FC<AppInputProps> = ({
  label,
  error,
  helperText,
  leftIcon,
  rightIcon,
  prefix,
  suffix,
  clearable = false,
  onClear,
  containerStyle,
  style,
  placeholderTextColor,
  value,
  editable = true,
  testID,
  ...props
}) => {
  const { onFocus, onBlur, focusRingStyle } = useFocusRing({
    error: !!error,
    disabled: !editable,
  })

  const inputStyle: TextStyle = {
    ...styles.input,
    ...inputOutlineReset,
    ...(!editable && styles.inputDisabled),
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
          styles.inputWrapper,
          error && styles.inputWrapperError,
          !editable && styles.inputWrapperDisabled,
          focusRingStyle,
        ]}
      >
        {leftIcon && (
          <View style={styles.iconWrapper}>
            {leftIcon}
          </View>
        )}

        {prefix && (
          <AppText variant="body" color={colors.textSecondary} style={styles.affixText}>
            {prefix}
          </AppText>
        )}

        <TextInput
          {...props}
          testID={testID}
          value={value}
          editable={editable}
          style={[inputStyle, style]}
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

        {suffix && (
          <AppText variant="body" color={colors.textSecondary} style={styles.affixText}>
            {suffix}
          </AppText>
        )}

        {clearable && value && !rightIcon && (
          <TouchableOpacity
            style={[styles.iconWrapper, styles.rightIconWrapper]}
            onPress={() => {
              onClear?.()
              props.onChangeText?.('')
            }}
            hitSlop={interaction.defaultHitSlop}
            accessibilityRole="button"
            testID={testID ? `${testID}-clear` : undefined}
          >
            <AppText variant="body" color={colors.textSecondary}>
              ✕
            </AppText>
          </TouchableOpacity>
        )}

        {rightIcon && (
          <View style={[styles.iconWrapper, styles.rightIconWrapper]}>
            {rightIcon}
          </View>
        )}
      </Animated.View>

      {(error || helperText) && (
        <AppText
          variant="caption"
          testID={testID ? `${testID}-error` : undefined}
          style={styles.helperText}
          color={error ? colors.error : colors.textSecondary}
          accessibilityLiveRegion={error ? 'polite' : 'none'}
        >
          {error || helperText}
        </AppText>
      )}
    </View>
  )
}

AppInput.displayName = 'AppInput'

export default AppInput
