/**
 * AppDivider Component
 * Layer 1 - Primitive Component
 *
 * Purpose: Visual separator line between sections
 * Usage: <AppDivider variant="solid" marginVertical={12} />
 *
 * Variants:
 * - solid: Continuous line
 * - dashed: Dashed pattern
 * - dotted: Dotted pattern
 */

import React from 'react'
import { View, ViewStyle } from 'react-native'
import { colors, spacing, borderWidth } from '@constants/tokens'

export type DividerVariant = 'solid' | 'dashed' | 'dotted'
export type DividerOrientation = 'horizontal' | 'vertical'

export interface AppDividerProps {
  /** Line style variant */
  variant?: DividerVariant
  /** Horizontal or vertical orientation */
  orientation?: DividerOrientation
  /** Line color */
  color?: string
  /** Line thickness (height for horizontal, width for vertical) */
  thickness?: number
  /** Vertical margin */
  marginVertical?: number
  /** Horizontal margin */
  marginHorizontal?: number
  /** Style overrides */
  style?: ViewStyle
}

// ============================================================================
// STYLES - Created once at module load (performance optimization)
// ============================================================================

const solidLine: ViewStyle = {
  backgroundColor: colors.gray200,
}

// Note: React Native doesn't support native dashed/dotted borders,
// so we'll use borderBottomWidth/borderBottomColor and borderStyle where supported
const dashedLine: ViewStyle = {
  borderBottomWidth: borderWidth.thin,
  borderBottomColor: colors.gray200,
  borderStyle: 'dashed',
}

const dottedLine: ViewStyle = {
  borderBottomWidth: borderWidth.thin,
  borderBottomColor: colors.gray200,
  borderStyle: 'dotted',
}

// ============================================================================
// COMPONENT
// ============================================================================

/**
 * AppDivider - Visual separator component for sections
 *
 * @example
 * // Horizontal solid divider
 * <AppDivider />
 *
 * // Custom color and spacing
 * <AppDivider color={colors.error} marginVertical={8} />
 *
 * // Vertical divider
 * <AppDivider orientation="vertical" thickness={2} marginHorizontal={8} />
 */
export const AppDivider: React.FC<AppDividerProps> = ({
  variant = 'solid',
  orientation = 'horizontal',
  color = colors.gray200,
  thickness = 1,
  marginVertical = spacing[3],
  marginHorizontal = 0,
  style,
}) => {
  // Determine variant style
  let variantStyle: ViewStyle = solidLine
  if (variant === 'dashed') {
    variantStyle = dashedLine
  } else if (variant === 'dotted') {
    variantStyle = dottedLine
  } else {
    // For solid, use backgroundColor
    variantStyle = { backgroundColor: color }
  }

  // Determine orientation
  let orientationStyle: ViewStyle
  if (orientation === 'vertical') {
    orientationStyle = {
      width: thickness,
      height: '100%',
      marginHorizontal,
      marginVertical: 0,
    }
  } else {
    orientationStyle = {
      height: thickness,
      width: '100%',
      marginVertical,
      marginHorizontal: 0,
    }
  }

  return <View style={[variantStyle, orientationStyle, style]} />
}

export default AppDivider
