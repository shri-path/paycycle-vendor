/**
 * Validation Utilities
 * Purpose: Shared client-side validation functions for form fields
 * Returns i18n translation keys (not raw strings) so callers can use t(key)
 */

const PASSWORD_REGEX = {
  uppercase: /[A-Z]/,
  lowercase: /[a-z]/,
  digit: /[0-9]/,
  special: /[^A-Za-z0-9]/,
} as const

/**
 * Validates a password against PayCycle's complexity requirements.
 * @returns An i18n translation key if validation fails, or null if valid.
 */
export function validatePassword(password: string): string | null {
  if (password.length < 8) return 'validation.password_min_8'
  if (!PASSWORD_REGEX.uppercase.test(password)) return 'validation.password_complexity'
  if (!PASSWORD_REGEX.lowercase.test(password)) return 'validation.password_complexity'
  if (!PASSWORD_REGEX.digit.test(password)) return 'validation.password_complexity'
  if (!PASSWORD_REGEX.special.test(password)) return 'validation.password_complexity'
  return null
}

/**
 * Validates an Indian phone number (10 digits after country code stripping).
 * @returns An i18n translation key if invalid, or null if valid.
 */
export function validatePhone(phone: string): string | null {
  const digits = phone.replace(/\D/g, '')
  if (digits.length < 10) return 'validation.invalid_phone'
  return null
}
