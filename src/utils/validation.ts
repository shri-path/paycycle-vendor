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
  // Supply-list name (US-005). Free text, server caps at 100.
  supplyListName: 100,
  // Extra-charge amount digits (US-006).
  amount: 12,
  // Extra-charge comment / leave reason (US-006). Free text, generous cap.
  comment: 280,
} as const

// ---------------------------------------------------------------------------
// Allowlist regexes (single source of truth)
// ---------------------------------------------------------------------------

// Business names: letters (any script) + marks + digits + space and a few
// common separators used in Indian business names (e.g. "Milk & More", "A-1 Dairy").
const BUSINESS_NAME_RE = /^[\p{L}\p{M}\p{N} .,'&()/-]+$/u
// Area / route labels: letters (any script) + marks + digits + space and common
// separators used in Indian place names (e.g. "Sector 15, Tower A-D", "Block 2/3").
const AREA_LABEL_RE = /^[\p{L}\p{M}\p{N} .,\-/()]+$/u
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
export const INJECTION_RE = /<\/?\s*\w|[<>]|--|\/\*|\*\/|\bOR\b\s+\d+\s*=\s*\d+|xp_/i

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
  if (!AREA_LABEL_RE.test(v)) return 'validation.invalid_characters'
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

// ---------------------------------------------------------------------------
// Supply-list field validators (US-005)
// Numeric fields arrive as raw text strings (text inputs); '' means "unset".
// Each returns an i18n key on failure, or null when valid/empty-optional.
// ---------------------------------------------------------------------------

const HHMM_RE = /^([01]\d|2[0-3]):[0-5]\d$/

/** Supply-list days that can be selected per frequency. */
export type SupplyDaysFrequency = 'DAILY' | 'WEEKLY' | 'MONTHLY'

/**
 * Validates a supply-list name (required free text). Sanitize with sanitizeText
 * BEFORE calling; this guards length + injection/markup sequences.
 * @returns An i18n key if invalid, or null if valid.
 */
export function validateSupplyListName(raw: string): string | null {
  const v = raw.trim()
  if (v.length < 1) return 'validation.required'
  if (v.length > LIMITS.supplyListName) return 'validation.too_long'
  if (hasControlChar(v) || INJECTION_RE.test(v)) return 'validation.invalid_input'
  return null
}

/** Validates the required unit selection. */
export function validateSupplyUnit(unit: string): string | null {
  return unit === '' ? 'validation.required' : null
}

/**
 * Validates an OPTIONAL non-negative numeric text field (quantity / rate).
 * Empty is allowed; otherwise must be a finite number ≥ 0.
 * @returns An i18n key if invalid, or null if valid/empty.
 */
export function validateOptionalNonNegativeNumber(raw: string): string | null {
  const trimmed = raw.trim()
  if (trimmed === '') return null
  const n = Number(trimmed)
  if (!Number.isFinite(n) || n < 0) return 'validation.invalid_number'
  return null
}

/**
 * Validates an OPTIONAL "HH:mm" 24-hour start time.
 * @returns An i18n key if invalid, or null if valid/empty.
 */
export function validateStartTime(raw: string): string | null {
  const v = raw.trim()
  if (v === '') return null
  return HHMM_RE.test(v) ? null : 'validation.invalid_time'
}

/**
 * Validates the frequency-conditional day selection.
 * DAILY → no days; WEEKLY → 1..7 required; MONTHLY → 1..31 required.
 * @returns An i18n key if invalid, or null if valid.
 */
export function validateFrequencyDays(
  frequency: SupplyDaysFrequency,
  days: number[],
): string | null {
  if (frequency === 'DAILY') return null
  if (days.length === 0) return 'validation.invalid_days'
  const max = frequency === 'WEEKLY' ? 7 : 31
  const allInRange = days.every((d) => Number.isInteger(d) && d >= 1 && d <= max)
  return allInRange ? null : 'validation.invalid_days'
}

/**
 * Validates that an optional primary-staff id is a member of the assigned staff.
 * @returns An i18n key if invalid, or null if valid/empty.
 */
export function validatePrimaryStaffId(
  primaryStaffId: string,
  staffIds: string[],
): string | null {
  if (primaryStaffId === '') return null
  return staffIds.includes(primaryStaffId) ? null : 'validation.required'
}

// ---------------------------------------------------------------------------
// Delivery (US-006)
// ---------------------------------------------------------------------------

const AMOUNT_RE = /^\d+(\.\d{1,2})?$/

/**
 * Validates an extra-charge amount (US-006). Forgiving parse: strips spaces and
 * thousands separators before checking. Must be a non-zero positive number with
 * at most 2 decimals.
 * @returns An i18n key if invalid, or null if valid.
 */
export function validateAmount(raw: string): string | null {
  const v = raw.trim().replace(/[\s,]/g, '')
  if (!v) return 'validation.required'
  if (!AMOUNT_RE.test(v)) return 'validation.invalid_amount'
  if (Number(v) <= 0) return 'validation.amount_positive'
  if (v.replace('.', '').length > LIMITS.amount) return 'validation.too_long'
  return null
}

/** Normalises an amount string to a number (strips spaces/commas). 0 on invalid. */
export function parseAmount(raw: string): number {
  const v = raw.trim().replace(/[\s,]/g, '')
  const n = Number(v)
  return Number.isFinite(n) ? n : 0
}

/**
 * Validates a required free-text comment / reason (US-006 extra charge).
 * @returns An i18n key if invalid, or null if valid.
 */
export function validateComment(raw: string): string | null {
  const v = raw.trim()
  if (!v) return 'validation.required'
  if (v.length > LIMITS.comment) return 'validation.too_long'
  if (hasControlChar(v) || INJECTION_RE.test(v)) return 'validation.invalid_characters'
  return null
}
