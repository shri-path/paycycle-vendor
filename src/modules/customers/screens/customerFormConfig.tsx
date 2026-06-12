/**
 * customerFormConfig — shared field config for the Add / Edit customer screens
 * (US-008, WS-2B). Co-located with the owner form screens; NOT a cross-workstream
 * shared module (only Add/Edit import it).
 *
 * Provides localized option lists (language) and field metadata (labels, validation
 * rules) so both screens render identical, accessible controls without duplication.
 *
 * Tokens only; every string via the injected t(); follows the supplyListFormConfig
 * pattern from US-005.
 */

import type { SelectOption } from '@components/primitives/AppSelect'

/** Minimal translate signature (interpolation params optional). */
export type TFunc = (key: string, params?: Record<string, string | number>) => string

// ---------------------------------------------------------------------------
// Supported languages — 9 languages the vendor app ships with.
// Values match the BCP 47 / locale codes the server accepts.
// ---------------------------------------------------------------------------

const SUPPORTED_LANGUAGES = [
  { code: 'en', labelKey: 'language.en' },
  { code: 'hi', labelKey: 'language.hi' },
  { code: 'bn', labelKey: 'language.bn' },
  { code: 'gu', labelKey: 'language.gu' },
  { code: 'kn', labelKey: 'language.kn' },
  { code: 'ml', labelKey: 'language.ml' },
  { code: 'mr', labelKey: 'language.mr' },
  { code: 'ta', labelKey: 'language.ta' },
  { code: 'te', labelKey: 'language.te' },
] as const

export function LanguageOptions(t: TFunc): SelectOption[] {
  return SUPPORTED_LANGUAGES.map(({ code, labelKey }) => ({
    label: t(labelKey),
    value: code,
  }))
}

// ---------------------------------------------------------------------------
// Field metadata — labels (i18n keys) and per-field validation rules.
// Used by screens to render consistent labels + inline hint text.
// ---------------------------------------------------------------------------

export interface CustomerFieldMeta {
  /** i18n key for the field label. */
  labelKey: string
  /** Whether the field is required. */
  required: boolean
  /**
   * Validation rule description (human-readable, for reference).
   * The actual runtime validation is in useCustomerForm / validation.ts.
   */
  rule?: string
}

/**
 * Per-field metadata for the customer add / edit form.
 * Keys map 1-to-1 to CustomerFormValues field names.
 */
export const CUSTOMER_FIELD_META: Record<string, CustomerFieldMeta> = {
  name: {
    labelKey: 'customer.form_name',
    required: true,
    rule: '1–100 characters',
  },
  phone: {
    labelKey: 'customer.form_phone',
    required: true,
    rule: 'Exactly 10 digits, no country code',
  },
  email: {
    labelKey: 'customer.form_email',
    required: false,
    rule: 'Valid email format',
  },
  address: {
    labelKey: 'customer.form_address',
    required: false,
  },
  area: {
    labelKey: 'customer.form_area',
    required: false,
  },
  language: {
    labelKey: 'customer.form_language',
    required: false,
  },
  supplyListIds: {
    labelKey: 'customer.form_supply_lists',
    required: false,
  },
  startDate: {
    labelKey: 'customer.form_start_date',
    required: false,
    rule: 'YYYY-MM-DD',
  },
  creditLimit: {
    labelKey: 'customer.form_credit_limit',
    required: false,
    rule: '0–9999999.99',
  },
  sendInvite: {
    labelKey: 'customer.form_send_invite',
    required: false,
  },
} as const

// ---------------------------------------------------------------------------
// Required-field error key helpers (i18n keys returned from validation).
// Screens can use these to set field-level server errors (e.g. 409 duplicate).
// ---------------------------------------------------------------------------

export const CUSTOMER_ERROR_KEYS = {
  nameRequired: 'customer.form_name_required',
  phoneRequired: 'customer.form_phone_required',
  duplicatePhone: 'customer.error_duplicate_phone',
} as const
