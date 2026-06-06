/**
 * AppRadioGroup Component
 * Layer 1 - Primitive Component
 *
 * Purpose: Single-select radio button group
 * Usage: <AppRadioGroup label="Option" options={[{label: 'A', value: '1'}]} value="1" onChange={setValue} />
 *
 * Features:
 * - Multiple radio options
 * - Single selection only
 * - Optional descriptions per option
 * - Disabled state (group or individual items)
 * - Vertical or horizontal layout
 */

import React from 'react'
import {
  View,
  TouchableOpacity,
  StyleSheet,
  ViewStyle,
} from 'react-native'
import { AppText } from './AppText'
import { colors, spacing, borderRadius, componentSizes, borderWidth } from '@constants/tokens'

export interface RadioOption {
  label: string
  value: string | number
  description?: string
  disabled?: boolean
}

export type RadioLayout = 'vertical' | 'horizontal'

export interface AppRadioGroupProps {
  /** Group label */
  label?: string
  /** Array of radio options */
  options: RadioOption[]
  /** Currently selected value */
  value?: string | number
  /** Callback when selection changes */
  onChange?: (value: string | number) => void
  /** Layout direction */
  layout?: RadioLayout
  /** Disable the entire group */
  disabled?: boolean
  /** Helper text displayed below group */
  helperText?: string
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
    marginBottom: spacing[2],
  },
  groupContainer: {
    gap: spacing[2],
  },
  groupContainerHorizontal: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  radioItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingVertical: spacing[2],
    paddingHorizontal: spacing[2],
  },
  radioItemHorizontal: {
    flex: 0,
    marginRight: spacing[4],
  },
  radioButton: {
    width: componentSizes.radio,
    height: componentSizes.radio,
    borderWidth: borderWidth.medium,
    borderColor: colors.gray300,
    borderRadius: componentSizes.radio / 2,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: spacing[2],
    marginTop: spacing[0],
    backgroundColor: colors.white,
  },
  radioButtonSelected: {
    borderColor: colors.primary,
    backgroundColor: colors.primary,
  },
  radioButtonDisabled: {
    borderColor: colors.gray300,
    backgroundColor: colors.gray100,
  },
  radioDot: {
    width: componentSizes.radioDot,
    height: componentSizes.radioDot,
    borderRadius: borderRadius.sm / 2,
    backgroundColor: colors.white,
  },
  radioTextContainer: {
    flex: 1,
  },
  radioLabel: {
    fontWeight: '500',
  },
  radioDescription: {
    marginTop: spacing[0],
  },
  radioLabelDisabled: {
    color: colors.gray400,
  },
  helperText: {
    marginTop: spacing[2],
  },
})

// ============================================================================
// COMPONENT
// ============================================================================

/**
 * AppRadioGroup - Single-select radio button group
 *
 * @example
 * // Basic radio group
 * const options = [
 *   { label: 'Option 1', value: '1' },
 *   { label: 'Option 2', value: '2' }
 * ]
 * <AppRadioGroup
 *   label="Choose one"
 *   options={options}
 *   value={selected}
 *   onChange={setSelected}
 * />
 *
 * // With descriptions
 * <AppRadioGroup
 *   label="Payment method"
 *   options={[
 *     { label: 'Credit Card', value: 'card', description: 'Visa, Mastercard' },
 *     { label: 'Bank Transfer', value: 'bank', description: 'Direct to account' }
 *   ]}
 *   value={method}
 *   onChange={setMethod}
 * />
 *
 * // Horizontal layout
 * <AppRadioGroup
 *   label="Size"
 *   options={[
 *     { label: 'Small', value: 'sm' },
 *     { label: 'Medium', value: 'md' },
 *     { label: 'Large', value: 'lg' }
 *   ]}
 *   value={size}
 *   onChange={setSize}
 *   layout="horizontal"
 * />
 */
export const AppRadioGroup: React.FC<AppRadioGroupProps> = ({
  label,
  options,
  value,
  onChange,
  layout = 'vertical',
  disabled = false,
  helperText,
  containerStyle,
}) => {
  const handleSelectOption = (optionValue: string | number, optionDisabled?: boolean) => {
    if (!disabled && !optionDisabled && onChange) {
      onChange(optionValue)
    }
  }

  const isHorizontal = layout === 'horizontal'

  return (
    <View style={[styles.container, containerStyle]}>
      {label && (
        <AppText variant="label" style={styles.labelText}>
          {label}
        </AppText>
      )}

      <View
        style={[
          styles.groupContainer,
          isHorizontal && styles.groupContainerHorizontal,
        ]}
      >
        {options.map((option) => {
          const isSelected = option.value === value
          const isDisabled = disabled || option.disabled

          const radioButtonStyle: ViewStyle = {
            ...styles.radioButton,
            ...(isSelected && styles.radioButtonSelected),
            ...(isDisabled && styles.radioButtonDisabled),
            borderColor: isSelected ? colors.primary : (isDisabled ? colors.gray300 : colors.gray300),
            backgroundColor: isSelected ? colors.primary : (isDisabled ? colors.gray100 : colors.white),
          }

          return (
            <TouchableOpacity
              key={String(option.value)}
              onPress={() => handleSelectOption(option.value, isDisabled)}
              disabled={isDisabled}
              style={[
                styles.radioItem,
                isHorizontal && styles.radioItemHorizontal,
              ]}
              activeOpacity={isDisabled ? 1 : 0.7}
            >
              <View style={radioButtonStyle}>
                {isSelected && <View style={styles.radioDot} />}
              </View>

              <View style={styles.radioTextContainer}>
                <AppText
                  variant="body"
                  style={[
                    styles.radioLabel,
                    isDisabled && styles.radioLabelDisabled,
                  ]}
                >
                  {option.label}
                </AppText>

                {option.description && (
                  <AppText
                    variant="caption"
                    style={[
                      styles.radioDescription,
                      isDisabled && styles.radioLabelDisabled,
                    ]}
                    color={
                      isDisabled
                        ? colors.gray400
                        : colors.textSecondary
                    }
                  >
                    {option.description}
                  </AppText>
                )}
              </View>
            </TouchableOpacity>
          )
        })}
      </View>

      {helperText && (
        <AppText variant="caption" style={styles.helperText} color={colors.textSecondary}>
          {helperText}
        </AppText>
      )}
    </View>
  )
}

export default AppRadioGroup
