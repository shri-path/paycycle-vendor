/**
 * AppProgressBar Component
 * Layer 2 - Composite Component
 *
 * Purpose: Linear progress indicator showing completion status
 * Usage: <AppProgressBar value={75} max={100} label="75%" />
 *
 * Features:
 * - Customizable value and max
 * - Optional label
 * - Color variants (default, success, warning, error)
 * - Animated transitions
 * - Height customization
 */

import React, { useEffect, useRef } from 'react'
import {
  View,
  StyleSheet,
  ViewStyle,
  Animated,
} from 'react-native'
import { AppText } from '../primitives/AppText'
import { useReducedMotion } from '@hooks/useReducedMotion'
import { colors, spacing, borderRadius, componentSizes, animation } from '@constants/tokens'

export type ProgressVariant = 'default' | 'success' | 'warning' | 'error'

export interface AppProgressBarProps {
  /** Current progress value */
  value: number
  /** Maximum progress value */
  max?: number
  /** Optional label text */
  label?: string | React.ReactNode
  /** Progress bar variant */
  variant?: ProgressVariant
  /** Height of the progress bar */
  height?: number
  /** Animated transition */
  animated?: boolean
  /** Container style override */
  containerStyle?: ViewStyle
}

// ============================================================================
// STYLES - Created once at module load (performance optimization)
// ============================================================================

const getVariantColor = (variant: ProgressVariant): string => {
  switch (variant) {
    case 'success':
      return colors.success
    case 'warning':
      return colors.warning
    case 'error':
      return colors.error
    default:
      return colors.primary
  }
}

const styles = StyleSheet.create({
  container: {
    marginBottom: spacing[3],
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing[2],
  },
  barContainer: {
    backgroundColor: colors.gray100,
    borderRadius: borderRadius.sm,
    overflow: 'hidden',
  },
  bar: {
    height: componentSizes.progressBar,
    borderRadius: borderRadius.sm,
  },
})

// ============================================================================
// COMPONENT
// ============================================================================

/**
 * AppProgressBar - Linear progress indicator
 *
 * @example
 * // Basic progress bar
 * <AppProgressBar
 *   value={50}
 *   max={100}
 * />
 *
 * // With label and variant
 * <AppProgressBar
 *   value={75}
 *   max={100}
 *   label="75%"
 *   variant="success"
 * />
 *
 * // Custom height
 * <AppProgressBar
 *   value={100}
 *   max={100}
 *   label="Complete"
 *   height={12}
 *   variant="success"
 * />
 */
export const AppProgressBar: React.FC<AppProgressBarProps> = ({
  value,
  max = 100,
  label,
  variant = 'default',
  height = componentSizes.progressBar,
  animated = true,
  containerStyle,
}) => {
  const animatedValue = useRef(new Animated.Value(0)).current
  const percentage = Math.min((value / max) * 100, 100)
  const reduceMotion = useReducedMotion()

  useEffect(() => {
    // Skip the tween when animation is disabled or the user prefers reduced motion.
    if (animated && !reduceMotion) {
      Animated.timing(animatedValue, {
        toValue: percentage,
        duration: animation.duration.slow,
        useNativeDriver: false,
      }).start()
    } else {
      animatedValue.setValue(percentage)
    }
  }, [percentage, animated, animatedValue, reduceMotion])

  const barWidth = animatedValue.interpolate({
    inputRange: [0, 100],
    outputRange: ['0%', '100%'],
  })

  const variantColor = getVariantColor(variant)

  return (
    <View style={[styles.container, containerStyle]}>
      {label && (
        <View style={styles.header}>
          {typeof label === 'string' ? (
            <AppText variant="caption" color={colors.textSecondary}>
              {label}
            </AppText>
          ) : (
            label
          )}
        </View>
      )}

      <View
        style={[
          styles.barContainer,
          { height },
        ]}
        accessibilityRole="progressbar"
        accessibilityValue={{ min: 0, max, now: value }}
      >
        <Animated.View
          style={[
            styles.bar,
            {
              width: barWidth,
              height,
              backgroundColor: variantColor,
            },
          ]}
        />
      </View>
    </View>
  )
}

export default AppProgressBar
