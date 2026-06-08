/**
 * Validation Utilities Tests
 * Purpose: Cover each pure validator — valid, empty, whitespace, too-long,
 * injection, and boundary cases. Validators return i18n keys (or null).
 */

import {
  LIMITS,
  sanitizeText,
  validateBusinessName,
  validateLoginPassword,
  validateOtp,
  validatePassword,
  validatePhone,
} from '../validation'

// Control characters are built by code point to keep raw bytes out of source.
const CONTROL_CHAR = String.fromCharCode(0x07)

describe('sanitizeText', () => {
  it('strips ASCII control characters', () => {
    expect(sanitizeText(`ab${CONTROL_CHAR}cd`)).toBe('abcd')
  })

  it('leaves normal text untouched', () => {
    expect(sanitizeText('Krishna Dairy')).toBe('Krishna Dairy')
  })
})

describe('validatePhone', () => {
  it('returns null for a valid 10-digit number', () => {
    expect(validatePhone('9876543210')).toBeNull()
  })

  it('returns required key when empty', () => {
    expect(validatePhone('')).toBe('validation.required')
  })

  it('returns required key for whitespace only', () => {
    expect(validatePhone('   ')).toBe('validation.required')
  })

  it('returns invalid_phone below 10 digits (boundary)', () => {
    expect(validatePhone('987654321')).toBe('validation.invalid_phone')
  })

  it('accepts the 10-digit boundary', () => {
    expect(validatePhone('1234567890')).toBeNull()
  })

  it('returns invalid_phone above the max digit cap', () => {
    expect(validatePhone('1'.repeat(LIMITS.phone + 1))).toBe('validation.invalid_phone')
  })

  it('ignores non-digit separators', () => {
    expect(validatePhone('98765-43210')).toBeNull()
  })
})

describe('validateBusinessName', () => {
  it('returns null for a valid name', () => {
    expect(validateBusinessName('Krishna Dairy')).toBeNull()
  })

  it('allows common separators and ampersand', () => {
    expect(validateBusinessName('Milk & More (A-1)')).toBeNull()
  })

  it('returns required key when empty', () => {
    expect(validateBusinessName('')).toBe('validation.business_name_required')
  })

  it('returns required key for whitespace only', () => {
    expect(validateBusinessName('    ')).toBe('validation.business_name_required')
  })

  it('returns business_name_invalid beyond the limit (boundary)', () => {
    expect(validateBusinessName('a'.repeat(LIMITS.businessName + 1))).toBe(
      'validation.business_name_invalid',
    )
  })

  it('accepts the max-length boundary', () => {
    expect(validateBusinessName('a'.repeat(LIMITS.businessName))).toBeNull()
  })

  it('rejects script/HTML injection', () => {
    expect(validateBusinessName('<script>alert(1)</script>')).toBe(
      'validation.business_name_invalid',
    )
  })

  it('rejects SQL meta-sequences', () => {
    expect(validateBusinessName("Dairy' OR 1=1")).toBe('validation.business_name_invalid')
  })

  it('rejects control characters', () => {
    expect(validateBusinessName(`Da${CONTROL_CHAR}iry`)).toBe('validation.business_name_invalid')
  })
})

describe('validateOtp', () => {
  it('returns null for a valid 6-digit OTP', () => {
    expect(validateOtp('123456')).toBeNull()
  })

  it('returns required key when empty', () => {
    expect(validateOtp('')).toBe('validation.required')
  })

  it('returns otp_invalid for fewer than 6 digits (boundary)', () => {
    expect(validateOtp('12345')).toBe('validation.otp_invalid')
  })

  it('returns otp_invalid for more than 6 digits', () => {
    expect(validateOtp('1234567')).toBe('validation.otp_invalid')
  })

  it('returns otp_invalid for non-numeric input', () => {
    expect(validateOtp('12ab56')).toBe('validation.otp_invalid')
  })
})

describe('validateLoginPassword', () => {
  it('returns null for any non-empty password (no complexity enforced)', () => {
    expect(validateLoginPassword('anything')).toBeNull()
  })

  it('returns password_required key when empty', () => {
    expect(validateLoginPassword('')).toBe('validation.password_required')
  })

  it('returns password_required key for undefined-like empty string', () => {
    expect(validateLoginPassword('')).toBe('validation.password_required')
  })

  it('returns too_long beyond the limit', () => {
    expect(validateLoginPassword('a'.repeat(LIMITS.password + 1))).toBe('validation.too_long')
  })
})

describe('validatePassword', () => {
  it('returns null for a strong password', () => {
    expect(validatePassword('TestPass@1')).toBeNull()
  })

  it('returns required key when empty', () => {
    expect(validatePassword('')).toBe('validation.required')
  })

  it('returns password_min_8 below 8 chars (boundary)', () => {
    expect(validatePassword('Ab@1xy')).toBe('validation.password_min_8')
  })

  it('returns too_long beyond the limit', () => {
    expect(validatePassword('Aa1@' + 'a'.repeat(LIMITS.password))).toBe('validation.too_long')
  })

  it('returns complexity error without uppercase', () => {
    expect(validatePassword('testpass@1')).toBe('validation.password_complexity')
  })

  it('returns complexity error without a special character', () => {
    expect(validatePassword('TestPass11')).toBe('validation.password_complexity')
  })

  it('returns complexity error without a digit', () => {
    expect(validatePassword('TestPass@@')).toBe('validation.password_complexity')
  })
})
