/**
 * Period helpers (US-007) — map a UI period selection to a `YYYY-MM-DD` date range.
 * Pure, no side effects. Used by the activity-log filter to translate "Today / Yesterday
 * / This Week / This Month" into the `startDate`/`endDate` query params the backend
 * expects.
 */

export type ActivityPeriod = 'today' | 'yesterday' | 'this_week' | 'this_month'

/** Ordered keys matching the segmented-control segment order. */
export const PERIOD_KEYS: ActivityPeriod[] = ['today', 'yesterday', 'this_week', 'this_month']

/** Formats a Date as a local `YYYY-MM-DD` string (no timezone shift). */
export function toDateString(date: Date): string {
  const yyyy = date.getFullYear()
  const mm = String(date.getMonth() + 1).padStart(2, '0')
  const dd = String(date.getDate()).padStart(2, '0')
  return `${yyyy}-${mm}-${dd}`
}

/** Resolves a period to an inclusive `{ startDate, endDate }` range. */
export function periodToDateRange(period: ActivityPeriod): {
  startDate: string
  endDate: string
} {
  const now = new Date()
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())

  switch (period) {
    case 'today':
      return { startDate: toDateString(today), endDate: toDateString(today) }
    case 'yesterday': {
      const y = new Date(today)
      y.setDate(y.getDate() - 1)
      return { startDate: toDateString(y), endDate: toDateString(y) }
    }
    case 'this_week': {
      // Week starts on Sunday (consistent with the story sample's getDay()).
      const start = new Date(today)
      start.setDate(start.getDate() - start.getDay())
      return { startDate: toDateString(start), endDate: toDateString(today) }
    }
    case 'this_month': {
      const start = new Date(today.getFullYear(), today.getMonth(), 1)
      return { startDate: toDateString(start), endDate: toDateString(today) }
    }
    default:
      return { startDate: toDateString(today), endDate: toDateString(today) }
  }
}
