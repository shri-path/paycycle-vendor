/**
 * AppConfirmDialog Component
 * Layer 2 - Composite Component
 *
 * Purpose: Modal dialog for confirmation with yes/no or custom actions
 * Usage: <AppConfirmDialog visible={show} title="Confirm" description="Delete item?" onConfirm={handleDelete} onCancel={handleCancel} />
 *
 * Features:
 * - Title and description
 * - Optional icon
 * - Customizable action buttons
 * - Modal overlay
 * - Keyboard-dismissible
 */

import React from 'react'
import {
  Modal,
  View,
  TouchableOpacity,
  StyleSheet,
  ViewStyle,
  GestureResponderEvent,
} from 'react-native'
import { AppCard } from '../primitives/AppCard'
import { AppText } from '../primitives/AppText'
import { AppButton } from '../primitives/AppButton'
import { colors, spacing, borderRadius, componentSizes } from '@constants/tokens'

export interface AppConfirmDialogProps {
  /** Whether dialog is visible */
  visible?: boolean
  /** Dialog title */
  title: string
  /** Dialog description/message */
  description?: string
  /** Icon/emoji to display */
  icon?: React.ReactNode
  /** Confirm button label */
  confirmLabel?: string
  /** Cancel button label */
  cancelLabel?: string
  /** Callback when confirm is pressed */
  onConfirm?: (event?: GestureResponderEvent) => void
  /** Callback when cancel is pressed or dialog is dismissed */
  onCancel?: (event?: GestureResponderEvent) => void
  /** Confirm button variant */
  confirmVariant?: 'primary' | 'danger'
  /** Dialog style override */
  dialogStyle?: ViewStyle
}

// ============================================================================
// STYLES - Created once at module load (performance optimization)
// ============================================================================

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: spacing[4],
  },
  dialog: {
    backgroundColor: colors.white,
    borderRadius: borderRadius.lg,
    paddingVertical: spacing[4],
    paddingHorizontal: spacing[4],
    width: '100%',
    maxWidth: 320,
  },
  iconContainer: {
    marginBottom: spacing[3],
    alignItems: 'center',
    fontSize: componentSizes.icon.xxxl,
  },
  title: {
    textAlign: 'center',
    marginBottom: spacing[2],
  },
  description: {
    textAlign: 'center',
    marginBottom: spacing[4],
    color: colors.textSecondary,
  },
  buttonContainer: {
    gap: spacing[2],
  },
  button: {
    width: '100%',
  },
})

// ============================================================================
// COMPONENT
// ============================================================================

/**
 * AppConfirmDialog - Confirmation dialog with action buttons
 *
 * @example
 * // Basic confirmation
 * <AppConfirmDialog
 *   visible={show}
 *   title="Confirm Action"
 *   description="Are you sure?"
 *   onConfirm={handleConfirm}
 *   onCancel={() => setShow(false)}
 * />
 *
 * // Delete confirmation with danger variant
 * <AppConfirmDialog
 *   visible={showDelete}
 *   icon="🗑️"
 *   title="Delete Item"
 *   description="This cannot be undone"
 *   confirmLabel="Delete"
 *   confirmVariant="danger"
 *   onConfirm={handleDelete}
 *   onCancel={handleCancel}
 * />
 */
export const AppConfirmDialog: React.FC<AppConfirmDialogProps> = ({
  visible = false,
  title,
  description,
  icon,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  onConfirm,
  onCancel,
  confirmVariant = 'primary',
  dialogStyle,
}) => {
  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onCancel}
    >
      <TouchableOpacity
        style={styles.overlay}
        activeOpacity={1}
        onPress={onCancel}
      >
        <View
          style={[styles.dialog, dialogStyle]}
        >
          {icon && (
            <View style={styles.iconContainer}>
              {typeof icon === 'string' ? (
                <AppText style={styles.iconContainer}>
                  {icon}
                </AppText>
              ) : (
                icon
              )}
            </View>
          )}

          <AppText
            variant="h4"
            weight="bold"
            style={styles.title}
          >
            {title}
          </AppText>

          {description && (
            <AppText
              variant="body"
              style={styles.description}
            >
              {description}
            </AppText>
          )}

          <View style={styles.buttonContainer}>
            <AppButton
              label={confirmLabel}
              onPress={onConfirm}
              variant={confirmVariant}
              style={styles.button}
            />
            <AppButton
              label={cancelLabel}
              onPress={onCancel}
              variant="secondary"
              style={styles.button}
            />
          </View>
        </View>
      </TouchableOpacity>
    </Modal>
  )
}

export default AppConfirmDialog
