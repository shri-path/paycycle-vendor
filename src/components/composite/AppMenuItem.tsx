/**
 * AppMenuItem Component
 * Layer 2 - Composite Component
 *
 * Purpose: Menu item with navigation arrow
 * Usage: <AppMenuItem label="Settings" onPress={handlePress} />
 *
 * Features:
 * - Optional icon on left
 * - Title text
 * - Optional description
 * - Navigation arrow on right
 * - Press handler for navigation
 */

import React from 'react'
import {
  View,
  TouchableOpacity,
  StyleSheet,
  ViewStyle,
  GestureResponderEvent,
} from 'react-native'
import { AppText } from '../primitives/AppText'
import { colors, spacing, fontSize, fontWeight, componentSizes, animation } from '@constants/tokens'

export interface AppMenuItemProps {
  /** Menu item label/title */
  label: string
  /** Optional description text */
  description?: string
  /** Icon element (left-aligned) */
  icon?: React.ReactNode
  /** Callback when item is pressed */
  onPress?: (event: GestureResponderEvent) => void
  /** Disable the item */
  disabled?: boolean
  /** Show divider below item */
  showDivider?: boolean
  /** Container style override */
  containerStyle?: ViewStyle
  /** Optional testID forwarded to the TouchableOpacity for testing */
  testID?: string
}

// ============================================================================
// STYLES - Created once at module load (performance optimization)
// ============================================================================

const styles = StyleSheet.create({
  container: {
    paddingVertical: spacing[3],
    paddingHorizontal: spacing[3],
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.white,
  },
  leftContent: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
  iconContainer: {
    marginRight: spacing[3],
    fontSize: fontSize.lg,
    justifyContent: 'center',
    alignItems: 'center',
  },
  textContent: {
    flex: 1,
  },
  label: {
    fontWeight: fontWeight.medium,
  },
  description: {
    marginTop: spacing[0],
  },
  arrow: {
    fontSize: fontSize.lg,
    marginLeft: spacing[2],
    color: colors.gray400,
  },
  divider: {
    height: componentSizes.divider,
    backgroundColor: colors.gray100,
    marginHorizontal: spacing[3],
  },
  disabled: {
    opacity: animation.opacity.disabled,
  },
})

// ============================================================================
// COMPONENT
// ============================================================================

/**
 * AppMenuItem - Menu item with navigation arrow
 *
 * @example
 * // Basic menu item
 * <AppMenuItem
 *   label="Settings"
 *   onPress={() => navigate('Settings')}
 * />
 *
 * // With icon and description
 * <AppMenuItem
 *   icon="⚙️"
 *   label="Preferences"
 *   description="Manage your app preferences"
 *   onPress={() => navigate('Preferences')}
 * />
 *
 * // With divider
 * <AppMenuItem
 *   icon="📱"
 *   label="Help & Support"
 *   onPress={() => navigate('Help')}
 *   showDivider
 * />
 */
export const AppMenuItem: React.FC<AppMenuItemProps> = ({
  label,
  description,
  icon,
  onPress,
  disabled = false,
  showDivider = false,
  containerStyle,
  testID,
}) => {
  return (
    <>
      <TouchableOpacity
        testID={testID}
        onPress={onPress}
        disabled={disabled}
        style={[
          styles.container,
          containerStyle,
          disabled && styles.disabled,
        ]}
        activeOpacity={disabled ? 1 : animation.opacity.active}
        accessibilityRole="button"
        accessibilityLabel={label}
        accessibilityState={{ disabled }}
      >
        <View style={styles.leftContent}>
          {icon && (
            <View style={styles.iconContainer}>
              {typeof icon === 'string' ? (
                <AppText>{icon}</AppText>
              ) : (
                icon
              )}
            </View>
          )}

          <View style={styles.textContent}>
            <AppText variant="body" style={styles.label}>
              {label}
            </AppText>
            {description && (
              <AppText
                variant="caption"
                style={styles.description}
                color={colors.textSecondary}
              >
                {description}
              </AppText>
            )}
          </View>
        </View>

        <AppText style={styles.arrow} importantForAccessibility="no">→</AppText>
      </TouchableOpacity>

      {showDivider && <View style={styles.divider} />}
    </>
  )
}

export default AppMenuItem
