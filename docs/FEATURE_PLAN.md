# FEATURE_PLAN.md — US-011 Vendor Settings & Automation (Frontend)

> React Native + Expo (expo-router) implementation plan for the vendor settings,
> notification preferences, and bulk-operations feature.
> Branch: `feat/us-011-vendor-settings`.
> Mock-first: no US-011 backend `API_SPEC.md` exists yet (only US-010 dashboard).
> See **Open Questions** for the contract assumptions this plan locks in.
>
> **Read first:** `AGENTS.md`, the skills under `.claude/skills/` (especially
> `screen-development.md`, `state-management.md`, `api-integration.md`,
> `navigation-routing.md`, `component-development.md`, `form-validation.md`,
> `localization-i18n.md`, `error-handling.md`, `accessibility-ux.md`), and the
> existing **dashboard** (US-010), **subscription** (US-009) and **supply-lists**
> (US-005) modules — they are the canonical patterns this plan mirrors.
>
> US-011 is **owner-only**. Every screen guards with `useRequireOwner()` inside the
> screen body (defence-in-depth) and the route wrapper is the thin re-export pattern.

---

## 1. Summary & Scope

US-011 delivers owner configuration + bulk-operations surfaces. New module: `src/modules/settings/`.

| # | Screen | Route | Role | Source wireframe |
|---|--------|-------|------|------------------|
| S1 | Vendor Settings | `/(app)/settings` | Owner | §2.29 |
| S2 | Notification Preferences | `/(app)/settings/notifications` | Owner | §2.30 |
| S3 | Bulk Mark Leave | `/(app)/settings/bulk/mark-leave` | Owner | §2.31 |
| S4 | Bulk Adjust Rate | `/(app)/settings/bulk/adjust-rate` | Owner | §2.32 |
| S5 | Bulk Send Reminders | `/(app)/settings/bulk/send-reminders` | Owner | §2.29 (button → screen) |

**Out of scope (backend-only):** auto-mark delivery generation, auto-send-bills cron,
async job queue. The frontend treats bulk operations as **synchronous request →
summary response** (see OQ-3 for the async/polling fallback).

**Reuse from existing modules (do NOT rebuild):**
- `AppToggle`, `AppCheckbox`, `AppRadioGroup`, `AppInput`, `AppTextArea`,
  `AppDatePicker`, `AppButton`, `AppCard`, `AppSection`, `AppSelect`, `AppText`,
  `AppLoader`, `AppEmptyState`, `AppConfirmDialog` — all in `src/components/`.
- `RoleGate` / `useRequireOwner` — owner gating.
- `useNetworkStatus` — disable command buttons offline (commands are online-only).
- `supplyListsService.list()` and `supplyListsService.listCustomers()` — feed the
  list / customer selectors in bulk screens (no new selector endpoints needed).
- `mapApiError`, `logError` — error → i18n key mapping + correlationId logging.

---

## 2. Module Structure (new: `src/modules/settings/`)

Mirrors the dashboard/subscription module layout exactly.

```
src/modules/settings/
  service/
    settings.service.ts          # GET/PATCH settings, PATCH notif-prefs, 3× bulk POST, impact GETs
    settings.mock.ts             # mock fixtures (mock-first; OQ-1)
    __tests__/settings.service.test.ts
  store/
    settings.store.ts            # zustand; settings + notif-prefs slices + bulk mutation slice
    __tests__/settings.store.test.ts
  hooks/
    useSettingsForm.ts           # dirty-tracking + save for S1 (mirrors useCustomerForm)
    useBulkLeaveForm.ts          # S3 form + debounced impact fetch
    useBulkRateForm.ts           # S4 form + debounced impact fetch
  screens/
    VendorSettingsScreen.tsx
    NotificationPreferencesScreen.tsx
    BulkMarkLeaveScreen.tsx
    BulkAdjustRateScreen.tsx
    BulkSendRemindersScreen.tsx
    __tests__/*.test.tsx
  components/
    AutomationSection.tsx        # auto-mark + auto-send toggles + time picker
    DefaultCreditSection.tsx     # credit limit input + breach-action radio group
    BulkOperationsSection.tsx    # 3 nav buttons
    ImpactSummaryCard.tsx        # shared by S3 + S4 (customers/days/leaves/revenue)
    ListScopeSelector.tsx        # "single list (pick) | all lists" radio + list picker
    CustomerScopeSelector.tsx    # "all in list | select specific" + multi-select
    NotificationCategorySection.tsx  # reusable group of toggles for one prefs category
    index.ts
    __tests__/components.test.tsx
```

Types live in `src/types/settings.ts` (top-level `types/` dir, same as `types/subscription.ts`).

---

## 3. Type Contract (`src/types/settings.ts`)

All ids are **strings**. Money values are numbers (rupees). Times are `"HH:mm"` 24h strings.

```ts
export type CreditBreachAction = 'warn' | 'pause' | 'block'

export interface NotificationPreferencesDto {
  channels:   { push: boolean; whatsapp: boolean; sms: boolean }
  payment:    { paymentReceived: boolean; outstandingAlert: boolean; creditLimitBreach: boolean }
  customer:   { customerMarkedLeave: boolean; customerAdjustedQty: boolean; newCustomerJoined: boolean; customerOverride: boolean }
  operations: { lowStockAlert: boolean; staffActivitySummary: boolean; dailyDigest: boolean }
}

export interface VendorSettingsDto {
  autoMarkEnabled: boolean
  autoSendBillsEnabled: boolean
  autoSendBillsTime: string          // "20:00"
  defaultCreditLimit: number
  defaultCreditAction: CreditBreachAction
  notificationPreferences: NotificationPreferencesDto
}

// --- Bulk leave ---
export interface BulkLeaveInput {
  supplyListId?: string              // present when scope = single list
  customerIds?: string[]             // present when customer scope = specific
  startDate: string                  // "YYYY-MM-DD"
  endDate: string
  reason?: string
}
export interface BulkLeaveImpactDto {
  customersAffected: number; days: number; totalLeaves: number; revenueImpact: number
}
export interface BulkLeaveResultDto {
  operationId: string; summary: BulkLeaveImpactDto
}

// --- Bulk rate ---
export type RateScope = 'single_list' | 'all_lists_same_supply'
export interface BulkRateInput {
  scope: RateScope; supplyListId?: string; supplyType?: string
  newRate: number; effectiveFrom: string; notifyCustomers: boolean
}
export interface BulkRateImpactDto {
  listsAffected: number; customersAffected: number; rateChange: number; monthlyImpact: number
}
export interface BulkRateResultDto { operationId: string; summary: BulkRateImpactDto }

// --- Bulk reminders ---
export type ReminderTarget = 'overdue' | 'all_pending' | 'specific_customers'
export type ReminderChannel = 'whatsapp' | 'sms'
export interface BulkReminderInput {
  targetType: ReminderTarget; customerIds?: string[]; customMessage?: string; sendVia: ReminderChannel
}
export interface BulkReminderResultDto {
  operationId: string; summary: { totalSent: number; delivered: number; failed: number }
}
```

> **Note (OQ-5):** US-010's `dashboard.service.updateSettings()` already PATCHes
> `/vendors/:id/settings` for the `autoMarkEnabled` toggle on the dashboard. US-011
> owns the **full** settings surface. To avoid two services writing the same
> endpoint, the settings store becomes the single owner of `VendorSettingsDto`, and
> the dashboard's auto-mark toggle should delegate to it (see §8 Migration note).

---

## 4. API Calls per Screen

`vendorId` is always read from `auth.store.vendorContext` (JWT-derived); it appears
in the path only for routing, never as user input. Add an `APIPath.Settings` group
to `src/constants/apiPaths.ts`.

```ts
Settings: {
  Get:          (v) => `/vendors/${v}/settings`,                       // GET
  Update:       (v) => `/vendors/${v}/settings`,                       // PATCH
  NotifPrefs:   (v) => `/vendors/${v}/notification-preferences`,       // PATCH
  BulkMarkLeave:   (v) => `/vendors/${v}/bulk-operations/mark-leave`,  // POST
  BulkAdjustRate:  (v) => `/vendors/${v}/bulk-operations/adjust-rate`, // POST
  BulkSendReminders:(v)=> `/vendors/${v}/bulk-operations/send-reminders`, // POST
  // Impact previews (OQ-2: assumed GET preview endpoints; fall back to client calc):
  LeaveImpact:  (v) => `/vendors/${v}/bulk-operations/mark-leave/impact`,
  RateImpact:   (v) => `/vendors/${v}/bulk-operations/adjust-rate/impact`,
},
```

| Screen | Method + Path | Trigger | Notes |
|--------|---------------|---------|-------|
| S1 | `GET /vendors/:v/settings` | screen focus | hydrates form |
| S1 | `PATCH /vendors/:v/settings` | Save | sends only dirty fields |
| S1 | `GET /vendors/:v/supply-lists` (reuse) | — | not needed on S1 |
| S2 | `GET /vendors/:v/settings` (reuse cached) | screen focus | reads `notificationPreferences` |
| S2 | `PATCH /vendors/:v/notification-preferences` | Save | sends `{ notificationPreferences }` |
| S3 | `GET /vendors/:v/supply-lists` (reuse `supplyListsService.list`) | focus | list selector |
| S3 | `GET .../supply-lists/:id/customers` (reuse `listCustomers`) | scope=specific | customer multi-select |
| S3 | `GET .../bulk-operations/mark-leave/impact` (debounced) | inputs change | live impact card |
| S3 | `POST .../bulk-operations/mark-leave` | Confirm (after dialog) | returns summary |
| S4 | `GET /vendors/:v/supply-lists` (reuse) | focus | list selector + current rate |
| S4 | `GET .../bulk-operations/adjust-rate/impact` (debounced) | inputs change | live impact card |
| S4 | `POST .../bulk-operations/adjust-rate` | Confirm | returns summary |
| S5 | `POST .../bulk-operations/send-reminders` | Confirm | returns send summary |

Service shape mirrors `subscription.service.ts`: every method `if (isMockMode)`
returns a fixture after `simulateNetworkDelay()`, else calls `httpClient` and
returns `data.data`. Errors bubble; the store maps them.

---

## 5. Component Breakdown per Screen

### S1 — VendorSettingsScreen
- `AppHeader` (title "Settings", back).
- `<AutomationSection>`: `AppToggle` auto-mark (+ description), `AppToggle` auto-send,
  conditional `AppDatePicker` (time mode) for bill send time.
- `<DefaultCreditSection>`: `AppInput` (numeric, "Rs." prefix) credit limit;
  `AppRadioGroup` breach action (warn/pause/block).
- `<BulkOperationsSection>`: 3 `AppButton`s → `router.push` to S3/S4/S5.
- "Manage Notifications" `AppButton` → S2.
- Sticky/footer `AppButton` "Save Settings" (disabled when not dirty or offline).
- States: loading (`AppLoader`), error (inline banner + retry), saving (button spinner).

### S2 — NotificationPreferencesScreen
- Four `<NotificationCategorySection>` instances: Channels, Payment, Customer, Operations.
  Each renders a labelled group of `AppToggle`/`AppCheckbox` rows from a config map.
- Save `AppButton` → `PATCH notification-preferences`. Disabled when not dirty/offline.

### S3 — BulkMarkLeaveScreen
- `<ListScopeSelector>`: radio single-list (with list `AppSelect`/radio rows) vs all-lists.
- `<CustomerScopeSelector>`: radio all-in-list vs specific (multi-select list, lazy-loaded).
- Duration radio (single day / range) + `AppDatePicker` start (+ end when range).
- `<ImpactSummaryCard>`: customers / days / total leaves / revenue impact (red, negative).
- `AppTextArea` optional reason.
- "Confirm Bulk Leave" `AppButton` → `AppConfirmDialog` → POST. Disabled until valid + impact loaded.

### S4 — BulkAdjustRateScreen
- Scope `AppRadioGroup` (single list / all lists same supply).
- List `AppSelect` (+ supply-type picker when all-lists scope).
- `AppInput` new rate (numeric, "Rs." prefix, "/unit" suffix, placeholder = current rate).
- `AppDatePicker` effective-from.
- `<ImpactSummaryCard>` variant: lists / customers / rate change / monthly impact (green).
- `AppCheckbox` "Notify customers via WhatsApp".
- "Apply New Rate" `AppButton` → `AppConfirmDialog` (extra warning if rate = 0) → POST.

### S5 — BulkSendRemindersScreen
- Target `AppRadioGroup` (overdue / all pending / specific customers).
- Channel `AppRadioGroup` (whatsapp / sms).
- Optional `AppTextArea` custom message; customer multi-select when specific.
- "Send Reminders" `AppButton` → `AppConfirmDialog` → POST → result summary (sent/delivered/failed).

---

## 6. State Management

Matches the **zustand + persist** pattern of `subscription.store.ts` / `dashboard.store.ts`.

**New store: `useSettingsStore`** (`src/modules/settings/store/settings.store.ts`):

State slices:
- `settings: VendorSettingsDto | null`, `isLoading`, `error` (i18n key).
- `isMutating`, `mutationError` (shared by save/notif/bulk commands).
- Bulk impact is **screen-local** (in the form hooks), not in the global store, since
  it is transient and tied to the form lifecycle.

Actions:
- `fetchSettings()` — GET; populates `settings`.
- `updateSettings(patch: Partial<VendorSettingsDto>)` — PATCH dirty fields; updates `settings`.
- `updateNotificationPreferences(prefs)` — PATCH; merges into `settings.notificationPreferences`.
- `bulkMarkLeave(input)`, `bulkAdjustRate(input)`, `bulkSendReminders(input)` — POST;
  return result, do **not** persist (transient); throw on error so screens can react.
- `clearError()`, `clearSettings()` (wipes store; wired into `auth.store.logout()` via
  lazy-require, same as `clearSubscription`).

**Persistence (`partialize`):**
- Persist ONLY `settings` (config values — non-PII: toggles, limits, prefs). This gives
  instant paint on the settings screen. No customer/financial PII lives in this store
  (bulk results are transient), so `settings` is safe to persist. Mirrors the
  subscription store's "persist non-PII catalog only" discipline.

**Error handling:** add a `'settings'` context to `src/utils/errorMapper.ts` (`mapApiError(err, 'settings', action)`)
with sub-actions for bulk ops (`mark_leave`, `adjust_rate`, `send_reminders`) so 403
(permission), 400 (validation), and 413 (too many items) map to distinct i18n keys.
All failures go through `logError` (correlationId, no PII).

**Auto-save vs Save button:** US-011 uses an explicit **Save button** with dirty
tracking (matches the wireframe and the subscription/customer-form pattern). The
exception is the dashboard auto-mark toggle, which stays **optimistic** (US-010
behaviour) — see Migration note §8.

---

## 7. Navigation Additions

Expo-router file-based; the `(app)` group uses a single `<Stack headerShown:false>`.
No central route registry — adding files is enough. Each route file is a thin
re-export (the `supply-lists/index.tsx` pattern).

New route files under `app/(app)/settings/`:
```
app/(app)/settings/index.tsx                 → VendorSettingsScreen
app/(app)/settings/notifications.tsx         → NotificationPreferencesScreen
app/(app)/settings/bulk/mark-leave.tsx       → BulkMarkLeaveScreen
app/(app)/settings/bulk/adjust-rate.tsx      → BulkAdjustRateScreen
app/(app)/settings/bulk/send-reminders.tsx   → BulkSendRemindersScreen
```
Navigation calls use `router.push('/(app)/settings/...')`. Entry point to Settings:
add a "Settings" item to the owner's existing menu/profile surface (see OQ-4 for the
exact entry-point host). Each screen calls `useRequireOwner()` (redirects staff).

---

## 8. Migration Note — dashboard auto-mark toggle (OQ-5)

US-010 already owns `dashboard.service.updateSettings()` + an optimistic auto-mark
toggle on the owner dashboard. To prevent two stores writing `/vendors/:id/settings`:
- **Recommended:** keep the dashboard toggle's UX as-is, but route its write through
  the new `useSettingsStore.updateSettings({ autoMarkEnabled })`, and have
  `dashboard.store` read the resulting value. The settings store becomes the single
  writer of `VendorSettingsDto`.
- **Minimal-risk alternative (if time-boxed):** leave US-010 untouched for now and
  have the settings store re-fetch on focus; document the dual-writer as tech debt.
- This is a **non-blocking** decision; the dev agent should implement the recommended
  path unless the reviewer objects. Flagged as OQ-5.

---

## 9. Test Plan (key flows)

Follow `testing-strategy.md` (`@testing-library/react-native` + jest-expo, mock-first).

**Service tests** (`settings.service.test.ts`):
- mock-mode returns fixtures; real-mode builds correct URL + body and unwraps `data.data`.
- bulk POSTs send the exact contract bodies (scope/customerIds/dates).

**Store tests** (`settings.store.test.ts`):
- `fetchSettings` populates state; error path sets i18n key + calls `logError`.
- `updateSettings` sends only dirty fields and merges result.
- `updateNotificationPreferences` deep-merges into `settings.notificationPreferences`.
- bulk actions throw on failure with mapped error; `clearSettings` wipes + is called by logout.
- `partialize` persists `settings` only.

**Screen tests:**
- S1: toggles + inputs update form; time picker shows only when auto-send on; Save
  disabled until dirty and offline; Save calls `updateSettings` with the patch.
- S2: category toggles flip; Save sends full prefs object.
- S3: impact card hidden until inputs valid; confirm dialog gates POST; revenue impact
  rendered negative; specific-customer scope lazy-loads the multi-select.
- S4: rate=0 triggers extra warning in confirm dialog; impact updates on input;
  notify checkbox included in payload.
- S5: target/channel selection; specific scope reveals multi-select; result summary renders.
- Owner gating: staff hitting any route is redirected (`useRequireOwner`).

**Component tests:** `ImpactSummaryCard` formats currency + sign; `NotificationCategorySection`
renders rows from config and reports toggles.

**Manual smoke (mock mode):** navigate S1→S2→back, run each bulk flow to summary,
verify offline disables command buttons (`useNetworkStatus`).

---

## 10. Open Questions (recommendation + trade-off; non-blocking)

**OQ-1 — No US-011 backend `API_SPEC.md` exists (mock-first).**
The backend has not produced a US-011 spec; only the user story defines the contract.
*Recommendation:* build mock-first against the user-story shapes in §3/§4 (same as
US-010 did). *Trade-off:* field-name drift when the real API lands — mitigated by
isolating all wire shapes in `settings.service.ts` + `types/settings.ts`.

**OQ-2 — Are impact previews server endpoints or client-computed?**
The story shows `api.calculateBulkLeaveImpact(...)` / `calculateRateChangeImpact(...)`.
*Recommendation:* assume **dedicated GET impact endpoints** (added to `APIPath.Settings`)
and debounce calls; if the backend declines them, fall back to a client-side estimate
from already-loaded subscription data. *Trade-off:* client estimate risks divergence
from the server's authoritative number shown post-confirm; server endpoint is safer.

**OQ-3 — Are bulk operations synchronous or async (job queue)?**
The story's "Technical Specifications" mention a job queue + progress polling for
500+ customers, but the endpoint responses return a final summary synchronously.
*Recommendation:* implement **synchronous** (await POST → show summary), with the
service typed so an async `{ operationId, status: 'processing' }` response can later
be polled via an `AppProgressBar`. *Trade-off:* if the backend goes async first, the
UI will need a polling loop — kept cheap by the typed seam.

**OQ-4 — Settings screen entry point.**
There is no existing `/settings` route or visible Settings menu entry.
*Recommendation:* add a "Settings" row to the owner's existing profile/menu surface
on the dashboard/home; route file at `app/(app)/settings/index.tsx`.
*Trade-off:* if a dedicated bottom-tab is wanted instead, that is a larger nav change —
deferred unless the wireframe (§2.29 host) specifies a tab.

**OQ-5 — Dual writer of `/vendors/:id/settings` (US-010 dashboard vs US-011 settings).**
*Recommendation:* make the settings store the single writer; dashboard toggle delegates
to it (see §8). *Trade-off:* a small US-010 refactor now vs lingering dual-writer tech
debt and possible state divergence later.

**OQ-6 — `react-native-date-picker` time mode for bill send time.**
`AppDatePicker` wraps `react-native-date-picker`, which supports `mode="time"`.
*Recommendation:* reuse `AppDatePicker` in time mode and serialize to `"HH:mm"`.
*Trade-off:* none significant; avoids a new dependency.
