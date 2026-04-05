/**
 * AppIconButton Component
 * Layer 1 - Primitive Component
 *
 * Purpose: Icon-only button for compact UI elements
 * Usage: <AppIconButton icon={<CloseIcon />} onPress={handleClose} variant="secondary" />
 *
 * Features:
 * - Multiple size options (small, medium, large)
 * - Multiple variants (primary, secondary, danger, ghost)
 * - Badge support for notifications
 * - Disabled state
 * - Loading state
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
import { colors, spacing, borderRadius, fontSize, fontWeight, componentSizes, borderWidth, animation } from '@constants/tokens'

export type IconButtonVariant = 'primary' | 'secondary' | 'danger' | 'ghost'
export type IconButtonSize = 'sm' | 'md' | 'lg'

export interface AppIconButtonProps {
  /** Icon element to display */
  icon: React.ReactNode
  /** Callback when button is pressed */
  onPress: () => void
  /** Button variant */
  variant?: IconButtonVariant
  /** Button size */
  size?: IconButtonSize
  /** Disable button */
  disabled?: boolean
  /** Show loading indicator */
  loading?: boolean
  /** Badge count/content to show in corner */
  badge?: string | number
  /** Style overrides */
  style?: ViewStyle
  /** Test ID for e2e testing */
  testID?: string
}

// ============================================================================
// STYLES - Created once at module load (performance optimization)
// ============================================================================

const sizeStyles = StyleSheet.create({
  sm: {
    width: componentSizes.iconButton.sm,
    height: componentSizes.iconButton.sm,
    borderRadius: borderRadius.sm,
  },
  md: {
    width: componentSizes.iconButton.md,
    height: componentSizes.iconButton.md,
    borderRadius: borderRadius.md,
  },
  lg: {
    width: componentSizes.iconButton.lg,
    height: componentSizes.iconButton.lg,
    borderRadius: borderRadius.md,
  },
})

const variantStyles = StyleSheet.create({
  primary: {
    backgroundColor: colors.primary,
  },
  primaryDisabled: {
    backgroundColor: colors.gray300,
  },

  secondary: {
    backgroundColor: colors.gray100,
  },
  secondaryDisabled: {
    backgroundColor: colors.gray200,
  },

  danger: {
    backgroundColor: colors.error,
  },
  dangerDisabled: {
    backgroundColor: colors.gray300,
  },

  ghost: {
    backgroundColor: 'transparent',
  },
  ghostDisabled: {
    backgroundColor: 'transparent',
  },
})

const baseButtonStyle: ViewStyle = {
  justifyContent: 'center',
  alignItems: 'center',
}

const styles = StyleSheet.create({
  badge: {
    position: 'absolute',
    top: -componentSizes.header.hitSlop,
    right: -componentSizes.header.hitSlop,
    backgroundColor: colors.error,
    borderRadius: componentSizes.badge.indicator / 2,
    width: componentSizes.badge.indicator,
    height: componentSizes.badge.indicator,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: borderWidth.thick,
    borderColor: colors.white,
  },
  badgeText: {
    color: colors.white,
    fontSize: fontSize.xs,
    fontWeight: fontWeight.semibold,
  },
})

// ============================================================================
// COMPONENT
// ============================================================================

/**
 * AppIconButton - Icon-only button component
 *
 * @example
 * // Basic icon button
 * <AppIconButton
 *   icon={<CloseIcon />}
 *   onPress={handleClose}
 * />
 *
 * // Secondary variant with custom size
 * <AppIconButton
 *   icon={<MenuIcon />}
 *   onPress={openMenu}
 *   variant="secondary"
 *   size="lg"
 * />
 *
 * // Icon button with badge
 * <AppIconButton
 *   icon={<BellIcon />}
 *   onPress={openNotifications}
 *   badge={5}
 * />
 *
 * // Danger button (delete action)
 * <AppIconButton
 *   icon={<TrashIcon />}
 *   onPress={handleDelete}
 *   variant="danger"
 *   size="sm"
 * />
 *
 * // Loading state
 * <AppIconButton
 *   icon={<SearchIcon />}
 *   onPress={handleSearch}
 *   loading={isSearching}
 * />
 */
export const AppIconButton: React.FC<AppIconButtonProps> = ({
  icon,
  onPress,
  variant = 'primary',
  size = 'md',
  disabled = false,
  loading = false,
  badge,
  style,
  testID,
}) => {
  // Determine text/icon color based on variant
  let iconColor = colors.white

  if (disabled) {
    iconColor = colors.gray400
  } else {
    switch (variant) {
      case 'primary':
        iconColor = colors.white
        break
      case 'secondary':
        iconColor = colors.textPrimary
        break
      case 'danger':
        iconColor = colors.white
        break
      case 'ghost':
        iconColor = colors.primary
        break
    }
  }

  // Get variant style
  let variantStyle = variantStyles[variant]
  if (disabled) {
    const disabledKey = `${variant}Disabled` as keyof typeof variantStyles
    variantStyle = variantStyles[disabledKey]
  }

  const buttonStyle: ViewStyle = {
    ...baseButtonStyle,
    ...sizeStyles[size],
    ...variantStyle,
    opacity: disabled ? animation.opacity.disabled : 1,
  }

  // Render icon or loader
  const iconContent = loading ? (
    <ActivityIndicator color={iconColor} size={size === 'sm' ? 'small' : 'small'} />
  ) : (
    <View style={{ width: componentSizes.icon.md, height: componentSizes.icon.md, justifyContent: 'center', alignItems: 'center' }}>
      {icon}
    </View>
  )

  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={disabled || loading}
      style={[buttonStyle, style]}
      activeOpacity={animation.opacity.active}
      testID={testID}
    >
      {iconContent}

      {badge && !loading && (
        <View style={styles.badge}>
          <AppText style={styles.badgeText}>
            {typeof badge === 'number' && badge > 9 ? '9+' : badge}
          </AppText>
        </View>
      )}
    </TouchableOpacity>
  )
}

export default AppIconButton
