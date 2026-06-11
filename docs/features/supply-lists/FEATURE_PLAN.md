# Feature: Supply Lists Management (US-005) — Frontend

> Frontend plan for the PayCycle Vendor app. Backend for US-005 is **already
> implemented** on `paycycle_api` branch `feat/us-005-supply-lists`. All API
> contracts below were reconciled against the **actual** backend source
> (`src/modules/supply-list/`), not the story doc — see **Backend Reconciliation**.

## Overview

A **Supply List** is a named group of customers who receive a specific supply
(milk, bread, newspaper…) at a specific time. It is the core organisational unit:
it carries a default quantity/rate, a schedule (daily / weekly / monthly),
assigned staff, and a set of customer **subscriptions** (each customer can override
quantity/rate). The same customer can subscribe to many lists; each subscription is
tracked independently.

This feature delivers the **Owner** management surface (list / create / edit / detail /
add-customers / assign-staff / subscription edit) and the **Staff** read-only surface
(assigned lists only). It reuses the shipped `src/modules/roles/` patterns
(`useRequireOwner`, `RoleGate`, shared `httpClient`, `mapApiError`, `logger`) and the
shared component library. It introduces a new feature module `src/modules/supply-lists/`.

It also **resolves the US-002/US-004 OQ-6 deferral**: the staff "assign lists" multi-select
ran against a backend stub with provisional paths. US-005 ships the real supply-list read
endpoint; this plan pins the **canonical** contract. **OQ-2 is now RESOLVED** (see Open Questions):
staff↔list assignment is **list-side**, owned by the Supply-List detail screen; the staff-side
`SupplyListMultiSelect` becomes read-only.

## User Story Reference

- Story: `project_documents/vendor_app/user_stories/US-005-supply-lists.md`
- Feature: `project_documents/vendor_app/features/05-supply-lists.md`
- Wireframes: `wireframes/03-supply-lists.md` (§2.2–2.5), `wireframes/18-navigation.md`
- Out of scope (later stories): today's-delivery marking screens (§2.6–2.7 → **US-006**),
  monthly billing breakdown (Billing), customer CRUD (**US-008**). The detail screen shows
  today/month stat cards but their numbers are **zeroed by the backend `DeliveryStats` stub
  until US-006** (see API notes) — we render them with a "no data yet" affordance.

---

## Backend Reconciliation (source of truth = `paycycle_api/src/modules/supply-list/`)

The story doc's JSON was **mostly** accurate but differs from the shipped API in these ways.
**The shipped API wins.** Dev must code to this section.

| # | Story doc says | Actual backend | Frontend impact |
|---|---|---|---|
| R1 | IDs are integers (`"id": 10`) | All IDs are **strings** (BigInt serialised): `id`, `staffId`, `customerId`, `subscriptionId` | All DTO id fields typed `string`. Never `number`. |
| R2 | Success body is the bare object / `{ supplyList: {...} }` | Global envelope **`{ success: true, data, meta? }`** via `sendSuccess/sendCreated/sendListResponse` | Services unwrap `res.data.data`; lists read `res.data.meta`. |
| R3 | `frequency: "daily"` (lowercase) | Prisma enum **`DAILY` / `WEEKLY` / `MONTHLY`** (uppercase) in request + response | UI value union is uppercase; map to localized labels. |
| R4 | List status query `?status=active\|archived` | Same, lowercase `active\|archived`. List `status` field also lowercase `active\|archived`. **But `frequency` is uppercase.** Don't conflate. | Keep two separate unions. |
| R5 | `POST .../customers` body returns `subscriptions[]` only | Returns **`{ addedCount, skippedCount, subscriptions[], skipped:[{customerId,reason}] }`** | Show "Added N, skipped M (already subscribed)" summary. |
| R6 | Available customers fetched implicitly | Dedicated route **`GET .../supply-lists/:listId/available-customers`** (owner-only, paginated, `?search&page&limit`) returning `AvailableCustomerDto` (`{customerId, name, phone, otherLists[], otherListsCount}`) | Separate service method + paginated infinite list. |
| R7 | `weekly: 'mon,wed,fri'` string | `frequencyDays` is a **number[]** — WEEKLY → ISO 1..7 (Mon=1), MONTHLY → 1..31, DAILY → `[]`. Create uses a **discriminated union** (days required for WEEKLY/MONTHLY) | Day selector emits `number[]`; validate per-frequency. |
| R8 | Customer card "otherLists" array | DTO has **both** `otherLists: string[]` and `otherListsCount: number` (edge #6 "and X more" pre-computed server-side) | Render first N names + "+ (count − N) more". |
| R9 | Assign/unassign returns `{success}` | `POST/DELETE .../staff` return the **full updated `SupplyListDto`** | Store replaces the detail object from the response. |
| R10 | DELETE list → `{success}` | Returns **`{ id, status: 'archived' }`**; DELETE subscription → **`{ subscriptionId, status:'ended', endDate }`** | Optimistic remove confirmed by these shapes. |
| R11 | Update subscription `status: 'active'` | Allowed values **`active` / `paused`** only (no reactivating ENDED → 422 `UNPROCESSABLE_ENTITY`) | Toggle only active⇄paused; ENDED is terminal. |
| R12 | Staff assign path `.../staff/:staffId/lists` (US-002 OQ-6 stub) | Canonical write path is **`.../supply-lists/:listId/staff/:staffId`** (membership-id `staffId`) | **OQ-2** — reconcile the staff-side assign UI. |

**Error envelope** (all failures): `{ success:false, error:{ code, message, correlationId, details? } }`.
Status→code map used by the API: 400 `VALIDATION_ERROR`/`BAD_REQUEST`, 403 `FORBIDDEN`,
404 `NOT_FOUND`, 409 `CONFLICT` (duplicate list name / all-customers-already-subscribed),
422 `UNPROCESSABLE_ENTITY` (staff disabled / customer not in vendor / invalid sub transition),
429 `TOO_MANY_REQUESTS`. The `correlationId` MUST be logged via the shared logger on every
caught error (no PII).

**Base path**: all routes mounted at `/api/v1/vendors`. **OQ-4 RESOLVED** (see Open Questions):
US-005 `APIPath` strings stay `/vendors/...` (no `/v1`), identical to the existing auth/staff
convention — **no `APIPath` change**. Correct routing depends on the deployed `EXPO_PUBLIC_API_URL`
ending `/api/v1`; the committed default is only `…/api`, so the orchestrator/Review must confirm the
deployment env (a pre-existing, app-wide concern affecting auth/staff equally — not a US-005 change).

---

## Screen Flow

Navigation depth target: **≤ 2 taps** to any primary action. Lists is a primary bottom-nav
destination (wireframe 18). Expo Router file-based; screens live behind the `(app)` auth guard
and are owner/staff gated in-screen via `useRequireOwner` / `useRole` (defence-in-depth).

```
(app)
 ├─ supply-lists/            index.tsx      → SupplyListsScreen   (Owner: all; entry "Lists" tab)
 │   ├─ create.tsx           → CreateSupplyListScreen   (Owner)   [tap +Add]      (1 tap from list)
 │   ├─ [listId]/index.tsx   → SupplyListDetailScreen   (Owner+assigned staff)    (1 tap: card)
 │   ├─ [listId]/edit.tsx    → EditSupplyListScreen      (Owner)   [tap Edit]      (2 taps)
 │   └─ [listId]/add-customers.tsx → AddCustomersScreen  (Owner)  [tap +Add Customers] (2 taps)
 └─ my-lists/                index.tsx      → StaffSupplyListsScreen (Staff: assigned only)
```

- **Entry points**: Owner bottom-nav "Lists" → `SupplyListsScreen`. Staff bottom-nav
  "My Lists" → `StaffSupplyListsScreen`. (Bottom nav itself is not built in this story —
  add the two route stubs and wire from the existing owner/staff home; full tab bar is a
  later nav story. For now expose via the home screens, keeping ≤2 taps.)
- **Assign-staff** is an in-detail bottom sheet (no separate route) → 1 tap from detail.
- **Edit subscription** (qty/rate/pause/remove) is an in-detail bottom sheet on a CustomerCard.

---

## Screen Specifications

Every screen wraps in `ScreenErrorBoundary`, uses `AppHeader`, and defines **all 5 states**:
Loading (skeleton), Empty, Error (inline banner via `mapApiError`), Populated, Offline
(`useNetworkStatus` banner; writes disabled offline — see Offline Behavior).

### 1. SupplyListsScreen (Owner) — `supply-lists/index.tsx`

- **Layout**: `AppHeader` title `supply.title` + trailing `+Add` `AppIconButton`. Below:
  `AppSearchBar` (client-side filter by name, debounced 300 ms). `AppSection` "Active Lists (N)".
  `FlatList` of `SupplyListCard`. Bottom-anchored `AppButton` "+ Create List" (thumb reach;
  duplicates header +Add for reachability). Status filter `AppSegmentedControl` Active/Archived.
- **Component tree**: `ScreenErrorBoundary` › `AppHeader` › `AppSearchBar` › `AppSegmentedControl`
  › `FlatList`(`SupplyListCard`) › `AppButton`. Loading → 4× `SupplyListCard` skeleton.
- **SupplyListCard** shows: `SupplyTypeIcon` + name + `startTime` (localized), frequency badge +
  `default: {qty} {unit} @ ₹{rate}/{unit}`, assigned staff names (`Raju, Suresh` / "Unassigned"),
  `customerCount`, today progress (`AppProgressBar` delivered/customerCount) with
  "Today: 45/52" or "Not started" / "No data yet" when stats are stub-zero.
- **States**: Empty → `AppEmptyState` (illustration + `supply.empty_lists` + CTA "Create your
  first list"). Error → inline `AppAlert` + retry. Offline → banner; cached lists still shown.
- **Interactions**: tap card → detail; pull-to-refresh; tap +Add → create. Haptic `Light` on
  card tap, `Medium` on +Add.

### 2. CreateSupplyListScreen (Owner) — `supply-lists/create.tsx`

- **Layout**: scrollable form, bottom-anchored primary `AppButton` "CREATE LIST". Progressive
  disclosure: schedule-day selector only appears for Weekly/Monthly; primary-staff `AppSelect`
  only appears once ≥1 staff selected.
- **Fields** (validation in **Form Validation** below): Name (`AppInput`), Supply Type
  (`AppSelect`: milk/bread/newspaper/water/tiffin/other → free-string max 50, optional),
  Unit (`AppSelect`: ltr/kg/pieces/grams/numbers/packets — **required**), Default Quantity
  (`AppInput` numeric keypad, optional ≥0), Rate/Unit (`AppInput` numeric, optional ≥0),
  **Auto Amount** (read-only `qty × rate`), Start Time (`AppDatePicker` time mode → "HH:mm"),
  Frequency (`AppRadioGroup` Daily/Weekly/Monthly), Day selector (Weekly: Mon–Sun chips →
  number[] 1..7; Monthly: 1..31 grid), Assign Staff (multi-select bottom sheet over staff list),
  Primary Staff (`AppSelect` constrained to selected).
- **Component tree**: `AppHeader` › ScrollView(`AppInput`/`AppSelect`/`AppRadioGroup`/day-chips/
  staff multi-select) › sticky `AppButton`. Hook `useSupplyListForm` holds form state + validation.
- **States**: Loading n/a (no fetch except staff options → inline). Submitting → button spinner,
  form disabled. Error → field-level inline + top `AppAlert` for 409 duplicate name / 422 staff.
  Offline → submit disabled + banner (writes are not queued — see Offline).
- **Interactions**: haptic `Success` on create → navigate to new detail; `Error` haptic on
  validation fail. Amount updates live (`useMemo`).

### 3. SupplyListDetailScreen (Owner + assigned Staff) — `supply-lists/[listId]/index.tsx`

- **Layout**: ScrollView. Header card (`SupplyTypeIcon`, name, time | frequency, default qty@rate,
  staff names). **Month stats** `AppStatsCard` (customers, days completed, total qty, revenue).
  **Today summary** card (delivered/leave/pending, today qty, "View Today's Deliveries >" →
  disabled stub "Coming in US-006"). Customers section: `AppSearchBar` (server search, debounced)
  + status `AppSegmentedControl` (active/paused/ended) + `FlatList` of `CustomerCard` +
  bottom "+ Add Customers to List" (owner only via `RoleGate`). Owner-only header actions:
  `Edit` + `[:]` overflow (`Assign staff`, `Archive list`).
- **Stub stats UX**: when month/today numbers are all zero AND backend stub is active, show a
  muted "Delivery data starts with US-006" caption instead of misleading zeros.
- **Component tree**: `AppHeader`(Edit + overflow) › ScrollView(header card, `AppStatsCard`,
  today card, `AppSearchBar`, `AppSegmentedControl`, `FlatList`(`CustomerCard`), `AppButton`)
  › `AppBottomSheet`(assign staff) › `AppConfirmDialog`(archive) › `AppBottomSheet`(edit sub).
- **CustomerCard** shows: `AppAvatar` initials, name + phone, `{qty} {unit} @ ₹{rate}/{unit}`,
  custom indicator (⭐ `AppBadge` when `isCustomQuantity||isCustomRate`), "Since {startDate}",
  `otherLists` first 2 names + "+{otherListsCount−2} more". Tap (owner) → edit sub sheet.
- **States**: Loading → skeleton header + 3 customer skeletons. Empty customers → `AppEmptyState`
  "No customers yet" + CTA. Error → inline banner. Offline → cached detail shown, write actions
  disabled. **404** (staff not assigned / archived for staff) → masked "not found" empty state.
- **Interactions**: pull-to-refresh re-fetches detail + first customer page; infinite scroll
  paginates customers; haptics on actions.

### 4. EditSupplyListScreen (Owner) — `supply-lists/[listId]/edit.tsx`

- Same `useSupplyListForm` as Create, **pre-populated** from cached/fetched detail; primary
  button "SAVE CHANGES". Sends **only changed fields** (PATCH partial). Shows inline notice
  `supply.edit_price_notice` ("Changing the default price does not affect customers with custom
  overrides"). Frequency change re-validates day selector. On success → back to detail
  (haptic `Success`). 409 duplicate name handled inline.

### 5. AddCustomersScreen (Owner) — `supply-lists/[listId]/add-customers.tsx`

- **Layout**: `AppHeader` "Add to {listName}". `AppSearchBar` (server search by name/phone).
  List-defaults caption. `FlatList` of selectable rows (`AppCheckbox` + name + phone + "Currently
  in: …"). Sticky footer: "Selected: N", Quantity (`AppRadioGroup` default/custom + numeric input),
  Rate (default/custom + numeric), Start Date (`AppDatePicker`), primary "ADD N CUSTOMERS"
  (disabled when N=0 or offline).
- **Source**: `GET .../available-customers` (paginated, server search). Custom qty/rate inputs
  appear only when the "custom" radio is chosen (progressive disclosure, mirrors backend
  `useDefaultQuantity/useDefaultRate` refinement).
- **States**: Loading → row skeletons. Empty (all customers already in list, or vendor has no
  customers) → `AppEmptyState` "No available customers". Error/Offline as standard. **Result**:
  on submit show `addedCount`/`skippedCount` summary (R5) via `AppAlert`/toast, then back to detail.
- **Edge**: 409 (all already subscribed) → friendly inline message, keep selection.

### 6. StaffSupplyListsScreen (Staff) — `my-lists/index.tsx`

- Header "My Lists" (no +Add). `FlatList` of `SupplyListCard` from `GET .../supply-lists`
  (server already scopes staff to assigned lists; we **also** pass nothing — role is JWT-derived).
  Tap → `SupplyListDetailScreen` in read-only mode (no Edit/overflow/+Add via `RoleGate`).
  Empty → "No lists assigned yet". Same 5 states. This is the staff delivery entry point;
  "View Today's Deliveries" remains a US-006 stub.

### Haptic feedback points (all screens)
`Light` on card/row tap & checkbox toggle; `Medium` on +Add / open sheet; `Success` on
create/save/add/assign; `Warning` before archive/remove confirm; `Error` on validation failure.

### Animation specifications
- List items: staggered fade/translate-in (reanimated `FadeInDown`, 30 ms stagger, **capped to
  first ~10 rows** for low-end devices; respect `useReducedMotion` → no motion).
- Bottom sheets: existing `AppBottomSheet` spring. Progress bars: `AppProgressBar` width spring
  on value change. Detail header: simple fade (no shared-element on 2 GB devices).

---

## Component Requirements

### New domain components (in `src/modules/supply-lists/components/`)

```ts
// SupplyTypeIcon.tsx — maps supplyType → icon (lucide/expo). Falls back to a generic box.
interface SupplyTypeIconProps {
  supplyType: string | null            // 'milk'|'bread'|'newspaper'|'water'|'tiffin'|'other'|custom
  size?: number                        // default 24
  color?: string                       // default colors.primary
  testID?: string
}

// SupplyListCard.tsx — one list row (Owner list + Staff my-lists).
interface SupplyListCardProps {
  list: SupplyListListDto
  onPress: (listId: string) => void
  showProgress?: boolean               // default true; false hides today bar when stub-zero
  testID?: string
}

// CustomerCard.tsx — one subscription row in detail.
interface CustomerCardProps {
  subscription: SubscriptionDto
  unit: string                         // list unit, for "@ ₹x/unit" formatting
  onPress?: (subscriptionId: string) => void   // owner edit; omit for read-only/staff
  maxOtherLists?: number               // default 2 before "+N more"
  testID?: string
}
```

All three: memoized (`React.memo`), presentational (no store/API), `t()` for every string,
44×44 min touch target, tokens only, `accessibilityRole`/`accessibilityLabel`.

### Reused existing components (reuse before create)
`AppHeader, AppSearchBar, AppSegmentedControl, AppCard, AppText, AppBadge, AppAvatar,
AppButton, AppIconButton, AppInput, AppSelect, AppRadioGroup, AppCheckbox, AppDatePicker,
AppStatsCard, AppProgressBar, AppEmptyState, AppLoader, AppAlert, AppBottomSheet,
AppConfirmDialog, AppSection, AppDivider, RoleGate, ScreenErrorBoundary`.

### Modifications to existing components
**None required.** If a multi-select staff picker is needed, reuse the pattern from
`roles/components/SupplyListMultiSelect.tsx` (do **not** edit that file — build a local
`StaffMultiSelect` if its props don't fit). Add new component barrel exports to the
**module** index (`src/modules/supply-lists/components/index.ts`), not the global
`src/components/index.ts` (these are domain components per Layer 3).

---

## State Management

New Zustand store `src/modules/supply-lists/store/supplyLists.store.ts`, mirroring
`roles.store.ts` conventions (vendorId from `auth.store.vendorContext`; errors are i18n KEYS via
`mapApiError`; all failures through `logError` with `correlationId`; `clearSupplyLists()` called
from `auth.store.logout()`).

**State shape**
```ts
interface SupplyListsState {
  // list screen
  lists: SupplyListListDto[]
  listsMeta: PaginationMeta | null
  listStatusFilter: 'active' | 'archived'
  isListsLoading: boolean
  listsError: string | null            // i18n key
  // detail
  detail: Record<string, SupplyListDto>          // by listId
  isDetailLoading: boolean
  detailError: string | null
  // subscriptions per list
  customers: Record<string, SubscriptionDto[]>   // by listId
  customersMeta: Record<string, PaginationMeta>
  isCustomersLoading: boolean
  // available customers (add screen)
  available: AvailableCustomerDto[]
  availableMeta: PaginationMeta | null
  isAvailableLoading: boolean
  // actions
  fetchLists(status?, page?): Promise<void>
  fetchDetail(listId): Promise<void>
  fetchCustomers(listId, opts?): Promise<void>
  fetchAvailable(listId, opts?): Promise<void>
  createList(input): Promise<SupplyListDto>
  updateList(listId, patch): Promise<void>
  archiveList(listId): Promise<void>
  assignStaff(listId, staffId, isPrimary): Promise<void>
  unassignStaff(listId, staffId): Promise<void>
  addCustomers(listId, input): Promise<AddCustomersResultDto>
  updateSubscription(listId, subscriptionId, patch): Promise<void>
  endSubscription(listId, subscriptionId): Promise<void>
  clearError(): void
  clearSupplyLists(): void
}
```
- **Persistence**: persist **only** the lean `lists` (names/ids/icons for instant offline render of
  the Lists screen on next launch) — **no customer PII** (phone/name/address) is persisted. Detail
  + customers + available are in-memory only (they carry phone numbers → never to AsyncStorage).
- **Derived/selectors**: `selectListById`, `selectFilteredLists(search)` (client filter on cached
  lists), `computeAmount(sub)` = `sub.quantity * sub.ratePerUnit` (server already returns `amount`,
  so prefer the server value; client compute only for live form preview).
- **Form local state**: `useSupplyListForm` hook (Create/Edit) holds field state + validation; not
  in the global store.

---

## API Integration

Service `src/modules/supply-lists/service/supplyLists.service.ts` (mock/real via `isMockMode`,
calls through shared `httpClient`, paths from `APIPath.SupplyLists.*`). Every method unwraps the
`{ success, data, meta }` envelope. Errors bubble; the store maps + logs them.

| Action | Method + path (under `/api/v1/vendors`) | Req → Res (`data`) |
|---|---|---|
| List | `GET /:v/supply-lists?status&staffId&page&limit` | → `SupplyListListDto[]` (+ `meta`) |
| Detail | `GET /:v/supply-lists/:listId` | → `SupplyListDto` |
| Create | `POST /:v/supply-lists` | body → `SupplyListDto` (201) |
| Update | `PATCH /:v/supply-lists/:listId` (partial, ≥1 field) | → `SupplyListDto` |
| Archive | `DELETE /:v/supply-lists/:listId` | → `{ id, status:'archived' }` |
| Assign staff | `POST /:v/supply-lists/:listId/staff` `{staffId,isPrimary}` | → `SupplyListDto` (201) |
| Unassign staff | `DELETE /:v/supply-lists/:listId/staff/:staffId` | → `SupplyListDto` |
| List customers | `GET /:v/supply-lists/:listId/customers?search&status&page&limit` | → `SubscriptionDto[]` (+`meta`) |
| Available customers | `GET /:v/supply-lists/:listId/available-customers?search&page&limit` | → `AvailableCustomerDto[]` (+`meta`) |
| Add customers | `POST /:v/supply-lists/:listId/customers` | body → `AddCustomersResultDto` (201) |
| Update sub | `PATCH /:v/supply-lists/:listId/customers/:subscriptionId` `{quantity?,ratePerUnit?,status?}` | → `SubscriptionDto` |
| End sub | `DELETE /:v/supply-lists/:listId/customers/:subscriptionId` | → `{ subscriptionId, status:'ended', endDate }` |

**Request bodies** (frozen against backend zod validators):
- Create: `{ name, supplyType?, unit, defaultQuantity?, defaultRatePerUnit?, startTime?("HH:mm"),
  frequency:'DAILY'|'WEEKLY'|'MONTHLY', frequencyDays?:number[] (required WEEKLY 1..7 / MONTHLY 1..31),
  staffIds?:string[], primaryStaffId?:string (must ∈ staffIds) }`.
- Add customers: `{ customerIds:string[1..100], useDefaultQuantity?:bool=true, customQuantity?:num,
  useDefaultRate?:bool=true, customRate?:num, startDate?:date }` — `customQuantity` required when
  `useDefaultQuantity:false`; `customRate` required when `useDefaultRate:false`.

**Error handling per endpoint** (extend `mapApiError` with a `'supply'` context):
- 409 on create/update → `supply.error_duplicate_name`. 409 on add-customers →
  `supply.error_all_already_subscribed`. 422 assign-staff → `supply.error_staff_not_assignable`.
  422 add-customers → `supply.error_customer_not_in_vendor`. 422 update-sub →
  `supply.error_invalid_sub_transition`. 404 → `supply.error_not_found`. 403 →
  `roles.error_forbidden` (reuse). No-response → `common.offline_message` (reuse).
- **Every caught error** is logged via `logError(err, { screen, action, endpoint })`; the shared
  logger records ISO timestamp + message/stack + `correlationId` (read from
  `err.response.data.error.correlationId`) → `Logs/YYYY-MM-DD.txt`. **No customer PII** (the logger
  context carries listId/subscriptionId/correlationId only).

---

## Offline Behavior

Consistent with the **US-002/US-004 documented deviation**: supply-list **writes are
security/ownership-sensitive and are NOT offline-queued** in v1. Reads are offline-friendly.

- **Works offline**: Lists screen renders persisted lean `lists` cache (instant on 2G launch);
  client-side search/filter over cache. Detail/customers render from in-memory cache if still
  warm (not persisted — PII), else show offline empty state.
- **Writes** (create/edit/archive/add-customers/assign/sub-edit): submit buttons **disabled
  offline** with an inline "you're offline" banner (`useNetworkStatus`). No optimistic mutation is
  persisted to a queue. (This is a deliberate scope choice recorded as **OQ-3** — full WatermelonDB
  offline write queue is deferred; if the user wants optimistic offline writes now, escalate.)
- **Optimistic UI (online only)**: for snappy feel, archive/remove/pause apply optimistically to
  the in-memory list and **roll back on failure** (re-using the response shapes R9/R10/R11 to
  confirm). Create/edit are **not** optimistic (need server-assigned id / validation).
- **Sync indicator UX**: reuse the global offline banner + per-card `isSyncing` is **not** needed
  (no queue). Pull-to-refresh is the manual re-sync. Show "last updated" relative time on the
  Lists header from cache timestamp.
- **Conflict resolution**: last-write-wins server-side; on a stale write the API returns 404/409/422
  → we surface the mapped message and re-fetch. No client merge.

---

## Localization

All strings under a new **`supply.*`** namespace, added to **all 9 locales**
(`en, hi, ta, te, mr, bn, kn, ml, gu`). Keys (initial set — Dev finalises during impl):

`title, my_lists_title, add_list, create_list, save_changes, edit, archive_list,
archive_confirm_title, archive_confirm_body, active_lists, archived_lists, search_lists,
search_customers, empty_lists, empty_lists_cta, empty_customers, empty_customers_cta,
empty_available, empty_my_lists, unassigned, staff_label, customers_count, today_progress,
today_not_started, no_delivery_data_yet, default_label, amount_label, field_name, field_supply_type,
field_unit, field_quantity, field_rate, field_start_time, field_frequency, freq_daily, freq_weekly,
freq_monthly, select_days, weekday_mon..weekday_sun, assign_staff, primary_staff, select_staff,
add_customers_title, list_defaults, use_default_qty, custom_qty, use_default_rate, custom_rate,
start_date, selected_count, add_n_customers, added_skipped_summary, since_date, custom_badge,
other_lists_more, edit_subscription, pause, resume, remove_customer, remove_confirm_title,
remove_confirm_body, view_today_deliveries, coming_in_us006, edit_price_notice,
supply_type_milk, supply_type_bread, supply_type_newspaper, supply_type_water, supply_type_tiffin,
supply_type_other, unit_ltr, unit_kg, unit_pieces, unit_grams, unit_numbers, unit_packets,
error_duplicate_name, error_all_already_subscribed, error_staff_not_assignable,
error_customer_not_in_vendor, error_invalid_sub_transition, error_not_found`.

- **Number/currency/date**: use existing `formatters.ts`/`formatDate.ts` (locale-aware ₹ + dates).
  Time "HH:mm" → localized 12/24h display via a formatter; **send** "HH:mm" to API.
- **Text expansion** (~+35%) and **RTL**: none of the 9 languages are RTL, but use `start/end`
  (never `left/right`) per the UX skill; ensure cards don't clip long Tamil/Malayalam strings
  (`numberOfLines` + wrap).

## Performance Considerations

- **Lists**: `FlatList` (small N, <50 lists typical) — `keyExtractor`, `getItemLayout` if fixed
  height, `React.memo` card, `removeClippedSubviews`. No FlashList dependency added.
- **Customers / available**: can be 100+ → `FlatList` with **server pagination** (limit 50,
  `onEndReached` infinite scroll), `windowSize` tuned, memoized rows, debounced (300 ms) server
  search. Target smooth scroll on 2 GB RAM.
- **Images**: none (icon font / vector `SupplyTypeIcon`) — zero image memory cost.
- **Memory budget**: detail screen unmounts customer list cache on blur if large; avoid holding all
  pages — keep last loaded pages, drop on screen leave. Animations capped to first 10 rows.
- **Bundle**: new module is code-split by route (Expo Router lazy). No heavy deps.

## Accessibility

- Touch targets ≥ 44×44 (cards, checkboxes, day chips get `hitSlop`). Color never the only signal
  (custom-rate ⭐ pairs icon + "Custom" text; progress pairs bar + "45/52" text).
- Screen-reader labels on every interactive: card → "{name}, {customerCount} customers, {today}
  done today"; checkbox → "{customer name}, {in N lists}"; progress → "delivered 45 of 52".
- Contrast ≥ 4.5:1 (trust-green tokens already compliant). Numeric keypad for qty/rate. Selection
  over typing wherever possible (units, supply type, days, staff).

---

## Open Questions — RESOLVED (decisions of record)

> All six were surfaced to the user and **resolved on 2026-06-11**; every decision matches the
> Architect's recommended option. The trade-offs are preserved below for the audit trail. These
> are now binding; the workstreams/tasks already reflect them (no partition changes resulted).

**OQ-1 — Supply-type icon set. RESOLVED → Recommended (Lucide + fixed map + fallback).**
Use `lucide-react-native` glyphs with a **fixed map for the 6 known supply types**
(milk/bread/newspaper/water/tiffin/other) and a **generic fallback** for any custom `supplyType`
string. Zero new assets; custom types share the fallback icon. (Implemented by `SupplyTypeIcon`,
WS-0 / Task 3.)
- Considered & rejected: per-type custom illustrations (asset/bundle + design cost); emoji icons
  (inconsistent on low-end Android fonts).

**OQ-2 — Staff↔list assignment direction. RESOLVED → Recommended (list-side, detail screen = SoT).**
The Supply-List **detail** screen is the **single source of truth** for staff↔list assignment,
using the shipped list-side API `POST/DELETE /vendors/:v/supply-lists/:listId/staff/:staffId`
(membership-id `staffId`), which returns the full `SupplyListDto`. The US-002/US-004 staff-side
`SupplyListMultiSelect` becomes **READ-ONLY** (shows assignments, links to the list; no writes via
the provisional stub paths). This changes the US-004 staff-detail "assign lists" affordance to
view-only / deep-link.
- Considered & rejected: client adapter fanning N non-atomic list-side calls from the staff side;
  leaving the staff-side writer dead behind the 503 stub.
- **Impact note:** making the existing `roles/SupplyListMultiSelect` read-only would edit a file
  **outside** the US-005 owned-file set (`src/modules/roles/**`). That change is **NOT** owned by any
  US-005 workstream — the orchestrator must schedule it as a separate micro-task/commit (raise to
  the Dev orchestrator) so US-005 sub-agents don't touch roles files. US-005 itself only **adds** the
  list-side assignment UI (WS-3); it does not modify the roles module.

**OQ-3 — Offline writes. RESOLVED → Recommended (online-only for US-005).**
Supply-list **writes are online-only** in US-005: disabled when offline with an inline banner; no
WatermelonDB write queue. Reads remain offline-friendly (lean `lists` cache). The offline write
queue is **deferred** to a dedicated offline-first story alongside US-006. Consistent with the
US-002/US-004 deviation. (Already reflected in Offline Behavior; WS-1 store / WS-2+WS-3 screens.)
- Considered & rejected: building the WatermelonDB queue + optimistic offline writes now (large,
  high-risk scope for an owner-only management surface).

**OQ-4 — API base path `/v1` segment. RESOLVED → Recommended (no `APIPath` change; verify base URL).**
Keep `APIPath` builders as `/vendors/...` (no `/v1` in path strings); US-005 follows the **same
convention** as the existing auth/staff routes, so whatever resolves those resolves US-005.
**Verification (this repo, 2026-06-11):**
- `src/services/config.ts` → `API_CONFIG.baseUrl = EXPO_PUBLIC_API_URL || 'http://localhost:3000/api'`;
  `.env.example` ships `EXPO_PUBLIC_API_URL=http://localhost:3000/api`. The committed default ends
  **`/api`, not `/api/v1`**.
- `src/constants/apiPaths.ts` builders emit bare `/vendors/...` (no `/v1`), and `http.ts` does not
  inject a version segment.
- **Conclusion:** US-005 needs **no `APIPath` change** — it is correctly consistent with existing
  staff routes (decision honoured). **However**, the committed default base URL does **not** include
  `/v1`, so correct routing **depends on the deployed `EXPO_PUBLIC_API_URL` being set to `…/api/v1`**
  (overriding the example). This is a pre-existing, app-wide concern (it affects auth/staff exactly
  as much as US-005), **not** a US-005 regression. **Action for orchestrator/Review:** confirm the
  real deployment env sets `EXPO_PUBLIC_API_URL` to end `/api/v1`; if it only ends `/api`, add the
  `/v1` prefix **once** (base URL or a single `http.ts`/`APIPath` change) for **all** domains — a
  separate cross-cutting fix, still leaving US-005 `APIPath` strings unchanged.

**OQ-5 — Staff "My Lists" tap. RESOLVED → Recommended (read-only detail; disabled deliveries CTA).**
Staff "My Lists" tap opens the **read-only `SupplyListDetailScreen`** (assigned-only, no owner
affordances via `RoleGate`), with a **"View Today's Deliveries" action present but disabled** until
US-006 ("Coming soon"). Gives staff a real screen now; the delivery action lights up in US-006
without re-routing. (WS-3 / Task 9.)
- Considered & rejected: non-tappable staff cards until US-006 (less useful).

**OQ-6 — "Add Customers" source. RESOLVED → Recommended (build fully against `available-customers`).**
Build the Add-Customers screen fully against `GET .../available-customers`, with an **informative
empty state** ("Add customers in Customer Management", US-008) when it returns nothing — never a
dead end. Testable now via seeded/mock customers (WS-0 mocks include an empty-available fixture);
ready the moment US-008 lands. (WS-3 / Task 9.)
- Considered & rejected: deferring the Add-Customers screen to US-008 (breaks the core demo flow).
