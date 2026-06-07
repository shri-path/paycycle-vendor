/**
 * AppPhoneInput Component
 * Layer 1 - Primitive Component
 *
 * Purpose: Phone number input with country code selection
 * Usage: <AppPhoneInput label="Phone" countryCode="+91" phone="9876543210" onChange={handleChange} />
 *
 * Features:
 * - Country code selection
 * - Phone number formatting
 * - Label and helper text support
 * - Error state with message
 * - Disabled state
 */

import React, { useState } from 'react'
import {
  View,
  TextInput,
  StyleSheet,
  ViewStyle,
  TextInputProps,
  TextStyle,
  TouchableOpacity,
  Modal,
  FlatList,
} from 'react-native'
import { AppText } from './AppText'
import { colors, spacing, borderRadius, fontSize, fontWeight, componentSizes } from '@constants/tokens'

export interface CountryCode {
  name: string
  code: string
  dial: string
}

export interface AppPhoneInputProps extends Omit<TextInputProps, 'onChange'> {
  /** Label text displayed above input */
  label?: string
  /** Disable the input */
  disabled?: boolean
  /** Country code (e.g., +91, +1) */
  countryCode?: string
  /** Phone number without country code */
  phone?: string
  /** Callback when phone number changes */
  onChange?: (countryCode: string, phone: string) => void
  /** Available country codes */
  countryCodes?: CountryCode[]
  /** Error message displayed below input */
  error?: string
  /** Helper text displayed below input (when no error) */
  helperText?: string
  /** Container style override */
  containerStyle?: ViewStyle
}

// Default country codes
const DEFAULT_COUNTRY_CODES: CountryCode[] = [
  { name: 'India', code: 'IN', dial: '+91' },
  { name: 'United States', code: 'US', dial: '+1' },
  { name: 'United Kingdom', code: 'GB', dial: '+44' },
  { name: 'Canada', code: 'CA', dial: '+1' },
  { name: 'Australia', code: 'AU', dial: '+61' },
  { name: 'Germany', code: 'DE', dial: '+49' },
  { name: 'France', code: 'FR', dial: '+33' },
  { name: 'Japan', code: 'JP', dial: '+81' },
  { name: 'China', code: 'CN', dial: '+86' },
  { name: 'Singapore', code: 'SG', dial: '+65' },
]

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
  phoneInputWrapper: {
    flexDirection: 'row',
    gap: spacing[2],
  },
  countryCodeButton: {
    borderWidth: 1,
    borderColor: colors.gray200,
    borderRadius: borderRadius.md,
    paddingHorizontal: spacing[2],
    backgroundColor: colors.white,
    minHeight: componentSizes.input.md,
    justifyContent: 'center',
    alignItems: 'center',
    minWidth: 70,
  },
  countryCodeButtonError: {
    borderColor: colors.error,
  },
  countryCodeButtonDisabled: {
    backgroundColor: colors.gray50,
    borderColor: colors.gray300,
  },
  countryCodeText: {
    fontSize: fontSize.base,
    color: colors.textPrimary,
    fontWeight: fontWeight.semibold,
  },
  countryCodeTextDisabled: {
    color: colors.gray400,
  },
  phoneInputField: {
    flex: 1,
    borderWidth: 1,
    borderColor: colors.gray200,
    borderRadius: borderRadius.md,
    paddingHorizontal: spacing[3],
    backgroundColor: colors.white,
    minHeight: componentSizes.input.md,
  },
  phoneInputFieldError: {
    borderColor: colors.error,
  },
  phoneInputFieldDisabled: {
    backgroundColor: colors.gray50,
    borderColor: colors.gray300,
  },
  phoneInput: {
    flex: 1,
    fontSize: fontSize.base,
    color: colors.textPrimary,
    paddingVertical: spacing[2],
    paddingHorizontal: 0,
  },
  phoneInputDisabled: {
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
    fontWeight: fontWeight.semibold,
  },
  countryItem: {
    paddingHorizontal: spacing[4],
    paddingVertical: spacing[3],
    borderBottomWidth: 1,
    borderBottomColor: colors.gray100,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  countryItemSelected: {
    backgroundColor: colors.gray50,
  },
  countryLabel: {
    fontSize: fontSize.base,
    color: colors.textPrimary,
  },
  countryDial: {
    fontSize: fontSize.base,
    color: colors.textSecondary,
    fontWeight: fontWeight.semibold,
  },
  countryCheckmark: {
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
})

// ============================================================================
// COMPONENT
// ============================================================================

/**
 * AppPhoneInput - Phone number input with country code selection
 *
 * @example
 * // Basic phone input
 * <AppPhoneInput
 *   label="Phone Number"
 *   countryCode="+91"
 *   phone="9876543210"
 *   onChange={(code, phone) => {
 *     setCountryCode(code)
 *     setPhone(phone)
 *   }}
 * />
 *
 * // With error state
 * <AppPhoneInput
 *   label="Mobile"
 *   countryCode={countryCode}
 *   phone={phone}
 *   onChange={handlePhoneChange}
 *   error="Invalid phone number"
 * />
 *
 * // With custom country codes
 * <AppPhoneInput
 *   label="Contact"
 *   countryCodes={customCodes}
 *   countryCode={selectedCode}
 *   phone={phoneNumber}
 *   onChange={handleChange}
 * />
 */
export const AppPhoneInput: React.FC<AppPhoneInputProps> = ({
  label,
  countryCode = '+91',
  phone = '',
  onChange,
  countryCodes = DEFAULT_COUNTRY_CODES,
  error,
  helperText,
  disabled = false,
  containerStyle,
  editable = true,
  placeholderTextColor,
  testID,
  ...props
}) => {
  const [isModalVisible, setIsModalVisible] = useState(false)
  const [isFocused, setIsFocused] = useState(false)

  const selectedCountry = countryCodes.find((c) => c.dial === countryCode)

  const countryCodeButtonStyle: ViewStyle = {
    ...styles.countryCodeButton,
    ...(error && styles.countryCodeButtonError),
    ...(!editable && styles.countryCodeButtonDisabled),
    borderColor: isFocused && !error ? colors.primary : (error ? colors.error : colors.gray200),
  }

  const phoneInputFieldStyle: ViewStyle = {
    ...styles.phoneInputField,
    ...(error && styles.phoneInputFieldError),
    ...(!editable && styles.phoneInputFieldDisabled),
    borderColor: isFocused && !error ? colors.primary : (error ? colors.error : colors.gray200),
  }

  const phoneInputStyle: TextStyle = {
    ...styles.phoneInput,
    ...(!editable && styles.phoneInputDisabled),
  }

  const handleSelectCountry = (dialCode: string) => {
    onChange?.(dialCode, phone)
    setIsModalVisible(false)
  }

  const handlePhoneChange = (text: string) => {
    // Allow only numbers, capped at the input's maxLength when provided
    let cleanedText = text.replace(/[^0-9]/g, '')
    if (typeof props.maxLength === 'number') {
      cleanedText = cleanedText.slice(0, props.maxLength)
    }
    onChange?.(countryCode, cleanedText)
  }

  return (
    <View style={[styles.container, containerStyle]}>
      {label && (
        <AppText variant="label" style={styles.labelText}>
          {label}
        </AppText>
      )}

      <View style={styles.phoneInputWrapper}>
        <TouchableOpacity
          onPress={() => !disabled && setIsModalVisible(true)}
          disabled={disabled}
          style={countryCodeButtonStyle}
        >
          <AppText
            style={[
              styles.countryCodeText,
              disabled && styles.countryCodeTextDisabled,
            ]}
          >
            {selectedCountry?.dial || countryCode}
          </AppText>
        </TouchableOpacity>

        <View style={phoneInputFieldStyle}>
          <TextInput
            {...props}
            testID={testID}
            value={phone}
            editable={editable}
            style={phoneInputStyle}
            placeholder="Phone number"
            placeholderTextColor={placeholderTextColor || colors.textSecondary}
            keyboardType="phone-pad"
            onChangeText={handlePhoneChange}
            onFocus={(e) => {
              setIsFocused(true)
              props.onFocus?.(e)
            }}
            onBlur={(e) => {
              setIsFocused(false)
              props.onBlur?.(e)
            }}
          />
        </View>
      </View>

      {(error || helperText) && (
        <AppText
          variant="caption"
          testID={testID ? `${testID}-error` : undefined}
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
            <View style={styles.modalHeader}>
              <AppText style={styles.modalHeaderText}>Select Country Code</AppText>
            </View>

            <FlatList
              data={countryCodes}
              keyExtractor={(item) => item.code}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={[
                    styles.countryItem,
                    item.dial === countryCode && styles.countryItemSelected,
                  ]}
                  onPress={() => handleSelectCountry(item.dial)}
                >
                  <View>
                    <AppText style={styles.countryLabel}>{item.name}</AppText>
                    <AppText style={styles.countryDial}>{item.dial}</AppText>
                  </View>

                  {item.dial === countryCode && (
                    <AppText style={styles.countryCheckmark}>✓</AppText>
                  )}
                </TouchableOpacity>
              )}
            />
          </View>
        </View>
      </Modal>
    </View>
  )
}

AppPhoneInput.displayName = 'AppPhoneInput'

export default AppPhoneInput
