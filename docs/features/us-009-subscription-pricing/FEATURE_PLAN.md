# US-009 — Subscription & Pricing Management (Frontend) · FEATURE_PLAN

> Repo: `paycycle_vendor` · Slug: `us-009-subscription-pricing` · Branch: `feat/us-009-subscription-pricing`
> Authoritative API contract: `paycycle_api/docs/features/us-009-subscription-pricing/API_SPEC.md`
> Story: `project_documents/vendor_app/user_stories/US-009-subscription-pricing.md`
> Wireframe: `project_documents/vendor_app/wireframes/10-activity-subscription.md` §2.25

---

## 1. Scope

Subscription & pricing surfaces for the vendor app. The backend ships 8 endpoints (1 plan
catalog + 7 vendor-scoped) plus a **451 limit-enforcement** behaviour layered onto three
existing write endpoints (create customer, invite staff, create supply list).

This story delivers:
- A **Subscription** screen (owner-only) — current plan, live usage with progress bars,
  manage actions (upgrade / renew / cancel / auto-renewal toggle), billing-history list.
- An **Upgrade Plan** screen (owner-only) — billing-cycle toggle, higher-tier plan cards,
  feature comparison, confirm-upgrade (payment is **stubbed** this iteration).
- An **Invoice Detail** screen — invoice header, line item, tax/total, payment status.
- A shared **`LimitReachedModal`** wired into the 3 existing add-flows that now return 451.
- A global owner **`SubscriptionBanner`** for expiry/usage warnings.

### Read vs. write surfaces
| Surface | CQS | Endpoint |
|---|---|---|
| Subscription view (plan + usage) | Query | GET `/vendors/:id/subscription` |
| Plan catalog | Query | GET `/subscription-plans` |
| Invoices (history list) | Query | GET `/vendors/:id/subscription/invoices` |
| Subscription event history | Query | GET `/vendors/:id/subscription/history` |
| Upgrade | Command | POST `/vendors/:id/subscription/upgrade` |
| Renew | Command | POST `/vendors/:id/subscription/renew` |
| Cancel | Command | POST `/vendors/:id/subscription/cancel` |
| Toggle auto-renewal | Command | PATCH `/vendors/:id/subscription/auto-renewal` |

All commands are **online-only** (no offline writes — consistent with US-002/004/005/006/007/008).

### Role model
- **Owner**: every surface. All manage commands + invoices/history are owner-only on the server
  (403 for staff). Owner screens are guarded with `useRequireOwner` (defence-in-depth) and live
  under the `(app)` group (the route-group structure is the primary guard).
- **Staff**: server allows only GET `/subscription-plans` and GET `/vendors/:id/subscription`.
  We **do not** surface a staff entry-point to the subscription screen (see OQ-7); the
  `LimitReachedModal` is the only subscription-related UI a staff member can encounter, and on
  staff the upgrade CTA routes them to the owner (staff cannot upgrade — server returns 403).

---

## 2. Architecture (mirrors US-008 customers + US-007 audit)

```
src/types/subscription.ts                       # DTOs frozen against API_SPEC
src/constants/apiPaths.ts → APIPath.Subscription  # path builders (plan catalog + vendor-scoped)
src/utils/errorMapper.ts  → 'subscription' ctx + SubscriptionErrorAction  # status → i18n key
src/modules/subscription/
  service/subscription.mock.ts                  # deterministic mock fixtures
  service/subscription.service.ts               # mock + real (httpClient)
  store/subscription.store.ts                   # Zustand; PII-aware partialize
  utils/usage.ts                                # usage colour + "Unlimited" + isUnlimited helpers
  components/CurrentPlanCard.tsx                # plan name, limits, valid-till, status badge
  components/UsageBar.tsx                        # one resource: X/Y + coloured progress bar
  components/PlanCard.tsx                        # upgrade-screen plan card (price + features + select)
  components/InvoiceRow.tsx                      # billing-history list row (tap → detail)
  components/SubscriptionStatusBadge.tsx        # status pill (Active/Expired/Cancelled/...)
  components/LimitReachedModal.tsx              # 451 modal (shared; used by other modules)
  components/SubscriptionBanner.tsx             # global owner banner (expiry/usage)
  components/index.ts                           # barrel
  hooks/useLimitReached.ts                      # shared 451 → modal-state hook (other modules import)
  screens/SubscriptionScreen.tsx               # owner: plan + usage + actions + history
  screens/UpgradePlanScreen.tsx                # owner: cycle toggle + plan cards + confirm
  screens/InvoiceDetailScreen.tsx              # invoice header + line item + total + status
app/(app)/subscription/_layout.tsx             # Stack (headerShown:false)
app/(app)/subscription/index.tsx               # → SubscriptionScreen (owner)
app/(app)/subscription/upgrade.tsx             # → UpgradePlanScreen (owner)
app/(app)/subscription/invoices/[invoiceId].tsx # → InvoiceDetailScreen (owner)
src/locales/*.json  → subscription.* namespace # 9 locales (en,hi,ta,te,mr,bn,kn,ml,gu)
src/modules/auth/store/auth.store.ts           # logout → clearSubscription() (orchestrator-wired)
app/(app)/home.tsx                             # owner nav entry + <SubscriptionBanner/> mount point
```

### Conventions reused verbatim
- `httpClient` from `@services/http` (token from SecureStore; 401/403 session-revocation interceptor).
- `isMockMode` / `simulateNetworkDelay` mock switch (`@services/config`).
- `mapApiError(err, 'subscription', action?)` → i18n key; store holds keys, never raw messages.
- `logError(err, { screen, action, endpoint })` — correlationId, no PII.
- `useRequireOwner()` defence-in-depth on owner screens; route group is the primary guard.
- `ScreenErrorBoundary` wraps every screen.
- `useNetworkStatus()` offline banner; all command buttons disabled offline.
- `useTranslation` / `t()`; `formatLocaleDate` for `valid till` / invoice dates.
- All ids are **strings**. Money is plain `number` (INR). `0` for any `max*` limit → "Unlimited".

> **Locale count correction:** the project ships **9** locales (`en, hi, ta, te, mr, bn, kn, ml,
> gu`), not 10. The `subscription.*` namespace must be added to all 9. (Noted in OQ-8.)

---

## 3. Data contract reconciliation (R-table)

| # | API_SPEC fact | Frontend handling |
|---|---|---|
| R1 | GET `/subscription-plans` → `data: { plans: [...] }` (object-shaped, **no** `meta`) | service returns `data.data.plans` |
| R2 | GET `/vendors/:id/subscription` → `data: { currentPlan, usage, utilizationPercentage, canAddMore }` (object-shaped) | service returns `data.data` as `SubscriptionViewDto` |
| R3 | `max* = 0` means **Unlimited** | `isUnlimited(n) = n === 0`; render "Unlimited" label, **no progress bar** (UsageBar) |
| R4 | `utilizationPercentage` is `0` for unlimited limits | UsageBar shows "X / Unlimited" with no bar when `isUnlimited(limit)` |
| R5 | usage colour: green `<80`, orange `80–94`, red `>=95` | `usageColor(pct)` in `utils/usage.ts` (tokens: success/warning/error) |
| R6 | `currentPlan.endDate: null` = active (no scheduled end) | "Valid till" uses `nextBillingDate` when `endDate` is null; CancelLED shows `activeUntil`/`nextBillingDate` |
| R7 | `status ∈ TRIAL\|ACTIVE\|PAST_DUE\|CANCELLED\|EXPIRED` | typed union; `SubscriptionStatusBadge` colour-maps each; CANCELLED labelled "Active until …" |
| R8 | CANCELLED is still usable until `nextBillingDate` | badge variant "cancelled" + sublabel; banner offers Renew |
| R9 | upgrade target must be **strictly higher** tier | Upgrade screen lists only higher-tier plans (see OQ-5); 422 → `error_not_higher_tier` |
| R10 | upgrade/renew return `{ subscription, invoice }`; `invoice.paymentUrl` is a **stub** | success → toast "Payment integration coming soon" + refetch subscription + navigate back (see OQ-3). **Never** open paymentUrl / assume paid |
| R11 | `invoice.amount` may be `0` with `paymentStatus = PAID` (no days left) | render as-is; no special FE branching needed |
| R12 | cancel → `{ subscriptionId, status, autoRenewal, activeUntil }`; 422 if already cancelled | store patches currentPlan; 422 → `error_already_cancelled` |
| R13 | auto-renewal PATCH → `{ subscriptionId, autoRenewal }` | optimistic toggle with rollback (see OQ-6) |
| R14 | GET `/invoices` → **list** envelope `data: [...]` + `meta` (page/limit/total/totalPages) | service returns `{ data, meta }`; store paginates (load-more) |
| R15 | GET `/history` → list envelope `data: [...]` + `meta` | **not surfaced in MVP** (no wireframe element); service method shipped for parity, store slice optional. See OQ-9 |
| R16 | invoice `paymentDate/paymentMethod/paymentReference` may be `null` | DTO nullable; InvoiceRow/Detail null-guard each |
| R17 | PDF download **not available** | InvoiceDetail shows a "Download PDF" button that toasts "PDF download coming soon" (stub per story); never call a download endpoint |
| R18 | 451 body has `error.code = SUBSCRIPTION_LIMIT_REACHED` + `error.details.limits.{max,current}` + `error.details.upgradeUrl` | `useLimitReached` extracts `details.limits` + routes CTA to `/(app)/subscription/upgrade`. Falls back to `{max,current}` from props if details absent |
| R19 | Pro (unlimited) never returns 451 | "Upgrade Plan" button hidden when `planCode === 'PRO'` (highest tier) |
| R20 | `isTrial` always `false` this iteration | DTO field present; no trial UI built |
| R21 | error envelope `{ success:false, error:{ code, message, correlationId } }` | `mapApiError` reads `error.code`/status; `logError` extracts `correlationId` |
| R22 | money is plain `number` INR, 2-decimal | `formatCurrency(n)` → `₹{n}` (reuse existing helper if present; else add to `utils/usage.ts` as `formatMoney`) |

> The story doc's React-Query snippets, `displayName`/`planName` (lowercase) field names, S3
> `paymentUrl` redirect, and `usage_limits` materialized shapes are **superseded** by the shipped
> API_SPEC (which uses `planName`/`planCode`, `0=unlimited`, stubbed payment). We implement strictly
> against API_SPEC.

---

## 4. Screens

### 4.1 SubscriptionScreen — `app/(app)/subscription/index.tsx` (owner)
Wireframe §2.25. Sections top-to-bottom:
1. **CurrentPlanCard** — `planName` (prominent, h2/bold), limits list (Customers/Supply Lists/Staff,
   each "up to N" or "Unlimited"), "Valid till {date}" (`nextBillingDate`, or `endDate` when set),
   `SubscriptionStatusBadge`. When `status === CANCELLED`, show "Active until {activeUntil}".
2. **Usage** — one `UsageBar` per resource (customers / supplyLists / staff): "X / Y" +
   coloured bar from `utilizationPercentage`. Unlimited → "X / Unlimited", no bar.
3. **Actions**:
   - "Upgrade Plan" → `push('/(app)/subscription/upgrade')`. Hidden when `planCode === 'PRO'`.
   - "Renew Subscription" → calls `renewSubscription` (MONTHLY default; see OQ-10 for cycle choice).
   - "Manage Auto-Renewal" — `AppSwitch`/toggle bound to `currentPlan.autoRenewal`,
     calls `toggleAutoRenewal` (optimistic, OQ-6). Hidden when status EXPIRED (nothing to renew).
   - All command buttons disabled offline.
4. **Billing History** — `InvoiceRow` list (FlatList) from the invoices slice; tap → invoice detail.
   First page fetched on mount; "Load more" when `meta.page < meta.totalPages`.

States: loading / error / data. (No empty-filtered; there's always a current plan if a subscription
exists. A 404 "no subscription" maps to `error_no_subscription` with a Renew/Choose-Plan CTA.)

### 4.2 UpgradePlanScreen — `app/(app)/subscription/upgrade.tsx` (owner)
- Current-plan summary line ("Current plan: {planName}").
- Billing-cycle toggle (Monthly / Yearly) — `billingCycle` local state, default `MONTHLY`.
- `PlanCard` per **eligible** plan (higher tier only — OQ-5): planName, price for the selected
  cycle (`priceMonthly`/`priceYearly`; if `priceYearly` is null show monthly only), feature list
  from `features` (truthy keys → i18n `subscription.feature_<key>`), "Select Plan" button.
- Confirm → `upgradeSubscription(planId, billingCycle)`. On success: toast
  "Payment integration coming soon" (OQ-3), refetch subscription, `router.back()`.
- 422 (not higher tier) → inline error. Online-only.

States: loading (plans + current) / error / data.

### 4.3 InvoiceDetailScreen — `app/(app)/subscription/invoices/[invoiceId].tsx` (owner)
- Reads `invoiceId` from route params; resolves the invoice from the store's invoices slice
  (already loaded from the history list). If absent (deep-link / not in cache), show a
  not-found state with a back action — there is **no** single-invoice GET in the API (see OQ-11).
- Renders: invoice number, vendor name (`auth.vendorContext.vendorName`), single line item
  (plan + period), tax, total, `SubscriptionStatusBadge`-style payment-status pill, and a
  "Download PDF" button that toasts "PDF download coming soon" (R17).

### 4.4 LimitReachedModal — shared component
- Props: `visible`, `resource: 'customers' | 'staff' | 'supplyLists'`, `current: number`,
  `max: number`, `onUpgrade: () => void`, `onClose: () => void`.
- Renders warning icon, localized title/body (interpolating `{{max}}`/`{{current}}`/resource label),
  primary "Upgrade Plan" CTA, secondary "Cancel". `onUpgrade` navigates to the upgrade screen.
- Pure presentational; trigger state owned by the host screen via `useLimitReached` (OQ-2).

### 4.5 SubscriptionBanner — global owner banner
- Mounted inside the **owner** home screen content (OQ-1), above the main content.
- Renders (highest-priority single message) when, for the current subscription:
  - `status ∈ {EXPIRED, CANCELLED, PAST_DUE}` → "Your subscription has expired / will end. Renew now."
  - else expiring in ≤7 days (days between today and `nextBillingDate` ≤ 7) → "Expires in N days…"
  - else any `utilizationPercentage[resource] >= 90` → "You're using N% of your {resource} limit…"
- Dismissible per **session** (in-memory `useState`, OQ-4). CTA → `push('/(app)/subscription')`.
- Fetches the subscription via the store on mount if not already loaded; renders nothing while
  loading, on error, or when no banner condition holds.

---

## 5. State / store design — `src/modules/subscription/subscription.store.ts`

Zustand + persist (SSR-safe `buildStorage` pattern, identical to customers/audit stores).

Slices:
- `currentSubscription: SubscriptionViewDto | null` — plan + usage. **In-memory only** (carries
  billing dates → PII-adjacent). `isSubLoading`, `subError`.
- `plans: PlanDto[]` — plan catalog. Non-PII (limits + prices); **persisted** for fast upgrade-screen
  paint. `isPlansLoading`, `plansError`.
- `invoices: InvoiceDto[]`, `invoicesMeta: PaginationMeta | null` — **in-memory only** (financial
  PII: amounts, references). `isInvoicesLoading`, `invoicesError`.
- (optional) `bannerDismissed: boolean` — see OQ-4 (recommendation: keep in component `useState`,
  **not** in store).
- Shared mutation flags: `isMutating`, `mutationError`.

Queries:
- `fetchSubscription()` — GET subscription. Used by SubscriptionScreen + SubscriptionBanner.
- `fetchPlans()` — GET plan catalog.
- `fetchInvoices(opts?)` — paginated; append when `page>1`.

Commands (online-only, all set `isMutating`/`mutationError`, all `logError` + `mapApiError(_, 'subscription', action)`):
- `upgrade(planId, billingCycle)` → returns `{ subscription, invoice }`; on success refetches
  subscription (limits change) and prepends invoice to the invoices slice.
- `renew(billingCycle)` → refetches subscription, prepends invoice.
- `cancel()` → patches `currentSubscription.currentPlan` (`status='CANCELLED'`, `autoRenewal=false`).
- `toggleAutoRenewal(enabled)` → **optimistic** patch of `currentPlan.autoRenewal` with rollback on
  failure (OQ-6).

Lifecycle:
- `clearError()`.
- `clearSubscription()` — wipes all slices incl. persisted `plans`; wired into `auth.store.logout()`
  (orchestrator-owned, same lazy-require pattern as `clearCustomers`/`clearAudit`).

### partialize (PII policy)
Persist **only** `plans` (plan names, limits, prices — public catalog, non-PII). **Omit**
`currentSubscription` and `invoices` — both carry billing dates / amounts / references and are
in-memory only, wiped on restart or `clearSubscription()`. (Matches the customers/audit partialize
discipline.)

> The prompt's suggested partialize ("persist plan names + limits, NOT billing amounts/dates") maps
> exactly to "persist `plans` only" here. We do **not** persist any field of `currentSubscription`.

---

## 6. Service design — `src/modules/subscription/subscription.service.ts`

Mock + real, identical shape to `audit.service.ts`. `vendorId` is in the path for routing only
(JWT-derived server-side). All ids strings.

| Method | Endpoint | Returns (after unwrap) |
|---|---|---|
| `getPlans(signal?)` | GET `/subscription-plans` | `PlanDto[]` (`data.data.plans`) |
| `getSubscription(vendorId, signal?)` | GET `/vendors/:id/subscription` | `SubscriptionViewDto` (`data.data`) |
| `upgradeSubscription(vendorId, planId, billingCycle, signal?)` | POST `…/upgrade` | `UpgradeResultDto` (`data.data`) |
| `renewSubscription(vendorId, billingCycle, signal?)` | POST `…/renew` | `RenewResultDto` (`data.data`) |
| `cancelSubscription(vendorId, signal?)` | POST `…/cancel` (body `{}`) | `CancelResultDto` (`data.data`) |
| `toggleAutoRenewal(vendorId, enabled, signal?)` | PATCH `…/auto-renewal` | `{ subscriptionId, autoRenewal }` (`data.data`) |
| `getInvoices(vendorId, opts?, signal?)` | GET `…/invoices?page&limit` | `{ data: InvoiceDto[], meta: PaginationMeta }` |
| `getHistory(vendorId, opts?, signal?)` | GET `…/history?page&limit` | `{ data: HistoryEventDto[], meta }` (parity; not surfaced — OQ-9) |

> Envelope note: plans + subscription are **object-shaped** `data` (handle specifically); invoices +
> history are **list-shaped** with `meta`. Mock fixtures cover: Growth ACTIVE @ 85%/100%/50% usage
> (matches API_SPEC example + wireframe), a Pro unlimited variant, an EXPIRED variant, and 2 invoices.

---

## 7. apiPaths additions — `src/constants/apiPaths.ts → APIPath.Subscription`

```
Subscription: {
  Plans: () => `/subscription-plans`,                                   // not vendor-scoped
  View:    (vendorId) => `/vendors/${vendorId}/subscription`,
  Upgrade: (vendorId) => `/vendors/${vendorId}/subscription/upgrade`,
  Renew:   (vendorId) => `/vendors/${vendorId}/subscription/renew`,
  Cancel:  (vendorId) => `/vendors/${vendorId}/subscription/cancel`,
  AutoRenewal: (vendorId) => `/vendors/${vendorId}/subscription/auto-renewal`,
  Invoices:(vendorId) => `/vendors/${vendorId}/subscription/invoices`,
  History: (vendorId) => `/vendors/${vendorId}/subscription/history`,
}
```
No `/v1` in the strings (base URL ends `/api/v1`), identical to the existing convention.

---

## 8. Error mapping — `errorMapper.ts`

Add `'subscription'` to `ApiErrorContext` and a `SubscriptionErrorAction` union
(`'upgrade' | 'renew' | 'cancel' | 'auto_renewal'`). New `subscription` block:

```
if (context === 'subscription') {
  if (status === 403) return 'roles.error_forbidden'        // staff hit owner-only
  if (status === 404) return 'subscription.error_no_subscription'
  if (status === 422) {
    if (action === 'upgrade') return 'subscription.error_not_higher_tier'
    if (action === 'cancel') return 'subscription.error_already_cancelled'
    return 'validation.required'
  }
  if (status === 400) return 'validation.required'          // bad billingCycle / autoRenewal
}
```
Also add the global `SUBSCRIPTION_LIMIT_REACHED` code → `subscription.limit_reached_title` is handled
**not** through mapApiError (the modal reads `error.details` directly via `useLimitReached`), but add
a fallback `if (status === 451) return 'subscription.error_limit_reached'` so a 451 without details
still surfaces a sensible message. Extend the mock-thrown-key prefix guard with `'subscription.'`.

---

## 9. Integration with existing modules (451 wiring)

`useLimitReached` (shared hook, owned by the subscription module) centralizes the 451 path:

```
const limit = useLimitReached()        // { state, show(err, fallbackResource?), close, goUpgrade }
// in a write catch block:
catch (err) {
  if (limit.show(err, 'customers')) return   // returns true & opens modal if it was a 451
  // …existing non-451 handling…
}
// in render: <LimitReachedModal {...limit.state} onUpgrade={limit.goUpgrade} onClose={limit.close} />
```

`limit.show(err)`:
- returns `false` for non-axios / non-451 errors (host keeps its existing handling).
- on 451: reads `error.details.limits.{max,current}` and the resource (from `error.details` or the
  fallback arg), sets modal state, returns `true`. `goUpgrade` routes to
  `error.details.upgradeUrl` (default `/(app)/subscription/upgrade`).

Wire into three host screens (each owns only its own catch block + one modal render — no shared file
churn):
| Module | File | Trigger |
|---|---|---|
| customers | `src/modules/customers/screens/AddCustomerScreen.tsx` | `createCustomer` catch (currently only handles 409) |
| supply-lists | `src/modules/supply-lists/screens/CreateSupplyListScreen.tsx` | create-list catch |
| roles | `src/modules/roles/screens/InviteStaffScreen.tsx` | invite-staff submit catch |

> The customer add screen already imports `axios` and inspects `err.response?.status`; the new hook
> slots in alongside the existing 409 branch with no store changes. The stores already surface the
> raw error (they `throw err` after mapping), so the screen-level catch sees the original axios error
> with `error.details` intact.

**Recommendation (OQ-2): per-screen local hook**, not a global modal provider. The three host
screens already own their submit/catch logic and a `ScreenErrorBoundary`; a shared hook keeps file
ownership clean (each screen edits only itself) and avoids a new global context in the root layout.

---

## 10. i18n — `subscription.*` namespace (9 locales)

Add a `subscription` block to all 9 `src/locales/*.json`. Key groups:
- titles/nav: `title`, `current_plan`, `usage`, `billing_history`, `upgrade_plan`, `renew`,
  `manage_auto_renewal`, `invoice`, `invoice_detail`.
- plan/labels: `plan_starter`, `plan_growth`, `plan_pro`, `unlimited`, `up_to` (`up to {{n}}`),
  `valid_till`, `active_until` (`Active until {{date}}`), `customers`, `staff`, `supply_lists`,
  `per_month`, `per_year`, `monthly`, `yearly`, `select_plan`, `current_plan_label`.
- status: `status_trial`, `status_active`, `status_past_due`, `status_cancelled`, `status_expired`.
- features: `feature_basic_delivery_tracking`, `feature_customer_management`,
  `feature_staff_management`, `feature_analytics`, `feature_whatsapp_notifications`,
  `feature_credit_control`, `feature_advanced_reports`, `feature_api_access`,
  `feature_priority_support`.
- invoice: `invoice_number`, `payment_status`, `amount`, `tax`, `total`, `paid`, `pending`,
  `overdue`, `download_pdf`, `payment_date`, `payment_method`.
- limit modal: `limit_reached_title`, `limit_reached_body`
  (`Your current plan allows up to {{max}} {{resource}}. You currently have {{current}}.`),
  `limit_upgrade_cta`.
- banner: `banner_expiring` (`Expires in {{days}} days. Renew now.`), `banner_expired`,
  `banner_cancelled`, `banner_usage` (`You're using {{percent}}% of your {{resource}} limit.`),
  `banner_renew_cta`, `banner_upgrade_cta`, `banner_dismiss`.
- toasts/errors: `payment_coming_soon`, `pdf_coming_soon`, `renew_success`, `cancel_success`,
  `auto_renewal_on`, `auto_renewal_off`, `error_no_subscription`, `error_not_higher_tier`,
  `error_already_cancelled`, `error_limit_reached`, `confirm_cancel_title`, `confirm_cancel_body`.

For non-English locales, English fallback already works at runtime (`t()` falls back to `en`), but
ship translated strings to match prior stories (Dev agent should translate, not copy English).

---

## 11. Acceptance-criteria mapping

| AC (story, FE-relevant) | Surface |
|---|---|
| Subscription screen shows current plan details | CurrentPlanCard |
| Shows usage with progress bars + colour coding | UsageBar + `usageColor` |
| Shows valid-till date + status badge | CurrentPlanCard + SubscriptionStatusBadge |
| "Upgrade Plan" button (hidden on Pro) | SubscriptionScreen action (R19) |
| "Renew Subscription" button | SubscriptionScreen action |
| Manage auto-renewal | toggle + `toggleAutoRenewal` |
| Billing-history list | InvoiceRow list |
| Owner can view available upgrade options | UpgradePlanScreen |
| Monthly/yearly billing toggle | UpgradePlanScreen cycle toggle |
| Frontend shows limit-reached modal on 451 | LimitReachedModal + `useLimitReached` |
| Upgrade CTA routes from modal | `goUpgrade` → upgrade screen |
| Subscription banner (expiry / usage ≥90%) | SubscriptionBanner |
| Invoice screen (number, total, status) | InvoiceDetailScreen |
| Usage refreshed after mutations | store refetches subscription on upgrade/renew |

Deferred per API_SPEC (FE must not build): real payment flow, working PDF download, trial onboarding,
plan downgrade, expiry push notifications.

---

## 12. Workstreams (conflict-free file ownership)

See `FEATURE_TASKS.md` for the per-task breakdown. Summary:
- **WS-0 Foundation** — `types/subscription.ts`, `APIPath.Subscription`, errorMapper `'subscription'`
  ctx, `utils/usage.ts`, `subscription.*` i18n × 9.
- **WS-1 Service + Store** — mock, service, store (+ `clearSubscription`), tests.
- **WS-2 Presentational components** — CurrentPlanCard, UsageBar, PlanCard, InvoiceRow,
  SubscriptionStatusBadge, LimitReachedModal, SubscriptionBanner, barrel + tests.
- **WS-3 Screens + routing** — SubscriptionScreen, UpgradePlanScreen, InvoiceDetailScreen,
  `app/(app)/subscription/*`, home nav entry + banner mount + tests.
- **WS-4 451 integration + logout wiring** — `useLimitReached`, the 3 host-screen catch blocks,
  `auth.store` `clearSubscription()` wiring + tests.

(Implemented sequentially if sub-agent fan-out is unavailable; file ownership is still partitioned to
keep the diff reviewable.)

---

## 13. Open Questions (with recommendation + trade-off)

**OQ-1: SubscriptionBanner placement — global layout vs. per-screen?**
**Recommended:** mount it inside the **owner home screen** content (`app/(app)/home.tsx`), not the
root `(app)/_layout.tsx`. **Trade-off:** a global layout mount would show the banner on every
authenticated screen (including deep flows), which is noisy and would also render for staff (who
can't act on it). The home screen is the natural owner landing surface, the banner is owner-relevant
only, and home-only placement avoids re-fetching the subscription on every navigation. If product
later wants it app-wide, promoting it to the layout is a one-line move.

**OQ-2: LimitReachedModal integration — local state per screen vs. global provider?**
**Recommended:** a shared **hook** (`useLimitReached`) with **local modal state per host screen**.
**Trade-off:** a global provider centralizes the modal but forces every 451-capable mutation to route
through a global dispatch and adds a root-layout context. The hook keeps each screen self-contained
(it already owns its submit/catch + error boundary), preserves clean file ownership for parallel
work, and reuses the exact pattern the screens already use for 409 handling.

**OQ-3: Payment stub UX — toast + navigate back vs. a "coming soon" screen?**
**Recommended:** on upgrade/renew success, show a **toast "Payment integration coming soon,"** refetch
the subscription, and `router.back()` to the subscription screen. **Trade-off:** a dedicated
coming-soon screen is more explicit but adds a route + back-stack step for a temporary stub and risks
implying the upgrade didn't apply. The toast keeps the (already server-applied) plan change visible
on the subscription screen with the least ceremony. We **never** open `paymentUrl`.

**OQ-4: Banner dismiss — session-only vs. persisted?**
**Recommended:** **session-only** (`useState`, reset on app restart / remount). **Trade-off:**
persisting the dismissal (AsyncStorage/store) would hide a genuinely urgent expiry/usage warning
across launches — the opposite of the intent. A nag that returns next session is appropriate for a
billing-critical alert; the per-session dismiss still respects the user within a session.

**OQ-5: Plan ordering on upgrade screen — higher-tier-only vs. all with current highlighted?**
**Recommended:** show **only strictly-higher-tier plans** (filter by tier; the API rejects same/lower
with 422). Order ascending (Starter→Growth→Pro). **Trade-off:** showing all plans (current
highlighted, lower disabled) gives a fuller comparison, but the backend only supports upgrades, so
lower/equal cards would be dead controls that produce 422s. Higher-only matches the server contract
and the wireframe's intent. Tier comparison uses `priceMonthly` ascending as the canonical order
(equivalently plan index in the catalog, which the API returns Starter→Growth→Pro). If product wants
a full comparison table, we can render lower tiers as non-selectable rows later.

**OQ-6: Auto-renewal toggle — optimistic vs. confirm-first?**
**Recommended:** **optimistic** flip with rollback on failure (mirror customers `removeSubscription`).
**Trade-off:** a confirmation dialog is safer for destructive actions, but toggling auto-renewal is
low-risk and reversible; an optimistic toggle feels instant and matches the established store
pattern. We pair it with a brief toast ("Auto-renewal on/off") and roll back + show the mapped error
if the PATCH fails. (Cancel — which is genuinely destructive — **does** get a confirm dialog.)

**OQ-7: Staff entry to the subscription surface.**
The server lets staff read the plan + usage, but all management is owner-only. **Recommended:** do
**not** add a staff nav entry to the subscription screen; staff only ever see the
`LimitReachedModal`, whose upgrade CTA (for staff) shows a "ask the owner to upgrade" message rather
than navigating (staff can't upgrade — 403). **Trade-off:** staff lose a read-only plan view, but the
wireframe scopes subscription to owners and a half-functional owner screen for staff is confusing.

**OQ-8: Locale count — 9, not 10.** The prompt says "10 locales already seeded," but the repo ships
**9** (`en, hi, ta, te, mr, bn, kn, ml, gu`). **Recommended:** add the `subscription.*` namespace to
all **9** existing locale files. **Trade-off:** none — there is no 10th locale to populate. Flagging
so QA doesn't expect a 10th file.

**OQ-9: Subscription event history (`GET /history`).** The API ships it, but the wireframe has no
history UI (only billing/invoice history). **Recommended:** ship the **service method** for contract
parity but **do not** build a screen this iteration. **Trade-off:** a tiny amount of unused service
code vs. building an unspecced screen. If product wants an audit-style subscription timeline, it's a
fast follow that reuses the audit-row pattern.

**OQ-10 / Renew billing cycle.** Renew takes a `billingCycle`, but the wireframe's "Renew
Subscription" is a single button. **Recommended:** renew with the **current** subscription's
`billingCycle` (no extra prompt). **Trade-off:** the user can't switch cycle at renew time, but
changing cycle is naturally an "upgrade/manage" concern; renewing same-cycle matches the one-tap
wireframe. Switching cycle can be offered on the upgrade screen.

**OQ-11: Invoice detail data source.** There is **no** single-invoice GET endpoint. **Recommended:**
resolve the invoice from the already-loaded invoices slice by `invoiceId`; if missing (cold deep
link), show a not-found state with a back action. **Trade-off:** a cold deep-link to an invoice that
isn't in the first page won't render; acceptable because the only entry to invoice detail is tapping
a row in the in-memory list. If deep-linking becomes a requirement, request a `GET …/invoices/:id`
endpoint from the backend architect.

---

## 14. Security & privacy notes
- `vendorId` always from `auth.store.vendorContext` (JWT-derived) — never route params / user input.
- Financial PII (invoice amounts/references) + billing dates are **in-memory only**; only the public
  `plans` catalog is persisted. `clearSubscription()` wipes everything on logout.
- Owner screens double-guarded (route group + `useRequireOwner`).
- Errors logged with `correlationId`, never PII.
