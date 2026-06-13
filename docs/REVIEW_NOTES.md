# Review Notes — US-011 Vendor Settings & Automation (Frontend)

**Date**: 2026-06-13
**Reviewer**: Review Agent (Senior Code Reviewer)
**Branch**: `feat/us-011-vendor-settings`
**Feature Plan**: `docs/FEATURE_PLAN.md`
**API Spec**: `paycycle_api/docs/features/us-011-vendor-settings/API_SPEC.md`
**Overall Assessment**: Approved with fixes applied

---

## Summary

The US-011 frontend implementation is well-structured and follows the established patterns
from US-009/US-010. All architectural disciplines (mock-first, store partialise, clearSettings
on logout, vendorId from JWT, owner gating, offline guard) are correctly implemented.

Three bugs were found in the real-mode API body mappings (the service was passing UI-typed
inputs directly to the HTTP client using field names that differ from the API spec), plus
one screen-level logic bug in the reminders payload builder. All four were fixed in-place.
Tests remain 66/66 green.

---

## Findings

### Bug 1 (Fixed)

**File**: `src/modules/settings/service/settings.service.ts` — `bulkMarkLeave()` real-mode path

**What was wrong**: The service posted `BulkLeaveInput` directly to the HTTP client. The API
spec (§3) requires `{ subscriptionIds?, all: boolean, date: "YYYY-MM-DD", reason? }`. The
UI type uses `{ supplyListId?, customerIds?, startDate, endDate, reason? }` — completely
different field names. Specifically: `startDate`/`endDate` vs the API's single `date` field,
and `customerIds` is used on the UI to mean subscription-level targeting but the API field
is called `subscriptionIds`. In real mode the request body would have been rejected by the
backend with a 400 VALIDATION_ERROR.

**Fix applied**: Added a mapping block in the real-mode path that builds the correct API wire
body `{ all, date, subscriptionIds?, reason? }` from the UI input. Mock mode is unchanged.

---

### Bug 2 (Fixed)

**File**: `src/modules/settings/service/settings.service.ts` — `bulkAdjustRate()` real-mode path

**What was wrong**: The UI type `BulkRateInput` uses `effectiveFrom: string` but the API spec
(§4) names this field `effectiveDate`. The service passed `BulkRateInput` directly to the
HTTP client, so `effectiveFrom` would have been sent as-is. The backend would reject the body
(unknown field `effectiveFrom`, missing required field `effectiveDate`) with a 400 error.

Additionally the `scope` discriminant and `supplyListId` needed to be mapped to `{ all, subscriptionIds? }`.

**Fix applied**: Added a mapping block that sends `{ all, subscriptionIds?, newRate, effectiveDate, notifyCustomers }`.

---

### Bug 3 (Fixed)

**File**: `src/modules/settings/service/settings.service.ts` — `bulkSendReminders()` real-mode path

**What was wrong**: Three issues in the real-mode path:

1. `customMessage` (UI field name) was sent directly; API spec (§5) names this field `messageTemplate`.
2. `sendVia` (channel selection) is a UI-only field not present in the v1 API contract at all.
3. The `all` boolean was never set in the body. The API requires exactly one of `{ customerIds }` or `all: true`. Sending neither would cause a 400.

**Fix applied**: Added a mapping block that builds `{ all, customerIds?, messageTemplate? }`.
`sendVia` is dropped from the wire body (UI-only field). Mock mode is unchanged.

---

### Bug 4 (Fixed)

**File**: `src/modules/settings/screens/BulkSendRemindersScreen.tsx` — `buildInput()` — line 110

**What was wrong**: The condition to populate `customerIds` was:
```ts
if (targetType === 'specific_customers' && !allCustomers) {
```
The `!allCustomers` guard was wrong. `allCustomers` is a sub-toggle inside `CustomerScopeSelector`
that lets the user pick "all customers in the list" vs "specific". But when `targetType ===
'specific_customers'`, the intent is always to send specific `customerIds` — the `allCustomers`
sub-toggle does not change the outer `targetType`. The condition effectively prevented
`customerIds` from ever being populated when the user had gone through the full specific-customer
flow, causing the API to receive `{ targetType: 'specific_customers' }` with no `customerIds`,
which the service mapper would then silently send `all: false` with no IDs — invalid.

**Fix applied**: Changed to `if (targetType === 'specific_customers' && selectedIds.length > 0)`.
The `allCustomers` variable was also removed from the dependency array of `buildInput`.

---

## Warnings (should fix, no blocking)

### Warning 1

**File**: `src/types/settings.ts` — `VendorSettingsDto`

`defaultCreditAction: CreditBreachAction` is present in the frontend type but is NOT in the
v1 API spec response (§1). The API spec response includes `defaultCreditPeriodDays` (integer,
1–365) which is NOT in `VendorSettingsDto`.

**Action taken**: Added `defaultCreditPeriodDays?: number` to `VendorSettingsDto` and added
a JSDoc comment on `defaultCreditAction` noting it is a UI-layer concern not yet in the v1
API spec. The field is marked as tech-debt pending backend confirmation. When the US-011
backend lands, verify with the backend team whether `defaultCreditAction` will be added to
the API response and whether `defaultCreditPeriodDays` is used by the UI.

---

### Warning 2

**File**: `src/modules/settings/service/settings.service.ts` — `getRateImpact()` real-mode path

The real-mode path passes `BulkRateInput` directly as query params to the impact endpoint.
This will have the same field-name issues as the POST (specifically `effectiveFrom` vs
`effectiveDate` and the `scope` discriminant). Since the impact endpoint does not exist in
the v1 API spec (see §Notes: "there is no separate impact-preview endpoint in v1") this is
low risk right now, but when/if the backend adds the impact endpoint, this method will also
need the same mapping treatment applied to `bulkAdjustRate`. Similarly for `getLeaveImpact`.

**No code change made** (endpoint not in spec, no immediate risk). Track as tech-debt.

---

### Warning 3

**File**: `src/types/settings.ts` — `BulkReminderInput`

`sendVia: ReminderChannel` is a UI-only field not present in the v1 API contract. It is kept
in the type (the channel radio group drives the UI), but the service mapper correctly drops it
from the wire body. A JSDoc comment was added to document this intent. If the backend adds
channel support in a later sprint, the field and mapper will need to be updated.

---

## Checklist Results

| Check | Status | Notes |
|-------|--------|-------|
| API calls match spec — PATCH settings | PASS | Correct method + path + body |
| API calls match spec — PATCH notif-prefs | PASS | Wraps in `{ notificationPreferences }` |
| API calls match spec — POST mark-leave | FIXED | Wire body mapper added |
| API calls match spec — POST adjust-rate | FIXED | `effectiveDate` mapper added |
| API calls match spec — POST send-reminders | FIXED | `messageTemplate`/`all` mapper added |
| Mock-first: every method has `isMockMode` guard | PASS | All 8 methods |
| Mock fixtures deterministic and correct shape | PASS | `settings.mock.ts` is clean |
| Store `partialize` persists `settings` only | PASS | Verified in store definition |
| `clearSettings` wired to logout | PASS | `auth.store.ts` lines 252-259 |
| Error flow uses `mapApiError` + `logError` | PASS | All store actions |
| `mapApiError` has `'settings'` context | PASS | `errorMapper.ts` lines 213-223 |
| OQ-5 migration: dashboard delegates to settings store | PASS | `dashboard.store.ts` lines 246-250 |
| No direct `/vendors/:id/settings` write in dashboard service | PASS | Uses lazy-require to settings store |
| `useRequireOwner()` in every screen | PASS | All 5 screens call it in body |
| `vendorId` from auth store only | PASS | All service/store calls use `getActiveVendorId()` |
| `BulkSendRemindersScreen` `customerIds` logic | FIXED | Removed erroneous `!allCustomers` guard |
| `useNetworkStatus` disables command buttons | PASS | All 5 screens |
| No cross-module store imports (only lazy-require for cycles) | PASS | Clean boundary |
| 66/66 tests pass after fixes | PASS | Confirmed |

---

## Files Modified by This Review

- `src/modules/settings/service/settings.service.ts` — real-mode body mappers for 3 bulk POST methods
- `src/modules/settings/screens/BulkSendRemindersScreen.tsx` — fixed `buildInput()` customerIds guard
- `src/types/settings.ts` — added `defaultCreditPeriodDays`, JSDoc notes on field divergences
