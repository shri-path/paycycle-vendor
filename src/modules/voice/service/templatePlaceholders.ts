/**
 * Template Placeholder Allowlist (US-013)
 * Purpose: Client-side validation map for allowed {{token}} placeholders per
 * template type. Mirrors the API_SPEC §2.2 allowed-placeholders table so the
 * editor can surface INVALID_PLACEHOLDER errors before the PUT request.
 */

import type { TemplateType } from '../../../types/voice'

export const TEMPLATE_PLACEHOLDERS: Record<TemplateType, string[]> = {
  payment_reminder: [
    'customer_name',
    'month',
    'amount',
    'upi_id',
    'phone',
    'vendor_name',
    'due_date',
  ],
  monthly_bill: [
    'customer_name',
    'month',
    'total_due',
    'items',
    'upi_id',
    'phone',
    'vendor_name',
  ],
  delivery_confirmation: [
    'customer_name',
    'item',
    'quantity',
    'date',
    'vendor_name',
  ],
  leave_confirmation: [
    'customer_name',
    'from_date',
    'to_date',
    'vendor_name',
  ],
}

/**
 * Extract all {{token}} occurrences from a template content string.
 */
export function extractPlaceholders(content: string): string[] {
  const matches = content.match(/\{\{(\w+)\}\}/g) ?? []
  return [...new Set(matches.map((m) => m.replace(/^\{\{|\}\}$/g, '')))]
}

/**
 * Validate content against the allowed placeholder set for a template type.
 * Returns the list of invalid tokens (empty = valid).
 */
export function validatePlaceholders(content: string, templateType: TemplateType): string[] {
  const allowed = new Set(TEMPLATE_PLACEHOLDERS[templateType] ?? [])
  return extractPlaceholders(content).filter((token) => !allowed.has(token))
}
