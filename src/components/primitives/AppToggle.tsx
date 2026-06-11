/**
 * AppToggle Component
 * Layer 1 - Primitive Component
 *
 * Purpose: On/Off switch toggle for boolean states
 * Usage: <AppToggle label="Enable feature" value={enabled} onChange={setEnabled} />
 *
 * Features:
 * - Animated toggle switch
 * - Label with optional description
 * - Disabled state
 * - Custom colors
 * - Sizes (small, medium, large)
 */

import React, { useRef, useEffect } from 'react'
import {
  View,
  TouchableOpacity,
  Animated,
  StyleSheet,
  ViewStyle,
  I18nManager,
} from 'react-native'
import { AppText } from './AppText'
import { useReducedMotion } from '@hooks/useReducedMotion'
import { colors, spacing, fontWeight, componentSizes, animation, shadows } from '@constants/tokens'

export type ToggleSize = 'sm' | 'md' | 'lg'

export interface AppToggleProps {
  /** Toggle label text */
  label?: string
  /** Description text below label */
  description?: string
  /** Whether toggle is on */
  value?: boolean
  /** Callback when toggle changes */
  onChange?: (value: boolean) => void
  /** Disable the toggle */
  disabled?: boolean
  /** Toggle size */
  size?: ToggleSize
  /** Active color when on */
  activeColor?: string
  /** Inactive color when off */
  inactiveColor?: string
  /** Container style override */
  containerStyle?: ViewStyle
}

// ============================================================================
// STYLES - Created once at module load (performance optimization)
// ============================================================================

const sizeConfig = componentSizes.toggle

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: spacing[2],
  },
  labelContainer: {
    flex: 1,
  },
  label: {
    fontWeight: fontWeight.medium,
  },
  description: {
    marginTop: spacing[0],
  },
  labelDisabled: {
    color: colors.gray400,
  },
  toggleSwitch: {
    justifyContent: 'center',
    borderRadius: sizeConfig.md.height / 2,
    marginLeft: spacing[3],
  },
  toggleThumb: {
    position: 'absolute',
    width: sizeConfig.md.thumb,
    height: sizeConfig.md.thumb,
    borderRadius: sizeConfig.md.thumb / 2,
    backgroundColor: colors.white,
    ...shadows.sm,
  },
})

// ============================================================================
// COMPONENT
// ============================================================================

/**
 * AppToggle - Animated toggle switch component
 *
 * @example
 * // Basic toggle
 * <AppToggle
 *   label="Enable notifications"
 *   value={enabled}
 *   onChange={setEnabled}
 * />
 *
 * // With description
 * <AppToggle
 *   label="Dark mode"
 *   description="Use dark theme"
 *   value={darkMode}
 *   onChange={setDarkMode}
 * />
 *
 * // Large toggle with custom colors
 * <AppToggle
 *   label="Feature active"
 *   value={featureActive}
 *   onChange={setFeatureActive}
 *   size="lg"
 *   activeColor={colors.success}
 * />
 *
 * // Disabled toggle
 * <AppToggle
 *   label="Unavailable option"
 *   value={false}
 *   disabled
 * />
 */
export const AppToggle: React.FC<AppToggleProps> = ({
  label,
  description,
  value = false,
  onChange,
  disabled = false,
  size = 'md',
  activeColor = colors.primary,
  inactiveColor = colors.gray300,
  containerStyle,
}) => {
  const animatedValue = useRef(new Animated.Value(value ? 1 : 0)).current
  const config = sizeConfig[size]
  const reduceMotion = useReducedMotion()

  useEffect(() => {
    const toValue = value ? 1 : 0
    if (reduceMotion) {
      // Respect the OS "Reduce Motion" preference — jump straight to the state.
      animatedValue.setValue(toValue)
      return
    }
    Animated.timing(animatedValue, {
      toValue,
      duration: animation.duration.base,
      useNativeDriver: false,
    }).start()
  }, [value, animatedValue, reduceMotion])

  const handlePress = () => {
    if (!disabled && onChange) {
      onChange(!value)
    }
  }

  // Resting (off) and active (on) thumb positions. Mirror them for RTL so the
  // thumb sits at the start edge when off, regardless of layout direction.
  const offX = spacing[1]
  const onX = config.width - config.thumb - spacing[1]
  const thumbTranslateX = animatedValue.interpolate({
    inputRange: [0, 1],
    outputRange: I18nManager.isRTL ? [onX, offX] : [offX, onX],
  })

  const backgroundColor = animatedValue.interpolate({
    inputRange: [0, 1],
    outputRange: [inactiveColor, activeColor],
  })

  const toggleStyle: ViewStyle = {
    width: config.width,
    height: config.height,
    borderRadius: config.height / 2,
  }

  return (
    <TouchableOpacity
      onPress={handlePress}
      disabled={disabled}
      activeOpacity={1}
      style={[styles.container, containerStyle]}
      accessibilityRole="switch"
      accessibilityLabel={label}
      accessibilityState={{ checked: value, disabled }}
    >
      {(label || description) && (
        <View style={styles.labelContainer}>
          {label && (
            <AppText
              variant="body"
              style={[styles.label, disabled && styles.labelDisabled]}
            >
              {label}
            </AppText>
          )}

          {description && (
            <AppText
              variant="caption"
              style={[styles.description, disabled && styles.labelDisabled]}
              color={disabled ? colors.gray400 : colors.textSecondary}
            >
              {description}
            </AppText>
          )}
        </View>
      )}

      <Animated.View
        style={[
          toggleStyle,
          styles.toggleSwitch,
          {
            backgroundColor: disabled ? colors.gray200 : backgroundColor,
          },
        ]}
      >
        <Animated.View
          style={[
            styles.toggleThumb,
            {
              width: config.thumb,
              height: config.thumb,
              borderRadius: config.thumb / 2,
              transform: [{ translateX: thumbTranslateX }],
            },
          ]}
        />
      </Animated.View>
    </TouchableOpacity>
  )
}

export default AppToggle
