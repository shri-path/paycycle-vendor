# Feature Tasks: Daily Delivery Tracking (US-006) — Frontend

> Implements `FEATURE_PLAN.md`. Backend is already built/merged (`feat/us-006-delivery-tracking` in `paycycle_api`) — **do not design endpoints**. Frontend new module: `src/modules/delivery/`. Follow `src/modules/supply-lists/` patterns exactly (service mock+real, Zustand store, screens). All strings via `t()` in all 9 locales. Status enums UPPERCASE. Writes online-only. vendorId from JWT. Never use the `@types/*` import alias.

## Parallel Workstreams (conflict-free partition)

> Each workstream owns a disjoint set of files. Dev/Review/QA launch one sub-agent per workstream within a phase, simultaneously. Sub-agents edit ONLY their owned files and never commit (the orchestrator integrates). **Verify: the union of all "Owned files" has NO overlaps.**

### Phase 1 — Foundation (run first, single owner)

**WS-0: Foundation / shared**
- **Owned files:**
  - `src/types/delivery.ts` (all DTOs/unions — copied frozen from `paycycle_api` `delivery.types.ts`)
  - `src/constants/apiPaths.ts` (add `APIPath.Delivery` group — edit existing file)
  - `src/utils/errorMapper.ts` (add `'delivery'` context + `DeliveryErrorAction` — edit existing file)
  - `src/utils/parseRevenue.ts` (new util)
  - `src/locales/*.json` (all 9 — add `delivery.*` namespace; add `delivery.error_*` keys)
  - `src/modules/delivery/components/**` (all 7 new components + their `__tests__`)
  - `src/modules/delivery/hooks/useDeliveryToday.ts`
  - `src/modules/roles/screens/StaffHomeScreen.tsx` (extend in place — wire real today + nav + Quick Marking CTA)
  - `app/(app)/deliveries/_layout.tsx`, `app/(app)/deliveries/[listId].tsx`, `app/(app)/deliveries/quick-mark.tsx`, `app/(app)/deliveries/mark-leave.tsx`, `app/(app)/deliveries/add-extra-charge.tsx`, `app/(app)/deliveries/today.tsx`, `app/(app)/calendar/_layout.tsx`, `app/(app)/calendar/index.tsx`, `app/(app)/calendar/[date].tsx` (thin route wrappers only)
  - `src/modules/auth/store/auth.store.ts` — **only** the one-line `clearDelivery()` call inside `logout()` (flagged: coordinate with orchestrator; if touched by another concern, orchestrator integrates)
- **Depends on:** —
- **Produces (frozen contracts):**
  - **Types** (`src/types/delivery.ts`): `MarkableStatus`, `DailySupplyStatus`, `ActorRoleLabel`, `MarkedByDto`, `DeliveryDto`, `TodayResultDto`, `TodayListDto`, `TodayConflictDto`, `ListDeliveriesResultDto`, `MarkDeliveryResultDto`, `MarkBulkResultDto`, `ExtraChargeResultDto`, `CreateLeaveResultDto`, `LeaveDto`, `ListLeavesResultDto`, `CancelLeaveResultDto`, `CalendarDayDto`, `CalendarResultDto`, `DateDetailResultDto`, `PaginationMeta` (reuse existing). Field names/nullability/UPPERCASE unions exactly as `paycycle_api`.
  - **APIPath.Delivery** builders (signatures in FEATURE_PLAN → API Integration).
  - **`parseRevenue(s: string): number`** (NaN-guarded).
  - **Component prop APIs** (frozen — see FEATURE_PLAN → Component Requirements table): `DeliveryCustomerCard`, `CompletedDeliveryRow`, `DeliveryProgressHeader`, `ConflictBanner`, `QuickMarkCard`, `CalendarMonthGrid`, `ReasonChips`.
  - **`useDeliveryToday()`** → `{ delivered: number; total: number; isLoading: boolean; error: string | null; refetch: () => void }`.
  - **i18n keys**: full `delivery.*` namespace per FEATURE_PLAN → Localization.
  - **mapApiError 'delivery' context** resolves 403/409/400/422/404/no-response per FEATURE_PLAN.
- **Skills:** `component-development.md`, `accessibility-ux.md`, `ui-visual-design.md`, `localization-i18n.md`, `navigation-routing.md`, `error-handling.md`, `animation-haptics.md`

### Phase 2 — Feature workstreams (run in parallel; depend only on WS-0 contracts)

**WS-1: Service + Store**
- **Owned files:** `src/modules/delivery/service/**`, `src/modules/delivery/store/**` (incl. `__tests__`)
- **Depends on:** WS-0 (types, APIPath.Delivery, parseRevenue, mapApiError 'delivery', i18n error keys)
- **Consumes:** all WS-0 type/path/util contracts
- **Skills:** `api-integration.md`, `state-management.md`, `offline-first.md`, `error-handling.md`, `testing-strategy.md`, `security-auth.md`

**WS-2: Delivery-marking screens (staff + owner today)**
- **Owned files:** `src/modules/delivery/screens/DeliveryListScreen.tsx`, `QuickMarkScreen.tsx`, `TodayOverviewScreen.tsx` (+ their `__tests__`)
- **Depends on:** WS-0 (components, types, i18n, routes), WS-1 (store actions: `fetchListDeliveries`, `markDelivery`, `markBulk`, `buildQuickQueue`, `advanceQuick`, `fetchToday`)
- **Consumes:** store selector/action contracts (Task 2), component props (WS-0)
- **Skills:** `screen-development.md`, `localization-i18n.md`, `animation-haptics.md`, `performance-optimization.md`, `accessibility-ux.md`, `ui-visual-design.md`, `error-handling.md`, `testing-strategy.md`

**WS-3: Leave / extra-charge / calendar screens**
- **Owned files:** `src/modules/delivery/screens/MarkLeaveScreen.tsx`, `AddExtraChargeScreen.tsx`, `CalendarScreen.tsx`, `DayDetailScreen.tsx` (+ their `__tests__`)
- **Depends on:** WS-0 (components, types, i18n, routes), WS-1 (store actions: `createLeave`, `cancelLeave`, `fetchLeaves`, `addExtraCharge`, `fetchCalendar`, `fetchDayDetail`), and supply-lists store (existing) for customer/list selection in Mark Leave / Add Extra Charge
- **Consumes:** store contracts (Task 2), `CalendarMonthGrid`/`ReasonChips` props (WS-0)
- **Skills:** `screen-development.md`, `form-validation.md`, `localization-i18n.md`, `accessibility-ux.md`, `ui-visual-design.md`, `error-handling.md`, `testing-strategy.md`

> **Overlap check:** WS-0 owns all shared files (types, apiPaths, errorMapper, locales, components, hooks, route wrappers, StaffHomeScreen, the one auth.store line). WS-1 owns only `service/` + `store/`. WS-2 and WS-3 own disjoint screen files. No file appears in two workstreams. ✅

---

## Task List (ordered; each task maps to a workstream)

### Task 1: Shared types, API paths, error mapping, revenue util  _(WS-0)_
- **Skills:** `api-integration.md`, `error-handling.md`
- **Acceptance Criteria:**
  - `src/types/delivery.ts` defines every DTO/union from FEATURE_PLAN, field-identical to `paycycle_api` `delivery.types.ts`; status unions UPPERCASE; `ratePerUnit?`/`amount?` optional (owner-only); `revenue` typed `string`.
  - `APIPath.Delivery` added with all 9 builders; no `/v1` inside path strings.
  - `mapApiError` gains `'delivery'` context + `DeliveryErrorAction` resolving 403/409/400/422/404/no-response to the keys in the plan; existing contexts untouched.
  - `parseRevenue` returns a number, `0` on NaN/empty; unit-tested.
  - No `@types/*` alias used anywhere.

### Task 2: Delivery store + service  _(WS-1)_
- **Skills:** `state-management.md`, `api-integration.md`, `offline-first.md`, `security-auth.md`
- **Acceptance Criteria:**
  - `delivery.service.ts` exposes: `getToday`, `getListDeliveries`, `markDelivery`, `markBulk`, `addExtraCharge`, `createLeave`, `getLeaves`, `cancelLeave`, `getCalendar`, `getDateDetail`. Each supports mock (`isMockMode`+`simulateNetworkDelay`) and real (`httpClient`, unwraps `{success,data}`); ids strings.
  - Mark/bulk/leave/charge request bodies match the backend exactly (`{status,quantity?}`; `{supplyListId,date,status,excludeDeliveryIds?}`; `{dailySupplyId,amount,comment}`; `{customerId,supplyListIds,startDate,endDate,reason?}`). **No** `markedBy*` fields in any body.
  - `useDeliveryStore` implements all slices/actions from FEATURE_PLAN. `vendorId` via `getActiveVendorId()` (JWT). Error fields hold **i18n keys**. Every catch calls `logError({screen,action,endpoint})` + `mapApiError(err,'delivery',action?)`.
  - `markDelivery` is **optimistic** (flip row, roll back on failure). Writes are **online-only** — store does not queue offline (callers guard via `isConnected`).
  - `partialize` persists only non-PII aggregate slices (`calendar` counts, `listProgress`); PII slices in-memory only.
  - `clearDelivery()` resets all slices.
  - Mock data uses UPPERCASE statuses and string revenue.
  - Store + service unit tests: success, error→i18n-key, optimistic rollback, persistence whitelist.

### Task 3: Shared delivery components  _(WS-0)_
- **Skills:** `component-development.md`, `accessibility-ux.md`, `ui-visual-design.md`, `animation-haptics.md`
- **Acceptance Criteria:**
  - All 7 components built to the frozen prop contracts; presentational, `React.memo`, tokens only, every string via `t()`, no store/API access.
  - Status shown by **icon + text** (never color alone); ≥44×44 targets / `hitSlop`; `accessibilityRole`+translated label; decorative icons hidden.
  - `QuickMarkCard` uses `react-native-gesture-handler` `PanGestureHandler` + `react-native-reanimated` (no third-party swipe lib); right=Delivered, left=Leave, RTL-mirrored; `reduceMotion` disables animation; buttons remain a parallel path.
  - `CalendarMonthGrid` keys days by `YYYY-MM-DD`; empty days non-interactive; ≤42 memoized cells.
  - `DeliveryCustomerCard`/`CompletedDeliveryRow` render money only when `showMoney` is true.
  - Snapshot/behaviour tests per component.

### Task 4: Routes + StaffHome extension + useDeliveryToday  _(WS-0)_
- **Skills:** `navigation-routing.md`, `screen-development.md`, `state-management.md`, `accessibility-ux.md`
- **Acceptance Criteria:**
  - Route wrappers created for all 8 screens (thin, render the module screen; `headerShown:false`; screens render their own `AppHeader`). `deliveries/_layout.tsx` and `calendar/_layout.tsx` are stack navigators matching the existing convention.
  - Owner-only routes (`today`, `calendar`, `calendar/[date]`) call `useRequireOwner()` (defence-in-depth). `deliveries/[listId]` reachable by owner + assigned staff; gating in-screen via `useRole`/`canAccessList`.
  - `useDeliveryToday()` returns the frozen contract and reads from `useDeliveryStore` (no direct API).
  - `StaffHomeScreen` extended in place: today `AppStatsCard` shows real `delivered/total`; each assigned-list card navigates to `/(app)/deliveries/[listId]`; footer `START QUICK MARKING` primary navigates to `/(app)/deliveries/quick-mark` and is disabled offline. Existing 5-state/offline/permission-drift logic preserved. Existing `StaffHomeScreen.test.tsx` updated to pass.
  - 2-tap rule holds from every entry point.

### Task 5: i18n keys (all 9 locales)  _(WS-0)_
- **Skills:** `localization-i18n.md`
- **Acceptance Criteria:**
  - Full `delivery.*` namespace (per FEATURE_PLAN → Localization) added to `en, hi, ta, te, mr, bn, kn, ml, gu` with the same key set in each (no missing keys, no English fallback left in non-en files).
  - ICU placeholders for all interpolations (`{{count}}`, `{{done}}`, `{{total}}`, `{{name}}`, `{{role}}`); no concatenated fragments.
  - No hardcoded ₹/date — currency/date formatted via locale helpers in screens.

### Task 6: Delivery-marking screens  _(WS-2)_
- **Skills:** `screen-development.md`, `performance-optimization.md`, `animation-haptics.md`, `accessibility-ux.md`, `error-handling.md`, `localization-i18n.md`
- **Acceptance Criteria:**
  - `DeliveryListScreen`: progress header, search (debounced 300ms), All/Pending/Completed filter, sectioned `FlatList` (pending → `DeliveryCustomerCard`, completed → `CompletedDeliveryRow`), footer `MARK ALL AS DELIVERED` with `AppConfirmDialog`, hidden at 0 pending. Optimistic mark with rollback + haptics. Money only for owner (`showMoney = useRole().isOwner`). Conflict rows show warning + reason. Staff without `mark_deliveries` → read-only banner, buttons hidden. 5 states; offline disables mark buttons w/ `common.needs_connection`. `FlatList` perf-tuned for 500+ rows.
  - `QuickMarkScreen`: progress + "Remaining: X"; `QuickMarkCard` swipe + buttons; advances on success; all-done empty state; offline blocks entry with notice; reduce-motion fallback; aggregates pending across assigned lists.
  - `TodayOverviewScreen` (owner): summary stats, list filter, `ConflictBanner`, per-list progress cards with "Open list" nav; revenue shown; 5 states.
  - Screen tests cover each of the 5 states + the mark/rollback/offline-guard paths.

### Task 7: Leave / extra-charge / calendar screens  _(WS-3)_
- **Skills:** `screen-development.md`, `form-validation.md`, `accessibility-ux.md`, `error-handling.md`, `localization-i18n.md`
- **Acceptance Criteria:**
  - `MarkLeaveScreen`: customer radio (accessible lists only), list multi-select (pre-checked), Today/Range segmented, date pickers when range, `CONFIRM LEAVE` footer. Validation: customer + ≥1 list + end≥start, inline errors, selection preserved on error. Offline disables submit.
  - `AddExtraChargeScreen`: customer (param or search), today date (locale), list radio, amount `number-pad` (forgiving parse, non-zero), required comment (trimmed, max-length), `ReasonChips`, `ADD CHARGE`. Resolves `dailySupplyId` from loaded deliveries; blocks with `delivery.error_mark_delivery_first` when no delivery exists. Offline disables submit.
  - `CalendarScreen` (owner): month nav (locale label), list/customer filters, `CalendarMonthGrid` (icon+text indicators), month summary; tap day → `/(app)/calendar/[date]`; 5 states; cached-month offline.
  - `DayDetailScreen` (owner): summary, by-list, extra charges, leaves (markedBy role label translated); 5 states.
  - Screen tests cover 5 states + validation + the `error_mark_delivery_first` guard.

### Task 8: Animations & haptics  _(WS-2 for Quick Mark; WS-0 for QuickMarkCard)_
- **Skills:** `animation-haptics.md`, `accessibility-ux.md`
- **Acceptance Criteria:** Quick Mark swipe spring/translate/rotate on the UI thread; haptic `Medium` on successful mark, `Warning` on rollback, `Light` on navigation/taps; all motion respects `reduceMotion`; durations from `animation.duration` tokens.

### Task 9: Error & empty states  _(WS-2 + WS-3; components WS-0)_
- **Skills:** `error-handling.md`, `screen-development.md`
- **Acceptance Criteria:** every screen wrapped in `ScreenErrorBoundary`; error states use `AppEmptyState` + retry; empty states use friendly icon + single CTA; offline banner via `AppAlert`; all caught errors logged via `logError` with `correlationId` (no PII); error copy is inline, specific, blame-free, never loses entered data.

### Task 10: Testing  _(each WS tests its own owned files)_
- **Skills:** `testing-strategy.md`
- **Acceptance Criteria:** unit tests for store/service (WS-1), components (WS-0), and each screen's 5 states + key flows (WS-2/WS-3); jest-expo@56 + jest@29 (per memory — do not bump jest to 30); tests deterministic, mock mode for service. Coverage on new module ≥ project threshold.

### Task 11: Security & multi-tenancy  _(WS-1 store; WS-0 routes)_
- **Skills:** `security-auth.md`
- **Acceptance Criteria:** `vendorId` only from `auth.store.vendorContext` (JWT) — never route params/user input; owner-only money never reaches staff screens (`showMoney` gate); owner-only routes guarded by `useRequireOwner`; `clearDelivery()` wired into `auth.store.logout()` so logout wipes all delivery state; no customer PII persisted to AsyncStorage; no PII in logs.

### Task 12: Performance optimization  _(WS-2 lists; WS-0 calendar grid)_
- **Skills:** `performance-optimization.md`
- **Acceptance Criteria:** `FlatList` memoized rows + `keyExtractor` + `removeClippedSubviews` + tuned `windowSize`/`initialNumToRender` (+ `getItemLayout` for fixed rows); pagination on list deliveries; Quick Mark mounts only current+next card; calendar caches per-month; verified smooth with 500+ deliveries on a 2 GB profile.

---

## Integration order (orchestrator)
1. **Phase 1:** WS-0 lands first (types, paths, errorMapper, parseRevenue, locales, components, hooks, routes, StaffHome, auth.store line). Commit as one or more `feat:`/`chore:` commits split by concern.
2. **Phase 2:** WS-1, WS-2, WS-3 run in parallel against WS-0's frozen contracts. Integrate WS-1 (store/service) first if a serialized merge is needed, then WS-2/WS-3 screens.
3. Run full test suite; then Review → Dev fix loop → QA.
