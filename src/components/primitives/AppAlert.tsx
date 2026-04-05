/**
 * AppAlert Component
 * Layer 1 - Primitive Component
 *
 * Purpose: Inline alert/banner for notifications and status messages
 * Usage: <AppAlert type="error" title="Error" message="Something went wrong" />
 *
 * Types:
 * - success: Green (success messages)
 * - error: Red (errors)
 * - warning: Orange (warnings/pending)
 * - info: Blue (informational)
 * - offline: Red (offline mode)
 */

import React from 'react'
import {
  View,
  StyleSheet,
  ViewStyle,
  TouchableOpacity,
} from 'react-native'
import { AppText } from './AppText'
import { colors, spacing, borderRadius, borderWidth } from '@constants/tokens'

export type AlertType = 'success' | 'error' | 'warning' | 'info' | 'offline'

export interface AppAlertProps {
  /** Alert type determines colors and styling */
  type: AlertType
  /** Alert title/heading */
  title: string
  /** Optional detailed message */
  message?: string
  /** Callback when close button is pressed */
  onClose?: () => void
  /** Container style override */
  containerStyle?: ViewStyle
}

// ============================================================================
// STYLES - Created once at module load (performance optimization)
// ============================================================================

const baseAlertStyle: ViewStyle = {
  borderLeftWidth: borderWidth.extraThick,
  paddingVertical: spacing[2],
  paddingHorizontal: spacing[3],
  borderRadius: borderRadius.sm,
  marginBottom: spacing[3],
  flexDirection: 'row',
  justifyContent: 'space-between',
  alignItems: 'flex-start',
}

const alertVariants = StyleSheet.create({
  success: {
    backgroundColor: colors.successBg,
    borderLeftColor: colors.success,
  },
  error: {
    backgroundColor: colors.errorBg,
    borderLeftColor: colors.error,
  },
  warning: {
    backgroundColor: colors.warningBg,
    borderLeftColor: colors.warning,
  },
  info: {
    backgroundColor: colors.infoBg,
    borderLeftColor: colors.info,
  },
  offline: {
    backgroundColor: colors.errorBg,
    borderLeftColor: colors.error,
  },
})

const alertTextColors = {
  success: colors.success,
  error: colors.error,
  warning: colors.warning,
  info: colors.info,
  offline: colors.error,
}

const styles = StyleSheet.create({
  content: {
    flex: 1,
    marginRight: spacing[2],
  },
  closeButton: {
    padding: spacing[1],
    marginLeft: spacing[2],
  },
})

// ============================================================================
// COMPONENT
// ============================================================================

/**
 * AppAlert - Inline notification banner component
 *
 * @example
 * // Error alert
 * <AppAlert type="error" title="Error" message="Something went wrong" />
 *
 * // Dismissible success alert
 * <AppAlert
 *   type="success"
 *   title="Saved"
 *   message="Changes saved successfully"
 *   onClose={handleClose}
 * />
 *
 * // Offline alert
 * <AppAlert type="offline" title="Offline Mode" />
 */
export const AppAlert: React.FC<AppAlertProps> = ({
  type,
  title,
  message,
  onClose,
  containerStyle,
}) => {
  const variantStyle = alertVariants[type]
  const textColor = alertTextColors[type]

  const alertStyle: ViewStyle = {
    ...baseAlertStyle,
    ...variantStyle,
  }

  return (
    <View style={[alertStyle, containerStyle]}>
      <View style={styles.content}>
        <AppText
          variant="label"
          color={textColor}
          weight="semibold"
        >
          {title}
        </AppText>
        {message && (
          <AppText variant="caption" color={textColor}>
            {message}
          </AppText>
        )}
      </View>
      {onClose && (
        <TouchableOpacity
          onPress={onClose}
          style={styles.closeButton}
          hitSlop={{ top: 10, right: 10, bottom: 10, left: 10 }}
        >
          <AppText color={textColor}>✕</AppText>
        </TouchableOpacity>
      )}
    </View>
  )
}

export default AppAlert
