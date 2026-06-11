# Code Review Report: US-005 Supply Lists Frontend

## Summary
- **Date**: 2026-06-11
- **Reviewer**: Review Agent
- **Branch**: `feat/us-005-supply-lists-frontend`
- **Feature Plan**: `docs/features/supply-lists/FEATURE_PLAN.md`
- **Overall Assessment**: CHANGES REQUIRED → **all findings resolved** (see Resolution column)

## Statistics

| Severity  | Count | Resolved |
|-----------|-------|----------|
| BLOCKER   | 0     | —        |
| CRITICAL  | 2     | 2        |
| MAJOR     | 6     | 6        |
| MINOR     | 3     | 3        |
| INFO      | 1     | 1        |

---

## Findings

### CRITICAL-1 — `useSupplyListForm` name field accepts unsanitized input
- **File**: `src/modules/supply-lists/hooks/useSupplyListForm.ts`
- **Skill**: `form-validation.md` — free-text must call `sanitizeText` + `INJECTION_RE` guard before storing/sending.
- **Issue**: `name` (free text, sent to `POST`/`PATCH`) stored as-is; no sanitization, no injection guard, validators inline rather than in `src/utils/validation.ts`.
- **Resolution**: Moved validators to `src/utils/validation.ts` (`validateSupplyListName`, `validateSupplyUnit`, `validateOptionalNonNegativeNumber`, `validateStartTime`, `validateFrequencyDays`, `validatePrimaryStaffId`); `setField` now `sanitizeText`s `name` and the validator runs the `INJECTION_RE`/control-char guard → `validation.invalid_input`.

### CRITICAL-2 — Edit-subscription sheet shows no inline validation error
- **File**: `src/modules/supply-lists/screens/SupplyListDetailScreen.tsx`
- **Skill**: `form-validation.md` / `accessibility-ux.md` — inline error via `AppInput error`, not haptic-only.
- **Issue**: `handleSaveSub` validated qty/rate but only fired an error haptic; `AppInput`s had no `error` prop.
- **Resolution**: Added `editQtyError`/`editRateError` state (set on failure with `validation.invalid_number`, cleared on success/open/change) wired to `AppInput error`.

### MAJOR-1 — `supplyListsService` not in `api.service.ts` barrel
- **Resolution**: Added `export { supplyListsService } from '../modules/supply-lists/service/supplyLists.service'`.

### MAJOR-2 — Archived filter segment mislabeled with `supply.status_ended` ("Ended")
- **File**: `SupplyListsScreen.tsx`
- **Resolution**: Added `supply.status_archived` (all 9 locales); segment now uses it. (`status_ended` correctly retained for subscription status.)

### MAJOR-3 — Other-lists chip mislabeled with `supply.staff_label` ("Staff: …")
- **File**: `AddCustomersScreen.tsx`
- **Resolution**: Added `supply.in_lists` ("In: {{names}}", all 9 locales); chip now uses it.

### MAJOR-4 — Month-stats section header mislabeled with `supply.title` ("Supply Lists")
- **File**: `SupplyListDetailScreen.tsx`
- **Resolution**: Added `supply.month_stats` ("This Month", all 9 locales); section now uses it. (`supply.title` retained only as the null-name header fallback.)

### MAJOR-5 — Validators reuse `validation.required` for distinct error conditions
- **File**: `useSupplyListForm.ts`
- **Resolution**: Added `validation.invalid_number`, `validation.invalid_time`, `validation.invalid_days` (all 9 locales); validators return the specific key for qty/rate, HH:mm time, and empty WEEKLY/MONTHLY days.

### MAJOR-6 — `showBack` on tab-root `SupplyListsScreen`
- **Resolution**: Removed `showBack`/`onBackPress` from the header.

### MINOR-1 — Skeleton uses `FlatList` for static placeholders
- **File**: `StaffSupplyListsScreen.tsx`
- **Resolution**: Replaced with a static `View` + 4 placeholder cards (testID preserved).

### MINOR-2 — Start-time keyboard `numbers-and-punctuation`
- **File**: `supplyListFormConfig.tsx`
- **Resolution**: Changed to `decimal-pad`.

### MINOR-3 — `fetchAvailable` sets `detailError` (slice pollution)
- **File**: `supplyLists.store.ts`
- **Resolution**: Added a separate `availableError` slice; `fetchAvailable`/`addCustomers` set it, `clearError` clears it, `AddCustomersScreen` reads it.

### INFO-1 — `readOnly` prop on `SupplyListMultiSelect` has no caller
- **Resolution**: Marked "RESERVED — no caller yet"; existing `readOnly=true` test branch verified present.

---

## New i18n keys (real translations, all 9 locales, parity verified)
`validation.invalid_input`, `validation.invalid_number`, `validation.invalid_time`, `validation.invalid_days`, `supply.in_lists`, `supply.status_archived`, `supply.month_stats`.

## Post-fix gate
- `npx tsc --noEmit`: clean (0 errors)
- `npx jest`: 34 suites, 360 tests passing
- `npx eslint` (touched files): 0 errors (only repo-wide `import/first` jest-mock-hoist warnings)
