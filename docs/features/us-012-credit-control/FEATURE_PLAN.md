# Feature Plan — US-012 Credit Control & Outstanding Management (Frontend)

> Repo: `paycycle_vendor` (React Native · Expo Router · Tamagui · Zustand)
> Branch: `feat/us-012-credit-control`
> Backend contract: `paycycle_api/docs/features/us-012-credit-control/API_SPEC.md` (11 endpoints)
> Wireframes: `project_documents/vendor_app/wireframes/13-credit-control.md` §2.33–2.39
> User story: `project_documents/vendor_app/user_stories/US-012-credit-control.md`

---

## 0. Context & Relationship to Prior Work

US-012 is the **full** credit-control feature. Two earlier stories shipped partial, mock-first
slices that US-012 now supersedes and completes:

- **US-010** built `src/modules/dashboard` with a partial `CollectionsScreen`, an
  `OutstandingAgingDto`, a `fetchCollections` action backed by `GET /outstanding-aging` (a
  mock-only endpoint that **does not exist** in the real backend), and `PriorityCustomerCard`
  / `OutstandingAgingCard` / `AdvanceCreditCard` components. Its `CollectionsScreen` header
  comment explicitly notes *"Send Reminder is omitted for MVP (no backend endpoint yet)"*.
- **US-011** built `src/modules/settings` with `BulkSendRemindersScreen` (mock) plus a
  `DefaultCreditSection` for vendor-level credit defaults.

**Decision (see OQ-1): US-012 owns a new `credit` module** (`src/modules/credit`) that becomes
the home for all collections + credit + reminder screens. The legacy US-010 collections slice
is **retargeted**, not duplicated:

- The new collections dashboard replaces the US-010 `CollectionsScreen` at the `/collections`
  route. The US-010 screen file is retired (route repointed) but its three reusable cards
  (`PriorityCustomerCard`, `OutstandingAgingCard`, `AdvanceCreditCard`) are **promoted/copied**
  into the credit module and extended (the existing ones stay where they are to avoid breaking
  the dashboard's own imports; the credit module imports them via the dashboard component
  barrel where shapes match, and defines new variants where the contract differs — see §4).
- `BulkSendRemindersScreen` (US-011) is **reused as-is** for the bulk-reminder flow and simply
  linked from the new dashboard's Quick Actions. US-012 does **not** rebuild it.

This keeps US-012 additive and avoids regressing shipped US-010/US-011 surfaces.

---

## 1. Scope — Screens (7) + Components

All screens are **owner-only** (`useRequireOwner()` guard; backend returns 403 for staff).
All live under `src/modules/credit/screens/`; route files under `app/(app)/`.

| # | Screen | Route | Wireframe | Primary endpoint(s) |
|---|--------|-------|-----------|---------------------|
| S1 | `CollectionsDashboardScreen` | `/(app)/collections` (repoint) | 2.33 | `GET …/collections/dashboard` |
| S2 | `PriorityListScreen` | `/(app)/collections/priority` | 2.34 | `GET …/collections/priority-list`, `POST …/customers/{id}/reminders` |
| S3 | `SetCreditSettingsScreen` | `/(app)/customers/[customerId]/credit-settings` | 2.35 | `PATCH …/customers/{id}/credit-settings` |
| S4 | `EnablePrepaidScreen` | `/(app)/customers/[customerId]/enable-prepaid` | 2.36 | `POST …/customers/{id}/enable-prepaid` |
| S5 | `ReminderConfigScreen` | `/(app)/collections/reminder-config` | 2.37 | `GET`/`PATCH …/reminder-config` |
| S6 | `ReminderHistoryScreen` | `/(app)/customers/[customerId]/reminder-history` | 2.38 | `GET …/customers/{id}/reminders`, `POST …/customers/{id}/reminders` |
| S7 | `CollectionAnalyticsScreen` | `/(app)/collections/analytics` | 2.39 | `GET …/collections/analytics` |

`GET …/collections/aging` (standalone aging) is **not a standalone screen** — the dashboard
already returns the same buckets inside `outstandingOverview`. It is exposed as a service method
+ store action and consumed only if a future "Aging detail" drill-down is added. (See OQ-4.)

### Existing screen retained
`SetCreditLimitScreen` (US-008, `src/modules/customers`) sets *only* a numeric credit limit via
the US-008 `PATCH …/credit-limit` endpoint. US-012's `SetCreditSettingsScreen` is the richer
superset (type + limit + threshold + breach action). **Decision (OQ-2):** the US-008 screen
stays for its existing entry point; the customer-detail "Credit" action is repointed to the new
US-012 `SetCreditSettingsScreen`. We do not delete US-008's screen (out of scope, avoids
regression), but it is no longer the primary credit entry point.

---

## 2. Navigation Plan

```
(app)
├── collections.tsx                         → CollectionsDashboardScreen   [S1]  (repoint from dashboard module)
├── collections/
│   ├── _layout.tsx                         Stack (headerShown:false; screens own AppHeader)
│   ├── priority.tsx                        → PriorityListScreen           [S2]
│   ├── reminder-config.tsx                 → ReminderConfigScreen         [S5]
│   └── analytics.tsx                       → CollectionAnalyticsScreen    [S7]
└── customers/[customerId]/
    ├── credit-settings.tsx                 → SetCreditSettingsScreen      [S3]
    ├── enable-prepaid.tsx                  → EnablePrepaidScreen          [S4]
    └── reminder-history.tsx                → ReminderHistoryScreen        [S6]
```

Navigation edges (all `router.push`; `router.back()` returns; ≤2 taps to every primary action):

- **Dashboard [S1] Quick Actions (2×2 grid):**
  - *Send Bulk Reminders* → `/(app)/settings/bulk/send-reminders` (reuse US-011 `BulkSendRemindersScreen`)
  - *View Priority* → `/(app)/collections/priority` [S2]
  - *Collection Analytics* → `/(app)/collections/analytics` [S7]
  - *Export Report* → see OQ-3 (recommend: hidden/disabled-with-tooltip for MVP)
  - Header overflow / secondary action *Reminder Settings* → `/(app)/collections/reminder-config` [S5]
- **Dashboard [S1] "At Credit Limit" rows** → tap a row → `/(app)/customers/{id}` (US-008 detail) or
  `/(app)/customers/{id}/credit-settings` [S3]. Recommend the latter (the actionable destination).
- **Priority list [S2] card actions:** `[Remind]` (inline mutation, stays on screen),
  `[Call]` (`Linking.openURL('tel:…')`), `[Block]` → `/(app)/customers/{id}/enable-prepaid` [S4]
  (per wireframe + story, "Block" = move to prepaid). High-priority cards show all three; medium
  shows Remind + Call; low/advance are read-only.
- **Customer detail (US-008) "Credit" action** → `/(app)/customers/{id}/credit-settings` [S3].
- **[S3] / [S4] / [S6]** read `customerId` from `useLocalSearchParams`.
- **[S6] "Send Another Reminder"** → inline `POST …/reminders` mutation, then refresh history.

`customers/_layout.tsx` and `collections/_layout.tsx` are thin Expo Router `Stack`s. Route files
are thin wrappers (`export default CreditScreen`) per `navigation-routing.md`. The `(app)` guard
already enforces auth; owner-gating is per-screen via `useRequireOwner()`.

---

## 3. State / Data Layer

New **`useCreditStore`** in `src/modules/credit/store/credit.store.ts` (one store per feature,
`state-management.md`). No persistence — financial data is live/ephemeral (mirror
`dashboard.store`'s in-memory discipline). `error` fields hold **i18n keys** via
`mapApiError(err, 'credit', action)`. `vendorId` is always JWT-derived
(`useAuthStore.getState().vendorContext.vendorId`) — never from params/UI.

### Store shape (slices keyed by concern; each slice has its own loading/error flag)

```
interface CreditState {
  // Queries
  dashboard: CollectionsDashboardDto | null
  isDashboardLoading: boolean
  dashboardError: string | null

  priorityList: PriorityListDto | null
  isPriorityLoading: boolean
  priorityError: string | null
  prioritySort: PrioritySort               // 'oldest_first' default; drives refetch

  analytics: CollectionAnalyticsDto | null
  isAnalyticsLoading: boolean
  analyticsError: string | null
  analyticsMonth: string                   // YYYY-MM; default current month

  reminderConfig: ReminderConfigDto | null
  isReminderConfigLoading: boolean
  reminderConfigError: string | null

  // History keyed by customerId (paginated; append on page>1)
  history: Record<string, ReminderHistoryDto>
  isHistoryLoading: boolean
  historyError: string | null

  // Mutation flags (shared single flag per mutation family)
  isMutating: boolean                      // credit-settings / enable-prepaid / send-reminder / config
  mutationError: string | null
  // Per-customer in-flight reminder guard for the priority list (avoids one tap
  // disabling every card's Remind button)
  remindingCustomerIds: string[]

  // Query actions
  fetchDashboard(): Promise<void>
  fetchPriorityList(sort?: PrioritySort): Promise<void>
  fetchAnalytics(month?: string): Promise<void>
  fetchReminderConfig(): Promise<void>
  fetchReminderHistory(customerId: string, page?: number): Promise<void>

  // Command actions (online-only; rethrow so screens can haptic + route)
  updateCreditSettings(customerId: string, patch: UpdateCreditSettingsDto): Promise<CreditSettingsResultDto>
  enablePrepaid(customerId: string, dto: EnablePrepaidDto): Promise<EnablePrepaidResultDto>
  sendReminder(customerId: string, customMessage?: string): Promise<SendReminderResultDto>
  updateReminderConfig(patch: UpdateReminderConfigDto): Promise<ReminderConfigDto>

  clearErrors(): void
  clearCredit(): void                      // called by auth.store.logout()
}
```

### Cross-store consistency (important)
A successful **credit-settings change / enable-prepaid / payment-affecting** action can change a
customer's `currentBalance`, `creditType`, or `deliveriesPaused`. To avoid stale data:

1. After `updateCreditSettings` / `enablePrepaid` succeed, the screen calls
   `useCustomersStore.getState().invalidateDetail(customerId)` (or refetch) via **lazy-require**
   (same pattern `dashboard.store.setAutoMark` uses to avoid module cycles). The credit store
   must **not** import the customers store at module top-level.
2. The dashboard slice is **refetched on focus** (`useFocusEffect`) so returning from a mutation
   shows fresh numbers — do not attempt optimistic patching of aggregate totals.

### `clearCredit()` wiring
Add a lazy-require `clearCredit()` call inside `auth.store.logout()` alongside the existing
`clearDashboard()` / `clearSubscription()` calls (mirror the established pattern). Logout is the
only writer that touches all feature stores.

---

## 4. Components

Reusable, presentational (no store/network access). Under `src/modules/credit/components/`
unless promoted from elsewhere. Each gets a `__tests__` sibling.

| Component | Purpose | Reuse note |
|-----------|---------|------------|
| `OutstandingOverviewCard` | Total + 3 aging buckets w/ 🟢🟡🔴 color dots | Wraps existing `OutstandingAgingCard` (dashboard) for the bucket rows; adds total header |
| `NetReceivableCard` | Advance credit + net receivable | New |
| `MonthProgressCard` | Billed/collected, progress bar, target/gap | Reuse `AppProgressBar` if present; else thin bar |
| `QuickActionsGrid` | 2×2 action tiles | New; tiles are `Pressable` w/ icon+label, haptic on press |
| `AtLimitList` | "At credit limit" rows (name + utilization%) | New; row → S3 |
| `CreditPriorityCard` | Priority customer card **with Remind/Call/Block actions** | Extends US-010 `PriorityCustomerCard` (which is record-payment only). Add a `variant`/action-set prop OR new component. **Decision:** new `CreditPriorityCard` to avoid regressing US-010's card contract |
| `AdvanceCreditRow` | Advance-credit customer (balance, months covered) | Reuse existing `AdvanceCreditCard` (dashboard) |
| `SortDropdown` | Priority list sort selector | Reuse `AppSegmentedControl` or an `AppSelect`/bottom-sheet picker if one exists |
| `CreditTypeRadioGroup` | Normal / Prepaid / Unlimited | New; built on existing radio primitive |
| `SuggestedLimitChips` | ₹2,000 / ₹5,000 / ₹10,000 chips | New |
| `WarningThresholdField` | 0–100 integer field (or slider) | New; numeric field, recommend over slider for low-end devices |
| `BreachActionRadioGroup` | warn / pause / block | New; **disabled & forced to "warn"** when type=unlimited (mirror server rule) |
| `ReminderTemplateEditor` | Multiline editor + placeholder helper chips | New; validates known placeholders client-side before submit |
| `ExcludedCustomersField` | List + add/remove exclusions | New; reuse a customer-picker if available, else simple add-by-search |
| `ReminderTimelineItem` | One reminder history row (date, amount, via, status, response) | New |
| `PaymentModeBars` | UPI/Cash/Bank/Online/Other horizontal bars | New; pure RN bars (no chart lib — see OQ-5) |
| `CollectionTrendBars` | 6-month trend bars | New; pure RN bars |
| `RankedAmountList` | Top payers / defaulters ranked rows | New; shared by both lists |

**Charting decision (OQ-5):** use lightweight pure-`View` bar rows (width = percentage), **not**
`victory-native`/`recharts`. Rationale: tier-2/3 low-end devices, smaller bundle, the wireframes
are all simple horizontal bars. No new dependency.

---

## 5. API Client Mapping (service layer)

New **`creditService`** in `src/modules/credit/service/credit.service.ts`, exported from the
`src/services/api.service.ts` barrel. Mock fixtures in `credit.mock.ts`. Every method branches on
`isMockMode` (`simulateNetworkDelay()` in mock path). All ids are strings; `vendorId` appears in
the path only (JWT-derived). Money is `number`. Envelope: object-shaped `data.data`; history uses
the `data` + `meta` envelope.

Add a `Credit` group to `src/constants/apiPaths.ts` (no `/v1` prefix; base URL ends `/api/v1`):

```
Credit: {
  Dashboard:      (v) => `/vendors/${v}/collections/dashboard`,
  PriorityList:   (v) => `/vendors/${v}/collections/priority-list`,
  Analytics:      (v) => `/vendors/${v}/collections/analytics`,
  Aging:          (v) => `/vendors/${v}/collections/aging`,
  CreditSettings: (v, c) => `/vendors/${v}/customers/${c}/credit-settings`,
  EnablePrepaid:  (v, c) => `/vendors/${v}/customers/${c}/enable-prepaid`,
  Reminders:      (v, c) => `/vendors/${v}/customers/${c}/reminders`,        // GET history + POST single
  SendBulk:       (v)    => `/vendors/${v}/reminders/send-bulk`,
  ReminderConfig: (v)    => `/vendors/${v}/reminder-config`,                 // GET + PATCH
}
```

| Service method | HTTP | Endpoint | Query/Body | Returns |
|----------------|------|----------|-----------|---------|
| `getDashboard(vendorId)` | GET | `/collections/dashboard` | — | `CollectionsDashboardDto` |
| `getPriorityList(vendorId, sort)` | GET | `/collections/priority-list` | `?sort=` | `PriorityListDto` |
| `getAnalytics(vendorId, month)` | GET | `/collections/analytics` | `?month=` | `CollectionAnalyticsDto` |
| `getAging(vendorId)` | GET | `/collections/aging` | — | `AgingDto` (overview only) |
| `updateCreditSettings(vendorId, customerId, patch)` | PATCH | `/customers/{c}/credit-settings` | body | `CreditSettingsResultDto` |
| `enablePrepaid(vendorId, customerId, dto)` | POST | `/customers/{c}/enable-prepaid` | body | `EnablePrepaidResultDto` (discriminated on `clearOutstandingRequired`) |
| `sendReminder(vendorId, customerId, customMessage?)` | POST | `/customers/{c}/reminders` | `{ customMessage? }` | `SendReminderResultDto` |
| `getReminderHistory(vendorId, customerId, page, limit)` | GET | `/customers/{c}/reminders` | `?page&limit` | `ReminderHistoryDto` + meta |
| `sendBulkReminders(vendorId, dto)` | POST | `/reminders/send-bulk` | `{ target, customerIds?, customMessage? }` | `BulkReminderResultDto` |
| `getReminderConfig(vendorId)` | GET | `/reminder-config` | — | `ReminderConfigDto` |
| `updateReminderConfig(vendorId, patch)` | PATCH | `/reminder-config` | body | `ReminderConfigDto` |

> `sendBulkReminders` already has a US-011 service equivalent against
> `…/bulk-operations/send-reminders`. **Decision (OQ-6):** US-012's canonical bulk endpoint is
> `…/reminders/send-bulk` (per this API_SPEC). The US-011 `BulkSendRemindersScreen` is repointed
> to call `creditService.sendBulkReminders` (the request shape `{ target, customerIds }` differs
> from US-011's — Dev must reconcile the screen's payload). If reconciliation risk is high, keep
> the US-011 screen on its endpoint and treat bulk as out-of-scope for US-012 wiring (flagged).

### DTO types — new file `src/types/credit.ts`
Mirror the API_SPEC exactly. Key types: `AgingBucket` (reuse from `dashboard.ts`),
`CollectionsDashboardDto`, `PriorityListDto` + `CreditPriorityCustomer` (adds `phoneNumber`,
`creditType` vs US-010's `PriorityCustomer`), `AdvanceCreditEntry`, `CollectionAnalyticsDto`
(+ `PaymentModeBreakdown`, `CollectionTrendPoint`, `RankedCustomer`, `Defaulter`),
`CreditType = 'normal'|'prepaid'|'unlimited'`, `ActionOnBreach = 'warn'|'pause'|'block'`,
`PrioritySort = 'oldest_first'|'amount_desc'|'utilization_desc'|'score_asc'`,
`UpdateCreditSettingsDto`, `CreditSettingsResultDto` (incl. `breached`, `deliveriesPaused`,
`warning`), `EnablePrepaidDto`, `EnablePrepaidResultDto` (discriminated union on
`clearOutstandingRequired`), `SendReminderResultDto` (incl. `skipped`, `skipReason`),
`ReminderHistoryDto` + `ReminderHistoryItem`, `BulkReminderResultDto`, `ReminderConfigDto`,
`UpdateReminderConfigDto`. No `any`. Numeric ids from API coerced to string in the service.

---

## 6. Business Rules (enforce in UI; server is source of truth)

1. **Owner-only** — every screen calls `useRequireOwner()`; staff never reaches these (403).
2. **Positive balance = owes; negative = advance credit.** Advance customers render in a separate
   group, never in priority buckets.
3. **`daysOverdue`** is a true integer; display `365+` when `> 365` (edge case #10).
4. **Credit-settings:**
   - `warningThreshold` integer 0–100 (validate client-side; server `ARGUMENT_INVALID` otherwise).
   - When `creditType = 'unlimited'`, force `actionOnBreach = 'warn'` and disable the breach radio.
   - `minimumBalanceWarning` only enabled when `creditType = 'prepaid'`.
   - New limit **below** current outstanding is allowed; server returns
     `warning: 'limit_below_outstanding'` — surface a non-blocking inline warning, still treat as
     success (edge case #3).
   - If response `deliveriesPaused = true`, show an info banner ("deliveries auto-paused").
5. **Enable-prepaid** is a **two-outcome** command (discriminated union):
   - `clearOutstandingRequired = true` → switch NOT applied; show "collect ₹X first" CTA → route
     to record-payment; do not navigate away as success.
   - `clearOutstandingRequired = false` → success; refresh customer detail, navigate back.
   - `409 CONFLICT` ("already prepaid") → map to a friendly i18n message, not a crash.
6. **Single reminder** can come back `skipped = true` (`already_paid` / `duplicate_today`) with a
   **201** — treat as a *soft* outcome: success haptic is wrong; show an info toast with the
   reason, not an error. Don't refetch-as-if-sent.
7. **Bulk reminders** returns `{ sent, skipped, failed }` — show all three counts in the result.
8. **Reminder config:** if `autoRemindersEnabled = true`, at least one `scheduleNDays` must be
   `true` (block save with inline error). Template placeholders must be from the known set
   (`{customer_name} {month} {amount} {upi_id} {phone} {vendor_name}`) — validate before submit
   (server returns `ARGUMENT_INVALID` for unknown ones).
9. **Rate limiting (429 TOO_MANY_REQUESTS)** on reminder sends — map to a clear "try again
   shortly" message; do not retry automatically.
10. **Multi-tenant / 404** — any `NOT_FOUND` is treated as "not yours / gone"; show empty/error
    state, never leak existence.

---

## 7. The 5 Screen States (per screen, `screen-development.md`)

| Screen | Loading | Empty | Error | Populated | Offline |
|--------|---------|-------|-------|-----------|---------|
| S1 Dashboard | skeleton cards | zero-outstanding celebratory empty | retry full-screen | cards + grid + at-limit | cached + banner; actions needing net disabled |
| S2 Priority | skeleton list | "all collected" empty | retry | grouped FlatList | cached + banner; Remind/Block disabled offline |
| S3 Credit settings | (form; spinner on submit) | n/a | inline banner | form | offline banner; submit disabled |
| S4 Enable prepaid | (form) | n/a | inline banner | form | offline banner; submit disabled |
| S5 Reminder config | skeleton/form | n/a (defaults always exist) | inline banner | form | offline banner; save disabled |
| S6 History | skeleton list | "no reminders yet" + Send CTA | retry | FlatList + summary | cached + banner; Send disabled offline |
| S7 Analytics | skeleton cards | "no data this month" | retry | cards + bars | cached + banner; month-switch allowed (cached) |

All screens: wrapped in `ScreenErrorBoundary` via a thin `XxxContent` split; `SafeAreaView`;
Tamagui primitives + `@constants/tokens`; `useShallow` selectors; all strings via `t()`; haptics
on every action; double-tap guard on every submit; `FlatList` for any list > 10 rows (priority,
history, at-limit when long).

---

## 8. Localization

All new keys under a `credit.*` namespace, added to **all 9 locale files**
(`en hi ta te mr bn kn ml gu`). Include: screen titles, card labels, aging bucket labels, sort
options, credit-type labels, breach-action labels, prepaid explanation bullets, reminder status /
response labels, skip-reason messages, validation messages, the `limit_below_outstanding`
warning, the `deliveries auto-paused` banner, bulk result summary `{sent}/{skipped}/{failed}`,
and the `365+` overdue display. Reuse existing `dashboard.*` / `customer.*` keys where identical
(e.g. `customer.payment_score`, `dashboard.days_overdue`) rather than duplicating.

---

## 9. Offline / Error / Performance

- **Offline:** all credit endpoints are network-only reads/writes. Reads show last-cached slice +
  offline banner; writes are disabled offline (no optimistic mutation queue — financial writes
  must be server-confirmed). This matches `dashboard`/`settings` discipline, *not* the
  delivery-style mutation queue.
- **Error handling (`error-handling.md`):** store maps via `mapApiError(err, 'credit', action)`;
  every failure goes through the shared `logError` with `{ screen, action, endpoint }` +
  backend `correlationId`, no PII. Error strings are i18n keys.
- **Performance:** `FlatList` for priority list, history, at-limit; memoize cards
  (`React.memo`), stable `keyExtractor` (customerId / reminderId), `getItemLayout` where row
  height is fixed; bars are pure `View`s (cheap). Analytics month-switch reads from store cache
  before refetch. Debounce the excluded-customers search.

---

## 10. Security

- `useRequireOwner()` on every screen (defense in depth; server enforces 403).
- `vendorId` strictly JWT-derived in the store; never read from `useLocalSearchParams` or body.
- No tokens in the credit store or any persisted slice (store is not persisted at all).
- `tel:` links via `Linking` are safe; no PII in logs (mask phone in `logError` context).

---

## 11. Open Questions (with recommendation + trade-off — defaults applied)

- **OQ-1 — Module home.** *New `src/modules/credit` vs extend `src/modules/dashboard`.*
  **Recommend (APPLIED): new `credit` module.** US-012 adds 7 screens, a store, a service, and
  ~17 components — it is a bounded context of its own. Trade-off: the dashboard already owns the
  `/collections` route + 3 cards, so we accept a small cross-module import of those cards (via the
  dashboard barrel) rather than moving them and risking dashboard regressions.

- **OQ-2 — Credit entry point conflict with US-008 `SetCreditLimitScreen`.**
  **Recommend (APPLIED): keep US-008 screen, repoint the customer-detail "Credit" CTA to the new
  US-012 `SetCreditSettingsScreen`.** Trade-off: two screens touch credit limit; mitigated by
  making US-012 the only one linked from primary nav. Deleting US-008's screen is out of scope
  (regression risk). *Confirm you don't want US-008's screen removed outright.*

- **OQ-3 — "Export Report" (dashboard + analytics).** No export endpoint exists in the API_SPEC.
  **Recommend (APPLIED): render the action disabled with a "coming soon" hint for MVP** (keeps the
  2×2 grid layout faithful to the wireframe). Trade-off vs hiding it: a disabled tile is visible
  scope-debt but matches the wireframe; hiding it diverges from the wireframe. *Confirm whether
  Export is in-scope for US-012 or a later story.*

- **OQ-4 — Standalone `GET …/collections/aging`.** Redundant with the dashboard's
  `outstandingOverview`. **Recommend (APPLIED): expose as a service method + store action but no
  dedicated screen**; wire it only if an "Aging detail" drill-down is later requested. Trade-off:
  a tiny amount of unused-by-UI code now vs a refactor later. Low cost, keeps the contract complete.

- **OQ-5 — Charting library for analytics.** **Recommend (APPLIED): pure-`View` bar rows, no
  `victory-native`/`recharts`.** Trade-off: less "rich" than a chart lib, but the wireframes are
  all horizontal bars, and a chart dependency hurts bundle size + low-end render. Revisit only if
  product wants true line/pie charts.

- **OQ-6 — Bulk-reminder endpoint duplication (US-011 vs US-012).** US-011 ships
  `BulkSendRemindersScreen` calling `…/bulk-operations/send-reminders`; US-012's API_SPEC defines
  `…/reminders/send-bulk` with a different body (`{ target, customerIds }`).
  **Recommend (APPLIED): adopt the US-012 endpoint as canonical and repoint the existing screen's
  service call + payload.** Trade-off: touches shipped US-011 code (regression risk on its
  scope-selector payload). If that risk is unacceptable, leave US-011's screen on its endpoint and
  mark bulk-reminder wiring out-of-scope for US-012. *Please confirm which backend route is the
  real one so we don't wire a dead endpoint.*

- **OQ-7 — "Block" action semantics on the priority list.** Wireframe shows `[Block]`; the story
  describes "block" as routing to enable-prepaid. **Recommend (APPLIED): `[Block]` → EnablePrepaid
  screen [S4]** (there is no dedicated block endpoint; `actionOnBreach='block'` is set via
  credit-settings). Trade-off: label says "Block" but destination is prepaid; acceptable since
  prepaid *is* the block mechanism. Could relabel to "Prepaid" for clarity. *Confirm label.*
