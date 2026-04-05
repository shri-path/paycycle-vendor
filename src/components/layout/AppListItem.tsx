/**
 * AppListItem Component
 * Layer 2 - Layout Component
 *
 * Purpose: Reusable list row with title, subtitle, avatar, and actions
 * Usage: <AppListItem title="John Doe" subtitle="Active" avatar="JD" />
 *
 * Features:
 * - Optional avatar (string initials or React node)
 * - Title and subtitle text
 * - Right content slot for badges/actions
 * - Divider separator option
 * - Press handler for interactivity
 */

import React from 'react'
import {
  TouchableOpacity,
  View,
  StyleSheet,
  ViewStyle,
  GestureResponderEvent,
} from 'react-native'
import { AppText } from '../primitives/AppText'
import { AppAvatar } from '../primitives/AppAvatar'
import { AppDivider } from '../primitives/AppDivider'
import { colors, spacing, animation } from '@constants/tokens'

export interface AppListItemProps {
  /** Item title/primary text */
  title: string
  /** Item subtitle/secondary text */
  subtitle?: string
  /** Avatar - either initials string or React node */
  avatar?: string | React.ReactNode
  /** Right content slot (badges, buttons, etc) */
  rightContent?: React.ReactNode
  /** Callback when item is pressed */
  onPress?: (event: GestureResponderEvent) => void
  /** Disable the item */
  disabled?: boolean
  /** Show divider below item */
  showDivider?: boolean
  /** Container style override */
  containerStyle?: ViewStyle
}

// ============================================================================
// STYLES - Created once at module load (performance optimization)
// ============================================================================

const styles = StyleSheet.create({
  container: {
    paddingVertical: spacing[2],
    paddingHorizontal: spacing[3],
    backgroundColor: colors.white,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  leftContent: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatarWrapper: {
    marginRight: spacing[3],
  },
  textContent: {
    flex: 1,
  },
  rightContentWrapper: {
    marginLeft: spacing[3],
  },
})

// ============================================================================
// COMPONENT
// ============================================================================

/**
 * AppListItem - Reusable list row component with flexible content
 *
 * @example
 * // Basic item
 * <AppListItem title="Item 1" subtitle="Subtitle" />
 *
 * // Item with avatar and badge
 * <AppListItem
 *   title="John Doe"
 *   subtitle="Active customer"
 *   avatar="JD"
 *   rightContent={<AppBadge label="Premium" variant="success" />}
 * />
 *
 * // Interactive item
 * <AppListItem
 *   title="Open item"
 *   onPress={handlePress}
 *   showDivider
 * />
 */
export const AppListItem: React.FC<AppListItemProps> = ({
  title,
  subtitle,
  avatar,
  rightContent,
  onPress,
  disabled = false,
  showDivider = false,
  containerStyle,
}) => {
  const content = (
    <>
      <View style={styles.leftContent}>
        {avatar && typeof avatar === 'string' && (
          <View style={styles.avatarWrapper}>
            <AppAvatar initials={avatar} size="md" />
          </View>
        )}
        {avatar && typeof avatar !== 'string' && (
          <View style={styles.avatarWrapper}>{avatar}</View>
        )}
        <View style={styles.textContent}>
          <AppText variant="label" numberOfLines={1}>
            {title}
          </AppText>
          {subtitle && (
            <AppText
              variant="caption"
              color={colors.textSecondary}
              numberOfLines={1}
            >
              {subtitle}
            </AppText>
          )}
        </View>
      </View>
      {rightContent && (
        <View style={styles.rightContentWrapper}>{rightContent}</View>
      )}
    </>
  )

  const itemStyle: ViewStyle = {
    ...styles.container,
    opacity: disabled ? animation.opacity.disabled : 1,
  }

  if (onPress) {
    return (
      <>
        <TouchableOpacity
          onPress={onPress}
          disabled={disabled}
          style={[itemStyle, containerStyle]}
          activeOpacity={animation.opacity.hover}
        >
          {content}
        </TouchableOpacity>
        {showDivider && <AppDivider marginVertical={0} />}
      </>
    )
  }

  return (
    <>
      <View style={[itemStyle, containerStyle]}>
        {content}
      </View>
      {showDivider && <AppDivider marginVertical={0} />}
    </>
  )
}

export default AppListItem
