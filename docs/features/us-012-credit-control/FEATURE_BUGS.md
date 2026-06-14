# Feature Bugs — US-012 Credit Control (Frontend)

> Populated by QA after implementation + review. Empty at architect handoff.

## Bug Template
### BUG-[n]: [title]
- **Severity**: Critical / High / Medium / Low
- **Screen / Route**: e.g. `PriorityListScreen` `/(app)/collections/priority`
- **Steps to Reproduce**:
- **Expected**:
- **Actual**:
- **Root Cause**: Architecture / Implementation / Missing validation / i18n / a11y / perf
- **Status**: Open / Fixed / Verified / Won't Fix

---

## QA Focus Areas (from FEATURE_PLAN — verify, don't assume)
- 5 states on every one of the 7 screens (esp. Offline banner + disabled write actions).
- Owner-only: staff token / staff context never reaches any credit screen.
- Set-credit-settings: `limit_below_outstanding` shown as non-blocking warning (still saves);
  `deliveriesPaused` banner; breach radio forced/disabled to `warn` when type=unlimited.
- Enable-prepaid two-outcome: `clearOutstandingRequired=true` does NOT navigate as success;
  409 "already prepaid" friendly message.
- Single reminder `skipped=true` (already_paid / duplicate_today) → info, not success/error.
- Bulk result shows `sent/skipped/failed`.
- Reminder config: auto-on with no schedule blocked; unknown template placeholder rejected.
- `daysOverdue > 365` renders `365+`.
- 429 rate-limit messaging on reminder sends; no auto-retry.
- i18n across all 9 languages, text overflow on long Indian-language labels.
- Low-end device: FlatList scroll perf on priority/history with 500+ rows; bar rendering.

(No bugs logged yet.)
