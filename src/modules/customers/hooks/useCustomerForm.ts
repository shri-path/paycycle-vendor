/**
 * useCustomerForm (US-008, WS-2B)
 * Purpose: Form state + validation for the Add Customer / Edit Customer screens.
 *
 * - Holds the editable field values, per-field error keys, and a setField updater.
 * - Validation rules:
 *     name: required, 1–100 chars, sanitized (control chars stripped).
 *     phone: exactly 10 digits (no country code). Required.
 *     email: optional; when present must be a valid email format.
 *     address: optional free text (no invariants beyond presence).
 *     area: optional free text.
 *     language: optional; any value from the supported locales.
 *     supplyListIds: optional array of string IDs.
 *     startDate: optional YYYY-MM-DD string.
 *     creditLimit: optional; numeric string ≥ 0 and ≤ 9999999.99.
 *     sendInvite: optional boolean.
 * - Errors are stored as RAW i18n keys; screens translate with t() at render time.
 * - toCreateInput() builds the POST body (CreateCustomerInput).
 * - toUpdateInput() emits ONLY changed fields vs the `initial` snapshot (minimal PATCH).
 *
 * Pure form logic only — no store / API calls (those live in the screens / store).
 * Pattern: mirrors useSupplyListForm from US-005.
 */

import { useCallback, useMemo, useRef, useState } from 'react'
import type { CreateCustomerInput, CustomerStatus, UpdateCustomerInput } from '../../../types/customer'
import { sanitizeText, INJECTION_RE } from '@utils/validation'

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const PHONE_DIGITS_RE = /^\d{10}$/
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/

const CREDIT_LIMIT_MAX = 9_999_999.99

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/** Editable form values. Numeric fields are kept as strings (text inputs). */
export interface CustomerFormValues {
  name: string
  phone: string
  phoneCountryCode: string
  email: string
  address: string
  area: string
  language: string
  supplyListIds: string[]
  startDate: string
  /** String representation of the numeric credit limit; empty = "not set". */
  creditLimit: string
  sendInvite: boolean
  /** Status field — only used by Edit screen. */
  status: CustomerStatus | ''
}

/** Per-field error keys (raw i18n keys or null). */
export type CustomerFormErrors = Partial<Record<keyof CustomerFormValues, string | null>>

export interface UseCustomerForm {
  values: CustomerFormValues
  errors: CustomerFormErrors
  setField: <K extends keyof CustomerFormValues>(
    field: K,
    value: CustomerFormValues[K],
  ) => void
  /** Run full validation; returns true when all fields are valid. */
  validate: () => boolean
  /** Live validity signal (cheap memoised; does not force a render cycle). */
  isValid: boolean
  /** Build the POST body for the Create endpoint. */
  toCreateInput: () => CreateCustomerInput
  /**
   * Build the PATCH body for the Update endpoint.
   * Returns only the fields that differ from the initial snapshot.
   */
  toUpdateInput: () => UpdateCustomerInput
}

// ---------------------------------------------------------------------------
// Defaults
// ---------------------------------------------------------------------------

const EMPTY_VALUES: CustomerFormValues = {
  name: '',
  phone: '',
  phoneCountryCode: '+91',
  email: '',
  address: '',
  area: '',
  language: '',
  supplyListIds: [],
  startDate: '',
  creditLimit: '',
  sendInvite: false,
  status: '',
}

// ---------------------------------------------------------------------------
// Validators — return i18n key | null
// ---------------------------------------------------------------------------

/** Validates customer name: required, 1–100 chars, no control chars / injection. */
function validateName(raw: string): string | null {
  const v = raw.trim()
  if (v.length < 1) return 'customer.form_name_required'
  if (v.length > 100) return 'validation.too_long'
  if (INJECTION_RE.test(v)) return 'validation.invalid_input'
  return null
}

/** Validates phone local part: required, exactly 10 digits. */
function validatePhone(raw: string): string | null {
  const digits = raw.replace(/\D/g, '')
  if (!digits) return 'customer.form_phone_required'
  if (!PHONE_DIGITS_RE.test(digits)) return 'validation.invalid_phone'
  return null
}

/** Validates email: optional; valid format when present. */
function validateEmail(raw: string): string | null {
  const v = raw.trim()
  if (!v) return null
  return EMAIL_RE.test(v) ? null : 'validation.invalid_email'
}

/** Validates credit limit: optional; 0–9999999.99 when present. */
function validateCreditLimit(raw: string): string | null {
  const trimmed = raw.trim()
  if (trimmed === '') return null
  const n = Number(trimmed)
  if (!Number.isFinite(n)) return 'validation.invalid_number'
  if (n < 0) return 'validation.invalid_number'
  if (n > CREDIT_LIMIT_MAX) return 'customer.error_invalid_credit_limit'
  return null
}

// ---------------------------------------------------------------------------
// Per-field validation router
// ---------------------------------------------------------------------------

/** Fields that participate in validation (others are always valid). */
const VALIDATED_FIELDS: (keyof CustomerFormValues)[] = [
  'name',
  'phone',
  'email',
  'creditLimit',
]

function validateField(
  field: keyof CustomerFormValues,
  values: CustomerFormValues,
): string | null {
  switch (field) {
    case 'name':
      return validateName(values.name)
    case 'phone':
      return validatePhone(values.phone)
    case 'email':
      return validateEmail(values.email)
    case 'creditLimit':
      return validateCreditLimit(values.creditLimit)
    default:
      return null
  }
}

function computeErrors(values: CustomerFormValues): CustomerFormErrors {
  const errors: CustomerFormErrors = {}
  for (const field of VALIDATED_FIELDS) {
    errors[field] = validateField(field, values)
  }
  return errors
}

// ---------------------------------------------------------------------------
// Numeric helper
// ---------------------------------------------------------------------------

/** Parses a numeric text field; '' → null, otherwise a finite number or NaN. */
function parseNum(raw: string): number | null {
  const trimmed = raw.trim()
  if (trimmed === '') return null
  return Number(trimmed)
}

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

export function useCustomerForm(initial?: Partial<CustomerFormValues>): UseCustomerForm {
  const initialValues = useMemo<CustomerFormValues>(
    () => ({ ...EMPTY_VALUES, ...initial }),
    // Snapshot once on mount — Edit pre-population is stable for the screen lifetime.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  )
  // The pristine snapshot toUpdateInput() diffs against (changed fields only).
  const initialRef = useRef<CustomerFormValues>(initialValues)

  const [values, setValues] = useState<CustomerFormValues>(initialValues)
  const [errors, setErrors] = useState<CustomerFormErrors>({})

  // Mirror the latest values so setField can compute the next state + its live
  // errors without nesting setState calls (which React may batch/drop).
  const valuesRef = useRef<CustomerFormValues>(initialValues)
  valuesRef.current = values

  const setField = useCallback(
    <K extends keyof CustomerFormValues>(field: K, value: CustomerFormValues[K]) => {
      // Sanitize free-text fields (strip control chars) before storing.
      const nextValue =
        (field === 'name' || field === 'address' || field === 'area') &&
        typeof value === 'string'
          ? (sanitizeText(value) as CustomerFormValues[K])
          : value
      const next: CustomerFormValues = { ...valuesRef.current, [field]: nextValue }
      valuesRef.current = next
      setValues(next)
      // Re-validate the touched field for live feedback.
      setErrors((prevErrors) => ({
        ...prevErrors,
        [field]: validateField(field, next),
      }))
    },
    [],
  )

  const validate = useCallback((): boolean => {
    const nextErrors = computeErrors(valuesRef.current)
    setErrors(nextErrors)
    return Object.values(nextErrors).every((e) => !e)
  }, [])

  const isValid = useMemo(
    () => Object.values(computeErrors(values)).every((e) => !e),
    [values],
  )

  // -------------------------------------------------------------------------
  // toCreateInput — builds the POST body for the Create Customer endpoint.
  // Only sends optional fields when they carry a non-empty / meaningful value.
  // -------------------------------------------------------------------------
  const toCreateInput = useCallback((): CreateCustomerInput => {
    const name = values.name.trim()
    const phone = values.phone.replace(/\D/g, '')
    const input: CreateCustomerInput = { name, phone }

    if (values.phoneCountryCode && values.phoneCountryCode !== '+91') {
      input.phoneCountryCode = values.phoneCountryCode
    }
    const email = values.email.trim()
    if (email) input.email = email

    const address = values.address.trim()
    if (address) input.address = address

    const area = values.area.trim()
    if (area) input.area = area

    const language = values.language.trim()
    if (language) input.language = language

    if (values.supplyListIds.length > 0) input.supplyListIds = values.supplyListIds

    const startDate = values.startDate.trim()
    if (startDate && DATE_RE.test(startDate)) input.startDate = startDate

    const creditLimitNum = parseNum(values.creditLimit)
    if (creditLimitNum !== null) input.creditLimit = creditLimitNum

    if (values.sendInvite) input.sendInvite = values.sendInvite

    return input
  }, [values])

  // -------------------------------------------------------------------------
  // toUpdateInput — builds the PATCH body for the Update Customer endpoint.
  // Emits ONLY the fields that differ from the initial snapshot so the Edit
  // screen sends a minimal partial update.
  // -------------------------------------------------------------------------
  const toUpdateInput = useCallback((): UpdateCustomerInput => {
    const base = initialRef.current
    const patch: UpdateCustomerInput = {}

    const name = values.name.trim()
    if (name !== base.name.trim()) patch.name = name

    const phone = values.phone.replace(/\D/g, '')
    const basePhone = base.phone.replace(/\D/g, '')
    if (phone !== basePhone) patch.phone = phone

    const email = values.email.trim()
    const baseEmail = base.email.trim()
    if (email !== baseEmail) {
      patch.email = email === '' ? undefined : email
    }

    const address = values.address.trim()
    const baseAddress = base.address.trim()
    if (address !== baseAddress) {
      patch.address = address === '' ? undefined : address
    }

    const area = values.area.trim()
    const baseArea = base.area.trim()
    if (area !== baseArea) {
      patch.area = area === '' ? undefined : area
    }

    const language = values.language.trim()
    const baseLanguage = base.language.trim()
    if (language !== baseLanguage) {
      patch.language = language === '' ? undefined : language
    }

    if (values.status !== '' && values.status !== base.status) {
      patch.status = values.status as CustomerStatus
    }

    return patch
  }, [values])

  return { values, errors, setField, validate, isValid, toCreateInput, toUpdateInput }
}

export default useCustomerForm
