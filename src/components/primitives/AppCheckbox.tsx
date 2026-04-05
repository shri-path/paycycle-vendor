/**
 * AppCheckbox Component
 * Layer 1 - Primitive Component
 *
 * Purpose: Individual checkbox for binary selection
 * Usage: <AppCheckbox label="I agree" checked={agree} onChange={setAgree} />
 *
 * Features:
 * - Custom label with optional description
 * - Indeterminate state support
 * - Disabled state
 * - Custom colors
 */

import React from 'react'
import {
  View,
  TouchableOpacity,
  StyleSheet,
  ViewStyle,
} from 'react-native'
import { AppText } from './AppText'
import { colors, spacing, borderRadius, fontSize, fontWeight, componentSizes, borderWidth } from '@constants/tokens'

export interface AppCheckboxProps {
  /** Checkbox label text */
  label?: string
  /** Description text below label */
  description?: string
  /** Whether checkbox is checked */
  checked?: boolean
  /** Callback when checkbox state changes */
  onChange?: (checked: boolean) => void
  /** Indeterminate state (mixed/partial) */
  indeterminate?: boolean
  /** Disable the checkbox */
  disabled?: boolean
  /** Custom color when checked */
  color?: string
  /** Container style override */
  containerStyle?: ViewStyle
}

// ============================================================================
// STYLES - Created once at module load (performance optimization)
// ============================================================================

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingVertical: spacing[2],
    paddingHorizontal: spacing[0],
  },
  checkboxBox: {
    width: componentSizes.checkbox,
    height: componentSizes.checkbox,
    borderWidth: borderWidth.medium,
    borderColor: colors.gray300,
    borderRadius: borderRadius.sm,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: spacing[2],
    marginTop: spacing[0],
  },
  checkboxBoxChecked: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  checkboxBoxIndeterminate: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  checkboxBoxDisabled: {
    backgroundColor: colors.gray100,
    borderColor: colors.gray300,
  },
  checkmark: {
    fontSize: fontSize.base,
    color: colors.white,
    fontWeight: fontWeight.bold,
  },
  indeterminateMark: {
    fontSize: fontSize.sm,
    color: colors.white,
    fontWeight: fontWeight.bold,
  },
  labelContainer: {
    flex: 1,
  },
  label: {
    fontWeight: fontWeight.medium,
  },
  description: {
    marginTop: spacing[0],
  },
  labelDisabled: {
    color: colors.gray400,
  },
})

// ============================================================================
// COMPONENT
// ============================================================================

/**
 * AppCheckbox - Individual checkbox component
 *
 * @example
 * // Basic checkbox
 * <AppCheckbox
 *   label="Accept terms"
 *   checked={accepted}
 *   onChange={setAccepted}
 * />
 *
 * // With description
 * <AppCheckbox
 *   label="Enable notifications"
 *   description="Receive updates about orders"
 *   checked={notificationsEnabled}
 *   onChange={setNotificationsEnabled}
 * />
 *
 * // Disabled checkbox
 * <AppCheckbox
 *   label="Unavailable option"
 *   checked={false}
 *   disabled
 * />
 *
 * // Indeterminate state
 * <AppCheckbox
 *   label="Select all"
 *   checked={allSelected}
 *   indeterminate={someSelected && !allSelected}
 *   onChange={handleSelectAll}
 * />
 */
export const AppCheckbox: React.FC<AppCheckboxProps> = ({
  label,
  description,
  checked = false,
  onChange,
  indeterminate = false,
  disabled = false,
  color = colors.primary,
  containerStyle,
}) => {
  const handlePress = () => {
    if (!disabled && onChange) {
      onChange(!checked)
    }
  }

  const checkboxStyle: ViewStyle = {
    ...styles.checkboxBox,
    ...(checked && styles.checkboxBoxChecked),
    ...(indeterminate && styles.checkboxBoxIndeterminate),
    ...(disabled && styles.checkboxBoxDisabled),
    backgroundColor: checked || indeterminate ? color : (disabled ? colors.gray100 : 'transparent'),
    borderColor: checked || indeterminate ? color : colors.gray300,
  }

  return (
    <TouchableOpacity
      onPress={handlePress}
      disabled={disabled}
      style={[styles.container, containerStyle]}
      activeOpacity={disabled ? 1 : 0.7}
    >
      <View style={checkboxStyle}>
        {checked && <AppText style={styles.checkmark}>✓</AppText>}
        {indeterminate && <AppText style={styles.indeterminateMark}>−</AppText>}
      </View>

      {(label || description) && (
        <View style={styles.labelContainer}>
          {label && (
            <AppText
              variant="body"
              style={[styles.label, disabled && styles.labelDisabled]}
            >
              {label}
            </AppText>
          )}

          {description && (
            <AppText
              variant="caption"
              style={[styles.description, disabled && styles.labelDisabled]}
              color={disabled ? colors.gray400 : colors.textSecondary}
            >
              {description}
            </AppText>
          )}
        </View>
      )}
    </TouchableOpacity>
  )
}

export default AppCheckbox
