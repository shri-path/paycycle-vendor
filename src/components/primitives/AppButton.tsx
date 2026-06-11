/**
 * AppButton Component
 * Layer 1 - Primitive Component
 *
 * Purpose: Flexible button component with multiple variants and states
 * Usage: <AppButton label="Add" variant="primary" onPress={handleAdd} />
 *
 * Variants:
 * - primary: Filled with primary color (default, main actions)
 * - secondary: Outlined with primary color (secondary actions)
 * - danger: Filled with error color (destructive actions)
 * - outline: Outlined style (alternative to secondary)
 * - ghost: Minimal style (tertiary actions)
 * - link: Text-only style (inline actions)
 *
 * Sizes: sm, md, lg (default)
 */

import React from 'react'
import {
  TouchableOpacity,
  StyleSheet,
  ViewStyle,
  ActivityIndicator,
  View,
} from 'react-native'
import { AppText } from './AppText'
import { colors, spacing, borderRadius, componentSizes, borderWidth, animation } from '@constants/tokens'

export type ButtonVariant =
  | 'primary'
  | 'secondary'
  | 'danger'
  | 'outline'
  | 'ghost'
  | 'link'

export type ButtonSize = 'sm' | 'md' | 'lg'

export interface AppButtonProps {
  /** Button label text */
  label: string
  /** Callback when button is pressed */
  onPress: () => void
  /** Style variant */
  variant?: ButtonVariant
  /** Button size */
  size?: ButtonSize
  /** Disable button */
  disabled?: boolean
  /** Show loading indicator */
  loading?: boolean
  /** Icon before text */
  leftIcon?: React.ReactNode
  /** Icon after text */
  rightIcon?: React.ReactNode
  /** Full width button */
  fullWidth?: boolean
  /** Style overrides */
  style?: ViewStyle
  /** Test ID for e2e testing */
  testID?: string
  /**
   * Accessibility hint read by screen readers after the label — use to explain why
   * a button is disabled (e.g. "needs connection" on offline-disabled buttons).
   */
  accessibilityHint?: string
}

// ============================================================================
// STYLES - Created once at module load (performance optimization)
// ============================================================================

const sizeStyles = StyleSheet.create({
  sm: {
    paddingVertical: spacing[1],
    paddingHorizontal: spacing[2],
    borderRadius: borderRadius.sm,
  },
  md: {
    paddingVertical: spacing[2],
    paddingHorizontal: spacing[4],
    borderRadius: borderRadius.md,
  },
  lg: {
    paddingVertical: spacing[3],
    paddingHorizontal: spacing[5],
    borderRadius: borderRadius.md,
    minHeight: componentSizes.button.lg,
  },
})

const baseButtonStyle: ViewStyle = {
  justifyContent: 'center',
  alignItems: 'center',
  flexDirection: 'row',
  gap: spacing[1],
}

const iconSlotStyle: ViewStyle = {
  width: componentSizes.icon.md,
  height: componentSizes.icon.md,
}

// ============================================================================
// COMPONENT
// ============================================================================

/**
 * AppButton - Semantic button component with multiple variants
 *
 * @example
 * // Primary button
 * <AppButton label="Add" variant="primary" onPress={handleAdd} />
 *
 * // Secondary button
 * <AppButton label="Cancel" variant="secondary" onPress={handleCancel} />
 *
 * // Danger button with icon
 * <AppButton
 *   label="Delete"
 *   variant="danger"
 *   leftIcon={<DeleteIcon />}
 *   onPress={handleDelete}
 * />
 */
export const AppButton: React.FC<AppButtonProps> = ({
  label,
  onPress,
  variant = 'primary',
  size = 'lg',
  disabled = false,
  loading = false,
  leftIcon,
  rightIcon,
  fullWidth = false,
  style,
  testID,
  accessibilityHint,
}) => {
  let textColor: string = colors.white
  let backgroundColor: string | undefined

  if (disabled) {
    textColor = colors.gray400
    backgroundColor = colors.gray300
  } else {
    switch (variant) {
      case 'primary':
        textColor = colors.white
        backgroundColor = colors.primary
        break
      case 'secondary':
      case 'outline':
        textColor = colors.primary
        backgroundColor = undefined
        break
      case 'danger':
        textColor = colors.white
        backgroundColor = colors.error
        break
      case 'ghost':
        textColor = colors.primary
        backgroundColor = colors.gray50
        break
      case 'link':
        textColor = colors.primary
        backgroundColor = 'transparent'
        break
    }
  }

  let borderColor: string | undefined
  if ((variant === 'secondary' || variant === 'outline') && !disabled) {
    borderColor = colors.primary
  } else if ((variant === 'secondary' || variant === 'outline') && disabled) {
    borderColor = colors.gray300
  }

  const buttonStyle: ViewStyle = {
    ...baseButtonStyle,
    ...sizeStyles[size],
    backgroundColor,
    borderColor,
    borderWidth: variant === 'secondary' || variant === 'outline' ? borderWidth.medium : 0,
    opacity: disabled ? animation.opacity.disabled : 1,
    ...(fullWidth && { width: '100%' }),
  }

  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={disabled || loading}
      style={[buttonStyle, style]}
      activeOpacity={animation.opacity.active}
      testID={testID}
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled: disabled || loading }}
      accessibilityHint={accessibilityHint}
    >
      {leftIcon && !loading && (
        <View style={iconSlotStyle}>
          {leftIcon}
        </View>
      )}

      {loading ? (
        <ActivityIndicator color={textColor} size={size === 'sm' ? 'small' : 'small'} />
      ) : (
        <AppText
          variant={size === 'sm' ? 'caption' : 'label'}
          color={textColor}
          weight="semibold"
        >
          {label}
        </AppText>
      )}

      {rightIcon && !loading && (
        <View style={iconSlotStyle}>
          {rightIcon}
        </View>
      )}
    </TouchableOpacity>
  )
}

export default AppButton
