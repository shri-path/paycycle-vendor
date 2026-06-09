/**
 * Validation Utilities
 * Purpose: Shared, pure client-side validators for form fields.
 *
 * Contract (see skill `form-validation.md`):
 * - Each validator returns an i18n translation KEY (string) on failure, or `null` if valid.
 * - No side effects, no `t()` inside — callers translate with t(key) at render time.
 * - Always trim, always cap length, prefer allowlist regex, guard free text against
 *   control chars / injection sequences as defense-in-depth (server is the authority).
 */

/** Single source of truth for per-field maximum lengths. */
export const LIMITS = {
  phone: 15,
  name: 60,
  // Business name shares the generic name cap; kept as a named alias for callers.
  businessName: 60,
  password: 64,
  otp: 6,
  // Area / route label for staff (US-002). Free text, generous cap.
  areaLabel: 200,
} as const

// ---------------------------------------------------------------------------
// Allowlist regexes (single source of truth)
// ---------------------------------------------------------------------------

// Business names: letters (any script) + marks + digits + space and a few
// common separators used in Indian business names (e.g. "Milk & More", "A-1 Dairy").
const BUSINESS_NAME_RE = /^[\p{L}\p{M}\p{N} .,'&()/-]+$/u
const OTP_RE = /^\d{6}$/

const PASSWORD_REGEX = {
  uppercase: /[A-Z]/,
  lowercase: /[a-z]/,
  digit: /[0-9]/,
  special: /[^A-Za-z0-9]/,
} as const

// ---------------------------------------------------------------------------
// Defense-in-depth guards (NOT the primary control — allowlist regex is)
// ---------------------------------------------------------------------------

// Matches obvious injection / markup / SQL meta-sequences in free text.
const INJECTION_RE = /<\/?\s*\w|[<>]|--|\/\*|\*\/|\bOR\b\s+\d+\s*=\s*\d+|xp_/i

/** Control chars = code points < 0x20 (C0) or 0x7F (DEL). Checked by code point. */
const isControlChar = (ch: string): boolean => {
  const n = ch.charCodeAt(0)
  return n < 0x20 || n === 0x7f
}

const hasControlChar = (s: string): boolean => Array.from(s).some(isControlChar)

/** Strips control characters from free text (call on every change). */
export function sanitizeText(s: string): string {
  return Array.from(s)
    .filter((c) => !isControlChar(c))
    .join('')
}

// ---------------------------------------------------------------------------
// Validators (return i18n key | null)
// ---------------------------------------------------------------------------

/**
 * Validates a business / vendor name (free text).
 * @returns An i18n key if invalid, or null if valid.
 */
export function validateBusinessName(raw: string): string | null {
  const v = raw.trim().replace(/\s+/g, ' ')
  if (!v) return 'validation.business_name_required'
  if (v.length > LIMITS.businessName) return 'validation.business_name_invalid'
  if (hasControlChar(v) || INJECTION_RE.test(v)) return 'validation.business_name_invalid'
  if (!BUSINESS_NAME_RE.test(v)) return 'validation.business_name_invalid'
  return null
}

/**
 * Validates an optional staff name (US-002). Empty is allowed (name is optional);
 * when present it must pass the name allowlist + length cap.
 * @returns An i18n key if invalid, or null if valid/empty.
 */
export function validateStaffName(raw: string): string | null {
  const v = raw.trim().replace(/\s+/g, ' ')
  if (!v) return null // optional
  if (v.length > LIMITS.name) return 'validation.too_long'
  if (hasControlChar(v) || INJECTION_RE.test(v)) return 'validation.invalid_characters'
  if (!BUSINESS_NAME_RE.test(v)) return 'validation.invalid_characters'
  return null
}

/**
 * Validates an optional area / route label (US-002). Empty allowed; otherwise
 * capped and guarded against control chars / injection sequences.
 * @returns An i18n key if invalid, or null if valid/empty.
 */
export function validateAreaLabel(raw: string): string | null {
  const v = raw.trim().replace(/\s+/g, ' ')
  if (!v) return null // optional
  if (v.length > LIMITS.areaLabel) return 'validation.too_long'
  if (hasControlChar(v) || INJECTION_RE.test(v)) return 'validation.invalid_characters'
  return null
}

/**
 * Validates a phone number's local part (digits only, country code stripped by caller).
 * @returns An i18n key if invalid, or null if valid.
 */
export function validatePhone(phone: string): string | null {
  const digits = phone.replace(/\D/g, '')
  if (!digits) return 'validation.required'
  if (digits.length < 10) return 'validation.invalid_phone'
  if (digits.length > LIMITS.phone) return 'validation.invalid_phone'
  return null
}

/**
 * Validates a 6-digit OTP code.
 * @returns An i18n key if invalid, or null if valid.
 */
export function validateOtp(raw: string): string | null {
  const v = raw.trim()
  if (!v) return 'validation.required'
  if (!OTP_RE.test(v)) return 'validation.otp_invalid'
  return null
}

/**
 * Validates the password field on the LOGIN screen.
 * Login does not enforce complexity (existing accounts may predate the policy) —
 * only presence and a hard max length.
 * @returns An i18n key if invalid, or null if valid.
 */
export function validateLoginPassword(password: string): string | null {
  if (!password) return 'validation.password_required'
  if (password.length > LIMITS.password) return 'validation.too_long'
  return null
}

/**
 * Validates a NEW password against PayCycle's complexity requirements (signup / reset).
 * @returns An i18n key if validation fails, or null if valid.
 */
export function validatePassword(password: string): string | null {
  if (!password) return 'validation.required'
  if (password.length < 8) return 'validation.password_min_8'
  if (password.length > LIMITS.password) return 'validation.too_long'
  if (!PASSWORD_REGEX.uppercase.test(password)) return 'validation.password_complexity'
  if (!PASSWORD_REGEX.lowercase.test(password)) return 'validation.password_complexity'
  if (!PASSWORD_REGEX.digit.test(password)) return 'validation.password_complexity'
  if (!PASSWORD_REGEX.special.test(password)) return 'validation.password_complexity'
  return null
}
