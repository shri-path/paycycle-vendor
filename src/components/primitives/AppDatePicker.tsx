/**
 * AppDatePicker Component
 * Layer 1 - Primitive Component
 *
 * Purpose: Date and time picker with modal display
 * Usage: <AppDatePicker label="Date" value={date} onChange={setDate} mode="date" />
 *
 * Features:
 * - Date, time, or datetime modes
 * - Custom date format display
 * - Min/max date constraints
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
} from 'react-native'
import { AppText } from './AppText'
import { getCurrentLanguage } from '@locales/index'
import { colors, spacing, borderRadius, fontSize, fontWeight, componentSizes, borderWidth, semanticColors } from '@constants/tokens'

export type DatePickerMode = 'date' | 'time' | 'datetime'

export interface AppDatePickerProps {
  /** Label text displayed above picker */
  label?: string
  /** Selected date value */
  value?: Date
  /** Callback when date changes */
  onChange?: (date: Date) => void
  /** Picker mode */
  mode?: DatePickerMode
  /** Minimum selectable date */
  minimumDate?: Date
  /** Maximum selectable date */
  maximumDate?: Date
  /** Placeholder text when no selection */
  placeholder?: string
  /** Error message displayed below picker */
  error?: string
  /** Helper text displayed below picker (when no error) */
  helperText?: string
  /** Disable the picker */
  disabled?: boolean
  /**
   * BCP-47 locale used to format the displayed date/time. Defaults to the app's
   * current language (region-localised to India) so the order and numerals match
   * the user's locale instead of a hardcoded DD/MM/YYYY.
   */
  locale?: string
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
  pickerWrapper: {
    borderWidth: borderWidth.thin,
    borderColor: colors.gray200,
    borderRadius: borderRadius.md,
    paddingHorizontal: spacing[3],
    backgroundColor: colors.white,
    minHeight: componentSizes.input.md,
    justifyContent: 'center',
  },
  pickerWrapperError: {
    borderColor: colors.error,
  },
  pickerWrapperDisabled: {
    backgroundColor: colors.gray50,
    borderColor: colors.gray300,
  },
  pickerValue: {
    fontSize: fontSize.base,
    color: colors.textPrimary,
  },
  pickerValuePlaceholder: {
    color: colors.textSecondary,
  },
  pickerValueDisabled: {
    color: colors.gray400,
  },
  pickerIcon: {
    marginLeft: spacing[2],
  },
  pickerRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: semanticColors.background.overlay,
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: colors.white,
    borderTopLeftRadius: borderRadius.lg,
    borderTopRightRadius: borderRadius.lg,
    paddingHorizontal: spacing[4],
    paddingVertical: spacing[4],
  },
  modalHeader: {
    fontSize: fontSize.lg,
    fontWeight: fontWeight.semibold,
    marginBottom: spacing[4],
    color: colors.textPrimary,
  },
  dateDisplay: {
    backgroundColor: colors.gray50,
    borderRadius: borderRadius.md,
    padding: spacing[3],
    marginBottom: spacing[4],
    alignItems: 'center',
  },
  dateDisplayText: {
    fontSize: fontSize.lg,
    color: colors.primary,
    fontWeight: fontWeight.semibold,
  },
  buttonGroup: {
    flexDirection: 'row',
    gap: spacing[2],
  },
  button: {
    flex: 1,
    paddingVertical: spacing[3],
    borderRadius: borderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonPrimary: {
    backgroundColor: colors.primary,
  },
  buttonSecondary: {
    backgroundColor: colors.gray200,
  },
  buttonText: {
    color: colors.white,
    fontWeight: fontWeight.semibold,
    fontSize: fontSize.base,
  },
  buttonTextSecondary: {
    color: colors.textPrimary,
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
// UTILITIES
// ============================================================================

/** Resolve the locale to format with: explicit prop, else app language as <lang>-IN. */
const resolveLocale = (locale?: string): string =>
  locale || `${getCurrentLanguage()}-IN`

/** Manual DD/MM/YYYY fallback used when the Intl API is unavailable (e.g. Hermes without ICU). */
const formatDateManual = (date: Date, mode: DatePickerMode): string => {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  const hours = String(date.getHours()).padStart(2, '0')
  const minutes = String(date.getMinutes()).padStart(2, '0')

  switch (mode) {
    case 'date':
      return `${day}/${month}/${year}`
    case 'time':
      return `${hours}:${minutes}`
    case 'datetime':
      return `${day}/${month}/${year} ${hours}:${minutes}`
    default:
      return ''
  }
}

const formatDate = (date: Date, mode: DatePickerMode, locale?: string): string => {
  if (!date) return ''

  const dateOptions: Intl.DateTimeFormatOptions = {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  }
  const timeOptions: Intl.DateTimeFormatOptions = {
    hour: '2-digit',
    minute: '2-digit',
  }

  try {
    const resolved = resolveLocale(locale)
    switch (mode) {
      case 'date':
        return new Intl.DateTimeFormat(resolved, dateOptions).format(date)
      case 'time':
        return new Intl.DateTimeFormat(resolved, timeOptions).format(date)
      case 'datetime':
        return new Intl.DateTimeFormat(resolved, {
          ...dateOptions,
          ...timeOptions,
        }).format(date)
      default:
        return ''
    }
  } catch {
    // Intl may be unavailable on some RN runtimes — fall back to manual format.
    return formatDateManual(date, mode)
  }
}

// ============================================================================
// COMPONENT
// ============================================================================

/**
 * AppDatePicker - Date and time picker component
 *
 * @example
 * // Basic date picker
 * <AppDatePicker
 *   label="Select Date"
 *   value={date}
 *   onChange={setDate}
 *   mode="date"
 * />
 *
 * // Date-time picker with constraints
 * <AppDatePicker
 *   label="Schedule"
 *   value={scheduledDate}
 *   onChange={setScheduledDate}
 *   mode="datetime"
 *   minimumDate={new Date()}
 *   placeholder="Pick date and time"
 * />
 *
 * // Time picker
 * <AppDatePicker
 *   label="Meeting Time"
 *   value={meetingTime}
 *   onChange={setMeetingTime}
 *   mode="time"
 * />
 */
export const AppDatePicker: React.FC<AppDatePickerProps> = ({
  label,
  value,
  onChange,
  mode = 'date',
  minimumDate: _minimumDate,
  maximumDate: _maximumDate,
  placeholder = 'Select date',
  error,
  helperText,
  disabled = false,
  locale,
  containerStyle,
}) => {
  const [isModalVisible, setIsModalVisible] = useState(false)
  const [tempDate, setTempDate] = useState<Date | undefined>(value)

  const displayValue = value ? formatDate(value, mode, locale) : placeholder

  const pickerWrapperStyle: ViewStyle = {
    ...styles.pickerWrapper,
    ...(error && styles.pickerWrapperError),
    ...(!disabled && { borderColor: colors.primary }),
    ...(disabled && styles.pickerWrapperDisabled),
  }

  const handleOpenPicker = () => {
    if (!disabled) {
      setIsModalVisible(true)
    }
  }

  const handleConfirm = () => {
    if (tempDate) {
      onChange?.(tempDate)
    }
    setIsModalVisible(false)
  }

  const handleCancel = () => {
    setTempDate(value)
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
        onPress={handleOpenPicker}
        disabled={disabled}
        style={pickerWrapperStyle}
        accessibilityRole="button"
        accessibilityLabel={label}
        accessibilityState={{ disabled }}
      >
        <View style={styles.pickerRow}>
          <AppText
            variant="body"
            style={[
              styles.pickerValue,
              !value && styles.pickerValuePlaceholder,
              disabled && styles.pickerValueDisabled,
            ]}
          >
            {displayValue}
          </AppText>
          <AppText style={styles.pickerIcon} importantForAccessibility="no">📅</AppText>
        </View>
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
        onRequestClose={handleCancel}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <AppText style={styles.modalHeader}>{label || 'Select Date'}</AppText>

            {tempDate && (
              <View style={styles.dateDisplay}>
                <AppText style={styles.dateDisplayText}>
                  {formatDate(tempDate, mode, locale)}
                </AppText>
              </View>
            )}

            <View style={styles.buttonGroup}>
              <TouchableOpacity
                style={[styles.button, styles.buttonSecondary]}
                onPress={handleCancel}
                accessibilityRole="button"
              >
                <AppText
                  style={[styles.buttonText, styles.buttonTextSecondary]}
                >
                  Cancel
                </AppText>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.button, styles.buttonPrimary]}
                onPress={handleConfirm}
                accessibilityRole="button"
              >
                <AppText style={styles.buttonText}>Confirm</AppText>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  )
}

export default AppDatePicker
