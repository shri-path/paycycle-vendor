/**
 * formatDate — locale-aware date formatting helpers.
 * Pure, no side effects, no PII. Used by screens/components to render ISO dates.
 */

import { getCurrentLanguage } from '@locales/index'

/**
 * Formats an ISO timestamp as a short, locale-aware date (e.g. "15 Jan 2026").
 * Falls back to the raw value for an unparseable input, and to the platform
 * default locale if the active language is not supported by Intl.
 */
export function formatLocaleDate(iso: string): string {
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) return iso
  try {
    return date.toLocaleDateString(getCurrentLanguage(), {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    })
  } catch {
    return date.toLocaleDateString()
  }
}
