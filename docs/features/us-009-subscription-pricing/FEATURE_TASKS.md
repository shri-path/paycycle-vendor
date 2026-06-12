# US-009 — Subscription & Pricing Management (Frontend) · FEATURE_TASKS

> Repo: `paycycle_vendor` · Branch: `feat/us-009-subscription-pricing`
> Read `FEATURE_PLAN.md` (same folder) + the backend `API_SPEC.md` before starting.
> Conventions: mirror `src/modules/customers/` and `src/modules/audit/` verbatim.
> All ids are strings · money is plain `number` INR · `max* = 0` ⇒ "Unlimited" · commands online-only.

Workstreams are ordered by phase. Streams in the same phase own **non-overlapping files** and can run
in parallel. If running solo, execute phases top-to-bottom; file ownership is still partitioned so the
diff stays reviewable.

---

## Phase 1 (parallel — no cross-stream deps)

### WS-0 · Foundation
**Files owned (exclusive):**
- `src/types/subscription.ts` (new)
- `src/modules/subscription/utils/usage.ts` (new)
- `src/constants/apiPaths.ts` (add `Subscription` group only)
- `src/utils/errorMapper.ts` (add `'subscription'` ctx + `SubscriptionErrorAction` + 451 fallback + mock-key prefix)
- `src/locales/{en,hi,ta,te,mr,bn,kn,ml,gu}.json` (add `subscription` block only)

- **Task 0.1 — DTOs.** Create `src/types/subscription.ts` frozen against API_SPEC §"Shared Response
  Schemas" + §Enums. Define: `PlanCode`, `BillingCycle`, `SubscriptionStatus`,
  `InvoicePaymentStatus`, `SubscriptionEventType` unions; `PlanFeatures` (`Record<string, boolean>`);
  `PlanDto`; `SubscriptionLimits`; `CurrentPlanDto` (incl. `endDate: string|null`, `autoRenewal`,
  `isTrial`); `UsageCounts`; `UtilizationPercentage`; `CanAddMore`; `SubscriptionViewDto`
  (`currentPlan/usage/utilizationPercentage/canAddMore`); `UpgradeResultDto` &
  `RenewResultDto` (`{ subscription, invoice }`); `CancelResultDto`
  (`{ subscriptionId, status, autoRenewal, activeUntil }`); `AutoRenewalResultDto`; `InvoiceDto`
  (nullable `paymentDate/paymentMethod/paymentReference`); `HistoryEventDto`; `PaginationMeta`
  (reuse the shape from `types/customer.ts`); request inputs `UpgradeInput`, `RenewInput`,
  `ListInvoicesOptions`. Header comment matching `types/audit.ts` (ids strings, `0=unlimited`,
  vendorId JWT-derived, money INR number).
  **Output:** `src/types/subscription.ts`.

- **Task 0.2 — usage utils.** Create `src/modules/subscription/utils/usage.ts`:
  `isUnlimited(max: number): boolean` (`max === 0`); `usageColor(pct: number)` →
  `colors.success`/`warning`/`error` (green `<80`, orange `80–94`, red `>=95`); `formatMoney(n)` →
  `₹{n}` (only if no existing currency helper — check `src/utils/` first and reuse if present);
  `daysUntil(dateISO: string): number` for the banner. Pure functions, fully unit-testable.
  **Output:** `src/modules/subscription/utils/usage.ts`.

- **Task 0.3 — apiPaths.** Add the `Subscription` group to `src/constants/apiPaths.ts` exactly as in
  FEATURE_PLAN §7 (`Plans` not vendor-scoped; the rest `/vendors/${vendorId}/subscription/...`).
  No `/v1` in strings. Add a group header comment matching the Audit group.
  **Output:** edit to `src/constants/apiPaths.ts`.

- **Task 0.4 — errorMapper.** Edit `src/utils/errorMapper.ts` per FEATURE_PLAN §8: add
  `'subscription'` to `ApiErrorContext`, add `SubscriptionErrorAction` union, add the `subscription`
  context block, add `subscription.` to the mock-thrown-key prefix guard. Do not change existing
  branches.
  **Output:** edit to `src/utils/errorMapper.ts`.

- **Task 0.5 — i18n.** Add the `subscription` namespace (all keys in FEATURE_PLAN §10) to all 9
  locale files. Translate per-locale (do not copy English into non-English files — follow how the
  `audit`/`customer` namespaces were translated). Keep interpolation tokens (`{{max}}`, `{{current}}`,
  `{{days}}`, `{{percent}}`, `{{resource}}`, `{{n}}`, `{{date}}`) identical across locales.
  **Output:** edits to `src/locales/{en,hi,ta,te,mr,bn,kn,ml,gu}.json`.

---

## Phase 2 (parallel — after Phase 1)

### WS-1 · Service + Store
**Files owned (exclusive):**
- `src/modules/subscription/service/subscription.mock.ts` (new)
- `src/modules/subscription/service/subscription.service.ts` (new)
- `src/modules/subscription/store/subscription.store.ts` (new)
- `src/modules/subscription/service/__tests__/subscription.service.test.ts` (new)
- `src/modules/subscription/store/__tests__/subscription.store.test.ts` (new)
**Depends on:** WS-0 (types, apiPaths, errorMapper).

- **Task 1.1 — mock fixtures.** `subscription.mock.ts`: deterministic `mockPlans` (Starter/Growth/Pro
  exactly per API_SPEC §1), `mockSubscriptionView` (Growth ACTIVE, usage 127/3/5, util 85/100/50,
  canAddMore true/false/true — matches API_SPEC §2 + wireframe), plus exported variant builders for
  Pro-unlimited and EXPIRED, `mockInvoices` (2 rows: one PAID, one PENDING), and
  `buildUpgradeResult`/`buildRenewResult`/`buildCancelResult` returning the API_SPEC shapes
  (`paymentUrl` stub string, `paymentStatus: 'PENDING'`).
  **Output:** `subscription.mock.ts`.

- **Task 1.2 — service.** `subscription.service.ts` mirroring `audit.service.ts`: the 8 methods in
  FEATURE_PLAN §6. Unwrap object-shaped `data.data(.plans)` for plans/view/commands; return
  `{ data, meta }` for invoices/history. `isMockMode` branch returns fixtures via
  `simulateNetworkDelay()`. Pass `vendorId` in path only; accept optional `AbortSignal`.
  **Output:** `subscription.service.ts`.

- **Task 1.3 — store.** `subscription.store.ts` per FEATURE_PLAN §5: slices `currentSubscription`,
  `plans`, `invoices`/`invoicesMeta`, mutation flags; queries `fetchSubscription`/`fetchPlans`/
  `fetchInvoices`; commands `upgrade`/`renew`/`cancel`/`toggleAutoRenewal` (toggleAutoRenewal
  optimistic + rollback per OQ-6; upgrade/renew refetch subscription + prepend invoice); `clearError`;
  `clearSubscription`. `partialize` persists **only `plans`** (PII comment block matching
  customers.store). Errors via `mapApiError(_, 'subscription', action)` + `logError`. `getActiveVendorId`
  helper from `auth.store.vendorContext`.
  **Output:** `subscription.store.ts`.

- **Task 1.4 — tests.** Service test: each method hits the right `APIPath`, unwraps correctly,
  mock-mode returns fixtures. Store test: optimistic toggle + rollback, upgrade refetch + invoice
  prepend, `partialize` persists only `plans`, `clearSubscription` wipes all, error → i18n key.
  **Output:** the two `__tests__` files above.

### WS-2 · Presentational components
**Files owned (exclusive):**
- `src/modules/subscription/components/{CurrentPlanCard,UsageBar,PlanCard,InvoiceRow,SubscriptionStatusBadge,LimitReachedModal,SubscriptionBanner}.tsx` (new)
- `src/modules/subscription/components/index.ts` (new barrel)
- `src/modules/subscription/components/__tests__/*.test.tsx` (new)
**Depends on:** WS-0 (types, usage utils, i18n). **Does NOT depend on WS-1** — components are pure
props-in; use mock prop fixtures in tests.

- **Task 2.1 — SubscriptionStatusBadge.** Pill mapping each `SubscriptionStatus` to a token colour +
  localized label (`subscription.status_*`). CANCELLED variant supports an optional `activeUntil`
  sublabel. Reuse the badge primitive used by customer/staff cards if one exists.
  **Output:** `SubscriptionStatusBadge.tsx`.

- **Task 2.2 — UsageBar.** Props `{ resourceLabel, used, max, percent }`. If `isUnlimited(max)` →
  "{used} / Unlimited", **no bar**. Else "{used} / {max}" + progress bar coloured by
  `usageColor(percent)`. Accessible (`accessibilityLabel`).
  **Output:** `UsageBar.tsx`.

- **Task 2.3 — CurrentPlanCard.** Props `{ currentPlan }`. Prominent `planName`, limits list
  (Customers/Supply Lists/Staff → "up to N"/"Unlimited"), "Valid till {date}" (`nextBillingDate`,
  else `endDate`), `SubscriptionStatusBadge`. Uses `formatLocaleDate`.
  **Output:** `CurrentPlanCard.tsx`.

- **Task 2.4 — PlanCard.** Props `{ plan, billingCycle, isCurrent, onSelect }`. Plan name, price for
  cycle (`priceMonthly`/`priceYearly`; hide yearly if null), feature list (truthy keys →
  `subscription.feature_<key>`), "Select Plan" button (disabled/labelled "Current" when `isCurrent`).
  **Output:** `PlanCard.tsx`.

- **Task 2.5 — InvoiceRow.** Props `{ invoice, onPress }`. Renders period/plan-implied label, amount
  (`formatMoney`), payment-status pill, tappable. Null-guards `paymentDate` etc.
  **Output:** `InvoiceRow.tsx`.

- **Task 2.6 — LimitReachedModal.** Props per FEATURE_PLAN §4.4 (`visible, resource, current, max,
  onUpgrade, onClose`). Warning icon, `subscription.limit_reached_*` strings interpolating
  `{{max}}/{{current}}/{{resource}}`, primary Upgrade + secondary Cancel. Pure presentational.
  **Output:** `LimitReachedModal.tsx`.

- **Task 2.7 — SubscriptionBanner.** Props `{ subscription, onDismiss, onPress }` (data fetched by the
  host, NOT here — keep it pure for testability). Computes the single highest-priority message
  (expired/cancelled/past-due → expiring ≤7d → usage ≥90%) per FEATURE_PLAN §4.5; renders nothing when
  no condition holds. Dismiss + CTA callbacks.
  **Output:** `SubscriptionBanner.tsx`.

- **Task 2.8 — barrel + tests.** `components/index.ts` re-exporting all 7. Component tests covering:
  UsageBar unlimited (no bar) vs. coloured bar at 85/95; badge per status; banner priority + null
  render; modal interpolation + CTA.
  **Output:** `components/index.ts` + `components/__tests__/*.test.tsx`.

---

## Phase 3 (parallel — after Phase 2)

### WS-3 · Screens + routing
**Files owned (exclusive):**
- `src/modules/subscription/screens/{SubscriptionScreen,UpgradePlanScreen,InvoiceDetailScreen}.tsx` (new)
- `src/modules/subscription/screens/__tests__/*.test.tsx` (new)
- `app/(app)/subscription/_layout.tsx`, `app/(app)/subscription/index.tsx`,
  `app/(app)/subscription/upgrade.tsx`, `app/(app)/subscription/invoices/[invoiceId].tsx` (new)
- `app/(app)/home.tsx` (add owner nav entry + mount `<SubscriptionBanner/>`)
**Depends on:** WS-1 (store), WS-2 (components).

- **Task 3.1 — SubscriptionScreen.** Per FEATURE_PLAN §4.1. `useRequireOwner`, `ScreenErrorBoundary`,
  `AppHeader`. `fetchSubscription` + `fetchInvoices(page 1)` on mount. CurrentPlanCard, UsageBar ×3
  (from `usage`/`utilizationPercentage`/`limits`), action buttons (Upgrade hidden when
  `planCode==='PRO'`; Renew → `renew(currentCycle)`; auto-renewal toggle → `toggleAutoRenewal`; Cancel
  → confirm dialog then `cancel`). All commands disabled offline (`useNetworkStatus`). Billing-history
  FlatList of InvoiceRow → `push('/(app)/subscription/invoices/{id}')` with load-more. Success of
  renew → toast `subscription.payment_coming_soon`. States loading/error/data; 404 →
  `error_no_subscription` with Renew CTA.
  **Output:** `SubscriptionScreen.tsx`.

- **Task 3.2 — UpgradePlanScreen.** Per FEATURE_PLAN §4.2. Fetch plans + subscription; cycle toggle
  (default MONTHLY); render PlanCard for **higher-tier-only** plans (filter by `priceMonthly` >
  current, ascending — OQ-5); select → `upgrade(planId, cycle)` → toast `payment_coming_soon` +
  refetch + `router.back()`. 422 → inline `error_not_higher_tier`. Online-only, owner-guarded.
  **Output:** `UpgradePlanScreen.tsx`.

- **Task 3.3 — InvoiceDetailScreen.** Per FEATURE_PLAN §4.3. Read `invoiceId` param; resolve invoice
  from store invoices slice; not-found state if absent (no single GET — OQ-11). Render number, vendor
  name (`auth.vendorContext.vendorName`), line item, tax, total, payment-status pill, "Download PDF"
  → toast `subscription.pdf_coming_soon`. Owner-guarded, `ScreenErrorBoundary`.
  **Output:** `InvoiceDetailScreen.tsx`.

- **Task 3.4 — routes.** Thin route wrappers (pattern: `customers/add.tsx`) rendering each screen, plus
  `subscription/_layout.tsx` (`<Stack screenOptions={{ headerShown:false }} />`, copy
  `activity/_layout.tsx`). `invoices/[invoiceId].tsx` passes the param through.
  **Output:** the 4 files under `app/(app)/subscription/`.

- **Task 3.5 — home entry + banner.** In `app/(app)/home.tsx`: add a "Subscription" `AppButton`
  (`t('subscription.title')`) → `push('/(app)/subscription')`, and mount `<SubscriptionBanner/>` near
  the top with a `useState` session-dismiss (OQ-4) — fetch subscription via the store here and pass it
  down. Banner CTA → `push('/(app)/subscription')`.
  **Output:** edit to `app/(app)/home.tsx`.

- **Task 3.6 — screen tests.** SubscriptionScreen (renders plan/usage, Upgrade hidden on Pro, offline
  disables commands, cancel confirm), UpgradePlanScreen (higher-tier filter, upgrade success toast +
  back), InvoiceDetailScreen (renders invoice, PDF stub toast, not-found path).
  **Output:** `screens/__tests__/*.test.tsx`.

### WS-4 · 451 integration + logout wiring
**Files owned (exclusive):**
- `src/modules/subscription/hooks/useLimitReached.ts` (new) + `__tests__`
- `src/modules/customers/screens/AddCustomerScreen.tsx` (edit: add modal + catch branch only)
- `src/modules/supply-lists/screens/CreateSupplyListScreen.tsx` (edit: add modal + catch branch only)
- `src/modules/roles/screens/InviteStaffScreen.tsx` (edit: add modal + catch branch only)
- `src/modules/auth/store/auth.store.ts` (edit: add `clearSubscription()` to logout)
**Depends on:** WS-2 (`LimitReachedModal`). Independent of WS-3 except it imports the same modal +
the upgrade route path string (a literal, no code dep).

- **Task 4.1 — useLimitReached.** Per FEATURE_PLAN §9. `useLimitReached()` returns
  `{ state: { visible, resource, current, max }, show(err, fallbackResource?), close, goUpgrade }`.
  `show` returns `false` for non-451; on 451 reads `err.response.data.error.details.limits.{max,current}`
  + resource, sets state, returns `true`. `goUpgrade` routes to
  `err.response.data.error.details.upgradeUrl` (default `/(app)/subscription/upgrade`). Unit-test both
  branches with a fabricated axios error.
  **Output:** `useLimitReached.ts` + its test.

- **Task 4.2 — wire AddCustomerScreen.** In the existing `createCustomer` catch block, call
  `if (limit.show(err, 'customers')) return` **before** the 409 branch; render
  `<LimitReachedModal {...limit.state} onUpgrade={limit.goUpgrade} onClose={limit.close} />`. No store
  changes; the store already re-throws the raw axios error.
  **Output:** edit to `AddCustomerScreen.tsx`.

- **Task 4.3 — wire CreateSupplyListScreen.** Same pattern in the create-list submit catch with
  `limit.show(err, 'supplyLists')`. Render the modal.
  **Output:** edit to `CreateSupplyListScreen.tsx`.

- **Task 4.4 — wire InviteStaffScreen.** Same pattern in the invite submit catch with
  `limit.show(err, 'staff')`. Render the modal. (Note: roles errorMapper already maps 451 →
  `roles.error_staff_limit`; the modal takes priority — call `limit.show` first and `return`.)
  **Output:** edit to `InviteStaffScreen.tsx`.

- **Task 4.5 — logout wiring.** In `auth.store.ts` `logout()`, add a lazy-require `clearSubscription()`
  block alongside the existing `clearCustomers`/`clearAudit` blocks (same try/catch + require pattern).
  **Output:** edit to `auth.store.ts`.

---

## Definition of done (frontend)
- [ ] All 8 service methods consume the API_SPEC shapes; object vs. list envelopes handled correctly.
- [ ] `0 = Unlimited` rendered everywhere (limits, usage bars suppressed); Pro never shows Upgrade.
- [ ] Usage colour thresholds: green `<80`, orange `80–94`, red `>=95`.
- [ ] Upgrade/renew never open `paymentUrl`; success → "coming soon" toast + refreshed subscription.
- [ ] 451 from add-customer / create-list / invite-staff opens `LimitReachedModal` with real
      `details.limits`; CTA routes to the upgrade screen (or "ask owner" for staff).
- [ ] SubscriptionBanner shows for expiry ≤7d / expired-cancelled-past_due / usage ≥90%, owner-only,
      session-dismissible.
- [ ] Owner screens double-guarded (route group + `useRequireOwner`); all commands disabled offline.
- [ ] `clearSubscription()` wired into logout; only `plans` persisted (no billing PII).
- [ ] `subscription.*` namespace added to all 9 locales.
- [ ] Unit + screen tests green; `npm run lint` + `npm run build` clean (pre-commit gate).
