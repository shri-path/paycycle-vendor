# Feature Tasks — Customer Management (US-008) — Frontend

> Dev agents run on `claude-sonnet-4-6` and need ZERO architectural judgment. Each
> task names exact file(s), the components/hooks/functions to implement, and the
> reference pattern to copy. Execute with only the relevant skill/reference module +
> `FEATURE_PLAN.md` as context. Section refs (§N) point into FEATURE_PLAN.md.
>
> Reference modules to copy patterns from: `src/modules/supply-lists/`,
> `src/modules/delivery/`, `src/modules/roles/`.
>
> **Phase rule**: a phase starts only after the prior phase's streams complete.
> Streams in the same phase own non-overlapping files and run in parallel.

---

## WS-0 — Foundation (Phase 1, parallel)

### Stream 0A — Types & API paths
**Files**: `src/types/customer.ts`, `src/constants/apiPaths.ts`
- **T0A-1**: Replace `src/types/customer.ts` entirely with the type block in
  FEATURE_PLAN §4 (all DTOs + input types + `PaginationMeta`). Delete the legacy
  `Customer` interface. Then repo-search for importers of the old type
  (`types/customer`, `@/types/customer`) and reconcile or flag non-trivial collisions
  to the orchestrator. Output: `src/types/customer.ts`.
- **T0A-2**: Add the `Customers` path-builder group to `src/constants/apiPaths.ts`
  exactly as in FEATURE_PLAN §5 (List, Detail, Bill, Payments, CreditLimit, Calendar,
  Subscriptions, SubscriptionDetail). Match the existing JSDoc + builder style of the
  `Delivery`/`SupplyLists` groups. Output: edited `apiPaths.ts`.

### Stream 0B — Error mapping
**Files**: `src/utils/errorMapper.ts`
- **T0B-1**: Extend `mapApiError` per FEATURE_PLAN §8 — add `'customer'` to
  `ApiErrorContext`, add the `CustomerErrorAction` union, add the
  `if (context === 'customer') { ... }` status/action mapping block, and add
  `'customer.'` to the trailing `err.message.startsWith(...)` allow-list. Add a dedicated
  `customer.error_subscription_ended` mapping for `remove_subscription` 422. Do NOT
  change existing context behaviour. Output: edited `errorMapper.ts`.

### Stream 0C — i18n (en authored, 9 locales seeded)
**Files**: `src/locales/en.json` + `bn,gu,hi,kn,ml,mr,ta,te.json`
- **T0C-1**: Extend the `customer` namespace in `src/locales/en.json` with ALL keys
  listed in FEATURE_PLAN §7 (keep the existing 9 placeholder keys). Author real English
  values. Output: edited `en.json`.
- **T0C-2**: Add the SAME `customer` keys to the other 9 locale files
  (`bn,gu,hi,kn,ml,mr,ta,te.json`) using the English values as placeholders (per OQ-9).
  Keep each file's existing structure/order. Output: 9 edited locale files. *(Depends on
  T0C-1 for the key list — run after T0C-1.)*

---

## WS-1 — Service & Store (Phase 2, after WS-0)

### Stream 1A — Service + mock
**Files**: `src/modules/customers/service/customers.service.ts`,
`src/modules/customers/service/customers.mock.ts`
**Pattern**: copy `src/modules/delivery/service/delivery.service.ts`.
- **T1A-1**: Implement `customers.mock.ts` — deterministic fixtures: ≥30
  `CustomerListItemDto` spanning letters A–Z (for grouped list), a
  `CustomerDetailDto` builder, `SubscriptionDto[]`, a `MonthlyBillDto`, a
  `CustomerCalendarDto`, and `PaymentDto[]`. Use string ids, INR numbers. Output:
  `customers.mock.ts`.
- **T1A-2**: Implement `customers.service.ts` with all 12 methods from FEATURE_PLAN §5
  table. Each: `isMockMode` branch → `simulateNetworkDelay()` + mock; else
  `httpClient.<verb>(APIPath.Customers.X(...), ...)` unwrapping `data.data`. Handle the
  NON-STANDARD list shape (`data: { total, customers }`, no meta) and the STANDARD meta
  envelope for `listPayments`. Define `ListCustomersOptions` / `ListPaymentsOptions`.
  Output: `customers.service.ts`. *(Depends on T1A-1, T0A-1, T0A-2.)*

### Stream 1B — Store
**Files**: `src/modules/customers/store/customers.store.ts`
**Pattern**: copy `src/modules/delivery/store/delivery.store.ts` (state slices,
`getActiveVendorId`, `buildStorage`, `logError` + `mapApiError(_, 'customer', action)`,
`partialize`).
- **T1B-1**: Implement `customers.store.ts` with the state slices and all query +
  command actions in FEATURE_PLAN §6. CRITICAL: `partialize` persists NO PII — persist
  only `listListId` + `listStatus` (or nothing); list rows + detail are in-memory only.
  Commands are online-callable but the store does not queue. Implement optimistic
  rollback for `removeSubscription`; re-fetch detail after `recordPayment` /
  `setCreditLimit` / `createCustomer` / `updateCustomer`. Include `clearCustomers()` +
  `clearError()`. Flag the `auth.store.logout()` → `clearCustomers()` wiring to the
  orchestrator (do not edit auth.store). Output: `customers.store.ts`.
  *(Depends on Stream 1A service interface — coordinate method signatures from §5.)*

---

## WS-2 — Shared components & form (Phase 3, after WS-1)

### Stream 2A — Display components
**Files** (one component per task; all under `src/modules/customers/components/`):
**Pattern**: copy `src/modules/delivery/components/` + `roles/components/StaffCard.tsx`.
Use only primitives from `@components/primitives` / `@components/composite`.
- **T2A-1**: `PaymentStatusBadge.tsx` — props `{ status: PaymentStatus }`, renders a
  coloured pill (paid=success, pending=warning, overdue=error) via `AppBadge`. i18n
  `customer.status_*`. Output: file + `__tests__`.
- **T2A-2**: `PaymentScoreStars.tsx` — props `{ score: number }` (0–100) → star display
  + `score%` label. Output: file + `__tests__`.
- **T2A-3**: `CustomerListCard.tsx` — props `{ customer: CustomerListItemDto, onPress }`.
  Avatar initial, name, phone, joined supply-list names, monthly total + status badge
  ONLY when their values are non-null (staff null-safety). Memoized. Output: file +
  `__tests__`. *(Uses T2A-1.)*
- **T2A-4**: `CustomerProfileHeader.tsx` — props `{ customer: CustomerDetailDto }`.
  Avatar, name, phone, address, customer-since, language. Output: file + `__tests__`.
- **T2A-5**: `CreditPaymentCard.tsx` — owner-only card; props
  `{ customer: CustomerDetailDto, onSetCreditLimit }`. Renders ONLY when
  `currentBalance !== null`. Shows `PaymentScoreStars`, credit limit, balance,
  utilization% with colour band (green <70 / amber 70–90 / red >90), `[Set Credit Limit]`.
  Output: file + `__tests__`. *(Uses T2A-2.)*
- **T2A-6**: `SubscriptionRow.tsx` — props `{ sub: SubscriptionDto, onRemove, canManage }`.
  Shows list name, start time, `{qty} {unit} @ Rs.{rate}/{unit}`, frequency,
  custom-rate/qty badges. Owner-only `[Remove]`; `[Edit Qty/Rate]` hidden/disabled
  (OQ-4). Output: file + `__tests__`.
- **T2A-7**: `MonthlyBillCard.tsx` — owner-only; props
  `{ bill: MonthlyBillDto | null, summary: CurrentMonthBillSummary | null }`. Renders
  per-list lines + extra charges from `bill` when available, else the summary totals;
  this-month / previous-due / total-due + status badge. Output: file + `__tests__`.
  *(Uses T2A-1.)*
- **T2A-8**: `PaymentHistoryRow.tsx` — props `{ payment: PaymentDto }`. Amount, date,
  method, reference. Output: file + `__tests__`.
- **T2A-9**: `components/index.ts` barrel re-exporting all of the above (+ prop types).
  Output: `index.ts`. *(Run after T2A-1..8.)*

### Stream 2B — Form hook & config
**Files**: `src/modules/customers/hooks/useCustomerForm.ts`,
`src/modules/customers/screens/customerFormConfig.tsx`
**Pattern**: copy `src/modules/supply-lists/hooks/useSupplyListForm.ts` +
`screens/supplyListFormConfig.tsx`.
- **T2B-1**: `customerFormConfig.tsx` — shared field config for add/edit (name, phone,
  email, address, area, language, supplyListIds, startDate, creditLimit, sendInvite)
  with labels (i18n keys §7) and per-field validation rules from FEATURE_PLAN §3.2/§3.3.
  Output: file.
- **T2B-2**: `useCustomerForm.ts` — form state, change handlers, client-side validation
  (name required 1–100, phone exactly 10 digits, email valid, creditLimit 0–9999999.99),
  `toCreateInput()` / `toUpdateInput()` mappers to the §4 input types. Output: file +
  `__tests__`. *(Uses T2B-1.)*

---

## WS-3 — Owner screens & routes (Phase 4, after WS-2)

### Stream 3A — List & detail
**Files**: `src/modules/customers/screens/CustomerListScreen.tsx`,
`CustomerDetailScreen.tsx` (+ `__tests__`)
**Pattern**: copy `SupplyListsScreen.tsx` (5 states, header, search, filters,
FlatList, RoleGate, ScreenErrorBoundary) + `SupplyListDetailScreen.tsx`.
- **T3A-1**: `CustomerListScreen.tsx` per FEATURE_PLAN §3.1 — owner + staff. Header with
  owner-only `+Add` (RoleGate), `AppSearchBar` (300ms debounce → store `setSearch`),
  list-filter `AppSelect` + status `AppSegmentedControl`, total count, FlatList of
  `CustomerListCard` grouped alphabetically, pagination/load-more, pull-to-refresh,
  5 states, owner-only bottom `+Create` (disabled offline). Output: file + `__tests__`.
- **T3A-2**: `CustomerDetailScreen.tsx` per FEATURE_PLAN §3.4 — owner + staff variants.
  `CustomerProfileHeader`, owner-only `CreditPaymentCard` / `MonthlyBillCard` (render on
  non-null), `SubscriptionRow` list, owner `[+ Add to Another List]`, action grid
  (View Calendar / Record Payment / Add Extra Charge owner-gated; Share WhatsApp disabled
  per OQ-6), `[:]` overflow (Edit/Deactivate) + `AppConfirmDialog` for deactivate. Lazily
  fetch `bill/:month` for owner (OQ-5). 5 states. Output: file + `__tests__`.

### Stream 3B — Mutation screens
**Files**: `AddCustomerScreen.tsx`, `EditCustomerScreen.tsx`, `AddSubscriptionScreen.tsx`,
`RecordPaymentScreen.tsx`, `SetCreditLimitScreen.tsx`, `PaymentHistoryScreen.tsx`
(each + `__tests__`), all under `src/modules/customers/screens/`.
**Pattern**: copy `CreateSupplyListScreen.tsx` / `AddCustomersScreen.tsx` /
`delivery/screens/AddExtraChargeScreen.tsx`. ALL use `useRequireOwner()`, are
online-only (disable submit offline + banner), map errors via store/`mapApiError`.
- **T3B-1**: `AddCustomerScreen.tsx` per §3.2 (uses `useCustomerForm` + `customerFormConfig`,
  supply-list multi-select, NO "invite sent" toast, 409→phone field error, on success →
  detail). Output: file + `__tests__`.
- **T3B-2**: `EditCustomerScreen.tsx` per §3.3 (pre-fill from cached detail, PATCH partial,
  status toggle). Output: file + `__tests__`.
- **T3B-3**: `AddSubscriptionScreen.tsx` per §3.5 (list select excluding existing subs,
  optional date/customQty/customRate, 409→already-subscribed). Output: file + `__tests__`.
- **T3B-4**: `RecordPaymentScreen.tsx` per §3.6 (amount>0, date ≤ today+1, method radio,
  optional reference; on success refetch detail + back). Output: file + `__tests__`.
- **T3B-5**: `SetCreditLimitScreen.tsx` per §3.8 (single numeric field 0–9999999.99 →
  `setCreditLimit`, update cached detail). Output: file + `__tests__`.
- **T3B-6**: `PaymentHistoryScreen.tsx` per §3.7 (paginated `PaymentHistoryRow` list,
  meta envelope, pull-to-refresh + load-more, empty state). Output: file + `__tests__`.

### Stream 3C — Routes & home entry
**Files**: route files under `app/(app)/customers/` + `app/(app)/home.tsx`
**Pattern**: copy existing thin route re-exports under `app/(app)/supply-lists/`.
**Depends on**: Stream 3A + 3B screens existing.
- **T3C-1**: Create all route files in FEATURE_PLAN §9 (`_layout.tsx` Stack, `index.tsx`,
  `add.tsx`, `[customerId]/index.tsx`, `[customerId]/edit.tsx`,
  `[customerId]/add-subscription.tsx`, `[customerId]/record-payment.tsx`,
  `[customerId]/payments.tsx`, `[customerId]/credit-limit.tsx`) — each a thin re-export of
  its screen. Output: route files.
- **T3C-2**: Add a Customers launcher entry to `app/(app)/home.tsx`
  (`router.push('/(app)/customers' as Href)`, label `customer.title`), visible to owner
  AND staff. Output: edited `home.tsx`.

---

## WS-4 — Integration tests (Phase 5, after WS-3)

**Files**: `src/modules/customers/**/__tests__/` (gaps), any cross-screen flow tests.
- **T4-1**: Verify/fill test coverage per FEATURE_PLAN §11 — owner vs staff rendering
  (financial fields null-hidden), 5 states, offline disables writes, form validation,
  409 duplicate-phone field error, partialize persists no PII, optimistic
  remove-subscription rollback. Output: added/updated `__tests__` files.

---

## Dependency Summary

```
Phase 1: WS-0 (0A, 0B, 0C) ──────────────┐
Phase 2: WS-1 (1A → 1B) ←─────────────────┘   (1A service before 1B store)
Phase 3: WS-2 (2A components, 2B form) ← WS-1 types/store
Phase 4: WS-3 (3A, 3B screens → 3C routes) ← WS-2
Phase 5: WS-4 tests ← WS-3
```

> Open Questions (FEATURE_PLAN §Open Questions) that materially change scope —
> especially OQ-2 (credit-limit on add form), OQ-3 (deactivate placement), OQ-4
> (edit-subscription endpoint missing), OQ-6 (WhatsApp share) — should be resolved by
> the orchestrator/design before WS-3 starts. The recommended answers are safe defaults
> if no response is given.
</content>
