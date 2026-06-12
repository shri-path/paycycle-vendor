/**
 * formatCurrency — locale-aware currency formatting (INR).
 * Pure, no side effects, no PII. Renders amounts with the active language's
 * grouping and the ₹ symbol via Intl, so screens never hardcode the symbol or
 * Indian digit grouping. Accepts the string Decimal values the backend returns
 * (parse via `parseRevenue` first for arithmetic).
 */

import { getCurrentLanguage } from '@locales/index'
import { parseRevenue } from './parseRevenue'

/**
 * Formats a numeric/string amount as locale-aware INR currency (e.g. "₹1,00,000").
 * Falls back to a plain ₹-prefixed number if Intl currency is unavailable.
 */
export function formatCurrency(value: string | number | null | undefined): string {
  const amount = parseRevenue(value)
  try {
    return new Intl.NumberFormat(getCurrentLanguage(), {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 2,
    }).format(amount)
  } catch {
    return `₹${amount}`
  }
}

export default formatCurrency
