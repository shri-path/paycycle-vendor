/**
 * AppCard Component
 * Layer 1 - Primitive Component
 *
 * Purpose: Flexible container component for list items, info boxes, and stats
 * Usage: <AppCard variant="elevated">Content</AppCard>
 *
 * Variants:
 * - default: Border style (1px border)
 * - elevated: Shadow style (elevation for depth)
 * - outlined: Minimal border only
 * - flat: No border or shadow (simple background)
 * - interactive: Slight background on focus/press
 */

import React from 'react'
import {
  View,
  StyleSheet,
  ViewStyle,
  ViewProps,
  TouchableOpacity,
  GestureResponderEvent,
} from 'react-native'
import { colors, spacing, borderRadius, shadows } from '@constants/tokens'

export type CardVariant = 'default' | 'elevated' | 'outlined' | 'flat' | 'interactive'

export interface AppCardProps extends ViewProps {
  /** Card content */
  children: React.ReactNode
  /** Callback when card is pressed (converts to TouchableOpacity) */
  onPress?: (event: GestureResponderEvent) => void
  /** Visual style variant */
  variant?: CardVariant
  /** Uniform padding */
  padding?: number
  /** Vertical padding override */
  paddingVertical?: number
  /** Horizontal padding override */
  paddingHorizontal?: number
  /** Style overrides */
  style?: ViewStyle
}

// ============================================================================
// STYLES - Created once at module load (performance optimization)
// ============================================================================

const variantStyles = StyleSheet.create({
  default: {
    backgroundColor: colors.white,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: colors.gray200,
  },
  elevated: {
    backgroundColor: colors.white,
    borderRadius: borderRadius.lg,
    ...shadows.md,
  },
  outlined: {
    backgroundColor: 'transparent',
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: colors.gray300,
  },
  flat: {
    backgroundColor: colors.gray50,
    borderRadius: borderRadius.lg,
    borderWidth: 0,
  },
  interactive: {
    backgroundColor: colors.white,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: colors.gray200,
  },
})

// ============================================================================
// COMPONENT
// ============================================================================

/**
 * AppCard - Flexible container component with multiple visual styles
 *
 * @example
 * // Basic card with border
 * <AppCard variant="default">
 *   Content here
 * </AppCard>
 *
 * // Elevated card with shadow
 * <AppCard variant="elevated" padding={12}>
 *   <AppText variant="h3">Card Title</AppText>
 * </AppCard>
 *
 * // Interactive/clickable card
 * <AppCard variant="elevated" onPress={handlePress}>
 *   <AppText>Tap to select</AppText>
 * </AppCard>
 */
export const AppCard: React.FC<AppCardProps> = ({
  children,
  onPress,
  variant = 'default',
  padding = spacing[4],
  paddingVertical,
  paddingHorizontal,
  style,
  ...props
}) => {
  const containerStyle: ViewStyle = {
    ...variantStyles[variant],
    padding: padding,
    paddingVertical: paddingVertical ?? padding,
    paddingHorizontal: paddingHorizontal ?? padding,
  }

  const content = (
    <View {...props} style={[containerStyle, style]}>
      {children}
    </View>
  )

  // If onPress is provided, wrap in TouchableOpacity for interactivity
  if (onPress) {
    return (
      <TouchableOpacity
        onPress={onPress}
        activeOpacity={0.7}
        style={[containerStyle, style]}
      >
        {children}
      </TouchableOpacity>
    )
  }

  return content
}

export default AppCard
