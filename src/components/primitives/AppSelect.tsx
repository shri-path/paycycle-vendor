/**
 * AppSelect Component
 * Layer 1 - Primitive Component
 *
 * Purpose: Dropdown select component for choosing from multiple options
 * Usage: <AppSelect label="Category" options={[{label: 'A', value: '1'}]} value="1" onChange={handleChange} />
 *
 * Features:
 * - Label and helper text support
 * - Multiple options with label/value pairs
 * - Error state with message
 * - Disabled state
 */

import React, { useState } from 'react'
import {
  View,
  TouchableOpacity,
  StyleSheet,
  ViewStyle,
  Modal,
  FlatList,
} from 'react-native'
import { AppText } from './AppText'
import { colors, spacing, borderRadius, fontSize, componentSizes } from '@constants/tokens'

export interface SelectOption {
  label: string
  value: string | number
}

export interface AppSelectProps {
  /** Label text displayed above select */
  label?: string
  /** Array of available options */
  options: SelectOption[]
  /** Currently selected value */
  value?: string | number
  /** Callback when selection changes */
  onChange?: (value: string | number) => void
  /** Placeholder text when no selection */
  placeholder?: string
  /** Error message displayed below select */
  error?: string
  /** Helper text displayed below select (when no error) */
  helperText?: string
  /** Disable the select */
  disabled?: boolean
  /** Container style override */
  containerStyle?: ViewStyle
}

// ============================================================================
// STYLES - Created once at module load (performance optimization)
// ============================================================================

const styles = StyleSheet.create({
  container: {
    marginBottom: spacing[4],
  },
  labelText: {
    marginBottom: spacing[1],
  },
  selectWrapper: {
    borderWidth: 1,
    borderColor: colors.gray200,
    borderRadius: borderRadius.md,
    paddingHorizontal: spacing[3],
    backgroundColor: colors.white,
    minHeight: componentSizes.input.md,
    justifyContent: 'center',
  },
  selectWrapperError: {
    borderColor: colors.error,
  },
  selectWrapperDisabled: {
    backgroundColor: colors.gray50,
    borderColor: colors.gray300,
  },
  selectValue: {
    fontSize: fontSize.base,
    color: colors.textPrimary,
  },
  selectValuePlaceholder: {
    color: colors.textSecondary,
  },
  selectValueDisabled: {
    color: colors.gray400,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: colors.white,
    borderTopLeftRadius: borderRadius.lg,
    borderTopRightRadius: borderRadius.lg,
    maxHeight: '70%',
  },
  modalHeader: {
    paddingHorizontal: spacing[4],
    paddingVertical: spacing[3],
    borderBottomWidth: 1,
    borderBottomColor: colors.gray200,
  },
  modalHeaderText: {
    fontSize: fontSize.lg,
    fontWeight: '600',
  },
  optionItem: {
    paddingHorizontal: spacing[4],
    paddingVertical: spacing[3],
    borderBottomWidth: 1,
    borderBottomColor: colors.gray100,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  optionItemSelected: {
    backgroundColor: colors.gray50,
  },
  optionLabel: {
    fontSize: fontSize.base,
    color: colors.textPrimary,
    flex: 1,
  },
  optionCheckmark: {
    fontSize: fontSize.lg,
    color: colors.primary,
    marginLeft: spacing[2],
  },
  helperText: {
    marginTop: spacing[1],
  },
  helperTextError: {
    color: colors.error,
  },
  helperTextNormal: {
    color: colors.textSecondary,
  },
  closeButton: {
    paddingHorizontal: spacing[4],
    paddingVertical: spacing[3],
    borderTopWidth: 1,
    borderTopColor: colors.gray200,
  },
  closeButtonText: {
    color: colors.primary,
    textAlign: 'center',
    fontSize: fontSize.base,
    fontWeight: '600',
  },
})

// ============================================================================
// COMPONENT
// ============================================================================

/**
 * AppSelect - Dropdown selection component with modal picker
 *
 * @example
 * // Basic select
 * const options = [
 *   { label: 'Option 1', value: '1' },
 *   { label: 'Option 2', value: '2' }
 * ]
 * <AppSelect
 *   label="Choose"
 *   options={options}
 *   value={selectedValue}
 *   onChange={setSelectedValue}
 * />
 *
 * // With error
 * <AppSelect
 *   label="Category"
 *   options={categories}
 *   value={category}
 *   onChange={setCategory}
 *   error="Category is required"
 * />
 */
export const AppSelect: React.FC<AppSelectProps> = ({
  label,
  options,
  value,
  onChange,
  placeholder = 'Select an option',
  error,
  helperText,
  disabled = false,
  containerStyle,
}) => {
  const [isModalVisible, setIsModalVisible] = useState(false)

  const selectedOption = options.find((opt) => opt.value === value)
  const displayValue = selectedOption?.label || placeholder

  const selectWrapperStyle: ViewStyle = {
    ...styles.selectWrapper,
    ...(error && styles.selectWrapperError),
    ...(!disabled && { borderColor: colors.primary }),
    ...(disabled && styles.selectWrapperDisabled),
  }

  const handleSelectOption = (optionValue: string | number) => {
    onChange?.(optionValue)
    setIsModalVisible(false)
  }

  return (
    <View style={[styles.container, containerStyle]}>
      {label && (
        <AppText variant="label" style={styles.labelText}>
          {label}
        </AppText>
      )}

      <TouchableOpacity
        onPress={() => !disabled && setIsModalVisible(true)}
        disabled={disabled}
        style={selectWrapperStyle}
      >
        <AppText
          variant="body"
          style={[
            styles.selectValue,
            !selectedOption && styles.selectValuePlaceholder,
            disabled && styles.selectValueDisabled,
          ]}
        >
          {displayValue}
        </AppText>
      </TouchableOpacity>

      {(error || helperText) && (
        <AppText
          variant="caption"
          style={styles.helperText}
          color={error ? colors.error : colors.textSecondary}
        >
          {error || helperText}
        </AppText>
      )}

      <Modal
        visible={isModalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setIsModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            {label && (
              <View style={styles.modalHeader}>
                <AppText style={styles.modalHeaderText}>{label}</AppText>
              </View>
            )}

            <FlatList
              data={options}
              keyExtractor={(item) => String(item.value)}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={[
                    styles.optionItem,
                    item.value === value && styles.optionItemSelected,
                  ]}
                  onPress={() => handleSelectOption(item.value)}
                >
                  <AppText style={styles.optionLabel}>{item.label}</AppText>
                  {item.value === value && (
                    <AppText style={styles.optionCheckmark}>✓</AppText>
                  )}
                </TouchableOpacity>
              )}
              scrollEnabled={options.length > 10}
            />

            <TouchableOpacity
              style={styles.closeButton}
              onPress={() => setIsModalVisible(false)}
            >
              <AppText style={styles.closeButtonText}>Close</AppText>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  )
}

export default AppSelect
