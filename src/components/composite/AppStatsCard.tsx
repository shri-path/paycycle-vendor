/**
 * AppStatsCard Component
 * Layer 2 - Composite Component
 *
 * Purpose: Display a statistic with value, label, and optional trend/badge
 * Usage: <AppStatsCard label="Total Orders" value="1,234" badge="↑ 12%" />
 *
 * Features:
 * - Large value display
 * - Label text
 * - Optional badge for trend/status
 * - Icon support
 * - Press handler for interactivity
 */

import React from 'react'
import {
  ViewStyle,
  StyleSheet,
} from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { AppCard } from '../primitives/AppCard'
import { AppText } from '../primitives/AppText'
import { AppBadge, BadgeVariant } from '../primitives/AppBadge'
import { colors, spacing, componentSizes } from '@constants/tokens'

export type IoniconName = React.ComponentProps<typeof Ionicons>['name']

export interface AppStatsCardProps {
  /** Card label/title */
  label: string
  /** Main stat value */
  value: string | number
  /** Optional badge text (trend, status, etc) */
  badge?: string
  /** Badge variant */
  badgeVariant?: BadgeVariant
  /** Ionicon name for the icon */
  icon?: IoniconName
  /** Card press handler */
  onPress?: () => void
  /** Container style override */
  containerStyle?: ViewStyle
}

// ============================================================================
// STYLES - Created once at module load (performance optimization)
// ============================================================================

const styles = StyleSheet.create({
  card: {
    paddingVertical: spacing[4],
    paddingHorizontal: spacing[3],
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: spacing[3],
  },
  labelContainer: {
    flex: 1,
  },
  label: {
    color: colors.textSecondary,
  },
  badgeContainer: {
    marginLeft: spacing[2],
  },
  value: {
    marginBottom: spacing[2],
  },
  icon: {
    marginBottom: spacing[3],
  },
})

// ============================================================================
// COMPONENT
// ============================================================================

/**
 * AppStatsCard - Display a statistic with value and optional trend
 *
 * @example
 * // Basic stats card
 * <AppStatsCard
 *   label="Total Revenue"
 *   value="₹45,234"
 * />
 *
 * // With trend badge
 * <AppStatsCard
 *   label="Active Orders"
 *   value="12"
 *   badge="↑ 5%"
 *   badgeVariant="success"
 * />
 *
 * // With icon and press handler
 * <AppStatsCard
 *   icon="💰"
 *   label="Monthly Earnings"
 *   value="₹1,23,456"
 *   badge="↓ 2%"
 *   badgeVariant="warning"
 *   onPress={() => navigateToDetails()}
 * />
 */
export const AppStatsCard: React.FC<AppStatsCardProps> = ({
  label,
  value,
  badge,
  badgeVariant = 'primary',
  icon,
  onPress,
  containerStyle,
}) => {
  return (
    <AppCard
      style={[styles.card, containerStyle ]}
      onPress={onPress}
    >
      {icon && (
        <Ionicons
          name={icon}
          size={componentSizes.icon.lg}
          color={colors.primary}
          style={styles.icon} 
        />
      )}

      <AppText
        variant="caption"
        weight="semibold"
        style={styles.label}
      >
        {label}
      </AppText>

      <AppText
        variant="body"
        weight="bold"
        style={styles.value}
      >
        {value}
      </AppText>

      {badge && (
        <AppBadge
          label={badge}
          variant={badgeVariant}
        />
      )}
    </AppCard>
  )
}

export default AppStatsCard
