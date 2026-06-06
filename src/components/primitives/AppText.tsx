/**
 * AppText Component
 * Layer 1 - Primitive Component
 *
 * Purpose: Base text component with semantic variants and flexible styling
 * Usage: <AppText variant="h1" color="$textPrimary">Title</AppText>
 *
 * Variants:
 * - h1, h2, h3, h4: Heading variants (largest to smallest)
 * - body: Default body text
 * - subtitle: Subheading text (smaller than body)
 * - caption: Small auxiliary text
 * - label: Form labels and small emphasized text
 * - overline: All-caps small text
 */

import React from 'react'
import { Text, TextProps, StyleSheet, TextStyle } from 'react-native'
import { colors, fontSize, lineHeight, fontWeight } from '@constants/tokens'

export type TextVariant =
  | 'h1'
  | 'h2'
  | 'h3'
  | 'h4'
  | 'body'
  | 'subtitle'
  | 'caption'
  | 'label'
  | 'overline'

export interface AppTextProps extends TextProps {
  /** Typography variant - determines size and weight */
  variant?: TextVariant
  /** Text color - supports token names or hex values */
  color?: string
  /** Font weight override */
  weight?: 'regular' | 'medium' | 'semibold' | 'bold'
  /** Text alignment */
  align?: 'left' | 'center' | 'right'
  /** Child content */
  children: React.ReactNode
}

// ============================================================================
// STYLES - Created once at module load (performance optimization)
// ============================================================================

const baseStyle: TextStyle = {}

const variantStyles = StyleSheet.create({
  h1: {
    fontSize: fontSize['4xl'],
    fontWeight: fontWeight.bold,
    lineHeight: lineHeight['4xl'],
  },
  h2: {
    fontSize: fontSize['3xl'],
    fontWeight: fontWeight.bold,
    lineHeight: lineHeight['3xl'],
  },
  h3: {
    fontSize: fontSize['2xl'],
    fontWeight: fontWeight.semibold,
    lineHeight: lineHeight['2xl'],
  },
  h4: {
    fontSize: fontSize.xl,
    fontWeight: fontWeight.semibold,
    lineHeight: lineHeight.xl,
  },
  body: {
    fontSize: fontSize.base,
    fontWeight: fontWeight.regular,
    lineHeight: lineHeight.base,
  },
  subtitle: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.medium,
    lineHeight: lineHeight.sm,
  },
  caption: {
    fontSize: fontSize.xs,
    fontWeight: fontWeight.regular,
    lineHeight: lineHeight.xs,
  },
  label: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.medium,
    lineHeight: lineHeight.sm,
  },
  overline: {
    fontSize: fontSize.xs,
    fontWeight: fontWeight.semibold,
    lineHeight: lineHeight.xs,
    textTransform: 'uppercase',
  },
})

const weightStyles = StyleSheet.create({
  regular: { fontWeight: fontWeight.regular },
  medium: { fontWeight: fontWeight.medium },
  semibold: { fontWeight: fontWeight.semibold },
  bold: { fontWeight: fontWeight.bold },
})

const alignStyles = StyleSheet.create({
  left: { textAlign: 'left' },
  center: { textAlign: 'center' },
  right: { textAlign: 'right' },
})

// ============================================================================
// COMPONENT
// ============================================================================

/**
 * AppText - Semantic text component with predefined variants
 *
 * @example
 * // Heading
 * <AppText variant="h1">Welcome</AppText>
 *
 * // Body text with custom color
 * <AppText variant="body" color={colors.textSecondary}>
 *   Hello world
 * </AppText>
 *
 * // Emphasized label
 * <AppText variant="label" weight="bold">
 *   Required
 * </AppText>
 */
export const AppText: React.FC<AppTextProps> = ({
  variant = 'body',
  color,
  weight,
  align,
  style,
  children,
  ...props
}) => {
  // Determine color - use provided color or variant default
  let textColor = color
  if (!textColor) {
    // Set semantic defaults based on variant
    if (variant === 'caption' || variant === 'subtitle') {
      textColor = colors.textSecondary
    } else {
      textColor = colors.textPrimary
    }
  }

  return (
    <Text
      {...props}
      allowFontScaling={false}
      style={[
        baseStyle,
        variantStyles[variant],
        weight && weightStyles[weight],
        align && alignStyles[align],
        { color: textColor },
        style,
      ]}
    >
      {children}
    </Text>
  )
}

export default AppText
