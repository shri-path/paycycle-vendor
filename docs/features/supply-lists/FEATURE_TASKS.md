# Feature Tasks: US-005 Supply Lists Management — Frontend

New feature module `src/modules/supply-lists/`. Reuses the shipped `src/modules/roles/`
conventions (httpClient, mapApiError, logger, useRequireOwner, RoleGate) and the shared component
library. Branch off `main` (e.g. `feat/us-005-supply-lists-frontend`). Sub-agents edit ONLY their
owned files and **do not commit** — the orchestrator integrates. Do NOT push.

Every task tags the skill(s) the Dev must follow. All API contracts are frozen against
**FEATURE_PLAN.md → Backend Reconciliation** (the live `paycycle_api` source, not the story doc).

## Parallel Workstreams (conflict-free partition)

> Each workstream owns a disjoint set of files. One sub-agent per workstream within a phase.
> All shared/foundation files live in WS-0. Verify: the union of "Owned files" has no overlap.

### Phase 1 — Foundation (run first, single owner)

**WS-0: Foundation / shared**
- **Owned files**:
  - `src/types/supplyLists.ts` *(new)*
  - `src/constants/apiPaths.ts` *(edit: add `SupplyLists` group)*
  - `src/utils/errorMapper.ts` *(edit: add `'supply'` context)*
  - `src/services/mocks/supplyLists.mock.ts` *(new)* + register in `src/services/mocks/index.ts` *(edit)*
  - `src/locales/en.json`, `hi.json`, `ta.json`, `te.json`, `mr.json`, `bn.json`, `kn.json`, `ml.json`, `gu.json` *(edit: add `supply.*`)*
  - `src/modules/supply-lists/components/SupplyTypeIcon.tsx` (+ `components/__tests__/SupplyTypeIcon.test.tsx`)
  - `src/modules/supply-lists/components/SupplyListCard.tsx` (+ test)
  - `src/modules/supply-lists/components/CustomerCard.tsx` (+ test)
  - `src/modules/supply-lists/components/index.ts` *(new module barrel)*
- **Depends on**: —
- **Produces (contracts) — FROZEN for Phase 2**:
  - **Types** (`src/types/supplyLists.ts`, mirroring `paycycle_api/.../supply-list.types.ts`; **all ids `string`**):
    ```ts
    type SupplyFrequency = 'DAILY' | 'WEEKLY' | 'MONTHLY'        // uppercase (R3)
    type SupplyListStatus = 'active' | 'archived'                // lowercase (R4)
    type SubscriptionStatus = 'active' | 'paused' | 'ended'
    type SupplyUnit = 'ltr'|'kg'|'pieces'|'grams'|'numbers'|'packets'
    interface AssignedStaffDto { staffId: string; staffName: string|null; phoneNumber?: string|null; isPrimary: boolean }
    interface TodayStatsDto { date: string; delivered: number; onLeave: number; pending: number; totalQuantity: number }
    interface MonthStatsDto { month: string; daysCompleted: number; totalQuantity: number; revenue: number }
    interface SupplyListListDto { id, name, supplyType: string|null, unit, defaultQuantity: number|null,
      defaultRatePerUnit: number|null, startTime: string|null, frequency: SupplyFrequency,
      status: SupplyListStatus, assignedStaff: AssignedStaffDto[], customerCount: number, todayStats: TodayStatsDto }
    interface SupplyListDto extends SupplyListListDto { frequencyDays: number[]; monthStats: MonthStatsDto }
    interface SubscriptionDto { subscriptionId, customerId, customerName: string|null, phoneNumber?: string|null,
      address?: string|null, quantity: number, ratePerUnit: number, amount: number, isCustomQuantity: boolean,
      isCustomRate: boolean, startDate: string|null, status: SubscriptionStatus, otherLists: string[], otherListsCount: number }
    interface AvailableCustomerDto { customerId, name: string|null, phone: string|null, otherLists: string[], otherListsCount: number }
    interface AddCustomersResultDto { addedCount: number; skippedCount: number; subscriptions: SubscriptionDto[]; skipped: {customerId: string; reason: string}[] }
    interface ArchiveListResultDto { id: string; status: 'archived' }
    interface EndSubscriptionResultDto { subscriptionId: string; status: 'ended'; endDate: string }
    interface PaginationMeta { page: number; limit: number; total: number; totalPages: number }
    // input types
    interface CreateSupplyListInput { name; supplyType?; unit: SupplyUnit; defaultQuantity?; defaultRatePerUnit?;
      startTime?: string; frequency: SupplyFrequency; frequencyDays?: number[]; staffIds?: string[]; primaryStaffId?: string }
    interface UpdateSupplyListInput { /* all optional, ≥1 */ name?; supplyType?: string|null; unit?: SupplyUnit;
      defaultQuantity?: number|null; defaultRatePerUnit?: number|null; startTime?: string|null; frequency?: SupplyFrequency; frequencyDays?: number[] }
    interface AddCustomersInput { customerIds: string[]; useDefaultQuantity?: boolean; customQuantity?: number;
      useDefaultRate?: boolean; customRate?: number; startDate?: string }
    interface UpdateSubscriptionInput { quantity?: number|null; ratePerUnit?: number|null; status?: 'active'|'paused' }
    ```
  - **apiPaths** (`APIPath.SupplyLists.*`, paths relative to the existing `/vendors` convention; **OQ-4 RESOLVED** — no `/v1` in path strings, same as auth/staff; deployment-env base-URL confirmation is a separate cross-cutting check, not a WS-0 edit):
    ```ts
    SupplyLists: {
      List:    (v) => `/vendors/${v}/supply-lists`,
      Detail:  (v, l) => `/vendors/${v}/supply-lists/${l}`,
      Staff:   (v, l) => `/vendors/${v}/supply-lists/${l}/staff`,
      StaffDetail: (v, l, s) => `/vendors/${v}/supply-lists/${l}/staff/${s}`,
      Customers:   (v, l) => `/vendors/${v}/supply-lists/${l}/customers`,
      Available:   (v, l) => `/vendors/${v}/supply-lists/${l}/available-customers`,
      Subscription:(v, l, sub) => `/vendors/${v}/supply-lists/${l}/customers/${sub}`,
    }
    ```
  - **errorMapper**: `ApiErrorContext` adds `'supply'`; mappings — 409→`supply.error_duplicate_name`
    (create/update) / `supply.error_all_already_subscribed` (add-customers; distinguish by `action`
    if needed), 422→`supply.error_staff_not_assignable`/`error_customer_not_in_vendor`/
    `error_invalid_sub_transition`, 404→`supply.error_not_found`, 403→`roles.error_forbidden`,
    no-response→`common.offline_message`.
  - **mocks**: `mockSupplyLists: SupplyListListDto[]`, `mockSupplyListDetail`, `mockSubscriptions`,
    `mockAvailableCustomers` (incl. an empty-vendor fixture variant for OQ-6 testing).
  - **i18n keys**: the full `supply.*` set listed in FEATURE_PLAN → Localization, in **all 9** locales.
  - **Component prop APIs** (frozen): `SupplyTypeIconProps`, `SupplyListCardProps`, `CustomerCardProps`
    exactly as in FEATURE_PLAN → Component Requirements.
- **Skills**: `component-development.md`, `localization-i18n.md`, `error-handling.md`,
  `accessibility-ux.md`, `ui-visual-design.md`, `api-integration.md`

### Phase 2 — Feature workstreams (run in parallel; depend only on WS-0 contracts)

**WS-1: Service + store wiring**
- **Owned files**:
  - `src/modules/supply-lists/service/supplyLists.service.ts` (+ `service/__tests__/supplyLists.service.test.ts`)
  - `src/modules/supply-lists/store/supplyLists.store.ts` (+ `store/__tests__/supplyLists.store.test.ts`)
  - `src/modules/supply-lists/hooks/useSupplyListForm.ts` (+ `hooks/__tests__/useSupplyListForm.test.ts`)
- **Depends on**: WS-0 (types, apiPaths, mocks, errorMapper, locale error keys)
- **Consumes**: all WS-0 types/inputs, `APIPath.SupplyLists.*`, `mapApiError(_, 'supply')`, mocks.
- **Produces (contracts for WS-2..WS-4)**:
  ```ts
  // service (each unwraps {success,data,meta})
  supplyListsService.list(vendorId, {status?,staffId?,page?,limit?}) => Promise<{data: SupplyListListDto[]; meta: PaginationMeta}>
  supplyListsService.getDetail(vendorId, listId) => Promise<SupplyListDto>
  supplyListsService.create(vendorId, CreateSupplyListInput) => Promise<SupplyListDto>
  supplyListsService.update(vendorId, listId, UpdateSupplyListInput) => Promise<SupplyListDto>
  supplyListsService.archive(vendorId, listId) => Promise<ArchiveListResultDto>
  supplyListsService.assignStaff(vendorId, listId, {staffId,isPrimary}) => Promise<SupplyListDto>
  supplyListsService.unassignStaff(vendorId, listId, staffId) => Promise<SupplyListDto>
  supplyListsService.listCustomers(vendorId, listId, {search?,status?,page?,limit?}) => Promise<{data: SubscriptionDto[]; meta}>
  supplyListsService.listAvailable(vendorId, listId, {search?,page?,limit?}) => Promise<{data: AvailableCustomerDto[]; meta}>
  supplyListsService.addCustomers(vendorId, listId, AddCustomersInput) => Promise<AddCustomersResultDto>
  supplyListsService.updateSubscription(vendorId, listId, subId, UpdateSubscriptionInput) => Promise<SubscriptionDto>
  supplyListsService.endSubscription(vendorId, listId, subId) => Promise<EndSubscriptionResultDto>
  // store: useSupplyListsStore with the shape in FEATURE_PLAN → State Management
  // hook: useSupplyListForm(initial?) => { values, errors, setField, validate(), isValid, toCreateInput(), toUpdatePatch() }
  ```
- **Skills**: `api-integration.md`, `state-management.md`, `offline-first.md`, `form-validation.md`,
  `error-handling.md`, `testing-strategy.md`

**WS-2: Owner list + create/edit screens**
- **Owned files**:
  - `src/modules/supply-lists/screens/SupplyListsScreen.tsx` (+ test)
  - `src/modules/supply-lists/screens/CreateSupplyListScreen.tsx` (+ test)
  - `src/modules/supply-lists/screens/EditSupplyListScreen.tsx` (+ test)
- **Depends on**: WS-0 (components, i18n, types), WS-1 (store `fetchLists`/`createList`/`updateList`/
  `archiveList`, `useSupplyListForm`)
- **Consumes**: `SupplyListCard`, `SupplyTypeIcon`, store list/create/update actions, form hook,
  `useRequireOwner`, `RoleGate`, `useNetworkStatus`.
- **Skills**: `screen-development.md`, `form-validation.md`, `navigation-routing.md`,
  `accessibility-ux.md`, `ui-visual-design.md`, `localization-i18n.md`, `animation-haptics.md`,
  `performance-optimization.md`, `error-handling.md`, `testing-strategy.md`

**WS-3: Detail + add-customers screens (Owner + read-only staff)**
- **Owned files**:
  - `src/modules/supply-lists/screens/SupplyListDetailScreen.tsx` (+ test)
  - `src/modules/supply-lists/screens/AddCustomersScreen.tsx` (+ test)
  - `src/modules/supply-lists/screens/StaffSupplyListsScreen.tsx` (+ test)
  - `src/modules/supply-lists/components/StaffMultiSelect.tsx` (+ test) *(local assign-staff sheet; only if `roles/SupplyListMultiSelect` props don't fit — do NOT edit the roles file)*
- **Depends on**: WS-0 (components, i18n, types), WS-1 (store detail/customers/available/assign/
  add/sub actions)
- **Consumes**: `CustomerCard`, `SupplyTypeIcon`, store detail+customer+available+mutation actions,
  `AppBottomSheet`/`AppConfirmDialog`, `RoleGate`, `useRole`/`useRequireOwner`.
- **Skills**: `screen-development.md`, `form-validation.md`, `navigation-routing.md`,
  `real-time-sync.md`, `offline-first.md`, `accessibility-ux.md`, `ui-visual-design.md`,
  `localization-i18n.md`, `animation-haptics.md`, `performance-optimization.md`,
  `error-handling.md`, `testing-strategy.md`

**WS-4: Routing (Expo Router) + nav entry**
- **Owned files**:
  - `app/(app)/supply-lists/_layout.tsx`, `app/(app)/supply-lists/index.tsx`,
    `app/(app)/supply-lists/create.tsx`, `app/(app)/supply-lists/[listId]/index.tsx`,
    `app/(app)/supply-lists/[listId]/edit.tsx`, `app/(app)/supply-lists/[listId]/add-customers.tsx`
  - `app/(app)/my-lists/_layout.tsx`, `app/(app)/my-lists/index.tsx`
- **Depends on**: WS-2 + WS-3 screen default exports (thin route wrappers, like the staff routes).
- **Consumes**: screen components by import path only (no edits to screen files).
- **Note**: route files are thin wrappers (`export default () => <Screen/>`); owner/staff guards
  live in the screens. Adding the home-screen link to these routes is part of this WS **only if**
  it can be done without editing `home.tsx`/`staff-home.tsx` — if those must change, surface as a
  micro-task for the orchestrator (those files are NOT owned here to avoid conflicts).
- **Skills**: `navigation-routing.md`, `accessibility-ux.md`, `testing-strategy.md`

> **Owned-file overlap check**: WS-0/1/2/3/4 file sets are **disjoint**. All shared files (types,
> apiPaths, errorMapper, mocks+index, 9 locales, the 3 shared domain components + module barrel)
> live in WS-0. `home.tsx`/`staff-home.tsx` are owned by **no** workstream (untouched; see WS-4 note).
>
> **Orchestrator micro-tasks (outside US-005 owned files — schedule as separate commits):**
> 1. **OQ-2 follow-up:** make `src/modules/roles/components/SupplyListMultiSelect.tsx` **read-only**
>    (per OQ-2 resolution). `src/modules/roles/**` is owned by **no** US-005 workstream — US-005
>    sub-agents must not edit it. US-005 only **adds** the list-side assign UI in WS-3.
> 2. **OQ-4 follow-up:** confirm the deployed `EXPO_PUBLIC_API_URL` ends `/api/v1`; if it ends only
>    `/api`, add `/v1` once (base URL or a single `http.ts`/`APIPath` change) for **all** domains —
>    cross-cutting, leaves US-005 path strings unchanged.

---

## Task List (ordered; each maps to a workstream)

### Task 1 — Types + apiPaths + errorMapper foundation  _(WS-0)_
- **Skills**: `api-integration.md`, `error-handling.md`
- **Acceptance**: `src/types/supplyLists.ts` created exactly per WS-0 contract (all ids `string`,
  `frequency` uppercase, `status` lowercase). `APIPath.SupplyLists` added. `errorMapper` gains the
  `'supply'` context with all mappings. `typecheck` + `lint` clean. No change to behavior of
  existing `auth`/`staff` paths.

### Task 2 — Locale keys (all 9) + mocks  _(WS-0)_
- **Skills**: `localization-i18n.md`
- **Acceptance**: every `supply.*` key present in **all 9** locale files (key parity verified — no
  missing/extra keys across locales). Mocks export the documented fixtures incl. an empty-available
  variant. No hardcoded user-facing strings anywhere in the feature.

### Task 3 — SupplyTypeIcon, SupplyListCard, CustomerCard  _(WS-0)_
- **Skills**: `component-development.md`, `ui-visual-design.md`, `accessibility-ux.md`
- **Acceptance**: three memoized presentational components matching the frozen prop APIs;
  tokens only; `t()` for all strings; ≥44×44 targets; a11y labels; custom-rate ⭐ pairs icon+text;
  progress pairs bar+text; unit/snapshot tests render all states (incl. stub-zero "no data yet",
  long-script names, "+N more"). Exported from the module barrel (NOT the global component index).

### Task 4 — Service layer  _(WS-1)_
- **Skills**: `api-integration.md`, `testing-strategy.md`
- **Acceptance**: all 12 methods implemented (mock + real), each unwraps `{success,data,meta}`,
  ids stay strings, paths from `APIPath`. Errors bubble. Tests cover mock paths + envelope
  unwrapping + meta extraction. Offline (no-response) surfaces correctly upstream.

### Task 5 — Store  _(WS-1)_
- **Skills**: `state-management.md`, `offline-first.md`, `error-handling.md`
- **Acceptance**: `useSupplyListsStore` with the documented shape; vendorId from
  `auth.store.vendorContext`; errors are i18n keys via `mapApiError`; every failure logged via
  `logError` with `correlationId` (no PII); persists **only** lean `lists` (no phone/name/address);
  `clearSupplyLists()` wired into `auth.store.logout()` *(if that requires editing auth.store, raise
  to orchestrator — auth.store is not owned here; otherwise expose `clearSupplyLists` for it to call)*.
  Optimistic archive/remove/pause with rollback (online). Tests cover success + each error class +
  rollback + persistence partialize (asserts no PII persisted).

### Task 6 — useSupplyListForm hook  _(WS-1)_
- **Skills**: `form-validation.md`, `state-management.md`
- **Acceptance**: validates name (1–100), unit required, qty/rate ≥0 & finite, startTime "HH:mm",
  frequency-conditional days (WEEKLY 1..7 required, MONTHLY 1..31 required, DAILY none),
  primaryStaffId ∈ staffIds. `toCreateInput()`/`toUpdatePatch()` (patch = changed fields only).
  Inline field errors as i18n keys. Tests cover each rule + the discriminated-union day logic.

### Task 7 — SupplyListsScreen  _(WS-2)_
- **Skills**: `screen-development.md`, `navigation-routing.md`, `performance-optimization.md`,
  `animation-haptics.md`
- **Acceptance**: all 5 states; search (client, debounced); status segmented filter; FlatList of
  `SupplyListCard`; +Add (header + bottom, ≤2 taps); pull-to-refresh; staggered animation capped &
  reduced-motion-aware; owner-gated. Tests cover each state + filter + navigation.

### Task 8 — Create + Edit screens  _(WS-2)_
- **Skills**: `screen-development.md`, `form-validation.md`, `error-handling.md`
- **Acceptance**: form via `useSupplyListForm`; progressive disclosure (days, primary staff);
  live auto-amount; numeric keypads; submit disabled offline; 409 duplicate-name + 422 staff
  inline; Edit pre-populates & PATCHes changed fields only + shows price-override notice; success
  haptic + navigation. Tests cover validation, partial-patch, error mapping, offline-disabled.

### Task 9 — Detail + Add-customers + Staff My-Lists  _(WS-3)_
- **Skills**: `screen-development.md`, `real-time-sync.md`, `offline-first.md`,
  `performance-optimization.md`, `animation-haptics.md`
- **Acceptance**: Detail renders header/month/today cards (stub-zero → "no data yet"), paginated
  customers (infinite scroll, server search/status filter), owner actions (Edit, overflow
  Assign-staff sheet, Archive confirm, +Add Customers), edit-subscription sheet (qty/rate/pause/
  remove with confirm). Add-customers uses `available-customers` (paginated, server search),
  default/custom qty+rate progressive disclosure, start date, shows added/skipped summary, handles
  409 all-subscribed. Staff My-Lists is read-only (assigned only, no owner affordances via RoleGate,
  "View Today's Deliveries" disabled stub). 404 masked as empty. Writes disabled offline. Tests
  cover all 5 states per screen + role gating + pagination + result summary.

### Task 10 — Routing + nav entry  _(WS-4)_
- **Skills**: `navigation-routing.md`
- **Acceptance**: route files created as thin wrappers; deep links resolve; owner vs staff land on
  the right screen; ≤2 taps to any primary action; back behaves. Tests/smoke for route resolution.
  (Home-screen links added only if achievable without editing home files; else flagged.)

### Task 11 — Security & Auth  _(cross-cutting; enforced in WS-1/2/3)_
- **Skills**: `security-auth.md`
- **Acceptance**: vendorId always JWT-derived (from `auth.store`), never from route params/user
  input. Owner-only screens/actions guarded by `useRequireOwner` + `RoleGate` (defence-in-depth
  over the shared `httpClient` 401/403 interceptor). No tokens/PII persisted. Logout clears the
  supply-lists store. 403/401 → existing session-revocation path.

### Task 12 — Performance pass  _(cross-cutting; enforced in WS-2/3)_
- **Skills**: `performance-optimization.md`
- **Acceptance**: customer/available lists use server pagination + memoized rows + debounced search;
  animations capped to first ~10 rows + reduced-motion; no full-page spinners (skeletons); verified
  smooth on a 2 GB-RAM Android profile; no oversized cache retained on screen blur.

### Task 13 — Testing & i18n integrity  _(cross-cutting; per-WS tests + final gate)_
- **Skills**: `testing-strategy.md`, `localization-i18n.md`
- **Acceptance**: each WS ships its own Jest tests (components/service/store/hook/screens); locale
  key-parity check passes across all 9; full suite + `typecheck` + `lint` green before handoff.
