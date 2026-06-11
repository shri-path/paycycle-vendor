/**
 * AppBadge Component
 * Layer 1 - Primitive Component
 *
 * Purpose: Status indicator badges for lists, cards, and records
 * Usage: <AppBadge label="Active" variant="success" />
 *
 * Variants:
 * - primary: Blue (default, informational)
 * - success: Green (positive states)
 * - warning: Orange (caution/pending)
 * - error: Red (error/failure)
 * - gray: Gray (neutral/inactive)
 *
 * Sizes: sm, md, lg
 */

import React from 'react'
import { View, StyleSheet, ViewStyle } from 'react-native'
import { AppText } from './AppText'
import { colors, spacing, borderRadius } from '@constants/tokens'

export type BadgeVariant = 'primary' | 'success' | 'warning' | 'error' | 'gray'
export type BadgeSize = 'sm' | 'md' | 'lg'

export interface AppBadgeProps {
  /** Badge label text */
  label: string
  /** Color variant */
  variant?: BadgeVariant
  /** Size variant */
  size?: BadgeSize
  /** Style overrides */
  style?: ViewStyle
}

// ============================================================================
// STYLES - Created once at module load (performance optimization)
// ============================================================================

const variantStyles = {
  primary: {
    backgroundColor: colors.primaryBg,
    color: colors.primary,
  },
  success: {
    backgroundColor: colors.successBg,
    color: colors.success,
  },
  warning: {
    backgroundColor: colors.warningBg,
    color: colors.warning,
  },
  error: {
    backgroundColor: colors.errorBg,
    color: colors.error,
  },
  gray: {
    backgroundColor: colors.gray100,
    color: colors.gray500,
  },
} as const

const sizeStyles = StyleSheet.create({
  sm: {
    paddingVertical: spacing[0],
    paddingHorizontal: spacing[1],
  },
  md: {
    paddingVertical: spacing[1],
    paddingHorizontal: spacing[2],
  },
  lg: {
    paddingVertical: spacing[1],
    paddingHorizontal: spacing[3],
  },
})

const badgeBaseStyle: ViewStyle = {
  borderRadius: borderRadius.xl,
  alignSelf: 'flex-start',
  justifyContent: 'center',
  alignItems: 'center',
}

// ============================================================================
// COMPONENT
// ============================================================================

/**
 * AppBadge - Status indicator component
 *
 * @example
 * // Success badge
 * <AppBadge label="Paid" variant="success" />
 *
 * // Warning badge
 * <AppBadge label="Pending" variant="warning" size="md" />
 *
 * // Error badge
 * <AppBadge label="Failed" variant="error" size="sm" />
 */
export const AppBadge: React.FC<AppBadgeProps> = ({
  label,
  variant = 'primary',
  size = 'md',
  style,
}) => {
  // Ensure variant is a valid key, fallback to 'primary' if not
  const validVariant = (variant && variant in variantStyles) ? variant : 'primary'
  const variantStyle = variantStyles[validVariant]
  const sizeStyle = sizeStyles[size]

  if (!variantStyle) {
    console.warn(`Invalid badge variant: ${variant}`)
    return null
  }

  const badgeStyle: ViewStyle = {
    ...badgeBaseStyle,
    backgroundColor: variantStyle.backgroundColor,
    ...sizeStyle,
  }

  return (
    <View style={[badgeStyle, style]} accessibilityRole="text" accessibilityLabel={label}>
      <AppText
        variant="caption"
        color={variantStyle.color}
        weight="semibold"
      >
        {label}
      </AppText>
    </View>
  )
}

export default AppBadge
