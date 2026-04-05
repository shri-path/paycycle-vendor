/**
 * AppLoader Component
 * Layer 1 - Primitive Component
 *
 * Purpose: Loading spinner with optional message
 * Usage: <AppLoader size="large" message="Loading..." />
 */

import React from 'react'
import { ActivityIndicator, View, StyleSheet, ViewStyle } from 'react-native'
import { AppText } from './AppText'
import { colors, spacing } from '@constants/tokens'

export type LoaderSize = 'small' | 'large'

export interface AppLoaderProps {
  /** Spinner size */
  size?: LoaderSize
  /** Spinner color */
  color?: string
  /** Optional loading message below spinner */
  message?: string
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
    paddingVertical: spacing[8],
  },
  messageContainer: {
    marginTop: spacing[4],
  },
})

// ============================================================================
// COMPONENT
// ============================================================================

/**
 * AppLoader - Loading spinner with optional message
 *
 * @example
 * // Just spinner
 * <AppLoader />
 *
 * // With message
 * <AppLoader size="large" message="Loading customers..." />
 */
export const AppLoader: React.FC<AppLoaderProps> = ({
  size = 'large',
  color = colors.primary,
  message,
  containerStyle,
}) => {
  return (
    <View style={[styles.container, containerStyle]}>
      <ActivityIndicator size={size} color={color} />
      {message && (
        <View style={styles.messageContainer}>
          <AppText variant="body" color={colors.textSecondary}>
            {message}
          </AppText>
        </View>
      )}
    </View>
  )
}

export default AppLoader
