/**
 * AppEmptyState Component
 * Layer 2 - Composite Component
 *
 * Purpose: Empty state display with illustration, title, description, and optional action
 * Usage: <AppEmptyState title="No results" description="Try searching with different keywords" onActionPress={handleRetry} actionLabel="Try again" />
 *
 * Features:
 * - Optional illustration/icon
 * - Title and description text
 * - Optional action button
 * - Centered layout with padding
 * - Customizable spacing and sizing
 */

import React from 'react'
import {
  View,
  StyleSheet,
  ViewStyle,
} from 'react-native'
import { AppText } from '../primitives/AppText'
import { AppButton } from '../primitives/AppButton'
import { colors, spacing, componentSizes } from '@constants/tokens'

export interface AppEmptyStateProps {
  /** Icon or illustration element */
  icon?: React.ReactNode
  /** Empty state title */
  title: string
  /** Empty state description */
  description?: string
  /** Action button label */
  actionLabel?: string
  /** Callback when action button is pressed */
  onActionPress?: () => void
  /** Container style override */
  containerStyle?: ViewStyle
}

// ============================================================================
// STYLES - Created once at module load (performance optimization)
// ============================================================================

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: spacing[6],
    paddingHorizontal: spacing[4],
  },
  iconContainer: {
    marginBottom: spacing[4],
  },
  icon: {
    fontSize: componentSizes.icon.xxxl,
    textAlign: 'center',
  },
  title: {
    marginBottom: spacing[2],
    textAlign: 'center',
  },
  description: {
    textAlign: 'center',
    marginBottom: spacing[4],
    color: colors.textSecondary,
  },
  actionButton: {
    marginTop: spacing[2],
  },
})

// ============================================================================
// COMPONENT
// ============================================================================

/**
 * AppEmptyState - Empty state display with optional action
 *
 * @example
 * // Basic empty state
 * <AppEmptyState
 *   icon="📭"
 *   title="No customers"
 *   description="Add your first customer to get started"
 * />
 *
 * // With action button
 * <AppEmptyState
 *   icon="🔍"
 *   title="No results found"
 *   description="Try searching with different keywords"
 *   actionLabel="Try again"
 *   onActionPress={() => setSearchQuery('')}
 * />
 *
 * // Custom icon element
 * <AppEmptyState
 *   icon={<CustomIcon />}
 *   title="Loading failed"
 *   description="Unable to load data"
 *   actionLabel="Retry"
 *   onActionPress={handleRetry}
 * />
 */
export const AppEmptyState: React.FC<AppEmptyStateProps> = ({
  icon,
  title,
  description,
  actionLabel,
  onActionPress,
  containerStyle,
}) => {
  return (
    <View style={[styles.container, containerStyle]}>
      {icon && (
        <View style={styles.iconContainer} importantForAccessibility="no">
          {typeof icon === 'string' ? (
            <AppText style={styles.icon}>{icon}</AppText>
          ) : (
            icon
          )}
        </View>
      )}

      <AppText variant="h3" weight="bold" style={styles.title}>
        {title}
      </AppText>

      {description && (
        <AppText variant="body" style={styles.description}>
          {description}
        </AppText>
      )}

      {actionLabel && onActionPress && (
        <AppButton
          label={actionLabel}
          onPress={onActionPress}
          style={styles.actionButton}
        />
      )}
    </View>
  )
}

export default AppEmptyState
