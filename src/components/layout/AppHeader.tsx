/**
 * AppHeader Component
 * Layer 2 - Layout Component
 *
 * Purpose: Top navigation bar for screens with title and action buttons
 * Usage: <AppHeader title="Dashboard" showBack onBackPress={goBack} />
 */

import React from 'react'
import {
  View,
  TouchableOpacity,
  StyleSheet,
  ViewStyle,
  SafeAreaView,
} from 'react-native'
import { AppText } from '../primitives/AppText'
import { colors, spacing, componentSizes } from '@constants/tokens'

export interface AppHeaderProps {
  /** Header title text */
  title: string
  /** Callback when back button is pressed */
  onBackPress?: () => void
  /** Callback when menu button is pressed */
  onMenuPress?: () => void
  /** Callback when notification button is pressed */
  onNotificationPress?: () => void
  /** Show back button */
  showBack?: boolean
  /** Show menu/hamburger button */
  showMenu?: boolean
  /** Show notification button */
  showNotification?: boolean
  /** Notification badge count */
  notificationBadge?: number
  /** Custom right action element */
  rightAction?: React.ReactNode
  /** Container style override */
  containerStyle?: ViewStyle
}

// ============================================================================
// STYLES - Created once at module load (performance optimization)
// ============================================================================

const styles = StyleSheet.create({
  safeArea: {
    backgroundColor: colors.primary,
  },
  container: {
    backgroundColor: colors.primary,
    paddingHorizontal: spacing[3],
    paddingVertical: spacing[2],
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    minHeight: componentSizes.header.height,
  },
  leftContent: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  titleWrapper: {
    flex: 1,
    marginHorizontal: spacing[3],
  },
  rightContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[1],
  },
  iconButton: {
    padding: spacing[1],
    borderRadius: spacing[2],
  },
  notificationBadge: {
    position: 'absolute',
    top: -componentSizes.header.hitSlop / 2,
    right: -componentSizes.header.hitSlop / 2,
    backgroundColor: colors.error,
    borderRadius: componentSizes.badge.indicator / 2,
    width: componentSizes.badge.indicator,
    height: componentSizes.badge.indicator,
    justifyContent: 'center',
    alignItems: 'center',
  },
})

// ============================================================================
// COMPONENT
// ============================================================================

/**
 * AppHeader - Top navigation bar component for screens
 *
 * @example
 * // Simple header with title
 * <AppHeader title="Dashboard" />
 *
 * // Header with back button
 * <AppHeader title="Details" showBack onBackPress={handleBack} />
 *
 * // Header with menu and notifications
 * <AppHeader
 *   title="Home"
 *   showMenu
 *   onMenuPress={openMenu}
 *   showNotification
 *   notificationBadge={3}
 *   onNotificationPress={openNotifications}
 * />
 */
export const AppHeader: React.FC<AppHeaderProps> = ({
  title,
  onBackPress,
  onMenuPress,
  onNotificationPress,
  showBack = false,
  showMenu = false,
  showNotification = false,
  notificationBadge = 0,
  rightAction,
  containerStyle,
}) => {
  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={[styles.container, containerStyle]}>
        <View style={styles.leftContent}>
          {showBack && (
            <TouchableOpacity
              onPress={onBackPress}
              style={styles.iconButton}
              hitSlop={{ top: 8, right: 8, bottom: 8, left: 8 }}
            >
              <AppText color={colors.white} variant="h2">
                ‹
              </AppText>
            </TouchableOpacity>
          )}
          {showMenu && (
            <TouchableOpacity
              onPress={onMenuPress}
              style={styles.iconButton}
              hitSlop={{ top: 8, right: 8, bottom: 8, left: 8 }}
            >
              <AppText color={colors.white} variant="h2">
                ☰
              </AppText>
            </TouchableOpacity>
          )}
          <View style={styles.titleWrapper}>
            <AppText
              variant="h3"
              color={colors.white}
              numberOfLines={1}
            >
              {title}
            </AppText>
          </View>
        </View>
        <View style={styles.rightContent}>
          {showNotification && (
            <TouchableOpacity
              onPress={onNotificationPress}
              style={styles.iconButton}
              hitSlop={{ top: 8, right: 8, bottom: 8, left: 8 }}
            >
              <AppText color={colors.white} variant="h2">
                🔔
              </AppText>
              {notificationBadge > 0 && (
                <View style={styles.notificationBadge}>
                  <AppText
                    variant="caption"
                    color={colors.white}
                    weight="semibold"
                  >
                    {notificationBadge > 9 ? '9+' : notificationBadge}
                  </AppText>
                </View>
              )}
            </TouchableOpacity>
          )}
          {rightAction}
        </View>
      </View>
    </SafeAreaView>
  )
}

export default AppHeader
