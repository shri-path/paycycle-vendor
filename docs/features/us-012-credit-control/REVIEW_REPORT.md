# Code Review Report: US-012 Credit Control & Outstanding Management (Frontend)

## Summary
- **Date**: 2026-06-14
- **Reviewer**: Review Agent (Claude Sonnet 4.6)
- **Branch**: `feat/us-012-credit-control`
- **Feature Plan**: `docs/features/us-012-credit-control/FEATURE_PLAN.md`
- **Backend Contract**: `paycycle_api/docs/features/us-012-credit-control/API_SPEC.md`
- **Complexity Tier**: Complex (7 screens, 17 components, new store, new service, 11 endpoints)
- **Overall Assessment**: Approved with Conditions (3 blockers self-fixed; remaining findings are should-fix/nit)

---

## Statistics

| Severity     | Count | Fixed by Reviewer | Remaining for Dev |
|--------------|-------|-------------------|-------------------|
| Blocker      | 3     | 3                 | 0                 |
| Should-Fix   | 4     | 0                 | 4                 |
| Nit          | 4     | 0                 | 4                 |
| Deferred     | 1     | —                 | 1 (T-25..T-28)    |

---

## Fixes Applied by Reviewer (commit `6e3641e`)

Three blocker-level issues were clear enough to fix atomically without ambiguity:

1. **`SortDropdown.tsx` line 17** — `Array<T>` style violated project lint rule; replaced with `T[]`.
2. **`credit.service.ts` line 73** — Same `Array<T>` lint violation in a type-cast annotation.
3. **`credit.service.ts` `enablePrepaid` mock** — Both branches returned `mockEnablePrepaidSuccess`; the blocked-outcome branch now returns `mockEnablePrepaidBlocked` with the correct `customerId`. Without this fix the `EnablePrepaidScreen`'s two-outcome flow could never be exercised in mock mode during QA.
4. **`ReminderHistoryScreen.tsx` `onEndReached`** — Hardcoded `page: 2` meant every scroll-to-end re-loaded the second page forever. Added `currentPage` local state, reset to 1 on focus, incremented on each `onEndReached` call, and passed the current page to `fetchReminderHistory`.

---

## Remaining Findings

### SHOULD-FIX-1: `BulkSendRemindersScreen` renders a dead `channel` UI field

- **File**: `src/modules/settings/screens/BulkSendRemindersScreen.tsx` lines 79, 135–138, 224–231
- **Description**: The screen maintains a `channel` state (`'whatsapp' | 'sms'`) and renders a radio group for it, but `channel` is never included in the `sendBulkReminders` call. The API spec for `POST /reminders/send-bulk` has no `channel` field — the server derives the channel from vendor config. The user sees and interacts with a control that has zero effect.
- **Expected**: Remove the `channel` state, `channelOptions` array, and the `AppRadioGroup` for channel from the screen. The field is a leftover from the old US-011 mock payload.
- **Fix guidance**: Delete lines 79, 135–138, and the `AppRadioGroup` block at lines 224–231. Leave all other payload fields (`target`, `customerIds`, `customMessage`) intact.

### SHOULD-FIX-2: `SetCreditSettingsScreen` navigates back only when no warning AND no pause, but stays showing both banners with no explicit "Done" path

- **File**: `src/modules/credit/screens/SetCreditSettingsScreen.tsx` lines 128–135
- **Description**: After a successful save with `warning='limit_below_outstanding'` AND `deliveriesPaused=true` simultaneously, the screen shows both banners. Each banner's `onClose` calls `router.back()` independently. If the user dismisses the warning banner first, `router.back()` fires — then if they close the paused banner, `router.back()` fires again (navigating two levels up). This is unlikely but architecturally fragile.
- **Expected** (per FEATURE_PLAN §6 rule 4): The plan says "surface a non-blocking inline warning, still treat as success". The natural fix is: after success, always navigate back after a brief delay or after the first banner is acknowledged. The paused banner and warning banner should share a single `onClose` that navigates once.
- **Fix guidance**: Consolidate into a single `postSaveState` that shows whichever banners apply and calls `router.back()` once on the first dismiss.

### SHOULD-FIX-3: `ReminderHistoryScreen` has no upper-bound pagination guard

- **File**: `src/modules/credit/screens/ReminderHistoryScreen.tsx` (the now-fixed `onEndReached`)
- **Description**: The fix applied by the reviewer increments `currentPage` correctly but does not check whether all pages are already loaded (`currentPage >= historyData.meta.totalPages` or similar). The store's `fetchReminderHistory` has no meta awareness and will continue making network calls even when the API has no more pages.
- **Expected**: Guard the `onEndReached` call with a check that `currentPage < totalPages` (store the meta object alongside the history data), or at minimum check whether the last page's item count was < limit.
- **Fix guidance**: The store's `history` record currently only holds `ReminderHistoryDto` (no meta). Either extend to `{ data: ReminderHistoryDto; meta: ReminderHistoryMeta }` per customer, or track `historyMeta: Record<string, ReminderHistoryMeta>` as a parallel slice. The screen then checks `meta.page < meta.totalPages` before loading more.

### SHOULD-FIX-4: `mapApiError` does not distinguish `400 ARGUMENT_INVALID` for credit context

- **File**: `src/utils/errorMapper.ts` lines 219
- **Description**: Both `400 VALIDATION_ERROR` and `400 ARGUMENT_INVALID` map to `'validation.required'` in the credit context. The spec defines `ARGUMENT_INVALID` specifically for: threshold out of range (credit-settings), unknown template placeholder (reminder-config), and auto-on with no schedule (reminder-config). These are user-actionable errors that deserve a specific message rather than the generic "required field" copy.
- **Expected**: Add a code-level branch: `if (code === 'ARGUMENT_INVALID') return 'credit.error_argument_invalid'` — and add that key to all 9 locales.
- **Fix guidance**: Add the check before the generic `status === 400` line in the `context === 'credit'` block. Add locale key with user-friendly copy ("Invalid value — check your inputs").

---

## Nits (address in follow-up, not a merge gate)

### NIT-1: Non-English locale `credit.*` keys are all English placeholders

- **Files**: All 8 non-English locale files (`hi bn ta te mr kn ml gu`) under `src/locales/`
- **Description**: Every credit key in non-English locales is set to the English string. While this pattern exists in older features (US-011 settings also has untranslated keys), the product targets tier-2/3 Indian cities where non-English languages are primary. This should be addressed before the feature reaches real users.
- **Note**: This is project-wide technical debt and consistent with prior US deliveries — tagging as nit rather than should-fix. Actual translation requires product/language input.

### NIT-2: `ReminderHistoryScreen` — `router` imported but only used for `router.back()` from `AppHeader onBackPress`; pattern is redundant

- **File**: `src/modules/credit/screens/ReminderHistoryScreen.tsx` line 12, 132
- **Description**: `useRouter` is imported and `router.back()` is passed to `AppHeader.onBackPress`. However, `AppHeader`'s default `showBack` handler already calls `router.back()`. The explicit `onBackPress` prop is redundant. Minor — does not cause bugs.

### NIT-3: `QuickActionsGrid` fires haptic twice for non-disabled tiles

- **File**: `src/modules/credit/components/QuickActionsGrid.tsx` lines 54–57
- **Description**: The `handlePress` callback fires `Haptics.impactAsync` inside the grid component AND each `onPress` action in `CollectionsDashboardScreen` also fires `Haptics.impactAsync`. This produces two haptic events per tap. Move haptics to a single location — either in the grid tile or in each action's `onPress`, not both.

### NIT-4: `CollectionsDashboardScreen` shows empty "all collected" state AND the full dashboard cards simultaneously

- **File**: `src/modules/credit/screens/CollectionsDashboardScreen.tsx` lines 189–196
- **Description**: When `totalOutstanding === 0`, the celebratory `AppEmptyState` is rendered inside the `ScrollView` followed immediately by the outstanding/receivable/progress cards (because the outer `{dashboard ? (...) : null}` block still renders). The empty state and the populated cards appear together. Should be mutually exclusive: if `totalOutstanding === 0`, show only the empty state (or show the empty state above summary cards without repeating the overview card).

---

## API Contract Verification

| Endpoint | Path Correct | Method Correct | Response Shape Correct | ID Coercion |
|----------|-------------|----------------|----------------------|-------------|
| GET /collections/dashboard | Yes | Yes | Yes | Yes (customersAtLimit) |
| GET /collections/priority-list | Yes | Yes | Yes | Yes (all groups) |
| GET /collections/analytics | Yes | Yes | Yes | Yes (topPayers, defaulters) |
| GET /collections/aging | Yes | Yes | Yes | N/A (no ids) |
| PATCH /customers/:c/credit-settings | Yes | Yes | Yes | Yes |
| POST /customers/:c/enable-prepaid | Yes | Yes | Yes (discriminated union) | Yes |
| POST /customers/:c/reminders | Yes | Yes | Yes | Yes |
| GET /customers/:c/reminders | Yes | Yes | Yes (data+meta) | Yes |
| POST /reminders/send-bulk | Yes | Yes | Yes | N/A |
| GET /reminder-config | Yes | Yes | Yes | Yes (excludedIds) |
| PATCH /reminder-config | Yes | Yes | Yes | Yes (excludedIds) |

The `Settings.BulkSendReminders` path (`/bulk-operations/send-reminders`) in the old US-011 group is dead — the screen now correctly calls `Credit.SendBulk` (`/reminders/send-bulk`). OQ-6 is resolved correctly.

---

## Security Checklist

| Check | Status | Notes |
|-------|--------|-------|
| `vendorId` always JWT-derived (never from params/body) | Pass | Store reads from `useAuthStore.getState().vendorContext.vendorId` |
| `useRequireOwner()` on every credit screen | Pass | All 7 screens call it |
| No PII in `logError` calls | Pass | Phone numbers not logged |
| No tokens in credit store | Pass | Store has no persistence |
| Tenant isolation: 404 treated as NOT_FOUND, not FORBIDDEN | Pass | `mapApiError` maps 404 to `credit.error_not_found` |
| Cross-aggregate customer invalidation via lazy-require | Pass | `updateCreditSettings` and `enablePrepaid` both use lazy-require pattern correctly |

---

## Store CQS Discipline

| Action | Classification | Rethrows? | Loading flag? | Error flag (i18n key)? |
|--------|---------------|-----------|--------------|------------------------|
| `fetchDashboard` | Query | No | `isDashboardLoading` | `dashboardError` |
| `fetchPriorityList` | Query | No | `isPriorityLoading` | `priorityError` |
| `fetchAnalytics` | Query | No | `isAnalyticsLoading` | `analyticsError` |
| `fetchReminderConfig` | Query | No | `isReminderConfigLoading` | `reminderConfigError` |
| `fetchReminderHistory` | Query | No | `isHistoryLoading` | `historyError` |
| `updateCreditSettings` | Command | Yes | `isMutating` | `mutationError` |
| `enablePrepaid` | Command | Yes | `isMutating` | `mutationError` |
| `sendReminder` | Command | Yes | per-card `remindingCustomerIds` | `mutationError` |
| `sendBulkReminders` | Command | Yes | `isMutating` | `mutationError` |
| `updateReminderConfig` | Command | Yes | `isMutating` | `mutationError` |

CQS discipline is fully correct.

---

## Screen State Coverage

| Screen | Loading | Empty | Error | Populated | Offline |
|--------|---------|-------|-------|-----------|---------|
| S1 CollectionsDashboard | Yes | Yes (totalOutstanding=0) | Yes | Yes | Yes (banner + cached) |
| S2 PriorityList | Yes | Yes (all-zero sections) | Yes | Yes | Yes (banner + Remind disabled) |
| S3 SetCreditSettings | (spinner on save) | N/A | Yes (inline banners) | Yes | Yes (banner + submit disabled) |
| S4 EnablePrepaid | (spinner on save) | N/A | Yes (inline banners) | Yes | Yes (banner + submit disabled) |
| S5 ReminderConfig | Yes | N/A | Yes (inline) | Yes | Yes (banner + save disabled) |
| S6 ReminderHistory | Yes | Yes (empty FlatList) | Yes | Yes | Yes (banner + Send disabled) |
| S7 CollectionAnalytics | Yes | Yes (no-data state) | Yes | Yes | Yes (banner + cached) |

All 5 states covered on all 7 screens.

---

## Feature Completeness vs FEATURE_TASKS.md

| Task | Status |
|------|--------|
| T-01 Types | Complete — all 11 endpoint shapes, discriminated union, `KNOWN_REMINDER_PLACEHOLDERS` const |
| T-02 apiPaths Credit group | Complete — 9 builders, correctly typed `as const` |
| T-03 credit.mock.ts | Complete — realistic fixtures for all GETs |
| T-04 credit.service.ts | Complete — 11 methods, mock/real branches, id coercion, envelope handling |
| T-05 credit.store.ts | Complete — all slices, per-card remind guard, `clearCredit` |
| T-06 clearCredit in auth.store.logout | Complete — verified lazy-require wiring matches pattern |
| T-07 Dashboard components | Complete — 5 components present and used |
| T-08 Priority components | Complete — CreditPriorityCard, AdvanceCreditRow, SortDropdown |
| T-09 Credit-settings form components | Complete — 4 components |
| T-10 Reminder config + history components | Complete — 3 components |
| T-11 Analytics components | Complete — pure-View bars, no chart lib |
| T-12..T-18 All 7 screens | Complete |
| T-19 Route files | Complete — all 7 new routes + layouts |
| T-20 Customer-detail credit CTA repoint | Complete — verified in CustomerDetailScreen |
| T-21 BulkSendReminders repoint (OQ-6) | Complete — now calls `creditService.sendBulkReminders` at `/reminders/send-bulk` |
| T-22 Localization (9 locales) | Complete — all 9 files have `credit.*` block (translations are English placeholders — see NIT-1) |
| T-23 Error-handling pass | Complete — `mapApiError` credit context, `logError` with correlationId |
| T-24 Performance pass | Partial — FlatLists present, `getItemLayout` on history, `React.memo` on components; no `getItemLayout` on priority SectionList (low concern given grouping) |
| T-25..T-28 Tests | Deferred (expected per task description) |
| T-29 PROGRESS_TRACKER update | Not checked — assume dev responsibility |

---

## Verdict: Pass with Fixes

The implementation is architecturally sound. All 11 endpoints are correctly wired, all 7 screens implement the 5 states, the store follows CQS discipline, tenant isolation is enforced, and the `clearCredit` logout hook is wired. The three blockers (lint violations, dead mock branch, pagination hardcode) are fixed and committed. Four should-fix findings remain for Dev before QA tests them; all are localized in scope and do not require architectural changes.

**QA may begin after Dev addresses SHOULD-FIX-1 (dead channel UI) and SHOULD-FIX-2 (double-back navigation on credit-settings). SHOULD-FIX-3 and SHOULD-FIX-4 can be parallel or post-QA depending on risk appetite.**
