/**
 * AppAvatar Component
 * Layer 1 - Primitive Component
 *
 * Purpose: Circular avatar display with user initials
 * Usage: <AppAvatar initials="JD" size="md" />
 *
 * Sizes: sm (32x32), md (40x40), lg (56x56)
 */

import React from 'react'
import { View, StyleSheet, ViewStyle } from 'react-native'
import { AppText } from './AppText'
import { colors, componentSizes } from '@constants/tokens'

export type AvatarSize = 'sm' | 'md' | 'lg'

export interface AppAvatarProps {
  /** User initials to display (first 2 letters) */
  initials: string
  /** Avatar size */
  size?: AvatarSize
  /** Text color inside avatar */
  color?: string
  /** Avatar background color */
  backgroundColor?: string
}

// ============================================================================
// STYLES - Created once at module load (performance optimization)
// ============================================================================

const sizeStyles = StyleSheet.create({
  sm: {
    width: componentSizes.avatar.sm,
    height: componentSizes.avatar.sm,
    borderRadius: componentSizes.avatar.sm / 2,
  },
  md: {
    width: componentSizes.avatar.md,
    height: componentSizes.avatar.md,
    borderRadius: componentSizes.avatar.md / 2,
  },
  lg: {
    width: componentSizes.avatar.lg,
    height: componentSizes.avatar.lg,
    borderRadius: componentSizes.avatar.lg / 2,
  },
})

const baseAvatarStyle: ViewStyle = {
  justifyContent: 'center',
  alignItems: 'center',
}

// ============================================================================
// COMPONENT
// ============================================================================

/**
 * AppAvatar - Circular avatar with user initials
 *
 * @example
 * // Small avatar
 * <AppAvatar initials="AB" size="sm" />
 *
 * // Custom colors
 * <AppAvatar
 *   initials="CD"
 *   size="md"
 *   backgroundColor={colors.success}
 *   color={colors.white}
 * />
 */
export const AppAvatar: React.FC<AppAvatarProps> = ({
  initials,
  size = 'md',
  color = colors.white,
  backgroundColor = colors.primary,
}) => {
  const textVariantMap: Record<AvatarSize, 'caption' | 'label' | 'h3'> = {
    sm: 'caption',
    md: 'label',
    lg: 'h3',
  }

  const avatarStyle: ViewStyle = {
    ...baseAvatarStyle,
    ...sizeStyles[size],
    backgroundColor,
  }

  return (
    <View style={avatarStyle}>
      <AppText
        variant={textVariantMap[size]}
        color={color}
        weight="bold"
        align="center"
      >
        {initials.toUpperCase().slice(0, 2)}
      </AppText>
    </View>
  )
}

export default AppAvatar
