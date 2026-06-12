/**
 * parseRevenue — safe Decimal-string → number conversion (US-006).
 * Purpose: backend `revenue`/`amount` Decimal fields serialise as STRINGS. Parse
 * them through this NaN-guarded helper before any arithmetic or currency
 * formatting, so a malformed/empty value never renders as "NaN".
 *
 * Pure, no side effects.
 */

/**
 * Parses a Decimal-string revenue value to a number.
 * Returns `0` for null/undefined/empty/non-numeric input (never NaN).
 */
export function parseRevenue(value: string | number | null | undefined): number {
  if (value == null) return 0
  if (typeof value === 'number') return Number.isFinite(value) ? value : 0
  const trimmed = value.trim()
  if (!trimmed) return 0
  const n = Number(trimmed)
  return Number.isFinite(n) ? n : 0
}

export default parseRevenue
