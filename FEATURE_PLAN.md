# FEATURE_PLAN.md — US-010 Dashboard (Owner & Staff)

> Frontend (React Native + Expo) implementation plan for the dashboard feature.
> Branch: `feat/us-010-dashboard`. Mock-first (backend US-010 endpoints do not exist yet — see Open Questions OQ-1).
>
> **Read first:** `AGENTS.md`, the skills under `.claude/skills/` (especially `screen-development.md`, `state-management.md`, `api-integration.md`, `navigation-routing.md`, `component-development.md`, `localization-i18n.md`, `error-handling.md`, `performance-optimization.md`, `accessibility-ux.md`), and the existing **subscription** (US-009) and **roles** (US-002) modules — they are the canonical patterns this plan mirrors.

---

## 1. Summary & Scope

US-010 delivers the **home dashboard** for both roles, plus two owner drill-down screens.

| # | Screen | Route | Role | Source |
|---|--------|-------|------|--------|
| 1 | Owner Dashboard | `/(app)/home` (replace placeholder) | Owner | wireframe 2.1 |
| 2 | Staff Dashboard | `/(app)/staff-home` (replace placeholder) | Staff | wireframe 3.1 |
| 3 | Supply Forecast | `/(app)/forecast` (new) | Owner | US-010 §3 |
| 4 | Collections | `/(app)/collections` (new) | Owner | US-010 §4 |

The role router at `app/(app)/index.tsx` **already** sends owners → `/(app)/home` and staff → `/(app)/staff-home`. No change to the router is required; we re-implement the two landing screens and add the two owner drill-downs.

**Out of scope** (do NOT build): WebSocket live updates (future), Redis/caching (backend), `record-payment` / `send-reminder` mutations (those screens already exist from US-008 — we only navigate to them), the `auto-send-bills` settings (only `autoMarkEnabled` is wired here).

### Module placement
All new code lives in a new feature module: `src/modules/dashboard/`. Follow the **subscription module layout** exactly:
```
src/modules/dashboard/
  screens/        OwnerDashboardScreen.tsx, StaffDashboardScreen.tsx,
                  SupplyForecastScreen.tsx, CollectionsScreen.tsx
                  __tests__/
  components/     FinancialOverviewCard, OutstandingAgingCard, AutoMarkToggleRow,
                  SupplyForecastSummaryCard, SupplyListProgressCard, StaffProgressCard,
                  ForecastByListView, ForecastAggregatedView, PriorityCustomerCard,
                  AdvanceCreditCard, index.ts
                  __tests__/
  hooks/          useAutoRefresh.ts, useAutoRefresh test
  service/        dashboard.service.ts, dashboard.mock.ts
                  __tests__/
  store/          dashboard.store.ts
                  __tests__/
```
Types go in `src/types/dashboard.ts` (exported from `src/types/index.ts`), matching how `roles`, `subscription`, `delivery` do it.

---

## 2. New Screens

All screens follow `screen-development.md`: thin default export wrapping `XxxScreenContent` in `ScreenErrorBoundary`, **all 5 states** (Loading skeleton / Empty / Error / Populated / Offline), `SafeAreaView`, Tamagui primitives + `@constants/tokens`, `useShallow` selectors, every string via `t()`, haptics on every interactive action, network-dependent writes disabled offline with the offline banner.

### 2.1 OwnerDashboardScreen — `src/modules/dashboard/screens/OwnerDashboardScreen.tsx`
Route file: replace body of `app/(app)/home.tsx` to render `OwnerDashboardScreen` (keep the existing `SubscriptionBanner` mount — see §5).

`ScrollView` (not FlatList — fixed small set of sections) with `RefreshControl` (pull-to-refresh). Sections top→bottom (wireframe 2.1):
1. `AppHeader` — vendor name + bell icon (notifications route is out of scope; bell is decorative/disabled for now).
2. **FinancialOverviewCard** — `currentMonth`, total revenue (large), Collected/Pending row, `AppProgressBar` with collection %. Color rule: `>=80` success, `>=60` warning, else error (`useMemo`).
3. **OutstandingAgingCard** — three rows (0–30 green / 30–60 warning / 60+ error) each `amount (customerCount)`, + "View Collections" button → `router.push('/(app)/collections')`.
4. **Quick Stats** — 2×2 grid of `AppStatsCard` (Supply Lists, Total Customers, Active Staff, Conflicts Today — `badgeVariant="error"` + alert icon when `conflictsToday > 0`).
5. **AutoMarkToggleRow** — `AppToggle` bound to `autoMarkEnabled`; optimistic update (§state). Disabled offline.
6. **SupplyForecastSummaryCard** — list of tomorrow's lines `name: qty unit (count)`, + "View 7-Day Forecast" button → `router.push('/(app)/forecast')`.
7. **Today's Supply Lists** — `AppSection` + a `SupplyListProgressCard` per `todaySupplyLists[]`; tap → `router.push('/(app)/deliveries/${list.id}')`.

Auto-refresh: `useAutoRefresh(refresh, 60_000)` (see §4). Loading = skeleton matching the card stack. Empty (no lists today) → inline empty state inside the "Today's Supply Lists" section; the financial cards still render. Error (no cached data) → full-screen `AppEmptyState` + retry. Offline → render cached store data + `AppAlert` offline banner; toggle disabled.

`useRequireOwner()` guard at top (defence-in-depth; matches StaffListScreen).

### 2.2 StaffDashboardScreen — `src/modules/dashboard/screens/StaffDashboardScreen.tsx`
Route file: replace `app/(app)/staff-home.tsx` to render `StaffDashboardScreen` (it currently renders `StaffHomeScreen` from the roles module; we supersede it — see Open Question OQ-4).

`ScrollView` + `RefreshControl`. Sections (wireframe 3.1):
1. `AppHeader` — vendor name; `RoleBadge` row (reuse the roles pattern).
2. **Today's Progress Card** — date, "Your Deliveries", Total / Completed numbers, `AppProgressBar` + percentage.
3. **Assigned Lists** — `AppSection` + `StaffProgressCard` per `assignedLists[]`; tap → `router.push('/(app)/deliveries/${list.id}')`. Card shows name, start time, `X/Y done`, progress bar, status icon, Continue/View label by status.
4. **Pending count** line.
5. **START QUICK MARKING** primary button → `router.push('/(app)/deliveries/quick-mark')`. Disabled offline.
6. **Footer note** — `t('dashboard.financial_owner_only')`.

Auto-refresh: `useAutoRefresh(refresh, 30_000)`. **MUST render NO financial data** — no revenue/amount/pricing fields exist on the staff DTO at all (enforced at the type + service layer, see §6). Loading skeleton, Empty ("no deliveries today — celebratory/idle state"), Error + retry, Offline banner.

### 2.3 SupplyForecastScreen — `src/modules/dashboard/screens/SupplyForecastScreen.tsx`
Route file: new `app/(app)/forecast.tsx` (thin import). Owner-only (`useRequireOwner`).
Controls (top): `AppSegmentedControl` date range [Tomorrow | Next 7 Days]; `AppSelect` supply-type filter [All | <types>]; `AppSegmentedControl` view [By List | Aggregated].
- **By List view** (`ForecastByListView`) — rows: list name, time, quantity+unit, customers, planned leaves.
- **Aggregated view** (`ForecastAggregatedView`) — grouped by supply type, total qty per type, daily average (shown only for the 7-day range).
- 7-day summary card when range = 7 days.

State held locally in the screen (`dateRange`, `supplyTypeFilter`, `viewMode`); each change calls `store.fetchForecast({ days, supplyType })`. No auto-refresh interval here (drill-down, manual pull-to-refresh only). 5 states as usual.

> **Custom date range** from the wireframe is **deferred** (OQ-3) — only Tomorrow / Next 7 Days ship in MVP. Document the omission in code comments + tasks.

### 2.4 CollectionsScreen — `src/modules/dashboard/screens/CollectionsScreen.tsx`
Route file: new `app/(app)/collections.tsx`. Owner-only.
- Summary card: total outstanding + aging breakdown bar (reuse `OutstandingAgingCard` visual or a simple stacked row).
- `AppSegmentedControl` priority filter [All | High | Medium | Low].
- `FlatList` of `PriorityCustomerCard` (>10 rows possible → FlatList, per `performance-optimization.md`). Each card: name, outstanding, days overdue, utilization %, last payment, payment score; actions:
  - "Send Reminder" → **deferred/stubbed** (no reminder endpoint yet — OQ-5); render the button disabled with an "coming soon" hint OR omit. Recommendation: omit for MVP, keep the card read-only + a single "Record Payment" action.
  - "Record Payment" → `router.push('/(app)/customers/${customerId}/record-payment')` (US-008 screen).
- Advance-credit section: `AdvanceCreditCard` per customer when `advanceCredit.customers.length > 0`.
No auto-refresh interval; pull-to-refresh + refetch on focus. 5 states.

---

## 3. New Shared / Module Components

Reuse existing primitives/composites wherever possible: `AppCard`, `AppText`, `AppButton`, `AppBadge`, `AppToggle`, `AppSegmentedControl`, `AppSelect`, `AppStatsCard`, **`AppProgressBar`** (already supports `variant` success/warning/error + label), `AppEmptyState`, `AppSection`, `AppAlert`, `AppHeader`, `RoleBadge`, `RoleGate`. **Do not** rebuild ProgressBar or StatCard — they exist.

New module components (`src/modules/dashboard/components/`, presentational only, fully typed props, no store access, haptics passed via `onPress`):

| Component | Props (summary) | Notes |
|-----------|------------------|-------|
| `FinancialOverviewCard` | `{ month, totalRevenue, collected, pending, collectionPercentage }` | Uses `formatCurrency`; color rule via `AppProgressBar variant`. |
| `OutstandingAgingCard` | `{ aging, onViewCollections? }` | 3 colored rows; button optional (reused on Collections w/o button). |
| `AutoMarkToggleRow` | `{ enabled, conflictsCount, disabled, onToggle }` | `AppToggle`; `onToggle(next: boolean)`. |
| `SupplyForecastSummaryCard` | `{ tomorrow: ForecastLine[], onViewForecast }` | |
| `SupplyListProgressCard` | `{ list: OwnerTodayList, onPress }` | name, time, `completed/total`, staff name, status icon, `AppProgressBar`. |
| `StaffProgressCard` | `{ list: StaffAssignedList, onPress }` | NO staff name needed; Continue/View by status. **No financial fields.** |
| `ForecastByListView` | `{ rows: ForecastListRow[] }` | |
| `ForecastAggregatedView` | `{ groups: ForecastAggregateGroup[], showDailyAvg }` | |
| `PriorityCustomerCard` | `{ customer, priority, onRecordPayment }` | read-only metrics. |
| `AdvanceCreditCard` | `{ customer }` | shows credit balance + months covered. |

`components/index.ts` barrel exports all (mirror `subscription/components/index.ts`).

Each new component gets a focused unit test (render + key prop branches), per `component-development.md` / `testing-strategy.md`.

---

## 4. State Management & Auto-Refresh

### 4.1 Store — `src/modules/dashboard/store/dashboard.store.ts`
One Zustand store `useDashboardStore`, following `state-management.md` and the roles/subscription stores exactly. **No persistence** (dashboard data is live/ephemeral; persisting stale financials is undesirable — unlike roleContext). `error` fields hold **i18n keys** via `mapApiError`; failures go through `logError`. `vendorId` resolved from `useAuthStore.getState().vendorContext?.vendorId` (JWT-derived) — never from params/UI.

State shape:
```ts
interface DashboardState {
  ownerDashboard: OwnerDashboardDto | null
  staffDashboard: StaffDashboardDto | null
  forecast: SupplyForecastDto | null
  collections: OutstandingAgingDto | null

  isOwnerLoading: boolean;  ownerError: string | null
  isStaffLoading: boolean;  staffError: string | null
  isForecastLoading: boolean; forecastError: string | null
  isCollectionsLoading: boolean; collectionsError: string | null
  isUpdatingAutoMark: boolean

  fetchOwnerDashboard: () => Promise<void>
  fetchStaffDashboard: (staffId: string) => Promise<void>
  fetchForecast: (opts: { days: number; supplyType?: string | null }) => Promise<void>
  fetchCollections: () => Promise<void>
  setAutoMark: (enabled: boolean) => Promise<void>   // optimistic
  clearDashboard: () => void                          // called by auth logout
  clearErrors: () => void
}
```
Each fetch follows `set(loading,true,error:null) → try service → set data → catch logError + mapApiError`. `clearDashboard()` must be invoked from `auth.store.logout()` alongside the existing `clearRoles()` (add the call — see Tasks).

**`setAutoMark` (optimistic):**
1. snapshot `prev = ownerDashboard.autoMarkEnabled`.
2. optimistically `set` the new value into `ownerDashboard`.
3. `try` `dashboardService.updateSettings({ autoMarkEnabled })`; on success write the server-confirmed value.
4. `catch` → roll back to `prev`, `logError`, `set ownerError = mapApiError(...)`, **rethrow** so the screen can fire an error haptic + show a transient `AppAlert`.

### 4.2 Auto-refresh hook — `src/modules/dashboard/hooks/useAutoRefresh.ts`
The repo has **no React Query** — the US-010 spec's `refetchInterval` is illustrative. Implement a small reusable hook instead (matches the repo's hook conventions):
```ts
function useAutoRefresh(refresh: () => void, intervalMs: number): void
```
Behavior:
- `setInterval(refresh, intervalMs)` while the screen is **focused** (`useFocusEffect`) AND the app is **active** (`AppState === 'active'`) AND `useNetworkStatus().isConnected`.
- Clears the interval on blur/background/offline; re-arms on resume (prevents battery drain + needless calls on 2G — important for low-end devices per `performance-optimization.md`).
- Also triggers one immediate `refresh()` on focus.
Owner screen passes `60_000`; staff passes `30_000`.

### 4.3 Selector usage
Screens select only the slice they use via `useShallow` (never whole-store). E.g. owner screen selects `{ ownerDashboard, isOwnerLoading, ownerError, fetchOwnerDashboard, setAutoMark, isUpdatingAutoMark }`.

---

## 5. Navigation Changes

Follow `navigation-routing.md` (thin route files; implementations in `src/modules/...`; `(app)` already guarded on auth).

| Action | Change |
|--------|--------|
| Owner landing | `app/(app)/home.tsx` → render `OwnerDashboardScreen`. **Keep** the existing owner-only `SubscriptionBanner` mount (US-009) above the dashboard content — move it into `OwnerDashboardScreen` so `home.tsx` stays thin, preserving banner behavior. |
| Staff landing | `app/(app)/staff-home.tsx` → render `StaffDashboardScreen`. |
| Forecast | new `app/(app)/forecast.tsx` → `SupplyForecastScreen`. |
| Collections | new `app/(app)/collections.tsx` → `CollectionsScreen`. |
| API paths | add a `Dashboard` group to `src/constants/apiPaths.ts` (see §6.3). |

Role-based **routing** is unchanged (router already branches owner/staff). Within screens, owner-only drill-downs additionally call `useRequireOwner()` (defence-in-depth) and are only linked from the owner dashboard. `≤2 taps` to any primary action holds (dashboard → drill-down is 1 tap).

> The two new routes are reachable only from the owner dashboard. They are inside `(app)` so already auth-guarded; `useRequireOwner` redirects a staff user who deep-links them to `/(app)/staff-home`.

---

## 6. API Service Layer & Types

### 6.1 Service — `src/modules/dashboard/service/dashboard.service.ts`
Follow `api-integration.md` + the subscription service. Object `dashboardService` with async methods; every method branches on `isMockMode` (→ `simulateNetworkDelay()` + return from `dashboard.mock.ts`) vs real (`httpClient` against `APIPath.Dashboard.*`). Returns typed domain DTOs; maps the API envelope (`data.data`) in the service. **Never** send `vendorId` in body/params (path-only, JWT-derived). Errors bubble up (store maps them). Export from `src/services/api.service.ts` barrel.

Methods:
```ts
getOwnerDashboard(vendorId): Promise<OwnerDashboardDto>
getStaffDashboard(vendorId, staffId): Promise<StaffDashboardDto>
getSupplyForecast(vendorId, { days, supplyType }): Promise<SupplyForecastDto>
getOutstandingAging(vendorId): Promise<OutstandingAgingDto>
updateSettings(vendorId, { autoMarkEnabled }): Promise<VendorSettingsDto>
```

### 6.2 Mock fixtures — `src/modules/dashboard/service/dashboard.mock.ts`
Deterministic fixtures mirroring the DTO shapes **exactly** from the US-010 sample responses (owner: revenue 78,600 / collected 65,200 / 83% / aging buckets / quick stats / autoMark / tomorrow forecast / today lists; staff: 82 total, 73 completed, 89%, two assigned lists, pending 9; forecast + aging samples). Cover the edge-case fixtures so dev can see them (empty today list, all-completed, conflicts>0, advance-credit present, 100%-leave list → qty 0).

### 6.3 API paths — append to `src/constants/apiPaths.ts`
```ts
Dashboard: {
  Owner: (vendorId) => `/vendors/${vendorId}/dashboard/owner`,
  Staff: (vendorId, staffId) => `/vendors/${vendorId}/dashboard/staff/${staffId}`,
  Forecast: (vendorId) => `/vendors/${vendorId}/supply-forecast`,
  OutstandingAging: (vendorId) => `/vendors/${vendorId}/outstanding-aging`,
  Settings: (vendorId) => `/vendors/${vendorId}/settings`,
}
```
(No `/v1` prefix — base URL ends `/api/v1`, identical to every existing group.)

### 6.4 Types — `src/types/dashboard.ts`
Define and export (and re-export from `src/types/index.ts`). All ids **strings** (repo convention — note the spec shows numeric ids; coerce in the mapper, `String(id)`). Key types: `OwnerDashboardDto`, `FinancialSummaryDto`, `AgingBucket`, `OutstandingAgingSummary`, `QuickStatsDto`, `ForecastLine`, `OwnerTodayList`, `DeliveryProgress`, `DeliveryStatus = 'not_started' | 'in_progress' | 'completed'`, `StaffDashboardDto`, `StaffAssignedList`, `SupplyForecastDto`, `ForecastListRow`, `ForecastAggregateGroup`, `OutstandingAgingDto`, `PriorityCustomer`, `AdvanceCreditCustomer`, `VendorSettingsDto`, `AutoMarkStatus = 'on' | 'off'`.

**Security/typing rule:** `StaffDashboardDto` and `StaffAssignedList` **must not** declare any monetary field (no revenue/amount/price/balance). This is the type-level guarantee that the staff dashboard cannot render financial data even if a future API leaks it.

---

## 7. Role-Based Rendering Strategy

Defence in depth (server is the real authority; client gating is UX only — per `RoleGate` doc):
1. **Routing** — `app/(app)/index.tsx` already routes owner→`/home`, staff→`/staff-home`. Staff never land on the owner dashboard.
2. **Distinct DTOs** — owner and staff call **different endpoints** returning **different types**. The staff endpoint/DTO carries no financial fields, so there is nothing to leak.
3. **`useRequireOwner()`** on `OwnerDashboardScreen`, `SupplyForecastScreen`, `CollectionsScreen` — a staff user deep-linking is redirected to `/staff-home`.
4. **`RoleGate require="owner"`** is *not* needed inside the owner dashboard (whole screen is owner-gated) but the staff screen keeps the existing `t('dashboard.financial_owner_only')` note.

---

## 8. Loading / Error / Empty / Offline Patterns

Identical to `screen-development.md` and the StaffList/StaffHome reference screens:
- **Loading:** skeleton card stack (`testID="*-skeleton"`) matching the populated layout — never a bare spinner. Only on first load (no cached store data).
- **Empty:** `AppEmptyState` (icon + title + description + single CTA). Owner "no lists today" is a *section-level* empty state (financial cards still show). Staff "no deliveries today" can use a celebratory variant (edge case #2).
- **Error:** if cached store data exists, keep showing it + a dismissible `AppAlert`; if no data, full-screen `AppEmptyState` with `t(error)` + retry calling the fetch.
- **Offline:** `useNetworkStatus().isConnected === false` → `AppAlert type="warning"` banner; render last store data; **disable** the auto-mark toggle and the quick-marking button (writes are online-only); the auto-refresh hook pauses polling.
- **Stale indicator** (edge case #9): when a refresh fails but cached data is shown, surface a subtle "showing last updated data" alert. Keep simple — reuse the error `AppAlert`.

All error strings are i18n keys produced by `mapApiError(err, 'dashboard', action)`.

---

## 9. i18n

Add a `dashboard.*` namespace to **all 9** locale files (`en, hi, ta, te, mr, bn, kn, ml, gu`) — `localization-i18n.md`. English carries real copy; other locales may copy English values as placeholders (dev task notes this). Keys (non-exhaustive): `dashboard.total_revenue`, `dashboard.collected`, `dashboard.pending`, `dashboard.collection_pct`, `dashboard.outstanding_aging`, `dashboard.aging_0_30`, `dashboard.aging_30_60`, `dashboard.aging_60_plus`, `dashboard.view_collections`, `dashboard.supply_lists`, `dashboard.total_customers`, `dashboard.active_staff`, `dashboard.conflicts_today`, `dashboard.auto_mark`, `dashboard.tomorrow_forecast`, `dashboard.view_7day`, `dashboard.todays_lists`, `dashboard.your_deliveries`, `dashboard.total`, `dashboard.completed`, `dashboard.pending_count`, `dashboard.start_quick_marking`, `dashboard.financial_owner_only`, `dashboard.no_lists_today`, `dashboard.all_done`, `dashboard.forecast_title`, `dashboard.by_list`, `dashboard.aggregated`, `dashboard.daily_avg`, `dashboard.planned_leaves`, `dashboard.collections_title`, `dashboard.total_outstanding`, `dashboard.priority_high/medium/low`, `dashboard.days_overdue`, `dashboard.utilization`, `dashboard.advance_credit`, `dashboard.record_payment`, `dashboard.auto_mark_updated`, `dashboard.auto_mark_failed`, `dashboard.error_*` (mapped error keys), `dashboard.showing_cached`.

---

## 10. Test Plan

Follow `testing-strategy.md`. Jest + React Native Testing Library; mock mode (`isMockMode`) drives services. Existing module `__tests__` folders are the template.

**Component unit tests** (`components/__tests__/`): each new component renders with mock props; assert key branches — collection-% color thresholds (≥80/≥60/<60), conflicts badge appears only when `>0`, status icon per `DeliveryStatus`, aggregated view shows daily-avg only for 7-day, `PriorityCustomerCard` renders metrics, staff cards contain **no** currency text.

**Store unit tests** (`store/__tests__/dashboard.store.test.ts`): fetch happy-path sets data + clears loading; fetch error sets i18n-key error + logs; `setAutoMark` optimistic update + rollback-on-failure (assert value reverts and error set + rethrows); `clearDashboard` resets all slices.

**Hook test** (`hooks/__tests__/useAutoRefresh.test.ts`): fake timers — calls `refresh` immediately on focus, every `intervalMs` while focused+online+active; does NOT fire when offline / blurred / backgrounded; clears interval on unmount.

**Service test** (`service/__tests__/dashboard.service.test.ts`): mock-mode methods return fixtures after delay; real-mode maps `data.data`, calls correct `APIPath`, sends no `vendorId` in body/params.

**Screen integration tests** (`screens/__tests__/`):
- Owner: renders all sections from fixtures; "View Collections"/"View 7-Day Forecast" navigate; toggle calls `setAutoMark` optimistically; offline disables toggle + shows banner; loading shows skeleton; error+retry.
- Staff: renders progress + assigned lists; **asserts no financial strings present** (query for ₹/Rs. returns nothing); quick-marking navigates and is disabled offline; refresh interval = 30s wiring.
- Forecast: segmented controls switch range/view; filter triggers refetch; 7-day summary shows.
- Collections: priority filter; FlatList renders; Record Payment navigates; advance-credit section conditional.

**A11y** (`accessibility-ux.md`): touch targets ≥44, progress bars expose `accessibilityRole="progressbar"` (already in `AppProgressBar`), toggle labelled, stat cards labelled.

Coverage target ≥80% on new module files (Definition of Done).

---

## 11. Edge Cases (from US-010 §Edge Cases — frontend-relevant)

| # | Case | Handling |
|---|------|----------|
| 1 | No deliveries today | Section empty state (owner) / idle state (staff). |
| 2 | All lists completed | Celebratory empty/all-done message. |
| 5 | Forecast 100% leaves | Row shows qty 0 (mock covers it). |
| 6 | Negative balance (advance credit) | Separate `AdvanceCreditCard` section. |
| 7 | Conflicts > 0 | Alert icon + error badge on the stat card. |
| 8 | Auto-mark toggle mid-deliveries | Optimistic toggle; if backend later adds a warning we surface it — MVP just toggles. |
| 9 | Dashboard load error w/ cache | Show cached data + "showing last updated" alert. |
| 10 | Large vendor (500+) | Collections list uses `FlatList` virtualization; forecast/today lists are inherently small. |

---

## 12. Open Questions (decisions made; flagging for confirmation)

**OQ-1 — Backend US-010 endpoints do not exist yet.** No `dashboard` / `supply-forecast` / `outstanding-aging` / vendor-`settings` module exists in `paycycle_api`. 
- **Recommendation:** Build the entire feature **mock-first** with the DTO contracts pinned in `src/types/dashboard.ts` + `dashboard.mock.ts` (exactly the US-010 sample shapes), exactly as US-002/004/005 did with their stubs. Real-mode wiring stays behind `isMockMode` and is verified when the backend lands. 
- **Trade-off:** risk of contract drift when the backend ships; mitigated by pinning shapes to the user story and adding an "re-verify when US-010 backend lands" note in the service header (the roles module's OQ-6 precedent). **Proceeding on this basis.**

**OQ-2 — `staffId` source for the staff dashboard endpoint.** The staff endpoint needs `:staffId`. `vendorContext` (auth) exposes `vendorId` + `role` but I have not confirmed it carries the caller's own `staffId`/membership id. 
- **Recommendation:** Have the **service derive the staff identity server-side from the JWT** and expose `getStaffDashboard(vendorId)` with **no** `staffId` arg (consistent with the multi-tenancy rule that the client never asserts identity). If the backend insists on a path `:staffId`, read it from `vendorContext` (extend `VendorContextDto` with `membershipId` when US-010 backend lands). 
- **Trade-off:** sending a client-supplied `staffId` would let a staffer request another's dashboard — server must ignore it and use the token regardless. **Proceeding with the no-client-staffId design; mock returns the fixture.**

**OQ-3 — "Custom" forecast date range.** Wireframe shows a third "Custom" segment. 
- **Recommendation:** **Defer Custom to a follow-up**; ship Tomorrow + Next 7 Days only (covers all acceptance criteria, which never require custom). 
- **Trade-off:** minor wireframe gap; adding a date-range picker later is isolated to `SupplyForecastScreen`. **Proceeding without Custom.**

**OQ-4 — Existing `StaffHomeScreen` (US-002) vs new `StaffDashboardScreen`.** The roles module already has a functional `StaffHomeScreen` wired to `useDeliveryToday` (US-006). US-010 asks for a richer staff dashboard (per-list progress bars, pending count). 
- **Recommendation:** Build `StaffDashboardScreen` in the dashboard module and point `staff-home.tsx` at it, **superseding** `StaffHomeScreen`. Reuse `useDeliveryToday`/delivery data where the new staff endpoint overlaps, but prefer the dedicated staff-dashboard DTO as the source of truth. Leave the old `StaffHomeScreen` file in place (unreferenced) to avoid touching US-002 tests, or delete it + its test if the dev confirms no other importer. 
- **Trade-off:** two staff-home implementations transiently; cleaner to delete the old one. **Recommend superseding; final delete-vs-keep left to the dev based on importer check (note in tasks).**

**OQ-5 — "Send Reminder" action on Collections.** No reminder/notification endpoint exists. 
- **Recommendation:** **Omit** the Send Reminder button for MVP; Collections cards are read-only metrics + a "Record Payment" navigation (US-008 screen exists). 
- **Trade-off:** wireframe/spec mention reminders; deferring keeps scope to what the backend supports. **Proceeding with omit.**

**OQ-6 — Currency display.** Spec sample uses `Rs.`; repo has `formatCurrency` producing `₹` via Intl. 
- **Recommendation:** Use `formatCurrency` (₹) everywhere for consistency with US-008/009. **Proceeding.** (No real open issue — flagged for visibility.)

---

## 13. Definition of Done (frontend)
- [ ] 4 screens implemented with all 5 states, wrapped in `ScreenErrorBoundary`.
- [ ] New `dashboard` module: store (no persist), service (mock+real), mock fixtures, hooks, components + barrel.
- [ ] `Dashboard` API path group added; `dashboard.service` exported from `api.service.ts`.
- [ ] `dashboard.*` keys in all 9 locales; no hardcoded user-facing strings.
- [ ] Owner 60s / staff 30s auto-refresh via `useAutoRefresh` (focus+online+foreground gated).
- [ ] Auto-mark optimistic update with rollback-on-error.
- [ ] Staff dashboard provably free of financial data (type-level + test assertion).
- [ ] `clearDashboard()` wired into `auth.store.logout()`.
- [ ] Unit + integration + hook tests ≥80% coverage on new files; lint + build clean.
- [ ] `PROGRESS_TRACKER.md` updated (US-010 → In Progress, then Completed by QA).
