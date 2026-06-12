/**
 * Subscription usage utilities (US-009).
 * Pure helper functions — no side effects, no PII, fully unit-testable.
 *
 * Key rules:
 * - `max === 0` means "Unlimited" everywhere.
 * - Usage colour: green < 80%, orange 80–94%, red >= 95%.
 * - Money is plain INR number; use formatCurrency from @utils/formatCurrency
 *   for locale-aware rendering in components.
 */

import { colors } from '@constants/tokens'

/**
 * Returns true when a max-limit value represents "unlimited" (i.e. max === 0).
 * Mirrors the API convention: `maxCustomers = 0` → Unlimited.
 */
export function isUnlimited(max: number): boolean {
  return max === 0
}

/**
 * Maps a utilization percentage to a semantic color token.
 * - green  (success)  : pct < 80
 * - orange (warning)  : 80 <= pct < 95
 * - red    (error)    : pct >= 95
 */
export function usageColor(pct: number): string {
  if (pct >= 95) return colors.error
  if (pct >= 80) return colors.warning
  return colors.success
}

/**
 * Formats a monetary amount as a simple ₹-prefixed string (e.g. "₹499").
 * Use formatCurrency from @utils/formatCurrency for full locale-aware formatting
 * with grouping separators; this helper is for quick plan-price display where a
 * locale-aware import would create a circular dep inside the module utils folder.
 *
 * This function is only used when the existing formatCurrency utility is not
 * accessible. Prefer formatCurrency in components.
 */
export function formatMoney(amount: number): string {
  return `₹${amount}`
}

/**
 * Calculates the number of whole days from now until a given ISO date.
 * Returns 0 if the date is today or in the past.
 * Used by SubscriptionBanner for the "Expires in N days" condition.
 */
export function daysUntil(dateISO: string): number {
  const now = new Date()
  const target = new Date(dateISO)
  if (Number.isNaN(target.getTime())) return 0
  const diffMs = target.getTime() - now.getTime()
  if (diffMs <= 0) return 0
  return Math.floor(diffMs / (1000 * 60 * 60 * 24))
}
