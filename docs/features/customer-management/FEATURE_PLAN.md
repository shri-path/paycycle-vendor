# Feature Plan — Customer Management (US-008) — Frontend (paycycle_vendor)

> Branch: `feat/us-008-customer-management` | Slug: `customer-management`
> Authoritative API contract: `paycycle_api/docs/features/customer-management/API_SPEC.md`
> This plan is the single source of truth for the Dev agents. Every task in
> `FEATURE_TASKS.md` references a section here. Do NOT invent shapes — all DTOs are
> frozen against the API_SPEC.

---

## 1. Scope & Roles

Customers are the central entity of the vendor app. This feature delivers:

- **Owner**: full CRUD — list, search/filter, create, view detail, edit profile,
  deactivate, manage subscriptions (add/remove list), set credit limit, record
  payments, view payment history, view monthly bill, view delivery calendar.
- **Staff**: read-only, scoped to customers in their assigned supply lists. All
  financial fields arrive as `null` from the server (`monthlyTotal`,
  `paymentStatus`, `currentBalance`, `paymentScore`, `creditUtilization`,
  `currentMonthBill`, `paymentHistory`, calendar `amount`). Staff may call only
  list, detail, and calendar endpoints; every write + every money endpoint returns
  `403` for staff.

**Security model** (mirrors existing modules): the UI gates are convenience only.
The server is the authority. `vendorId` is ALWAYS JWT-derived via
`auth.store.vendorContext.vendorId` — never from route params or user input. Owner
screens use `useRequireOwner()` (defence-in-depth redirect) + `RoleGate require="owner"`
for in-screen controls. Financial fields are rendered conditionally on their value
being non-null (the server already nulls them for staff), never on a client-side role
check alone.

---

## 2. Module Structure

Follows the established frontend convention (study `src/modules/supply-lists/` and
`src/modules/delivery/`). The backend `commands/`/`queries/` rule does NOT apply to
the RN client — frontend modules use `service/` + `store/` + `screens/` +
`components/` + `hooks/`.

```
src/modules/customers/
├── service/
│   ├── customers.service.ts            # all API calls (mock + real), envelope unwrap
│   ├── customers.mock.ts               # mock data + builders for dev (isMockMode)
│   └── __tests__/customers.service.test.ts
├── store/
│   ├── customers.store.ts              # Zustand store, partialize (no PII persisted)
│   └── __tests__/customers.store.test.ts
├── hooks/
│   └── useCustomerForm.ts              # create/edit form state + validation
├── components/
│   ├── index.ts                        # barrel
│   ├── CustomerListCard.tsx            # row in All Customers list
│   ├── CustomerProfileHeader.tsx       # avatar + name + phone + since + language
│   ├── CreditPaymentCard.tsx           # owner-only score/limit/balance/utilization
│   ├── SubscriptionRow.tsx             # one supply-list subscription w/ edit/remove
│   ├── MonthlyBillCard.tsx             # owner-only April-summary breakdown
│   ├── PaymentStatusBadge.tsx          # paid/pending/overdue pill
│   ├── PaymentScoreStars.tsx           # 0–100 → star rating display
│   ├── PaymentHistoryRow.tsx           # one payment row
│   └── __tests__/*.test.tsx
└── screens/
    ├── CustomerListScreen.tsx          # 2.8 All Customers (owner + staff)
    ├── AddCustomerScreen.tsx           # 2.9 Add New Customer (owner)
    ├── EditCustomerScreen.tsx          # edit profile (owner)
    ├── CustomerDetailScreen.tsx        # 2.10 Customer Detail (owner + staff variants)
    ├── AddSubscriptionScreen.tsx       # add customer to another list (owner)
    ├── RecordPaymentScreen.tsx         # record a payment (owner)
    ├── PaymentHistoryScreen.tsx        # full paginated payment list (owner)
    ├── SetCreditLimitScreen.tsx        # set credit limit (owner) — bottom sheet or screen
    ├── customerFormConfig.tsx          # shared field config for add/edit
    └── __tests__/*.test.tsx
```

Types live in `src/types/customer.ts` (REPLACE the existing legacy placeholder —
see §4). API paths added to `src/constants/apiPaths.ts` under a new `Customers` group.

---

## 3. Screens

All screens follow the **5-state pattern** (Loading skeleton / Empty / Error inline
retry / Content / Offline banner) and wrap content in `ScreenErrorBoundary`, exactly
like `SupplyListsScreen`. All copy via `useTranslation()` + i18n keys (§7). All
navigation via `expo-router` typed routes (cast to `Href` until route files generate).

### 3.1 CustomerListScreen (wireframe 2.8) — owner + staff
- `AppHeader` title `customer.title`; owner-only `+ Add` header icon via `RoleGate require="owner"`.
- `AppSearchBar` — server-side search (debounced 300ms → store `setSearch` → refetch).
  Backend `search` matches name OR phone (contains, case-insensitive).
- Two filters in a row: **List filter** (`AppSelect` — supply lists; maps to `listId`)
  and **Status filter** (`AppSegmentedControl` or `AppSelect` — `all|paid|pending|overdue`).
- `Total: N customers` count line.
- `FlatList` of `CustomerListCard`, grouped alphabetically by first letter (section
  headers A/B/C... — client-side grouping over the current page, matching wireframe).
- Pagination: page size 20 (max 50). Infinite scroll OR "load more" footer — append to store list.
- Pull-to-refresh resets to page 1.
- Card shows: avatar initial, name, phone, supply-list names (joined), monthly total
  (owner-only — hide when null), payment-status badge (owner-only — hide when null).
- Owner-only bottom `+ Create` button (matches supply-lists pattern) — disabled offline.
- Tapping a card → `CustomerDetailScreen`.
- **NOTE**: list endpoint returns NON-STANDARD shape `data: { total, customers: [] }`,
  NOT the `meta` envelope. Service handles this specifically (§5).

### 3.2 AddCustomerScreen (wireframe 2.9) — owner only
- `useRequireOwner()`. Online-only (disable submit offline + show banner).
- Form (via `useCustomerForm` + `customerFormConfig`):
  - **Name** * (1–100 chars) — `AppInput`.
  - **Phone** * (`AppPhoneInput`, default country code `+91`, exactly 10 digits).
  - **Email** (optional, valid email) — `AppInput`.
  - **Address** (optional) — `AppInput`/`AppTextArea`.
  - **Area** (optional) — `AppInput`.
  - **Language** (optional) — `AppSelect` (9 supported languages; default device locale).
  - **Add to Supply Lists** — multi-select checklist of vendor's supply lists with
    name/time/default rate (reuse pattern from `SupplyListMultiSelect`/wireframe). Maps
    to `supplyListIds` (array of numeric-string ids).
  - **Start Date** — `AppDatePicker` (maps to `startDate` YYYY-MM-DD).
  - **Credit Limit** (optional, ≥0, ≤9999999.99) — `AppInput` numeric. (Not in
    wireframe but in API contract — include, default 0; see OQ-2.)
  - **Send invite via WhatsApp** — `AppCheckbox` (maps to `sendInvite`). **No invite is
    actually sent this iteration** — on success, DO NOT show an "invite sent"
    confirmation (API_SPEC explicit).
- Submit → `customersStore.createCustomer(input)` → on success navigate to the new
  customer's detail screen (response is `CustomerDetailDto`).
- Errors: `409 CONFLICT` → duplicate phone within vendor → field-level error on phone
  (`customer.error_duplicate_phone`). `400` → validation.

### 3.3 EditCustomerScreen — owner only
- `useRequireOwner()`. Online-only. Pre-fills from store's cached detail.
- Editable: name, phone, email, address, area, language, status (`ACTIVE|INACTIVE`).
- PATCH (partial) → `customersStore.updateCustomer(id, input)`. Phone uniqueness
  re-checked server-side → `409` mapped same as create.
- A "Deactivate customer" action (calls DELETE) lives here OR in the detail screen
  `[:]` overflow menu (see OQ-3). On deactivate: confirm via `AppConfirmDialog`, then
  `deactivateCustomer(id)`; `422` (already inactive) → `customer.error_already_inactive`.

### 3.4 CustomerDetailScreen (wireframe 2.10) — owner + staff
- Owner + staff both reach this; staff only if customer is in an assigned list (server
  enforces; `403` → `customer.error_not_in_assigned_list`).
- `AppHeader` with back, owner-only `[:]` overflow (`AppMenuItem`: Edit, Deactivate)
  and `Edit` action — both gated `RoleGate require="owner"`.
- **Profile** — `CustomerProfileHeader` (avatar, name, phone, address, customer-since, language).
- **Credit & Payment** — `CreditPaymentCard`, **owner-only**: render ONLY when
  `currentBalance !== null` (server nulls it for staff). Shows `PaymentScoreStars`
  (`paymentScore`), credit limit, current balance, utilization% with colour band
  (green <70, amber 70–90, red >90), `[Set Credit Limit]` → `SetCreditLimitScreen`.
- **Supply Lists (N)** — list of `SubscriptionRow` from `subscriptions[]`. Each row:
  list name, start time, `{quantity} {unit} @ Rs.{ratePerUnit}/{unit}`, frequency,
  badges for `isCustomRate`/`isCustomQuantity`. Owner-only `[Remove]` →
  `removeSubscription`. `[Edit Qty/Rate]` is OUT OF SCOPE this iteration (no PATCH
  subscription endpoint in API_SPEC — see OQ-4); render disabled/hidden.
- Owner-only `[+ Add to Another List]` → `AddSubscriptionScreen`.
- **{Month} Summary** — `MonthlyBillCard`, **owner-only**: render when
  `currentMonthBill !== null`. Shows per-list lines come from the detail's
  `currentMonthBill` summary (`subtotal`, `previousDue`, `totalDue`, `status`). For
  the detailed per-list/extra-charges breakdown the screen lazily fetches
  `GET .../bill/:month` (owner-only) — see OQ-5.
- **Action grid** (wireframe): `View Calendar` (→ existing delivery calendar, pass
  `customerId`), `Record Payment` (owner → `RecordPaymentScreen`), `Share on WhatsApp`
  (owner — deferred, see OQ-6), `Add Extra Charge` (owner → existing delivery
  `add-extra-charge` flow). Owner-only actions gated by `RoleGate require="owner"`.
- Staff variant: profile + supply lists + calendar action only; all financial cards
  and owner actions hidden (because their data is null and gates fail).

### 3.5 AddSubscriptionScreen — owner only
- `useRequireOwner()`. Online-only. Form:
  - **Supply List** — `AppSelect` of lists the customer is NOT already subscribed to
    (filter client-side against `subscriptions[]`). Maps to `supplyListId`.
  - **Start Date** (optional) — `AppDatePicker`.
  - **Custom Quantity** (optional, nullable) — `AppInput`. Override list default.
  - **Custom Rate per Unit** (optional, nullable) — `AppInput`. Override list default.
- POST → `addSubscription`. `409 CONFLICT` (already subscribed) →
  `customer.error_already_subscribed`. `404` → list/customer not found.
- On success append the returned `SubscriptionDto` to the cached detail's `subscriptions`.

### 3.6 RecordPaymentScreen — owner only
- `useRequireOwner()`. Online-only. Form:
  - **Amount** * (>0) — `AppInput` numeric.
  - **Payment Date** * — `AppDatePicker`; not in the future by more than 1 day.
  - **Payment Method** * — `AppRadioGroup`/`AppSelect`: `CASH|ONLINE|UPI|OTHER`.
  - **Reference Number** (optional, ≤100 chars) — `AppInput`.
- POST → `recordPayment`. Returns `PaymentDto` (201). On success: invalidate/refetch
  the customer detail (balance + currentMonthBill changed) and navigate back.
- `400` → validation (amount ≤0 / bad date/method) → field errors.

### 3.7 PaymentHistoryScreen — owner only
- `useRequireOwner()`. Paginated list (`page`/`limit`, standard `meta` envelope) of
  `PaymentHistoryRow`. Reverse chronological. Pull-to-refresh + load-more.
- Reached from detail (e.g. "View all payments" under the credit card) — see OQ-7.

### 3.8 SetCreditLimitScreen — owner only
- `useRequireOwner()`. Online-only. Single `AppInput` (≥0, ≤9999999.99) +
  `AppButton`. PATCH → `setCreditLimit`. Response gives back `creditLimit` +
  `creditUtilization`; update cached detail. Can be a screen OR `AppBottomSheet` — use
  a screen for consistency with the file-based router (see OQ-8).

---

## 4. Types (`src/types/customer.ts`)

REPLACE the existing legacy `Customer` placeholder (its shape does not match the API).
All shapes FROZEN against API_SPEC §Shared Response Schemas. **All ids are strings.
Money fields are `number`. `status` UPPERCASE (`ACTIVE|INACTIVE`). `paymentStatus`
lowercase (`paid|pending|overdue`). `paymentMethod` UPPERCASE.**

```ts
export type CustomerStatus = 'ACTIVE' | 'INACTIVE'
export type PaymentStatus = 'paid' | 'pending' | 'overdue'
export type PaymentMethod = 'CASH' | 'ONLINE' | 'UPI' | 'OTHER'
export type CustomerStatusFilter = 'all' | 'paid' | 'pending' | 'overdue'

// Row in GET /customers list. Financial fields are owner-only → number | null.
export interface CustomerListItemDto {
  id: string
  name: string
  phoneNumber: string
  address: string | null
  area: string | null
  customerSince: string                 // YYYY-MM-DD
  status: CustomerStatus
  supplyLists: string[]                  // list names
  monthlyTotal: number | null           // owner-only
  paymentStatus: PaymentStatus | null   // owner-only
  currentBalance: number | null         // owner-only
  paymentScore: number | null           // owner-only
}

export interface SubscriptionDto {
  subscriptionId: string
  listId: string
  listName: string
  startTime: string                     // "18:00"
  quantity: number
  unit: string
  ratePerUnit: number
  frequency: string                     // "DAILY"
  startDate: string
  endDate: string | null
  isActive: boolean
  isCustomRate: boolean
  isCustomQuantity: boolean
}

export interface CurrentMonthBillSummary {
  month: string                         // YYYY-MM
  subtotal: number
  previousDue: number
  totalDue: number
  status: PaymentStatus
}

export interface PaymentDto {
  id: string
  amount: number
  date: string                          // YYYY-MM-DD
  method: PaymentMethod
  reference: string | null
  createdAt: string                     // ISO datetime
}

// Returned by create (201), get-detail (200), update (200).
// Owner-only fields are null for staff: currentBalance, creditUtilization,
// currentMonthBill, paymentHistory.
export interface CustomerDetailDto {
  id: string
  name: string
  phoneNumber: string
  email: string | null
  address: string | null
  area: string | null
  language: string | null
  customerSince: string
  status: CustomerStatus
  creditLimit: number
  currentBalance: number | null         // owner-only
  paymentScore: number | null           // owner-only (present for owner)
  creditUtilization: number | null      // owner-only
  subscriptions: SubscriptionDto[]
  currentMonthBill: CurrentMonthBillSummary | null  // owner-only
  paymentHistory: PaymentDto[]          // owner-only (empty for staff)
  createdAt: string
  updatedAt: string
}

// GET .../bill/:month
export interface BillListLine {
  listName: string
  deliveries: number
  leaves: number
  quantity: number
  unit: string
  ratePerUnit: number
  subtotal: number
}
export interface BillExtraCharge {
  date: string
  amount: number
  reason: string
  listName: string
}
export interface MonthlyBillDto {
  customerId: string
  customerName: string
  month: string
  billDetails: {
    byList: BillListLine[]
    extraCharges: BillExtraCharge[]
    subtotal: number
    previousDue: number
    totalDue: number
  }
  paymentStatus: PaymentStatus
}

// GET .../calendar/:month  (reuse delivery calendar component if shape-compatible)
export interface CalendarDelivery {
  listName: string
  quantity: number
  unit: string
  status: string                        // UPPERCASE e.g. DELIVERED, LEAVE
  amount: number | null                 // owner-only
}
export interface CustomerCalendarDto {
  month: string
  days: Record<string, { deliveries: CalendarDelivery[] }>  // keyed YYYY-MM-DD
}

export interface SetCreditLimitResult {
  creditLimit: number
  creditUtilization: number
}

// ----- Input types (vendorId never sent — JWT-derived on server) -----
export interface CreateCustomerInput {
  name: string
  phone: string
  phoneCountryCode?: string             // default "+91"
  email?: string
  address?: string
  area?: string
  language?: string
  supplyListIds?: string[]              // default []
  startDate?: string                    // YYYY-MM-DD
  creditLimit?: number                  // default 0
  sendInvite?: boolean                  // default false
}
export interface UpdateCustomerInput {
  name?: string
  phone?: string
  email?: string
  address?: string
  area?: string
  language?: string
  status?: CustomerStatus
}
export interface AddSubscriptionInput {
  supplyListId: string
  startDate?: string
  customQuantity?: number | null
  customRatePerUnit?: number | null
}
export interface RecordPaymentInput {
  amount: number
  paymentDate: string                   // YYYY-MM-DD
  paymentMethod: PaymentMethod
  referenceNumber?: string
}

export interface PaginationMeta {       // standard meta envelope (payments list)
  page: number
  limit: number
  total: number
  totalPages: number
}
```

> Anything in the codebase that imports the old `Customer` type must be migrated.
> Dev agent: run a repo search for `from '@/types/customer'` / `types/customer` and
> reconcile — flag any non-trivial collisions to the orchestrator (see FEATURE_TASKS WS-0).

---

## 5. Service Layer (`customers.service.ts`)

Pattern: identical to `delivery.service.ts` / `supplyLists.service.ts`. Each method:
`if (isMockMode) { await simulateNetworkDelay(); return mock(...) }` else
`httpClient.<verb>(APIPath.Customers.X(...), body/params, { signal })` and unwrap
`data.data`. All ids strings. vendorId is a function arg (passed by the store from
JWT context), present only in the URL.

| Method | HTTP | Returns | Envelope note |
|--------|------|---------|---------------|
| `listCustomers(vendorId, opts, signal)` | GET `/customers` | `{ total, customers: CustomerListItemDto[] }` | **non-standard** — `data: { total, customers }`, NO `meta`. Return `data.data` directly. |
| `getCustomer(vendorId, customerId, signal)` | GET `/customers/:id` | `CustomerDetailDto` | standard `data` |
| `createCustomer(vendorId, input, signal)` | POST `/customers` | `CustomerDetailDto` | 201 |
| `updateCustomer(vendorId, id, input, signal)` | PATCH `/customers/:id` | `CustomerDetailDto` | |
| `deactivateCustomer(vendorId, id, signal)` | DELETE `/customers/:id` | `void` | `{ success: true }` |
| `getBill(vendorId, id, month, signal)` | GET `/customers/:id/bill/:month` | `MonthlyBillDto` | owner-only |
| `recordPayment(vendorId, id, input, signal)` | POST `/customers/:id/payments` | `PaymentDto` | 201 |
| `listPayments(vendorId, id, opts, signal)` | GET `/customers/:id/payments` | `{ data: PaymentDto[], meta }` | **standard meta envelope** |
| `setCreditLimit(vendorId, id, creditLimit, signal)` | PATCH `/customers/:id/credit-limit` | `SetCreditLimitResult` | |
| `getCalendar(vendorId, id, month, signal)` | GET `/customers/:id/calendar/:month` | `CustomerCalendarDto` | |
| `addSubscription(vendorId, id, input, signal)` | POST `/customers/:id/subscriptions` | `SubscriptionDto` | 201 |
| `removeSubscription(vendorId, id, subId, signal)` | DELETE `/customers/:id/subscriptions/:subId` | `void` | |

`listCustomers` opts: `{ search?, listId?, status?, page?, limit? }`.
`listPayments` opts: `{ page?, limit? }`.

`customers.mock.ts` provides deterministic fixtures (≥30 customers across A–Z for the
grouped list, subscriptions, a bill, payment history) so the screens render in mock mode.

### API paths (`src/constants/apiPaths.ts`)

Add a `Customers` group (path builders, no `/v1` in the string — base URL ends
`/api/v1`; vendorId in path only for routing):
```ts
Customers: {
  List: (vendorId) => `/vendors/${vendorId}/customers`,
  Detail: (vendorId, customerId) => `/vendors/${vendorId}/customers/${customerId}`,
  Bill: (vendorId, customerId, month) => `/vendors/${vendorId}/customers/${customerId}/bill/${month}`,
  Payments: (vendorId, customerId) => `/vendors/${vendorId}/customers/${customerId}/payments`,
  CreditLimit: (vendorId, customerId) => `/vendors/${vendorId}/customers/${customerId}/credit-limit`,
  Calendar: (vendorId, customerId, month) => `/vendors/${vendorId}/customers/${customerId}/calendar/${month}`,
  Subscriptions: (vendorId, customerId) => `/vendors/${vendorId}/customers/${customerId}/subscriptions`,
  SubscriptionDetail: (vendorId, customerId, subscriptionId) =>
    `/vendors/${vendorId}/customers/${customerId}/subscriptions/${subscriptionId}`,
}
```

---

## 6. Store Layer (`customers.store.ts`)

Zustand + `persist` (SSR-safe `buildStorage()` pattern). vendorId always from
`useAuthStore.getState().vendorContext?.vendorId` via a `getActiveVendorId()` helper.
Errors hold i18n KEYS (never raw); every failure → `logError(err, { screen, action,
endpoint })` (correlationId, no PII) + `mapApiError(err, 'customer', action)`.

### State slices
- `list: CustomerListItemDto[]`, `listTotal`, `listPage`, `listSearch`, `listListId`,
  `listStatus`, `isListLoading`, `listError`.
- `detail: Record<string, CustomerDetailDto>` keyed by customerId, `isDetailLoading`, `detailError`.
- `bill: Record<string, MonthlyBillDto>` keyed by `${customerId}:${month}`, loading/error.
- `payments: Record<string, PaymentDto[]>` keyed by customerId + `paymentsMeta`, loading/error.
- `calendar: Record<string, CustomerCalendarDto>` keyed by `${customerId}:${month}`, loading/error.
- shared mutation flags: `isMutating`, `mutationError`.

### Actions (CQS-style — queries vs commands)
Queries: `fetchCustomers(opts)`, `fetchCustomer(id)`, `fetchBill(id, month)`,
`fetchPayments(id, opts)`, `fetchCalendar(id, month)`, plus setters
`setSearch`, `setListFilter`, `setStatusFilter` (trigger refetch via screen effect).
Commands (online-only; screens block offline): `createCustomer(input) → CustomerDetailDto`,
`updateCustomer(id, input)`, `deactivateCustomer(id)`, `addSubscription(id, input)`,
`removeSubscription(id, subId)`, `recordPayment(id, input) → PaymentDto`,
`setCreditLimit(id, value)`.
Lifecycle: `clearError()`, `clearCustomers()` (called by `auth.store.logout()` — wiring
flagged to orchestrator, same as delivery/supply stores).

Optimistic updates: `removeSubscription` MAY drop the row optimistically + roll back
(like `cancelLeave`); `recordPayment`/`setCreditLimit`/`createCustomer`/`updateCustomer`
re-fetch the affected detail after success (balance/bill change server-side).

### Persistence — `partialize` (CRITICAL: NO PII PERSISTED)
Customer list rows and detail carry **PII (name, phone, address)** → these are
**IN-MEMORY ONLY, never persisted**. Persist NOTHING that contains PII. The only
candidate persisted slice is the non-PII list **filter state** (`listSearch`,
`listListId`, `listStatus`) for UX continuity — but `listSearch` may itself be a name,
so persist only `listListId` + `listStatus`. Mirror the comment style in
`delivery.store.ts`/`supplyLists.store.ts`. When in doubt, persist nothing (the
delivery store persists only aggregate counts; customers have no non-PII aggregates).

---

## 7. i18n Keys (add to ALL 10 locale files: en, hi, bn, gu, kn, ml, mr, ta, te + index)

> The existing `customer` namespace has 9 placeholder keys — EXTEND it (keep
> compatible existing keys, add the below). en.json is authored fully; the other 9
> locales get the SAME keys (English values as placeholders is acceptable for
> non-en until translation — match how prior US handled new keys; flag to orchestrator).

Under `customer.*`:
```
title, add_customer, edit_customer, customer_detail, deactivate_customer,
search_placeholder, filter_all_lists, filter_status, total_count,
status_all, status_paid, status_pending, status_overdue,
section_credit_payment, payment_score, credit_limit, current_balance,
utilization, set_credit_limit, section_supply_lists, add_to_another_list,
edit_qty_rate, remove_subscription, section_month_summary, this_month,
previous_due, total_due, view_calendar, record_payment, share_whatsapp,
add_extra_charge, customer_since, language, area, email,
form_name, form_name_required, form_phone, form_phone_required,
form_email, form_address, form_area, form_language, form_supply_lists,
form_start_date, form_credit_limit, form_send_invite,
field_amount, field_payment_date, field_payment_method, field_reference,
method_cash, method_online, method_upi, method_other,
add_subscription, custom_quantity, custom_rate, payment_history,
no_payments, no_customers, no_customers_cta, confirm_deactivate_title,
confirm_deactivate_message, deactivate_success,
// errors (mapped via mapApiError 'customer' context):
error_load_failed, error_not_found, error_duplicate_phone,
error_already_inactive, error_already_subscribed, error_not_in_assigned_list,
error_invalid_payment, error_invalid_credit_limit, error_create_failed,
error_update_failed
```
Reuse existing shared keys where possible: `common.*` (offline, retry, error,
needs_connection), `validation.*`, `roles.error_forbidden`.

---

## 8. Error Handling — extend `mapApiError`

Add a `'customer'` value to `ApiErrorContext` and a `CustomerErrorAction` sub-action
union, mirroring the `'delivery'`/`'supply'` precedent:

```ts
export type CustomerErrorAction =
  | 'create' | 'update' | 'deactivate' | 'add_subscription'
  | 'remove_subscription' | 'record_payment' | 'set_credit_limit'
```
Mapping inside `if (context === 'customer')`:
| status | action | key |
|--------|--------|-----|
| 403 | any | `roles.error_forbidden` |
| 404 | any | `customer.error_not_found` |
| 409 | `create`/`update` | `customer.error_duplicate_phone` |
| 409 | `add_subscription` | `customer.error_already_subscribed` |
| 422 | `deactivate` | `customer.error_already_inactive` |
| 422 | `remove_subscription` | `customer.error_already_inactive` (subscription ended) → use a dedicated key `customer.error_subscription_ended` |
| 400/422 | `record_payment` | `customer.error_invalid_payment` |
| 400 | `set_credit_limit` | `customer.error_invalid_credit_limit` |
| 400 | default | `validation.required` |
| (no response) | — | `common.offline_message` (handled at top, already) |

Also extend the trailing `err.message.startsWith(...)` allow-list to include
`'customer.'` so mock-thrown i18n keys pass through.

`correlationId` from the error envelope is logged by `logError` automatically — the
store passes the raw error; do not strip it.

---

## 9. Navigation & Routes (Expo Router, file-based)

The app uses a **Stack** (not Tabs); entry is via the home launcher. Add a Customers
entry on `app/(app)/home.tsx` (`router.push('/(app)/customers' as Href)`), gated so
staff also see it (staff get the read-only list).

Route files under `app/(app)/customers/`:
```
app/(app)/customers/_layout.tsx                       # Stack
app/(app)/customers/index.tsx        → CustomerListScreen
app/(app)/customers/add.tsx          → AddCustomerScreen        (owner)
app/(app)/customers/[customerId]/index.tsx   → CustomerDetailScreen
app/(app)/customers/[customerId]/edit.tsx    → EditCustomerScreen   (owner)
app/(app)/customers/[customerId]/add-subscription.tsx → AddSubscriptionScreen (owner)
app/(app)/customers/[customerId]/record-payment.tsx   → RecordPaymentScreen   (owner)
app/(app)/customers/[customerId]/payments.tsx → PaymentHistoryScreen (owner)
app/(app)/customers/[customerId]/credit-limit.tsx → SetCreditLimitScreen (owner)
```
Each route file is a thin re-export of the screen (matches existing route files which
import from `src/modules/.../screens`). `View Calendar` reuses the existing delivery
calendar route, passing `customerId` as a param.

---

## 10. Performance / Accessibility / Offline

- `FlatList` with `initialNumToRender`/`maxToRenderPerBatch`/`windowSize`, memoized
  cards, `removeClippedSubviews` on Android — copy `SupplyListsScreen` budget.
- Animations capped to first ~10 rows, disabled under `useReducedMotion()`.
- All interactive controls have `accessibilityLabel`/`accessibilityHint`; offline-disabled
  buttons set `accessibilityHint = common.needs_connection`.
- Offline: reads render from in-memory cache if present + offline banner; **all writes
  are online-only** — `useNetworkStatus()` disables submit and the store does NOT queue.
- 2G launch: list first-page fetch shows skeleton; subsequent navigations use cached detail.

---

## 11. Testing

Per existing module convention — every service/store/component/screen has a sibling
`__tests__`. Key cases:
- **Service**: envelope unwrap incl. the non-standard list shape; mock vs real path;
  all ids string; signal passthrough.
- **Store**: vendorId pulled from auth; error → i18n key + `logError` called;
  partialize persists NO PII; optimistic remove rollback; create returns detail.
- **Components**: financial fields hidden when null (staff); status badge colours;
  score→stars; utilization colour bands.
- **Screens**: 5 states; owner vs staff rendering (RoleGate); offline disables writes;
  form validation (required name/phone, phone 10 digits, amount>0, credit limit range);
  duplicate-phone 409 → field error; navigation on success.

---

## Open Questions

Q1: The list endpoint returns a non-standard envelope (`data: { total, customers }`,
no `meta`) while payments uses the standard `meta` envelope. | Recommended: handle the
two shapes explicitly in the service (documented in §5); do not try to normalise them.
| Trade-off: two code paths in one service file, but it exactly matches the shipped
backend — normalising risks drift from the contract.

Q2: The Add Customer wireframe (2.9) has no Credit Limit field, but the create API
accepts `creditLimit`. | Recommended: include an optional Credit Limit field on the Add
form (default 0), since the owner can otherwise only set it post-create via a separate
screen. | Trade-off: minor deviation from the wireframe; alternative is to omit it and
force a second step, which is worse UX. Confirm with design.

Q3: Where should "Deactivate customer" live — Edit screen or the detail `[:]` overflow
menu? | Recommended: the detail-screen `[:]` overflow (`AppMenuItem` Edit + Deactivate),
matching the wireframe's `[:]` affordance, with `AppConfirmDialog`. | Trade-off:
overflow is less discoverable than an inline button but matches the wireframe and keeps
Edit focused on profile fields.

Q4: The detail wireframe shows `[Edit Qty/Rate]` per subscription, but the API_SPEC has
no PATCH-subscription endpoint (only add/remove). | Recommended: ship add + remove this
iteration; render `[Edit Qty/Rate]` hidden/disabled and track a follow-up for a backend
PATCH-subscription endpoint. | Trade-off: a wireframe control is missing; the
alternative (remove + re-add to "edit") loses history and is risky. Needs a backend
contract addition — flag to the API architect.

Q5: Customer detail returns a `currentMonthBill` SUMMARY (subtotal/previousDue/totalDue/
status) but the per-list lines + extra charges in the wireframe only come from
`GET .../bill/:month`. | Recommended: render the summary from the detail payload
immediately, and lazily fetch the full `bill/:month` for the itemised breakdown when the
detail screen opens (owner-only). | Trade-off: one extra request on detail open for
owners; alternative is showing only totals (loses the per-list breakdown the wireframe
shows).

Q6: "Share on WhatsApp" action in the detail action grid. | Recommended: defer to a
later iteration — render the button disabled with a "coming soon" affordance OR omit it,
since there is no bill-share/WhatsApp contract in this US. | Trade-off: a wireframe
action is non-functional; building it now requires a share-template/deep-link decision
out of scope for US-008.

Q7: Entry point to the full Payment History screen — the detail wireframe shows recent
payments implicitly but no explicit "view all" link. | Recommended: add a "View all
payments" link under the Credit & Payment card (owner-only) → PaymentHistoryScreen. |
Trade-off: minor addition not in the wireframe; without it the paginated history
endpoint is unreachable from the UI.

Q8: Set Credit Limit and Record Payment — full screen or bottom sheet? | Recommended:
full screens (own route files) for consistency with the file-based router and the rest
of the module. | Trade-off: a sheet is faster for a single field (credit limit) but
mixes navigation paradigms; screens are more testable and consistent.

Q9: Non-English locales for the ~90 new keys. | Recommended: author en.json fully; seed
the other 9 locales with the same keys using English values as placeholders (matching
how earlier user stories landed new keys), and flag the translation backlog to the
orchestrator. | Trade-off: untranslated strings ship to non-en users temporarily; the
alternative (blocking on translation) stalls the feature.

Q10: The legacy `src/types/customer.ts` `Customer` placeholder is referenced by an
existing `customer` i18n namespace and possibly other code. | Recommended: replace the
type wholesale (it does not match the API) and migrate any importers; if a non-trivial
consumer exists (e.g. a ledger screen using the old shape), flag it rather than silently
breaking it. | Trade-off: a small migration risk; keeping the dead placeholder type
alongside the real DTOs would be confusing.
</content>
</invoke>
