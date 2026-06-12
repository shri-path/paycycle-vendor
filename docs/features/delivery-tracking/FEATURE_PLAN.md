# Feature: Daily Delivery Tracking (US-006) — Frontend

## Overview

Daily delivery tracking lets a vendor **owner** or **staff** member track each day's deliveries, organized **per supply list** (not per customer). Staff open an assigned list and mark each customer `DELIVERED` or `LEAVE`, use a fast **Quick Mark** swipe mode, mark planned **leaves**, and (if permitted) add **extra charges**. Owners get an all-lists **Today overview** with a conflicts section, a **month calendar**, and a **day-detail** breakdown.

The backend for US-006 is already built and merged (`feat/us-006-delivery-tracking` in `paycycle_api`). This plan covers **frontend only** — a new `src/modules/delivery/` module that mirrors the `src/modules/supply-lists/` structure (service with mock mode → Zustand store → screens), consuming the **real** backend contracts (not the story doc's inline SQL/JSON).

### Hard constraints carried from prior stories
- **vendorId** is JWT-derived — read from `auth.store.vendorContext.vendorId`, present in URLs only for routing. Never from route params/user input.
- **Writes are online-only** (US-005 OQ-3). Mark/bulk-mark/leave/extra-charge submit is disabled offline with a clear inline message; no local write queue. Reads are offline-friendly from cache where no PII is involved.
- **Status enums are UPPERCASE** (`PENDING|DELIVERED|LEAVE|AUTO_MARKED|CANCELLED`). The story doc's lowercase values are obsolete — use the backend enum.
- **Owner-only money**: `ratePerUnit`, `amount` (on `DeliveryDto`) and all `revenue` fields are omitted from staff responses; never render a money figure on a staff screen.
- **`revenue` is a string** (Prisma Decimal). Parse to number for formatting; never use raw in arithmetic without `Number()`.
- All ids are **strings**. All user-facing strings via `t()` across all 9 locales.

---

## User Story Reference
`project_documents/vendor_app/user_stories/US-006-delivery-tracking.md`
Wireframes: `16-staff-screens.md` §3.1, 3.3, 3.4, 3.6, 3.7; `03-supply-lists.md` §2.6–2.7; `05-calendar.md` §2.11–2.12.

---

## API Reconciliation (story doc vs. actual backend)

All routes mounted at `/api/v1/vendors`. Base URL: `EXPO_PUBLIC_API_BASE_URL` (must end `/api/v1`, identical convention to US-005 — no `/v1` inside path strings). The `paycycle_api` contracts below are authoritative.

| # | Story doc endpoint | **Actual backend route** | Method | Role | Notes / divergence |
|---|---|---|---|---|---|
| 1 | `GET /deliveries/today` | `GET /:vendorId/deliveries/today` | GET | member (owner: all; staff: assigned only) | Query `date?`,`listId?`,`staffId?`. Returns `TodayResultDto`. Story `summary.revenue` is a **number** → actual is **string**; story has no `autoMarked`/`conflicts` count → actual adds them. `byList[].staffName/staffId` (single) → actual `staff: Array<{staffId,name}>`. |
| 2 | `GET /supply-lists/:listId/deliveries/today` | `GET /:vendorId/supply-lists/:listId/deliveries` | GET | member (staff must be assigned) | Path is **not** `/today`; date via `?date=`. Query adds `status?`,`search?`,`page?`,`limit?` (paginated — story implied full list). Returns `ListDeliveriesResultDto`. `status` values UPPERCASE. `DeliveryDto` adds `unit`, `hasConflict`, `conflictReason`, `markedBy: MarkedByDto`; `ratePerUnit`/`amount` owner-only. |
| 3 | `PATCH /deliveries/:deliveryId/mark` | `PATCH /:vendorId/deliveries/:deliveryId/mark` | PATCH | owner, or staff w/ `mark_deliveries` | Body `{status:'DELIVERED'\|'LEAVE', quantity?}`. **No** `markedByUserId`/`markedByRole` in body (server derives from JWT). Returns `{success, data: MarkDeliveryResultDto}`. |
| 4 | `POST /deliveries/mark-bulk` | `POST /:vendorId/deliveries/mark-bulk` | POST | owner, or staff w/ permission | Body `{supplyListId, date(YYYY-MM-DD), status:'DELIVERED', excludeDeliveryIds?}`. No user/role in body. Returns `MarkBulkResultDto`. |
| 5 | `POST /extra-charges` | `POST /:vendorId/extra-charges` | POST | owner, or staff w/ `add_extra_charges` | Body `{dailySupplyId, amount(non-zero), comment(required)}`. Story used `{customerId, supplyListId, deliveryDate, reason}` → actual keys are **`dailySupplyId`** + **`comment`** (not `reason`). Amount must be non-zero. Returns `ExtraChargeResultDto`. |
| 6 | `POST /leaves` | `POST /:vendorId/leaves` | POST | owner, or staff w/ `mark_leaves` | Body `{customerId, supplyListIds[], startDate, endDate, reason?}`. No user/role in body. Returns `CreateLeaveResultDto`. |
| 7 | `GET /leaves` | `GET /:vendorId/leaves` | GET | member (staff scoped) | Query `status?(today\|upcoming)`,`staffId?`. Returns `ListLeavesResultDto` (`{today[], upcoming[]}`). |
| 8 | *(not in story)* | `DELETE /:vendorId/leaves/:leaveId` | DELETE | owner, or staff w/ permission | Cancel a planned leave. Returns `CancelLeaveResultDto`. |
| 9 | `GET /deliveries/calendar` | `GET /:vendorId/deliveries/calendar` | GET | **owner only** | Query `month(YYYY-MM, required)`,`listId?`,`customerId?`. Returns `CalendarResultDto` (`days: Record<dateStr, CalendarDayDto>`). Status enum: `completed\|has_leaves\|pending\|has_conflicts`. |
| 10 | `GET /deliveries/date/:date` | `GET /:vendorId/deliveries/date/:date` | GET | **owner only** | Returns `DateDetailResultDto`. `extraCharges[].reason` is the display label (server maps `comment`→`reason` here). `leaves[].markedBy: ActorRoleLabel`. |
| 11 | `POST /deliveries/generate` | `POST /:vendorId/deliveries/generate` | POST | owner only | **Not wired to UI** — cron/manual trigger only. Excluded from this plan. |

**Backend error codes** (per US-006 collaboration notes): `400` validation, `403` permission, `409` conflict. The `delivery` error context (new) extends `mapApiError` to resolve these.

---

## Screen Inventory (routes + role access)

Max 2 taps to any primary action. Staff entry = Staff Home; owner entry = owner Home / supply-lists.

| # | Screen | Route (Expo Router) | Role | Source screen file |
|---|---|---|---|---|
| 1 | Staff Home (delivery dashboard) | `/(app)/staff-home` (existing route, screen replaced) | staff | `StaffHomeScreen.tsx` (rewritten in roles module — see note) |
| 2 | Supply List Deliveries | `/(app)/deliveries/[listId]` | owner + assigned staff | `DeliveryListScreen.tsx` |
| 3 | Quick Mark Mode | `/(app)/deliveries/quick-mark` | staff (owner allowed) | `QuickMarkScreen.tsx` |
| 4 | Mark Leave | `/(app)/deliveries/mark-leave` | owner + staff w/ `mark_leaves` | `MarkLeaveScreen.tsx` |
| 5 | Add Extra Charge | `/(app)/deliveries/add-extra-charge` | owner + staff w/ `add_extra_charges` | `AddExtraChargeScreen.tsx` |
| 6 | Today's Deliveries (all lists) | `/(app)/deliveries/today` | owner | `TodayOverviewScreen.tsx` |
| 7 | Calendar | `/(app)/calendar` | owner | `CalendarScreen.tsx` |
| 8 | Day Detail | `/(app)/calendar/[date]` | owner | `DayDetailScreen.tsx` |

**StaffHomeScreen decision (resolved — see OQ-1):** the existing `src/modules/roles/screens/StaffHomeScreen.tsx` is **extended in place**, not replaced or moved. It already owns the staff landing (role badge, assigned-lists section, offline/permission-drift handling, financial-owner-only note). US-006 wires the real "today" summary (delivery store), turns each assigned-list card into a tap-through to `/(app)/deliveries/[listId]`, and adds the `START QUICK MARKING` CTA. Because this file lives in the **roles** module and is shared infrastructure, it is owned by **WS-0** (Foundation), which exposes a typed `useDeliveryToday()` selector the screen consumes — keeping the delivery screens (WS-2/WS-3) file-disjoint from the roles module.

---

## Module Structure (`src/modules/delivery/`)

```
src/modules/delivery/
├── service/
│   ├── delivery.service.ts          # all 9 UI endpoints, mock + real (WS-1)
│   └── __tests__/delivery.service.test.ts
├── store/
│   ├── delivery.store.ts            # Zustand: today, list, leaves, calendar, dayDetail, write actions (WS-1)
│   └── __tests__/delivery.store.test.ts
├── components/
│   ├── DeliveryCustomerCard.tsx     # pending row: name+address + Delivered/Leave (WS-0)
│   ├── CompletedDeliveryRow.tsx     # marked row: status badge + markedBy/time (WS-0)
│   ├── DeliveryProgressHeader.tsx   # progress bar + counts chip row (WS-0)
│   ├── ConflictBanner.tsx           # owner conflicts summary → expandable list (WS-0)
│   ├── QuickMarkCard.tsx            # swipeable card (gesture-handler PanGesture) (WS-0)
│   ├── CalendarMonthGrid.tsx        # month grid w/ status indicators (WS-0)
│   ├── ReasonChips.tsx              # quick-select reason chips (WS-0)
│   └── __tests__/*.test.tsx
├── screens/
│   ├── DeliveryListScreen.tsx       (WS-2)
│   ├── QuickMarkScreen.tsx          (WS-2)
│   ├── MarkLeaveScreen.tsx          (WS-3)
│   ├── AddExtraChargeScreen.tsx     (WS-3)
│   ├── TodayOverviewScreen.tsx      (WS-2)
│   ├── CalendarScreen.tsx           (WS-3)
│   ├── DayDetailScreen.tsx          (WS-3)
│   └── __tests__/*.test.tsx
└── hooks/
    └── useDeliveryToday.ts          # selector for StaffHome + owner today (WS-0)
```

New shared **types** live in `src/types/delivery.ts` (WS-0). New **API paths** added to `src/constants/apiPaths.ts` under `APIPath.Delivery` (WS-0). New **routes** in `app/(app)/` (WS-0 owns route wrappers to avoid two screen-WS creating the same `app/` file).

**Import rule (memory):** never use the `@types/*` alias — import delivery types via relative path `../../../types/delivery` or the `@modules`/`@components`/`@constants/tokens` aliases already in use.

---

## Screen Specifications

> Every screen handles the 5 states: **Loading (skeleton)**, **Empty**, **Error (retry)**, **Content**, **Offline**. Offline reads show cached content + an `AppAlert` warning banner (pattern from `StaffHomeScreen`); offline writes disable the submit CTA with an inline message (`common.needs_connection`). Each screen is wrapped in `ScreenErrorBoundary`. All caught errors route through `logError` with `{screen, action, endpoint}` + `correlationId`, no PII.

### 1. Staff Home (extended `StaffHomeScreen`)
- **Layout:** `AppHeader` (vendor name) → role badge → offline/permission banners → scroll: today `AppStatsCard` (real `delivered/total` from `useDeliveryToday()`), `AppSection` "Your supply lists" (each assigned list → `AppCard` with `AppProgressBar` + Continue), footer-anchored **`START QUICK MARKING`** primary `AppButton`.
- **Components:** existing (`AppHeader`, `AppStatsCard`, `AppSection`, `AppCard`, `AppProgressBar`, `AppButton`, `AppEmptyState`, `RoleBadge`, `RoleGate`). No new components.
- **States:** Loading → existing skeleton; Empty → "no lists assigned, contact owner"; Error → retry on role+today fetch; Offline → cached lists + banner, Quick Marking CTA disabled.
- **Interactions:** tap list card → `/(app)/deliveries/[listId]`; tap Quick Marking → `/(app)/deliveries/quick-mark`. Pull-to-refresh re-fetches today. Haptic `Light` on each tap.

### 2. Supply List Deliveries (`DeliveryListScreen`) — shared owner/staff
- **Layout:** `AppHeader` (list name + start time; trailing refresh `AppIconButton`) → `DeliveryProgressHeader` (bar + `delivered/onLeave/pending` chips) → `AppSearchBar` → `AppSegmentedControl` filter (All / Pending / Completed) → `FlatList` (sectioned: Pending rows = `DeliveryCustomerCard` w/ Delivered+Leave buttons; Completed rows = `CompletedDeliveryRow` w/ status badge + markedBy/time) → footer-anchored **`MARK ALL AS DELIVERED`** primary `AppButton` (hidden when 0 pending).
- **Data:** `getListDeliveries(listId, {date, status, search, page})` paginated; `markDelivery`, `markBulk`. Owner sees money columns; staff doesn't (gate on `useRole().isOwner`).
- **Optimistic marking:** flip row to target status immediately, roll back on failure (mirrors US-005 optimistic pattern). `hasConflict` rows render a warning badge + `conflictReason`.
- **Permission:** staff without `mark_deliveries` → read-only (buttons hidden, banner "view only"). Defence-in-depth even though backend enforces.
- **States:** Loading → row skeletons; Empty → "no deliveries for this list today"; Error → retry; Offline → cached read + banner, mark buttons disabled w/ `common.needs_connection`.
- **Interactions:** tap Delivered/Leave (haptic `Medium` on success, `Warning` on rollback); search debounced 300ms; pull-to-refresh; `MARK ALL` → `AppConfirmDialog`.
- **Performance:** `FlatList` with `keyExtractor`, memoized rows, `windowSize`/`removeClippedSubviews`, `getItemLayout` where fixed-height. Designed for 500+ rows.

### 3. Quick Mark Mode (`QuickMarkScreen`)
- **Layout:** top `AppProgressBar` + "Remaining: X" → centered `QuickMarkCard` (avatar, large name, address) → bottom row of two large buttons **LEAVE** (left) / **DELIVERED** (right). All-done state = `AppEmptyState` (checkmark) + "Back to home".
- **Swipe:** `react-native-gesture-handler` `PanGestureHandler` + `react-native-reanimated` for translate/rotate/opacity; swipe **right = DELIVERED**, **left = LEAVE** (RTL-mirrored). Threshold + spring-back on incomplete swipe. **No third-party swipe library** (expo ecosystem only). Buttons are a tap-equivalent path (accessibility + non-gesture users).
- **Data source:** aggregates all PENDING deliveries across the staff's assigned lists for today (sequential fetch per assigned list via store, flattened into a queue). Marks one at a time via `markDelivery`; advances index on success.
- **Offline:** if offline, block entry with an `AppAlert` + disabled cards (writes online-only — surface clear error, do **not** silently queue). Re-enable on reconnect.
- **States:** Loading skeleton card; Empty → "Nothing pending — all done"; Error → retry; Content; Offline → blocking notice.
- **Reduce-motion:** when enabled, disable swipe animation and rely on buttons (per `accessibility-ux` rule 26).
- **A11y:** card has `accessibilityLabel` (customer name + position); buttons `accessibilityRole="button"` + translated labels; swipe is **never** the only path.

### 4. Mark Leave (`MarkLeaveScreen`)
- **Layout (chunked, progressive disclosure):** `AppSearchBar` + customer `AppRadioGroup` (only customers from caller's accessible lists; each shows the lists they're in) → on select: supply-list multi-select (`AppCheckbox` list, reuse `SupplyListMultiSelect` pattern) → date mode `AppSegmentedControl` (Today only / Date range) → `AppDatePicker` start+end when range → footer **`CONFIRM LEAVE`** primary.
- **Smart defaults:** "Today only" pre-selected; all of the customer's accessible lists pre-checked.
- **Data:** customer/list source = supply-lists store (assigned lists + their subscriptions) — no new endpoint. Submit → `createLeave({customerId, supplyListIds, startDate, endDate, reason?})`.
- **Validation:** customer required, ≥1 list, end ≥ start. Inline errors via `AppInput.error`/field-level; never lose selection on error.
- **States:** Loading (customer list); Empty → "no customers in your lists"; Error retry; Content; Offline → CONFIRM disabled + message.

### 5. Add Extra Charge (`AddExtraChargeScreen`)
- **Layout:** customer (pre-filled from param or searchable `AppRadioGroup`) → date display (read-only, today, locale-formatted) → supply-list `AppRadioGroup` → **Amount** `AppInput` `keyboardType="number-pad"` with currency prefix (locale-aware, not hardcoded ₹) → **Reason/comment** `AppTextArea` (required) → `ReasonChips` quick-select (Extra Milk / Festival / Weekend / Urgent — all via `t()`) → footer **`ADD CHARGE`** primary.
- **Body mapping:** UI selects customer+list+date → resolve the matching `dailySupplyId` (delivery id) for that customer on that list/date from the loaded delivery list; submit `{dailySupplyId, amount, comment}`. **Edge case (story #7):** if no delivery exists for that customer/date, block with inline error "Mark delivery first" (`delivery.error_mark_delivery_first`) — do not call the API.
- **Validation:** amount non-zero numeric (forgiving parse: strip spaces/commas), comment required + trimmed + max length. Disable CTA until valid.
- **States:** standard 5; Offline → ADD disabled + message.

### 6. Today's Deliveries — all lists (`TodayOverviewScreen`, owner)
- **Layout:** `AppHeader` (Today, locale date; trailing refresh) → list filter `AppSelect` (All / specific list) → `ConflictBanner` (count + expand → conflict rows, each tap → that list) → `FlatList` of per-list progress `AppCard` (name, start time, staff names, `AppProgressBar`, delivered/leaves/pending, revenue [owner], "Open list" → `/(app)/deliveries/[listId]`).
- **Data:** `getToday({listId?})` → `TodayResultDto`. Revenue shown (owner). Summary stats card at top (total/delivered/onLeave/pending/revenue/conflicts).
- **States:** Loading skeleton cards; Empty → "no deliveries generated for today"; Error retry; Content; Offline → cached + banner.

### 7. Calendar (`CalendarScreen`, owner)
- **Layout:** month navigator (`< June >`, prev/next `AppIconButton`, locale month label) → filters `AppSelect` (list, customer) → `CalendarMonthGrid` (7-col grid; each day cell shows day number + status indicator paired with **icon + text**, never color alone: `completed`=check, `has_leaves`=dash, `pending`=dots, `has_conflicts`=alert) → month summary `AppStatsCard` (total deliveries, leaves, revenue).
- **Data:** `getCalendar(month, {listId?, customerId?})` → `CalendarResultDto`. `days` is a sparse map keyed by `YYYY-MM-DD`.
- **Interactions:** tap a populated day → `/(app)/calendar/[date]`; swipe or arrows to change month (haptic Light). Empty days non-interactive.
- **States:** Loading (grid skeleton); Empty → "no data this month"; Error retry; Content; Offline → cached month + banner.
- **Perf:** grid is ≤ 42 cells — plain memoized render, not virtualized. Cache last viewed month in store.

### 8. Day Detail (`DayDetailScreen`, owner)
- **Layout:** `AppHeader` (locale date) → summary `AppStatsCard` (deliveries, leaves, revenue) → `AppSection` "By list" (rows: list name, start time, staff, delivered, leaves, revenue) → `AppSection` "Extra charges" (customer, list, amount, reason) → `AppSection` "Leaves" (customer, list, markedBy role label).
- **Data:** `getDateDetail(date)` → `DateDetailResultDto`. `markedBy` is an `ActorRoleLabel` → map to translated label (`owner/staff/customer/system`).
- **States:** Loading skeleton sections; Empty → "no activity on this day"; Error retry; Content; Offline → cached + banner.

---

## Component Requirements (new — all in WS-0)

| Component | Props (frozen contract) |
|---|---|
| `DeliveryCustomerCard` | `{ delivery: DeliveryDto; showMoney: boolean; disabled: boolean; onMarkDelivered: (id: string) => void; onMarkLeave: (id: string) => void; testID?: string }` |
| `CompletedDeliveryRow` | `{ delivery: DeliveryDto; showMoney: boolean; testID?: string }` |
| `DeliveryProgressHeader` | `{ total: number; delivered: number; onLeave: number; pending: number; testID?: string }` |
| `ConflictBanner` | `{ conflicts: TodayConflictDto[]; onSelectConflict: (listId: string) => void; testID?: string }` |
| `QuickMarkCard` | `{ delivery: DeliveryDto; onSwipeDelivered: () => void; onSwipeLeave: () => void; reduceMotion: boolean; testID?: string }` |
| `CalendarMonthGrid` | `{ month: string; days: Record<string, CalendarDayDto>; onSelectDay: (date: string) => void; testID?: string }` |
| `ReasonChips` | `{ reasons: string[]; onSelect: (reason: string) => void; testID?: string }` |

All: presentational + `React.memo`, tokens only, `t()` for every string, color never the sole signal, ≥44×44 targets / `hitSlop`, `accessibilityRole`+label. No store/API access inside components.

**Existing components reused:** `AppHeader`, `AppText`, `AppCard`, `AppButton`, `AppIconButton`, `AppBadge`, `AppAvatar`, `AppProgressBar`, `AppSearchBar`, `AppSegmentedControl`, `AppSelect`, `AppRadioGroup`, `AppCheckbox`, `AppDatePicker`, `AppTextArea`, `AppInput`, `AppStatsCard`, `AppSection`, `AppEmptyState`, `AppAlert`, `AppConfirmDialog`, `RoleGate`, `RoleBadge`, `ScreenErrorBoundary`, `AppLoader`. No modifications required to existing components.

---

## State Management

New store `useDeliveryStore` (Zustand, follows `supplyLists.store.ts` conventions: `getActiveVendorId()` from auth, `useShallow` selectors, error fields hold **i18n keys**, `logError` on every catch, `clearDelivery()` for logout wipe).

**State slices:**
```
today: TodayResultDto | null; isTodayLoading; todayError
listDeliveries: Record<listId, DeliveryDto[]>; listMeta: Record<listId, PaginationMeta>;
  listProgress: Record<listId, {total,delivered,onLeave,pending}>; isListLoading; listError
quickQueue: DeliveryDto[]; quickIndex: number; isQuickLoading; quickError
leaves: ListLeavesResultDto | null; isLeavesLoading; leavesError
calendar: Record<month, CalendarResultDto>; isCalendarLoading; calendarError
dayDetail: Record<date, DateDetailResultDto>; isDayLoading; dayError
isMutating; mutationError
```

**Actions:** `fetchToday`, `fetchListDeliveries`, `markDelivery` (optimistic + rollback), `markBulk`, `buildQuickQueue`, `advanceQuick`, `fetchLeaves`, `createLeave`, `cancelLeave`, `addExtraCharge`, `fetchCalendar`, `fetchDayDetail`, `clearError`, `clearDelivery`.

**Persistence:** persist **only** non-PII aggregate slices for instant offline render — `calendar` (counts/revenue, no names) and lean `listProgress` are persistable; `listDeliveries`, `today.conflicts` (customer names), `quickQueue`, `leaves`, `dayDetail` carry **PII → in-memory only**, never persisted (mirrors US-005 PII rule). `partialize` whitelists only the safe slices.

**Logout wiring:** `auth.store.logout()` must call `clearDelivery()` (flag to orchestrator — auth.store is not owned by a delivery WS; same handling as US-005's `clearSupplyLists`).

**Derived selectors:** `useDeliveryToday()` (today summary for StaffHome + owner) lives in `src/modules/delivery/hooks/` (WS-0) so the roles module consumes it without depending on screen WS.

---

## API Integration

Service `delivery.service.ts` (WS-1) — one method per UI endpoint, mock + real via `isMockMode`/`simulateNetworkDelay`, unwraps `{success, data}` envelope, ids as strings, errors bubble to store. New `APIPath.Delivery` builders (WS-0):

```
Today:        (vendorId) => `/vendors/${vendorId}/deliveries/today`
ListDeliveries:(vendorId, listId) => `/vendors/${vendorId}/supply-lists/${listId}/deliveries`
Mark:         (vendorId, deliveryId) => `/vendors/${vendorId}/deliveries/${deliveryId}/mark`
MarkBulk:     (vendorId) => `/vendors/${vendorId}/deliveries/mark-bulk`
ExtraCharges: (vendorId) => `/vendors/${vendorId}/extra-charges`
Leaves:       (vendorId) => `/vendors/${vendorId}/leaves`
LeaveDetail:  (vendorId, leaveId) => `/vendors/${vendorId}/leaves/${leaveId}`
Calendar:     (vendorId) => `/vendors/${vendorId}/deliveries/calendar`
DateDetail:   (vendorId, date) => `/vendors/${vendorId}/deliveries/date/${date}`
```

**Error handling per endpoint:** every store catch calls `logError(err, {screen, action, endpoint})` (captures ISO timestamp, message+stack, `correlationId` from the error response, endpoint/screen/action — no PII) then `mapApiError(err, 'delivery', action?)`. New **`'delivery'` context** added to `mapApiError` (WS-0) resolving:
- `403` → `roles.error_forbidden` (permission denied — read-only/disabled)
- `409` (mark) → `delivery.error_conflict` (customer override / already marked)
- `400`/`422` (extra-charge) → `delivery.error_invalid_charge`; (mark/leave) → `validation.required`
- `404` (mark/charge) → `delivery.error_not_found`
- no response → `common.offline_message`

**revenue parsing:** a small util `parseRevenue(s: string): number` (WS-0, in `src/utils/`) wraps `Number()` with NaN guard for all string revenue fields before currency formatting.

---

## Offline Behavior

- **Reads:** cached aggregate slices (calendar counts, list progress) render instantly offline with an `AppAlert` warning banner; PII-bearing detail lists show the offline banner + last-cached in-memory data if present in the session, else the offline empty/error state.
- **Writes (mark / bulk / leave / extra-charge):** **online-only** (US-005 OQ-3). When `!isConnected`, the submit/mark CTAs are **disabled** with an inline message (`common.needs_connection`); Quick Mark blocks entry with a notice. **No local write queue, no optimistic offline marking.** This is a deliberate decision to avoid silent divergence and conflict storms on reconnect for a billing-critical record.
- **Conflict surfacing:** server-detected conflicts (`hasConflict`/`conflictReason`, owner conflicts list) are **displayed** (warning badge/banner) but conflict *resolution* is owner re-marking via the normal mark flow — no special client merge logic (last-write-wins is server-side).
- **Sync indicator:** reuse the existing offline banner pattern + global `isOnline`. No new background-sync engine in this story.

---

## Localization

New `delivery.*` namespace added to all 9 locale files (en, hi, ta, te, mr, bn, kn, ml, gu) — WS-0 owns every locale JSON. Key groups (ICU placeholders, never concatenated fragments):

- Titles/headers: `delivery.title_today`, `title_list`, `title_quick_mark`, `title_mark_leave`, `title_extra_charge`, `title_calendar`, `title_day_detail`.
- Actions: `mark_delivered`, `mark_leave`, `mark_all_delivered`, `mark_all_confirm_title`, `mark_all_confirm_body`, `start_quick_marking`, `confirm_leave`, `add_charge`, `cancel_leave`.
- Status/labels: `status_pending`, `status_delivered`, `status_leave`, `status_auto_marked`, `status_cancelled`, `marked_by` ({{name}},{{role}}), `marked_at`, `remaining` ({{count}}), `progress` ({{done}}/{{total}}), `delivered_count`, `leaves_count`, `pending_count`, `revenue_label`, `conflicts_count` ({{count}}), `conflict_reason`, `view_only`, `all_done`.
- Calendar: `cal_status_completed/has_leaves/pending/has_conflicts`, `month_summary`, `total_deliveries`, `total_leaves`.
- Leave/charge fields: `select_customer`, `select_lists`, `date_today_only`, `date_range`, `start_date`, `end_date`, `amount_label`, `reason_label`, `reason_extra_milk/festival/weekend/urgent`, `marked_by_owner/staff/customer/system`.
- Errors/empties: `error_conflict`, `error_invalid_charge`, `error_not_found`, `error_mark_delivery_first`, `error_load_failed`, `empty_today`, `empty_list`, `empty_calendar`, `empty_day`, `quick_offline_blocked`.

**i18n/RTL:** locale-aware currency/date/number (no hardcoded ₹ or DD/MM); `start`/`end` not `left`/`right`; Quick Mark swipe direction mirrored under `I18nManager.isRTL`; +35% text expansion (no clipped labels, 2-line allowance); generous `lineHeight` for tall scripts.

---

## Performance Considerations

- **Lists:** `FlatList` (project standard — not FlashList) for `DeliveryListScreen` and `TodayOverviewScreen`, with memoized rows, `keyExtractor`, `removeClippedSubviews`, tuned `windowSize`/`initialNumToRender`, `getItemLayout` for fixed-height rows. Target 500+ deliveries smooth on 2 GB Android.
- **Pagination:** list deliveries paginated (`page`/`limit`); append on scroll-end.
- **Quick Mark:** only the current (+ next preloaded) card mounted; queue is data-only in memory.
- **Calendar:** ≤42 memoized cells, no virtualization; cache per-month result.
- **No images** beyond avatar initials (`AppAvatar` fallback) — zero image-cache pressure.
- **Memory:** PII slices in-memory only and cleared on logout; detail caches keyed and bounded by current navigation.
- **Bundle:** screens are route-lazy via Expo Router; reanimated/gesture-handler already in the dependency set (no new heavy deps).

---

## Accessibility

- Touch targets ≥44×44 (mark buttons, calendar day cells, chips); `hitSlop` on small icon buttons (month nav, refresh).
- Every control: `accessibilityRole` + translated `accessibilityLabel`; decorative icons `importantForAccessibility="no"`.
- Status conveyed by **icon + text**, never color alone (delivered ✓, leave dash, conflict ⚠).
- Quick Mark: swipe is never the sole path — buttons always present; `reduceMotion` disables animation; announce position changes via `accessibilityLiveRegion`.
- Contrast ≥4.5:1 text / ≥3:1 large text & icons using `textPrimary`/`textSecondary` on surfaces.
- Dynamic Type to ~1.5× without clipping; focus managed on screen change and after errors.

---

## Open Questions

**OQ-1 — StaffHomeScreen: extend vs. new screen.** *Resolved by sensible default* (recommended): **extend** the existing `src/modules/roles/screens/StaffHomeScreen.tsx` in place, owned by WS-0. It already implements the staff landing (role badge, assigned lists, offline/permission-drift, financial-owner-only note) and is the routed `/(app)/staff-home`. US-006 only swaps placeholder today-stats for real ones, makes list cards tap-through to the delivery screen, and adds the Quick Marking CTA. *Trade-off:* a new separate screen would keep the delivery module fully self-contained but would duplicate role/offline/permission logic and create two competing staff landings — rejected. **No user input needed unless the team wants a standalone delivery dashboard.**

**OQ-2 — Backdating / "deliver for previous day" (story edge case #1: allow backdating until 6 AM).** Genuine ambiguity: the backend `mark` endpoint and `today` query accept a `date`, but the UI surface for backdating is unspecified in the wireframes. **Recommendation:** **defer backdating UI to a later story** and have the frontend always operate on *today* (server clock via the `today` endpoint's returned `date`), since the wireframes show no backdate control and adding one risks staff mis-dating billing records. *Trade-offs:* (a) **defer (recommended)** — simplest, matches wireframes, no mis-dating risk, but staff who miss the 6 AM window can't self-correct and must ask the owner; (b) **add a date picker on the delivery list** — enables self-correction but adds cognitive load, a new failure mode (wrong date), and UI not in the wireframes. **Needs a product decision.**

**OQ-3 — "Today" date source & timezone.** The summary `date` comes from the server (`TodayResultDto.date`). **Recommendation:** treat the server-returned `date` as the single source of truth for "today" and format it locale-aware on device; never compute the delivery date from the device clock (avoids TZ drift between a phone set to the wrong time and the backend). *Trade-off:* requires one round-trip before we know "today", but guarantees staff and owner see the same day. **Low-risk; proceeding with the recommendation unless told otherwise.**

> OQ-1 and OQ-3 are resolved with sensible defaults and recorded here for the trail. **OQ-2 (backdating) is a real product decision** surfaced to the user; the plan proceeds with "today-only" until directed otherwise.

---

## Risk Register

| ID | Risk | Likelihood | Impact | Mitigation |
|---|---|---|---|---|
| R1 | Quick Mark gesture jank on 2 GB devices | Med | Med | Reanimated on UI thread; mount only current+next card; `reduceMotion` fallback; buttons as primary path; perf test 500+ queue. |
| R2 | `dailySupplyId` resolution for extra charge wrong/missing | Med | High | Resolve from loaded delivery list; block with `error_mark_delivery_first` when absent (story #7); never guess an id. |
| R3 | Staff sees owner money fields if `showMoney` mis-gated | Low | High | Single `useRole().isOwner` gate threaded as `showMoney` prop; components never read money unless flag true; QA cross-checks staff responses omit fields. |
| R4 | Offline write attempted (lost mark) | Med | Med | Online-only writes; CTAs disabled offline with clear message; Quick Mark blocks entry; no silent queue. |
| R5 | revenue string used in arithmetic / NaN render | Med | Med | `parseRevenue` util with NaN guard; all revenue through it before formatting. |
| R6 | Status enum case mismatch (lowercase from story leaking in) | Med | Med | UPPERCASE union types in `src/types/delivery.ts`; no lowercase literals; mock data uses UPPERCASE. |
| R7 | Conflict UX misread as resolvable in-app | Low | Med | Conflicts are display-only; resolution = owner re-mark via normal flow; copy makes this clear. |
| R8 | Two WS create the same `app/` route file or locale key | Low | High | WS-0 owns ALL `app/(app)/` delivery route wrappers, locale JSON, types, apiPaths, and shared components; screen WS own only their `.tsx` under `screens/`. |
| R9 | Calendar `days` sparse-map key mismatch (date format) | Low | Med | Keys are `YYYY-MM-DD`; grid builds keys with the same zero-padded format; unit test the keying. |
| R10 | Logout doesn't wipe delivery PII | Low | High | `clearDelivery()` wired into `auth.store.logout()`; flagged to orchestrator; QA verifies post-logout store empty. |
