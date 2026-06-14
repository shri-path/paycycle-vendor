# Feature Tasks — US-012 Credit Control (Frontend)

> Implement in order. Each task lists exact files + the skill to follow. Reuse existing
> base components from `src/components/` and existing US-010 cards where noted. Do NOT
> rebuild US-011 `BulkSendRemindersScreen` (only repoint per T-15 / OQ-6).

Skill legend: TYPES, `api-integration`, `state-management`, `component-development`,
`ui-visual-design`, `screen-development`, `form-validation`, `navigation-routing`,
`localization-i18n`, `error-handling`, `accessibility-ux`, `animation-haptics`,
`performance-optimization`, `security-auth`, `testing-strategy`.

---

## Step 1 — Types
- **T-01** — Create `src/types/credit.ts` with every DTO in FEATURE_PLAN §5 (mirror API_SPEC
  exactly; reuse `AgingBucket` from `dashboard.ts`; discriminated unions for `EnablePrepaidResultDto`).
  *Skill: TYPES. No `any`.* **Output:** `src/types/credit.ts`. **AC:** compiles; all 11 endpoints' shapes present.
- **T-02** — Add the `Credit` path group to `src/constants/apiPaths.ts` (FEATURE_PLAN §5 builders,
  no `/v1` prefix). **Output:** edited `apiPaths.ts`. **AC:** 9 builders exported, typed `as const`.

## Step 2 — Service
- **T-03** — Create `src/modules/credit/service/credit.mock.ts` with realistic fixtures for all
  GET responses (dashboard, priority-list per sort, analytics, aging, reminder-config, history)
  matching the wireframe numbers. *Skill: `api-integration`.* **Output:** `credit.mock.ts`.
- **T-04** — Create `src/modules/credit/service/credit.service.ts` (`creditService`) — 11 methods
  per FEATURE_PLAN §5 table; branch on `isMockMode` + `simulateNetworkDelay()`; coerce numeric ids
  to strings; object-envelope `data.data`, history `data`+`meta`. Export from
  `src/services/api.service.ts` barrel. *Skill: `api-integration`, `security-auth` (no vendorId from
  client).* **Output:** `credit.service.ts`, edited `api.service.ts`. **AC:** DoD checklist in skill.

## Step 3 — Store
- **T-05** — Create `src/modules/credit/store/credit.store.ts` (`useCreditStore`) per FEATURE_PLAN
  §3 — all query + command actions, per-slice loading/error, `remindingCustomerIds` guard,
  `mapApiError(_, 'credit', action)`, `logError`, rethrow on commands, no persistence.
  *Skill: `state-management`, `error-handling`.* **Output:** `credit.store.ts`.
- **T-06** — Wire `clearCredit()` into `auth.store.logout()` via lazy-require (mirror
  `clearDashboard()`). *Skill: `state-management`, `security-auth`.* **Output:** edited `auth.store.ts`.

## Step 4 — Components (parallelizable; each with a `__tests__` sibling)
- **T-07** — Dashboard cards: `OutstandingOverviewCard`, `NetReceivableCard`, `MonthProgressCard`,
  `QuickActionsGrid`, `AtLimitList`. Reuse dashboard `OutstandingAgingCard`/`AdvanceCreditCard`.
  *Skill: `component-development`, `ui-visual-design`, `animation-haptics` (grid tiles).*
  **Output:** files under `src/modules/credit/components/`.
- **T-08** — Priority components: `CreditPriorityCard` (Remind/Call/Block actions, per-priority
  action set, per-card in-flight Remind state), `AdvanceCreditRow` (reuse), `SortDropdown`.
  *Skill: `component-development`, `ui-visual-design`, `accessibility-ux` (44pt targets, action labels).*
  **Output:** `src/modules/credit/components/`.
- **T-09** — Credit-settings form components: `CreditTypeRadioGroup`, `SuggestedLimitChips`,
  `WarningThresholdField`, `BreachActionRadioGroup` (force/disable `warn` when type=unlimited).
  *Skill: `component-development`, `form-validation`.* **Output:** `src/modules/credit/components/`.
- **T-10** — Reminder-config + history components: `ReminderTemplateEditor` (placeholder chips +
  client validation), `ExcludedCustomersField`, `ReminderTimelineItem`.
  *Skill: `component-development`, `form-validation`.* **Output:** `src/modules/credit/components/`.
- **T-11** — Analytics components: `PaymentModeBars`, `CollectionTrendBars`, `RankedAmountList`
  (pure-`View` bars, no chart lib — OQ-5). *Skill: `component-development`, `ui-visual-design`,
  `performance-optimization`.* **Output:** `src/modules/credit/components/`. Add a barrel `index.ts`.

## Step 5 — Screens (each: 5 states, ScreenErrorBoundary split, useRequireOwner, useShallow)
- **T-12** — `CollectionsDashboardScreen` [S1] (wireframe 2.33). Refetch on focus. Quick-action
  routing per FEATURE_PLAN §2. *Skill: `screen-development`, `ui-visual-design`, `accessibility-ux`,
  `security-auth`.* **Output:** `src/modules/credit/screens/CollectionsDashboardScreen.tsx`.
- **T-13** — `PriorityListScreen` [S2] (2.34) — grouped FlatList, sort, inline Remind mutation
  (per-card state), Call (`Linking`), Block→S4. *Skill: `screen-development`, `performance-optimization`,
  `animation-haptics`.* **Output:** `PriorityListScreen.tsx`.
- **T-14** — `SetCreditSettingsScreen` [S3] (2.35) — type/limit/threshold/breach form; PATCH;
  handle `warning='limit_below_outstanding'` + `deliveriesPaused`; invalidate customer detail.
  *Skill: `screen-development`, `form-validation`, `error-handling`.* **Output:** `SetCreditSettingsScreen.tsx`.
- **T-15** — `EnablePrepaidScreen` [S4] (2.36) — two-outcome handling (discriminated union),
  clear-first CTA → record-payment, 409 mapping. *Skill: `screen-development`, `form-validation`,
  `error-handling`.* **Output:** `EnablePrepaidScreen.tsx`.
- **T-16** — `ReminderConfigScreen` [S5] (2.37) — toggle + schedules (≥1 if auto on) + template +
  exclusions; GET then PATCH; placeholder validation. *Skill: `screen-development`, `form-validation`.*
  **Output:** `ReminderConfigScreen.tsx`.
- **T-17** — `ReminderHistoryScreen` [S6] (2.38) — summary + paginated FlatList + Send Another
  (skip-aware soft outcome). *Skill: `screen-development`, `performance-optimization`.*
  **Output:** `ReminderHistoryScreen.tsx`.
- **T-18** — `CollectionAnalyticsScreen` [S7] (2.39) — month selector, summary, bars, ranked lists;
  read cache before refetch on month change. *Skill: `screen-development`, `ui-visual-design`.*
  **Output:** `CollectionAnalyticsScreen.tsx`.

## Step 6 — Navigation
- **T-19** — Repoint `app/(app)/collections.tsx` to the new `CollectionsDashboardScreen`; add route
  files + `_layout.tsx` for `collections/priority|reminder-config|analytics` and
  `customers/[customerId]/credit-settings|enable-prepaid|reminder-history` (thin wrappers).
  *Skill: `navigation-routing`.* **Output:** new/edited files under `app/(app)/`.
- **T-20** — Repoint the customer-detail "Credit" CTA (US-008) to `…/credit-settings` [S3] and the
  dashboard at-limit rows + priority Block to their destinations (FEATURE_PLAN §2, OQ-2/OQ-7).
  *Skill: `navigation-routing`.* **Output:** edited customer-detail screen + any caller.
- **T-21 (OQ-6, conditional)** — Repoint US-011 `BulkSendRemindersScreen` to
  `creditService.sendBulkReminders` with `{ target, customerIds }` payload. Only do this once the
  real bulk endpoint is confirmed (see OQ-6). *Skill: `api-integration`, `screen-development`.*
  **Output:** edited `BulkSendRemindersScreen.tsx` + its service. **If unconfirmed: skip, leave note.**

## Step 7 — Localization
- **T-22** — Add all `credit.*` keys (FEATURE_PLAN §8) to all 9 locale files; reuse existing
  `dashboard.*`/`customer.*` keys where identical. *Skill: `localization-i18n`.* **Output:** 9 edited locale files.

## Step 8 — Cross-cutting passes
- **T-23** — Error-handling + accessibility + animation/haptics pass across all screens
  (correlationId logging, no PII, 44pt targets, RTL-safe, haptics on every action).
  *Skills: `error-handling`, `accessibility-ux`, `animation-haptics`.*
- **T-24** — Performance pass: memoize cards, tune FlatLists (`keyExtractor`, `getItemLayout`,
  windowing), debounce exclusion search. *Skill: `performance-optimization`.*

## Step 9 — Tests
- **T-25** — Component tests for all Step-4 components (render, props, action callbacks, a11y).
  *Skill: `testing-strategy`.* **Output:** `__tests__/` siblings.
- **T-26** — Store tests: query happy/error paths, command rethrow, skip-outcome handling,
  per-card remind guard, `clearCredit`. *Skill: `testing-strategy`.* **Output:** `store/__tests__/credit.store.test.ts`.
- **T-27** — Service tests: mock-mode returns, id coercion, envelope parsing.
  *Skill: `testing-strategy`.* **Output:** `service/__tests__/credit.service.test.ts`.
- **T-28** — Screen tests: 5 states per screen, owner-guard, key flows (set-credit warning,
  prepaid two-outcome, reminder skip, config validation). *Skill: `testing-strategy`.*
  **Output:** `screens/__tests__/*.test.tsx`.

## Step 10 — Progress
- **T-29** — Update `PROGRESS_TRACKER.md` US-012 notes when frontend implementation completes.
